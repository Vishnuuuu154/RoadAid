import { useEffect, useState } from "react";
import MechanicLayout from "../../layouts/MechanicLayout";
import api from "../../services/api";

function Notifications() {

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await api.get("/notifications");

            setNotifications(response.data);

        } catch (error) {

            console.error(
                "Failed to load notifications:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load notifications."
            );

        } finally {

            setLoading(false);

        }
    };

    const markAsRead = async (id) => {

        try {

            await api.put(`/notifications/${id}/read`);

            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.id === id
                        ? {
                            ...notification,
                            read: true
                        }
                        : notification
                )
            );

        } catch (error) {

            console.error(
                "Failed to mark notification as read:",
                error
            );

        }
    };

    const deleteNotification = async (id) => {

        try {

            await api.delete(`/notifications/${id}`);

            setNotifications((previous) =>
                previous.filter(
                    (notification) =>
                        notification.id !== id
                )
            );

        } catch (error) {

            console.error(
                "Failed to delete notification:",
                error
            );

        }
    };

    return (

        <MechanicLayout>

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 className="fw-bold mb-1">
                        🔔 Notifications
                    </h2>

                    <p className="text-muted mb-0">
                        Stay updated about your RoadAid service requests.
                    </p>
                </div>

                <span className="badge bg-primary">
                    {
                        notifications.filter(
                            (notification) => !notification.read
                        ).length
                    } unread
                </span>

            </div>


            {loading && (

                <div className="card shadow-sm border-0">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading notifications...
                        </p>

                    </div>

                </div>

            )}


            {!loading && error && (

                <div className="alert alert-danger">
                    {error}
                </div>

            )}


            {!loading &&
                !error &&
                notifications.length === 0 && (

                    <div className="card shadow-sm border-0">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                🔔
                            </div>

                            <h5 className="fw-bold">
                                No Notifications
                            </h5>

                            <p className="text-muted mb-0">
                                You're all caught up!
                            </p>

                        </div>

                    </div>

                )}


            {!loading &&
                !error &&
                notifications.length > 0 && (

                    <div className="d-flex flex-column gap-3">

                        {notifications.map((notification) => (

                            <div
                                key={notification.id}
                                className={`card border-0 shadow-sm ${
                                    notification.read
                                        ? ""
                                        : "border-start border-primary border-4"
                                }`}
                            >

                                <div className="card-body p-4">

                                    <div className="d-flex justify-content-between align-items-start">

                                        <div className="d-flex gap-3">

                                            <div className="fs-4">
                                                {notification.read
                                                    ? "🔔"
                                                    : "🔵"}
                                            </div>

                                            <div>

                                                <p
                                                    className={`mb-1 ${
                                                        notification.read
                                                            ? ""
                                                            : "fw-bold"
                                                    }`}
                                                >
                                                    {notification.message}
                                                </p>

                                                <small className="text-muted">

                                                    {notification.createdAt
                                                        ? new Date(
                                                            notification.createdAt
                                                        ).toLocaleString()
                                                        : ""}

                                                </small>

                                            </div>

                                        </div>


                                        <div className="d-flex gap-2">

                                            {!notification.read && (

                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() =>
                                                        markAsRead(
                                                            notification.id
                                                        )
                                                    }
                                                >
                                                    ✓ Mark Read
                                                </button>

                                            )}

                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() =>
                                                    deleteNotification(
                                                        notification.id
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

        </MechanicLayout>

    );
}

export default Notifications;