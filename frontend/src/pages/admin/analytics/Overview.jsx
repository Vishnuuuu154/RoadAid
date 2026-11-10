import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../../layouts/AdminLayout";
import { getAnalytics } from "../../../services/adminService";
import {
    FaClipboardList,
    FaCheckCircle,
    FaTimesCircle,
    FaMoneyBillWave,
    FaCreditCard,
    FaTools,
    FaUserClock,
    FaUsers
} from "react-icons/fa";

function Overview() {

    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {

        try {

            const response = await getAnalytics();

            setAnalytics(response.data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }
    };


    const percentage = (value, total) => {

        if (!total || total === 0) {
            return 0;
        }

        return ((value / total) * 100).toFixed(1);
    };


    const changePercentage = (current, previous) => {

        if (!previous || previous === 0) {
            return current > 0 ? 100 : 0;
        }

        return (((current - previous) / previous) * 100).toFixed(1);
    };


    const comparison = (current, previous) => {

        const change = Number(
            changePercentage(current, previous)
        );

        return {
            value: Math.abs(change),
            positive: change >= 0
        };
    };


    if (loading) {

        return (
            <AdminLayout>

                <div className="d-flex justify-content-center align-items-center"
                     style={{ minHeight: "60vh" }}>

                    <div className="text-center">

                        <div
                            className="spinner-border text-primary"
                            role="status"
                        />

                        <p className="text-muted mt-3">
                            Loading analytics...
                        </p>

                    </div>

                </div>

            </AdminLayout>
        );
    }


    if (!analytics) {

        return (
            <AdminLayout>

                <div className="alert alert-danger">
                    Unable to load analytics data.
                </div>

            </AdminLayout>
        );
    }


    const completionRate = percentage(
        analytics.completedRequests,
        analytics.totalRequests
    );

    const cancellationRate = percentage(
        analytics.cancelledRequests,
        analytics.totalRequests
    );


    const requestComparison = comparison(
        analytics.monthlyRequests,
        analytics.lastMonthRequests
    );

    const revenueComparison = comparison(
        analytics.monthlyRevenue,
        analytics.lastMonthRevenue
    );

    const customerComparison = comparison(
        analytics.monthlyCustomers,
        analytics.lastMonthCustomers
    );

    const completedComparison = comparison(
        analytics.monthlyCompleted,
        analytics.lastMonthCompleted
    );


    const kpis = [

        {
            title: "Total Requests",
            value: analytics.totalRequests,
            icon: <FaClipboardList />,
            background: "#eaf2ff",
            color: "#0d6efd"
        },

        {
            title: "Completed Requests",
            value: analytics.completedRequests,
            icon: <FaCheckCircle />,
            background: "#eaf8f0",
            color: "#198754"
        },

        {
            title: "Completion Rate",
            value: `${completionRate}%`,
            icon: <FaCheckCircle />,
            background: "#eef8f1",
            color: "#198754"
        },

        {
            title: "Cancellation Rate",
            value: `${cancellationRate}%`,
            icon: <FaTimesCircle />,
            background: "#fff0f0",
            color: "#dc3545"
        },

        {
            title: "Total Revenue",
            value: `₹${Number(
                analytics.totalRevenue
            ).toLocaleString("en-IN")}`,
            icon: <FaMoneyBillWave />,
            background: "#fff8e8",
            color: "#d39e00"
        },

        {
            title: "Total Payments",
            value: analytics.totalPayments,
            icon: <FaCreditCard />,
            background: "#f2efff",
            color: "#6f42c1"
        },

        {
            title: "Active Mechanics",
            value: analytics.activeMechanics,
            icon: <FaTools />,
            background: "#eaf7f7",
            color: "#0f8b8d"
        },

        {
            title: "Pending Providers",
            value: analytics.pendingProviders,
            icon: <FaUserClock />,
            background: "#fff4e6",
            color: "#fd7e14"
        }

    ];


    return (

        <AdminLayout>

            <div className="container-fluid">

                {/* Header */}

                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">

                    <div>

                        <button
                            className="btn btn-link text-decoration-none px-0 mb-2"
                            onClick={() =>
                                navigate("/admin/analytics")
                            }
                        >
                            ← Back to Analytics
                        </button>

                        <h2 className="fw-bold mb-1">
                            Overview
                        </h2>

                        <p className="text-muted mb-0">
                            A quick look at RoadAid's overall performance.
                        </p>

                    </div>

                </div>


                {/* KPI Cards */}

                <div className="row g-4 mb-4">

                    {kpis.map((kpi) => (

                        <div
                            className="col-12 col-sm-6 col-xl-3"
                            key={kpi.title}
                        >

                            <div
                                className="card border-0 shadow-sm h-100"
                                style={{
                                    borderRadius: "14px"
                                }}
                            >

                                <div className="card-body p-4">

                                    <div className="d-flex justify-content-between align-items-start">

                                        <div>

                                            <p className="text-muted mb-2">
                                                {kpi.title}
                                            </p>

                                            <h3 className="fw-bold mb-0">
                                                {kpi.value}
                                            </h3>

                                        </div>

                                        <div
                                            className="d-flex align-items-center justify-content-center"
                                            style={{
                                                width: "46px",
                                                height: "46px",
                                                borderRadius: "12px",
                                                background: kpi.background,
                                                color: kpi.color,
                                                fontSize: "19px"
                                            }}
                                        >
                                            {kpi.icon}
                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>


                {/* Monthly Comparison */}

                <div className="card border-0 shadow-sm"
                     style={{ borderRadius: "14px" }}>

                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center mb-4">

                            <div>

                                <h5 className="fw-bold mb-1">
                                    Monthly Comparison
                                </h5>

                                <p className="text-muted mb-0">
                                    This month compared with last month.
                                </p>

                            </div>

                            <span className="badge bg-light text-dark">
                                Current Month
                            </span>

                        </div>


                        <div className="table-responsive">

                            <table className="table align-middle mb-0">

                                <thead>

                                <tr>
                                    <th>Metric</th>
                                    <th>This Month</th>
                                    <th>Last Month</th>
                                    <th>Change</th>
                                </tr>

                                </thead>

                                <tbody>

                                <tr>

                                    <td className="fw-semibold">
                                        Requests
                                    </td>

                                    <td>
                                        {analytics.monthlyRequests}
                                    </td>

                                    <td>
                                        {analytics.lastMonthRequests}
                                    </td>

                                    <td>
                                            <span
                                                className={`badge ${
                                                    requestComparison.positive
                                                        ? "bg-success"
                                                        : "bg-danger"
                                                }`}
                                            >
                                                {requestComparison.positive
                                                    ? "↑"
                                                    : "↓"}{" "}
                                                {requestComparison.value}%
                                            </span>
                                    </td>

                                </tr>


                                <tr>

                                    <td className="fw-semibold">
                                        Revenue
                                    </td>

                                    <td>
                                        ₹{Number(
                                        analytics.monthlyRevenue
                                    ).toLocaleString("en-IN")}
                                    </td>

                                    <td>
                                        ₹{Number(
                                        analytics.lastMonthRevenue
                                    ).toLocaleString("en-IN")}
                                    </td>

                                    <td>
                                            <span
                                                className={`badge ${
                                                    revenueComparison.positive
                                                        ? "bg-success"
                                                        : "bg-danger"
                                                }`}
                                            >
                                                {revenueComparison.positive
                                                    ? "↑"
                                                    : "↓"}{" "}
                                                {revenueComparison.value}%
                                            </span>
                                    </td>

                                </tr>


                                <tr>

                                    <td className="fw-semibold">
                                        New Customers
                                    </td>

                                    <td>
                                        {analytics.monthlyCustomers}
                                    </td>

                                    <td>
                                        {analytics.lastMonthCustomers}
                                    </td>

                                    <td>
                                            <span
                                                className={`badge ${
                                                    customerComparison.positive
                                                        ? "bg-success"
                                                        : "bg-danger"
                                                }`}
                                            >
                                                {customerComparison.positive
                                                    ? "↑"
                                                    : "↓"}{" "}
                                                {customerComparison.value}%
                                            </span>
                                    </td>

                                </tr>


                                <tr>

                                    <td className="fw-semibold">
                                        Completed Jobs
                                    </td>

                                    <td>
                                        {analytics.monthlyCompleted}
                                    </td>

                                    <td>
                                        {analytics.lastMonthCompleted}
                                    </td>

                                    <td>
                                            <span
                                                className={`badge ${
                                                    completedComparison.positive
                                                        ? "bg-success"
                                                        : "bg-danger"
                                                }`}
                                            >
                                                {completedComparison.positive
                                                    ? "↑"
                                                    : "↓"}{" "}
                                                {completedComparison.value}%
                                            </span>
                                    </td>

                                </tr>

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>

            </div>

        </AdminLayout>
    );
}

export default Overview;