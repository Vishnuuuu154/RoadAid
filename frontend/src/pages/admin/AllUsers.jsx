import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { getUsers, activateUser, deactivateUser } from "../../services/adminService";

import {
    FaSyncAlt,
    FaSearch,
    FaDownload,
    FaTimes,
    FaUsers,
    FaUserSlash,
    FaUserCheck,
    FaCheckCircle,
    FaExclamationTriangle
} from "react-icons/fa";

import "../../styles/AllUsers.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 60000;
const PAGE_SIZE = 25;

const ROUTES = {
    user: (id) => `/admin/users/${id}`
};

const TABS = [
    { key: "ALL", label: "All" },
    { key: "CUSTOMER", label: "Customers" },
    { key: "MECHANIC", label: "Mechanics" }
];

const STATUSES = [
    { key: "ALL", label: "All status" },
    { key: "ACTIVE", label: "Active" },
    { key: "INACTIVE", label: "Inactive" }
];

const SORTS = [
    { key: "new", label: "Newest first" },
    { key: "old", label: "Oldest first" },
    { key: "name", label: "Name A–Z" }
];

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

/* When the page is locked to one role, the tabs filter by account status instead. */
const STATUS_TABS = [
    { key: "ALL", label: "All" },
    { key: "ACTIVE", label: "Active" },
    { key: "INACTIVE", label: "Inactive" }
];

const TITLES = { CUSTOMER: "Customers", MECHANIC: "Mechanics" };

const roleOf = (user) => String(user.role || "").toUpperCase();

const roleLabel = (user) =>
    roleOf(user)
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase()) || "—";

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
    return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

const updatedText = (date) => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    return minutes < 1 ? "just now" : `${minutes}m ago`;
};

const tabFromParam = (value) => {
    const key = String(value || "").toUpperCase().replace(/S$/, "");
    return TABS.some((t) => t.key === key) ? key : "ALL";
};

/* A cell that starts with = + - @ can run as a formula in Excel, so neutralise it. */
const csvCell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
};

const exportCsv = (rows) => {
    const header = ["ID", "Name", "Email", "Phone", "Role", "Status", "Joined"];
    const lines = rows.map((u) =>
        [
            u.id,
            u.fullName,
            u.email,
            u.phone,
            roleLabel(u),
            u.isActive ? "Active" : "Inactive",
            dateOf(u.createdAt)?.toLocaleDateString("en-IN") || ""
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
    link.download = `roadaid-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function ConfirmDialog({ user, busy, onCancel, onConfirm }) {
    const confirmRef = useRef(null);
    const turningOff = Boolean(user.isActive);

    useEffect(() => {
        confirmRef.current?.focus();
        const onKey = (e) => {
            if (e.key === "Escape" && !busy) onCancel();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [busy, onCancel]);

    return (
        <div className="au-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
            <div className="au-dialog" role="dialog" aria-modal="true" aria-labelledby="au-dialog-title">
                <span className="au-dialog-icon" data-danger={turningOff} aria-hidden="true">
                    {turningOff ? <FaUserSlash /> : <FaUserCheck />}
                </span>

                <h2 id="au-dialog-title">
                    {turningOff ? "Deactivate" : "Activate"} {user.fullName}?
                </h2>

                <p>
                    {turningOff
                        ? "They will not be able to sign in or use RoadAid until you activate them again."
                        : "They will be able to sign in and use RoadAid again."}
                </p>

                <div className="au-dialog-actions">
                    <button type="button" className="au-btn" onClick={onCancel} disabled={busy}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        ref={confirmRef}
                        className={`au-btn ${turningOff ? "au-btn-danger" : "au-btn-ok"}`}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? "Saving…" : turningOff ? "Yes, deactivate" : "Yes, activate"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function UserRow({ user, onToggle, showPhone }) {
    const navigate = useNavigate();

    /* The whole row opens the profile, unless a link or button inside was the target. */
    const open = (e) => {
        if (e.target.closest("a, button")) return;
        navigate(ROUTES.user(user.id));
    };

    return (
        <div className="au-row" role="listitem" onClick={open}>
            <span className="au-user">
                <span className="au-avatar" aria-hidden="true">{initials(user.fullName)}</span>
                <span className="au-user-text">
                    <Link to={ROUTES.user(user.id)} className="au-name">{user.fullName || "Unnamed user"}</Link>
                    <small>{user.email}</small>
                </span>
            </span>

            <span className="au-role">{showPhone ? user.phone || "—" : roleLabel(user)}</span>

            <span className="au-muted">{dateText(user.createdAt)}</span>

            <span className="au-status" data-active={Boolean(user.isActive)}>
                <i aria-hidden="true" />
                {user.isActive ? "Active" : "Inactive"}
            </span>

            <span className="au-action">
                <button
                    type="button"
                    className={`au-btn au-btn-sm ${user.isActive ? "au-btn-outline-danger" : "au-btn-outline-ok"}`}
                    onClick={() => onToggle(user)}
                >
                    {user.isActive ? "Deactivate" : "Activate"}
                </button>
            </span>
        </div>
    );
}

function SkeletonRows() {
    return (
        <div className="au-list" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div className="au-row au-skel-row" key={i}>
                    <span className="au-skel" />
                    <span className="au-skel" />
                    <span className="au-skel" />
                </div>
            ))}
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

/* role="CUSTOMER" or "MECHANIC" locks the page to that role; the default shows everyone. */
function AllUsers({ role = "ALL" }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const scoped = role !== "ALL";

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [, tick] = useState(0);

    const [tab, setTab] = useState(() => (scoped ? "ALL" : tabFromParam(searchParams.get("role"))));
    const [query, setQuery] = useState(() => searchParams.get("q") || "");
    const [status, setStatus] = useState(() => {
        const value = String(searchParams.get("status") || "").toUpperCase();
        return STATUSES.some((s) => s.key === value) ? value : "ALL";
    });
    const [sort, setSort] = useState("new");
    const [shown, setShown] = useState(PAGE_SIZE);

    const [confirmFor, setConfirmFor] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const searchRef = useRef(null);
    const toastTimer = useRef(null);
    const hasData = useRef(false);
    const busyRef = useRef(false);

    const notify = useCallback((message, tone = "ok") => {
        setToast({ message, tone });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    /* ---------- Load ---------- */

    const load = useCallback(async ({ silent = false } = {}) => {
        if (busyRef.current) return;
        if (!silent) setRefreshing(true);

        try {
            /* One fetch for everyone; tabs, counts and search all work on it. */
            const response = await getUsers("");
            setUsers(Array.isArray(response?.data) ? response.data : []);
            hasData.current = true;
            setError("");
            setUpdatedAt(new Date());
        } catch (err) {
            console.error("Failed to load users:", err);
            /* Keep the list on screen when a background refresh fails. */
            if (!silent || !hasData.current) setError("Could not load users.");
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
            if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !confirmFor) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [confirmFor]);

    /* Keep the address bar in step so a filtered view can be reloaded or shared. */
    useEffect(() => {
        const next = {};
        if (!scoped && tab !== "ALL") next.role = tab;
        if (status !== "ALL") next.status = status;
        if (query.trim()) next.q = query.trim();
        setSearchParams(next, { replace: true });
    }, [tab, status, query, scoped, setSearchParams]);

    useEffect(() => {
        setShown(PAGE_SIZE);
    }, [tab, status, query, sort]);

    /* ---------- Activate / deactivate ---------- */

    const handleToggle = async () => {
        const user = confirmFor;
        if (!user) return;

        const turningOff = Boolean(user.isActive);

        try {
            busyRef.current = true;
            setSaving(true);

            if (turningOff) await deactivateUser(user.id);
            else await activateUser(user.id);

            setUsers((current) =>
                current.map((u) => (u.id === user.id ? { ...u, isActive: !turningOff } : u))
            );
            setConfirmFor(null);
            notify(`${user.fullName} was ${turningOff ? "deactivated" : "activated"}.`);
        } catch (err) {
            console.error(err);
            setConfirmFor(null);
            notify(
                err.response?.data?.message || `Failed to ${turningOff ? "deactivate" : "activate"} user.`,
                "error"
            );
        } finally {
            busyRef.current = false;
            setSaving(false);
        }
    };

    /* ---------- Derived ---------- */

    const scopedUsers = useMemo(
        () => (scoped ? users.filter((u) => roleOf(u) === role) : users),
        [users, scoped, role]
    );

    const counts = useMemo(() => {
        const result = { ALL: scopedUsers.length, CUSTOMER: 0, MECHANIC: 0, active: 0, inactive: 0 };
        scopedUsers.forEach((u) => {
            const role = roleOf(u);
            if (role in result) result[role] += 1;
            if (u.isActive) result.active += 1;
            else result.inactive += 1;
        });
        result.ACTIVE = result.active;
        result.INACTIVE = result.inactive;
        return result;
    }, [scopedUsers]);

    const visible = useMemo(() => {
        const text = query.trim().toLowerCase();

        const list = scopedUsers.filter((u) => {
            if (tab !== "ALL" && roleOf(u) !== tab) return false;
            if (status === "ACTIVE" && !u.isActive) return false;
            if (status === "INACTIVE" && u.isActive) return false;

            if (!text) return true;

            return [u.id, u.fullName, u.email, u.phone]
                .filter((v) => v !== undefined && v !== null)
                .join(" ")
                .toLowerCase()
                .includes(text);
        });

        const time = (u) => dateOf(u.createdAt)?.getTime() || 0;

        list.sort((a, b) => {
            if (sort === "old") return time(a) - time(b);
            if (sort === "name") return (a.fullName || "").localeCompare(b.fullName || "");
            return time(b) - time(a);
        });

        return list;
    }, [scopedUsers, tab, status, query, sort]);

    const hasFilters = tab !== "ALL" || status !== "ALL" || query.trim() !== "" || sort !== "new";

    const clearFilters = () => {
        setTab("ALL");
        setStatus("ALL");
        setQuery("");
        setSort("new");
    };

    const noun = scoped ? TITLES[role]?.toLowerCase() || "users" : "users";
    const tabList = scoped ? STATUS_TABS : TABS;
    const current = scoped ? status : tab;
    const choose = (key) => (scoped ? setStatus(key) : setTab(key));

    /* ---------- Render ---------- */

    return (
        <AdminLayout>
            <div className="au-root">
                <header className="au-header">
                    <div>
                        <h1 className="au-title">{scoped ? TITLES[role] || "Users" : "All users"}</h1>
                        <p className="au-sub">
                            {loading ? "Loading…" : `${counts.ALL} ${noun} · ${counts.active} active`}
                            {updatedAt && <> · updated {updatedText(updatedAt)}</>}
                        </p>
                    </div>

                    <div className="au-header-actions">
                        <button
                            type="button"
                            className="au-btn"
                            onClick={() => exportCsv(visible)}
                            disabled={visible.length === 0}
                        >
                            <FaDownload aria-hidden="true" /> Export
                        </button>
                        <button type="button" className="au-btn" onClick={() => load()} disabled={refreshing}>
                            <FaSyncAlt className={refreshing ? "au-spin" : ""} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="au-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{error}</span>
                        <button type="button" onClick={() => load()}>Try again</button>
                    </div>
                )}

                <nav className="au-tabs" aria-label={scoped ? "Filter by status" : "Filter by role"}>
                    {tabList.map((t) => (
                        <button
                            type="button"
                            key={t.key}
                            className="au-tab"
                            aria-pressed={current === t.key}
                            onClick={() => choose(t.key)}
                        >
                            {t.label}
                            <span>{loading ? "" : counts[t.key] ?? 0}</span>
                        </button>
                    ))}
                </nav>

                <section className="au-filters" aria-label="Search and filters">
                    <label className="au-search">
                        <FaSearch aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="search"
                            placeholder="Search by name, email, phone or ID"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            aria-label={`Search ${noun}`}
                        />
                        {query && (
                            <button type="button" className="au-clear" onClick={() => setQuery("")} aria-label="Clear search">
                                <FaTimes aria-hidden="true" />
                            </button>
                        )}
                    </label>

                    {!scoped && (
                        <select className="au-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Account status">
                            {STATUSES.map((s) => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                        </select>
                    )}

                    <select className="au-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort order">
                        {SORTS.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                    </select>

                    {hasFilters && (
                        <button type="button" className="au-link-btn" onClick={clearFilters}>Reset</button>
                    )}
                </section>

                {loading ? (
                    <SkeletonRows />
                ) : users.length === 0 ? (
                    <div className="au-empty">
                        <span className="au-empty-icon" aria-hidden="true"><FaUsers /></span>
                        <h2>No {noun} yet</h2>
                        <p>
                            {scoped
                                ? `Registered ${noun} will be listed here.`
                                : "People who register will be listed here."}
                        </p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="au-empty">
                        <span className="au-empty-icon" aria-hidden="true"><FaSearch /></span>
                        <h2>No matching {noun}</h2>
                        <p>{scoped ? "Try a different status or search." : "Try a different role, status or search."}</p>
                        <button type="button" className="au-btn" onClick={clearFilters}>Reset filters</button>
                    </div>
                ) : (
                    <>
                        <div className="au-list" role="list" aria-live="polite">
                            <div className="au-head" aria-hidden="true">
                                <span>User</span>
                                <span>{scoped ? "Phone" : "Role"}</span>
                                <span>Joined</span>
                                <span>Status</span>
                                <span />
                            </div>

                            {visible.slice(0, shown).map((user) => (
                                <UserRow key={user.id} user={user} onToggle={setConfirmFor} showPhone={scoped} />
                            ))}
                        </div>

                        {shown < visible.length && (
                            <button type="button" className="au-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                                Show {Math.min(PAGE_SIZE, visible.length - shown)} more
                                <span> · {visible.length - shown} left</span>
                            </button>
                        )}
                    </>
                )}

                {confirmFor && (
                    <ConfirmDialog
                        user={confirmFor}
                        busy={saving}
                        onCancel={() => setConfirmFor(null)}
                        onConfirm={handleToggle}
                    />
                )}

                {toast && (
                    <div className={`au-toast au-toast-${toast.tone}`} role="status" aria-live="polite">
                        {toast.tone === "error" ? <FaExclamationTriangle aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                        <span>{toast.message}</span>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

export default AllUsers;