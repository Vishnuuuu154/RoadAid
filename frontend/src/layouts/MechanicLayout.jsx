import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/authService";
import NotificationBell from "../components/NotificationBell";
import { getMyProfile, updateAvailability, updateLocation } from "../services/mechanicService";
// Adjust this path to wherever you keep the sidebar.
import MechanicSidebar, { NAV_ITEMS, isPathActive } from "../components/mechanic/MechanicSidebar";
import Navbar from "../components/common/Navbar.jsx";
import {
    FaBars,
    FaTimes,
    FaCheckCircle,
    FaExclamationTriangle,
    FaInfoCircle,
    FaTimesCircle
} from "react-icons/fa";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const AVAILABILITY_KEY = "rm-mechanic-availability";
const COLLAPSE_KEY = "rm-sidebar-collapsed";

const TOAST_ICONS = {
    success: FaCheckCircle,
    error: FaTimesCircle,
    info: FaInfoCircle,
    warning: FaExclamationTriangle
};

const readFlag = (key, test) => {
    try {
        return test(localStorage.getItem(key));
    } catch {
        return test(null);
    }
};

const writeFlag = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* storage unavailable (private mode) - state still works this session */
    }
};

/* ------------------------------------------------------------------ */
/* Contexts + hooks (public API for pages rendered inside the layout)  */
/* ------------------------------------------------------------------ */

const FeedbackContext = createContext(null);
const AvailabilityContext = createContext(null);

export function useToast() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) throw new Error("useToast() must be called from inside <MechanicLayout>.");
    return ctx.showToast;
}

export function useConfirm() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) throw new Error("useConfirm() must be called from inside <MechanicLayout>.");
    return ctx.confirm;
}

export function useAvailability() {
    const ctx = useContext(AvailabilityContext);
    if (!ctx) throw new Error("useAvailability() must be called from inside <MechanicLayout>.");
    return ctx;
}

function useGoogleFonts() {
    useEffect(() => {
        if (document.getElementById("rm-google-fonts")) return;
        const add = (attrs) => {
            const el = document.createElement("link");
            Object.assign(el, attrs);
            document.head.appendChild(el);
        };
        add({ rel: "preconnect", href: "https://fonts.googleapis.com" });
        add({ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" });
        add({
            id: "rm-google-fonts",
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        });
    }, []);
}

function useOnlineStatus() {
    const [connected, setConnected] = useState(() => navigator.onLine);
    useEffect(() => {
        const up = () => setConnected(true);
        const down = () => setConnected(false);
        window.addEventListener("online", up);
        window.addEventListener("offline", down);
        return () => {
            window.removeEventListener("online", up);
            window.removeEventListener("offline", down);
        };
    }, []);
    return connected;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function MechanicLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const connected = useOnlineStatus();

    const [menuOpen, setMenuOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => readFlag(COLLAPSE_KEY, (v) => v === "1"));

    useGoogleFonts();

    /* ---------- Toasts ---------- */
    const [toasts, setToasts] = useState([]);
    const toastId = useRef(0);

    const showToast = useCallback((message, tone = "info") => {
        const id = ++toastId.current;
        setToasts((prev) => [...prev, { id, message, tone }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
    }, []);

    const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

    /* ---------- Confirm dialog ---------- */
    const [confirmState, setConfirmState] = useState(null);

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            setConfirmState({
                title: options.title || "Are you sure?",
                message: options.message || "This action can't be undone.",
                tone: options.tone === "success" ? "success" : "danger",
                confirmLabel: options.confirmLabel || "Confirm",
                cancelLabel: options.cancelLabel || "Cancel",
                resolve
            });
        });
    }, []);

    const resolveConfirm = useCallback(
        (value) => {
            confirmState?.resolve(value);
            setConfirmState(null);
        },
        [confirmState]
    );

    useEffect(() => {
        if (!confirmState) return;
        const onKey = (e) => e.key === "Escape" && resolveConfirm(false);
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [confirmState, resolveConfirm]);

    /* ---------- Availability (server-backed, shared by every page) ---------- */
    // localStorage only gives an instant first paint; the server is the truth.
    const [online, setOnline] = useState(() => readFlag(AVAILABILITY_KEY, (v) => v !== "offline"));
    const [approved, setApproved] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [locationError, setLocationError] = useState("");

    useEffect(() => {
        let alive = true;
        getMyProfile()
            .then((res) => {
                if (!alive) return;
                const ok = res.data?.verificationStatus === "APPROVED";
                setApproved(ok);
                setOnline(ok && !!res.data?.available);
                writeFlag(AVAILABILITY_KEY, ok && res.data?.available ? "online" : "offline");
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, []);

    const toggleAvailability = useCallback(async () => {
        if (updating) return;
        if (!approved) {
            showToast("You can go online once an admin approves your account.", "info");
            return;
        }
        const next = !online;
        setUpdating(true);
        try {
            const res = await updateAvailability(next);
            const value = res?.data?.available ?? next;
            setOnline(value);
            writeFlag(AVAILABILITY_KEY, value ? "online" : "offline");
            showToast(
                value
                    ? "You're online and visible for new requests."
                    : "You're offline. New requests won't reach you.",
                value ? "success" : "info"
            );
        } catch (error) {
            showToast(error.response?.data?.message || "Couldn't update your availability.", "error");
        } finally {
            setUpdating(false);
        }
    }, [online, approved, updating, showToast]);

    // While online, share live location on every page (not just the dashboard).
    const sharing = online && approved;
    useEffect(() => {
        if (!sharing || !navigator.geolocation) return;
        const send = () =>
            navigator.geolocation.getCurrentPosition(
                async ({ coords }) => {
                    try {
                        await updateLocation(coords.latitude, coords.longitude);
                        setLocationError("");
                    } catch (error) {
                        console.error("Failed to update location:", error);
                    }
                },
                () =>
                    setLocationError(
                        "We couldn't confirm your live location. Customers may see a delayed position."
                    ),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        send();
        const id = setInterval(send, 10000);
        return () => clearInterval(id);
    }, [sharing]);

    /* ---------- Navigation ---------- */
    const isActive = (path) => isPathActive(location.pathname, path);

    const currentPage = NAV_ITEMS.find((i) => isActive(i.path))?.label || "Mechanic Panel";

    const handleLogout = async () => {
        const ok = await confirm({
            title: "Log out?",
            message: online
                ? "You're still online. You'll stop receiving requests once you log out."
                : "You'll need to sign in again to continue.",
            confirmLabel: "Log out"
        });
        if (!ok) return;
        logout();
        navigate("/");
    };

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            writeFlag(COLLAPSE_KEY, prev ? "0" : "1");
            return !prev;
        });
    };

    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [menuOpen]);

    return (
        <AvailabilityContext.Provider value={{ online, approved, updating, locationError, toggleAvailability }}>
            <FeedbackContext.Provider value={{ showToast, confirm }}>
                <div className={`rm-shell ${collapsed ? "is-collapsed" : ""}`}>
                    <style>{STYLES}</style>

                    <a href="#rm-main-content" className="rm-skip-link">
                        Skip to content
                    </a>

                    <MechanicSidebar
                        menuOpen={menuOpen}
                        setMenuOpen={setMenuOpen}
                        collapsed={collapsed}
                        onToggleCollapsed={toggleCollapsed}
                        onLogout={handleLogout}
                    />

                    {/* ---------------- Main column ---------------- */}
                    <div className="rm-column">
                        <Navbar onMenuClick={() => setMenuOpen(true)} />

                        {!connected && (
                            <div className="rm-net-banner" role="status">
                                <FaExclamationTriangle aria-hidden="true" />
                                No internet connection. You may miss new requests until you're back online.
                            </div>
                        )}

                        <main id="rm-main-content" className="rm-main">
                            {children}
                        </main>
                    </div>

                    {/* ---------------- Toasts ---------------- */}
                    <div className="rm-toast-stack" aria-live="polite">
                        {toasts.map((t) => {
                            const Icon = TOAST_ICONS[t.tone] || FaInfoCircle;
                            return (
                                <div className="rm-toast" data-tone={t.tone} key={t.id}>
                                    <Icon aria-hidden="true" className="rm-toast-icon" />
                                    <span className="rm-toast-message">{t.message}</span>
                                    <button
                                        type="button"
                                        className="rm-toast-close"
                                        onClick={() => dismissToast(t.id)}
                                        aria-label="Dismiss notification"
                                    >
                                        <FaTimes aria-hidden="true" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* ---------------- Confirm dialog ---------------- */}
                    {confirmState && (
                        <div className="rm-modal-overlay" onClick={() => resolveConfirm(false)}>
                            <div
                                className="rm-modal"
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="rm-confirm-title"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="rm-modal-icon" data-tone={confirmState.tone}>
                                    {confirmState.tone === "success" ? (
                                        <FaCheckCircle aria-hidden="true" />
                                    ) : (
                                        <FaExclamationTriangle aria-hidden="true" />
                                    )}
                                </div>
                                <h3 className="rm-modal-title" id="rm-confirm-title">
                                    {confirmState.title}
                                </h3>
                                <p className="rm-modal-text">{confirmState.message}</p>
                                <div className="rm-modal-actions">
                                    <button
                                        type="button"
                                        className="rm-btn rm-btn-secondary"
                                        onClick={() => resolveConfirm(false)}
                                        autoFocus={confirmState.tone === "danger"}
                                    >
                                        {confirmState.cancelLabel}
                                    </button>
                                    <button
                                        type="button"
                                        className={`rm-btn ${confirmState.tone === "success" ? "rm-btn-success" : "rm-btn-danger"}`}
                                        onClick={() => resolveConfirm(true)}
                                        autoFocus={confirmState.tone === "success"}
                                    >
                                        {confirmState.confirmLabel}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </FeedbackContext.Provider>
        </AvailabilityContext.Provider>
    );
}

export default MechanicLayout;

/* ------------------------------------------------------------------ */
/* Styles: white + blue. Shared classes (rm-btn, rm-card, rm-badge,    */
/* rm-panel, rm-empty, rm-skeleton, rm-spin...) are kept so existing   */
/* pages keep working.                                                 */
/* ------------------------------------------------------------------ */

const STYLES = `
.rm-shell {
    --rm-ink: #0f172a;
    --rm-body: #475569;
    --rm-muted: #64748b;
    --rm-border: #e2e8f0;
    --rm-border-strong: #cbd5e1;
    --rm-surface: #ffffff;
    --rm-bg: #f5f8fc;

    --rm-primary: #2563eb;
    --rm-primary-dark: #1d4ed8;
    --rm-primary-soft: #eff6ff;
    --rm-primary-soft-border: #bfdbfe;

    --rm-success: #15803d; --rm-success-soft: #f0fdf4; --rm-success-border: #bbf7d0;
    --rm-danger: #dc2626;  --rm-danger-soft: #fef2f2;  --rm-danger-border: #fecaca;
    --rm-warning: #b45309; --rm-warning-soft: #fffbeb; --rm-warning-border: #fde68a;
    --rm-info: #1d4ed8;    --rm-info-soft: #eff6ff;    --rm-info-border: #bfdbfe;

    --rm-radius-sm: 8px; --rm-radius-md: 12px; --rm-radius-lg: 16px;
    --rm-shadow-sm: 0 1px 2px rgba(15, 23, 42, .06);
    --rm-shadow-md: 0 8px 24px rgba(15, 23, 42, .08);
    --rm-shadow-lg: 0 20px 44px rgba(15, 23, 42, .18);
    --rm-font: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    --rm-sidebar-w: 256px;
    --rm-topbar-h: 64px;

    min-height: 100vh;
    display: flex;
    background: var(--rm-bg);
    color: var(--rm-body);
    font-family: var(--rm-font);
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
}
.rm-shell *, .rm-shell *::before, .rm-shell *::after { box-sizing: border-box; }
.rm-shell a { color: inherit; text-decoration: none; }
.rm-shell button { font-family: inherit; }
.rm-shell :focus-visible { outline: 3px solid rgba(37, 99, 235, .45); outline-offset: 2px; }

.rm-skip-link { position: absolute; left: 12px; top: -60px; z-index: 200; background: var(--rm-primary); color: #fff !important; padding: 10px 16px; border-radius: var(--rm-radius-sm); font-weight: 600; }
.rm-skip-link:focus { top: 12px; }

/* ---------- Sidebar ---------- */
.rm-sidebar { position: sticky; top: 0; height: 100vh; width: var(--rm-sidebar-w); flex-shrink: 0; display: flex; flex-direction: column; background: var(--rm-surface); border-right: 1px solid var(--rm-border); transition: width .2s ease; z-index: 60; }
.rm-sidebar-header { height: var(--rm-topbar-h); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--rm-border); }
.rm-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.rm-brand-mark { width: 38px; height: 38px; flex-shrink: 0; display: grid; place-items: center; border-radius: 10px; background: var(--rm-primary); color: #fff; font-size: 16px; }
.rm-brand-text { display: flex; flex-direction: column; line-height: 1.15; }
.rm-brand-name { font-weight: 700; font-size: 17px; color: var(--rm-ink); }
.rm-brand-tag { font-size: 12px; font-weight: 500; color: var(--rm-muted); }

.rm-nav { flex: 1; overflow-y: auto; padding: 16px 12px; }
.rm-nav-group { margin: 0 14px 6px; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--rm-muted); }
.rm-nav-section + .rm-nav-section { margin-top: 18px; }
.rm-nav ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.rm-nav-link { width: 100%; display: flex; align-items: center; gap: 14px; min-height: 46px; padding: 0 14px; border: 0; border-radius: var(--rm-radius-md); background: transparent; color: var(--rm-body); font-size: 15px; font-weight: 500; text-align: left; cursor: pointer; transition: background .15s, color .15s; }
.rm-nav-link svg { font-size: 17px; flex-shrink: 0; }
.rm-nav-link:hover { background: var(--rm-bg); color: var(--rm-ink); }
.rm-nav-link-active, .rm-nav-link-active:hover { background: var(--rm-primary-soft); color: var(--rm-primary-dark); font-weight: 600; }
.rm-sidebar-footer { padding: 12px; border-top: 1px solid var(--rm-border); display: flex; flex-direction: column; gap: 4px; }
.rm-collapse-icon { transition: transform .2s; }

/* ---------- Main column + top bar ---------- */
.rm-column { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rm-topbar { position: sticky; top: 0; z-index: 40; height: var(--rm-topbar-h); display: flex; align-items: center; gap: 12px; padding: 0 28px; background: rgba(255, 255, 255, .92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--rm-border); }
.rm-page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--rm-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm-topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.rm-icon-btn { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--rm-border); border-radius: var(--rm-radius-md); background: var(--rm-surface); color: var(--rm-ink); font-size: 16px; cursor: pointer; }
.rm-icon-btn:hover { background: var(--rm-bg); }
.rm-menu-btn, .rm-sidebar-close { display: none; }

.rm-availability-toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid; font-size: 14px; font-weight: 600; cursor: pointer; transition: background .15s; }
.rm-availability-dot { width: 9px; height: 9px; border-radius: 50%; background: currentColor; }
.rm-availability-toggle:disabled { opacity: .7; cursor: progress; }
.rm-availability-toggle.is-online { background: var(--rm-success-soft); color: var(--rm-success); border-color: var(--rm-success-border); }
.rm-availability-toggle.is-online .rm-availability-dot { box-shadow: 0 0 0 4px rgba(21, 128, 61, .15); }
.rm-availability-toggle.is-offline { background: #f1f5f9; color: var(--rm-muted); border-color: var(--rm-border-strong); }

.rm-net-banner { display: flex; align-items: center; gap: 10px; padding: 10px 28px; background: var(--rm-warning-soft); border-bottom: 1px solid var(--rm-warning-border); color: var(--rm-warning); font-size: 14px; font-weight: 500; }

.rm-main { flex: 1; width: 100%; max-width: 1280px; margin: 0 auto; padding: 28px; }

/* ---------- Mobile tab bar / backdrop ---------- */
.rm-bottom-nav { display: none; }
button.rm-bottom-nav-link { border: 0; background: transparent; cursor: pointer; }
.rm-backdrop { position: fixed; inset: 0; z-index: 55; background: rgba(15, 23, 42, .45); }

/* ---------- Shared primitives ---------- */
.rm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 20px; border: 1px solid transparent; border-radius: var(--rm-radius-md); font-size: 15px; font-weight: 600; cursor: pointer; transition: background .15s, border-color .15s, transform .05s; }
.rm-btn:active { transform: scale(.98); }
.rm-btn:disabled { opacity: .55; cursor: not-allowed; }
.rm-btn-sm { min-height: 36px; padding: 0 14px; font-size: 14px; }
.rm-btn-block { width: 100%; }
.rm-btn-primary, .rm-btn-accent { background: var(--rm-primary); color: #fff; }
.rm-btn-primary:hover:not(:disabled), .rm-btn-accent:hover:not(:disabled) { background: var(--rm-primary-dark); }
.rm-btn-secondary { background: var(--rm-surface); color: var(--rm-ink); border-color: var(--rm-border-strong); }
.rm-btn-secondary:hover:not(:disabled) { background: var(--rm-bg); }
.rm-btn-ghost { background: transparent; color: var(--rm-primary); }
.rm-btn-ghost:hover:not(:disabled) { background: var(--rm-primary-soft); }
.rm-btn-success { background: var(--rm-success); color: #fff; }
.rm-btn-danger { background: var(--rm-danger); color: #fff; }
.rm-btn-danger-outline { background: var(--rm-surface); color: var(--rm-danger); border-color: var(--rm-danger-border); }
.rm-btn-danger-outline:hover:not(:disabled) { background: var(--rm-danger-soft); }

.rm-card { background: var(--rm-surface); border: 1px solid var(--rm-border); border-radius: var(--rm-radius-lg); box-shadow: var(--rm-shadow-sm); }
.rm-card-body { padding: 20px; }

.rm-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; border: 1px solid; font-size: 12.5px; font-weight: 600; }
.rm-badge-primary, .rm-badge-info { background: var(--rm-info-soft); color: var(--rm-info); border-color: var(--rm-info-border); }
.rm-badge-success { background: var(--rm-success-soft); color: var(--rm-success); border-color: var(--rm-success-border); }
.rm-badge-warning { background: var(--rm-warning-soft); color: var(--rm-warning); border-color: var(--rm-warning-border); }
.rm-badge-danger { background: var(--rm-danger-soft); color: var(--rm-danger); border-color: var(--rm-danger-border); }
.rm-badge-neutral { background: #f1f5f9; color: var(--rm-body); border-color: var(--rm-border-strong); }

.rm-panel { display: flex; gap: 14px; padding: 16px; border-radius: var(--rm-radius-md); border: 1px solid var(--rm-info-border); background: var(--rm-info-soft); }
.rm-panel-warning { background: var(--rm-warning-soft); border-color: var(--rm-warning-border); }
.rm-panel-danger { background: var(--rm-danger-soft); border-color: var(--rm-danger-border); }
.rm-panel-icon { flex-shrink: 0; font-size: 18px; margin-top: 2px; }
.rm-panel-title { margin: 0; font-weight: 700; color: var(--rm-ink); }
.rm-panel-text { margin: 2px 0 0; font-size: 14.5px; }

.rm-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; text-align: center; color: var(--rm-muted); }
.rm-empty-icon { width: 60px; height: 60px; display: grid; place-items: center; border-radius: 50%; background: var(--rm-primary-soft); color: var(--rm-primary); font-size: 24px; }

@keyframes rm-spin { to { transform: rotate(360deg); } }
@keyframes rm-shimmer { to { background-position: -200% 0; } }
.rm-spin, .rm-spinner-ring { animation: rm-spin .8s linear infinite; }
.rm-spinner-ring { width: 28px; height: 28px; border-radius: 50%; border: 3px solid var(--rm-primary-soft-border); border-top-color: var(--rm-primary); }
.rm-skeleton { border-radius: var(--rm-radius-sm); background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%); background-size: 200% 100%; animation: rm-shimmer 1.4s linear infinite; }

/* ---------- Toasts ---------- */
.rm-toast-stack { position: fixed; top: 76px; right: 20px; z-index: 120; display: flex; flex-direction: column; gap: 10px; width: min(380px, calc(100vw - 32px)); }
.rm-toast { display: flex; align-items: flex-start; gap: 12px; padding: 14px; background: var(--rm-surface); border: 1px solid var(--rm-border); border-left: 4px solid var(--rm-primary); border-radius: var(--rm-radius-md); box-shadow: var(--rm-shadow-md); animation: rm-toast-in .22s ease; }
@keyframes rm-toast-in { from { opacity: 0; transform: translateY(-8px); } }
.rm-toast[data-tone="success"] { border-left-color: var(--rm-success); }
.rm-toast[data-tone="error"] { border-left-color: var(--rm-danger); }
.rm-toast[data-tone="warning"] { border-left-color: #d97706; }
.rm-toast-icon { margin-top: 3px; font-size: 16px; color: var(--rm-primary); }
.rm-toast[data-tone="success"] .rm-toast-icon { color: var(--rm-success); }
.rm-toast[data-tone="error"] .rm-toast-icon { color: var(--rm-danger); }
.rm-toast[data-tone="warning"] .rm-toast-icon { color: #d97706; }
.rm-toast-message { flex: 1; font-size: 14.5px; color: var(--rm-ink); }
.rm-toast-close { border: 0; background: transparent; color: var(--rm-muted); padding: 6px; cursor: pointer; border-radius: 6px; }
.rm-toast-close:hover { background: var(--rm-bg); }

/* ---------- Confirm dialog ---------- */
.rm-modal-overlay { position: fixed; inset: 0; z-index: 150; display: grid; place-items: center; padding: 16px; background: rgba(15, 23, 42, .5); }
.rm-modal { width: min(420px, 100%); padding: 28px 24px 22px; text-align: center; background: var(--rm-surface); border-radius: var(--rm-radius-lg); box-shadow: var(--rm-shadow-lg); animation: rm-toast-in .2s ease; }
.rm-modal-icon { width: 52px; height: 52px; margin: 0 auto 14px; display: grid; place-items: center; border-radius: 50%; font-size: 22px; }
.rm-modal-icon[data-tone="danger"] { background: var(--rm-danger-soft); color: var(--rm-danger); }
.rm-modal-icon[data-tone="success"] { background: var(--rm-success-soft); color: var(--rm-success); }
.rm-modal-title { margin: 0 0 6px; font-size: 19px; color: var(--rm-ink); }
.rm-modal-text { margin: 0 0 22px; font-size: 15px; }
.rm-modal-actions { display: flex; gap: 10px; }
.rm-modal-actions .rm-btn { flex: 1; }

/* ---------- Desktop: collapsed sidebar ---------- */
@media (min-width: 961px) {
    .rm-shell.is-collapsed { --rm-sidebar-w: 76px; }
    .is-collapsed .rm-brand-text, .is-collapsed .rm-nav-label { display: none; }
    .is-collapsed .rm-nav-group { height: 1px; margin: 0 14px 10px; padding: 0; overflow: hidden; font-size: 0; background: var(--rm-border); }
    .is-collapsed .rm-nav-section:first-child .rm-nav-group { display: none; }
    .is-collapsed .rm-sidebar-header { justify-content: center; padding: 0; }
    .is-collapsed .rm-nav-link { justify-content: center; padding: 0; }
    .is-collapsed .rm-collapse-icon { transform: rotate(180deg); }
}

/* ---------- Mobile / tablet ---------- */
@media (max-width: 960px) {
    .rm-sidebar { position: fixed; left: 0; top: 0; width: 290px; transform: translateX(-100%); transition: transform .25s ease; box-shadow: var(--rm-shadow-lg); }
    .rm-sidebar-open { transform: translateX(0); }
    .rm-collapse-btn { display: none; }
    .rm-menu-btn, .rm-sidebar-close { display: grid; }
    .rm-topbar { padding: 0 16px; }
    .rm-net-banner { padding: 10px 16px; }
    .rm-main { padding: 20px 16px calc(96px + env(safe-area-inset-bottom, 0px)); }
    .rm-toast-stack { top: auto; right: 16px; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }

    .rm-bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px 6px calc(6px + env(safe-area-inset-bottom, 0px)); background: rgba(255, 255, 255, .96); backdrop-filter: blur(8px); border-top: 1px solid var(--rm-border); }
    .rm-bottom-nav-link { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 54px; border-radius: var(--rm-radius-md); color: var(--rm-muted); font-size: 11.5px; font-weight: 500; }
    .rm-bottom-nav-link svg { font-size: 18px; }
    .rm-bottom-nav-link.is-active { color: var(--rm-primary); font-weight: 600; background: var(--rm-primary-soft); }
}

@media (max-width: 420px) {
    .rm-availability-toggle { padding: 0 12px; }
}

@media (prefers-reduced-motion: reduce) {
    .rm-shell * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
`;