import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";

import {
    getMyProfile,
    updateAvailability,
    getMyRequests,
    acceptRequest,
    rejectRequest,
    completeRequest
} from "../../services/mechanicService";


function Dashboard() {

    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [requests, setRequests] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updatingAvailability, setUpdatingAvailability] = useState(false);


    /* =========================================
       LOAD DASHBOARD
    ========================================= */

    useEffect(() => {
        loadDashboard();
    }, []);


    const loadDashboard = async () => {

        try {

            const [
                profileResponse,
                requestsResponse
            ] = await Promise.all([
                getMyProfile(),
                getMyRequests()
            ]);

            setProfile(profileResponse.data);
            setRequests(requestsResponse.data);

        } catch (error) {

            console.error(
                "Failed to load dashboard:",
                error
            );

        } finally {

            setLoading(false);
            setRefreshing(false);

        }

    };


    /* =========================================
       REFRESH
    ========================================= */

    const handleRefresh = async () => {

        setRefreshing(true);

        await loadDashboard();

    };


    /* =========================================
       AVAILABILITY
    ========================================= */

    const handleAvailability = async () => {

        if (!profile) {
            return;
        }

        try {

            setUpdatingAvailability(true);

            const response =
                await updateAvailability(
                    !profile.available
                );

            setProfile(response.data);

        } catch (error) {

            console.error(
                "Failed to update availability:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to update availability."
            );

        } finally {

            setUpdatingAvailability(false);

        }

    };


    /* =========================================
       ACCEPT REQUEST
    ========================================= */

    const handleAccept = async (requestId) => {

        if (!window.confirm(
            "Accept this service request?"
        )) {
            return;
        }

        try {

            await acceptRequest(requestId);

            await loadDashboard();

        } catch (error) {

            console.error(
                "Failed to accept request:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to accept request."
            );

        }

    };


    /* =========================================
       REJECT REQUEST
    ========================================= */

    const handleReject = async (requestId) => {

        if (!window.confirm(
            "Reject this service request?"
        )) {
            return;
        }

        try {

            await rejectRequest(requestId);

            await loadDashboard();

        } catch (error) {

            console.error(
                "Failed to reject request:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to reject request."
            );

        }

    };


    /* =========================================
       COMPLETE SERVICE
    ========================================= */

    const handleComplete = async (requestId) => {

        if (!window.confirm(
            "Mark this service as completed?"
        )) {
            return;
        }

        try {

            await completeRequest(requestId);

            alert(
                "Service marked as completed."
            );

            await loadDashboard();

        } catch (error) {

            console.error(
                "Failed to complete request:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to complete service."
            );

        }

    };


    /* =========================================
       REQUEST GROUPS
    ========================================= */

    const pendingRequests =
        requests.filter(
            request =>
                request.status === "PENDING"
        );


    const quotationRequests =
        requests.filter(
            request =>
                request.status ===
                "WAITING_FOR_QUOTATION"
        );


    const inProgressRequests =
        requests.filter(
            request =>
                request.status ===
                "IN_PROGRESS"
        );


    const completedRequests =
        requests.filter(
            request =>
                request.status ===
                "COMPLETED"
        );


    /* =========================================
       STATUS BADGE
    ========================================= */

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
                        💰 Quotation Needed
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
                        {status || "Unknown"}
                    </span>
                );

        }

    };


    /* =========================================
       LOADING
    ========================================= */

    if (loading) {

        return (

            <MechanicLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading mechanic dashboard...
                        </p>

                    </div>

                </div>

            </MechanicLayout>

        );

    }


    /* =========================================
       PAGE
    ========================================= */

    return (

        <MechanicLayout>

            {/* =========================================
                PAGE HEADER
            ========================================= */}

            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        Mechanic Dashboard
                    </h2>

                    <p className="text-muted mb-0">
                        Manage your roadside assistance work.
                    </p>

                </div>


                <button
                    className="btn btn-outline-secondary"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >

                    🔄{" "}

                    {refreshing
                        ? "Refreshing..."
                        : "Refresh"}

                </button>

            </div>


            {/* =========================================
                PROFILE / AVAILABILITY
            ========================================= */}

            {profile && (

                <div className="card border-0 shadow-sm mb-4">

                    <div className="card-body p-4">

                        <div className="row align-items-center">

                            {/* PROFILE */}

                            <div className="col-lg-8">

                                <div className="d-flex align-items-center">

                                    <div
                                        className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                                        style={{
                                            width: "64px",
                                            height: "64px",
                                            fontSize: "28px"
                                        }}
                                    >
                                        🔧
                                    </div>


                                    <div className="ms-3">

                                        <h4 className="fw-bold mb-1">

                                            Welcome,{" "}

                                            {profile.user?.fullName ||
                                                "Mechanic"}

                                        </h4>


                                        <p className="text-muted mb-1">

                                            {profile.workshopName ||
                                                "Independent Mechanic"}

                                        </p>


                                        <small className="text-muted">

                                            📍{" "}

                                            {profile.workshopAddress ||
                                                "Location unavailable"}

                                        </small>

                                    </div>

                                </div>

                            </div>


                            {/* AVAILABILITY */}

                            <div className="col-lg-4 mt-4 mt-lg-0">

                                <div className="border rounded p-3">

                                    <div className="d-flex justify-content-between align-items-center gap-3">

                                        <div>

                                            <small className="text-muted d-block mb-1">
                                                Availability
                                            </small>


                                            <strong
                                                className={
                                                    profile.available
                                                        ? "text-success"
                                                        : "text-secondary"
                                                }
                                            >

                                                {profile.available
                                                    ? "🟢 Available"
                                                    : "⚫ Offline"}

                                            </strong>

                                        </div>


                                        <button
                                            className={
                                                profile.available
                                                    ? "btn btn-outline-danger btn-sm"
                                                    : "btn btn-success btn-sm"
                                            }
                                            onClick={
                                                handleAvailability
                                            }
                                            disabled={
                                                updatingAvailability
                                            }
                                        >

                                            {updatingAvailability
                                                ? "Updating..."
                                                : profile.available
                                                    ? "Go Offline"
                                                    : "Go Available"}

                                        </button>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            )}


            {/* =========================================
                STATISTICS
            ========================================= */}

            <div className="row g-3 mb-4">

                {/* TOTAL */}

                <div className="col-6 col-xl-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between">

                                <div>

                                    <small className="text-muted">
                                        Total Requests
                                    </small>

                                    <h2 className="fw-bold mb-0 mt-1">
                                        {requests.length}
                                    </h2>

                                </div>

                                <div className="fs-2">
                                    📋
                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                {/* PENDING */}

                <div className="col-6 col-xl-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between">

                                <div>

                                    <small className="text-muted">
                                        Pending
                                    </small>

                                    <h2 className="fw-bold mb-0 mt-1">
                                        {pendingRequests.length}
                                    </h2>

                                </div>

                                <div className="fs-2">
                                    ⏳
                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                {/* IN PROGRESS */}

                <div className="col-6 col-xl-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between">

                                <div>

                                    <small className="text-muted">
                                        In Progress
                                    </small>

                                    <h2 className="fw-bold mb-0 mt-1">
                                        {inProgressRequests.length}
                                    </h2>

                                </div>

                                <div className="fs-2">
                                    🔧
                                </div>

                            </div>

                        </div>

                    </div>

                </div>


                {/* COMPLETED */}

                <div className="col-6 col-xl-3">

                    <div className="card border-0 shadow-sm h-100">

                        <div className="card-body">

                            <div className="d-flex justify-content-between">

                                <div>

                                    <small className="text-muted">
                                        Completed
                                    </small>

                                    <h2 className="fw-bold mb-0 mt-1">
                                        {completedRequests.length}
                                    </h2>

                                </div>

                                <div className="fs-2">
                                    ✅
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>


            {/* =========================================
                ACTIVE SERVICE
            ========================================= */}

            {inProgressRequests.length > 0 && (

                <div className="card border-0 shadow-sm mb-4">

                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center mb-4">

                            <div>

                                <h5 className="fw-bold mb-1">
                                    🔧 Active Service
                                </h5>

                                <p className="text-muted mb-0">
                                    Work currently in progress.
                                </p>

                            </div>

                            <span className="badge bg-primary">
                                {inProgressRequests.length}
                            </span>

                        </div>


                        <div className="row g-3">

                            {inProgressRequests.map(
                                request => (

                                    <div
                                        className="col-12"
                                        key={request.requestId}
                                    >

                                        <div className="border rounded p-4">

                                            <div className="row align-items-center">

                                                <div className="col-lg-8">

                                                    <div className="d-flex justify-content-between align-items-start mb-3">

                                                        <div>

                                                            <small className="text-muted">
                                                                Request #
                                                                {request.requestId}
                                                            </small>

                                                            <h5 className="fw-bold mb-0 mt-1">
                                                                {request.customerName}
                                                            </h5>

                                                        </div>

                                                        {getStatusBadge(
                                                            request.status
                                                        )}

                                                    </div>


                                                    <div className="row g-3">

                                                        <div className="col-md-4">

                                                            <small className="text-muted d-block">
                                                                Vehicle
                                                            </small>

                                                            <span className="fw-semibold">
                                                                🚗{" "}
                                                                {request.vehicle}
                                                            </span>

                                                        </div>


                                                        <div className="col-md-4">

                                                            <small className="text-muted d-block">
                                                                Issue
                                                            </small>

                                                            <span>
                                                                🔧{" "}
                                                                {request.issue}
                                                            </span>

                                                        </div>


                                                        <div className="col-md-4">

                                                            <small className="text-muted d-block">
                                                                Location
                                                            </small>

                                                            <span>
                                                                📍{" "}
                                                                {request.location}
                                                            </span>

                                                        </div>

                                                    </div>

                                                </div>


                                                <div className="col-lg-4 text-lg-end mt-4 mt-lg-0">

                                                    <div className="d-flex flex-column gap-2">

                                                        <button
                                                            className="btn btn-outline-primary"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/mechanic/requests/${request.requestId}`
                                                                )
                                                            }
                                                        >
                                                            View Details
                                                        </button>


                                                        <button
                                                            className="btn btn-success"
                                                            onClick={() =>
                                                                handleComplete(
                                                                    request.requestId
                                                                )
                                                            }
                                                        >
                                                            ✓ Complete Work
                                                        </button>

                                                    </div>

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    </div>

                </div>

            )}


            {/* =========================================
                INCOMING REQUESTS
            ========================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-4">

                        <div>

                            <h5 className="fw-bold mb-1">
                                📥 Incoming Requests
                            </h5>

                            <p className="text-muted mb-0">
                                New requests waiting for your response.
                            </p>

                        </div>

                        <span className="badge bg-warning text-dark">
                            {pendingRequests.length}
                        </span>

                    </div>


                    {pendingRequests.length === 0 ? (

                        <div className="text-center py-4">

                            <div className="fs-1 mb-2">
                                📭
                            </div>

                            <h6 className="fw-bold">
                                No Pending Requests
                            </h6>

                            <p className="text-muted mb-0">
                                New service requests will appear here.
                            </p>

                        </div>

                    ) : (

                        <div className="row g-3">

                            {pendingRequests.map(
                                request => (

                                    <div
                                        className="col-lg-6"
                                        key={request.requestId}
                                    >

                                        <div className="border rounded p-4 h-100">

                                            <div className="d-flex justify-content-between align-items-start mb-3">

                                                <div>

                                                    <small className="text-muted">
                                                        Request #
                                                        {request.requestId}
                                                    </small>

                                                    <h6 className="fw-bold mb-0 mt-1">
                                                        {request.customerName}
                                                    </h6>

                                                </div>

                                                {getStatusBadge(
                                                    request.status
                                                )}

                                            </div>


                                            <div className="mb-4">

                                                <div className="mb-2">
                                                    🚗{" "}
                                                    <strong>
                                                        {request.vehicle}
                                                    </strong>
                                                </div>

                                                <div className="text-muted mb-2">
                                                    🔧{" "}
                                                    {request.issue}
                                                </div>

                                                <div className="text-muted">
                                                    📍{" "}
                                                    {request.location}
                                                </div>

                                            </div>


                                            <div className="d-flex gap-2">

                                                <button
                                                    className="btn btn-success flex-grow-1"
                                                    onClick={() =>
                                                        handleAccept(
                                                            request.requestId
                                                        )
                                                    }
                                                >
                                                    ✓ Accept
                                                </button>


                                                <button
                                                    className="btn btn-outline-danger"
                                                    onClick={() =>
                                                        handleReject(
                                                            request.requestId
                                                        )
                                                    }
                                                >
                                                    Reject
                                                </button>

                                            </div>


                                            <button
                                                className="btn btn-link w-100 mt-2 text-decoration-none"
                                                onClick={() =>
                                                    navigate(
                                                        `/mechanic/requests/${request.requestId}`
                                                    )
                                                }
                                            >
                                                View Full Request
                                            </button>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>

            </div>


            {/* =========================================
                QUOTATION REQUESTS
            ========================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-4">

                        <div>

                            <h5 className="fw-bold mb-1">
                                💰 Quotations
                            </h5>

                            <p className="text-muted mb-0">
                                Requests waiting for your quotation.
                            </p>

                        </div>

                        <span className="badge bg-info text-dark">
                            {quotationRequests.length}
                        </span>

                    </div>


                    {quotationRequests.length === 0 ? (

                        <div className="text-center py-3">

                            <p className="text-muted mb-0">
                                No quotations are currently required.
                            </p>

                        </div>

                    ) : (

                        <div className="row g-3">

                            {quotationRequests.map(
                                request => (

                                    <div
                                        className="col-lg-6"
                                        key={request.requestId}
                                    >

                                        <div className="border rounded p-4 h-100">

                                            <div className="d-flex justify-content-between align-items-start mb-3">

                                                <div>

                                                    <small className="text-muted">
                                                        Request #
                                                        {request.requestId}
                                                    </small>

                                                    <h6 className="fw-bold mb-0 mt-1">
                                                        {request.customerName}
                                                    </h6>

                                                </div>

                                                {getStatusBadge(
                                                    request.status
                                                )}

                                            </div>


                                            <p className="mb-2">

                                                🚗{" "}

                                                <strong>
                                                    {request.vehicle}
                                                </strong>

                                            </p>


                                            <p className="text-muted mb-4">

                                                🔧{" "}

                                                {request.issue}

                                            </p>


                                            <button
                                                className="btn btn-warning w-100"
                                                onClick={() =>
                                                    navigate(
                                                        `/mechanic/requests/${request.requestId}`
                                                    )
                                                }
                                            >
                                                💰 View & Send Quotation
                                            </button>

                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    )}

                </div>

            </div>


            {/* =========================================
                REQUEST HISTORY
            ========================================= */}

            <div className="card border-0 shadow-sm">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-4">

                        <div>

                            <h5 className="fw-bold mb-1">
                                📋 Request History
                            </h5>

                            <p className="text-muted mb-0">
                                Overview of your assigned requests.
                            </p>

                        </div>

                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() =>
                                navigate(
                                    "/mechanic/requests"
                                )
                            }
                        >
                            View All
                        </button>

                    </div>


                    {requests.length === 0 ? (

                        <div className="text-center py-5">

                            <div className="fs-1 mb-3">
                                📭
                            </div>

                            <h6 className="fw-bold">
                                No Service Requests
                            </h6>

                            <p className="text-muted mb-0">
                                Assigned requests will appear here.
                            </p>

                        </div>

                    ) : (

                        <div className="table-responsive">

                            <table className="table table-hover align-middle mb-0">

                                <thead>

                                <tr>

                                    <th>
                                        Request
                                    </th>

                                    <th>
                                        Customer
                                    </th>

                                    <th>
                                        Vehicle
                                    </th>

                                    <th>
                                        Location
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                                </thead>


                                <tbody>

                                {requests
                                    .slice(0, 5)
                                    .map(
                                        request => (

                                            <tr
                                                key={
                                                    request.requestId
                                                }
                                            >

                                                <td>
                                                    <strong>
                                                        #
                                                        {
                                                            request.requestId
                                                        }
                                                    </strong>
                                                </td>


                                                <td>
                                                    {
                                                        request.customerName
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        request.vehicle
                                                    }
                                                </td>


                                                <td>
                                                    {
                                                        request.location
                                                    }
                                                </td>


                                                <td>
                                                    {getStatusBadge(
                                                        request.status
                                                    )}
                                                </td>


                                                <td>

                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() =>
                                                            navigate(
                                                                `/mechanic/requests/${request.requestId}`
                                                            )
                                                        }
                                                    >
                                                        View
                                                    </button>

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

        </MechanicLayout>

    );

}


export default Dashboard;