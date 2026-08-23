import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";
import api from "../../services/api";
import {
    acceptRequest,
    rejectRequest,
    completeRequest,
    createQuotation
} from "../../services/mechanicService";

function RequestDetails() {

    const { requestId } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [quotation, setQuotation] = useState({
        labourCharge: "",
        partsCharge: "",
        travelFee: ""
    });

    const [quotationLoading, setQuotationLoading] = useState(false);


    useEffect(() => {
        loadRequest();
    }, [requestId]);


    const loadRequest = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await api.get(
                    `/requests/${requestId}/mechanic-details`
                );

            setRequest(response.data);

        } catch (error) {

            console.error(
                "Failed to load request:",
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


    const handleAccept = async () => {

        if (!window.confirm(
            "Accept this service request?"
        )) {
            return;
        }

        try {

            setActionLoading(true);

            await acceptRequest(requestId);

            await loadRequest();

        } catch (error) {

            console.error(error);

            alert(
                error.response?.data?.message ||
                "Failed to accept request."
            );

        } finally {

            setActionLoading(false);

        }

    };


    const handleReject = async () => {

        if (!window.confirm(
            "Are you sure you want to reject this request?"
        )) {
            return;
        }

        try {

            setActionLoading(true);

            await rejectRequest(requestId);

            await loadRequest();

        } catch (error) {

            console.error(error);

            alert(
                error.response?.data?.message ||
                "Failed to reject request."
            );

        } finally {

            setActionLoading(false);

        }

    };


    const handleComplete = async () => {

        if (!window.confirm(
            "Mark this service as completed?"
        )) {
            return;
        }

        try {

            setActionLoading(true);

            await completeRequest(requestId);

            await loadRequest();

        } catch (error) {

            console.error(error);

            alert(
                error.response?.data?.message ||
                "Failed to complete service."
            );

        } finally {

            setActionLoading(false);

        }

    };
    const handleQuotationChange = (e) => {

        setQuotation({
            ...quotation,
            [e.target.name]: e.target.value
        });

    };


    const handleCreateQuotation = async (e) => {

        e.preventDefault();

        try {

            setQuotationLoading(true);

            await createQuotation(
                requestId,
                {
                    labourCharge: Number(quotation.labourCharge),
                    partsCharge: Number(quotation.partsCharge),
                    travelFee: Number(quotation.travelFee)
                }
            );

            alert("Quotation sent successfully.");

            setQuotation({
                labourCharge: "",
                partsCharge: "",
                travelFee: ""
            });

            await loadRequest();

        } catch (error) {

            console.error(
                "Failed to create quotation:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to send quotation."
            );

        } finally {

            setQuotationLoading(false);

        }

    };


    const getStatusInfo = (status) => {

        switch (status) {

            case "PENDING":
                return {
                    label: "Pending",
                    className: "bg-warning text-dark",
                    icon: "⏳"
                };

            case "WAITING_FOR_QUOTATION":
                return {
                    label: "Waiting for Quotation",
                    className: "bg-info text-dark",
                    icon: "💰"
                };

            case "IN_PROGRESS":
                return {
                    label: "In Progress",
                    className: "bg-primary",
                    icon: "🔧"
                };

            case "COMPLETED":
                return {
                    label: "Completed",
                    className: "bg-success",
                    icon: "✓"
                };

            case "REJECTED":
                return {
                    label: "Rejected",
                    className: "bg-danger",
                    icon: "✕"
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
                    icon: "?"
                };

        }

    };


    if (loading) {

        return (

            <MechanicLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading request details...
                        </p>

                    </div>

                </div>

            </MechanicLayout>

        );

    }


    if (error) {

        return (

            <MechanicLayout>

                <button
                    className="btn btn-link text-decoration-none px-0 mb-3"
                    onClick={() =>
                        navigate("/mechanic/requests")
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
                        onClick={loadRequest}
                    >
                        Try Again
                    </button>

                </div>

            </MechanicLayout>

        );

    }


    if (!request) {
        return null;
    }


    const status =
        getStatusInfo(request.status);


    return (

        <MechanicLayout>

            {/* BACK */}

            <button
                className="btn btn-link text-decoration-none px-0 mb-3"
                onClick={() =>
                    navigate("/mechanic/requests")
                }
            >
                ← Back to My Requests
            </button>


            {/* HEADER */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">

                        <div>

                            <small className="text-muted">
                                Service Request
                            </small>

                            <h2 className="fw-bold mb-1">
                                Request #{request.requestId}
                            </h2>

                            <p className="text-muted mb-0">
                                Customer service request
                            </p>

                        </div>

                        <span
                            className={`badge ${status.className} fs-6 px-3 py-2`}
                        >
                            {status.icon} {status.label}
                        </span>

                    </div>

                </div>

            </div>


            <div className="row g-4">

                {/* MAIN INFORMATION */}

                <div className="col-lg-8">

                    {/* CUSTOMER */}

                    <div className="card border-0 shadow-sm mb-4">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                👤 Customer Information
                            </h5>

                            <div className="row g-4">

                                <div className="col-md-6">

                                    <small className="text-muted d-block mb-1">
                                        Customer
                                    </small>

                                    <strong>
                                        {request.customerName ||
                                            "Not available"}
                                    </strong>

                                </div>

                                <div className="col-md-6">

                                    <small className="text-muted d-block mb-1">
                                        Vehicle
                                    </small>

                                    <strong>
                                        {request.vehicle ||
                                            "Not available"}
                                    </strong>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* PROBLEM */}

                    <div className="card border-0 shadow-sm mb-4">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                🔧 Service Information
                            </h5>

                            <div className="mb-4">

                                <small className="text-muted d-block mb-1">
                                    Problem Description
                                </small>

                                <div className="bg-light rounded p-3">
                                    {request.issueDescription ||
                                        "No description provided."}
                                </div>

                            </div>

                            <div>

                                <small className="text-muted d-block mb-1">
                                    📍 Service Location
                                </small>

                                <div className="fw-semibold">
                                    {request.location ||
                                        "Location unavailable"}
                                </div>

                            </div>

                        </div>

                    </div>


                    {/* IMAGES */}

                    {request.images &&
                        request.images.length > 0 && (

                            <div className="card border-0 shadow-sm mb-4">

                                <div className="card-body p-4">

                                    <h5 className="fw-bold mb-4">
                                        📷 Customer Images
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

                    {/* SUMMARY */}

                    <div className="card border-0 shadow-sm mb-4">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                📋 Request Summary
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

                            <div>

                                <span className="text-muted d-block mb-1">
                                    Created
                                </span>

                                <span>
                                    {request.createdAt
                                        ? new Date(
                                            request.createdAt
                                        ).toLocaleString("en-IN")
                                        : "—"}
                                </span>

                            </div>

                        </div>

                    </div>


                    {/* ACTIONS */}

                    <div className="card border-0 shadow-sm">

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-4">
                                ⚙️ Actions
                            </h5>


                            {request.status === "PENDING" && (

                                <div className="d-grid gap-2">

                                    <button
                                        className="btn btn-success"
                                        onClick={handleAccept}
                                        disabled={actionLoading}
                                    >
                                        ✓ Accept Request
                                    </button>

                                    <button
                                        className="btn btn-outline-danger"
                                        onClick={handleReject}
                                        disabled={actionLoading}
                                    >
                                        ✕ Reject Request
                                    </button>

                                </div>

                            )}


                            {request.status === "WAITING_FOR_QUOTATION" && (

                                <div>

                                    <div className="alert alert-info small">
                                        💰 The customer is waiting for your quotation.
                                    </div>

                                    <form onSubmit={handleCreateQuotation}>

                                        {/* Labour */}

                                        <div className="mb-3">

                                            <label className="form-label fw-semibold">
                                                Labour Charge
                                            </label>

                                            <div className="input-group">

                    <span className="input-group-text">
                        ₹
                    </span>

                                                <input
                                                    type="number"
                                                    name="labourCharge"
                                                    className="form-control"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={quotation.labourCharge}
                                                    onChange={handleQuotationChange}
                                                    required
                                                />

                                            </div>

                                        </div>


                                        {/* Parts */}

                                        <div className="mb-3">

                                            <label className="form-label fw-semibold">
                                                Parts Charge
                                            </label>

                                            <div className="input-group">

                    <span className="input-group-text">
                        ₹
                    </span>

                                                <input
                                                    type="number"
                                                    name="partsCharge"
                                                    className="form-control"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={quotation.partsCharge}
                                                    onChange={handleQuotationChange}
                                                    required
                                                />

                                            </div>

                                        </div>


                                        {/* Travel */}

                                        <div className="mb-3">

                                            <label className="form-label fw-semibold">
                                                Travel Fee
                                            </label>

                                            <div className="input-group">

                    <span className="input-group-text">
                        ₹
                    </span>

                                                <input
                                                    type="number"
                                                    name="travelFee"
                                                    className="form-control"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={quotation.travelFee}
                                                    onChange={handleQuotationChange}
                                                    required
                                                />

                                            </div>

                                        </div>


                                        {/* Total */}

                                        <div className="bg-light border rounded p-3 mb-3">

                                            <div className="d-flex justify-content-between">

                    <span className="text-muted">
                        Total
                    </span>

                                                <strong className="fs-5">
                                                    ₹
                                                    {(
                                                        Number(quotation.labourCharge || 0) +
                                                        Number(quotation.partsCharge || 0) +
                                                        Number(quotation.travelFee || 0)
                                                    ).toFixed(2)}
                                                </strong>

                                            </div>

                                        </div>


                                        <button
                                            type="submit"
                                            className="btn btn-warning w-100"
                                            disabled={quotationLoading}
                                        >

                                            {quotationLoading
                                                ? "Sending..."
                                                : "💰 Send Quotation"}

                                        </button>

                                    </form>

                                </div>

                            )}


                            {request.status === "IN_PROGRESS" && (

                                <button
                                    className="btn btn-success w-100"
                                    onClick={handleComplete}
                                    disabled={actionLoading}
                                >
                                    ✓ Complete Work
                                </button>

                            )}


                            {request.status === "COMPLETED" && (

                                <div className="alert alert-success mb-0">
                                    ✓ This service has been completed.
                                </div>

                            )}


                            {request.status === "REJECTED" && (

                                <div className="alert alert-danger mb-0">
                                    This request was rejected.
                                </div>

                            )}


                            {request.status === "CANCELLED" && (

                                <div className="alert alert-secondary mb-0">
                                    This request was cancelled.
                                </div>

                            )}

                        </div>

                    </div>

                </div>

            </div>

        </MechanicLayout>

    );

}

export default RequestDetails;