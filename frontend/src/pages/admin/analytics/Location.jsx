import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getLocationAnalytics } from "../../../services/adminService";

function Location() {

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const data = await getLocationAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error(
                "Failed to load location analytics:",
                error
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="text-center mt-5">
                    Loading location analytics...
                </div>
            </AdminLayout>
        );
    }

    if (!analytics) {
        return (
            <AdminLayout>
                <div className="alert alert-danger">
                    Failed to load location analytics.
                </div>
            </AdminLayout>
        );
    }

    const hotspots = analytics.hotspots || [];

    return (
        <AdminLayout>

            {/* Header */}

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 className="fw-bold mb-1">
                        Location Analytics
                    </h2>

                    <p className="text-muted mb-0">
                        Discover where RoadAid service demand is concentrated.
                    </p>
                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={() => window.history.back()}
                >
                    ← Back
                </button>

            </div>

            {/* KPI Cards */}

            <div className="row g-4 mb-4">

                <div className="col-md-4">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius: "16px" }}
                    >

                        <div className="card-body p-4">

                            <div className="d-flex justify-content-between">

                                <div>
                                    <p className="text-muted mb-2">
                                        Request Locations
                                    </p>

                                    <h2 className="fw-bold mb-0">
                                        {analytics.totalLocations}
                                    </h2>
                                </div>

                                <span style={{ fontSize: "28px" }}>
                                    📍
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

                <div className="col-md-4">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius: "16px" }}
                    >

                        <div className="card-body p-4">

                            <div className="d-flex justify-content-between">

                                <div>

                                    <p className="text-muted mb-2">
                                        Top Request Area
                                    </p>

                                    <h4 className="fw-bold mb-0">
                                        {analytics.topLocation}
                                    </h4>

                                </div>

                                <span style={{ fontSize: "28px" }}>
                                    🔥
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

                <div className="col-md-4">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius: "16px" }}
                    >

                        <div className="card-body p-4">

                            <div className="d-flex justify-content-between">

                                <div>

                                    <p className="text-muted mb-2">
                                        Requests in Top Area
                                    </p>

                                    <h2 className="fw-bold mb-0">
                                        {analytics.topLocationRequests}
                                    </h2>

                                </div>

                                <span style={{ fontSize: "28px" }}>
                                    📊
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* Main Content */}

            <div className="row g-4">

                {/* Hotspots */}

                <div className="col-lg-7">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius: "16px" }}
                    >

                        <div className="card-body p-4">

                            <div className="mb-4">

                                <h5 className="fw-bold mb-1">
                                    Request Hotspots
                                </h5>

                                <p className="text-muted mb-0">
                                    Areas generating the highest service demand.
                                </p>

                            </div>

                            {hotspots.length === 0 ? (

                                <p className="text-muted">
                                    No location data available.
                                </p>

                            ) : (

                                <div className="table-responsive">

                                    <table className="table align-middle mb-0">

                                        <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Location</th>
                                            <th>Requests</th>
                                            <th>Share</th>
                                        </tr>
                                        </thead>

                                        <tbody>

                                        {hotspots.map(
                                            (item, index) => (

                                                <tr key={item.location}>

                                                    <td>
                                                            <span className="fw-bold">
                                                                {index + 1}
                                                            </span>
                                                    </td>

                                                    <td>
                                                            <span className="fw-semibold">
                                                                {item.location}
                                                            </span>
                                                    </td>

                                                    <td>
                                                        {item.requests}
                                                    </td>

                                                    <td style={{ minWidth: "130px" }}>

                                                        <div className="d-flex align-items-center gap-2">

                                                            <div
                                                                className="progress flex-grow-1"
                                                                style={{
                                                                    height: "7px"
                                                                }}
                                                            >
                                                                <div
                                                                    className="progress-bar"
                                                                    style={{
                                                                        width: `${item.percentage}%`
                                                                    }}
                                                                />
                                                            </div>

                                                            <small>
                                                                {item.percentage.toFixed(1)}%
                                                            </small>

                                                        </div>

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

                {/* Demand Summary */}

                <div className="col-lg-5">

                    <div
                        className="card border-0 shadow-sm h-100"
                        style={{ borderRadius: "16px" }}
                    >

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-1">
                                Demand Overview
                            </h5>

                            <p className="text-muted mb-4">
                                Quick view of request concentration.
                            </p>

                            {hotspots.slice(0, 5).map(
                                (item, index) => (

                                    <div
                                        className="mb-4"
                                        key={item.location}
                                    >

                                        <div className="d-flex justify-content-between mb-2">

                                            <span className="fw-semibold">
                                                {item.location}
                                            </span>

                                            <span className="text-muted">
                                                {item.requests} requests
                                            </span>

                                        </div>

                                        <div
                                            className="progress"
                                            style={{ height: "8px" }}
                                        >

                                            <div
                                                className="progress-bar"
                                                style={{
                                                    width: `${item.percentage}%`
                                                }}
                                            />

                                        </div>

                                    </div>

                                )
                            )}

                            {hotspots.length === 0 && (
                                <p className="text-muted">
                                    No demand data available.
                                </p>
                            )}

                        </div>

                    </div>

                </div>

            </div>

            {/* Future Live Map */}

            <div
                className="card border-0 shadow-sm mt-4"
                style={{
                    borderRadius: "16px",
                    background: "#f7f9fc"
                }}
            >

                <div className="card-body p-4 text-center">

                    <div style={{ fontSize: "36px" }}>
                        🗺️
                    </div>

                    <h5 className="fw-bold mt-2">
                        Live RoadAid Map
                    </h5>

                    <p
                        className="text-muted mb-0"
                        style={{ maxWidth: "650px", margin: "auto" }}
                    >
                        A real-time map with customer requests,
                        available providers and active service locations
                        can be integrated here in a future release.
                    </p>

                </div>

            </div>

        </AdminLayout>
    );
}

export default Location;