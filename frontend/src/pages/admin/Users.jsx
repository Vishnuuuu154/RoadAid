import AdminLayout from "../../layouts/AdminLayout";
import { useNavigate } from "react-router-dom";

function Users() {
    const navigate = useNavigate();

    return (
        <AdminLayout>
            <div className="container-fluid">
                <h2 className="mb-2">User Management</h2>
                <p className="text-muted mb-4">
                    Manage customers, mechanics, and other service providers.
                </p>

                <div className="row g-4">

                    {/* All Users */}
                    <div className="col-md-6 col-lg-4">
                        <div
                            className="card shadow-sm h-100"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/admin/users/all")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 mb-3">👥</div>
                                <h4>All Users</h4>
                                <p className="text-muted mb-0">
                                    View and manage all registered users.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Customers */}
                    <div className="col-md-6 col-lg-4">
                        <div
                            className="card shadow-sm h-100"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/admin/users/customers")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 mb-3">👤</div>
                                <h4>Customers</h4>
                                <p className="text-muted mb-0">
                                    View customer accounts and their activity.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mechanics */}
                    <div className="col-md-6 col-lg-4">
                        <div
                            className="card shadow-sm h-100"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/admin/users/mechanics")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 mb-3">🔧</div>
                                <h4>Mechanics</h4>
                                <p className="text-muted mb-0">
                                    Manage mechanic and service provider accounts.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Towing Providers */}
                    <div className="col-md-6 col-lg-4">
                        <div
                            className="card shadow-sm h-100"
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                                navigate("/admin/users/towing-providers")
                            }
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 mb-3">🚚</div>
                                <h4>Towing Providers</h4>
                                <p className="text-muted mb-0">
                                    View and manage registered towing provider accounts.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}

export default Users;