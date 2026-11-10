import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function Reviews() {
    const navigate = useNavigate();

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Interactive controls
    const [ratingFilter, setRatingFilter] = useState(0); // 0 = all
    const [sortMode, setSortMode] = useState("newest"); // "newest" | "highest" | "lowest"
    const [query, setQuery] = useState("");

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/reviews/my");

            setReviews(Array.isArray(response.data) ? response.data : []);
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

    const renderStars = (rating = 0, size = "1.15rem") => {
        const numericRating = Number(rating) || 0;

        return (
            <span
                className="text-warning"
                aria-label={`${numericRating} out of 5 stars`}
                style={{ letterSpacing: "2px", fontSize: size }}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star}>
                        {star <= numericRating ? "★" : "☆"}
                    </span>
                ))}
            </span>
        );
    };

    const getRequestId = (review) => {
        return (
            review?.serviceRequest?.requestId ||
            review?.serviceRequest?.id ||
            review?.requestId ||
            review?.request?.requestId ||
            review?.request?.id ||
            null
        );
    };

    const getProviderName = (review) => {
        return (
            review?.mechanic?.user?.fullName ||
            review?.serviceProvider?.user?.fullName ||
            review?.provider?.user?.fullName ||
            review?.mechanicName ||
            "RoadAid Service Provider"
        );
    };

    const formatDate = (date) => {
        if (!date) {
            return "Date unavailable";
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const handleReviewClick = (review) => {
        const requestId = getRequestId(review);

        if (requestId) {
            navigate(`/customer/requests/${requestId}`);
        }
    };

    const handleReviewKeyDown = (event, review) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleReviewClick(review);
        }
    };

    // --- Derived data -------------------------------------------------

    const ratingCounts = useMemo(() => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach((r) => {
            const rating = Math.round(Number(r.rating) || 0);
            if (counts[rating] !== undefined) counts[rating] += 1;
        });
        return counts;
    }, [reviews]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const total = reviews.reduce(
            (sum, r) => sum + (Number(r.rating) || 0),
            0
        );
        return total / reviews.length;
    }, [reviews]);

    const visibleReviews = useMemo(() => {
        let list = [...reviews];

        if (ratingFilter > 0) {
            list = list.filter(
                (r) => Math.round(Number(r.rating) || 0) === ratingFilter
            );
        }

        if (query.trim()) {
            const q = query.trim().toLowerCase();
            list = list.filter((r) =>
                (r.comment || "").toLowerCase().includes(q) ||
                getProviderName(r).toLowerCase().includes(q)
            );
        }

        list.sort((a, b) => {
            if (sortMode === "highest") {
                return (Number(b.rating) || 0) - (Number(a.rating) || 0);
            }
            if (sortMode === "lowest") {
                return (Number(a.rating) || 0) - (Number(b.rating) || 0);
            }
            // newest first (default)
            return (
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime()
            );
        });

        return list;
    }, [reviews, ratingFilter, sortMode, query]);

    const hasActiveFilters = ratingFilter > 0 || query.trim().length > 0;

    return (
        <CustomerLayout>
            <style>{`
                .reviews-page .stat-card {
                    background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
                    color: #fff;
                    border-radius: 16px;
                }
                .reviews-page .rating-bar-track {
                    height: 6px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.25);
                    overflow: hidden;
                }
                .reviews-page .rating-bar-fill {
                    height: 100%;
                    background: #ffc107;
                    border-radius: 999px;
                    transition: width 0.5s ease;
                }
                .reviews-page .filter-chip {
                    border: 1px solid #dee2e6;
                    background: #fff;
                    border-radius: 999px;
                    padding: 0.35rem 0.9rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #495057;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    white-space: nowrap;
                }
                .reviews-page .filter-chip:hover {
                    border-color: #0d6efd;
                    color: #0d6efd;
                }
                .reviews-page .filter-chip.active {
                    background: #0d6efd;
                    border-color: #0d6efd;
                    color: #fff;
                }
                .reviews-page .sort-toggle button {
                    border: 1px solid #dee2e6;
                    background: #fff;
                    color: #495057;
                    font-size: 0.85rem;
                    font-weight: 600;
                    padding: 0.4rem 0.85rem;
                    transition: all 0.15s ease;
                }
                .reviews-page .sort-toggle button.active {
                    background: #212529;
                    border-color: #212529;
                    color: #fff;
                }
                .reviews-page .review-card {
                    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
                    border: 1px solid transparent;
                }
                .reviews-page .review-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 0.75rem 1.75rem rgba(13, 110, 253, 0.12) !important;
                    border-color: rgba(13, 110, 253, 0.15);
                }
                .reviews-page .review-card:focus-visible {
                    outline: 2px solid #0d6efd;
                    outline-offset: 2px;
                }
                .reviews-page .review-card-enter {
                    animation: reviewFadeIn 0.35s ease both;
                }
                @keyframes reviewFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .reviews-page .review-card,
                    .reviews-page .review-card-enter,
                    .reviews-page .rating-bar-fill {
                        animation: none !important;
                        transition: none !important;
                    }
                    .reviews-page .review-card:hover {
                        transform: none;
                    }
                }
            `}</style>

            <div className="container-fluid px-0 reviews-page">
                {/* Page header */}
                <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
                    <div>
                        <div className="text-uppercase text-muted small fw-semibold mb-2">
                            Customer feedback
                        </div>

                        <h2 className="fw-bold mb-2">My Reviews</h2>

                        <p className="text-muted mb-0">
                            View the feedback you have shared with RoadAid
                            service providers.
                        </p>
                    </div>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="card border-0 shadow-sm">
                        <div className="card-body text-center py-5">
                            <div
                                className="spinner-border text-primary mb-3"
                                role="status"
                                aria-label="Loading reviews"
                            />

                            <p className="text-muted mb-0">
                                Loading your reviews...
                            </p>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {!loading && error && (
                    <div className="card border-0 shadow-sm">
                        <div className="card-body text-center py-5">
                            <div className="fs-1 mb-3">⚠️</div>

                            <h5 className="fw-bold mb-2">
                                Unable to load reviews
                            </h5>

                            <p className="text-muted mb-4">{error}</p>

                            <button
                                type="button"
                                className="btn btn-primary px-4"
                                onClick={loadReviews}
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty state (no reviews at all) */}
                {!loading && !error && reviews.length === 0 && (
                    <div className="card border-0 shadow-sm">
                        <div className="card-body text-center py-5">
                            <div
                                className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3"
                                style={{
                                    width: "76px",
                                    height: "76px",
                                }}
                            >
                                <span style={{ fontSize: "2rem" }}>⭐</span>
                            </div>

                            <h5 className="fw-bold mb-2">
                                No reviews yet
                            </h5>

                            <p
                                className="text-muted mb-0 mx-auto"
                                style={{ maxWidth: "430px" }}
                            >
                                Once you complete a RoadAid service, you can
                                share your experience by submitting a review.
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats + filters + reviews */}
                {!loading && !error && reviews.length > 0 && (
                    <>
                        {/* Stats card */}
                        <div className="row g-4 mb-4">
                            <div className="col-12 col-lg-4">
                                <div className="stat-card h-100 p-4 d-flex flex-column justify-content-center">
                                    <div className="d-flex align-items-baseline gap-2">
                                        <span className="display-5 fw-bold">
                                            {averageRating.toFixed(1)}
                                        </span>
                                        <span className="opacity-75">/ 5</span>
                                    </div>
                                    <div className="mb-2">
                                        {renderStars(Math.round(averageRating), "1rem")}
                                    </div>
                                    <div className="small opacity-75">
                                        Based on {reviews.length}{" "}
                                        {reviews.length === 1 ? "review" : "reviews"}
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-lg-8">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body p-4">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = ratingCounts[star] || 0;
                                            const pct =
                                                reviews.length > 0
                                                    ? (count / reviews.length) * 100
                                                    : 0;

                                            return (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() =>
                                                        setRatingFilter(
                                                            ratingFilter === star ? 0 : star
                                                        )
                                                    }
                                                    className="btn btn-link text-decoration-none p-0 d-flex align-items-center gap-2 w-100 mb-2 text-start"
                                                    style={{ opacity: count === 0 ? 0.45 : 1 }}
                                                >
                                                    <span
                                                        className="small fw-semibold text-dark"
                                                        style={{ width: "38px" }}
                                                    >
                                                        {star} ★
                                                    </span>
                                                    <span
                                                        className="flex-grow-1 rounded-pill bg-light"
                                                        style={{ height: "6px", overflow: "hidden" }}
                                                    >
                                                        <span
                                                            className="d-block rounded-pill bg-warning"
                                                            style={{
                                                                height: "100%",
                                                                width: `${pct}%`,
                                                                transition: "width 0.5s ease",
                                                            }}
                                                        />
                                                    </span>
                                                    <span
                                                        className="small text-muted"
                                                        style={{ width: "28px", textAlign: "right" }}
                                                    >
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls: search, star filter chips, sort */}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <button
                                    type="button"
                                    className={`filter-chip ${ratingFilter === 0 ? "active" : ""}`}
                                    onClick={() => setRatingFilter(0)}
                                >
                                    All ({reviews.length})
                                </button>
                                {[5, 4, 3, 2, 1].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`filter-chip ${
                                            ratingFilter === star ? "active" : ""
                                        }`}
                                        onClick={() =>
                                            setRatingFilter(
                                                ratingFilter === star ? 0 : star
                                            )
                                        }
                                    >
                                        {star} ★ ({ratingCounts[star] || 0})
                                    </button>
                                ))}
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <input
                                    type="search"
                                    className="form-control form-control-sm"
                                    placeholder="Search reviews..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    style={{ minWidth: "180px" }}
                                    aria-label="Search reviews"
                                />

                                <div
                                    className="btn-group sort-toggle"
                                    role="group"
                                    aria-label="Sort reviews"
                                >
                                    <button
                                        type="button"
                                        className={sortMode === "newest" ? "active" : ""}
                                        onClick={() => setSortMode("newest")}
                                    >
                                        Newest
                                    </button>
                                    <button
                                        type="button"
                                        className={sortMode === "highest" ? "active" : ""}
                                        onClick={() => setSortMode("highest")}
                                    >
                                        Highest
                                    </button>
                                    <button
                                        type="button"
                                        className={sortMode === "lowest" ? "active" : ""}
                                        onClick={() => setSortMode("lowest")}
                                    >
                                        Lowest
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* No results after filtering */}
                        {visibleReviews.length === 0 && (
                            <div className="card border-0 shadow-sm">
                                <div className="card-body text-center py-5">
                                    <div className="fs-1 mb-3">🔍</div>
                                    <h5 className="fw-bold mb-2">
                                        No reviews match your filters
                                    </h5>
                                    <p className="text-muted mb-4">
                                        Try clearing the filters or search term.
                                    </p>
                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary px-4"
                                            onClick={() => {
                                                setRatingFilter(0);
                                                setQuery("");
                                            }}
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Reviews grid */}
                        {visibleReviews.length > 0 && (
                            <div className="row g-4">
                                {visibleReviews.map((review, index) => {
                                    const requestId = getRequestId(review);
                                    const providerName = getProviderName(review);

                                    return (
                                        <div
                                            className="col-12 col-lg-6"
                                            key={review.id}
                                        >
                                            <div
                                                className="card review-card review-card-enter border-0 shadow-sm h-100"
                                                role={
                                                    requestId ? "button" : undefined
                                                }
                                                tabIndex={requestId ? 0 : undefined}
                                                onClick={() =>
                                                    handleReviewClick(review)
                                                }
                                                onKeyDown={(event) =>
                                                    handleReviewKeyDown(event, review)
                                                }
                                                style={{
                                                    cursor: requestId
                                                        ? "pointer"
                                                        : "default",
                                                    animationDelay: `${Math.min(index, 8) * 0.05}s`,
                                                }}
                                            >
                                                <div className="card-body p-4">
                                                    {/* Provider and rating */}
                                                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div
                                                                className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                                                                style={{
                                                                    width: "50px",
                                                                    height: "50px",
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            "1.35rem",
                                                                    }}
                                                                >
                                                                    🔧
                                                                </span>
                                                            </div>

                                                            <div>
                                                                <h5 className="fw-bold mb-1">
                                                                    {providerName}
                                                                </h5>

                                                                <small className="text-muted">
                                                                    {requestId
                                                                        ? `Request #${requestId}`
                                                                        : "Request details unavailable"}
                                                                </small>
                                                            </div>
                                                        </div>

                                                        <span className="badge bg-light text-dark border">
                                                            {review.rating || 0}/5
                                                        </span>
                                                    </div>

                                                    {/* Stars */}
                                                    <div className="mb-3">
                                                        {renderStars(review.rating)}
                                                    </div>

                                                    {/* Comment */}
                                                    <div className="bg-light rounded-3 p-3 mb-3">
                                                        <p className="mb-0 text-dark">
                                                            {review.comment ||
                                                                "No written comment provided."}
                                                        </p>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="d-flex justify-content-between align-items-center gap-3">
                                                        <small className="text-muted">
                                                            {formatDate(
                                                                review.createdAt
                                                            )}
                                                        </small>

                                                        {requestId && (
                                                            <span className="small text-primary fw-semibold">
                                                                View request →
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </CustomerLayout>
    );
}

export default Reviews;