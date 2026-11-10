import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { getRequests } from "../../services/adminService";

import {
    FaSyncAlt,
    FaSearch,
    FaDownload,
    FaClipboardList,
    FaTimes,
    FaExclamationTriangle
} from "react-icons/fa";

import "../../styles/AdminRequests.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 60000;
const PAGE_SIZE = 20;

const ROUTES = {
    request: (id) => `/admin/requests/${id}`
};

/*
 * Tabs match the dashboard cards. "Completed" also holds CLOSED requests and
 * "Quotation" holds both quotation states, so there are only a few tabs.
 */
const TABS = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "QUOTATION_PENDING", label: "Quotation" },
    { key: "IN_PROGRESS", label: "In progress" },
    { key: "COMPLETED", label: "Completed" },
    { key: "CANCELLED", label: "Cancelled" }
];

const TAB_KEYS = TABS.map((t) => t.key);

const RANGES = [
    { key: "ANY", label: "Any time", days: 0 },
    { key: "1", label: "Today", days: 1 },
    { key: "7", label: "Last 7 days", days: 7 },
    { key: "30", label: "Last 30 days", days: 30 }
];

const SORTS = [
    { key: "new", label: "Newest first" },
    { key: "old", label: "Oldest first" }
];

const TONES = {
    PENDING: "amber",
    WAITING_FOR_QUOTATION: "blue",
    QUOTATION_PENDING: "blue",
    IN_PROGRESS: "purple",
    COMPLETED: "green",
    CLOSED: "green",
    CANCELLED: "red"
};

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const idOf = (r) => r.requestId ?? r.id;

const statusLabel = (status) =>
    status
        ? status
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Unknown";

/* Which tab a request belongs to. */
const groupOf = (status) => {
    if (status === "CLOSED") return "COMPLETED";
    if (status === "WAITING_FOR_QUOTATION") return "QUOTATION_PENDING";
    return status;
};

/* The URL may carry any status the dashboard or an old link used. */
const tabFromParam = (value) => {
    const group = groupOf(String(value || "").toUpperCase());
    return TAB_KEYS.includes(group) ? group : "ALL";
};

const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?";

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
    const header = ["Request ID", "Customer", "Provider", "Vehicle", "Issue", "Location", "Status", "Created"];
    const lines = rows.map((r) =>
        [
            idOf(r),
            r.customerName,
            r.mechanicName,
            r.vehicle,
            r.issue,
            r.location,
            statusLabel(r.status),
            dateOf(r.createdAt)?.toLocaleString("en-IN") || ""
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
    link.download = `roadaid-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function StatusPill({ status }) {
    return (
        <span className="rq-status" data-tone={TONES[status] || "grey"}>
            <i aria-hidden="true" />
            {statusLabel(status)}
        </span>
    );
}

function RequestRow({ request }) {
    const provider = request.mechanicName && request.mechanicName !== "Not Assigned" ? request.mechanicName : "";

    return (
        <Link to={ROUTES.request(idOf(request))} className="rq-row" role="listitem">
            <span className="rq-id">
                <b>#{idOf(request)}</b>
                <small>{dateText(request.createdAt)}</small>
            </span>

            <span className="rq-customer">{request.customerName || "—"}</span>

            <span className="rq-muted">{provider || <em>Not assigned</em>}</span>

            <span className="rq-muted">{request.vehicle?.trim() || "—"}</span>

            <StatusPill status={request.status} />
        </Link>
    );
}

function SkeletonRows() {
    return (
        <div className="rq-list" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="rq-row rq-skel-row" key={i}>
                    <span className="rq-skel" />
                    <span className="rq-skel" />
                    <span className="rq-skel" />
                </div>
            ))}
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function Requests() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [, tick] = useState(0);

    const [tab, setTab] = useState(() => tabFromParam(searchParams.get("status")));
    const [query, setQuery] = useState(() => searchParams.get("q") || searchParams.get("customer") || "");
    const [range, setRange] = useState("ANY");
    const [sort, setSort] = useState("new");
    const [shown, setShown] = useState(PAGE_SIZE);

    const searchRef = useRef(null);
    const hasData = useRef(false);

    /* ---------- Load ---------- */

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setRefreshing(true);

        try {
            /* One fetch for everything; the tabs, search and counts all work on it. */
            const response = await getRequests("", "");
            const list = Array.isArray(response?.data) ? response.data : [];
            setRequests(list);
            hasData.current = true;
            setError("");
            setUpdatedAt(new Date());
        } catch (err) {
            console.error("Failed to load requests:", err);
            /* Keep the list on screen when a background refresh fails. */
            if (!silent || !hasData.current) {
                setError(err.response?.data?.message || "Could not load service requests.");
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

    /* Keep the address bar in step so a filtered view can be shared or reloaded. */
    useEffect(() => {
        const next = {};
        if (tab !== "ALL") next.status = tab;
        if (query.trim()) next.q = query.trim();
        setSearchParams(next, { replace: true });
    }, [tab, query, setSearchParams]);

    useEffect(() => {
        setShown(PAGE_SIZE);
    }, [tab, query, range, sort]);

    /* ---------- Derived ---------- */

    const counts = useMemo(() => {
        const result = { ALL: requests.length, OTHER: 0 };
        requests.forEach((r) => {
            const group = groupOf(r.status);
            if (TAB_KEYS.includes(group)) result[group] = (result[group] || 0) + 1;
            else result.OTHER += 1;
        });
        return result;
    }, [requests]);

    const visible = useMemo(() => {
        const text = query.trim().toLowerCase();
        const days = RANGES.find((r) => r.key === range)?.days || 0;
        const since = days ? startOfRange(days) : null;

        const list = requests.filter((r) => {
            const group = groupOf(r.status);
            if (tab === "OTHER") {
                if (TAB_KEYS.includes(group)) return false;
            } else if (tab !== "ALL" && group !== tab) {
                return false;
            }

            if (since) {
                const created = dateOf(r.createdAt);
                if (!created || created < since) return false;
            }

            if (!text) return true;

            return [idOf(r), r.customerName, r.mechanicName, r.vehicle, r.location, r.issue]
                .filter((v) => v !== undefined && v !== null)
                .join(" ")
                .toLowerCase()
                .includes(text);
        });

        list.sort((a, b) => {
            const diff = (dateOf(a.createdAt)?.getTime() || 0) - (dateOf(b.createdAt)?.getTime() || 0);
            return sort === "old" ? diff : -diff;
        });

        return list;
    }, [requests, tab, query, range, sort]);

    const tabs = counts.OTHER > 0 ? [...TABS, { key: "OTHER", label: "Other" }] : TABS;
    const hasFilters = tab !== "ALL" || query.trim() !== "" || range !== "ANY" || sort !== "new";

    const clearFilters = () => {
        setTab("ALL");
        setQuery("");
        setRange("ANY");
        setSort("new");
    };

    /* ---------- Render ---------- */

    return (
        <AdminLayout>
            <div className="rq-root">
                <header className="rq-header">
                    <div>
                        <h1 className="rq-title">Service requests</h1>
                        <p className="rq-sub">
                            {loading ? "Loading…" : `${requests.length} in total`}
                            {updatedAt && <> · updated {updatedText(updatedAt)}</>}
                        </p>
                    </div>

                    <div className="rq-header-actions">
                        <button
                            type="button"
                            className="rq-btn"
                            onClick={() => exportCsv(visible)}
                            disabled={visible.length === 0}
                        >
                            <FaDownload aria-hidden="true" /> Export
                        </button>
                        <button type="button" className="rq-btn" onClick={() => load()} disabled={refreshing}>
                            <FaSyncAlt className={refreshing ? "rq-spin" : ""} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="rq-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{error}</span>
                        <button type="button" onClick={() => load()}>Try again</button>
                    </div>
                )}

                <nav className="rq-tabs" aria-label="Filter by status">
                    {tabs.map((t) => (
                        <button
                            type="button"
                            key={t.key}
                            className="rq-tab"
                            aria-pressed={tab === t.key}
                            onClick={() => setTab(t.key)}
                        >
                            {t.label}
                            <span>{loading ? "" : counts[t.key] || 0}</span>
                        </button>
                    ))}
                </nav>

                <section className="rq-filters" aria-label="Search and filters">
                    <label className="rq-search">
                        <FaSearch aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="search"
                            placeholder="Search by customer, provider, vehicle or ID"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Search requests"
                        />
                        {query && (
                            <button type="button" className="rq-clear" onClick={() => setQuery("")} aria-label="Clear search">
                                <FaTimes aria-hidden="true" />
                            </button>
                        )}
                    </label>

                    <select className="rq-select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
                        {RANGES.map((r) => (
                            <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                    </select>

                    <select className="rq-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort order">
                        {SORTS.map((o) => (
                            <option key={o.key} value={o.key}>{o.label}</option>
                        ))}
                    </select>

                    {hasFilters && (
                        <button type="button" className="rq-link-btn" onClick={clearFilters}>Reset</button>
                    )}
                </section>

                {loading ? (
                    <SkeletonRows />
                ) : requests.length === 0 ? (
                    <div className="rq-empty">
                        <span className="rq-empty-icon" aria-hidden="true"><FaClipboardList /></span>
                        <h2>No service requests yet</h2>
                        <p>Requests will appear here as soon as customers raise them.</p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rq-empty">
                        <span className="rq-empty-icon" aria-hidden="true"><FaSearch /></span>
                        <h2>No matching requests</h2>
                        <p>Try a different status, date range or search.</p>
                        <button type="button" className="rq-btn" onClick={clearFilters}>Reset filters</button>
                    </div>
                ) : (
                    <>
                        <div className="rq-list" role="list" aria-live="polite">
                            <div className="rq-head" aria-hidden="true">
                                <span>Request</span>
                                <span>Customer</span>
                                <span>Provider</span>
                                <span>Vehicle</span>
                                <span>Status</span>
                            </div>

                            {visible.slice(0, shown).map((request) => (
                                <RequestRow key={idOf(request)} request={request} />
                            ))}
                        </div>

                        {shown < visible.length && (
                            <button type="button" className="rq-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
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

export default Requests;