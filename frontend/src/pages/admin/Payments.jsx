import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { getPayments } from "../../services/adminService";

import {
    FaSyncAlt,
    FaSearch,
    FaDownload,
    FaTimes,
    FaExclamationTriangle,
    FaReceipt
} from "react-icons/fa";

import "../../styles/adminpayments.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 60000;
const PAGE_SIZE = 20;

const ROUTES = {
    request: (id) => `/admin/requests/${id}`
};

/*
 * Revenue everywhere else in the admin panel counts only SUCCESS payments,
 * so "Successful" here is exactly SUCCESS. Pending also holds the other
 * "not paid yet" states the app uses.
 */
const GROUPS = {
    SUCCESS: ["SUCCESS"],
    PENDING: ["PENDING", "CREATED", "CASH_PENDING"],
    FAILED: ["FAILED"]
};

const TABS = [
    { key: "ALL", label: "All" },
    { key: "SUCCESS", label: "Successful" },
    { key: "PENDING", label: "Pending" },
    { key: "FAILED", label: "Failed" }
];

const METHODS = [
    { key: "ALL", label: "All methods" },
    { key: "ONLINE", label: "Online" },
    { key: "CASH", label: "Cash" }
];

const RANGES = [
    { key: "ANY", label: "Any time", days: 0 },
    { key: "1", label: "Today", days: 1 },
    { key: "7", label: "Last 7 days", days: 7 },
    { key: "30", label: "Last 30 days", days: 30 }
];

const SORTS = [
    { key: "new", label: "Newest first" },
    { key: "old", label: "Oldest first" },
    { key: "high", label: "Highest amount" },
    { key: "low", label: "Lowest amount" }
];

const TONES = { SUCCESS: "green", PENDING: "amber", FAILED: "red", OTHER: "grey" };

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const idOf = (p) => p.paymentId ?? p.id;

const groupOf = (payment) => {
    const status = String(payment.paymentStatus || "").toUpperCase();
    const found = Object.keys(GROUPS).find((key) => GROUPS[key].includes(status));
    return found || "OTHER";
};

const tabFromParam = (value) => {
    const key = String(value || "").toUpperCase();
    return TABS.some((t) => t.key === key) ? key : "ALL";
};

const statusLabel = (payment) => {
    const group = groupOf(payment);
    if (group === "SUCCESS") return "Successful";
    if (group === "PENDING") return "Pending";
    if (group === "FAILED") return "Failed";

    const raw = String(payment.paymentStatus || "Unknown");
    return raw.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const isCash = (payment) => String(payment.paymentMethod || "").toUpperCase() === "CASH";

const methodLabel = (payment) => {
    const value = String(payment.paymentMethod || "").toUpperCase();
    if (!value) return "—";
    if (value === "CASH") return "Cash";
    if (value === "RAZORPAY") return "Online";
    return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);

const dateOf = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const dateText = (value) => {
    const date = dateOf(value);
    return date
        ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "—";
};

const updatedText = (date) => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    return minutes < 1 ? "just now" : `${minutes}m ago`;
};

const startOfRange = (days) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    return start;
};

/* A cell that starts with = + - @ can run as a formula in Excel, so neutralise it. */
const csvCell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
};

const exportCsv = (rows) => {
    const header = ["Payment ID", "Request ID", "Customer", "Mechanic", "Method", "Amount", "Status", "Date"];
    const lines = rows.map((p) =>
        [
            idOf(p),
            p.requestId,
            p.customerName,
            p.mechanicName,
            methodLabel(p),
            Number(p.amount) || 0,
            statusLabel(p),
            dateOf(p.paymentDate)?.toLocaleString("en-IN") || ""
        ]
            .map(csvCell)
            .join(",")
    );

    const blob = new Blob(["﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n")], {
        type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roadaid-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function StatusPill({ payment }) {
    return (
        <span className="ap-status" data-tone={TONES[groupOf(payment)]}>
            <i aria-hidden="true" />
            {statusLabel(payment)}
        </span>
    );
}

function PaymentRow({ payment }) {
    const requestId = payment.requestId;

    const content = (
        <>
            <span className="ap-id">
                <b>#{idOf(payment)}</b>
                <small>{dateText(payment.paymentDate)}</small>
            </span>

            <span className="ap-person">
                <b>{payment.customerName || "—"}</b>
                {requestId && <small>Request #{requestId}</small>}
            </span>

            <span className="ap-muted">{payment.mechanicName || <em>—</em>}</span>

            <span className="ap-muted">{methodLabel(payment)}</span>

            <span className="ap-amount">{money(payment.amount)}</span>

            <StatusPill payment={payment} />
        </>
    );

    /* The whole row opens the request when there is one. */
    return requestId ? (
        <Link to={ROUTES.request(requestId)} className="ap-row ap-row-link" role="listitem">
            {content}
        </Link>
    ) : (
        <div className="ap-row" role="listitem">
            {content}
        </div>
    );
}

function SkeletonRows() {
    return (
        <div className="ap-list" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="ap-row ap-skel-row" key={i}>
                    <span className="ap-skel" />
                    <span className="ap-skel" />
                    <span className="ap-skel" />
                </div>
            ))}
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function Payments() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [, tick] = useState(0);

    const [tab, setTab] = useState(() => tabFromParam(searchParams.get("status")));
    const [query, setQuery] = useState(() => searchParams.get("q") || "");
    const [method, setMethod] = useState("ALL");
    const [range, setRange] = useState("ANY");
    const [sort, setSort] = useState("new");
    const [shown, setShown] = useState(PAGE_SIZE);

    const searchRef = useRef(null);
    const hasData = useRef(false);

    /* ---------- Load ---------- */

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setRefreshing(true);

        try {
            /* One fetch for everything; tabs, counts and search all work on it. */
            const response = await getPayments("");
            setPayments(Array.isArray(response?.data) ? response.data : []);
            hasData.current = true;
            setError("");
            setUpdatedAt(new Date());
        } catch (err) {
            console.error("Failed to load payments:", err);
            /* Keep the list on screen when a background refresh fails. */
            if (!silent || !hasData.current) {
                setError("We couldn't load payments. Check your connection and try again.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();

        const poll = setInterval(() => {
            if (document.visibilityState === "visible") load({ silent: true });
        }, POLL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") load({ silent: true });
        };
        document.addEventListener("visibilitychange", onVisible);

        const clock = setInterval(() => tick((n) => n + 1), 30000);

        return () => {
            clearInterval(poll);
            clearInterval(clock);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    /* "/" jumps to the search box, like the other admin pages. */
    useEffect(() => {
        const onKey = (e) => {
            const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");
            if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    /* Keep the address bar in step so a filtered view can be reloaded or shared. */
    useEffect(() => {
        const next = {};
        if (tab !== "ALL") next.status = tab;
        if (query.trim()) next.q = query.trim();
        setSearchParams(next, { replace: true });
    }, [tab, query, setSearchParams]);

    useEffect(() => {
        setShown(PAGE_SIZE);
    }, [tab, query, method, range, sort]);

    /* ---------- Derived ---------- */

    const totals = useMemo(() => {
        const result = { ALL: payments.length, SUCCESS: 0, PENDING: 0, FAILED: 0, OTHER: 0, revenue: 0, pendingAmount: 0 };

        payments.forEach((p) => {
            const group = groupOf(p);
            result[group] += 1;
            if (group === "SUCCESS") result.revenue += Number(p.amount) || 0;
            if (group === "PENDING") result.pendingAmount += Number(p.amount) || 0;
        });

        return result;
    }, [payments]);

    const visible = useMemo(() => {
        const text = query.trim().toLowerCase();
        const days = RANGES.find((r) => r.key === range)?.days || 0;
        const since = days ? startOfRange(days) : null;

        const list = payments.filter((p) => {
            if (tab !== "ALL" && groupOf(p) !== tab) return false;
            if (method === "CASH" && !isCash(p)) return false;
            if (method === "ONLINE" && isCash(p)) return false;

            if (since) {
                const paid = dateOf(p.paymentDate);
                if (!paid || paid < since) return false;
            }

            if (!text) return true;

            return [idOf(p), p.requestId, p.customerName, p.mechanicName, methodLabel(p)]
                .filter((v) => v !== undefined && v !== null)
                .join(" ")
                .toLowerCase()
                .includes(text);
        });

        const time = (p) => dateOf(p.paymentDate)?.getTime() || 0;
        const amount = (p) => Number(p.amount) || 0;

        list.sort((a, b) => {
            if (sort === "old") return time(a) - time(b);
            if (sort === "high") return amount(b) - amount(a);
            if (sort === "low") return amount(a) - amount(b);
            return time(b) - time(a);
        });

        return list;
    }, [payments, tab, query, method, range, sort]);

    const hasFilters = tab !== "ALL" || query.trim() !== "" || method !== "ALL" || range !== "ANY" || sort !== "new";

    const clearFilters = () => {
        setTab("ALL");
        setQuery("");
        setMethod("ALL");
        setRange("ANY");
        setSort("new");
    };

    const visibleTotal = useMemo(
        () => visible.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        [visible]
    );

    /* ---------- Render ---------- */

    return (
        <AdminLayout>
            <div className="ap-root">
                <header className="ap-header">
                    <div>
                        <h1 className="ap-title">Payments</h1>
                        <p className="ap-sub">
                            {loading ? "Loading…" : `${totals.ALL} transactions`}
                            {updatedAt && <> · updated {updatedText(updatedAt)}</>}
                        </p>
                    </div>

                    <div className="ap-header-actions">
                        <button
                            type="button"
                            className="ap-btn"
                            onClick={() => exportCsv(visible)}
                            disabled={visible.length === 0}
                        >
                            <FaDownload aria-hidden="true" /> Export
                        </button>
                        <button type="button" className="ap-btn" onClick={() => load()} disabled={refreshing}>
                            <FaSyncAlt className={refreshing ? "ap-spin" : ""} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="ap-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{error}</span>
                        <button type="button" onClick={() => load()}>Try again</button>
                    </div>
                )}

                {/* ---------- Summary ---------- */}
                <section className="ap-stats" aria-label="Summary">
                    <div className="ap-stat ap-stat-main">
                        <span className="ap-stat-label">Revenue</span>
                        <strong>{loading ? "–" : money(totals.revenue)}</strong>
                        <span className="ap-stat-note">{loading ? "" : `From ${totals.SUCCESS} successful payments`}</span>
                    </div>

                    <div className="ap-stat">
                        <span className="ap-stat-label">Pending</span>
                        <strong>{loading ? "–" : money(totals.pendingAmount)}</strong>
                        <span className="ap-stat-note">{loading ? "" : `${totals.PENDING} awaiting payment`}</span>
                    </div>

                    <div className="ap-stat">
                        <span className="ap-stat-label">Failed</span>
                        <strong>{loading ? "–" : totals.FAILED}</strong>
                        <span className="ap-stat-note">Payments that did not go through</span>
                    </div>
                </section>

                {/* ---------- Status tabs ---------- */}
                <nav className="ap-tabs" aria-label="Filter by status">
                    {TABS.map((t) => (
                        <button
                            type="button"
                            key={t.key}
                            className="ap-tab"
                            aria-pressed={tab === t.key}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label}
                            <span>{loading ? "" : totals[t.key] ?? 0}</span>
                        </button>
                    ))}
                </nav>

                {/* ---------- Search and filters ---------- */}
                <section className="ap-filters" aria-label="Search and filters">
                    <label className="ap-search">
                        <FaSearch aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="search"
                            placeholder="Search by customer, mechanic, request or ID"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Search payments"
                        />
                        {query && (
                            <button type="button" className="ap-clear" onClick={() => setQuery("")} aria-label="Clear search">
                                <FaTimes aria-hidden="true" />
                            </button>
                        )}
                    </label>

                    <select className="ap-select" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
                        {METHODS.map((m) => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                    </select>

                    <select className="ap-select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
                        {RANGES.map((r) => (
                            <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                    </select>

                    <select className="ap-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort order">
                        {SORTS.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                    </select>

                    {hasFilters && (
                        <button type="button" className="ap-link-btn" onClick={clearFilters}>Reset</button>
                    )}
                </section>

                {/* ---------- List ---------- */}
                {loading ? (
                    <SkeletonRows />
                ) : payments.length === 0 ? (
                    <div className="ap-empty">
                        <span className="ap-empty-icon" aria-hidden="true"><FaReceipt /></span>
                        <h2>No payments yet</h2>
                        <p>Transactions will show up here once customers pay.</p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="ap-empty">
                        <span className="ap-empty-icon" aria-hidden="true"><FaSearch /></span>
                        <h2>No matching payments</h2>
                        <p>Try a different status, method, date range or search.</p>
                        <button type="button" className="ap-btn" onClick={clearFilters}>Reset filters</button>
                    </div>
                ) : (
                    <>
                        <div className="ap-list" role="list" aria-live="polite">
                            <div className="ap-head" aria-hidden="true">
                                <span>Payment</span>
                                <span>Customer</span>
                                <span>Mechanic</span>
                                <span>Method</span>
                                <span className="ap-right">Amount</span>
                                <span>Status</span>
                            </div>

                            {visible.slice(0, shown).map((payment) => (
                                <PaymentRow key={idOf(payment)} payment={payment} />
                            ))}

                            <div className="ap-foot">
                                <span>
                                    {visible.length} {visible.length === 1 ? "payment" : "payments"} shown
                                </span>
                                <strong>{money(visibleTotal)}</strong>
                            </div>
                        </div>

                        {shown < visible.length && (
                            <button type="button" className="ap-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                                Show {Math.min(PAGE_SIZE, visible.length - shown)} more
                                <span> · {visible.length - shown} left</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </AdminLayout>
    );
}

export default Payments;