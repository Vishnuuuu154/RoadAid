import { useEffect, useState } from "react";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function Reviews() {

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await api.get("/reviews/my");

            setReviews(response.data);

        } catch (error) {

            console.error("Failed to load reviews:", error);

            setError(
                error.response?.data?.message ||
                "Failed to load your reviews."
            );

        } finally {

            setLoading(false);

        }
    };

    const renderStars = (rating) => {

        return (
            <span className="text-warning fs-5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star}>
                        {star <= rating ? "★" : "☆"}
                    </span>
                ))}
            </span>
        );
    };

    return (

        <CustomerLayout>

            <div className="mb-4">

                <h2 className="fw-bold mb-1">
                    ⭐ My Reviews
                </h2>

                <p className="text-muted">
                    Reviews you have submitted for RoadAid service providers.
                </p>

            </div>


            {loading && (

                <div className="card shadow-sm border-0">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading your reviews...
                        </p>

                    </div>

                </div>

            )}


            {!loading && error && (

                <div className="alert alert-danger">
                    {error}
                </div>

            )}


            {!loading && !error && reviews.length === 0 && (

                <div className="card shadow-sm border-0">

                    <div className="card-body text-center py-5">

                        <div className="fs-1 mb-3">
                            ⭐
                        </div>

                        <h5 className="fw-bold">
                            No Reviews Yet
                        </h5>

                        <p className="text-muted mb-0">
                            You haven't submitted any reviews yet.
                            Complete a service and share your experience.
                        </p>

                    </div>

                </div>

            )}


            {!loading && !error && reviews.length > 0 && (

                <div className="row g-4">

                    {reviews.map((review) => (

                        <div
                            className="col-md-6"
                            key={review.id}
                        >

                            <div className="card shadow-sm border-0 h-100">

                                <div className="card-body p-4">

                                    <div className="d-flex justify-content-between align-items-start mb-3">

                                        <div>

                                            <h5 className="fw-bold mb-1">
                                                {review.mechanic?.user?.fullName ||
                                                    "Mechanic"}
                                            </h5>

                                            <small className="text-muted">
                                                Request #
                                                {review.serviceRequest?.requestId ||
                                                    review.serviceRequest?.id ||
                                                    "-"}
                                            </small>

                                        </div>

                                        {renderStars(review.rating)}

                                    </div>


                                    <div className="border rounded p-3 bg-light mb-3">

                                        <p className="mb-0">
                                            {review.comment ||
                                                "No written comment provided."}
                                        </p>

                                    </div>


                                    <small className="text-muted">

                                        {review.createdAt
                                            ? new Date(
                                                review.createdAt
                                            ).toLocaleDateString()
                                            : "-"}

                                    </small>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </CustomerLayout>

    );
}

export default Reviews;