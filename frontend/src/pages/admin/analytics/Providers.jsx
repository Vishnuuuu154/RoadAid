import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getProviderAnalytics } from "../../../services/adminService";

function Providers() {

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const data = await getProviderAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load provider analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="text-center mt-5">
                    Loading provider analytics...
                </div>
            </AdminLayout>
        );
    }

    if (!analytics) {
        return (
            <AdminLayout>
                <div className="alert alert-danger">
                    Failed to load provider analytics.
                </div>
            </AdminLayout>
        );
    }

    const total = analytics.totalProviders || 0;
    const approved = analytics.approvedProviders || 0;
    const pending = analytics.pendingProviders || 0;
    const rejected = analytics.rejectedProviders || 0;
    const online = analytics.onlineProviders || 0;
    const offline = analytics.offlineProviders || 0;
    const completed = analytics.totalCompletedJobs || 0;

    const percentage = (value, totalValue) =>
        totalValue > 0
            ? Math.round((value / totalValue) * 100)
            : 0;

    const approvalRate = percentage(approved, total);
    const onlineRate = percentage(online, approved);

    const cards = [
        {
            title: "Total Providers",
            value: total,
            icon: "👥",
            description: "Registered service providers"
        },
        {
            title: "Approved",
            value: approved,
            icon: "✓",
            description: "Verified providers"
        },
        {
            title: "Pending",
            value: pending,
            icon: "⏳",
            description: "Awaiting verification"
        },
        {
            title: "Rejected",
            value: rejected,
            icon: "✕",
            description: "Rejected applications"
        },
        {
            title: "Online",
            value: online,
            icon: "🟢",
            description: "Currently available"
        },
        {
            title: "Offline",
            value: offline,
            icon: "⚪",
            description: "Currently unavailable"
        },
        {
            title: "Completed Jobs",
            value: completed,
            icon: "🛠️",
            description: "Successfully completed"
        }
    ];

    return (
        <AdminLayout>

            {/* Header */}

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 className="fw-bold mb-1">
                        Provider Analytics
                    </h2>

                    <p className="text-muted mb-0">
                        Monitor provider availability, verification and performance.
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

                {cards.map((card) => (

                    <div
                        className="col-md-6 col-xl-3"
                        key={card.title}
                    >

                        <div
                            className="card border-0 shadow-sm h-100"
                            style={{
                                borderRadius: "16px",
                                transition: "transform 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform =
                                    "translateY(-3px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                    "translateY(0)";
                            }}
                        >

                            <div className="card-body p-4">

                                <div className="d-flex justify-content-between align-items-start">

                                    <div>

                                        <p className="text-muted mb-2">
                                            {card.title}
                                        </p>

                                        <h2 className="fw-bold mb-1">
                                            {card.value}
                                        </h2>

                                        <small className="text-muted">
                                            {card.description}
                                        </small>

                                    </div>

                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-3"
                                        style={{
                                            width: "48px",
                                            height: "48px",
                                            background: "#f3f6fa",
                                            fontSize: "23px"
                                        }}
                                    >
                                        {card.icon}
                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                ))}

            </div>

            {/* Provider Network Overview */}

            <div
                className="card border-0 shadow-sm mb-4"
                style={{ borderRadius: "16px" }}
            >

                <div className="card-body p-4">

                    <div className="mb-4">
                        <h5 className="fw-bold mb-1">
                            Provider Network Overview
                        </h5>

                        <p className="text-muted mb-0">
                            Current verification and availability status.
                        </p>
                    </div>

                    <div className="row g-4">

                        {/* Approval */}

                        <div className="col-lg-6">

                            <div className="p-4 rounded-3"
                                 style={{ background: "#f7f9fc" }}>

                                <div className="d-flex justify-content-between mb-2">

                                    <span className="fw-semibold">
                                        Approval Rate
                                    </span>

                                    <span className="fw-bold">
                                        {approvalRate}%
                                    </span>

                                </div>

                                <div
                                    className="progress"
                                    style={{ height: "9px" }}
                                >
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${approvalRate}%`
                                        }}
                                    />
                                </div>

                                <small className="text-muted d-block mt-2">
                                    {approved} of {total} providers approved
                                </small>

                            </div>

                        </div>

                        {/* Availability */}

                        <div className="col-lg-6">

                            <div className="p-4 rounded-3"
                                 style={{ background: "#f7f9fc" }}>

                                <div className="d-flex justify-content-between mb-2">

                                    <span className="fw-semibold">
                                        Availability Rate
                                    </span>

                                    <span className="fw-bold">
                                        {onlineRate}%
                                    </span>

                                </div>

                                <div
                                    className="progress"
                                    style={{ height: "9px" }}
                                >
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${onlineRate}%`
                                        }}
                                    />
                                </div>

                                <small className="text-muted d-block mt-2">
                                    {online} of {approved} approved providers online
                                </small>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* Status Breakdown */}

            <div
                className="card border-0 shadow-sm"
                style={{ borderRadius: "16px" }}
            >

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-4">
                        Verification Status
                    </h5>

                    <div className="row g-3">

                        <div className="col-md-4">

                            <div
                                className="p-4 rounded-3"
                                style={{ background: "#f7f9fc" }}
                            >

                                <div className="d-flex justify-content-between">

                                    <span className="fw-semibold">
                                        Approved
                                    </span>

                                    <span>
                                        {approved}
                                    </span>

                                </div>

                                <div
                                    className="progress mt-3"
                                    style={{ height: "7px" }}
                                >
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${percentage(approved, total)}%`
                                        }}
                                    />
                                </div>

                            </div>

                        </div>

                        <div className="col-md-4">

                            <div
                                className="p-4 rounded-3"
                                style={{ background: "#f7f9fc" }}
                            >

                                <div className="d-flex justify-content-between">

                                    <span className="fw-semibold">
                                        Pending
                                    </span>

                                    <span>
                                        {pending}
                                    </span>

                                </div>

                                <div
                                    className="progress mt-3"
                                    style={{ height: "7px" }}
                                >
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${percentage(pending, total)}%`
                                        }}
                                    />
                                </div>

                            </div>

                        </div>

                        <div className="col-md-4">

                            <div
                                className="p-4 rounded-3"
                                style={{ background: "#f7f9fc" }}
                            >

                                <div className="d-flex justify-content-between">

                                    <span className="fw-semibold">
                                        Rejected
                                    </span>

                                    <span>
                                        {rejected}
                                    </span>

                                </div>

                                <div
                                    className="progress mt-3"
                                    style={{ height: "7px" }}
                                >
                                    <div
                                        className="progress-bar"
                                        style={{
                                            width: `${percentage(rejected, total)}%`
                                        }}
                                    />
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </AdminLayout>
    );
}

export default Providers;