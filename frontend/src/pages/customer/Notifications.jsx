import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";
import { markAllNotificationsAsRead } from "../../services/notificationService";
import "../../styles/Notifications.css";

const POLL_INTERVAL_MS = 15000;

const NOTIFICATION_STYLES = [
    {
        match: ["payment", "paid", "cash"],
        icon: "💳",
        tone: "success"
    },
    {
        match: ["quotation", "quote"],
        icon: "💰",
        tone: "warning"
    },
    {
        match: ["accepted", "assigned", "started"],
        icon: "🚗",
        tone: "accent"
    },
    {
        match: ["completed", "complete"],
        icon: "✅",
        tone: "success"
    },
    {
        match: ["rejected", "cancelled", "failed"],
        icon: "⚠️",
        tone: "danger"
    }
];

const DEFAULT_STYLE = { icon: "🔔", tone: "accent" };

function getNotificationStyle(message = "") {
    const text = message.toLowerCase();
    const matched = NOTIFICATION_STYLES.find((entry) =>
        entry.match.some((keyword) => text.includes(keyword))
    );
    return matched || DEFAULT_STYLE;
}

function formatNotificationTime(createdAt) {
    if (!createdAt) return "";

    const date = new Date(createdAt);
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

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

    return date.toLocaleDateString();
}

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // "all" | "unread"

    useEffect(() => {
        loadNotifications(true);

        const interval = setInterval(() => {
            loadNotifications(false);
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, []);

    const loadNotifications = async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            setError("");

            const response = await api.get("/notifications");
            setNotifications(response.data);
        } catch (err) {
            console.error("Failed to load notifications:", err);
            setError(
                err.response?.data?.message || "Failed to load notifications."
            );
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.id === id
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications((previous) =>
                previous.filter((notification) => notification.id !== id)
            );
        } catch (err) {
            console.error("Failed to delete notification:", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await markAllNotificationsAsRead();
            setNotifications((previous) =>
                previous.map((notification) => ({ ...notification, isRead: true }))
            );
        } catch (err) {
            console.error("Failed to mark all notifications as read:", err);
        }
    };

    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.isRead).length,
        [notifications]
    );

    const visibleNotifications = useMemo(() => {
        if (filter === "unread") {
            return notifications.filter((n) => !n.isRead);
        }
        return notifications;
    }, [notifications, filter]);

    return (
        <CustomerLayout>
            <div className="notif-page">
                <header className="notif-header">
                    <div>
                        <h2 className="notif-title">Notifications</h2>
                        <p className="notif-subtitle">
                            Updates on your RoadAid requests and services.
                        </p>
                    </div>

                    <div className="notif-header-actions">
            <span className="notif-count">
              {unreadCount} unread
            </span>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                className="notif-mark-all"
                                onClick={markAllAsRead}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                </header>

                <div className="notif-tabs" role="tablist" aria-label="Filter notifications">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filter === "all"}
                        className="notif-tab"
                        onClick={() => setFilter("all")}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filter === "unread"}
                        className="notif-tab"
                        onClick={() => setFilter("unread")}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>

                <div aria-live="polite">
                    {loading && (
                        <div className="notif-state">
                            <div className="notif-spinner" role="status" aria-label="Loading" />
                            <p className="notif-state-body">Loading notifications…</p>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="notif-error" role="alert">
                            <span>{error}</span>
                            <button
                                type="button"
                                className="notif-retry"
                                onClick={() => loadNotifications(true)}
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!loading && !error && visibleNotifications.length === 0 && (
                        <div className="notif-state">
                            <div className="notif-state-icon">🔔</div>
                            <p className="notif-state-title">
                                {filter === "unread" ? "You're all caught up" : "No notifications yet"}
                            </p>
                            <p className="notif-state-body">
                                {filter === "unread"
                                    ? "There's nothing new to read right now."
                                    : "We'll let you know as soon as something happens."}
                            </p>
                        </div>
                    )}

                    {!loading && !error && visibleNotifications.length > 0 && (
                        <ul className="notif-list">
                            {visibleNotifications.map((notification) => {
                                const style = getNotificationStyle(notification.message);

                                return (
                                    <li
                                        key={notification.id}
                                        className={`notif-row ${
                                            notification.isRead ? "" : "notif-row--unread"
                                        }`}
                                    >
                                        <div className={`notif-icon notif-icon--${style.tone}`}>
                                            {style.icon}
                                        </div>

                                        <div className="notif-body">
                                            <p className="notif-message">{notification.message}</p>
                                            <span className="notif-time">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                                        </div>

                                        {!notification.isRead && (
                                            <span
                                                className="notif-dot"
                                                aria-label="Unread"
                                                title="Unread"
                                            />
                                        )}

                                        <div className="notif-actions">
                                            {!notification.isRead && (
                                                <button
                                                    type="button"
                                                    className="notif-action notif-action--read"
                                                    onClick={() => markAsRead(notification.id)}
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="notif-action notif-action--delete"
                                                onClick={() => deleteNotification(notification.id)}
                                                aria-label="Delete notification"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}

export default Notifications;