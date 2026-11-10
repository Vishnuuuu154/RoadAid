import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { getMechanicDetails, getMechanicRequests, getMechanicReviews } from "../../services/adminService";
import "../../styles/adminmechanicdetails.css";

/* ============================================================
   ICONS
   ============================================================ */

const IconArrowLeft = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);
const IconStar = (props) => (
    <svg viewBox="0 0 24 24" {...props}>
        <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 17.3l-5.8 3.2 1.1-6.5-4.8-4.6 6.6-.9Z" />
    </svg>
);
const IconClipboard = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
        <path d="M9 12h6M9 16h6" />
    </svg>
);

/* ============================================================
   HELPERS
   ============================================================ */

const REQUEST_STATUS_META = {
    COMPLETED: { tone: "mdet-status-pill--success" },
    CLOSED: { tone: "mdet-status-pill--success" },
    CANCELLED: { tone: "mdet-status-pill--danger" },
    IN_PROGRESS: { tone: "mdet-status-pill--info" }
};

const getRequestStatusTone = (status) => REQUEST_STATUS_META[status]?.tone || "mdet-status-pill--warning";

const formatDate = (date) => (date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// Clamps to 0-5 and guards against null/undefined/NaN, since String.repeat()
// throws on a non-finite count.
function StarRating({ value }) {
    const rating = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));

    return (
        <span className="mdet-stars" role="img" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <IconStar key={i} className={i <= rating ? "on" : ""} aria-hidden="true" />
            ))}
        </span>
    );
}

function AvailabilityPill({ available }) {
    return (
        <span className={`mdet-pill ${available ? "mdet-pill--available" : "mdet-pill--offline"}`}>
            <span className="mdet-pill__dot" />
            {available ? "Available" : "Offline"}
        </span>
    );
}

function MechanicDetails() {
    const { mechanicId } = useParams();
    const navigate = useNavigate();

    const [mechanic, setMechanic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [requests, setRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    useEffect(() => {
        loadMechanic();
        loadMechanicRequests();
        loadMechanicReviews();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mechanicId]);

    const loadMechanic = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getMechanicDetails(mechanicId);
            setMechanic(response.data);
        } catch (error) {
            console.error("Failed to load mechanic:", error);
            setError(error.response?.data?.message || "Failed to load mechanic details.");
        } finally {
            setLoading(false);
        }
    };

    const loadMechanicReviews = async () => {
        try {
            setReviewsLoading(true);
            const response = await getMechanicReviews(mechanicId);
            setReviews(response.data);
        } catch (error) {
            console.error("Failed to load mechanic reviews:", error);
        } finally {
            setReviewsLoading(false);
        }
    };

    const loadMechanicRequests = async () => {
        try {
            setRequestsLoading(true);
            const response = await getMechanicRequests(mechanicId);
            setRequests(response.data);
        } catch (error) {
            console.error("Failed to load mechanic requests:", error);
        } finally {
            setRequestsLoading(false);
        }
    };

    const goToRequest = (id) => navigate(`/admin/requests/${id}`);
    const goToMechanics = () => navigate("/admin/mechanics");

    const handleRowKeyDown = (event, id) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goToRequest(id);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="mdet">
                    <div className="mdet-loading">
                        <div className="mdet-spinner" />
                        <p>Loading mechanic details...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error || !mechanic) {
        return (
            <AdminLayout>
                <div className="mdet">
                    <button className="mdet-back" onClick={goToMechanics}>
                        <IconArrowLeft />
                        Back to mechanics
                    </button>

                    <div className="mdet-error" role="alert">
                        {error || "Mechanic not found."}
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const averageRating = mechanic.averageRating ? Number(mechanic.averageRating).toFixed(1) : "0.0";

    return (
        <AdminLayout>
            <div className="mdet">
                {/* BACK */}
                <button className="mdet-back" onClick={goToMechanics}>
                    <IconArrowLeft />
                    Back to mechanics
                </button>

                {/* PROFILE HEADER */}
                <div className="mdet-profile">
                    <div className="mdet-identity">
                        <div className="mdet-avatar">{mechanic.fullName?.charAt(0)?.toUpperCase() || "?"}</div>
                        <div>
                            <h1>{mechanic.fullName}</h1>
                            <p>{mechanic.workshopName}</p>
                            <small>Mechanic #{mechanic.mechanicId}</small>
                        </div>
                    </div>

                    <AvailabilityPill available={mechanic.available} />
                </div>

                {/* STATISTICS */}
                <div className="mdet-stats">
                    <div className="mdet-stat">
                        <div className="mdet-stat__label">Total requests</div>
                        <div className="mdet-stat__value">{mechanic.totalRequests ?? 0}</div>
                    </div>

                    <div className="mdet-stat">
                        <div className="mdet-stat__label">Completed requests</div>
                        <div className="mdet-stat__value is-success">{mechanic.completedRequests ?? 0}</div>
                    </div>

                    <div className="mdet-stat">
                        <div className="mdet-stat__label">Average rating</div>
                        <div className="mdet-stat__value is-warning">
                            <IconStar fill="currentColor" />
                            {averageRating}
                        </div>
                    </div>

                    <div className="mdet-stat">
                        <div className="mdet-stat__label">Experience</div>
                        <div className="mdet-stat__value">
                            {mechanic.experienceYears ?? "—"}
                            <span className="mdet-stat__unit">years</span>
                        </div>
                    </div>
                </div>

                {/* DETAILS */}
                <div className="mdet-info-grid">
                    {/* CONTACT */}
                    <div className="mdet-card">
                        <h2>Contact information</h2>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Full name</span>
                            <div className="mdet-field-value">{mechanic.fullName}</div>
                        </div>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Email</span>
                            <div className={`mdet-field-value ${!mechanic.email ? "mdet-muted" : ""}`}>
                                {mechanic.email || "Not available"}
                            </div>
                        </div>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Phone</span>
                            <div className={`mdet-field-value ${!mechanic.phone ? "mdet-muted" : ""}`}>
                                {mechanic.phone || "Not available"}
                            </div>
                        </div>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Mechanic contact</span>
                            <div className={`mdet-field-value ${!mechanic.contactNumber ? "mdet-muted" : ""}`}>
                                {mechanic.contactNumber || "Not available"}
                            </div>
                        </div>
                    </div>

                    {/* WORKSHOP */}
                    <div className="mdet-card">
                        <h2>Workshop information</h2>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Workshop</span>
                            <div className="mdet-field-value">{mechanic.workshopName}</div>
                        </div>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Address</span>
                            <div className="mdet-field-value">{mechanic.workshopAddress}</div>
                        </div>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Experience</span>
                            <div className="mdet-field-value">{mechanic.experienceYears} years</div>
                        </div>

                        <div className="mdet-field">
                            <span className="mdet-field-label">Current availability</span>
                            <AvailabilityPill available={mechanic.available} />
                        </div>
                    </div>
                </div>

                {/* SERVICE HISTORY */}
                <div className="mdet-section">
                    <div className="mdet-section__head">
                        <div>
                            <h2>Service history</h2>
                            <p>Requests handled by this mechanic</p>
                        </div>
                        <span className="mdet-count">{requests.length} requests</span>
                    </div>

                    {requestsLoading ? (
                        Array.from({ length: 3 }, (_, i) => (
                            <div className="mdet-skel-row" key={i}>
                                {Array.from({ length: 6 }, (_, j) => (
                                    <div className="mdet-skel" key={j} />
                                ))}
                            </div>
                        ))
                    ) : requests.length === 0 ? (
                        <div className="mdet-empty">
                            <IconClipboard />
                            <p>No service requests found.</p>
                        </div>
                    ) : (
                        <div className="mdet-scroll">
                            <table className="mdet-table">
                                <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Customer</th>
                                    <th>Vehicle</th>
                                    <th>Issue</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                                </thead>
                                <tbody>
                                {requests.map((request) => (
                                    <tr
                                        key={request.requestId}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => goToRequest(request.requestId)}
                                        onKeyDown={(e) => handleRowKeyDown(e, request.requestId)}
                                    >
                                        <td className="mdet-req-id">#{request.requestId}</td>
                                        <td>{request.customerName}</td>
                                        <td>{request.vehicle}</td>
                                        <td>
                                                <span className="mdet-issue" title={request.issue}>
                                                    {request.issue}
                                                </span>
                                        </td>
                                        <td>
                                                <span className={`mdet-status-pill ${getRequestStatusTone(request.status)}`}>
                                                    {request.status}
                                                </span>
                                        </td>
                                        <td className="mdet-date">{formatDate(request.createdAt)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* REVIEWS */}
                <div className="mdet-section">
                    <div className="mdet-section__head">
                        <div>
                            <h2>Customer reviews</h2>
                            <p>Feedback received from customers</p>
                        </div>
                        <span className="mdet-count">
                            <IconStar fill="currentColor" />
                            {reviews.length} reviews
                        </span>
                    </div>

                    {reviewsLoading ? (
                        Array.from({ length: 2 }, (_, i) => (
                            <div className="mdet-skel-row" key={i}>
                                <div className="mdet-skel" />
                                <div className="mdet-skel" />
                            </div>
                        ))
                    ) : reviews.length === 0 ? (
                        <div className="mdet-empty">
                            <IconStar fill="none" stroke="currentColor" strokeWidth="1.5" />
                            <p>No customer reviews yet.</p>
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <div key={review.reviewId} className="mdet-review">
                                <div className="mdet-review__top">
                                    <div>
                                        <div className="mdet-review__customer">{review.customerName}</div>
                                        <div className="mdet-review__request">Request #{review.requestId}</div>
                                    </div>
                                    <StarRating value={review.rating} />
                                </div>

                                {review.comment && <p className="mdet-review__comment">"{review.comment}"</p>}

                                <div className="mdet-review__date">{formatDate(review.createdAt)}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

export default MechanicDetails;