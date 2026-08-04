import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import StatsCard from "../../components/admin/StatsCard";
import { getDashboard } from "../../services/adminService";

function Dashboard() {

    const [dashboard, setDashboard] = useState({
        totalCustomers: 0,
        totalMechanics: 0,
        totalRequests: 0,
        pendingRequests: 0,
        completedRequests: 0,
        totalComplaints: 0,
        totalPayments: 0
    });

    useEffect(() => {
        loadDashboard();
    }, []);
    const [loading, setLoading] = useState(true);
    const loadDashboard = async () => {

        try {

            const response = await getDashboard();

            setDashboard(response.data);

        } catch (error) {

            console.error(error);

        }
        finally {

            setLoading(false);

        }

    };
    if (loading) {

        return (
            <AdminLayout>
                <h3>Loading dashboard...</h3>
            </AdminLayout>
        );

    }
    return (

        <AdminLayout>

            <div className="row g-4">

                <div className="col-md-3">
                    <StatsCard
                        title="Customers"
                        value={dashboard.totalCustomers}
                    />
                </div>

                <div className="col-md-3">
                    <StatsCard
                        title="Mechanics"
                        value={dashboard.totalMechanics}
                    />
                </div>

                <div className="col-md-3">
                    <StatsCard
                        title="Requests"
                        value={dashboard.totalRequests}
                    />
                </div>

                <div className="col-md-3">
                    <StatsCard
                        title="Pending"
                        value={dashboard.pendingRequests}
                    />
                </div>

                <div className="col-md-3">
                    <StatsCard
                        title="Completed"
                        value={dashboard.completedRequests}
                    />
                </div>

                <div className="col-md-3">
                    <StatsCard
                        title="Complaints"
                        value={dashboard.totalComplaints}
                    />
                </div>

                <div className="col-md-3">
                    <StatsCard
                        title="Payments"
                        value={dashboard.totalPayments}
                    />
                </div>

            </div>

        </AdminLayout>

    );

}

export default Dashboard;