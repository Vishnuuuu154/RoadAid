import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";
import {
    FaHome,
    FaCar,
    FaClipboardList,
    FaHeart,
    FaCreditCard,
    FaBell,
    FaStar,
    FaExclamationCircle,
    FaMapMarkedAlt,
    FaSignOutAlt,
    FaTimes,
    FaPlus,
    FaUserCircle,
    FaChevronLeft,
    FaChevronRight,
    FaComments
} from "react-icons/fa";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/*  Existing keys keep their old values so other components that      */
/*  import COLOR don't change. New keys are added at the bottom.      */
/* ------------------------------------------------------------------ */
export const COLOR = {
    panel: "#ffffff",
    border: "#e8eaee",
    borderSoft: "#f1f2f5",
    textBright: "#181b24",
    textMuted: "#616876",
    textFaint: "#9aa0ac",
    accent: "#e8912a",
    accentSoft: "#fdf1e2",
    danger: "#e5484d",
    dangerSoft: "#fdecec",
    shadow: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.05)",
    shadowHover: "0 10px 30px rgba(16,24,40,0.10)",

    // New
    ink: "#111111",
    inkHover: "#2a2a2a",
    surface: "#f4f5f7",
    textBody: "#343a46",
    accentStrong: "#b8650a",
    dangerStrong: "#cf2f35",
    success: "#1a9d5c",
    successSoft: "#e6f6ed"
};

// One typeface for the whole sidebar. Exported so other pages can match it.
export const FONT =
    "'Figtree', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif";

/* ------------------------------------------------------------------ */
/*  Config — change these if your routes are different                */
/* ------------------------------------------------------------------ */
const REQUEST_HELP_PATH = "/customer/request-help";
const LIVE_MAP_PATH = "/customer/live-map";
const PROFILE_PATH = "/customer/profile";
const MOBILE_QUERY = "(max-width: 900px)";
const COLLAPSE_KEY = "roadaid.customerSidebar.collapsed";

const NAV_GROUPS = [
    {
        id: "home",
        items: [{ id: "dashboard", to: "/customer", label: "Dashboard", icon: FaHome, end: true }]
    },
    {
        id: "help",
        label: "Roadside help",
        items: [
            { id: "requests", to: "/customer/requests", label: "My Requests", icon: FaClipboardList },
            { id: "live-map", to: LIVE_MAP_PATH, label: "Live Map", icon: FaMapMarkedAlt },
            { id: "favorites", to: "/customer/favorites", label: "Favorite Mechanics", icon: FaHeart }
        ]
    },
    {
        id: "manage",
        label: "Manage",
        items: [
            { id: "vehicles", to: "/customer/vehicles", label: "My Vehicles", icon: FaCar },
            { id: "messages", to: "/customer/messages", label: "Messages", icon: FaComments },
            { id: "payments", to: "/customer/payments", label: "Payments", icon: FaCreditCard },
            { id: "notifications", to: "/customer/notifications", label: "Notifications", icon: FaBell }
        ]
    },
    {
        id: "feedback",
        label: "Feedback",
        items: [
            { id: "reviews", to: "/customer/reviews", label: "My Reviews", icon: FaStar },
            { id: "complaints", to: "/customer/complaints", label: "Complaints", icon: FaExclamationCircle }
        ]
    }
];

/* ------------------------------------------------------------------ */
/*  Logo                                                               */
/* ------------------------------------------------------------------ */
export function RoadAidMark({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 2C7.6 2 4 5.5 4 9.8 4 15.3 12 22 12 22s8-6.7 8-12.2C20 5.5 16.4 2 12 2Z"
                fill={COLOR.accent}
            />
            <path
                d="M12 6.3c-1.9 0-3.4 1.5-3.4 3.4 0 .5.1.9.3 1.3l-1.6 1.6c-.2.2-.2.5 0 .7l.7.7c.2.2.5.2.7 0l1.6-1.6c.4.2.9.3 1.3.3.5 0 .9-.1 1.3-.3l1.6 1.6c.2.2.5.2.7 0l.7-.7c.2-.2.2-.5 0-.7l-1.6-1.6c.2-.4.3-.8.3-1.3 0-1.9-1.5-3.4-3.6-3.4Zm0 1.4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2Z"
                fill="#ffffff"
            />
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */
function useMediaQuery(query) {
    const [matches, setMatches] = useState(() =>
        typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false
    );

    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const mql = window.matchMedia(query);
        const onChange = (e) => setMatches(e.matches);
        setMatches(mql.matches);
        if (mql.addEventListener) mql.addEventListener("change", onChange);
        else mql.addListener(onChange);
        return () => {
            if (mql.removeEventListener) mql.removeEventListener("change", onChange);
            else mql.removeListener(onChange);
        };
    }, [query]);

    return matches;
}

function readCollapsed() {
    try {
        return window.localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
        return false;
    }
}

function initialsOf(name = "") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

function getFocusable(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('a[href], button:not([disabled])')).filter(
        (el) => el.offsetParent !== null
    );
}

/* ------------------------------------------------------------------ */
/*  MaybePortal                                                        */
/*  On mobile the drawer is rendered directly under <body>, so no     */
/*  transform/filter on a parent in the layout can break              */
/*  position:fixed (which made the drawer taller than the screen).    */
/*  On desktop it stays in the layout as before.                      */
/* ------------------------------------------------------------------ */
function MaybePortal({ active, children }) {
    return active ? createPortal(<>{children}</>, document.body) : <>{children}</>;
}

/* ------------------------------------------------------------------ */
/*  Logout confirmation                                                */
/*  Rendered in a portal because the mobile drawer uses a transform,  */
/*  which would otherwise trap position:fixed inside the drawer.      */
/* ------------------------------------------------------------------ */
function LogoutDialog({ onCancel, onConfirm }) {
    const dialogRef = useRef(null);
    const cancelRef = useRef(null);
    const cancelFn = useRef(onCancel);
    cancelFn.current = onCancel;

    useEffect(() => {
        const previous = document.activeElement;
        cancelRef.current?.focus();

        const onKey = (e) => {
            if (e.key === "Escape") {
                cancelFn.current();
                return;
            }
            if (e.key === "Tab") {
                const nodes = getFocusable(dialogRef.current);
                if (!nodes.length) return;
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            previous?.focus?.();
        };
    }, []);

    return createPortal(
        <div
            className="cust-dialog-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
        >
            <div
                ref={dialogRef}
                className="cust-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="cust-logout-title"
                aria-describedby="cust-logout-desc"
            >
                <div className="cust-dialog-icon" aria-hidden="true">
                    <FaSignOutAlt size={18} />
                </div>
                <h2 id="cust-logout-title">Log out of RoadAid?</h2>
                <p id="cust-logout-desc">
                    You'll need to log in again to request help or track your mechanic.
                </p>
                <div className="cust-dialog-actions">
                    <button ref={cancelRef} type="button" className="cust-btn cust-btn-ghost" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="button" className="cust-btn cust-btn-danger" onClick={onConfirm}>
                        Log out
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/*                                                                     */
/*  Props (all optional):                                              */
/*   mobileOpen / onMobileClose  – let CustomerLayout own the drawer   */
/*   user           – { name, avatarUrl } shown in the account row     */
/*   unreadCount    – number shown on Notifications                    */
/*   activeRequest  – { title, subtitle } shows a live status card     */
/*                    while a mechanic is on the way                   */
/*   onRequestHelp  – override what the "Request help" button does     */
/* ------------------------------------------------------------------ */
function CustomerSidebar({
                             mobileOpen: mobileOpenProp,
                             onMobileClose,
                             user,
                             unreadCount = 0,
                             activeRequest,
                             onRequestHelp
                         }) {
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(MOBILE_QUERY);

    const [internalOpen, setInternalOpen] = useState(false);
    const [collapsedPref, setCollapsedPref] = useState(readCollapsed);
    const [confirmingLogout, setConfirmingLogout] = useState(false);

    const panelRef = useRef(null);
    const closeBtnRef = useRef(null);

    const isControlled = mobileOpenProp !== undefined;
    const mobileOpen = isControlled ? mobileOpenProp : internalOpen;
    // The drawer is always full width; "collapsed" only applies on desktop.
    const collapsed = collapsedPref && !isMobile;
    const drawerActive = isMobile && mobileOpen;

    const closeMobile = useCallback(() => {
        if (isControlled) onMobileClose?.();
        else setInternalOpen(false);
    }, [isControlled, onMobileClose]);

    // Refs so effects always call the latest handler without re-running.
    const closeRef = useRef(closeMobile);
    closeRef.current = closeMobile;
    const confirmingRef = useRef(confirmingLogout);
    confirmingRef.current = confirmingLogout;

    // Close the drawer whenever the route changes.
    useEffect(() => {
        closeRef.current();
    }, [location.pathname]);

    // Remember the collapsed choice.
    useEffect(() => {
        try {
            window.localStorage.setItem(COLLAPSE_KEY, collapsedPref ? "1" : "0");
        } catch {
            /* storage unavailable — ignore */
        }
    }, [collapsedPref]);

    // Drawer behaviour on mobile: lock scroll, move focus in, trap Tab,
    // close on Escape, and hand focus back to the menu button afterwards.
    useEffect(() => {
        if (!drawerActive) return undefined;

        const previouslyFocused = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeBtnRef.current?.focus();

        const onKey = (e) => {
            if (confirmingRef.current) return;
            if (e.key === "Escape") {
                closeRef.current();
                return;
            }
            if (e.key === "Tab") {
                const nodes = getFocusable(panelRef.current);
                if (!nodes.length) return;
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [drawerActive]);

    const confirmLogout = async () => {
        setConfirmingLogout(false);
        try {
            await logout();
        } catch (err) {
            console.error("Logout failed:", err);
        } finally {
            navigate("/", { replace: true });
        }
    };

    const unread = Number(unreadCount) || 0;
    const userName = user?.name?.trim();
    const initials = initialsOf(userName);

    return (
        <>
            <style>{STYLES}</style>

            <MaybePortal active={isMobile}>
                <div
                    className={`cust-backdrop${mobileOpen ? " is-open" : ""}`}
                    onClick={closeMobile}
                    aria-hidden="true"
                />

                <aside
                    ref={panelRef}
                    id="cust-sidebar"
                    className={`cust-sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-open" : ""}`}
                >
                    {/* Header */}
                    <div className="cust-header">
                        <Link to="/customer" className="cust-brand" aria-label="RoadAid customer home">
                            <span className="cust-logo">
                                <RoadAidMark size={22} />
                            </span>
                            {!collapsed && (
                                <span className="cust-brand-text">
                                    <span className="cust-brand-name">RoadAid</span>
                                    <span className="cust-brand-sub">Customer</span>
                                </span>
                            )}
                        </Link>

                        <button
                            ref={closeBtnRef}
                            type="button"
                            className="cust-close"
                            onClick={closeMobile}
                            aria-label="Close menu"
                        >
                            <FaTimes size={17} aria-hidden="true" />
                        </button>
                    </div>

                    {/* Primary action + live status */}
                    <div className="cust-top">
                        <Link
                            to={REQUEST_HELP_PATH}
                            className="cust-cta"
                            aria-label={collapsed ? "Request help" : undefined}
                            title={collapsed ? "Request help" : undefined}
                            onClick={(e) => {
                                if (onRequestHelp) {
                                    e.preventDefault();
                                    onRequestHelp();
                                    closeMobile();
                                }
                            }}
                        >
                            <FaPlus size={14} aria-hidden="true" />
                            {!collapsed && <span>Request help</span>}
                        </Link>

                        {activeRequest && (
                            <Link
                                to={LIVE_MAP_PATH}
                                className="cust-live"
                                aria-label={`${activeRequest.title || "Help is on the way"}. ${
                                    activeRequest.subtitle || "Track on live map"
                                }`}
                                title={collapsed ? activeRequest.title || "Help is on the way" : undefined}
                            >
                                <span className="cust-live-dot" aria-hidden="true" />
                                {!collapsed && (
                                    <>
                                        <span className="cust-live-text">
                                            <span className="cust-live-title">
                                                {activeRequest.title || "Help is on the way"}
                                            </span>
                                            <span className="cust-live-sub">
                                                {activeRequest.subtitle || "Track on live map"}
                                            </span>
                                        </span>
                                        <FaChevronRight size={11} aria-hidden="true" />
                                    </>
                                )}
                            </Link>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="cust-nav" aria-label="Customer menu">
                        {NAV_GROUPS.map((group) => (
                            <div className="cust-group" key={group.id}>
                                {group.label &&
                                    (collapsed ? (
                                        <div className="cust-group-divider" />
                                    ) : (
                                        <p className="cust-group-label">{group.label}</p>
                                    ))}

                                <ul className="cust-list" role="list">
                                    {group.items.map((item) => {
                                        const count = item.id === "notifications" ? unread : 0;
                                        const countLabel = count > 99 ? "99+" : String(count);
                                        const fullLabel = count
                                            ? `${item.label}, ${count} unread`
                                            : item.label;

                                        return (
                                            <li key={item.id}>
                                                <NavLink
                                                    to={item.to}
                                                    end={item.end}
                                                    className={({ isActive }) =>
                                                        `cust-nav-link${isActive ? " active" : ""}`
                                                    }
                                                    aria-label={collapsed ? fullLabel : undefined}
                                                    title={collapsed ? fullLabel : undefined}
                                                >
                                                    <span className="cust-nav-icon">
                                                        <item.icon size={18} aria-hidden="true" focusable="false" />
                                                        {collapsed && count > 0 && <span className="cust-dot" />}
                                                    </span>
                                                    {!collapsed && (
                                                        <>
                                                            <span className="cust-nav-label">{item.label}</span>
                                                            {count > 0 && (
                                                                <>
                                                                    <span className="cust-badge" aria-hidden="true">
                                                                        {countLabel}
                                                                    </span>
                                                                    <span className="cust-sr">{count} unread</span>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </NavLink>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    {/* Collapse toggle (desktop only) */}
                    <button
                        type="button"
                        className="cust-collapse"
                        onClick={() => setCollapsedPref((v) => !v)}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-expanded={!collapsed}
                        aria-controls="cust-sidebar"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? (
                            <FaChevronRight size={11} aria-hidden="true" />
                        ) : (
                            <FaChevronLeft size={11} aria-hidden="true" />
                        )}
                    </button>

                    {/* Account + logout */}
                    <div className="cust-footer">
                        <NavLink
                            to={PROFILE_PATH}
                            className={({ isActive }) => `cust-account${isActive ? " active" : ""}`}
                            aria-label={collapsed ? `${userName || "My profile"}, view profile` : undefined}
                            title={collapsed ? userName || "My profile" : undefined}
                        >
                            <span className="cust-avatar" aria-hidden="true">
                                {user?.avatarUrl ? (
                                    <img src={user.avatarUrl} alt="" />
                                ) : initials ? (
                                    initials
                                ) : (
                                    <FaUserCircle size={22} />
                                )}
                            </span>
                            {!collapsed && (
                                <span className="cust-account-text">
                                    <span className="cust-account-name">{userName || "My profile"}</span>
                                    <span className="cust-account-sub">
                                        {userName ? "View profile" : "Account and settings"}
                                    </span>
                                </span>
                            )}
                        </NavLink>

                        <button
                            type="button"
                            className="cust-logout"
                            onClick={() => setConfirmingLogout(true)}
                            aria-label={collapsed ? "Log out" : undefined}
                            title={collapsed ? "Log out" : undefined}
                        >
                            <span className="cust-nav-icon" style={{ color: "inherit" }}>
                                <FaSignOutAlt size={17} aria-hidden="true" />
                            </span>
                            {!collapsed && <span>Log out</span>}
                        </button>
                    </div>
                </aside>
            </MaybePortal>

            {confirmingLogout && (
                <LogoutDialog onCancel={() => setConfirmingLogout(false)} onConfirm={confirmLogout} />
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/*  --cust-sidebar-offset: if your layout has a top bar ABOVE the     */
/*  sidebar, set this variable to the bar's height so the sidebar     */
/*  fits under it (e.g. .layout { --cust-sidebar-offset: 64px; }).    */
/* ------------------------------------------------------------------ */
const STYLES = `
@import url("https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap");

.cust-sidebar, .cust-dialog-overlay {
    font-family: ${FONT};
    -webkit-font-smoothing: antialiased;
    -webkit-tap-highlight-color: transparent;
}
.cust-sidebar *, .cust-dialog-overlay * { box-sizing: border-box; }
.cust-sidebar button, .cust-dialog-overlay button { font-family: inherit; }

.cust-sr {
    position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ---------- Panel ---------- */
.cust-sidebar {
    position: sticky;
    top: var(--cust-sidebar-offset, 0px);
    align-self: flex-start;
    flex-shrink: 0;
    z-index: 20;
    width: 264px;
    height: calc(100vh - var(--cust-sidebar-offset, 0px));
    height: calc(100dvh - var(--cust-sidebar-offset, 0px));
    display: flex;
    flex-direction: column;
    background: ${COLOR.panel};
    border-right: 1px solid ${COLOR.border};
    transition: width 0.2s ease;
}
.cust-sidebar.is-collapsed { width: 80px; }

.cust-backdrop { display: none; }

/* ---------- Focus (visible for keyboard users) ---------- */
.cust-sidebar a:focus-visible,
.cust-sidebar button:focus-visible,
.cust-dialog-overlay button:focus-visible {
    outline: 2px solid ${COLOR.ink};
    outline-offset: 2px;
}

/* ---------- Header ---------- */
.cust-header {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    min-height: 76px; padding: 18px 16px 12px;
}
.cust-sidebar.is-collapsed .cust-header { justify-content: center; padding: 18px 0 12px; }

.cust-brand {
    display: flex; align-items: center; gap: 12px; min-width: 0;
    text-decoration: none; border-radius: 12px;
}
.cust-logo {
    width: 40px; height: 40px; flex: none; border-radius: 12px;
    background: ${COLOR.ink}; display: grid; place-items: center;
}
.cust-brand-text { display: flex; flex-direction: column; min-width: 0; }
.cust-brand-name {
    font-size: 19px; font-weight: 700; letter-spacing: -0.02em;
    line-height: 1.1; color: ${COLOR.ink};
}
.cust-brand-sub { font-size: 13px; color: ${COLOR.textMuted}; margin-top: 3px; }

.cust-close {
    display: none; width: 44px; height: 44px; border: 0; border-radius: 12px;
    background: transparent; color: ${COLOR.textBody}; cursor: pointer;
    align-items: center; justify-content: center;
}
.cust-close:hover { background: ${COLOR.surface}; }

/* ---------- Primary action + live card ---------- */
.cust-top { display: flex; flex-direction: column; gap: 10px; padding: 4px 14px 14px; }
.cust-sidebar.is-collapsed .cust-top { align-items: center; padding: 4px 0 14px; }

.cust-cta {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; height: 48px; border-radius: 12px;
    background: ${COLOR.ink}; color: #fff; text-decoration: none;
    font-size: 15.5px; font-weight: 700; letter-spacing: -0.005em;
    transition: background 0.15s ease, transform 0.1s ease;
}
.cust-cta:hover { background: ${COLOR.inkHover}; }
.cust-cta:active { transform: scale(0.98); }
.cust-sidebar.is-collapsed .cust-cta { width: 48px; }

.cust-live {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 11px 14px; border-radius: 12px; text-decoration: none;
    background: ${COLOR.successSoft}; color: #0b3d24;
    transition: filter 0.15s ease;
}
.cust-live:hover { filter: brightness(0.97); }
.cust-sidebar.is-collapsed .cust-live { width: 48px; height: 48px; padding: 0; justify-content: center; }
.cust-live-dot {
    position: relative; width: 10px; height: 10px; flex: none;
    border-radius: 50%; background: ${COLOR.success};
}
.cust-live-dot::after {
    content: ""; position: absolute; inset: 0; border-radius: 50%;
    background: ${COLOR.success}; animation: cust-pulse 1.8s ease-out infinite;
}
@keyframes cust-pulse {
    0% { transform: scale(1); opacity: 0.55; }
    100% { transform: scale(3); opacity: 0; }
}
.cust-live-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.cust-live-title { font-size: 14px; font-weight: 700; line-height: 1.25; }
.cust-live-sub { font-size: 13px; color: #2f6b4f; line-height: 1.3; }

/* ---------- Navigation ---------- */
.cust-nav {
    flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
    padding: 4px 12px 16px;
    scrollbar-width: thin; scrollbar-color: ${COLOR.border} transparent;
}
.cust-nav::-webkit-scrollbar { width: 6px; }
.cust-nav::-webkit-scrollbar-thumb { background: ${COLOR.border}; border-radius: 3px; }

.cust-group + .cust-group { margin-top: 16px; }
.cust-group-label {
    margin: 0 0 4px; padding: 0 12px;
    font-size: 13px; font-weight: 600; color: ${COLOR.textMuted};
}
.cust-group-divider { height: 1px; margin: 0 10px 10px; background: ${COLOR.borderSoft}; }

.cust-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

.cust-nav-link {
    position: relative; display: flex; align-items: center; gap: 14px;
    min-height: 46px; padding: 0 12px; border-radius: 12px;
    color: ${COLOR.textBody}; text-decoration: none;
    font-size: 15px; font-weight: 500;
    transition: background 0.15s ease, color 0.15s ease;
}
.cust-nav-link:hover { background: ${COLOR.surface}; color: ${COLOR.ink}; }
.cust-nav-link.active { background: ${COLOR.surface}; color: ${COLOR.ink}; font-weight: 700; }
.cust-nav-link.active::before {
    content: ""; position: absolute; left: -12px; top: 10px; bottom: 10px;
    width: 4px; border-radius: 0 4px 4px 0; background: ${COLOR.accent};
}
.cust-nav-icon {
    position: relative; width: 22px; flex: none; display: grid; place-items: center;
    color: ${COLOR.textMuted};
}
.cust-nav-link.active .cust-nav-icon { color: ${COLOR.accentStrong}; }
.cust-nav-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.cust-sidebar.is-collapsed .cust-nav-link { justify-content: center; padding: 0; }
.cust-sidebar.is-collapsed .cust-nav-link.active::before { left: -12px; }

.cust-badge {
    min-width: 22px; height: 22px; padding: 0 7px; border-radius: 11px;
    background: ${COLOR.dangerStrong}; color: #fff;
    font-size: 12.5px; font-weight: 700; display: grid; place-items: center;
}
.cust-dot {
    position: absolute; top: -3px; right: -4px; width: 10px; height: 10px;
    border-radius: 50%; background: ${COLOR.dangerStrong}; border: 2px solid ${COLOR.panel};
}

/* ---------- Collapse toggle ---------- */
.cust-collapse {
    position: absolute; top: 30px; right: -14px;
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: ${COLOR.panel}; color: ${COLOR.textBody};
    border: 1px solid ${COLOR.border}; box-shadow: ${COLOR.shadow}; cursor: pointer;
    transition: background 0.15s ease;
}
.cust-collapse:hover { background: ${COLOR.surface}; }

/* ---------- Footer ---------- */
.cust-footer {
    display: flex; flex-direction: column; gap: 2px;
    padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid ${COLOR.borderSoft};
}
.cust-account {
    display: flex; align-items: center; gap: 12px; min-height: 58px;
    padding: 8px 10px; border-radius: 12px; text-decoration: none;
    color: ${COLOR.textBright}; transition: background 0.15s ease;
}
.cust-account:hover, .cust-account.active { background: ${COLOR.surface}; }
.cust-avatar {
    width: 38px; height: 38px; flex: none; border-radius: 50%; overflow: hidden;
    display: grid; place-items: center;
    background: ${COLOR.accentSoft}; color: ${COLOR.accentStrong};
    font-size: 14px; font-weight: 700;
}
.cust-avatar img { width: 100%; height: 100%; object-fit: cover; }
.cust-account-text { display: flex; flex-direction: column; min-width: 0; }
.cust-account-name {
    font-size: 15px; font-weight: 600; line-height: 1.25;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cust-account-sub { font-size: 13px; color: ${COLOR.textMuted}; line-height: 1.3; }
.cust-sidebar.is-collapsed .cust-account { justify-content: center; padding: 8px 0; }

.cust-logout {
    display: flex; align-items: center; gap: 14px; width: 100%; min-height: 46px;
    padding: 0 12px; border: 0; border-radius: 12px; background: transparent;
    color: ${COLOR.dangerStrong}; font-size: 15px; font-weight: 600;
    text-align: left; cursor: pointer; transition: background 0.15s ease;
}
.cust-logout:hover { background: ${COLOR.dangerSoft}; }
.cust-sidebar.is-collapsed .cust-logout { justify-content: center; padding: 0; }

/* ---------- Logout dialog ---------- */
.cust-dialog-overlay {
    position: fixed; inset: 0; z-index: 2000; display: grid; place-items: center;
    padding: 20px; background: rgba(17, 17, 17, 0.5);
    animation: cust-fade 0.15s ease;
}
@keyframes cust-fade { from { opacity: 0; } to { opacity: 1; } }
.cust-dialog {
    width: 100%; max-width: 380px; padding: 24px; border-radius: 20px;
    background: #fff; box-shadow: ${COLOR.shadowHover};
}
.cust-dialog-icon {
    width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
    background: ${COLOR.dangerSoft}; color: ${COLOR.dangerStrong};
}
.cust-dialog h2 {
    margin: 16px 0 6px; font-size: 21px; font-weight: 700;
    letter-spacing: -0.02em; color: ${COLOR.ink};
}
.cust-dialog p { margin: 0; font-size: 15px; line-height: 1.5; color: ${COLOR.textMuted}; }
.cust-dialog-actions { display: flex; gap: 10px; margin-top: 22px; }
.cust-btn {
    flex: 1; height: 48px; border: 0; border-radius: 12px; cursor: pointer;
    font-size: 15px; font-weight: 700; transition: background 0.15s ease, transform 0.1s ease;
}
.cust-btn:active { transform: scale(0.98); }
.cust-btn-ghost { background: ${COLOR.surface}; color: ${COLOR.ink}; }
.cust-btn-ghost:hover { background: ${COLOR.borderSoft}; filter: brightness(0.97); }
.cust-btn-danger { background: ${COLOR.dangerStrong}; color: #fff; }
.cust-btn-danger:hover { filter: brightness(0.92); }

/* ---------- Mobile drawer ---------- */
@media (max-width: 900px) {
    .cust-sidebar {
        position: fixed; left: 0; top: 0; bottom: 0; height: auto;
        max-height: 100vh; max-height: 100dvh;
        width: min(300px, 86vw); z-index: 1000;
        transform: translateX(-102%); visibility: hidden;
        transition: transform 0.22s ease, visibility 0s linear 0.22s;
    }
    .cust-sidebar.is-open {
        transform: translateX(0); visibility: visible;
        box-shadow: ${COLOR.shadowHover};
        transition: transform 0.22s ease, visibility 0s;
    }
    .cust-header { padding-top: calc(18px + env(safe-area-inset-top, 0px)); }
    .cust-close { display: inline-flex; }
    .cust-collapse { display: none; }

    .cust-backdrop {
        display: block; position: fixed; inset: 0; z-index: 999;
        background: rgba(17, 17, 17, 0.45);
        opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
    }
    .cust-backdrop.is-open { opacity: 1; pointer-events: auto; }
}

@media (prefers-reduced-motion: reduce) {
    .cust-sidebar, .cust-nav-link, .cust-cta, .cust-btn, .cust-backdrop { transition: none !important; }
    .cust-live-dot::after, .cust-dialog-overlay { animation: none !important; }
}
`;

export default CustomerSidebar;