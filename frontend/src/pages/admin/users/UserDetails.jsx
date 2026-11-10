import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../../layouts/AdminLayout";
import { getUserDetails } from "../../../services/adminService";
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
const IconMail = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
    </svg>
);
const IconIdCard = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <circle cx="8" cy="11" r="2" />
        <path d="M6 16c.5-1.5 1.8-2 2-2s1.5.5 2 2M14 9h6M14 13h6" />
    </svg>
);
const IconWrench = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14.7 6.3a4 4 0 0 0-5.6 4.6L3 17l4 4 6.1-6.1a4 4 0 0 0 4.6-5.6l-2.5 2.5-3-3 2.5-2.5Z" />
    </svg>
);
const IconActivity = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

/* ============================================================
   HELPERS
   ============================================================ */

const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not available";

function RolePill({ role }) {
    const tone =
        role === "CUSTOMER" ? "mu-pill--role-customer" : role === "MECHANIC" ? "mu-pill--role-mechanic" : "mu-pill--role-default";
    return <span className={`mu-pill ${tone}`}>{role}</span>;
}

function ActivePill({ active }) {
    return (
        <span className={`mu-pill ${active ? "mu-pill--active" : "mu-pill--inactive"}`}>
            <span className="mu-pill__dot" />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function AvailabilityPill({ available }) {
    return (
        <span className={`mu-pill ${available ? "mu-pill--available" : "mu-pill--offline"}`}>
            <span className="mu-pill__dot" />
            {available ? "Available" : "Offline"}
        </span>
    );
}

function VerificationPill({ status }) {
    const tone = status === "APPROVED" ? "mu-pill--approved" : status === "REJECTED" ? "mu-pill--rejected" : "mu-pill--pending";
    return <span className={`mu-pill ${tone}`}>{status === "APPROVED" || status === "REJECTED" ? status : "PENDING"}</span>;
}

// The "Total Requests" tile is the only stat that navigates, so it is the
// only one built as an actual keyboard-operable control.
function StatTile({ label, value, tone, onClick, cta }) {
    const Tag = onClick ? "button" : "div";

    return (
        <Tag
            type={onClick ? "button" : undefined}
            className={`mu-stat-tile ${onClick ? "mu-stat-tile--link" : ""}`}
            onClick={onClick}
        >
            <span className="mu-stat-tile__label">{label}</span>
            <span className={`mu-stat-tile__value ${tone || ""}`}>{value ?? 0}</span>
            {cta && <span className="mu-stat-tile__cta">{cta}</span>}
        </Tag>
    );
}

function UserDetails() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const loadUser = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getUserDetails(userId);
            setUser(response.data);
        } catch (error) {
            console.error(error);
            setError(error.response?.data?.message || "Failed to load user profile.");
        } finally {
            setLoading(false);
        }
    };

    const getInitial = () => user?.fullName?.charAt(0)?.toUpperCase() || "?";
    const goToRequests = () => navigate(`/admin/users/${user.userId}/requests`);

    if (loading) {
        return (
            <AdminLayout>
                <div className="mu">
                    <div className="mu-loading">
                        <div className="mu-spinner" />
                        <p>Loading user profile...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (error || !user) {
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
                        <h2>Unable to load profile</h2>
                        <p>{error || "User not found."}</p>
                        <button className="mu-btn" onClick={loadUser}>
                            Try again
                        </button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const isMechanic = user.role === "MECHANIC";

    return (
        <AdminLayout>
            <div className="mu">
                {/* HEADER */}
                <div className="mu-head">
                    <button className="mu-back" onClick={() => navigate(-1)}>
                        <IconArrowLeft />
                        Back to users
                    </button>

                    <h1>User profile</h1>
                    <p>View account information and activity.</p>
                </div>

                {/* PROFILE HERO */}
                <div className="mu-hero">
                    <div className="mu-avatar">{getInitial()}</div>

                    <div>
                        <h2>{user.fullName}</h2>
                        <div className="mu-hero-meta">
                            <RolePill role={user.role} />
                            <ActivePill active={user.isActive} />
                            <span className="mu-userid">User #{user.userId}</span>
                        </div>
                    </div>
                </div>

                {/* CONTACT + ACCOUNT */}
                <div className="mu-info-grid">
                    <div className="mu-card">
                        <h3>
                            <IconMail />
                            Contact information
                        </h3>

                        <div className="mu-field">
                            <span className="mu-field-label">Email</span>
                            <div className="mu-field-value">{user.email}</div>
                        </div>

                        <div className="mu-field">
                            <span className="mu-field-label">Phone</span>
                            <div className={`mu-field-value ${!user.phone ? "mu-muted" : ""}`}>
                                {user.phone || "Not provided"}
                            </div>
                        </div>
                    </div>

                    <div className="mu-card">
                        <h3>
                            <IconIdCard />
                            Account information
                        </h3>

                        <div className="mu-field-grid">
                            <div className="mu-field">
                                <span className="mu-field-label">User ID</span>
                                <div className="mu-field-value">#{user.userId}</div>
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Role</span>
                                <div className="mu-field-value">{user.role}</div>
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Joined</span>
                                <div className="mu-field-value">{formatDate(user.createdAt)}</div>
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Last updated</span>
                                <div className="mu-field-value">{formatDate(user.updatedAt)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROLE-SPECIFIC INFORMATION */}
                {isMechanic && (
                    <div className="mu-card">
                        <h3>
                            <IconWrench />
                            Provider information
                        </h3>

                        <div className="mu-field-grid">
                            <div className="mu-field">
                                <span className="mu-field-label">Workshop</span>
                                <div className={`mu-field-value ${!user.workshopName ? "mu-muted" : ""}`}>
                                    {user.workshopName || "Not provided"}
                                </div>
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Workshop address</span>
                                <div className={`mu-field-value ${!user.workshopAddress ? "mu-muted" : ""}`}>
                                    {user.workshopAddress || "Not provided"}
                                </div>
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Contact number</span>
                                <div className={`mu-field-value ${!user.contactNumber ? "mu-muted" : ""}`}>
                                    {user.contactNumber || "Not provided"}
                                </div>
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Experience</span>
                                <div className={`mu-field-value ${user.experienceYears == null ? "mu-muted" : ""}`}>
                                    {user.experienceYears != null ? `${user.experienceYears} years` : "Not provided"}
                                </div>
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Verification</span>
                                <VerificationPill status={user.verificationStatus} />
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Availability</span>
                                <AvailabilityPill available={user.available} />
                            </div>

                            <div className="mu-field">
                                <span className="mu-field-label">Average rating</span>
                                <div className="mu-field-value">
                                    ⭐ {user.averageRating?.toFixed(1) || "0.0"} / 5
                                </div>
                            </div>
                        </div>

                        {user.verificationStatus === "REJECTED" && user.rejectionReason && (
                            <div className="mu-rejection">
                                <strong>Rejection reason: </strong>
                                {user.rejectionReason}
                            </div>
                        )}
                    </div>
                )}

                {/* ACTIVITY */}
                <div className="mu-card">
                    <h3>
                        <IconActivity />
                        {isMechanic ? "Service activity" : "Activity overview"}
                    </h3>

                    <div className="mu-activity-grid">
                        <StatTile
                            label="Total requests"
                            value={user.totalRequests}
                            onClick={goToRequests}
                            cta="View requests →"
                        />

                        <StatTile
                            label={isMechanic ? "Completed jobs" : "Completed"}
                            value={user.completedRequests}
                            tone="is-success"
                        />

                        <StatTile label="Cancelled" value={user.cancelledRequests} tone="is-danger" />
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export default UserDetails;