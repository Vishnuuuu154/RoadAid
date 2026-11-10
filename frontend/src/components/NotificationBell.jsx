import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    getMyNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../services/notificationService";
import {
    FaBell,
    FaCheckDouble,
    FaVolumeUp,
    FaVolumeMute,
    FaDesktop,
    FaCreditCard,
    FaMoneyBillWave,
    FaCarSide,
    FaCheckCircle,
    FaExclamationTriangle,
    FaComments,
    FaTimes,
    FaSyncAlt,
    FaArrowRight,
} from "react-icons/fa";
import "../styles/Bell.css";

/* =========================================
   CONFIG
========================================= */

const POLL_MS = 15000;
const TOAST_MS = 5000;
const DROPDOWN_LIMIT = 8;
const SOUND_KEY = "roadaid_notification_sound";

/* =========================================
   HELPERS
========================================= */

const readSoundPreference = () => {
    try {
        return localStorage.getItem(SOUND_KEY) !== "false";
    } catch {
        return true;
    }
};

const hasBrowserNotifications = () =>
    typeof window !== "undefined" && "Notification" in window;

/*
 * Picks an icon and colour for a notification from its wording.
 * Failures are checked first so "Payment failed" shows as a warning,
 * not as a successful payment.
 */
function getNotificationStyle(message = "") {
    const text = String(message).toLowerCase();

    if (
        text.includes("rejected") ||
        text.includes("cancelled") ||
        text.includes("canceled") ||
        text.includes("failed")
    ) {
        return { Icon: FaExclamationTriangle, tone: "danger" };
    }

    if (text.includes("message") || text.includes("chat")) {
        return { Icon: FaComments, tone: "primary" };
    }

    if (
        text.includes("payment") ||
        text.includes("paid") ||
        text.includes("cash")
    ) {
        return { Icon: FaCreditCard, tone: "success" };
    }

    if (text.includes("quotation") || text.includes("quote")) {
        return { Icon: FaMoneyBillWave, tone: "warning" };
    }

    if (text.includes("completed") || text.includes("complete")) {
        return { Icon: FaCheckCircle, tone: "success" };
    }

    if (
        text.includes("accepted") ||
        text.includes("assigned") ||
        text.includes("started") ||
        text.includes("request")
    ) {
        return { Icon: FaCarSide, tone: "primary" };
    }

    return { Icon: FaBell, tone: "primary" };
}

function formatNotificationTime(createdAt) {
    if (!createdAt) return "";

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";

    const diffSeconds = Math.max(
        0,
        Math.floor((Date.now() - date.getTime()) / 1000)
    );

    if (diffSeconds < 60) return "Just now";

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });
}

/* Today / Yesterday / Earlier */
function dayGroup(createdAt) {
    const date = new Date(createdAt);
    if (!createdAt || Number.isNaN(date.getTime())) return "Earlier";

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dayMs = 24 * 60 * 60 * 1000;
    const diff = startOfToday.getTime() - date.getTime();

    if (diff <= 0) return "Today";
    if (diff <= dayMs) return "Yesterday";
    return "Earlier";
}

const normalizeNotification = (notification) => ({
    ...notification,
    isRead: Boolean(
        notification.isRead ?? notification.read ?? notification.readStatus
    ),
});

const byNewest = (a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return tb - ta;
};

/* Loads the font once; shared with the dashboard. */
function useBellFont() {
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

/* =========================================
   COMPONENT
========================================= */

function NotificationBell({ notificationsPath = "/notifications" }) {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [actionError, setActionError] = useState("");
    const [markingAll, setMarkingAll] = useState(false);
    const [filter, setFilter] = useState("all");
    const [toast, setToast] = useState(null);
    const [ringing, setRinging] = useState(false);

    const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
    const [permission, setPermission] = useState(() =>
        hasBrowserNotifications() ? Notification.permission : "unsupported"
    );

    const wrapperRef = useRef(null);
    const buttonRef = useRef(null);
    const knownIds = useRef(new Set());
    const firstLoad = useRef(true);
    const audioContextRef = useRef(null);
    const toastTimer = useRef(null);
    const ringTimer = useRef(null);

    // Refs let the polling loop read the latest preferences
    // without restarting every time one changes.
    const soundRef = useRef(soundEnabled);
    const permissionRef = useRef(permission);

    useBellFont();

    useEffect(() => {
        soundRef.current = soundEnabled;
        try {
            localStorage.setItem(SOUND_KEY, String(soundEnabled));
        } catch {
            /* storage unavailable: the preference lasts for this session only */
        }
    }, [soundEnabled]);

    useEffect(() => {
        permissionRef.current = permission;
    }, [permission]);

    /* =========================================
       SOUND
    ========================================= */

    const getAudioContext = useCallback(() => {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!audioContextRef.current) {
            audioContextRef.current = new Ctx();
        }
        return audioContextRef.current;
    }, []);

    // Browsers block audio until the person has interacted with the page.
    // Unlock it on the first tap or key press so later alerts can be heard.
    useEffect(() => {
        const unlock = () => {
            try {
                const context = getAudioContext();
                if (context && context.state === "suspended") {
                    context.resume().catch(() => {});
                }
            } catch {
                /* audio unavailable */
            }
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, [getAudioContext]);

    const playSound = useCallback(() => {
        if (!soundRef.current) return;

        try {
            const context = getAudioContext();
            if (!context) return;

            if (context.state === "suspended") {
                context.resume().catch(() => {});
            }

            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const t = context.currentTime;

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, t);
            oscillator.frequency.exponentialRampToValueAtTime(660, t + 0.12);

            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(t + 0.2);
        } catch (error) {
            console.debug("Notification sound unavailable:", error);
        }
    }, [getAudioContext]);

    /* =========================================
       DESKTOP NOTIFICATIONS
    ========================================= */

    const enableBrowserNotifications = async () => {
        if (!hasBrowserNotifications()) return;
        if (Notification.permission !== "default") {
            setPermission(Notification.permission);
            return;
        }
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
        } catch (error) {
            console.debug("Browser notifications unavailable:", error);
        }
    };

    const showBrowserNotification = useCallback((notification) => {
        if (
            !hasBrowserNotifications() ||
            permissionRef.current !== "granted" ||
            document.visibilityState === "visible"
        ) {
            return;
        }
        try {
            new Notification("RoadAid", {
                body: notification.message,
                icon: "/favicon.ico",
                tag: `roadaid-notification-${notification.id}`,
            });
        } catch (error) {
            console.debug("Browser notification unavailable:", error);
        }
    }, []);

    /* =========================================
       LIVE TOAST + BELL RING
    ========================================= */

    const announce = useCallback((notification) => {
        setToast({ id: notification.id, message: notification.message });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);

        setRinging(true);
        clearTimeout(ringTimer.current);
        ringTimer.current = setTimeout(() => setRinging(false), 1200);
    }, []);

    useEffect(
        () => () => {
            clearTimeout(toastTimer.current);
            clearTimeout(ringTimer.current);
        },
        []
    );

    /* =========================================
       LOAD
    ========================================= */

    const loadNotifications = useCallback(async () => {
        try {
            const response = await getMyNotifications();
            const incoming = (Array.isArray(response.data) ? response.data : [])
                .map(normalizeNotification)
                .sort(byNewest);

            // Alert only for genuinely new, unread items, and never on the first load.
            if (!firstLoad.current) {
                const fresh = incoming.filter(
                    (n) => !knownIds.current.has(n.id) && !n.isRead
                );
                if (fresh.length > 0) {
                    playSound();
                    showBrowserNotification(fresh[0]);
                    announce(fresh[0]);
                }
            }

            knownIds.current = new Set(incoming.map((n) => n.id));
            firstLoad.current = false;

            setNotifications(incoming);
            setLoadFailed(false);
        } catch (error) {
            console.error("Failed to load notifications:", error);
            setLoadFailed(true);
        } finally {
            setLoading(false);
        }
    }, [announce, playSound, showBrowserNotification]);

    useEffect(() => {
        loadNotifications();

        const tick = () => {
            if (!document.hidden) loadNotifications();
        };
        const interval = setInterval(tick, POLL_MS);
        document.addEventListener("visibilitychange", tick);

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [loadNotifications]);

    /* =========================================
       CLOSE: outside click + Escape
    ========================================= */

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    /* =========================================
       ACTIONS
    ========================================= */

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications]
    );

    const setReadState = (ids, isRead) =>
        setNotifications((current) =>
            current.map((n) =>
                ids === "all" || ids.includes(n.id)
                    ? { ...n, isRead, read: isRead }
                    : n
            )
        );

    const handleNotificationClick = async (notification) => {
        setActionError("");

        // Optimistic: the dot disappears immediately, and returns if saving fails.
        if (!notification.isRead) {
            setReadState([notification.id], true);
            try {
                await markNotificationAsRead(notification.id);
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
                setReadState([notification.id], false);
                setActionError("Couldn't mark that as read. Please try again.");
                return;
            }
        }

        // If the backend says where this notification leads, go there.
        const target = notification.link || notification.url || notification.path;
        if (typeof target === "string" && target.startsWith("/")) {
            setOpen(false);
            navigate(target);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0 || markingAll) return;

        const previous = notifications;
        setMarkingAll(true);
        setActionError("");
        setReadState("all", true);

        try {
            await markAllNotificationsAsRead();
            await loadNotifications();
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
            setNotifications(previous);
            setActionError("Couldn't mark everything as read. Please try again.");
        } finally {
            setMarkingAll(false);
        }
    };

    const handleToggleOpen = () => {
        setOpen((value) => !value);
        setToast(null);
    };

    const handleToastOpen = () => {
        setToast(null);
        setOpen(true);
    };

    /* =========================================
       DERIVED LIST
    ========================================= */

    const visible = useMemo(() => {
        const list =
            filter === "unread"
                ? notifications.filter((n) => !n.isRead)
                : notifications;
        return list.slice(0, DROPDOWN_LIMIT);
    }, [notifications, filter]);

    const groups = useMemo(() => {
        const order = ["Today", "Yesterday", "Earlier"];
        const map = new Map(order.map((label) => [label, []]));
        visible.forEach((n) => map.get(dayGroup(n.createdAt)).push(n));
        return order
            .map((label) => ({ label, items: map.get(label) }))
            .filter((group) => group.items.length > 0);
    }, [visible]);

    const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

    const desktopLabel =
        permission === "granted"
            ? "Desktop alerts are on"
            : permission === "denied"
                ? "Desktop alerts are blocked in your browser settings"
                : "Turn on desktop alerts";

    const soundLabel = soundEnabled
        ? "Mute notification sounds"
        : "Turn on notification sounds";

    /* =========================================
       RENDER
    ========================================= */

    return (
        <div className="nb-root" ref={wrapperRef}>
            {/* ---------- Live toast ---------- */}
            {toast && (
                <div className="nb-toast" role="status" aria-live="polite">
                    <button
                        type="button"
                        className="nb-toast-main"
                        onClick={handleToastOpen}
                    >
                        {(() => {
                            const { Icon, tone } = getNotificationStyle(toast.message);
                            return (
                                <span className="nb-icon" data-tone={tone} aria-hidden="true">
                                    <Icon />
                                </span>
                            );
                        })()}
                        <span className="nb-toast-text">
                            <strong>New notification</strong>
                            <span>{toast.message}</span>
                        </span>
                    </button>
                    <button
                        type="button"
                        className="nb-toast-close"
                        onClick={() => setToast(null)}
                        aria-label="Dismiss notification"
                    >
                        <FaTimes aria-hidden="true" />
                    </button>
                </div>
            )}

            {/* ---------- Bell ---------- */}
            <button
                ref={buttonRef}
                type="button"
                className="nb-bell"
                data-ringing={ringing}
                onClick={handleToggleOpen}
                aria-label={
                    unreadCount > 0
                        ? `Notifications, ${unreadCount} unread`
                        : "Notifications"
                }
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="nb-panel"
            >
                <FaBell aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="nb-badge" aria-hidden="true">
                        {badgeText}
                    </span>
                )}
            </button>

            {/* ---------- Dropdown ---------- */}
            {open && (
                <>
                    <div className="nb-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
                    <section
                        id="nb-panel"
                        className="nb-panel"
                        role="dialog"
                        aria-label="Notifications"
                    >
                        <header className="nb-head">
                            <div className="nb-head-title">
                                <h2>Notifications</h2>
                                <p>
                                    {unreadCount > 0
                                        ? `${unreadCount} unread`
                                        : "You're all caught up"}
                                </p>
                            </div>

                            <div className="nb-head-tools">
                                <button
                                    type="button"
                                    className="nb-tool"
                                    onClick={() => setSoundEnabled((v) => !v)}
                                    aria-pressed={soundEnabled}
                                    aria-label={soundLabel}
                                    title={soundLabel}
                                >
                                    {soundEnabled ? (
                                        <FaVolumeUp aria-hidden="true" />
                                    ) : (
                                        <FaVolumeMute aria-hidden="true" />
                                    )}
                                </button>

                                {permission !== "unsupported" && (
                                    <button
                                        type="button"
                                        className="nb-tool"
                                        onClick={enableBrowserNotifications}
                                        aria-pressed={permission === "granted"}
                                        aria-label={desktopLabel}
                                        title={desktopLabel}
                                        disabled={permission === "denied"}
                                    >
                                        <FaDesktop aria-hidden="true" />
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="nb-tool"
                                    onClick={() => setOpen(false)}
                                    aria-label="Close notifications"
                                    title="Close"
                                >
                                    <FaTimes aria-hidden="true" />
                                </button>
                            </div>
                        </header>

                        <div className="nb-subbar">
                            <div className="nb-filters" role="group" aria-label="Show">
                                <button
                                    type="button"
                                    className="nb-filter"
                                    aria-pressed={filter === "all"}
                                    onClick={() => setFilter("all")}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    className="nb-filter"
                                    aria-pressed={filter === "unread"}
                                    onClick={() => setFilter("unread")}
                                >
                                    Unread
                                    {unreadCount > 0 && (
                                        <span className="nb-filter-count">{unreadCount}</span>
                                    )}
                                </button>
                            </div>

                            <button
                                type="button"
                                className="nb-markall"
                                onClick={handleMarkAllAsRead}
                                disabled={unreadCount === 0 || markingAll}
                            >
                                {markingAll ? (
                                    <span className="nb-spinner" aria-hidden="true" />
                                ) : (
                                    <FaCheckDouble aria-hidden="true" />
                                )}
                                {markingAll ? "Marking…" : "Mark all read"}
                            </button>
                        </div>

                        {actionError && (
                            <p className="nb-error" role="alert">
                                <FaExclamationTriangle aria-hidden="true" /> {actionError}
                            </p>
                        )}

                        <div className="nb-body">
                            {loading ? (
                                <div className="nb-state" aria-busy="true">
                                    <span className="nb-spinner nb-spinner-lg" aria-hidden="true" />
                                    <p>Loading…</p>
                                </div>
                            ) : loadFailed && notifications.length === 0 ? (
                                <div className="nb-state">
                                    <span className="nb-state-icon" data-tone="danger">
                                        <FaExclamationTriangle aria-hidden="true" />
                                    </span>
                                    <p className="nb-state-title">Couldn't load notifications</p>
                                    <p>Check your connection and try again.</p>
                                    <button
                                        type="button"
                                        className="nb-retry"
                                        onClick={() => {
                                            setLoading(true);
                                            loadNotifications();
                                        }}
                                    >
                                        <FaSyncAlt aria-hidden="true" /> Try again
                                    </button>
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="nb-state">
                                    <span className="nb-state-icon">
                                        <FaBell aria-hidden="true" />
                                    </span>
                                    <p className="nb-state-title">
                                        {filter === "unread"
                                            ? "No unread notifications"
                                            : "No notifications yet"}
                                    </p>
                                    <p>
                                        {filter === "unread"
                                            ? "Everything has been read."
                                            : "Updates about your requests and payments will appear here."}
                                    </p>
                                </div>
                            ) : (
                                groups.map((group) => (
                                    <div className="nb-group" key={group.label}>
                                        <h3 className="nb-group-label">{group.label}</h3>
                                        <ul className="nb-list">
                                            {group.items.map((notification) => {
                                                const { Icon, tone } = getNotificationStyle(
                                                    notification.message
                                                );
                                                return (
                                                    <li key={notification.id}>
                                                        <button
                                                            type="button"
                                                            className="nb-item"
                                                            data-unread={!notification.isRead}
                                                            onClick={() =>
                                                                handleNotificationClick(notification)
                                                            }
                                                        >
                                                            <span
                                                                className="nb-icon"
                                                                data-tone={tone}
                                                                aria-hidden="true"
                                                            >
                                                                <Icon />
                                                            </span>
                                                            <span className="nb-item-text">
                                                                {!notification.isRead && (
                                                                    <span className="nb-sr">Unread: </span>
                                                                )}
                                                                <span className="nb-item-message">
                                                                    {notification.message}
                                                                </span>
                                                                <span className="nb-item-time">
                                                                    {formatNotificationTime(
                                                                        notification.createdAt
                                                                    )}
                                                                </span>
                                                            </span>
                                                            {!notification.isRead && (
                                                                <span className="nb-dot" aria-hidden="true" />
                                                            )}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))
                            )}
                        </div>

                        <footer className="nb-foot">
                            <Link
                                to={notificationsPath}
                                className="nb-viewall"
                                onClick={() => setOpen(false)}
                            >
                                View all notifications <FaArrowRight aria-hidden="true" />
                            </Link>
                        </footer>
                    </section>
                </>
            )}
        </div>
    );
}

export default NotificationBell;