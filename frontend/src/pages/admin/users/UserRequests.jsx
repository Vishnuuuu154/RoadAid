import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../../layouts/AdminLayout";
import { getUserRequests, getUserDetails } from "../../../services/adminService";
import "../../../styles/adminuserdetails.css";

/* ============================================================
   ICONS
   ============================================================ */

const IconArrowLeft = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);
const IconAlert = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
);
const IconInbox = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
);

/* ============================================================
   HELPERS
   ============================================================ */

const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not available";

const STATUS_TONES = {
    PENDING: "mu-status-pill--warning",
    WAITING_FOR_QUOTATION: "mu-status-pill--info",
    QUOTATION_PENDING: "mu-status-pill--info",
    IN_PROGRESS: "mu-status-pill--info",
    COMPLETED: "mu-status-pill--success",
    CLOSED: "mu-status-pill--neutral",
    CANCELLED: "mu-status-pill--danger",
};

function StatusPill({ status }) {
    const tone = STATUS_TONES[status] || "mu-status-pill--neutral";
    return <span className={`mu-status-pill ${tone}`}>{status?.replace(/_/g, " ") || "Unknown"}</span>;
}

function SkeletonRows({ count = 6 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <tr key={i} className="mu-row mu-row--skeleton">
                    <td colSpan={7}>
                        <div className="mu-skeleton-line" />
                    </td>
                </tr>
            ))}
        </>
    );
}

function UserRequests() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const [userResponse, requestsResponse] = await Promise.all([getUserDetails(userId), getUserRequests(userId)]);

            setUser(userResponse.data);
            setRequests(requestsResponse.data);
        } catch (error) {
            console.error(error);
            setError(error.response?.data?.message || "Failed to load user requests.");
        } finally {
            setLoading(false);
        }
    };

    const goToRequest = (requestId) => navigate(`/admin/requests/${requestId}`);

    const handleRowKeyDown = (event, requestId) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goToRequest(requestId);
        }
    };

    if (error) {
        return (
            <AdminLayout>
                <div className="mu">
                    <button className="mu-back" onClick={() => navigate(-1)}>
                        <IconArrowLeft />
                        Back
                    </button>

                    <div className="mu-error-card">
                        <div className="mu-error-icon">
                            <IconAlert />
                        </div>
                        <h2>Unable to load requests</h2>
                        <p>{error}</p>
                        <button className="mu-btn" onClick={loadData}>
                            Try again
                        </button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="mu">
                {/* HEADER */}
                <div className="mu-head">
                    <button className="mu-back" onClick={() => navigate(-1)}>
                        <IconArrowLeft />
                        Back to user profile
                    </button>

                    <div className="mu-head-row">
                        <div>
                            <h1>{loading ? "Loading..." : `${user?.fullName || "User"}'s requests`}</h1>
                            <p>View all service requests associated with this user.</p>
                        </div>

                        <div className="mu-total-badge">
                            <span>Total requests</span>
                            <span>{loading ? "—" : requests.length}</span>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="mu-table-card">
                    {!loading && requests.length === 0 ? (
                        <div className="mu-empty">
                            <IconInbox />
                            <h3>No requests found</h3>
                            <p>This user has no service requests yet.</p>
                        </div>
                    ) : (
                        <div className="mu-scroll">
                            <table className="mu-table">
                                <thead>
                                <tr>
                                    <th>Request ID</th>
                                    <th>Vehicle</th>
                                    <th>Issue</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th className="is-end">Action</th>
                                </tr>
                                </thead>

                                <tbody>
                                {loading ? (
                                    <SkeletonRows />
                                ) : (
                                    requests.map((request) => (
                                        <tr
                                            key={request.id}
                                            className="mu-row"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => goToRequest(request.id)}
                                            onKeyDown={(event) => handleRowKeyDown(event, request.id)}
                                        >
                                            <td data-label="Request ID">
                                                <span className="mu-req-id">#{request.id}</span>
                                            </td>

                                            <td data-label="Vehicle">
                                                {request.vehicle?.registrationNumber || request.vehicle?.vehicleNumber || "N/A"}
                                            </td>

                                            <td data-label="Issue">
                                                <span className="mu-ellipsis">{request.issueDescription || "No description"}</span>
                                            </td>

                                            <td data-label="Location">
                                                <span className="mu-ellipsis">{request.location || "N/A"}</span>
                                            </td>

                                            <td data-label="Status">
                                                <StatusPill status={request.status} />
                                            </td>

                                            <td data-label="Created">
                                                <span className="mu-date">{formatDate(request.createdAt)}</span>
                                            </td>

                                            <td data-label="Action" className="mu-action-cell">
                                                <button
                                                    className="mu-view-btn"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        goToRequest(request.id);
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

export default UserRequests;