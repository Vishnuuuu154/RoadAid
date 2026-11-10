import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getRevenueAnalytics } from "../../../services/adminService";

function Revenue() {

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const data = await getRevenueAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load revenue analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (value) =>
        `₹${Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    if (loading) {
        return (
            <AdminLayout>
                <div className="text-center mt-5">
                    Loading revenue analytics...
                </div>
            </AdminLayout>
        );
    }

    if (!analytics) {
        return (
            <AdminLayout>
                <div className="alert alert-danger">
                    Failed to load revenue analytics.
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">
                        Revenue Analytics
                    </h2>
                    <p className="text-muted mb-0">
                        Analyze platform revenue and payment performance.
                    </p>
                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={() => window.history.back()}
                >
                    ← Back
                </button>
            </div>

            <div className="row g-4 mb-4">

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                Total Revenue
                            </p>
                            <h2 className="fw-bold">
                                {formatMoney(analytics.totalRevenue)}
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
                                {formatMoney(analytics.monthlyRevenue)}
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
                                {formatMoney(analytics.lastMonthRevenue)}
                            </h2>
                        </div>
                    </div>
                </div>

            </div>

            <div className="row g-4 mb-4">

                <div className="col-md-6">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                Total Payments
                            </p>
                            <h3 className="fw-bold">
                                {analytics.totalPayments}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                Successful Payments
                            </p>
                            <h3 className="fw-bold">
                                {analytics.successfulPayments}
                            </h3>
                        </div>
                    </div>
                </div>

            </div>

            <div className="card border-0 shadow-sm">

                <div className="card-body">

                    <h5 className="fw-bold mb-4">
                        Daily Revenue — This Month
                    </h5>

                    {Object.keys(analytics.dailyRevenue || {}).length === 0 ? (

                        <p className="text-muted mb-0">
                            No successful revenue recorded this month.
                        </p>

                    ) : (

                        <div className="table-responsive">

                            <table className="table align-middle">

                                <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Revenue</th>
                                </tr>
                                </thead>

                                <tbody>

                                {Object.entries(
                                    analytics.dailyRevenue
                                ).map(([date, amount]) => (

                                    <tr key={date}>
                                        <td>{date}</td>
                                        <td className="fw-semibold">
                                            {formatMoney(amount)}
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

export default Revenue;