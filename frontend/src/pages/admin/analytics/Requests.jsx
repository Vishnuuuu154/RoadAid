import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getRequestAnalytics } from "../../../services/adminService";

function Requests() {

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const data = await getRequestAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load request analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="text-center mt-5">
                    Loading request analytics...
                </div>
            </AdminLayout>
        );
    }

    if (!analytics) {
        return (
            <AdminLayout>
                <div className="alert alert-danger">
                    Failed to load request analytics.
                </div>
            </AdminLayout>
        );
    }

    const statusCards = [
        {
            title: "Pending",
            value: analytics.pendingRequests,
        },
        {
            title: "Waiting for Quotation",
            value: analytics.waitingForQuotation,
        },
        {
            title: "Quotation Pending",
            value: analytics.quotationPending,
        },
        {
            title: "In Progress",
            value: analytics.inProgress,
        },
        {
            title: "Completed",
            value: analytics.completedRequests,
        },
        {
            title: "Closed",
            value: analytics.closedRequests,
        },
        {
            title: "Cancelled",
            value: analytics.cancelledRequests,
        },
    ];

    return (
        <AdminLayout>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">
                        Request Analytics
                    </h2>
                    <p className="text-muted mb-0">
                        Analyze service requests, trends and statuses.
                    </p>
                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={() => window.history.back()}
                >
                    ← Back
                </button>
            </div>

            {/* Overview Cards */}

            <div className="row g-4 mb-4">

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                Total Requests
                            </p>

                            <h2 className="fw-bold">
                                {analytics.totalRequests}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                This Month
                            </p>

                            <h2 className="fw-bold">
                                {analytics.monthlyRequests}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                Last Month
                            </p>

                            <h2 className="fw-bold">
                                {analytics.lastMonthRequests}
                            </h2>
                        </div>
                    </div>
                </div>

            </div>

            {/* Status */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body">

                    <h5 className="fw-bold mb-4">
                        Request Status
                    </h5>

                    <div className="row g-3">

                        {statusCards.map((item) => (
                            <div
                                className="col-md-6 col-lg-3"
                                key={item.title}
                            >
                                <div className="border rounded p-3 h-100">

                                    <p className="text-muted mb-1">
                                        {item.title}
                                    </p>

                                    <h4 className="fw-bold mb-0">
                                        {item.value}
                                    </h4>

                                </div>
                            </div>
                        ))}

                    </div>

                </div>

            </div>

            {/* Daily Trend */}

            <div className="card border-0 shadow-sm">

                <div className="card-body">

                    <h5 className="fw-bold mb-4">
                        Daily Request Trend — This Month
                    </h5>

                    {Object.keys(analytics.dailyRequests || {}).length === 0 ? (

                        <p className="text-muted mb-0">
                            No requests recorded this month.
                        </p>

                    ) : (

                        <div className="table-responsive">

                            <table className="table align-middle">

                                <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Requests</th>
                                </tr>
                                </thead>

                                <tbody>

                                {Object.entries(
                                    analytics.dailyRequests
                                ).map(([date, count]) => (

                                    <tr key={date}>
                                        <td>{date}</td>
                                        <td className="fw-semibold">
                                            {count}
                                        </td>
                                    </tr>

                                ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

        </AdminLayout>
    );
}

export default Requests;