import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function TrackRequest() {

    const { requestId } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadRequest();
    }, [requestId]);

    const loadRequest = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await api.get(`/requests/${requestId}`);

            setRequest(response.data);

        } catch (error) {

            console.error(
                "Failed to load request:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Unable to load request."
            );

        } finally {

            setLoading(false);

        }
    };


    const getStatusInfo = (status) => {

        switch (status) {

            case "PENDING":
                return {
                    label: "Waiting for Mechanic",
                    icon: "⏳",
                    color: "warning"
                };

            case "WAITING_FOR_QUOTATION":
                return {
                    label: "Waiting for Quotation",
                    icon: "💰",
                    color: "info"
                };

            case "QUOTATION_PENDING":
                return {
                    label: "Quotation Ready",
                    icon: "💰",
                    color: "warning"
                };

            case "ACCEPTED":
                return {
                    label: "Request Accepted",
                    icon: "✅",
                    color: "success"
                };

            case "IN_PROGRESS":
                return {
                    label: "Service In Progress",
                    icon: "🔧",
                    color: "primary"
                };

            case "COMPLETED":
            case "CLOSED":
                return {
                    label: "Service Completed",
                    icon: "🎉",
                    color: "success"
                };

            case "REJECTED":
                return {
                    label: "Request Rejected",
                    icon: "❌",
                    color: "danger"
                };

            case "CANCELLED":
                return {
                    label: "Request Cancelled",
                    icon: "⚫",
                    color: "secondary"
                };

            default:
                return {
                    label: status || "Unknown",
                    icon: "⚪",
                    color: "secondary"
                };
        }

    };


    const getProgress = (status) => {

        const steps = [
            "PENDING",
            "WAITING_FOR_QUOTATION",
            "QUOTATION_PENDING",
            "ACCEPTED",
            "IN_PROGRESS",
            "COMPLETED"
        ];

        if (
            status === "REJECTED" ||
            status === "CANCELLED"
        ) {
            return -1;
        }

        const index = steps.indexOf(status);

        return index === -1 ? 0 : index;

    };


    if (loading) {

        return (

            <CustomerLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading request tracking...
                        </p>

                    </div>

                </div>

            </CustomerLayout>

        );

    }


    if (error || !request) {

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
                        Unable to Track Request
                    </h5>

                    <p className="mb-3">
                        {error || "Request not found."}
                    </p>

                    <button
                        className="btn btn-danger"
                        onClick={loadRequest}
                    >
                        Try Again
                    </button>

                </div>

            </CustomerLayout>

        );

    }


    const statusInfo =
        getStatusInfo(request.status);

    const progress =
        getProgress(request.status);

    const isFinal =
        request.status === "COMPLETED" ||
        request.status === "CLOSED";


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

                    <div className="d-flex justify-content-between align-items-start">

                        <div>

                            <small className="text-muted">
                                RoadAid Request
                            </small>

                            <h2 className="fw-bold mb-1">
                                Track Request #{request.id}
                            </h2>

                            <p className="text-muted mb-0">
                                Monitor the current status of your roadside assistance request.
                            </p>

                        </div>

                        <span
                            className={`badge bg-${statusInfo.color} fs-6 p-2`}
                        >
                            {statusInfo.icon}{" "}
                            {statusInfo.label}
                        </span>

                    </div>

                </div>

            </div>


            {/* CURRENT STATUS */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4 text-center">

                    <div className="fs-1 mb-2">
                        {statusInfo.icon}
                    </div>

                    <h4 className="fw-bold">
                        {statusInfo.label}
                    </h4>

                    <p className="text-muted mb-0">
                        Current request status
                    </p>

                </div>

            </div>


            {/* PROGRESS */}

            {progress >= 0 && (

                <div className="card border-0 shadow-sm mb-4">

                    <div className="card-body p-4">

                        <h5 className="fw-bold mb-4">
                            📍 Request Progress
                        </h5>

                        <div>

                            {[
                                {
                                    status: "PENDING",
                                    label: "Request Created",
                                    icon: "📋"
                                },
                                {
                                    status: "WAITING_FOR_QUOTATION",
                                    label: "Mechanic Assigned",
                                    icon: "🔧"
                                },
                                {
                                    status: "QUOTATION_PENDING",
                                    label: "Quotation",
                                    icon: "💰"
                                },
                                {
                                    status: "ACCEPTED",
                                    label: "Request Accepted",
                                    icon: "✅"
                                },
                                {
                                    status: "IN_PROGRESS",
                                    label: "Service In Progress",
                                    icon: "🛠️"
                                },
                                {
                                    status: "COMPLETED",
                                    label: "Service Completed",
                                    icon: "🎉"
                                }
                            ].map((step, index) => {

                                const completed =
                                    index < progress;

                                const current =
                                    index === progress;

                                return (

                                    <div
                                        key={step.status}
                                        className="d-flex align-items-start mb-3"
                                    >

                                        <div
                                            className={`rounded-circle d-flex align-items-center justify-content-center ${
                                                completed || current
                                                    ? "bg-primary text-white"
                                                    : "bg-light text-muted"
                                            }`}
                                            style={{
                                                width: "42px",
                                                height: "42px",
                                                minWidth: "42px"
                                            }}
                                        >
                                            {completed
                                                ? "✓"
                                                : step.icon}
                                        </div>

                                        <div className="ms-3">

                                            <div
                                                className={`fw-semibold ${
                                                    current
                                                        ? "text-primary"
                                                        : ""
                                                }`}
                                            >
                                                {step.label}
                                            </div>

                                            {current && (

                                                <small className="text-muted">
                                                    Current stage
                                                </small>

                                            )}

                                        </div>

                                    </div>

                                );

                            })}

                        </div>

                    </div>

                </div>

            )}


            {/* REJECTED / CANCELLED */}

            {progress === -1 && (

                <div
                    className={`alert ${
                        request.status === "REJECTED"
                            ? "alert-danger"
                            : "alert-secondary"
                    } mb-4`}
                >

                    <strong>
                        {statusInfo.icon}{" "}
                        {statusInfo.label}
                    </strong>

                    <p className="mb-0 mt-1">
                        {request.status === "REJECTED"
                            ? "The assigned mechanic rejected this request. You can return to the request details to choose another mechanic."
                            : "This request is no longer active."}
                    </p>

                </div>

            )}


            {/* REQUEST DETAILS */}

            <div className="row g-4">

                <div className="col-lg-8">

                    <div className="card border-0 shadow-sm">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                📝 Request Information
                            </h5>

                            <div className="mb-4">

                                <small className="text-muted d-block mb-1">
                                    Problem
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

                                <strong>
                                    {request.location ||
                                        "Location unavailable"}
                                </strong>

                            </div>


                            <div>

                                <small className="text-muted d-block mb-1">
                                    🚗 Vehicle
                                </small>

                                <strong>
                                    {request.vehicle?.brand
                                        ? `${request.vehicle.brand} ${request.vehicle.model}`
                                        : "Vehicle information unavailable"}
                                </strong>

                            </div>

                        </div>

                    </div>

                </div>


                {/* SIDEBAR */}

                <div className="col-lg-4">

                    <div className="card border-0 shadow-sm mb-4">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                🔧 Mechanic
                            </h5>

                            <div className="d-flex align-items-center">

                                <div
                                    className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                                    style={{
                                        width: "52px",
                                        height: "52px",
                                        fontSize: "22px"
                                    }}
                                >
                                    🔧
                                </div>

                                <div className="ms-3">

                                    <h6 className="fw-bold mb-1">
                                        {request.mechanic?.user?.fullName ||
                                            "Not Assigned"}
                                    </h6>

                                    <small className="text-muted">
                                        RoadAid Service Provider
                                    </small>

                                </div>

                            </div>

                        </div>

                    </div>


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
                                    #{request.id}
                                </strong>

                            </div>


                            <div className="d-flex justify-content-between">

                                <span className="text-muted">
                                    Created
                                </span>

                                <span className="text-end">
                                    {request.createdAt
                                        ? new Date(
                                            request.createdAt
                                        ).toLocaleString("en-IN")
                                        : "—"}
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            {/* REFRESH */}

            {!isFinal && (
                <div className="text-center mt-4">

                    <button
                        className="btn btn-outline-primary"
                        onClick={loadRequest}
                    >
                        🔄 Refresh Status
                    </button>

                    <p className="text-muted small mt-2 mb-0">
                        Refresh to check for the latest request status.
                    </p>

                </div>
            )}

        </CustomerLayout>

    );

}

export default TrackRequest;