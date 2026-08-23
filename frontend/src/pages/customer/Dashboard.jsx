import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import {
    getMyVehicles,
    getMyRequests,
    getMyPayments,
    getMyFavorites,
    getMyNotifications,
    getAvailableMechanics,
    getQuotation,
    acceptQuotation,
    makePayment,
    cancelRequest,
    reassignMechanic,
    autoReassignMechanic,
    addReview,
    getMyReviews
} from "../../services/customerService";

function Dashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [requests, setRequests] = useState([]);
    const navigate = useNavigate();
    const activeRequest = requests.find(
        (request) =>
            [
                "PENDING",
                "WAITING_FOR_QUOTATION",
                "QUOTATION_PENDING",
                "ACCEPTED",
                "IN_PROGRESS",
                "COMPLETED"
            ].includes(request.status)
    );
    const rejectedRequest = requests.find(
        (request) => request.status === "REJECTED"
    );
    const [payments, setPayments] = useState([]);
    const [quotation, setQuotation] = useState(null);
    const [quotationLoading, setQuotationLoading] = useState(false);
    const [quotationError, setQuotationError] = useState("");
    const [availableMechanics, setAvailableMechanics] = useState([]);
    const [showMechanicSelection, setShowMechanicSelection] = useState(false);

    useEffect(() => {
        loadVehicles();
        loadRequests();
        loadPayments();
        loadFavorites();
        loadNotifications();
        loadMyReviews();
    }, []);
    const [favorites, setFavorites] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState("UPI");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);
    const [myReviews, setMyReviews] = useState([]);
    const loadVehicles = async () => {

        try {

            const response = await getMyVehicles();

            setVehicles(response.data);

        } catch (error) {

            console.error("Failed to load vehicles:", error);

        }

    };
    const loadRequests = async () => {

        try {

            const response = await getMyRequests();

            const customerRequests = response.data;

            setRequests(customerRequests);

            const quotationRequest = customerRequests.find(
                (request) =>
                    request.status === "QUOTATION_PENDING" ||
                    request.status === "COMPLETED"
            );

            if (quotationRequest) {

                try {

                    const quotationResponse = await getQuotation(
                        quotationRequest.requestId
                    );

                    console.log(
                        "QUOTATION FROM API:",
                        quotationResponse.data
                    );

                    setQuotation(quotationResponse.data);

                } catch (quotationError) {

                    console.error(
                        "Failed to load quotation:",
                        quotationError
                    );

                }

            } else {

                setQuotation(null);

            }

        } catch (error) {

            console.error(
                "Failed to load requests:",
                error
            );

        }
    };
    const loadPayments = async () => {

        try {

            const response = await getMyPayments();

            console.log("PAYMENTS FROM API:", response.data);

            setPayments(response.data);

        } catch (error) {

            console.error("Failed to load payments:", error);

        }

    };
    const totalPayments = payments.reduce(
        (total, payment) => total + (payment.amount || 0),
        0
    );
    const loadFavorites = async () => {

        try {

            const response = await getMyFavorites();

            console.log("FAVORITES FROM API:", response.data);

            setFavorites(response.data);

        } catch (error) {

            console.error("Failed to load favorites:", error);

        }

    };
    const loadNotifications = async () => {

        try {

            const response = await getMyNotifications();

            console.log("NOTIFICATIONS FROM API:", response.data);

            setNotifications(response.data);

        } catch (error) {

            console.error(
                "Failed to load notifications:",
                error
            );

        }

    };
    const loadQuotation = async (requestId) => {

        try {

            setQuotationLoading(true);
            setQuotationError("");

            const response = await getQuotation(requestId);

            console.log("QUOTATION FROM API:", response.data);

            setQuotation(response.data);

        } catch (error) {

            console.error(
                "Failed to load quotation:",
                error
            );

            setQuotationError(
                error.response?.data?.message ||
                "Failed to load quotation."
            );

        } finally {

            setQuotationLoading(false);

        }
    };
    const handlePayment = async () => {

        if (!quotation) {
            return;
        }

        try {

            setPaymentLoading(true);

            await makePayment(
                quotation.id,
                {
                    paymentMethod: paymentMethod
                }
            );

            alert("Payment successful!");

            setQuotation(null);

            await loadRequests();
            await loadPayments();

        } catch (error) {

            console.error(
                "Payment failed:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Payment failed. Please try again."
            );

        } finally {

            setPaymentLoading(false);

        }
    };
    const handleChooseAnotherMechanic = async () => {
        try {
            const response = await getAvailableMechanics();

            setAvailableMechanics(response.data);
            setShowMechanicSelection(true);

        } catch (error) {
            console.error("Failed to load mechanics:", error);

            alert(
                error.response?.data?.message ||
                "Failed to load available mechanics."
            );
        }
    };
    const handleSubmitReview = async (requestId) => {

        if (reviewRating === 0) {
            alert("Please select a rating.");
            return;
        }

        try {

            setReviewLoading(true);

            await addReview(requestId, {
                rating: reviewRating,
                comment: reviewComment
            });

            alert("Review submitted successfully!");

            setReviewRating(0);
            setReviewComment("");

            await loadRequests();
            await loadMyReviews();

        } catch (error) {

            console.error(
                "Failed to submit review:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to submit review."
            );

        } finally {

            setReviewLoading(false);

        }
    };
    const loadMyReviews = async () => {

        try {

            const response = await getMyReviews();

            console.log("MY REVIEWS FROM API:", response.data);

            setMyReviews(response.data);

        } catch (error) {

            console.error(
                "Failed to load my reviews:",
                error
            );

        }
    };
    return (

        <CustomerLayout>

            <div className="text-center mb-5">

                <h2 className="fw-bold mb-2">
                    Welcome to RoadAid
                </h2>

                <p className="text-muted">
                    Need roadside assistance? Get help from a nearby service provider.
                </p>

                <Link
                    to="/customer/request-help"
                    className="btn btn-primary btn-lg px-5 py-3 shadow-sm"
                >
                    🆘 Request Help
                </Link>

            </div>
            <div className="row g-4 mb-5">

                {/* My Vehicles */}

                <div className="col-md-6 col-xl-3">

                    <div className="card shadow-sm border-0 h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>

                                    <p className="text-muted mb-1">
                                        My Vehicles
                                    </p>

                                    <h2 className="mb-0">
                                        {vehicles.length}
                                    </h2>

                                </div>

                                <div className="fs-1">
                                    🚗
                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                {/* Total Requests */}

                <div className="col-md-6 col-xl-3">

                    <div className="card shadow-sm border-0 h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>

                                    <p className="text-muted mb-1">
                                        Total Requests
                                    </p>

                                    <h2 className="mb-0">
                                        {requests.length}
                                    </h2>

                                </div>

                                <div className="fs-1">
                                    📋
                                </div>

                            </div>

                        </div>

                    </div>

                </div>
                {!activeRequest &&
                    requests.some(
                        (request) => request.status === "PENDING"
                    ) && (

                        <div className="alert alert-warning d-flex justify-content-between align-items-center mb-5">

                            <div>
                                <strong>
                                    ⏳ You have a pending service request.
                                </strong>

                                <div className="small">
                                    We're looking for a mechanic to assist you.
                                </div>
                            </div>

                            <button
                                className="btn btn-warning btn-sm"
                                onClick={() =>
                                    alert("Request details will be implemented later.")
                                }
                            >
                                View Request
                            </button>

                        </div>
                    )}

                {/* Active Service */}

                <div className="col-md-6 col-xl-3">

                    <div className="card shadow-sm border-0 h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>

                                    <p className="text-muted mb-1">
                                        Active Service
                                    </p>

                                    <h2 className="mb-0">
                                        {activeRequest ? 1 : 0}
                                    </h2>

                                </div>

                                <div className="fs-1">
                                    🔧
                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                {/* Total Payments */}

                <div className="col-md-6 col-xl-3">

                    <div className="card shadow-sm border-0 h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between align-items-center">

                                <div>

                                    <p className="text-muted mb-1">
                                        Total Payments
                                    </p>

                                    <h2 className="mb-0">
                                        ₹{totalPayments.toFixed(2)}
                                    </h2>

                                </div>

                                <div className="fs-1">
                                    💳
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>
            {activeRequest ? (

                <div className="card shadow-sm border-0 mb-5">

                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center mb-3">

                            <h5 className="mb-0 fw-bold">
                                🆘 Active Service
                            </h5>

                            <span className="badge bg-primary">
                    {activeRequest.status}
                </span>

                        </div>

                        <div className="row align-items-center">

                            <div className="col-md-8">

                                <h6 className="fw-bold">
                                    Request #{activeRequest.requestId}
                                </h6>

                                <p className="text-muted mb-2">
                                    {activeRequest.issue}
                                </p>

                                <p className="mb-1">
                                    🔧 Mechanic: {activeRequest.mechanic}
                                </p>

                                <p className="text-muted mb-0">
                                    📅 {new Date(
                                    activeRequest.createdAt
                                ).toLocaleString()}
                                </p>
                                {activeRequest.status === "QUOTATION_PENDING" && (
                                    <button
                                        className="btn btn-warning mt-3"
                                        onClick={() =>
                                            loadQuotation(activeRequest.requestId)
                                        }
                                        disabled={quotationLoading}
                                    >
                                        {quotationLoading
                                            ? "Loading Quotation..."
                                            : "💰 View Quotation"}
                                    </button>
                                )}

                            </div>

                            <div className="col-md-4 text-md-end mt-3 mt-md-0">

                                <button
                                    className="btn btn-primary"
                                    onClick={() =>
                                        navigate(
                                            `/customer/requests/${activeRequest.requestId}/track`
                                        )
                                    }
                                >
                                    Track Request
                                </button>

                                {[
                                    "PENDING",
                                    "WAITING_FOR_QUOTATION",
                                    "QUOTATION_PENDING"
                                ].includes(activeRequest.status) && (

                                    <button
                                        className="btn btn-outline-danger mt-2"
                                        onClick={async () => {

                                            const confirmed = window.confirm(
                                                "Are you sure you want to cancel this request?"
                                            );

                                            if (!confirmed) {
                                                return;
                                            }

                                            try {

                                                await cancelRequest(
                                                    activeRequest.requestId
                                                );

                                                alert(
                                                    "Request cancelled successfully."
                                                );

                                                setQuotation(null);

                                                await loadRequests();

                                            } catch (error) {

                                                console.error(
                                                    "Failed to cancel request:",
                                                    error
                                                );

                                                alert(
                                                    error.response?.data?.message ||
                                                    "Failed to cancel request."
                                                );
                                            }
                                        }}
                                    >
                                        ✕ Cancel Request
                                    </button>

                                )}

                            </div>

                        </div>

                    </div>

                </div>


            ) : (

                <div className="card shadow-sm border-0 mb-5">

                    <div className="card-body p-4 text-center">

                        <h5 className="fw-bold">
                            No Active Service
                        </h5>

                        <p className="text-muted">
                            You don't currently have an active roadside assistance request.
                        </p>

                        <button
                            className="btn btn-primary"
                            onClick={() =>
                                alert("Request Help will be implemented later.")
                            }
                        >
                            🆘 Request Help
                        </button>

                    </div>

                </div>

            )}
            {quotation &&
                (
                    activeRequest?.status === "QUOTATION_PENDING" ||
                    activeRequest?.status === "COMPLETED"
                ) && (
                <div className="card shadow-sm border-0 mb-5">

                    <div className="card-body p-4">

                        <h5 className="fw-bold mb-4">
                            💰 Service Quotation
                        </h5>

                        <div className="row mb-3">

                            <div className="col-6">
                                Labour Charge
                            </div>

                            <div className="col-6 text-end">
                                ₹{Number(
                                quotation.labourCharge || 0
                            ).toFixed(2)}
                            </div>

                        </div>

                        <div className="row mb-3">

                            <div className="col-6">
                                Parts Charge
                            </div>

                            <div className="col-6 text-end">
                                ₹{Number(
                                quotation.partsCharge || 0
                            ).toFixed(2)}
                            </div>

                        </div>

                        <div className="row mb-3">

                            <div className="col-6">
                                Travel Fee
                            </div>

                            <div className="col-6 text-end">
                                ₹{Number(
                                quotation.travelFee || 0
                            ).toFixed(2)}
                            </div>

                        </div>

                        <hr />

                        <div className="row mb-4">

                            <div className="col-6 fw-bold">
                                Total
                            </div>

                            <div className="col-6 text-end fw-bold fs-5">
                                ₹{Number(
                                quotation.totalAmount || 0
                            ).toFixed(2)}
                            </div>

                        </div>

                        {quotationError && (
                            <div className="alert alert-danger">
                                {quotationError}
                            </div>
                        )}

                        <div className="text-end">

                            {activeRequest.status === "QUOTATION_PENDING" && (
                                <button
                                    className="btn btn-success"
                                    onClick={async () => {

                                        try {

                                            await acceptQuotation(
                                                activeRequest.requestId
                                            );

                                            alert(
                                                "Quotation accepted successfully."
                                            );

                                            setQuotation(null);

                                            await loadRequests();

                                        } catch (error) {

                                            console.error(
                                                "Failed to accept quotation:",
                                                error
                                            );

                                            alert(
                                                error.response?.data?.message ||
                                                "Failed to accept quotation."
                                            );

                                        }

                                    }}
                                >
                                    ✓ Accept Quotation
                                </button>
                            )}

                            {activeRequest.status === "COMPLETED" && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handlePayment}
                                    disabled={paymentLoading}
                                >
                                    {paymentLoading
                                        ? "Processing Payment..."
                                        : "💳 Pay Now"}
                                </button>
                            )}

                        </div>

                    </div>

                </div>

            )}
            {rejectedRequest && (
                <div className="card shadow-sm border-0 mb-5">
                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center">

                            <div>
                                <h5 className="fw-bold text-danger">
                                    ⚠️ Request Rejected
                                </h5>

                                <p className="text-muted mb-1">
                                    Request #{rejectedRequest.requestId}
                                </p>

                                <p className="mb-0">
                                    The selected mechanic rejected your service request.
                                </p>
                            </div>

                            <div className="d-flex gap-2 flex-wrap">

                                <button
                                    className="btn btn-primary"
                                    onClick={handleChooseAnotherMechanic}
                                >
                                    🔧 I'll Choose a Mechanic
                                </button>

                                <button
                                    className="btn btn-outline-primary"
                                    onClick={async () => {

                                        if (!window.confirm(
                                            "Let RoadAid find an available mechanic for you?"
                                        )) {
                                            return;
                                        }

                                        try {

                                            await autoReassignMechanic(
                                                rejectedRequest.requestId
                                            );

                                            alert(
                                                "RoadAid found an available mechanic and sent your request."
                                            );

                                            await loadRequests();

                                        } catch (error) {

                                            console.error(
                                                "Automatic mechanic assignment failed:",
                                                error
                                            );

                                            alert(
                                                error.response?.data?.message ||
                                                "No suitable mechanic is currently available."
                                            );
                                        }
                                    }}
                                >
                                    ⚡ Let RoadAid Find One
                                </button>

                            </div>

                        </div>

                    </div>
                </div>
            )}
            {showMechanicSelection && rejectedRequest && (
                <div className="card shadow-sm border-0 mb-5">
                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <h5 className="fw-bold mb-1">
                                    🔧 Choose Another Mechanic
                                </h5>

                                <p className="text-muted mb-0">
                                    Select an available mechanic for your request.
                                </p>
                            </div>

                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => setShowMechanicSelection(false)}
                            >
                                ✕ Close
                            </button>
                        </div>

                        {availableMechanics.length === 0 ? (

                            <div className="alert alert-warning mb-0">
                                No mechanics are currently available.
                            </div>

                        ) : (

                            <div className="row g-3">

                                {availableMechanics.map((mechanic) => (

                                    <div
                                        className="col-md-6 col-lg-4"
                                        key={mechanic.id}
                                    >

                                        <div className="border rounded p-3 h-100">

                                            <div className="d-flex justify-content-between align-items-start">

                                                <div>
                                                    <h6 className="fw-bold mb-1">
                                                        {mechanic.user?.fullName ||
                                                            "Mechanic"}
                                                    </h6>

                                                    <p className="text-muted mb-2">
                                                        {mechanic.experienceYears ?? 0} years experience
                                                    </p>
                                                </div>

                                                <span className="badge bg-success">
                                        Available
                                    </span>

                                            </div>

                                            <p className="small text-muted mb-3">
                                                {mechanic.workshopName ||
                                                    "Independent Mechanic"}
                                            </p>

                                            <p className="small mb-3">
                                                📍 {mechanic.workshopAddress ||
                                                "Location unavailable"}
                                            </p>

                                            <button
                                                className="btn btn-primary w-100"
                                                onClick={async () => {

                                                    const confirmed = window.confirm(
                                                        `Send this request to ${
                                                            mechanic.user?.fullName ||
                                                            "this mechanic"
                                                        }?`
                                                    );

                                                    if (!confirmed) {
                                                        return;
                                                    }

                                                    try {
                                                        console.log("REASSIGNING REQUEST:", {
                                                            requestId: rejectedRequest.requestId,
                                                            status: rejectedRequest.status,
                                                            mechanicId: mechanic.id
                                                        });
                                                        await reassignMechanic(
                                                            rejectedRequest.requestId,
                                                            mechanic.id
                                                        );

                                                        alert(
                                                            "Request sent to the selected mechanic."
                                                        );

                                                        setShowMechanicSelection(false);
                                                        setAvailableMechanics([]);

                                                        await loadRequests();

                                                    } catch (error) {

                                                        console.error(
                                                            "Failed to reassign mechanic:",
                                                            error
                                                        );

                                                        alert(
                                                            error.response?.data?.message ||
                                                            "Failed to send request to mechanic."
                                                        );
                                                    }
                                                }}
                                            >
                                                Select Mechanic
                                            </button>

                                        </div>

                                    </div>

                                ))}

                            </div>

                        )}

                    </div>
                </div>
            )}
            {requests
                .filter(
                    (request) =>
                        request.status === "CLOSED" &&
                        !myReviews.some((review) => {

                            const reviewedRequestId =
                                review.serviceRequest?.requestId ??
                                review.serviceRequest?.id;

                            return Number(reviewedRequestId) ===
                                Number(request.requestId);
                        })
                )
                .map((request) => (

                    <div
                        className="card shadow-sm border-0 mb-5"
                        key={`review-${request.requestId}`}
                    >

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-2">
                                ⭐ Rate Your Mechanic
                            </h5>

                            <p className="text-muted">
                                How was your experience with the mechanic
                                for Request #{request.requestId}?
                            </p>

                            {/* Rating */}

                            <div className="mb-3">

                                {[1, 2, 3, 4, 5].map((star) => (

                                    <button
                                        key={star}
                                        type="button"
                                        className="btn p-0 me-1"
                                        style={{
                                            fontSize: "2rem",
                                            color:
                                                star <= reviewRating
                                                    ? "#ffc107"
                                                    : "#ccc"
                                        }}
                                        onClick={() =>
                                            setReviewRating(star)
                                        }
                                    >
                                        ★
                                    </button>

                                ))}

                            </div>

                            {/* Comment */}

                            <textarea
                                className="form-control mb-3"
                                rows="4"
                                placeholder="Tell us about your experience (optional)"
                                value={reviewComment}
                                onChange={(e) =>
                                    setReviewComment(e.target.value)
                                }
                            />

                            <button
                                className="btn btn-primary"
                                disabled={
                                    reviewLoading ||
                                    reviewRating === 0
                                }
                                onClick={() =>
                                    handleSubmitReview(
                                        request.requestId
                                    )
                                }
                            >
                                {reviewLoading
                                    ? "Submitting..."
                                    : "Submit Review"}
                            </button>

                        </div>

                    </div>

                ))}
            <div className="card shadow-sm border-0 mb-5">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <h5 className="mb-0 fw-bold">
                            💳 Recent Payments
                        </h5>

                        <span className="text-muted small">
                {payments.length} payment(s)
            </span>

                    </div>

                    {payments.length === 0 ? (

                        <p className="text-muted mb-0">
                            No payments have been made yet.
                        </p>

                    ) : (

                        <div className="table-responsive">

                            <table className="table table-hover align-middle mb-0">

                                <thead>

                                <tr>
                                    <th>Payment</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>

                                </thead>

                                <tbody>

                                {payments
                                    .slice(0, 5)
                                    .map((payment) => (

                                        <tr key={payment.id}>

                                            <td>
                                                #{payment.id}
                                            </td>

                                            <td>
                                                ₹{payment.amount?.toFixed(2)}
                                            </td>

                                            <td>
                                                {payment.paymentMethod}
                                            </td>

                                            <td>

                                        <span className="badge bg-success">
                                            {payment.paymentStatus}
                                        </span>

                                            </td>

                                            <td>
                                                {payment.paymentDate
                                                    ? new Date(
                                                        payment.paymentDate
                                                    ).toLocaleDateString()
                                                    : "-"
                                                }
                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>
            <div className="card shadow-sm border-0 mb-5">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <h5 className="mb-0 fw-bold">
                            🔔 Notifications
                        </h5>

                        <Link
                            to="/customer/notifications"
                            className="btn btn-outline-primary btn-sm"
                        >
                            View All
                        </Link>

                    </div>

                    {notifications.length === 0 ? (

                        <div className="text-center py-3">

                            <p className="text-muted mb-0">
                                No new notifications.
                            </p>

                        </div>

                    ) : (

                        <div>

                            {notifications
                                .slice(0, 5)
                                .map((notification) => (

                                    <div
                                        key={notification.id}
                                        className={`border-bottom py-3 ${
                                            !notification.isRead
                                                ? "fw-bold"
                                                : ""
                                        }`}
                                    >

                                        <div className="d-flex justify-content-between">

                                <span>
                                    {notification.message}
                                </span>

                                            <small className="text-muted ms-3">
                                                {new Date(
                                                    notification.createdAt
                                                ).toLocaleDateString()}
                                            </small>

                                        </div>

                                    </div>

                                ))}

                        </div>

                    )}

                </div>

            </div>

            <div className="card shadow-sm border-0 mb-5">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <h5 className="mb-0 fw-bold">
                            📋 Recent Requests
                        </h5>

                        <Link
                            to="/customer/requests"
                            className="btn btn-outline-primary btn-sm"
                        >
                            View All
                        </Link>

                    </div>

                    <div className="table-responsive">

                        <table className="table table-hover align-middle">

                            <thead>

                            <tr>

                                <th>Request</th>
                                <th>Mechanic</th>
                                <th>Issue</th>
                                <th>Status</th>

                            </tr>

                            </thead>

                            <tbody>

                            {requests.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="4"
                                        className="text-center text-muted py-4"
                                    >
                                        No service requests found.
                                    </td>

                                </tr>

                            ) : (

                                requests.slice(0, 5).map((request) => (

                                    <tr key={request.requestId}>

                                        <td>
                                            #{request.requestId}
                                        </td>

                                        <td>
                                            {request.mechanic}
                                        </td>

                                        <td>
                                            {request.issue}
                                        </td>

                                        <td>

                    <span
                        className={
                            request.status === "COMPLETED"
                                ? "badge bg-success"
                                : request.status === "CANCELLED"
                                    ? "badge bg-secondary"
                                    : request.status === "PENDING"
                                        ? "badge bg-warning text-dark"
                                        : request.status === "QUOTATION_PENDING"
                                            ? "badge bg-info text-dark"
                                            : "badge bg-primary"
                        }
                    >
                        {request.status}
                    </span>

                                        </td>

                                    </tr>

                                ))

                            )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>
            {favorites.length === 0 ? (

                <div className="text-center py-4">

                    <p className="text-muted mb-3">
                        You haven't added any mechanics to your favorites yet.
                    </p>

                    <Link
                        to="/customer/mechanics"
                        className="btn btn-outline-primary"
                    >
                        Find Mechanics
                    </Link>

                </div>

            ) : (

                <div className="row g-3">

                    {favorites.slice(0, 3).map((favorite) => {

                        const mechanic = favorite.mechanic;

                        return (

                            <div
                                className="col-md-6 col-lg-4"
                                key={favorite.id}
                            >

                                <div className="border rounded p-3 h-100">

                                    <div className="d-flex justify-content-between">

                                        <h6 className="fw-bold mb-1">
                                            {mechanic?.user?.fullName ||
                                                "Mechanic"}
                                        </h6>

                                        <span
                                            className={
                                                mechanic?.available
                                                    ? "badge bg-success"
                                                    : "badge bg-secondary"
                                            }
                                        >
                                {mechanic?.available
                                    ? "Available"
                                    : "Offline"}
                            </span>

                                    </div>

                                    <p className="text-muted mb-1">
                                        {mechanic?.experienceYears ?? 0} years experience
                                    </p>

                                    <button
                                        className="btn btn-primary btn-sm mt-2"
                                        onClick={() =>
                                            alert("Requesting this mechanic will be implemented later.")
                                        }
                                    >
                                        Request Service
                                    </button>

                                </div>

                            </div>

                        );

                    })}

                </div>

            )}
            <div className="card shadow-sm border-0 mb-5">

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-3">
                        🆘 Emergency Utilities
                    </h5>

                    <div className="row g-3">

                        {/* Fuel Station */}

                        <div className="col-md-6">

                            <div className="border rounded p-4 h-100">

                                <h5>
                                    ⛽ Find Fuel Station
                                </h5>

                                <p className="text-muted">
                                    Find the nearest fuel station when you're running
                                    out of fuel.
                                </p>

                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() =>
                                        alert("Fuel station finder will be implemented later.")
                                    }
                                >
                                    Find Fuel Station
                                </button>

                            </div>

                        </div>


                        {/* Towing */}

                        <div className="col-md-6">

                            <div className="border rounded p-4 h-100">

                                <h5>
                                    🚛 Need Towing?
                                </h5>

                                <p className="text-muted">
                                    Find a nearby towing provider when your vehicle
                                    cannot be driven.
                                </p>

                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() =>
                                        alert("Towing service will be implemented later.")
                                    }
                                >
                                    Find Towing
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </CustomerLayout>

    );

}

export default Dashboard;