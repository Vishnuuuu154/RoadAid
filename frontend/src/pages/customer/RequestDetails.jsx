import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function RequestDetails() {

    const { requestId } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [reassigning, setReassigning] = useState(false);
    const [reassignError, setReassignError] = useState("");

    useEffect(() => {
        loadRequestDetails();
    }, [requestId]);


    const loadRequestDetails = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await api.get(`/requests/${requestId}/details`);

            setRequest(response.data);

        } catch (error) {

            console.error(
                "Failed to load request details:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load request details."
            );

        } finally {

            setLoading(false);

        }
    };


    const handleAutoReassign = async () => {

        try {

            setReassigning(true);
            setReassignError("");

            await api.put(
                `/requests/${requestId}/auto-reassign`
            );

            await loadRequestDetails();

        } catch (error) {

            console.error(
                "Failed to reassign mechanic:",
                error
            );

            setReassignError(
                error.response?.data?.message ||
                "Unable to find an available mechanic."
            );

        } finally {

            setReassigning(false);

        }
    };


    const getStatusInfo = (status) => {

        switch (status) {

            case "PENDING":
                return {
                    label: "Pending",
                    className: "bg-warning text-dark",
                    icon: "🟡"
                };

            case "WAITING_FOR_QUOTATION":
                return {
                    label: "Waiting for Quotation",
                    className: "bg-info text-dark",
                    icon: "🔵"
                };

            case "QUOTATION_PENDING":
                return {
                    label: "Quotation Pending",
                    className: "bg-warning text-dark",
                    icon: "🟠"
                };

            case "ACCEPTED":
                return {
                    label: "Accepted",
                    className: "bg-success",
                    icon: "🟢"
                };

            case "IN_PROGRESS":
                return {
                    label: "In Progress",
                    className: "bg-primary",
                    icon: "🔧"
                };

            case "COMPLETED":
            case "CLOSED":
                return {
                    label: "Completed",
                    className: "bg-success",
                    icon: "✅"
                };

            case "REJECTED":
                return {
                    label: "Rejected",
                    className: "bg-danger",
                    icon: "❌"
                };

            case "CANCELLED":
                return {
                    label: "Cancelled",
                    className: "bg-secondary",
                    icon: "⚫"
                };

            default:
                return {
                    label: status || "Unknown",
                    className: "bg-secondary",
                    icon: "⚪"
                };
        }
    };


    const formatDate = (date) => {

        if (!date) {
            return "—";
        }

        return new Date(date).toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    };


    if (loading) {

        return (

            <CustomerLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading request details...
                        </p>

                    </div>

                </div>

            </CustomerLayout>

        );
    }


    if (error) {

        return (

            <CustomerLayout>

                <button
                    className="btn btn-link text-decoration-none px-0 mb-3"
                    onClick={() =>
                        navigate("/customer/requests")
                    }
                >
                    ← Back to My Requests
                </button>

                <div className="alert alert-danger">

                    <h5 className="fw-bold">
                        Unable to Load Request
                    </h5>

                    <p className="mb-3">
                        {error}
                    </p>

                    <button
                        className="btn btn-danger"
                        onClick={loadRequestDetails}
                    >
                        Try Again
                    </button>

                </div>

            </CustomerLayout>

        );
    }


    if (!request) {
        return null;
    }


    const status =
        getStatusInfo(request.status);


    return (

        <CustomerLayout>

            {/* BACK */}

            <button
                className="btn btn-link text-decoration-none px-0 mb-3"
                onClick={() =>
                    navigate("/customer/requests")
                }
            >
                ← Back to My Requests
            </button>


            {/* HEADER */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-start gap-3">

                        <div>

                            <p className="text-muted mb-1">
                                RoadAid Service Request
                            </p>

                            <h2 className="fw-bold mb-2">
                                Request #{request.requestId}
                            </h2>

                            <small className="text-muted">
                                Created {formatDate(request.createdAt)}
                            </small>

                        </div>

                        <span
                            className={`badge fs-6 px-3 py-2 ${status.className}`}
                        >
                            {status.icon}{" "}
                            {status.label}
                        </span>

                    </div>

                </div>

            </div>


            {/* STATUS */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-4">
                        📍 Request Status
                    </h5>

                    <div className="d-flex align-items-center">

                        <div
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                            style={{
                                width: "48px",
                                height: "48px"
                            }}
                        >
                            {status.icon}
                        </div>

                        <div className="ms-3">

                            <h6 className="fw-bold mb-1">
                                {status.label}
                            </h6>

                            <p className="text-muted mb-0">
                                Current status of your RoadAid request
                            </p>

                        </div>

                    </div>

                </div>

            </div>


            {/* REASSIGNMENT */}

            {request.status === "REJECTED" && (

                <div className="card border-0 shadow-sm mb-4">

                    <div className="card-body p-4">

                        <div className="d-flex align-items-start gap-3">

                            <div className="fs-2">
                                ⚠️
                            </div>

                            <div className="flex-grow-1">

                                <h5 className="fw-bold mb-2">
                                    Mechanic Rejected This Request
                                </h5>

                                <p className="text-muted mb-4">
                                    You can choose how you would like
                                    RoadAid to continue with your request.
                                </p>


                                {reassignError && (

                                    <div className="alert alert-danger">
                                        {reassignError}
                                    </div>

                                )}


                                {/* AUTO REASSIGN */}

                                <div className="border rounded p-3 mb-3">

                                    <div className="d-flex justify-content-between align-items-center gap-3">

                                        <div>

                                            <h6 className="fw-bold mb-1">
                                                🔍 Let RoadAid Find One
                                            </h6>

                                            <small className="text-muted">
                                                RoadAid will assign an
                                                available mechanic to your request.
                                            </small>

                                        </div>

                                        <button
                                            className="btn btn-primary"
                                            onClick={handleAutoReassign}
                                            disabled={reassigning}
                                        >
                                            {reassigning
                                                ? "Finding..."
                                                : "Find One for Me"}
                                        </button>

                                    </div>

                                </div>


                                {/* MANUAL REASSIGN */}

                                <div className="border rounded p-3">

                                    <div className="d-flex justify-content-between align-items-center gap-3">

                                        <div>

                                            <h6 className="fw-bold mb-1">
                                                👤 Choose a Mechanic
                                            </h6>

                                            <small className="text-muted">
                                                Browse available mechanics
                                                and choose one yourself.
                                            </small>

                                        </div>

                                        <button
                                            className="btn btn-outline-primary"
                                            onClick={() =>
                                                navigate(
                                                    `/customer/mechanics?reassign=${requestId}`
                                                )
                                            }
                                        >
                                            Choose Mechanic
                                        </button>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            )}


            {/* MAIN CONTENT */}

            <div className="row g-4">

                {/* REQUEST INFORMATION */}

                <div className="col-lg-8">

                    <div className="card border-0 shadow-sm mb-4">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                📝 Request Information
                            </h5>


                            <div className="mb-4">

                                <small className="text-muted d-block mb-1">
                                    Problem Description
                                </small>

                                <div className="p-3 bg-light rounded">
                                    {request.issueDescription ||
                                        "No description provided."}
                                </div>

                            </div>


                            <div className="mb-4">

                                <small className="text-muted d-block mb-1">
                                    📍 Location
                                </small>

                                <div className="fw-semibold">
                                    {request.location ||
                                        "Location not available"}
                                </div>

                            </div>


                            <div>

                                <small className="text-muted d-block mb-1">
                                    🚗 Vehicle
                                </small>

                                <div className="fw-semibold">
                                    {request.vehicle ||
                                        "Vehicle not available"}
                                </div>

                            </div>

                        </div>

                    </div>


                    {/* IMAGES */}

                    {request.images &&
                        request.images.length > 0 && (

                            <div className="card border-0 shadow-sm">

                                <div className="card-body p-4">

                                    <h5 className="fw-bold mb-4">
                                        📷 Uploaded Images
                                    </h5>

                                    <div className="row g-3">

                                        {request.images.map(
                                            (image, index) => (

                                                <div
                                                    className="col-6 col-md-4"
                                                    key={index}
                                                >

                                                    <img
                                                        src={image}
                                                        alt={`Request ${index + 1}`}
                                                        className="img-fluid rounded border"
                                                        style={{
                                                            width: "100%",
                                                            height: "180px",
                                                            objectFit: "cover"
                                                        }}
                                                    />

                                                </div>

                                            )
                                        )}

                                    </div>

                                </div>

                            </div>

                        )}

                </div>


                {/* SIDEBAR */}

                <div className="col-lg-4">

                    {/* MECHANIC */}

                    <div className="card border-0 shadow-sm mb-4">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                🔧 Assigned Mechanic
                            </h5>

                            <div className="d-flex align-items-center">

                                <div
                                    className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                                    style={{
                                        width: "50px",
                                        height: "50px"
                                    }}
                                >
                                    🔧
                                </div>

                                <div className="ms-3">

                                    <h6 className="fw-bold mb-1">
                                        {request.mechanicName ||
                                            "Not Assigned"}
                                    </h6>

                                    <small className="text-muted">
                                        RoadAid Service Provider
                                    </small>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* QUICK INFO */}

                    <div className="card border-0 shadow-sm">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                ℹ️ Request Summary
                            </h5>


                            <div className="d-flex justify-content-between mb-3">

                                <span className="text-muted">
                                    Request ID
                                </span>

                                <strong>
                                    #{request.requestId}
                                </strong>

                            </div>


                            <div className="d-flex justify-content-between mb-3">

                                <span className="text-muted">
                                    Status
                                </span>

                                <span
                                    className={`badge ${status.className}`}
                                >
                                    {status.label}
                                </span>

                            </div>


                            <div className="d-flex justify-content-between">

                                <span className="text-muted">
                                    Created
                                </span>

                                <span className="text-end">
                                    {formatDate(request.createdAt)}
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </CustomerLayout>

    );
}

export default RequestDetails;