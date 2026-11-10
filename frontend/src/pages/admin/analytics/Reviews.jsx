import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getReviewComplaintAnalytics } from "../../../services/adminService";

function Reviews() {

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const data = await getReviewComplaintAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load review analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="text-center mt-5">
                    Loading reviews & complaints...
                </div>
            </AdminLayout>
        );
    }

    if (!analytics) {
        return (
            <AdminLayout>
                <div className="alert alert-danger">
                    Failed to load analytics.
                </div>
            </AdminLayout>
        );
    }

    const ratings = [5, 4, 3, 2, 1];

    return (
        <AdminLayout>

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 className="fw-bold mb-1">
                        Reviews & Complaints
                    </h2>

                    <p className="text-muted mb-0">
                        Monitor customer satisfaction and platform issues.
                    </p>
                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={() => window.history.back()}
                >
                    ← Back
                </button>

            </div>

            {/* KPI */}

            <div className="row g-4 mb-4">

                {[
                    ["Total Reviews", analytics.totalReviews, "⭐"],
                    ["Average Rating", analytics.averageRating.toFixed(1), "★"],
                    ["5-Star Reviews", analytics.fiveStarReviews, "👍"],
                    ["Low Ratings", analytics.lowRatingReviews, "⚠️"],
                    ["Total Complaints", analytics.totalComplaints, "📋"],
                    ["Open Complaints", analytics.openComplaints, "🔴"]
                ].map(([title, value, icon]) => (

                    <div className="col-md-6 col-xl-4" key={title}>

                        <div
                            className="card border-0 shadow-sm h-100"
                            style={{ borderRadius: "16px" }}
                        >

                            <div className="card-body">

                                <div className="d-flex justify-content-between">

                                    <div>
                                        <p className="text-muted mb-2">
                                            {title}
                                        </p>

                                        <h2 className="fw-bold mb-0">
                                            {value}
                                        </h2>
                                    </div>

                                    <span style={{ fontSize: "28px" }}>
                                        {icon}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>
                ))}

            </div>

            <div className="row g-4">

                {/* Rating Distribution */}

                <div className="col-lg-5">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius: "16px" }}
                    >

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                Rating Distribution
                            </h5>

                            {ratings.map((rating) => {

                                const count =
                                    analytics.ratingDistribution?.[rating] || 0;

                                const percentage =
                                    analytics.totalReviews > 0
                                        ? (count / analytics.totalReviews) * 100
                                        : 0;

                                return (
                                    <div className="mb-3" key={rating}>

                                        <div className="d-flex justify-content-between mb-1">

                                            <span>
                                                {rating} ★
                                            </span>

                                            <small className="text-muted">
                                                {count}
                                            </small>

                                        </div>

                                        <div
                                            className="progress"
                                            style={{ height: "8px" }}
                                        >
                                            <div
                                                className="progress-bar"
                                                style={{
                                                    width: `${percentage}%`
                                                }}
                                            />
                                        </div>

                                    </div>
                                );
                            })}

                        </div>

                    </div>

                </div>

                {/* Complaints */}

                <div className="col-lg-7">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius: "16px" }}
                    >

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                Recent Complaints
                            </h5>

                            {analytics.recentComplaints?.length === 0 ? (

                                <p className="text-muted">
                                    No complaints recorded.
                                </p>

                            ) : (

                                <div className="table-responsive">

                                    <table className="table align-middle">

                                        <thead>
                                        <tr>
                                            <th>Reason</th>
                                            <th>Status</th>
                                        </tr>
                                        </thead>

                                        <tbody>

                                        {analytics.recentComplaints.map(
                                            (complaint) => (

                                                <tr key={complaint.id}>

                                                    <td className="fw-semibold">
                                                        {complaint.subject}
                                                    </td>

                                                    <td>
                                                            <span className="badge bg-light text-dark">
                                                                {complaint.status}
                                                            </span>
                                                    </td>

                                                </tr>

                                            )
                                        )}

                                        </tbody>

                                    </table>

                                </div>

                            )}

                        </div>

                    </div>

                </div>

            </div>

        </AdminLayout>
    );
}

export default Reviews;