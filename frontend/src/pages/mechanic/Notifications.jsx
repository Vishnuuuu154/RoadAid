import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MechanicLayout, { useConfirm, useToast } from "../../layouts/MechanicLayout";
import api from "../../services/api";
import { markAllNotificationsAsRead } from "../../services/notificationService";
import "../../styles/mechnotifi.css";

import {
    FaBell,
    FaBellSlash,
    FaCheckDouble,
    FaCheck,
    FaTrashAlt,
    FaSyncAlt,
    FaSearch,
    FaTimes,
    FaSlidersH,
    FaExclamationTriangle,
    FaWifi,
    FaMoneyBillWave,
    FaFileInvoiceDollar,
    FaCarSide,
    FaCheckCircle,
    FaChevronRight
} from "react-icons/fa";

/* ================================================================== */
/* Config + helpers                                                    */
/* ================================================================== */

const POLL_MS = 15000;

const TYPES = [
    { key: "payment", label: "Payments", icon: FaMoneyBillWave, tone: "success", words: ["payment", "paid", "cash"] },
    { key: "quotation", label: "Quotations", icon: FaFileInvoiceDollar, tone: "warning", words: ["quotation", "quote"] },
    { key: "alert", label: "Alerts", icon: FaExclamationTriangle, tone: "danger", words: ["rejected", "cancelled", "canceled", "failed"] },
    { key: "completed", label: "Completed", icon: FaCheckCircle, tone: "success", words: ["completed", "complete"] },
    { key: "update", label: "Job updates", icon: FaCarSide, tone: "primary", words: ["accepted", "assigned", "started", "arrived", "on the way"] }
];
const FALLBACK_TYPE = { key: "general", label: "General", icon: FaBell, tone: "primary", words: [] };

// Order matters: the first match wins (a "payment completed" message is a payment).
const getType = (message = "") => {
    const text = message.toLowerCase();
    return TYPES.find((t) => t.words.some((w) => text.includes(w))) || FALLBACK_TYPE;
};

// Backend may send the request id directly, nested, or only inside the message text.
const getRequestId = (n) => {
    const direct = n.requestId ?? n.serviceRequestId ?? n.serviceRequest?.id ?? n.serviceRequest?.requestId;
    if (direct) return direct;
    const match = /(?:request|job)\s*#?\s*(\d+)/i.exec(n.message || "");
    return match ? match[1] : null;
};

const timeAgo = (createdAt) => {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return "Just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const getGroup = (createdAt) => {
    if (!createdAt) return "Earlier";
    const diff = Math.round((startOfDay(new Date()) - startOfDay(new Date(createdAt))) / 86400000);
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return "This week";
    return "Earlier";
};
const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

const stamp = (n) => new Date(n.createdAt || 0).getTime() || 0;

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function NotificationsContent() {
    const navigate = useNavigate();
    const showToast = useToast();
    const confirm = useConfirm();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [syncFailed, setSyncFailed] = useState(false);

    const [unreadOnly, setUnreadOnly] = useState(false);
    const [types, setTypes] = useState([]);
    const [query, setQuery] = useState("");
    const [panelOpen, setPanelOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const searchRef = useRef(null);
    const toolbarRef = useRef(null);

    /* ---------------------------- data ---------------------------- */

    const load = useCallback(async (silent = false) => {
        try {
            if (!silent) setError("");
            const response = await api.get("/notifications");
            setNotifications(Array.isArray(response.data) ? response.data : []);
            setSyncFailed(false);
            setError("");
        } catch (err) {
            console.error("Failed to load notifications:", err);
            if (silent) setSyncFailed(true);
            else setError(err.response?.data?.message || "Failed to load notifications.");
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

    /* ---------------------------- actions ---------------------------- */

    const markAsRead = async (id) => {
        // Optimistic: update the UI first, roll back if the server refuses.
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        try {
            await api.put(`/notifications/${id}/read`);
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
            showToast("Couldn't mark it as read.", "error");
        }
    };

    const markAllAsRead = async () => {
        try {
            setBusy(true);
            await markAllNotificationsAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            showToast("All notifications marked as read.", "success");
        } catch (err) {
            console.error("Failed to mark all notifications as read:", err);
            showToast("Couldn't mark all as read.", "error");
        } finally {
            setBusy(false);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        } catch (err) {
            console.error("Failed to delete notification:", err);
            showToast("Couldn't delete the notification.", "error");
        }
    };

    const clearRead = async () => {
        const readOnes = notifications.filter((n) => n.isRead);
        if (readOnes.length === 0) return;
        const ok = await confirm({
            title: "Clear read notifications?",
            message: `${readOnes.length} read notification${readOnes.length === 1 ? "" : "s"} will be deleted. Unread ones are kept.`,
            tone: "danger",
            confirmLabel: "Clear read"
        });
        if (!ok) return;

        setBusy(true);
        const results = await Promise.allSettled(readOnes.map((n) => api.delete(`/notifications/${n.id}`)));
        const deleted = new Set(readOnes.filter((_, i) => results[i].status === "fulfilled").map((n) => n.id));
        setNotifications((prev) => prev.filter((n) => !deleted.has(n.id)));
        setBusy(false);
        showToast(
            deleted.size === readOnes.length ? "Read notifications cleared." : "Some notifications couldn't be deleted.",
            deleted.size === readOnes.length ? "success" : "error"
        );
    };

    const openNotification = (n) => {
        if (!n.isRead) markAsRead(n.id);
        const requestId = getRequestId(n);
        if (requestId) navigate(`/mechanic/requests/${requestId}`);
    };

    /* ---------------------------- derived ---------------------------- */

    const unread = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);
    const readCount = notifications.length - unread;

    const typeCounts = useMemo(() => {
        const out = {};
        notifications.forEach((n) => {
            const key = getType(n.message).key;
            out[key] = (out[key] || 0) + 1;
        });
        return out;
    }, [notifications]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return notifications
            .filter((n) => !unreadOnly || !n.isRead)
            .filter((n) => types.length === 0 || types.includes(getType(n.message).key))
            .filter((n) => !q || (n.message || "").toLowerCase().includes(q))
            .sort((a, b) => stamp(b) - stamp(a));
    }, [notifications, unreadOnly, types, query]);

    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach((n) => {
            const g = getGroup(n.createdAt);
            (map[g] = map[g] || []).push(n);
        });
        return GROUP_ORDER.filter((g) => map[g]).map((g) => ({ title: g, items: map[g] }));
    }, [filtered]);

    const isFiltered = unreadOnly || types.length > 0 || query.trim() !== "";
    const filterCount = (unreadOnly ? 1 : 0) + types.length;
    const allTypes = [...TYPES, FALLBACK_TYPE].filter((t) => typeCounts[t.key]);

    const toggleType = (key) => setTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    const clearAll = () => {
        setUnreadOnly(false);
        setTypes([]);
        setQuery("");
    };

    /* ----------------------------- render ---------------------------- */

    return (
        <div className="nt-root">
            <header className="nt-header">
                <div>
                    <h1 className="nt-title">
                        Notifications
                        {unread > 0 && <span className="nt-count" aria-label={`${unread} unread`}>{unread}</span>}
                    </h1>
                    <p className="nt-sub">Updates about your RoadAid service requests.</p>
                </div>
                <div className="nt-header-actions">
                    <button type="button" className="nt-btn" onClick={handleRefresh} disabled={loading || refreshing}>
                        <FaSyncAlt aria-hidden="true" className={refreshing ? "nt-spin" : ""} />
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                    {unread > 0 && (
                        <button type="button" className="nt-btn nt-btn-dark" onClick={markAllAsRead} disabled={busy}>
                            <FaCheckDouble aria-hidden="true" /> Mark all read
                        </button>
                    )}
                </div>
            </header>

            {syncFailed && !error && (
                <div className="nt-banner" role="status">
                    <FaWifi aria-hidden="true" /> Couldn't refresh just now. Showing your last loaded notifications.
                </div>
            )}

            {/* Search + filter */}
            {!loading && !error && notifications.length > 0 && (
                <div className="nt-toolbar" ref={toolbarRef}>
                    <div className="nt-search">
                        <FaSearch aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search notifications"
                            aria-label="Search notifications"
                        />
                        {query ? (
                            <button type="button" className="nt-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                                <FaTimes aria-hidden="true" />
                            </button>
                        ) : (
                            <span className="nt-kbd" aria-hidden="true">/</span>
                        )}
                    </div>

                    <button
                        type="button"
                        className="nt-btn nt-filter-btn"
                        aria-expanded={panelOpen}
                        aria-controls="nt-filter-panel"
                        onClick={() => setPanelOpen((o) => !o)}
                    >
                        <FaSlidersH aria-hidden="true" />
                        <span className="nt-filter-text">Filter</span>
                        {filterCount > 0 && <span className="nt-filter-badge">{filterCount}</span>}
                    </button>

                    {panelOpen && (
                        <>
                            <div className="nt-scrim" onClick={() => setPanelOpen(false)} />
                            <div className="nt-panel" id="nt-filter-panel" role="dialog" aria-label="Filter notifications">
                                <div className="nt-panel-head">
                                    <h2 className="nt-panel-title">Filter</h2>
                                    <button type="button" className="nt-icon-btn" onClick={() => setPanelOpen(false)} aria-label="Close filters">
                                        <FaTimes aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="nt-group">
                                    <span className="nt-group-label">Status</span>
                                    <div className="nt-chips">
                                        <button type="button" className="nt-chip" aria-pressed={unreadOnly} onClick={() => setUnreadOnly((v) => !v)}>
                                            Unread only <span className="nt-chip-count">{unread}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="nt-group">
                                    <span className="nt-group-label">Type</span>
                                    <div className="nt-chips">
                                        {allTypes.map((t) => (
                                            <button key={t.key} type="button" className="nt-chip" aria-pressed={types.includes(t.key)} onClick={() => toggleType(t.key)}>
                                                {t.label} <span className="nt-chip-count">{typeCounts[t.key]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="nt-panel-foot">
                                    <button type="button" className="nt-btn" onClick={clearAll}>Reset</button>
                                    <button type="button" className="nt-btn nt-btn-dark" onClick={() => setPanelOpen(false)}>
                                        Show {filtered.length}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Applied filters */}
            {!loading && !error && notifications.length > 0 && (
                <div className="nt-active" aria-live="polite">
                    <span className="nt-result-count">{filtered.length} notification{filtered.length === 1 ? "" : "s"}</span>
                    {unreadOnly && (
                        <button type="button" className="nt-tag" onClick={() => setUnreadOnly(false)} aria-label="Remove unread filter">
                            Unread <span className="nt-tag-x"><FaTimes aria-hidden="true" /></span>
                        </button>
                    )}
                    {types.map((k) => (
                        <button key={k} type="button" className="nt-tag" onClick={() => toggleType(k)} aria-label={`Remove ${k} filter`}>
                            {[...TYPES, FALLBACK_TYPE].find((t) => t.key === k)?.label}
                            <span className="nt-tag-x"><FaTimes aria-hidden="true" /></span>
                        </button>
                    ))}
                    {isFiltered && <button type="button" className="nt-btn nt-btn-link" onClick={clearAll}>Clear all</button>}
                    {!isFiltered && readCount > 0 && (
                        <button type="button" className="nt-btn nt-btn-link" onClick={clearRead} disabled={busy}>
                            <FaTrashAlt aria-hidden="true" /> Clear {readCount} read
                        </button>
                    )}
                </div>
            )}

            {loading && (
                <div className="nt-list" aria-busy="true" aria-label="Loading notifications">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="nt-skeleton" />)}
                </div>
            )}

            {!loading && error && (
                <div className="nt-error" role="alert">
                    <FaExclamationTriangle className="nt-error-ico" aria-hidden="true" />
                    <div>
                        <p className="nt-error-title">Couldn't load notifications</p>
                        <p className="nt-error-text">{error}</p>
                        <button type="button" className="nt-btn" onClick={() => load()}>Try again</button>
                    </div>
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="nt-state">
                    <span className="nt-state-ico">{notifications.length === 0 ? <FaBellSlash aria-hidden="true" /> : <FaSearch aria-hidden="true" />}</span>
                    <h2 className="nt-state-title">{notifications.length === 0 ? "You're all caught up" : "No matching notifications"}</h2>
                    <p className="nt-state-text">
                        {notifications.length === 0
                            ? "New updates about your service requests will show up here."
                            : "Try a different filter or search term."}
                    </p>
                    {notifications.length > 0 && <button type="button" className="nt-btn nt-btn-dark" onClick={clearAll}>Clear filters</button>}
                </div>
            )}

            {!loading && !error && grouped.map((group) => (
                <section className="nt-section" key={group.title} aria-label={group.title}>
                    <h2 className="nt-section-title">{group.title}</h2>
                    <ul className="nt-list">
                        {group.items.map((n) => {
                            const type = getType(n.message);
                            const Icon = type.icon;
                            const requestId = getRequestId(n);
                            const clickable = Boolean(requestId) || !n.isRead;
                            return (
                                <li className="nt-item" key={n.id} data-read={Boolean(n.isRead)}>
                                    <button
                                        type="button"
                                        className="nt-main"
                                        data-clickable={clickable}
                                        onClick={() => openNotification(n)}
                                        aria-label={`${n.isRead ? "" : "Unread. "}${n.message}${requestId ? `. Open request #${requestId}` : ""}`}
                                    >
                                        <span className="nt-ico" data-tone={type.tone}><Icon aria-hidden="true" /></span>
                                        <span className="nt-body">
                                            <span className="nt-message">{n.message}</span>
                                            <span className="nt-meta">
                                                <span className="nt-type">{type.label}</span>
                                                <span>{timeAgo(n.createdAt)}</span>
                                                {requestId && <span className="nt-open">· View request #{requestId}</span>}
                                            </span>
                                        </span>
                                        {requestId && <FaChevronRight aria-hidden="true" style={{ alignSelf: "center", color: "#94a3b8" }} />}
                                    </button>

                                    <div className="nt-side">
                                        {!n.isRead && (
                                            <button type="button" onClick={() => markAsRead(n.id)} aria-label="Mark as read" title="Mark as read">
                                                <FaCheck aria-hidden="true" />
                                            </button>
                                        )}
                                        <button type="button" className="nt-delete" onClick={() => deleteNotification(n.id)} aria-label="Delete notification" title="Delete">
                                            <FaTrashAlt aria-hidden="true" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function Notifications() {
    return (
        <MechanicLayout>
            <NotificationsContent />
        </MechanicLayout>
    );
}

export default Notifications;