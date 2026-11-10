import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";
import { getMyRequests } from "../../services/mechanicService";
import "../../styles/Requests.css";

import {
    FaSyncAlt,
    FaExclamationTriangle,
    FaInbox,
    FaCarSide,
    FaMapMarkerAlt,
    FaHourglassHalf,
    FaMoneyBillWave,
    FaTools,
    FaCheckCircle,
    FaTimesCircle,
    FaBan,
    FaChevronRight,
    FaSearch,
    FaTimes,
    FaThumbsUp,
    FaSlidersH,
    FaListUl,
    FaBolt,
    FaWrench,
    FaArrowRight,
    FaWifi
} from "react-icons/fa";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 30000;

/*
 * priority: lower = needs attention sooner (used by the "Needs attention" sort)
 * action:   short hint telling the mechanic what to do next
 */
const STATUS_META = {
    PENDING: { label: "New request", tone: "warning", icon: FaHourglassHalf, priority: 1, action: { text: "Review and respond", tone: "warning" } },
    WAITING_FOR_QUOTATION: { label: "Quotation needed", tone: "warning", icon: FaMoneyBillWave, priority: 2, action: { text: "Send a quotation", tone: "warning" } },
    QUOTATION_PENDING: { label: "Quotation sent", tone: "info", icon: FaMoneyBillWave, priority: 4, action: { text: "Waiting for customer", tone: "muted" } },
    ACCEPTED: { label: "Accepted", tone: "primary", icon: FaThumbsUp, priority: 3, action: { text: "Start the job", tone: "info" } },
    IN_PROGRESS: { label: "In progress", tone: "primary", icon: FaTools, priority: 3, action: { text: "Update progress", tone: "info" } },
    COMPLETED: { label: "Completed", tone: "success", icon: FaCheckCircle, priority: 6, action: { text: "View summary", tone: "success" } },
    CLOSED: { label: "Closed", tone: "success", icon: FaCheckCircle, priority: 6, action: { text: "View summary", tone: "success" } },
    REJECTED: { label: "Rejected", tone: "danger", icon: FaTimesCircle, priority: 7, action: { text: "View details", tone: "muted" } },
    CANCELLED: { label: "Cancelled", tone: "neutral", icon: FaBan, priority: 7, action: { text: "View details", tone: "muted" } }
};

const STAGES = [
    { key: "ON_THE_WAY", label: "On the way" },
    { key: "ARRIVED", label: "Arrived" },
    { key: "REPAIRING", label: "Repairing" }
];

/* Status groups used by the filter panel and the summary cards. */
const GROUPS = [
    { key: "attention", label: "Needs action", statuses: ["PENDING", "WAITING_FOR_QUOTATION"] },
    { key: "waiting", label: "Waiting on customer", statuses: ["QUOTATION_PENDING"] },
    { key: "active", label: "Active jobs", statuses: ["ACCEPTED", "IN_PROGRESS"] },
    { key: "done", label: "Completed", statuses: ["COMPLETED", "CLOSED"] },
    { key: "closed", label: "Rejected / Cancelled", statuses: ["REJECTED", "CANCELLED"] }
];

const SORTS = [
    { key: "attention", label: "Needs attention first" },
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" }
];

const SUMMARY_CARDS = [
    { key: "all", label: "All requests", tone: "neutral", icon: FaListUl, groups: null },
    { key: "attention", label: "Needs action", tone: "warning", icon: FaBolt, groups: ["attention"] },
    { key: "active", label: "Active jobs", tone: "info", icon: FaWrench, groups: ["active"] },
    { key: "done", label: "Completed", tone: "success", icon: FaCheckCircle, groups: ["done"] }
];

const groupStatuses = (keys) => GROUPS.filter((g) => keys.includes(g.key)).flatMap((g) => g.statuses);

const getMeta = (status) =>
    STATUS_META[status] || { label: status || "Unknown", tone: "neutral", icon: FaBan, priority: 8, action: { text: "View details", tone: "muted" } };

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const getDate = (r) => {
    const raw = r.createdAt || r.requestedAt || r.requestDate || r.createdDate;
    const d = raw ? new Date(raw) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
};

const timeAgo = (date) => {
    if (!date) return "";
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

const initials = (name) =>
    (name || "C")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "C";

const idValue = (r) => {
    const n = Number(r.requestId);
    return Number.isNaN(n) ? 0 : n;
};

/* Read ?status=COMPLETED (or any known status) from the URL. */
const initialStatuses = () => {
    const s = new URLSearchParams(window.location.search).get("status");
    return s && STATUS_META[s] ? [s] : [];
};

/* ================================================================== */
/* Small components                                                    */
/* ================================================================== */

function StageProgress({ stage }) {
    const current = STAGES.findIndex((s) => s.key === stage);
    if (current === -1) return null;
    return (
        <div className="rq-steps" aria-label={`Stage: ${STAGES[current].label}`}>
            {STAGES.map((s, i) => (
                <span key={s.key} style={{ display: "contents" }}>
                    <span className="rq-step" data-state={i < current ? "done" : i === current ? "current" : "todo"}>
                        <i />
                        <span>{s.label}</span>
                    </span>
                    {i < STAGES.length - 1 && <span className="rq-step-line" aria-hidden="true" />}
                </span>
            ))}
        </div>
    );
}

function RequestCard({ r }) {
    const meta = getMeta(r.status);
    const Icon = meta.icon;
    const urgent = r.status === "PENDING" || r.status === "WAITING_FOR_QUOTATION";
    const when = timeAgo(getDate(r));

    return (
        <Link to={`/mechanic/requests/${r.requestId}`} className="rq-card" data-urgent={urgent}>
            <div className="rq-card-top">
                <span className="rq-badge" data-tone={meta.tone}>
                    <Icon aria-hidden="true" /> {meta.label}
                </span>
                <span className="rq-card-id">#{r.requestId}</span>
                {when && <span className="rq-card-time">{when}</span>}
            </div>

            <div className="rq-card-main">
                <span className="rq-avatar" aria-hidden="true">{initials(r.customerName)}</span>
                <div className="rq-card-who">
                    <p className="rq-card-name">{r.customerName || "Customer"}</p>
                    <p className="rq-card-vehicle">
                        <FaCarSide aria-hidden="true" /> {r.vehicle || "Vehicle information unavailable"}
                    </p>
                </div>
                <FaChevronRight className="rq-chevron" aria-hidden="true" />
            </div>

            <div className="rq-route">
                <p className="rq-card-place">
                    <FaMapMarkerAlt aria-hidden="true" /> {r.location || "Location unavailable"}
                </p>
            </div>

            <p className="rq-issue">
                <span className="rq-issue-label">Issue: </span>
                {r.issue || "No description provided"}
            </p>

            <div className="rq-foot">
                {r.status === "IN_PROGRESS" && r.serviceStage ? (
                    <StageProgress stage={r.serviceStage} />
                ) : (
                    <span className="rq-next" data-tone={meta.action.tone}>
                        {meta.action.text}
                    </span>
                )}
                {r.status === "IN_PROGRESS" && (
                    <span className="rq-next" data-tone="info">
                        {meta.action.text} <FaArrowRight aria-hidden="true" />
                    </span>
                )}
            </div>
        </Link>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function RequestsContent() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [syncFailed, setSyncFailed] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const [statuses, setStatuses] = useState(initialStatuses); // selected statuses; empty = all
    const [sort, setSort] = useState("attention");
    const [query, setQuery] = useState("");
    const [panelOpen, setPanelOpen] = useState(false);

    const searchRef = useRef(null);
    const toolbarRef = useRef(null);

    /* ---------- data ---------- */

    const load = useCallback(async (silent = false) => {
        try {
            if (!silent) setError("");
            const response = await getMyRequests();
            setRequests(Array.isArray(response.data) ? response.data : []);
            setLastUpdated(new Date());
            setSyncFailed(false);
            setError("");
        } catch (err) {
            console.error("Failed to load requests:", err);
            if (silent) setSyncFailed(true);
            else setError(err.response?.data?.message || "Failed to load service requests.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(() => !document.hidden && load(true), POLL_MS);
        return () => clearInterval(id);
    }, [load]);

    const handleRefresh = () => {
        setRefreshing(true);
        load();
    };

    /* ---------- keyboard + outside click ---------- */

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") setPanelOpen(false);
            const tag = document.activeElement?.tagName;
            if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        const onClick = (e) => {
            if (window.innerWidth > 760 && toolbarRef.current && !toolbarRef.current.contains(e.target)) {
                setPanelOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onClick);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onClick);
        };
    }, []);

    /* ---------- derived ---------- */

    const statusCounts = useMemo(() => {
        const out = {};
        requests.forEach((r) => {
            out[r.status] = (out[r.status] || 0) + 1;
        });
        return out;
    }, [requests]);

    const countFor = useCallback(
        (list) => (list ? list.reduce((sum, s) => sum + (statusCounts[s] || 0), 0) : requests.length),
        [statusCounts, requests.length]
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = requests
            .filter((r) => statuses.length === 0 || statuses.includes(r.status))
            .filter(
                (r) =>
                    !q ||
                    [r.requestId, r.customerName, r.vehicle, r.location, r.issue]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase()
                        .includes(q)
            );

        const byNewest = (a, b) => idValue(b) - idValue(a);
        if (sort === "oldest") return list.sort((a, b) => -byNewest(a, b));
        if (sort === "attention") {
            return list.sort((a, b) => getMeta(a.status).priority - getMeta(b.status).priority || byNewest(a, b));
        }
        return list.sort(byNewest);
    }, [requests, statuses, query, sort]);

    const isFiltered = statuses.length > 0 || query.trim() !== "";
    const filterCount = statuses.length + (sort !== "attention" ? 1 : 0);

    /* ---------- actions ---------- */

    const toggleStatus = (list) => {
        setStatuses((prev) => {
            const allOn = list.every((s) => prev.includes(s));
            return allOn ? prev.filter((s) => !list.includes(s)) : [...new Set([...prev, ...list])];
        });
    };

    const applyCard = (card) => {
        setStatuses(card.groups ? groupStatuses(card.groups) : []);
    };

    const cardActive = (card) => {
        const target = card.groups ? groupStatuses(card.groups) : [];
        return target.length === statuses.length && target.every((s) => statuses.includes(s));
    };

    const clearAll = () => {
        setStatuses([]);
        setQuery("");
        setSort("attention");
    };

    /* ---------- render ---------- */

    return (
        <div className="rq-root">
            <header className="rq-header">
                <div>
                    <h1 className="rq-title">My requests</h1>
                    <p className="rq-sub">
                        <span className="rq-updated">
                            <span className="rq-live-dot" aria-hidden="true" />
                            {lastUpdated
                                ? `Live · updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : "Loading your jobs…"}
                        </span>
                    </p>
                </div>
                <button type="button" className="rq-btn" onClick={handleRefresh} disabled={loading || refreshing}>
                    <FaSyncAlt aria-hidden="true" className={refreshing ? "rq-spin" : ""} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                </button>
            </header>

            {syncFailed && !error && (
                <div className="rq-banner" role="status">
                    <FaWifi aria-hidden="true" /> Couldn't refresh just now. Showing your last loaded list.
                </div>
            )}

            {/* Summary cards double as quick filters */}
            <section className="rq-stats" aria-label="Quick filters">
                {SUMMARY_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.key}
                            type="button"
                            className="rq-stat"
                            data-tone={card.tone}
                            aria-pressed={cardActive(card)}
                            onClick={() => applyCard(card)}
                        >
                            <span className="rq-stat-top">
                                <span className="rq-stat-ico"><Icon aria-hidden="true" /></span>
                                {card.label}
                            </span>
                            <span className="rq-stat-num">{loading ? "–" : countFor(card.groups ? groupStatuses(card.groups) : null)}</span>
                        </button>
                    );
                })}
            </section>

            {/* Search + filter */}
            <div className="rq-toolbar" ref={toolbarRef}>
                <div className="rq-search">
                    <FaSearch aria-hidden="true" />
                    <input
                        ref={searchRef}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search name, vehicle, place or request no."
                        aria-label="Search requests"
                    />
                    {query ? (
                        <button type="button" className="rq-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                            <FaTimes aria-hidden="true" />
                        </button>
                    ) : (
                        <span className="rq-kbd" aria-hidden="true">/</span>
                    )}
                </div>

                <button
                    type="button"
                    className="rq-btn rq-filter-btn"
                    aria-expanded={panelOpen}
                    aria-controls="rq-filter-panel"
                    onClick={() => setPanelOpen((o) => !o)}
                >
                    <FaSlidersH aria-hidden="true" />
                    <span className="rq-filter-text">Filter &amp; sort</span>
                    {filterCount > 0 && <span className="rq-filter-badge">{filterCount}</span>}
                </button>

                {panelOpen && (
                    <>
                        <div className="rq-scrim" onClick={() => setPanelOpen(false)} />
                        <div className="rq-panel" id="rq-filter-panel" role="dialog" aria-label="Filter and sort requests">
                            <div className="rq-panel-head">
                                <h2 className="rq-panel-title">Filter &amp; sort</h2>
                                <button type="button" className="rq-panel-close" onClick={() => setPanelOpen(false)} aria-label="Close filters">
                                    <FaTimes aria-hidden="true" />
                                </button>
                            </div>

                            <div className="rq-group">
                                <p className="rq-group-label">Status</p>
                                <div className="rq-chips">
                                    {GROUPS.map((g) => (
                                        <button
                                            key={g.key}
                                            type="button"
                                            className="rq-chip"
                                            aria-pressed={g.statuses.every((s) => statuses.includes(s))}
                                            onClick={() => toggleStatus(g.statuses)}
                                        >
                                            {g.label}
                                            <span className="rq-chip-count">{countFor(g.statuses)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rq-group">
                                <label className="rq-group-label" htmlFor="rq-sort">Sort by</label>
                                <select id="rq-sort" className="rq-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                                    {SORTS.map((s) => (
                                        <option key={s.key} value={s.key}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="rq-panel-foot">
                                <button type="button" className="rq-btn" onClick={clearAll}>Reset</button>
                                <button type="button" className="rq-btn rq-btn-dark" onClick={() => setPanelOpen(false)}>
                                    Show {visible.length} request{visible.length === 1 ? "" : "s"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Applied filters */}
            {!loading && !error && requests.length > 0 && (
                <div className="rq-active" aria-live="polite">
                    <span className="rq-result-count">
                        {visible.length} request{visible.length === 1 ? "" : "s"}
                    </span>
                    {statuses.map((s) => (
                        <button key={s} type="button" className="rq-tag" onClick={() => toggleStatus([s])} aria-label={`Remove ${getMeta(s).label} filter`}>
                            {getMeta(s).label}
                            <span className="rq-tag-x"><FaTimes aria-hidden="true" /></span>
                        </button>
                    ))}
                    {isFiltered && (
                        <button type="button" className="rq-btn rq-btn-link" onClick={clearAll}>Clear all</button>
                    )}
                </div>
            )}

            {loading && (
                <div className="rq-list" aria-busy="true" aria-label="Loading requests">
                    {[0, 1, 2].map((i) => <div key={i} className="rq-skeleton" />)}
                </div>
            )}

            {!loading && error && (
                <div className="rq-alert" role="alert">
                    <FaExclamationTriangle className="rq-alert-ico" aria-hidden="true" />
                    <div>
                        <p className="rq-alert-title">Couldn't load your requests</p>
                        <p className="rq-alert-text">{error}</p>
                        <button type="button" className="rq-btn" onClick={() => load()}>Try again</button>
                    </div>
                </div>
            )}

            {!loading && !error && visible.length === 0 && (
                <div className="rq-state">
                    <span className="rq-state-ico"><FaInbox aria-hidden="true" /></span>
                    <h2 className="rq-state-title">{requests.length === 0 ? "No requests yet" : "No matching requests"}</h2>
                    <p className="rq-state-text">
                        {requests.length === 0
                            ? "New service requests will appear here as soon as customers reach out."
                            : "Try a different status or search term."}
                    </p>
                    {requests.length > 0 && (
                        <button type="button" className="rq-btn rq-btn-dark" onClick={clearAll}>Clear filters</button>
                    )}
                </div>
            )}

            {!loading && !error && visible.length > 0 && (
                <div className="rq-list">
                    {visible.map((r) => <RequestCard key={r.requestId} r={r} />)}
                </div>
            )}
        </div>
    );
}

function Requests() {
    return (
        <MechanicLayout>
            <RequestsContent />
        </MechanicLayout>
    );
}

export default Requests;