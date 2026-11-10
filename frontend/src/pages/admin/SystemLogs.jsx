import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { getSystemLogs } from "../../services/adminService";

import {
    FaClipboardList,
    FaSearch,
    FaSyncAlt,
    FaDownload,
    FaTimes,
    FaUserCheck,
    FaUserTimes,
    FaTools,
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle
} from "react-icons/fa";

import "../../styles/syslogs.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 60000;
const PAGE_SIZE = 30;

/* Where a log entry's target opens. Same paths as before. */
const TARGET_ROUTES = {
    USER: (id) => `/admin/users/${id}`,
    MECHANIC: (id) => `/admin/mechanics/${id}`,
    REQUEST: (id) => `/admin/requests/${id}`
};

const ACTIONS = {
    USER_ACTIVATED: { label: "User activated", tone: "green", icon: <FaUserCheck /> },
    USER_DEACTIVATED: { label: "User deactivated", tone: "red", icon: <FaUserTimes /> },
    MECHANIC_APPROVED: { label: "Mechanic approved", tone: "green", icon: <FaTools /> },
    MECHANIC_REJECTED: { label: "Mechanic rejected", tone: "red", icon: <FaTools /> },
    COMPLAINT_RESOLVED: { label: "Complaint resolved", tone: "green", icon: <FaCheckCircle /> },
    COMPLAINT_REJECTED: { label: "Complaint rejected", tone: "red", icon: <FaTimesCircle /> }
};

const FALLBACK = { tone: "grey", icon: <FaClipboardList /> };

const RANGES = [
    { key: "ANY", label: "Any time", days: 0 },
    { key: "1", label: "Today", days: 1 },
    { key: "7", label: "Last 7 days", days: 7 },
    { key: "30", label: "Last 30 days", days: 30 }
];

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const actionMeta = (action) => {
    const known = ACTIONS[action];
    if (known) return known;

    const label = String(action || "Activity")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());

    return { ...FALLBACK, label };
};

const dateOf = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const timeText = (value) => {
    const date = dateOf(value);
    return date ? date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "—";
};

const fullDate = (value) => {
    const date = dateOf(value);
    return date
        ? date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
        : "";
};

const dayKey = (value) => {
    const date = dateOf(value);
    return date ? date.toDateString() : "unknown";
};

const dayLabel = (value) => {
    const date = dateOf(value);
    if (!date) return "Unknown date";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
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

const targetLabel = (log) =>
    `${String(log.targetType || "").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} #${log.targetId}`;

/* A cell that starts with = + - @ can run as a formula in Excel, so neutralise it. */
const csvCell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
};

const exportCsv = (rows) => {
    const header = ["Time", "Admin", "Admin email", "Action", "Target", "Description"];
    const lines = rows.map((log) =>
        [
            fullDate(log.createdAt),
            log.user?.fullName || "System",
            log.user?.email || "",
            actionMeta(log.action).label,
            log.targetId ? targetLabel(log) : "",
            log.description || ""
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
    link.download = `roadaid-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function LogEntry({ log }) {
    const meta = actionMeta(log.action);
    const route = log.targetId && log.targetType ? TARGET_ROUTES[String(log.targetType).toUpperCase()] : null;

    return (
        <li className="sl-entry">
            <span className="sl-icon" data-tone={meta.tone} aria-hidden="true">{meta.icon}</span>

            <div className="sl-body">
                <p className="sl-title">{meta.label}</p>
                {log.description && <p className="sl-desc">{log.description}</p>}
                <p className="sl-meta">
                    by {log.user?.fullName || "System"}
                    {log.user?.email && <span className="sl-email"> · {log.user.email}</span>}
                </p>
            </div>

            <div className="sl-side">
                <time dateTime={log.createdAt} title={fullDate(log.createdAt)}>{timeText(log.createdAt)}</time>

                {log.targetId ? (
                    route ? (
                        <Link to={route(log.targetId)} className="sl-target">
                            {targetLabel(log)} →
                        </Link>
                    ) : (
                        <span className="sl-target sl-target-plain">{targetLabel(log)}</span>
                    )
                ) : null}
            </div>
        </li>
    );
}

function SkeletonFeed() {
    return (
        <div className="sl-card" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
                <div className="sl-entry" key={i}>
                    <span className="sl-skel sl-skel-icon" />
                    <div className="sl-body">
                        <span className="sl-skel sl-skel-line" />
                        <span className="sl-skel sl-skel-line sl-skel-short" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function SystemLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [, tick] = useState(0);

    const [query, setQuery] = useState("");
    const [type, setType] = useState("ALL");
    const [range, setRange] = useState("ANY");
    const [shown, setShown] = useState(PAGE_SIZE);

    const searchRef = useRef(null);
    const hasData = useRef(false);

    /* ---------- Load ---------- */

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setRefreshing(true);

        try {
            /* One fetch for everything; the type filter, counts and search all work on it. */
            const response = await getSystemLogs("");
            const list = Array.isArray(response?.data) ? response.data : [];

            /* Newest first, whatever order the server used. */
            list.sort((a, b) => (dateOf(b.createdAt)?.getTime() || 0) - (dateOf(a.createdAt)?.getTime() || 0));

            setLogs(list);
            hasData.current = true;
            setError("");
            setUpdatedAt(new Date());
        } catch (err) {
            console.error("Failed to load system logs:", err);
            /* Keep the feed on screen when a background refresh fails. */
            if (!silent || !hasData.current) setError("Unable to load system activity logs.");
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

    useEffect(() => {
        setShown(PAGE_SIZE);
    }, [query, type, range]);

    /* ---------- Derived ---------- */

    /* Types that actually appear, with counts, so the dropdown never lists empty choices. */
    const typeCounts = useMemo(() => {
        const counts = {};
        logs.forEach((log) => {
            counts[log.action] = (counts[log.action] || 0) + 1;
        });
        return counts;
    }, [logs]);

    const typeOptions = useMemo(() => {
        const present = Object.keys(typeCounts);
        const known = Object.keys(ACTIONS).filter((key) => present.includes(key));
        const other = present.filter((key) => !ACTIONS[key]);
        return [...known, ...other];
    }, [typeCounts]);

    const visible = useMemo(() => {
        const text = query.trim().toLowerCase();
        const days = RANGES.find((r) => r.key === range)?.days || 0;
        const since = days ? startOfRange(days) : null;

        return logs.filter((log) => {
            if (type !== "ALL" && log.action !== type) return false;

            if (since) {
                const created = dateOf(log.createdAt);
                if (!created || created < since) return false;
            }

            if (!text) return true;

            return [
                actionMeta(log.action).label,
                log.action,
                log.description,
                log.targetType,
                log.targetId,
                log.user?.fullName,
                log.user?.email
            ]
                .filter((v) => v !== undefined && v !== null)
                .join(" ")
                .toLowerCase()
                .includes(text);
        });
    }, [logs, query, type, range]);

    /* Group the visible page of entries by day. */
    const days = useMemo(() => {
        const groups = [];
        visible.slice(0, shown).forEach((log) => {
            const key = dayKey(log.createdAt);
            const last = groups[groups.length - 1];

            if (last && last.key === key) last.items.push(log);
            else groups.push({ key, label: dayLabel(log.createdAt), items: [log] });
        });
        return groups;
    }, [visible, shown]);

    const hasFilters = query.trim() !== "" || type !== "ALL" || range !== "ANY";

    const clearFilters = () => {
        setQuery("");
        setType("ALL");
        setRange("ANY");
    };

    /* ---------- Render ---------- */

    return (
        <AdminLayout>
            <div className="sl-root">
                <header className="sl-header">
                    <div>
                        <h1 className="sl-title-main">System logs</h1>
                        <p className="sl-sub">
                            {loading ? "Loading…" : `${logs.length} recorded ${logs.length === 1 ? "action" : "actions"}`}
                            {updatedAt && <> · updated {updatedText(updatedAt)}</>}
                        </p>
                    </div>

                    <div className="sl-header-actions">
                        <button
                            type="button"
                            className="sl-btn"
                            onClick={() => exportCsv(visible)}
                            disabled={visible.length === 0}
                        >
                            <FaDownload aria-hidden="true" /> Export
                        </button>
                        <button type="button" className="sl-btn" onClick={() => load()} disabled={refreshing}>
                            <FaSyncAlt className={refreshing ? "sl-spin" : ""} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="sl-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{error}</span>
                        <button type="button" onClick={() => load()}>Try again</button>
                    </div>
                )}

                <section className="sl-filters" aria-label="Search and filters">
                    <label className="sl-search">
                        <FaSearch aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="search"
                            placeholder="Search by admin, action, target or description"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label="Search activity"
                        />
                        {query && (
                            <button type="button" className="sl-clear" onClick={() => setQuery("")} aria-label="Clear search">
                                <FaTimes aria-hidden="true" />
                            </button>
                        )}
                    </label>

                    <select className="sl-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Activity type">
                        <option value="ALL">All activity ({logs.length})</option>
                        {typeOptions.map((key) => (
                            <option key={key} value={key}>
                                {actionMeta(key).label} ({typeCounts[key] || 0})
                            </option>
                        ))}
                    </select>

                    <select className="sl-select" value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range">
                        {RANGES.map((r) => (
                            <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                    </select>

                    {hasFilters && (
                        <button type="button" className="sl-link-btn" onClick={clearFilters}>Reset</button>
                    )}
                </section>

                {loading ? (
                    <SkeletonFeed />
                ) : logs.length === 0 ? (
                    <div className="sl-empty">
                        <span className="sl-empty-icon" aria-hidden="true"><FaClipboardList /></span>
                        <h2>No activity recorded yet</h2>
                        <p>Approvals, rejections and account changes will be listed here.</p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="sl-empty">
                        <span className="sl-empty-icon" aria-hidden="true"><FaSearch /></span>
                        <h2>No matching activity</h2>
                        <p>Try a different type, date range or search.</p>
                        <button type="button" className="sl-btn" onClick={clearFilters}>Reset filters</button>
                    </div>
                ) : (
                    <>
                        <div className="sl-feed" aria-live="polite">
                            {days.map((day) => (
                                <section key={day.key} className="sl-day">
                                    <h2 className="sl-day-label">{day.label}</h2>
                                    <ul className="sl-card">
                                        {day.items.map((log) => (
                                            <LogEntry key={log.id} log={log} />
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        {shown < visible.length && (
                            <button type="button" className="sl-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
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

export default SystemLogs;