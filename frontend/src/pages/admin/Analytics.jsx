import AdminLayout from "../../layouts/AdminLayout";
import { getAnalytics } from "../../services/adminService";
import { useEffect, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
} from "chart.js";

import { Bar, Doughnut,Pie } from "react-chartjs-2";
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
);
function Analytics() {
    const [analytics, setAnalytics] = useState({
        totalCustomers: 0,
        totalMechanics: 0,
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        cancelledRequests: 0,
        totalComplaints: 0,
        totalPayments: 0
    });
    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {

        try {

            const response = await getAnalytics();

            setAnalytics(response.data);

        } catch (error) {

            console.error(error);

        }

    };
    const requestChart = {

        labels: ["Pending", "Completed", "Cancelled"],

        datasets: [

            {

                label: "Requests",

                data: [
                    analytics.pendingRequests,
                    analytics.completedRequests,
                    analytics.cancelledRequests
                ],

                backgroundColor: [
                    "#ffc107",
                    "#198754",
                    "#dc3545"
                ],

                borderRadius: 8

            }

        ]

    };
    const userChart = {

        labels: ["Customers", "Mechanics"],

        datasets: [

            {

                data: [

                    analytics.totalCustomers,
                    analytics.totalMechanics

                ],

                backgroundColor: [

                    "#0d6efd",
                    "#198754"

                ]

            }

        ]

    };
    const complaintChart = {

        labels: ["Complaints", "No Complaints"],

        datasets: [

            {

                data: [

                    analytics.totalComplaints,
                    Math.max(
                        analytics.totalRequests - analytics.totalComplaints,
                        0
                    )

                ],

                backgroundColor: [

                    "#dc3545",
                    "#198754"

                ]

            }

        ]

    };
    return (

        <AdminLayout>

            <h2 className="mb-4">
                Analytics Dashboard
            </h2>

            <div className="row">

                <div className="col-lg-8 mb-4">

                    <div className="card shadow-sm">

                        <div className="card-body">

                            <h5 className="card-title">
                                Request Status

                            </h5>
                            <Bar data={requestChart} />

                        </div>

                    </div>

                </div>

                <div className="col-lg-4 mb-4">

                    <div className="card shadow-sm">

                        <div className="card-body">

                            <h5 className="card-title">
                                User Distribution
                            </h5>
                            <Doughnut data={userChart} />
                        </div>

                    </div>

                </div>

            </div>

            <div className="row">

                <div className="col-lg-6">

                    <div className="card shadow-sm">

                        <div className="card-body">

                            <h5 className="card-title">
                                Complaint Statistics
                            </h5>

                            <Pie data={complaintChart} />

                        </div>

                    </div>

                </div>

                <div className="col-lg-6">

                    <div className="card shadow-sm">

                        <div className="card-body">

                            <h5 className="card-title">
                                Payment Summary
                            </h5>

                            <div className="mt-4">

                                <h2 className="fw-bold text-primary">
                                    {analytics.totalPayments}
                                </h2>

                                <p className="text-muted mb-3">
                                    Total Payments Processed
                                </p>

                                <hr />

                                <div className="d-flex justify-content-between">

                                    <span>Payment Module</span>

                                    <span className="badge bg-success">
                            Active
                        </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </AdminLayout>

    );

}

export default Analytics;