import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";
import { getMyRequests } from "../../services/mechanicService";

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

            const response = await getMyRequests();

            setRequests(response.data);

        } catch (error) {

            console.error(
                "Failed to load requests:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load service requests."
            );

        } finally {

            setLoading(false);

        }

    };


    /* ============================
       FILTER
    ============================ */

    const filteredRequests =
        filter === "ALL"
            ? requests
            : requests.filter(
                request =>
                    request.status === filter
            );


    /* ============================
       STATUS BADGE
    ============================ */

    const getStatusBadge = (status) => {

        switch (status) {

            case "PENDING":
                return (
                    <span className="badge bg-warning text-dark">
                        ⏳ Pending
                    </span>
                );

            case "WAITING_FOR_QUOTATION":
                return (
                    <span className="badge bg-info text-dark">
                        💰 Quotation Required
                    </span>
                );

            case "IN_PROGRESS":
                return (
                    <span className="badge bg-primary">
                        🔧 In Progress
                    </span>
                );

            case "COMPLETED":
                return (
                    <span className="badge bg-success">
                        ✓ Completed
                    </span>
                );

            case "REJECTED":
                return (
                    <span className="badge bg-danger">
                        ✕ Rejected
                    </span>
                );

            case "CANCELLED":
                return (
                    <span className="badge bg-secondary">
                        Cancelled
                    </span>
                );

            default:
                return (
                    <span className="badge bg-secondary">
                        {status}
                    </span>
                );

        }

    };


    /* ============================
       LOADING
    ============================ */

    if (loading) {

        return (

            <MechanicLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading your requests...
                        </p>

                    </div>

                </div>

            </MechanicLayout>

        );

    }


    return (

        <MechanicLayout>

            {/* ============================
                HEADER
            ============================ */}

            <div className="d-flex justify-content-between align-items-start mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        My Requests
                    </h2>

                    <p className="text-muted mb-0">
                        Manage and track your assigned service requests.
                    </p>

                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={loadRequests}
                >
                    🔄 Refresh
                </button>

            </div>


            {/* ============================
                FILTERS
            ============================ */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <div className="d-flex flex-wrap gap-2">

                        <button
                            className={
                                filter === "ALL"
                                    ? "btn btn-primary"
                                    : "btn btn-outline-primary"
                            }
                            onClick={() =>
                                setFilter("ALL")
                            }
                        >
                            All ({requests.length})
                        </button>


                        <button
                            className={
                                filter === "PENDING"
                                    ? "btn btn-warning"
                                    : "btn btn-outline-warning"
                            }
                            onClick={() =>
                                setFilter("PENDING")
                            }
                        >
                            Pending ({
                            requests.filter(
                                r =>
                                    r.status === "PENDING"
                            ).length
                        })
                        </button>


                        <button
                            className={
                                filter === "WAITING_FOR_QUOTATION"
                                    ? "btn btn-info"
                                    : "btn btn-outline-info"
                            }
                            onClick={() =>
                                setFilter(
                                    "WAITING_FOR_QUOTATION"
                                )
                            }
                        >
                            Quotations ({
                            requests.filter(
                                r =>
                                    r.status ===
                                    "WAITING_FOR_QUOTATION"
                            ).length
                        })
                        </button>


                        <button
                            className={
                                filter === "IN_PROGRESS"
                                    ? "btn btn-primary"
                                    : "btn btn-outline-primary"
                            }
                            onClick={() =>
                                setFilter("IN_PROGRESS")
                            }
                        >
                            In Progress ({
                            requests.filter(
                                r =>
                                    r.status ===
                                    "IN_PROGRESS"
                            ).length
                        })
                        </button>


                        <button
                            className={
                                filter === "COMPLETED"
                                    ? "btn btn-success"
                                    : "btn btn-outline-success"
                            }
                            onClick={() =>
                                setFilter("COMPLETED")
                            }
                        >
                            Completed ({
                            requests.filter(
                                r =>
                                    r.status ===
                                    "COMPLETED"
                            ).length
                        })
                        </button>

                    </div>

                </div>

            </div>


            {/* ============================
                ERROR
            ============================ */}

            {error && (

                <div className="alert alert-danger">

                    <strong>
                        Unable to load requests
                    </strong>

                    <p className="mb-2">
                        {error}
                    </p>

                    <button
                        className="btn btn-danger btn-sm"
                        onClick={loadRequests}
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* ============================
                EMPTY STATE
            ============================ */}

            {!error &&
                filteredRequests.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                📭
                            </div>

                            <h5 className="fw-bold">
                                No Requests Found
                            </h5>

                            <p className="text-muted mb-0">
                                There are no service requests
                                in this category.
                            </p>

                        </div>

                    </div>

                )}


            {/* ============================
                REQUEST CARDS
            ============================ */}

            {!error &&
                filteredRequests.length > 0 && (

                    <div className="row g-4">

                        {filteredRequests.map(
                            request => (

                                <div
                                    className="col-12 col-lg-6"
                                    key={request.requestId}
                                >

                                    <div className="card border-0 shadow-sm h-100">

                                        <div className="card-body p-4">

                                            {/* HEADER */}

                                            <div className="d-flex justify-content-between align-items-start mb-3">

                                                <div>

                                                    <small className="text-muted">
                                                        Service Request
                                                    </small>

                                                    <h5 className="fw-bold mb-0">
                                                        #
                                                        {
                                                            request.requestId
                                                        }
                                                    </h5>

                                                </div>

                                                {getStatusBadge(
                                                    request.status
                                                )}

                                            </div>


                                            <hr />


                                            {/* CUSTOMER */}

                                            <div className="mb-3">

                                                <small className="text-muted d-block mb-1">
                                                    👤 Customer
                                                </small>

                                                <strong>
                                                    {
                                                        request.customerName ||
                                                        "Customer"
                                                    }
                                                </strong>

                                            </div>


                                            {/* VEHICLE */}

                                            <div className="mb-3">

                                                <small className="text-muted d-block mb-1">
                                                    🚗 Vehicle
                                                </small>

                                                <span>
                                                    {
                                                        request.vehicle ||
                                                        "Vehicle information unavailable"
                                                    }
                                                </span>

                                            </div>


                                            {/* ISSUE */}

                                            <div className="mb-3">

                                                <small className="text-muted d-block mb-1">
                                                    🔧 Problem
                                                </small>

                                                <span>
                                                    {
                                                        request.issue ||
                                                        "No description provided"
                                                    }
                                                </span>

                                            </div>


                                            {/* LOCATION */}

                                            <div className="mb-4">

                                                <small className="text-muted d-block mb-1">
                                                    📍 Location
                                                </small>

                                                <span>
                                                    {
                                                        request.location ||
                                                        "Location unavailable"
                                                    }
                                                </span>

                                            </div>


                                            {/* ACTION */}

                                            <button
                                                className="btn btn-outline-primary w-100"
                                                onClick={() =>
                                                    navigate(
                                                        `/mechanic/requests/${request.requestId}`
                                                    )
                                                }
                                            >
                                                View Request Details →
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            )
                        )}

                    </div>

                )}

        </MechanicLayout>

    );

}

export default Requests;