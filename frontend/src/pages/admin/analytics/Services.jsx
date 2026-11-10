import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getServiceAnalytics } from "../../../services/adminService";

function Services() {

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const data = await getServiceAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load service analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="text-center mt-5">
                    Loading service analytics...
                </div>
            </AdminLayout>
        );
    }

    if (!analytics) {
        return (
            <AdminLayout>
                <div className="alert alert-danger">
                    Failed to load service analytics.
                </div>
            </AdminLayout>
        );
    }

    const categories = Object.entries(
        analytics.issueCategories || {}
    ).sort((a, b) => b[1] - a[1]);

    return (
        <AdminLayout>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">
                        Service Analytics
                    </h2>
                    <p className="text-muted mb-0">
                        Understand the most common roadside problems.
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
                    <div className="card border-0 shadow-sm">
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
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                Completed
                            </p>
                            <h2 className="fw-bold">
                                {analytics.completedRequests}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <p className="text-muted mb-2">
                                Cancelled
                            </p>
                            <h2 className="fw-bold">
                                {analytics.cancelledRequests}
                            </h2>
                        </div>
                    </div>
                </div>

            </div>

            <div className="card border-0 shadow-sm">

                <div className="card-body">

                    <h5 className="fw-bold mb-4">
                        Common Service Problems
                    </h5>

                    {categories.length === 0 ? (

                        <p className="text-muted">
                            No service request data available.
                        </p>

                    ) : (

                        <div className="table-responsive">

                            <table className="table align-middle">

                                <thead>
                                <tr>
                                    <th>Problem Category</th>
                                    <th>Requests</th>
                                </tr>
                                </thead>

                                <tbody>

                                {categories.map(([category, count]) => (
                                    <tr key={category}>
                                        <td className="fw-semibold">
                                            {category}
                                        </td>
                                        <td>
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

export default Services;