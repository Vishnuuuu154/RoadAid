import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaSearch,
    FaComments,
    FaUserCircle,
    FaRedo,
    FaTimes,
    FaSyncAlt,
    FaSlidersH,
    FaChevronRight
} from "react-icons/fa";

import { getMyConversations as getMechanicConversations } from "../../services/mechanicService";
import { getMyConversations as getCustomerConversations } from "../../services/customerService";

import "../../styles/Messages.css";

import MechanicLayout from "../../layouts/MechanicLayout";
import CustomerLayout from "../../layouts/CustomerLayout";

/* ================================================================== */
/* Config + helpers                                                    */
/* ================================================================== */

const REFRESH_INTERVAL_MS = 30000;

const STATUS_LABELS = {
    pending: "Pending",
    accepted: "Accepted",
    "in-progress": "In progress",
    inprogress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    rejected: "Rejected",
    closed: "Closed",
    quotation_pending: "Quotation sent",
    waiting_for_quotation: "Quotation needed"
};

const STATUS_TONES = {
    pending: "warning",
    waiting_for_quotation: "warning",
    quotation_pending: "primary",
    accepted: "primary",
    "in-progress": "primary",
    inprogress: "primary",
    completed: "success",
    closed: "success",
    cancelled: "neutral",
    canceled: "neutral",
    rejected: "danger"
};

const STATUS_GROUPS = [
    { key: "waiting", label: "Waiting", statuses: ["pending", "waiting_for_quotation", "quotation_pending"] },
    { key: "inprogress", label: "In progress", statuses: ["accepted", "in-progress", "inprogress"] },
    { key: "done", label: "Completed", statuses: ["completed", "closed"] },
    { key: "stopped", label: "Cancelled / Rejected", statuses: ["cancelled", "canceled", "rejected"] }
];

const SORTS = [
    { key: "recent", label: "Most recent" },
    { key: "unread", label: "Unread first" },
    { key: "oldest", label: "Oldest first" }
];

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

// Requests in these states are "done"; everything else counts as in-flight work.
const CLOSED_STATUSES = new Set(["completed", "cancelled", "canceled", "rejected", "closed"]);

const normalizeStatus = (status) => String(status || "").trim().toLowerCase().replace(/\s+/g, "-");
const isActiveStatus = (status) => !CLOSED_STATUSES.has(normalizeStatus(status));
const hasUnread = (c) => Number(c.unreadCount) > 0;
const stamp = (c) => new Date(c.lastMessageAt || 0).getTime() || 0;

// Stable colour per person, so avatars are recognisable at a glance.
const tintFor = (name = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 6;
    return hash;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightMatch = (text, query) => {
    const value = String(text ?? "");
    const trimmed = query?.trim();
    if (!trimmed) return value;

    const parts = value.split(new RegExp(`(${escapeRegExp(trimmed)})`, "i"));
    if (parts.length === 1) return value;

    return parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark key={i}>{part}</mark>
        ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
        )
    );
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayDiffFromToday = (value) => Math.round((startOfDay(new Date()) - startOfDay(new Date(value))) / 86400000);

const formatTime = (dateValue) => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    const diff = dayDiffFromToday(date);

    if (diff <= 0) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    if (diff < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

const getGroup = (value) => {
    if (!value) return "Earlier";
    const diff = dayDiffFromToday(value);
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return "This week";
    return "Earlier";
};

const getInitials = (name) => {
    if (!name) return "?";
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
};

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

const Messages = ({ role = "customer" }) => {
    const navigate = useNavigate();

    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [justLoaded, setJustLoaded] = useState(false);

    const [search, setSearch] = useState("");
    const [quick, setQuick] = useState("all"); // all | unread | active
    const [groups, setGroups] = useState([]); // status groups; empty = all
    const [sortBy, setSortBy] = useState("recent");
    const [panelOpen, setPanelOpen] = useState(false);

    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const rowRef = useRef(null);
    const enterTimeoutRef = useRef(null);

    /* ---------------------------- data ---------------------------- */

    const loadConversations = useCallback(
        async ({ silent = false } = {}) => {
            try {
                if (!silent) setError("");

                const response = role === "mechanic" ? await getMechanicConversations() : await getCustomerConversations();
                const list = Array.isArray(response.data) ? response.data : [];

                setConversations([...list].sort((a, b) => stamp(b) - stamp(a)));

                if (!silent) {
                    setJustLoaded(true);
                    window.clearTimeout(enterTimeoutRef.current);
                    enterTimeoutRef.current = window.setTimeout(() => setJustLoaded(false), 700);
                }
            } catch (err) {
                console.error("Failed to load conversations:", err);
                // A silent background refresh failing shouldn't disrupt what the person is looking at.
                if (!silent) setError(err.response?.data?.message || "Unable to load your conversations.");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [role]
    );

    useEffect(() => {
        setLoading(true);
        loadConversations();
        const id = window.setInterval(() => !document.hidden && loadConversations({ silent: true }), REFRESH_INTERVAL_MS);
        return () => {
            window.clearInterval(id);
            window.clearTimeout(enterTimeoutRef.current);
        };
    }, [loadConversations]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadConversations();
    };

    /* ---------- keyboard + outside click ---------- */

    useEffect(() => {
        const onKey = (e) => {
            const tag = document.activeElement?.tagName;
            const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

            if (e.key === "/" && !typing) {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            if (e.key === "Escape") {
                setPanelOpen(false);
                if (document.activeElement === searchInputRef.current && search) setSearch("");
            }
        };
        const onClick = (e) => {
            if (window.innerWidth > 760 && rowRef.current && !rowRef.current.contains(e.target)) {
                setPanelOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onClick);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onClick);
        };
    }, [search]);

    /* ---------------------------- derived ---------------------------- */

    const unreadTotal = useMemo(() => conversations.filter(hasUnread).length, [conversations]);
    const activeTotal = useMemo(() => conversations.filter((c) => isActiveStatus(c.requestStatus)).length, [conversations]);

    const groupCount = useCallback(
        (group) => conversations.filter((c) => group.statuses.includes(normalizeStatus(c.requestStatus))).length,
        [conversations]
    );

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const allowed = groups.flatMap((k) => STATUS_GROUPS.find((g) => g.key === k)?.statuses || []);

        let list = conversations
            .filter((c) => (quick === "unread" ? hasUnread(c) : quick === "active" ? isActiveStatus(c.requestStatus) : true))
            .filter((c) => groups.length === 0 || allowed.includes(normalizeStatus(c.requestStatus)))
            .filter(
                (c) =>
                    !q ||
                    [c.otherUserName, c.lastMessage, `request ${c.requestId}`, STATUS_LABELS[normalizeStatus(c.requestStatus)] || c.requestStatus]
                        .filter(Boolean)
                        .some((item) => String(item).toLowerCase().includes(q))
            );

        if (sortBy === "oldest") list = [...list].sort((a, b) => stamp(a) - stamp(b));
        // Source list is already newest-first, so unread items float up and keep recency inside each group.
        if (sortBy === "unread") list = [...list].sort((a, b) => Number(hasUnread(b)) - Number(hasUnread(a)));

        return list;
    }, [conversations, search, quick, groups, sortBy]);

    // Date sections only make sense when ordered by time.
    const sections = useMemo(() => {
        if (sortBy !== "recent") return [{ title: null, items: visible }];
        const map = {};
        visible.forEach((c) => {
            const g = getGroup(c.lastMessageAt);
            (map[g] = map[g] || []).push(c);
        });
        return GROUP_ORDER.filter((g) => map[g]).map((g) => ({ title: g, items: map[g] }));
    }, [visible, sortBy]);

    const isFiltered = quick !== "all" || groups.length > 0 || search.trim() !== "";
    const filterCount = groups.length + (sortBy !== "recent" ? 1 : 0);

    const toggleGroup = (key) => setGroups((prev) => (prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]));
    const clearAll = () => {
        setQuick("all");
        setGroups([]);
        setSearch("");
        setSortBy("recent");
    };

    const openConversation = (requestId) => {
        navigate(`/${role === "mechanic" ? "mechanic" : "customer"}/requests/${requestId}/communication`);
    };

    // Arrow-key roving focus through the list; Home/End jump to the ends.
    const handleListKeyDown = (e) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
        const items = Array.from(listRef.current?.querySelectorAll(".ms-item") || []);
        if (items.length === 0) return;

        const current = items.indexOf(document.activeElement);
        e.preventDefault();

        let next;
        if (e.key === "ArrowDown") next = current < 0 ? 0 : Math.min(current + 1, items.length - 1);
        else if (e.key === "ArrowUp") next = current < 0 ? items.length - 1 : Math.max(current - 1, 0);
        else if (e.key === "Home") next = 0;
        else next = items.length - 1;

        items[next].focus();
    };

    const statusPill = (status) => {
        if (!status) return null;
        const key = normalizeStatus(status);
        return (
            <span className="ms-pill" data-tone={STATUS_TONES[key] || "neutral"}>
                {STATUS_LABELS[key] || status}
            </span>
        );
    };

    /* ----------------------------- render ---------------------------- */

    const segments = [
        { key: "all", label: "All", count: conversations.length, disabled: false },
        { key: "unread", label: "Unread", count: unreadTotal, disabled: unreadTotal === 0 },
        { key: "active", label: "Active", count: activeTotal, disabled: activeTotal === 0 }
    ];

    const hasData = !loading && !error && conversations.length > 0;
    const showEmpty = !loading && !error && visible.length === 0;

    const content = (
        <div className="ms-root">
            <header className="ms-header">
                <div>
                    <p className="ms-eyebrow">Inbox</p>
                    <h1 className="ms-title">Messages</h1>
                    <p className="ms-sub">
                        {hasData
                            ? unreadTotal > 0
                                ? `${unreadTotal} conversation${unreadTotal === 1 ? "" : "s"} waiting for you`
                                : "You're all caught up"
                            : "Everything tied to your requests, in one place."}
                    </p>
                </div>
                <button type="button" className="ms-refresh" onClick={handleRefresh} disabled={loading || refreshing} aria-label="Refresh messages" title="Refresh">
                    <FaSyncAlt aria-hidden="true" className={refreshing ? "ms-spin" : ""} />
                </button>
            </header>

            {hasData && (
                <div className="ms-command">
                    <label className="ms-search">
                        <FaSearch aria-hidden="true" />
                        <input
                            ref={searchInputRef}
                            type="search"
                            placeholder="Search name, message, request or status"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search conversations"
                        />
                        {search ? (
                            <button
                                type="button"
                                className="ms-search-clear"
                                onClick={() => {
                                    setSearch("");
                                    searchInputRef.current?.focus();
                                }}
                                aria-label="Clear search"
                            >
                                <FaTimes aria-hidden="true" />
                            </button>
                        ) : (
                            <kbd className="ms-kbd" aria-hidden="true">/</kbd>
                        )}
                    </label>

                    <div className="ms-row" ref={rowRef}>
                        <div className="ms-segment" role="group" aria-label="Show conversations">
                            {segments.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    className="ms-seg-btn"
                                    data-kind={s.key}
                                    aria-pressed={quick === s.key}
                                    disabled={s.disabled && quick !== s.key}
                                    onClick={() => setQuick(s.key)}
                                >
                                    {s.label}
                                    <span className="ms-seg-count">{s.count}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="ms-more"
                            aria-expanded={panelOpen}
                            aria-controls="ms-filter-panel"
                            aria-label="Filter and sort"
                            title="Filter & sort"
                            onClick={() => setPanelOpen((o) => !o)}
                        >
                            <FaSlidersH aria-hidden="true" />
                            {filterCount > 0 && <span className="ms-more-badge">{filterCount}</span>}
                        </button>

                        {panelOpen && (
                            <>
                                <div className="ms-scrim" onClick={() => setPanelOpen(false)} />
                                <div className="ms-panel" id="ms-filter-panel" role="dialog" aria-label="Filter and sort conversations">
                                    <div className="ms-panel-head">
                                        <h2 className="ms-panel-title">Filter &amp; sort</h2>
                                        <button type="button" className="ms-icon-btn" onClick={() => setPanelOpen(false)} aria-label="Close filters">
                                            <FaTimes aria-hidden="true" />
                                        </button>
                                    </div>

                                    <div className="ms-group">
                                        <span className="ms-group-label">Request status</span>
                                        <div className="ms-chips">
                                            {STATUS_GROUPS.map((g) => (
                                                <button
                                                    key={g.key}
                                                    type="button"
                                                    className="ms-chip"
                                                    aria-pressed={groups.includes(g.key)}
                                                    disabled={groupCount(g) === 0 && !groups.includes(g.key)}
                                                    onClick={() => toggleGroup(g.key)}
                                                >
                                                    {g.label}
                                                    <span className="ms-chip-count">{groupCount(g)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="ms-group">
                                        <label className="ms-group-label" htmlFor="ms-sort">Sort by</label>
                                        <select id="ms-sort" className="ms-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                            {SORTS.map((s) => (
                                                <option key={s.key} value={s.key}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="ms-panel-foot">
                                        <button type="button" className="ms-btn" onClick={clearAll}>Reset</button>
                                        <button type="button" className="ms-btn ms-btn-dark" onClick={() => setPanelOpen(false)}>
                                            Show {visible.length} chat{visible.length === 1 ? "" : "s"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {hasData && (groups.length > 0 || isFiltered) && (
                <div className="ms-active">
                    {groups.map((k) => (
                        <button key={k} type="button" className="ms-tag" onClick={() => toggleGroup(k)} aria-label={`Remove ${STATUS_GROUPS.find((g) => g.key === k)?.label} filter`}>
                            {STATUS_GROUPS.find((g) => g.key === k)?.label}
                            <span className="ms-tag-x"><FaTimes aria-hidden="true" /></span>
                        </button>
                    ))}
                    {isFiltered && <button type="button" className="ms-btn ms-btn-link" onClick={clearAll}>Clear all</button>}
                </div>
            )}

            <span className="ms-sr" aria-live="polite">
                {loading ? "Loading conversations" : `${visible.length} conversation${visible.length === 1 ? "" : "s"} shown`}
            </span>

            {loading && (
                <div className="ms-list" aria-busy="true" aria-label="Loading conversations">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div className="ms-skeleton" key={i}>
                            <div className="ms-sk-avatar" />
                            <div className="ms-sk-lines">
                                <div className="ms-sk-line short" />
                                <div className="ms-sk-line long" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <div className="ms-error" role="alert">
                    <FaComments className="ms-error-ico" aria-hidden="true" />
                    <div>
                        <p className="ms-error-title">Couldn't load messages</p>
                        <p className="ms-error-text">{error}</p>
                        <button type="button" className="ms-btn" onClick={() => loadConversations()}>
                            <FaRedo aria-hidden="true" /> Try again
                        </button>
                    </div>
                </div>
            )}

            {showEmpty && (
                <div className="ms-state">
                    <span className="ms-state-ico"><FaComments aria-hidden="true" /></span>
                    <h2 className="ms-state-title">
                        {conversations.length === 0
                            ? "No conversations yet"
                            : search
                                ? "No conversations found"
                                : quick === "unread"
                                    ? "You're all caught up"
                                    : "Nothing in this view"}
                    </h2>
                    <p className="ms-state-text">
                        {conversations.length === 0
                            ? "Your conversations will show up here once a request gets a reply."
                            : search
                                ? "Try a different name, request number or status."
                                : quick === "unread"
                                    ? "No unread messages right now."
                                    : "Try a different filter to see other conversations."}
                    </p>
                    {conversations.length > 0 && <button type="button" className="ms-btn ms-btn-dark" onClick={clearAll}>Clear filters</button>}
                </div>
            )}

            {!loading && !error && visible.length > 0 && (
                <div ref={listRef} onKeyDown={handleListKeyDown} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    {sections.map((section) => (
                        <section className="ms-section" key={section.title || "all"} aria-label={section.title || "Conversations"}>
                            {section.title && <h2 className="ms-section-title">{section.title}</h2>}
                            <div className={`ms-list${justLoaded ? " ms-enter" : ""}`}>
                                {section.items.map((c) => {
                                    const unread = hasUnread(c);
                                    return (
                                        <button
                                            key={c.requestId}
                                            type="button"
                                            className="ms-item"
                                            data-unread={unread}
                                            onClick={() => openConversation(c.requestId)}
                                        >
                                            <span className="ms-avatar-wrap">
                                                <span className="ms-avatar" data-tint={tintFor(c.otherUserName)}>
                                                    {c.otherUserProfileImage ? (
                                                        <img src={c.otherUserProfileImage} alt="" />
                                                    ) : c.otherUserName ? (
                                                        getInitials(c.otherUserName)
                                                    ) : (
                                                        <FaUserCircle aria-hidden="true" />
                                                    )}
                                                </span>
                                                {unread && <span className="ms-dot" aria-hidden="true" />}
                                            </span>

                                            <span className="ms-content">
                                                <span className="ms-top">
                                                    <h3 className="ms-name">{highlightMatch(c.otherUserName || "User", search)}</h3>
                                                    <span className="ms-time">{formatTime(c.lastMessageAt)}</span>
                                                </span>

                                                <span className="ms-bottom">
                                                    <p className="ms-preview">{highlightMatch(c.lastMessage || "No messages yet", search)}</p>
                                                    {unread && (
                                                        <span className="ms-unread" aria-label={`${c.unreadCount} unread messages`}>
                                                            {Number(c.unreadCount) > 99 ? "99+" : c.unreadCount}
                                                        </span>
                                                    )}
                                                </span>

                                                <span className="ms-meta">
                                                    <span>Request #{c.requestId}</span>
                                                    {statusPill(c.requestStatus)}
                                                </span>
                                            </span>

                                            <span className="ms-go" aria-hidden="true"><FaChevronRight /></span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );

    if (role === "mechanic") {
        return <MechanicLayout>{content}</MechanicLayout>;
    }

    return <CustomerLayout>{content}</CustomerLayout>;
};

export default Messages;