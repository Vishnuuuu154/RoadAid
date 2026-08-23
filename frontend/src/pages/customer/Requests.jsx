import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function Requests() {

    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [filter, setFilter] = useState("ALL");

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await api.get("/requests/my");

            setRequests(response.data);

        } catch (error) {

            console.error(
                "Failed to load requests:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load your requests."
            );

        } finally {

            setLoading(false);

        }
    };


    /*
     * Status helpers
     */

    const getStatusInfo = (status) => {

        switch (status) {

            case "PENDING":
                return {
                    label: "Pending",
                    className: "bg-warning text-dark",
                    dot: "🟡"
                };

            case "WAITING_FOR_QUOTATION":
                return {
                    label: "Waiting for Quotation",
                    className: "bg-info text-dark",
                    dot: "🔵"
                };

            case "QUOTATION_PENDING":
                return {
                    label: "Quotation Pending",
                    className: "bg-warning text-dark",
                    dot: "🟠"
                };

            case "ACCEPTED":
                return {
                    label: "Accepted",
                    className: "bg-success",
                    dot: "🟢"
                };

            case "IN_PROGRESS":
                return {
                    label: "In Progress",
                    className: "bg-primary",
                    dot: "🔵"
                };

            case "COMPLETED":
            case "CLOSED":
                return {
                    label: "Completed",
                    className: "bg-success",
                    dot: "✅"
                };

            case "REJECTED":
                return {
                    label: "Rejected",
                    className: "bg-danger",
                    dot: "🔴"
                };

            case "CANCELLED":
                return {
                    label: "Cancelled",
                    className: "bg-secondary",
                    dot: "⚫"
                };

            default:
                return {
                    label: status || "Unknown",
                    className: "bg-secondary",
                    dot: "⚪"
                };
        }
    };


    /*
     * Filter requests
     */

    const filteredRequests = useMemo(() => {

        if (filter === "ALL") {
            return requests;
        }

        if (filter === "ACTIVE") {

            return requests.filter((request) =>
                [
                    "PENDING",
                    "WAITING_FOR_QUOTATION",
                    "QUOTATION_PENDING",
                    "ACCEPTED",
                    "IN_PROGRESS"
                ].includes(request.status)
            );
        }

        if (filter === "COMPLETED") {

            return requests.filter((request) =>
                ["COMPLETED", "CLOSED"]
                    .includes(request.status)
            );
        }

        if (filter === "CANCELLED") {

            return requests.filter((request) =>
                ["CANCELLED", "REJECTED"]
                    .includes(request.status)
            );
        }

        return requests;

    }, [requests, filter]);


    const activeCount = requests.filter((request) =>
        [
            "PENDING",
            "WAITING_FOR_QUOTATION",
            "QUOTATION_PENDING",
            "ACCEPTED",
            "IN_PROGRESS"
        ].includes(request.status)
    ).length;


    const completedCount = requests.filter((request) =>
        ["COMPLETED", "CLOSED"]
            .includes(request.status)
    ).length;


    const cancelledCount = requests.filter((request) =>
        ["CANCELLED", "REJECTED"]
            .includes(request.status)
    ).length;


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


    return (

        <CustomerLayout>

            {/* PAGE HEADER */}

            <div className="mb-4">

                <h2 className="fw-bold mb-1">
                    📋 My Requests
                </h2>

                <p className="text-muted mb-0">
                    View and track all your RoadAid service requests.
                </p>

            </div>


            {/* SUMMARY */}

            {!loading && !error && (

                <div className="row g-3 mb-4">

                    <div className="col-6 col-lg-3">

                        <div className="card border-0 shadow-sm h-100">

                            <div className="card-body">

                                <small className="text-muted">
                                    Total Requests
                                </small>

                                <h3 className="fw-bold mb-0 mt-1">
                                    {requests.length}
                                </h3>

                            </div>

                        </div>

                    </div>


                    <div className="col-6 col-lg-3">

                        <div className="card border-0 shadow-sm h-100">

                            <div className="card-body">

                                <small className="text-muted">
                                    Active
                                </small>

                                <h3 className="fw-bold text-primary mb-0 mt-1">
                                    {activeCount}
                                </h3>

                            </div>

                        </div>

                    </div>


                    <div className="col-6 col-lg-3">

                        <div className="card border-0 shadow-sm h-100">

                            <div className="card-body">

                                <small className="text-muted">
                                    Completed
                                </small>

                                <h3 className="fw-bold text-success mb-0 mt-1">
                                    {completedCount}
                                </h3>

                            </div>

                        </div>

                    </div>


                    <div className="col-6 col-lg-3">

                        <div className="card border-0 shadow-sm h-100">

                            <div className="card-body">

                                <small className="text-muted">
                                    Cancelled / Rejected
                                </small>

                                <h3 className="fw-bold text-secondary mb-0 mt-1">
                                    {cancelledCount}
                                </h3>

                            </div>

                        </div>

                    </div>

                </div>

            )}


            {/* FILTERS */}

            {!loading && !error && requests.length > 0 && (

                <div className="card border-0 shadow-sm mb-4">

                    <div className="card-body p-3">

                        <div className="d-flex flex-wrap gap-2">

                            <button
                                className={`btn ${
                                    filter === "ALL"
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                }`}
                                onClick={() =>
                                    setFilter("ALL")
                                }
                            >
                                All ({requests.length})
                            </button>

                            <button
                                className={`btn ${
                                    filter === "ACTIVE"
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                }`}
                                onClick={() =>
                                    setFilter("ACTIVE")
                                }
                            >
                                Active ({activeCount})
                            </button>

                            <button
                                className={`btn ${
                                    filter === "COMPLETED"
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                }`}
                                onClick={() =>
                                    setFilter("COMPLETED")
                                }
                            >
                                Completed ({completedCount})
                            </button>

                            <button
                                className={`btn ${
                                    filter === "CANCELLED"
                                        ? "btn-primary"
                                        : "btn-outline-primary"
                                }`}
                                onClick={() =>
                                    setFilter("CANCELLED")
                                }
                            >
                                Cancelled / Rejected ({cancelledCount})
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* LOADING */}

            {loading && (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading your requests...
                        </p>

                    </div>

                </div>

            )}


            {/* ERROR */}

            {!loading && error && (

                <div className="alert alert-danger">

                    <strong>
                        Unable to load requests.
                    </strong>

                    <div className="mt-1">
                        {error}
                    </div>

                    <button
                        className="btn btn-sm btn-danger mt-3"
                        onClick={loadRequests}
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* EMPTY */}

            {!loading &&
                !error &&
                requests.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div
                                className="fs-1 mb-3"
                            >
                                📋
                            </div>

                            <h5 className="fw-bold">
                                No Requests Yet
                            </h5>

                            <p className="text-muted mb-4">
                                You haven't created any roadside
                                assistance requests yet.
                            </p>

                            <button
                                className="btn btn-primary"
                                onClick={() =>
                                    navigate(
                                        "/customer/request-help"
                                    )
                                }
                            >
                                🚨 Request Roadside Help
                            </button>

                        </div>

                    </div>

                )}


            {/* NO FILTER RESULTS */}

            {!loading &&
                !error &&
                requests.length > 0 &&
                filteredRequests.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-2">
                                🔎
                            </div>

                            <h5 className="fw-bold">
                                No Matching Requests
                            </h5>

                            <p className="text-muted mb-0">
                                There are no requests in this category.
                            </p>

                        </div>

                    </div>

                )}


            {/* REQUEST LIST */}

            {!loading &&
                !error &&
                filteredRequests.length > 0 && (

                    <div className="d-flex flex-column gap-3">

                        {filteredRequests.map((request) => {

                            const status =
                                getStatusInfo(
                                    request.status
                                );

                            return (

                                <div
                                    className="card border-0 shadow-sm"
                                    key={request.requestId}
                                >

                                    <div className="card-body p-4">

                                        {/* TOP ROW */}

                                        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">

                                            <div>

                                                <div className="d-flex align-items-center gap-2 mb-1">

                                                    <h5 className="fw-bold mb-0">
                                                        Request #{request.requestId}
                                                    </h5>

                                                    <span
                                                        className={`badge ${status.className}`}
                                                    >
                                                        {status.dot}{" "}
                                                        {status.label}
                                                    </span>

                                                </div>

                                                <small className="text-muted">
                                                    Created{" "}
                                                    {formatDate(
                                                        request.createdAt
                                                    )}
                                                </small>

                                            </div>


                                            <button
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() =>
                                                    navigate(
                                                        `/customer/requests/${request.requestId}`
                                                    )
                                                }
                                            >
                                                View Details →
                                            </button>

                                        </div>


                                        <hr />


                                        {/* REQUEST INFORMATION */}

                                        <div className="row g-3">

                                            <div className="col-md-5">

                                                <small className="text-muted d-block mb-1">
                                                    Problem
                                                </small>

                                                <span className="fw-semibold">
                                                    {request.issue ||
                                                        "Not specified"}
                                                </span>

                                            </div>


                                            <div className="col-md-4">

                                                <small className="text-muted d-block mb-1">
                                                    Mechanic
                                                </small>

                                                <span className="fw-semibold">
                                                    {request.mechanic ||
                                                        "Not Assigned"}
                                                </span>

                                            </div>


                                            <div className="col-md-3">

                                                <small className="text-muted d-block mb-1">
                                                    Status
                                                </small>

                                                <span>
                                                    {status.dot}{" "}
                                                    {status.label}
                                                </span>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            );

                        })}

                    </div>

                )}

        </CustomerLayout>

    );
}

export default Requests;