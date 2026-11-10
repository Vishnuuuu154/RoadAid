import { useState } from "react";
import AdminLayout from "../../../layouts/AdminLayout";
import { getAnalyticsReport } from "../../../services/adminService";

function Reports() {

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {

        if (!startDate || !endDate) {
            alert("Please select both dates.");
            return;
        }

        if (startDate > endDate) {
            alert("Start date cannot be after end date.");
            return;
        }

        try {
            setLoading(true);

            const data =
                await getAnalyticsReport(
                    startDate,
                    endDate
                );

            setReport(data);

        } catch (error) {
            console.error(
                "Failed to generate report:",
                error
            );

            alert("Failed to generate report.");

        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (value) =>
        `₹${Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;

    const exportCSV = () => {

        if (!report) return;

        const rows = [
            ["RoadAid Analytics Report"],
            ["Start Date", report.startDate],
            ["End Date", report.endDate],
            [],
            ["Metric", "Value"],
            ["Total Requests", report.totalRequests],
            ["Completed Requests", report.completedRequests],
            ["Cancelled Requests", report.cancelledRequests],
            ["New Customers", report.newCustomers],
            ["Total Payments", report.totalPayments],
            ["Successful Payments", report.successfulPayments],
            ["Revenue", report.revenue]
        ];

        const csv = rows
            .map(row =>
                row.map(value =>
                    `"${value ?? ""}"`
                ).join(",")
            )
            .join("\n");

        const blob =
            new Blob([csv], {
                type: "text/csv;charset=utf-8;"
            });

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            `RoadAid_Report_${report.startDate}_${report.endDate}.csv`;

        link.click();

        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout>

            {/* Header */}

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 className="fw-bold mb-1">
                        Reports & Export
                    </h2>

                    <p className="text-muted mb-0">
                        Generate custom analytics reports for any period.
                    </p>
                </div>

                <button
                    className="btn btn-outline-secondary"
                    onClick={() => window.history.back()}
                >
                    ← Back
                </button>

            </div>

            {/* Date Selector */}

            <div
                className="card border-0 shadow-sm mb-4"
                style={{ borderRadius: "16px" }}
            >

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-3">
                        Select Report Period
                    </h5>

                    <div className="row g-3 align-items-end">

                        <div className="col-md-4">

                            <label className="form-label text-muted">
                                Start Date
                            </label>

                            <input
                                type="date"
                                className="form-control"
                                value={startDate}
                                onChange={(e) =>
                                    setStartDate(e.target.value)
                                }
                            />

                        </div>

                        <div className="col-md-4">

                            <label className="form-label text-muted">
                                End Date
                            </label>

                            <input
                                type="date"
                                className="form-control"
                                value={endDate}
                                onChange={(e) =>
                                    setEndDate(e.target.value)
                                }
                            />

                        </div>

                        <div className="col-md-4">

                            <button
                                className="btn btn-dark w-100"
                                onClick={generateReport}
                                disabled={loading}
                            >
                                {loading
                                    ? "Generating..."
                                    : "Generate Report"}
                            </button>

                        </div>

                    </div>

                </div>

            </div>

            {/* Report */}

            {report && (

                <>

                    <div
                        className="d-flex justify-content-between align-items-center mb-3"
                    >

                        <div>
                            <h5 className="fw-bold mb-1">
                                Report Summary
                            </h5>

                            <small className="text-muted">
                                {report.startDate} → {report.endDate}
                            </small>
                        </div>

                        <div className="d-flex gap-2">

                            <button
                                className="btn btn-outline-dark"
                                onClick={exportCSV}
                            >
                                ↓ Export CSV
                            </button>

                            <button
                                className="btn btn-dark"
                                onClick={() => window.print()}
                            >
                                🖨 Print / PDF
                            </button>

                        </div>

                    </div>

                    {/* KPI Cards */}

                    <div className="row g-4 mb-4">

                        {[
                            [
                                "Requests",
                                report.totalRequests,
                                "📋"
                            ],
                            [
                                "Completed",
                                report.completedRequests,
                                "✓"
                            ],
                            [
                                "Cancelled",
                                report.cancelledRequests,
                                "✕"
                            ],
                            [
                                "New Customers",
                                report.newCustomers,
                                "👥"
                            ],
                            [
                                "Payments",
                                report.successfulPayments,
                                "💳"
                            ],
                            [
                                "Revenue",
                                formatMoney(report.revenue),
                                "₹"
                            ]
                        ].map(([title, value, icon]) => (

                            <div
                                className="col-md-6 col-xl-4"
                                key={title}
                            >

                                <div
                                    className="card border-0 shadow-sm h-100"
                                    style={{
                                        borderRadius: "16px"
                                    }}
                                >

                                    <div className="card-body p-4">

                                        <div className="d-flex justify-content-between">

                                            <div>
                                                <p className="text-muted mb-2">
                                                    {title}
                                                </p>

                                                <h3 className="fw-bold mb-0">
                                                    {value}
                                                </h3>
                                            </div>

                                            <span
                                                style={{
                                                    fontSize: "26px"
                                                }}
                                            >
                                                {icon}
                                            </span>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                    {/* Report Details */}

                    <div
                        className="card border-0 shadow-sm"
                        style={{
                            borderRadius: "16px"
                        }}
                    >

                        <div className="card-body p-4">

                            <h5 className="fw-bold mb-3">
                                Report Details
                            </h5>

                            <div className="table-responsive">

                                <table className="table align-middle mb-0">

                                    <tbody>

                                    <tr>
                                        <td>Total Requests</td>
                                        <td className="fw-semibold">
                                            {report.totalRequests}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>Completed Requests</td>
                                        <td className="fw-semibold">
                                            {report.completedRequests}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>Cancelled Requests</td>
                                        <td className="fw-semibold">
                                            {report.cancelledRequests}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>New Customers</td>
                                        <td className="fw-semibold">
                                            {report.newCustomers}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>Successful Payments</td>
                                        <td className="fw-semibold">
                                            {report.successfulPayments}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>Revenue</td>
                                        <td className="fw-bold">
                                            {formatMoney(report.revenue)}
                                        </td>
                                    </tr>

                                    </tbody>

                                </table>

                            </div>

                        </div>

                    </div>

                </>
            )}

        </AdminLayout>
    );
}

export default Reports;