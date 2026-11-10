import { useEffect, useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getCustomerAnalytics } from "../../../services/adminService";

function Customers() {

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const data = await getCustomerAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load customer analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="text-center mt-5">
                    Loading customer analytics...
                </div>
            </AdminLayout>
        );
    }

    if (!analytics) {
        return (
            <AdminLayout>
                <div className="alert alert-danger">
                    Failed to load customer analytics.
                </div>
            </AdminLayout>
        );
    }

    const cards = [
        {
            title: "Total Customers",
            value: analytics.totalCustomers,
            icon: "👥"
        },
        {
            title: "New This Month",
            value: analytics.monthlyCustomers,
            icon: "📈"
        },
        {
            title: "New Last Month",
            value: analytics.lastMonthCustomers,
            icon: "📅"
        },
        {
            title: "Active Customers",
            value: analytics.activeCustomers,
            icon: "🟢"
        }
    ];

    const activityCards = [
        ["Total Requests", analytics.totalRequests],
        ["Completed Requests", analytics.completedRequests],
        ["Cancelled Requests", analytics.cancelledRequests],
        [
            "Avg. Requests / Customer",
            analytics.averageRequestsPerCustomer.toFixed(2)
        ]
    ];

    return (
        <AdminLayout>

            {/* Header */}

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 className="fw-bold mb-1">
                        Customer Analytics
                    </h2>

                    <p className="text-muted mb-0">
                        Understand customer growth, engagement and activity.
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
                                borderRadius: "16px"
                            }}
                        >

                            <div className="card-body">

                                <div className="d-flex justify-content-between align-items-start">

                                    <div>
                                        <p className="text-muted mb-2">
                                            {card.title}
                                        </p>

                                        <h2 className="fw-bold mb-0">
                                            {card.value}
                                        </h2>
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "28px"
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

            {/* Activity */}

            <div className="card border-0 shadow-sm mb-4"
                 style={{ borderRadius: "16px" }}>

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-4">
                        Customer Activity
                    </h5>

                    <div className="row g-3">

                        {activityCards.map(([title, value]) => (

                            <div
                                className="col-md-6 col-xl-3"
                                key={title}
                            >

                                <div
                                    className="p-3 rounded-3"
                                    style={{
                                        background: "#f6f8fb"
                                    }}
                                >

                                    <small className="text-muted">
                                        {title}
                                    </small>

                                    <h4 className="fw-bold mt-2 mb-0">
                                        {value}
                                    </h4>

                                </div>

                            </div>

                        ))}

                    </div>

                </div>

            </div>

            {/* Top Customers */}

            <div
                className="card border-0 shadow-sm"
                style={{ borderRadius: "16px" }}
            >

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-4">

                        <div>
                            <h5 className="fw-bold mb-1">
                                Top Customers
                            </h5>

                            <p className="text-muted mb-0">
                                Customers with the highest number of requests.
                            </p>
                        </div>

                    </div>

                    {analytics.topCustomers?.length === 0 ? (

                        <p className="text-muted">
                            No customer activity available.
                        </p>

                    ) : (

                        <div className="table-responsive">

                            <table className="table align-middle mb-0">

                                <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Email</th>
                                    <th>Requests</th>
                                    <th>Completed</th>
                                    <th>Cancelled</th>
                                </tr>
                                </thead>

                                <tbody>

                                {analytics.topCustomers.map(
                                    (customer, index) => (

                                        <tr key={index}>

                                            <td>
                                                <div className="fw-semibold">
                                                    {customer.name}
                                                </div>
                                            </td>

                                            <td className="text-muted">
                                                {customer.email}
                                            </td>

                                            <td>
                                                    <span className="badge bg-light text-dark">
                                                        {customer.requests}
                                                    </span>
                                            </td>

                                            <td>
                                                {customer.completed}
                                            </td>

                                            <td>
                                                {customer.cancelled}
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

        </AdminLayout>
    );
}

export default Customers;