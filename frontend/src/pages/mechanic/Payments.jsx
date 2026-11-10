import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";
import { getMyPayments } from "../../services/mechanicService";

import {
    FaMoneyBillWave,
    FaCreditCard,
    FaCheckCircle,
    FaHourglassHalf,
    FaExclamationTriangle,
    FaSyncAlt,
    FaSearch,
    FaTimes,
    FaDownload,
    FaWallet,
    FaCalendarAlt,
    FaReceipt,
    FaChevronRight
} from "react-icons/fa";

import "../../styles/MechPayments.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const PAGE_SIZE = 15;

/* Change here if your router uses different paths. */
const ROUTES = {
    request: (id) => `/mechanic/requests/${id}`
};

const PAID = ["SUCCESS"];
const PENDING = ["CASH_PENDING", "CREATED"];
const FAILED = ["FAILED"];

const STATUS_LABELS = {
    SUCCESS: { label: "Paid", tone: "success" },
    CASH_PENDING: { label: "Cash pending", tone: "warning" },
    CREATED: { label: "Awaiting payment", tone: "warning" },
    FAILED: { label: "Failed", tone: "danger" }
};

/* "Online" means anything that isn't cash: card, UPI, net banking, and so on. */
const METHODS = [
    { key: "all", label: "All methods" },
    { key: "cash", label: "Cash", icon: FaMoneyBillWave },
    { key: "online", label: "Online", icon: FaCreditCard }
];

const SORTS = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "highest", label: "Highest amount" },
    { key: "lowest", label: "Lowest amount" }
];

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const money = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const sum = (list) => list.reduce((total, p) => total + (Number(p.amount) || 0), 0);

/* Different backends name this field differently; use the first one present. */
const paidOn = (p) => p.paymentDate || p.paidAt || p.createdAt || null;

const timeOf = (p) => {
    const t = new Date(paidOn(p) || 0).getTime();
    return Number.isNaN(t) ? 0 : t;
};

const formatDate = (value) => {
    if (!value) return "Date unavailable";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "Date unavailable"
        : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const monthKey = (p) => {
    const value = paidOn(p);
    const d = value ? new Date(value) : null;
    if (!d || Number.isNaN(d.getTime())) return { key: "undated", label: "Undated" };
    return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    };
};

const prettify = (value) =>
    String(value || "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());

const requestIdOf = (p) => p.quotation?.serviceRequest?.id ?? null;

const isCash = (p) => String(p.paymentMethod || "").toUpperCase().includes("CASH");

/* Spreadsheet apps run text that starts with = + - @ as a formula, so defuse it. */
const csvCell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
};

function exportCsv(rows) {
    const header = ["Payment ID", "Request ID", "Method", "Status", "Amount (INR)", "Date"];
    const lines = rows.map((p) => {
        const d = paidOn(p) ? new Date(paidOn(p)) : null;
        return [
            p.id,
            requestIdOf(p) ?? "",
            prettify(p.paymentMethod),
            (STATUS_LABELS[p.paymentStatus] || {}).label || prettify(p.paymentStatus),
            Number(p.amount) || 0,
            d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : ""
        ]
            .map(csvCell)
            .join(",");
    });

    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\n")], {
        type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/* Loads the page font once. Safe to call from several components. */
function usePageFont() {
    useEffect(() => {
        if (document.getElementById("rm-font-jakarta")) return;
        const link = document.createElement("link");
        link.id = "rm-font-jakarta";
        link.rel = "stylesheet";
        link.href =
            "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
        document.head.appendChild(link);
    }, []);
}

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function SummaryCard({ icon: Icon, label, value, hint, tone }) {
    return (
        <div className="pay-stat" data-tone={tone}>
            <span className="pay-stat-icon" aria-hidden="true">
                <Icon />
            </span>
            <div className="pay-stat-main">
                <p className="pay-stat-label">{label}</p>
                <p className="pay-stat-value">{value}</p>
                {hint && <p className="pay-stat-hint">{hint}</p>}
            </div>
        </div>
    );
}

function PaymentRow({ payment }) {
    const status = STATUS_LABELS[payment.paymentStatus] || {
        label: prettify(payment.paymentStatus) || "Unknown",
        tone: "neutral"
    };
    const MethodIcon = isCash(payment) ? FaMoneyBillWave : FaCreditCard;
    const requestId = requestIdOf(payment);

    const body = (
        <>
            <span className="pay-item-icon" data-tone={status.tone} aria-hidden="true">
                <MethodIcon />
            </span>

            <span className="pay-item-info">
                <span className="pay-item-title">{requestId ? `Request #${requestId}` : "Payment"}</span>
                <span className="pay-item-meta">
                    {prettify(payment.paymentMethod) || "Payment"} · {formatDate(paidOn(payment))}
                </span>
            </span>

            <span className="pay-item-right">
                <strong className="pay-amount">{money(Number(payment.amount))}</strong>
                <span className="pay-badge" data-tone={status.tone}>{status.label}</span>
            </span>

            {requestId && (
                <span className="pay-item-go" aria-hidden="true">
                    <FaChevronRight />
                </span>
            )}
        </>
    );

    return requestId ? (
        <Link
            to={ROUTES.request(requestId)}
            className="pay-item pay-item-link"
            aria-label={`Request ${requestId}, ${money(Number(payment.amount))}, ${status.label}. Open request`}
        >
            {body}
        </Link>
    ) : (
        <div className="pay-item">{body}</div>
    );
}

function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="pay-empty">
            <span className="pay-empty-icon" aria-hidden="true">
                <Icon />
            </span>
            <h3 className="pay-empty-title">{title}</h3>
            <p className="pay-empty-text">{description}</p>
            {action}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="pay-root" aria-busy="true" aria-label="Loading payments">
            <div className="pay-skeleton" style={{ height: 56, width: "45%" }} />
            <div className="pay-summary">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="pay-skeleton" style={{ height: 100 }} />
                ))}
            </div>
            <div className="pay-skeleton" style={{ height: 420 }} />
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function PaymentsContent() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("newest");
    const [method, setMethod] = useState("all");
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(PAGE_SIZE);
    const tabRefs = useRef({});

    usePageFont();

    /* ---------------------------- data ---------------------------- */

    const load = useCallback(async (mode = "initial") => {
        if (mode === "refresh") setRefreshing(true);
        try {
            setError("");
            const response = await getMyPayments();
            setPayments(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Failed to load payments:", err);
            // Keep whatever is already on screen; only say what went wrong.
            setError(err.response?.data?.message || "We couldn't load your payments.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const onVisible = () => {
            if (!document.hidden) load("silent");
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [load]);

    /* --------------------------- derived --------------------------- */

    const summary = useMemo(() => {
        const paid = payments.filter((p) => PAID.includes(p.paymentStatus));
        const waiting = payments.filter((p) => PENDING.includes(p.paymentStatus));
        const failed = payments.filter((p) => FAILED.includes(p.paymentStatus));

        const now = new Date();
        const thisMonth = paid.filter((p) => {
            if (!paidOn(p)) return false;
            const d = new Date(paidOn(p));
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        return {
            paid,
            waiting,
            failed,
            earned: sum(paid),
            pending: sum(waiting),
            month: sum(thisMonth),
            monthCount: thisMonth.length
        };
    }, [payments]);

    // Payments narrowed by method. The status tabs count from this, so they always add up.
    const methodCounts = useMemo(
        () => ({
            all: payments.length,
            cash: payments.filter(isCash).length,
            online: payments.filter((p) => !isCash(p)).length
        }),
        [payments]
    );

    const scoped = useMemo(() => {
        const list =
            method === "cash"
                ? payments.filter(isCash)
                : method === "online"
                    ? payments.filter((p) => !isCash(p))
                    : payments;
        return {
            all: list,
            paid: list.filter((p) => PAID.includes(p.paymentStatus)),
            pending: list.filter((p) => PENDING.includes(p.paymentStatus)),
            failed: list.filter((p) => FAILED.includes(p.paymentStatus))
        };
    }, [payments, method]);

    const filters = useMemo(() => {
        const list = [
            { key: "all", label: "All", count: scoped.all.length },
            { key: "paid", label: "Paid", count: scoped.paid.length },
            { key: "pending", label: "Pending", count: scoped.pending.length }
        ];
        if (scoped.failed.length > 0) list.push({ key: "failed", label: "Failed", count: scoped.failed.length });
        return list;
    }, [scoped]);

    // If the selected filter disappears (e.g. the last failed payment cleared), fall back to All.
    useEffect(() => {
        if (!filters.some((f) => f.key === filter)) setFilter("all");
    }, [filters, filter]);

    const needle = query.trim().toLowerCase();

    const matches = useMemo(() => {
        const base = scoped[filter] || scoped.all;

        const searched = needle
            ? base.filter((p) =>
                [
                    requestIdOf(p),
                    p.paymentMethod,
                    (STATUS_LABELS[p.paymentStatus] || {}).label,
                    p.amount,
                    p.id
                ].some((v) => String(v ?? "").toLowerCase().includes(needle))
            )
            : base;

        const sorters = {
            newest: (a, b) => timeOf(b) - timeOf(a),
            oldest: (a, b) => timeOf(a) - timeOf(b),
            highest: (a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0),
            lowest: (a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0)
        };
        return [...searched].sort(sorters[sort]);
    }, [scoped, filter, needle, sort]);

    const shown = matches.slice(0, limit);
    const remaining = matches.length - shown.length;

    // Group by month only when the list is ordered by date.
    const groups = useMemo(() => {
        if (sort !== "newest" && sort !== "oldest") return [{ key: "all", label: null, items: shown }];
        const map = new Map();
        shown.forEach((p) => {
            const { key, label } = monthKey(p);
            if (!map.has(key)) map.set(key, { key, label, items: [] });
            map.get(key).items.push(p);
        });
        return [...map.values()];
    }, [shown, sort]);

    /* --------------------------- handlers -------------------------- */

    const changeFilter = (key) => {
        setFilter(key);
        setLimit(PAGE_SIZE);
    };
    const changeMethod = (key) => {
        setMethod(key);
        setLimit(PAGE_SIZE);
    };
    const changeQuery = (value) => {
        setQuery(value);
        setLimit(PAGE_SIZE);
    };

    const onTabKeyDown = (e) => {
        const index = filters.findIndex((f) => f.key === filter);
        let next = null;
        if (e.key === "ArrowRight") next = (index + 1) % filters.length;
        if (e.key === "ArrowLeft") next = (index - 1 + filters.length) % filters.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = filters.length - 1;
        if (next === null) return;
        e.preventDefault();
        const key = filters[next].key;
        changeFilter(key);
        tabRefs.current[key]?.focus();
    };

    /* ---------------------------- render ---------------------------- */

    if (loading) return <LoadingState />;

    const noPaymentsAtAll = payments.length === 0;

    return (
        <div className="pay-root">
            {/* ------------------------ Header ------------------------ */}
            <header className="pay-header">
                <div>
                    <h1 className="pay-title">Payments</h1>
                    <p className="pay-sub">Money from your completed services, paid and pending.</p>
                </div>

                <div className="pay-header-actions">
                    <button
                        type="button"
                        className="pay-btn pay-btn-secondary"
                        onClick={() => exportCsv(matches)}
                        disabled={matches.length === 0}
                        title="Download the payments shown below as a spreadsheet file"
                    >
                        <FaDownload aria-hidden="true" /> <span>Export</span>
                    </button>
                    <button
                        type="button"
                        className="pay-btn pay-btn-secondary"
                        onClick={() => load("refresh")}
                        disabled={refreshing}
                        aria-busy={refreshing}
                    >
                        <FaSyncAlt aria-hidden="true" className={refreshing ? "pay-spin" : ""} />
                        <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
                    </button>
                </div>
            </header>

            {error && (
                <div className="pay-notice" role="alert">
                    <FaExclamationTriangle className="pay-notice-icon" aria-hidden="true" />
                    <div className="pay-notice-body">
                        <p className="pay-notice-title">Couldn't load payments</p>
                        <p className="pay-notice-text">
                            {error}
                            {payments.length > 0 && " Showing the last data we had."}
                        </p>
                    </div>
                    <button type="button" className="pay-btn pay-btn-secondary pay-btn-sm" onClick={() => load("refresh")}>
                        Try again
                    </button>
                </div>
            )}

            {/* ------------------------ Summary ------------------------ */}
            <section className="pay-summary" aria-label="Payment summary">
                <SummaryCard
                    icon={FaWallet}
                    label="Total earned"
                    value={money(summary.earned)}
                    hint={`${summary.paid.length} paid ${summary.paid.length === 1 ? "payment" : "payments"}`}
                    tone="earned"
                />
                <SummaryCard
                    icon={FaCalendarAlt}
                    label="This month"
                    value={money(summary.month)}
                    hint={`${summary.monthCount} ${summary.monthCount === 1 ? "payment" : "payments"}`}
                    tone="primary"
                />
                <SummaryCard
                    icon={FaHourglassHalf}
                    label="Pending"
                    value={money(summary.pending)}
                    hint={`${summary.waiting.length} to collect`}
                    tone="warning"
                />
                <SummaryCard
                    icon={FaReceipt}
                    label="Transactions"
                    value={payments.length}
                    hint="All time"
                    tone="neutral"
                />
            </section>

            {/* ------------------------ History ------------------------ */}
            <section className="pay-panel" aria-labelledby="pay-history-title">
                <div className="pay-panel-head">
                    <div>
                        <h2 className="pay-panel-title" id="pay-history-title">Payment history</h2>
                        <p className="pay-panel-sub" aria-live="polite">
                            {matches.length} {matches.length === 1 ? "payment" : "payments"}
                            {filter !== "all" || method !== "all" || needle ? " match your view" : ""}
                        </p>
                    </div>
                </div>

                {!noPaymentsAtAll && (
                    <>
                        <div className="pay-tools">
                            <div className="pay-search">
                                <FaSearch className="pay-search-icon" aria-hidden="true" />
                                <input
                                    type="search"
                                    className="pay-search-input"
                                    placeholder="Search by request number, method or amount"
                                    aria-label="Search payments"
                                    value={query}
                                    onChange={(e) => changeQuery(e.target.value)}
                                />
                                {query && (
                                    <button
                                        type="button"
                                        className="pay-search-clear"
                                        onClick={() => changeQuery("")}
                                        aria-label="Clear search"
                                    >
                                        <FaTimes aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            <label className="pay-sort">
                                <span className="pay-sr">Sort payments</span>
                                <select
                                    className="pay-select"
                                    value={sort}
                                    onChange={(e) => {
                                        setSort(e.target.value);
                                        setLimit(PAGE_SIZE);
                                    }}
                                >
                                    {SORTS.map((s) => (
                                        <option key={s.key} value={s.key}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="pay-methods" role="group" aria-label="Payment method">
                            {METHODS.map((m) => (
                                <button
                                    key={m.key}
                                    type="button"
                                    className="pay-chip"
                                    aria-pressed={method === m.key}
                                    onClick={() => changeMethod(m.key)}
                                >
                                    {m.icon && <m.icon aria-hidden="true" />}
                                    {m.label}
                                    <span className="pay-chip-count">{methodCounts[m.key]}</span>
                                </button>
                            ))}
                        </div>

                        <div className="pay-tabs" role="tablist" aria-label="Filter payments" onKeyDown={onTabKeyDown}>
                            {filters.map((f) => {
                                const selected = filter === f.key;
                                return (
                                    <button
                                        key={f.key}
                                        ref={(el) => (tabRefs.current[f.key] = el)}
                                        type="button"
                                        role="tab"
                                        id={`pay-tab-${f.key}`}
                                        aria-selected={selected}
                                        aria-controls="pay-tabpanel"
                                        tabIndex={selected ? 0 : -1}
                                        className="pay-tab"
                                        onClick={() => changeFilter(f.key)}
                                    >
                                        {f.label}
                                        <span className="pay-tab-count">{f.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                <div id="pay-tabpanel" role="tabpanel" aria-labelledby={`pay-tab-${filter}`}>
                    {matches.length === 0 ? (
                        noPaymentsAtAll ? (
                            <EmptyState
                                icon={FaMoneyBillWave}
                                title="No payments yet"
                                description="Payments from your completed services will appear here."
                            />
                        ) : needle ? (
                            <EmptyState
                                icon={FaSearch}
                                title="No matches"
                                description={`Nothing matches "${query.trim()}" in this view.`}
                                action={
                                    <button type="button" className="pay-btn pay-btn-secondary pay-btn-sm" onClick={() => changeQuery("")}>
                                        Clear search
                                    </button>
                                }
                            />
                        ) : (
                            <EmptyState
                                icon={FaCheckCircle}
                                title="Nothing in this view"
                                description="Try a different filter to see other payments."
                                action={
                                    <button
                                        type="button"
                                        className="pay-btn pay-btn-secondary pay-btn-sm"
                                        onClick={() => {
                                            changeFilter("all");
                                            changeMethod("all");
                                        }}
                                    >
                                        Show all payments
                                    </button>
                                }
                            />
                        )
                    ) : (
                        <>
                            {groups.map((group) => (
                                <div className="pay-group" key={group.key}>
                                    {group.label && (
                                        <div className="pay-group-head">
                                            <h3 className="pay-group-label">{group.label}</h3>
                                            <span className="pay-group-total">
                                                {money(sum(group.items.filter((p) => PAID.includes(p.paymentStatus))))} paid
                                            </span>
                                        </div>
                                    )}
                                    <ul className="pay-list">
                                        {group.items.map((payment, i) => (
                                            <li key={payment.id ?? `${group.key}-${i}`}>
                                                <PaymentRow payment={payment} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}

                            {remaining > 0 && (
                                <button
                                    type="button"
                                    className="pay-btn pay-btn-secondary pay-more"
                                    onClick={() => setLimit((n) => n + PAGE_SIZE)}
                                >
                                    Show {Math.min(remaining, PAGE_SIZE)} more
                                    <span className="pay-more-left">({remaining} left)</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}

function Payments() {
    return (
        <MechanicLayout>
            <PaymentsContent />
        </MechanicLayout>
    );
}

export default Payments;