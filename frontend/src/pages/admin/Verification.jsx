
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";

function Verification() {
    const navigate = useNavigate();

    return (
        <AdminLayout>
            <div className="container-fluid py-3">
                <h2 className="mb-1">Verification</h2>
                <p className="text-muted mb-4">
                    Review and verify RoadAid service providers and their vehicles.
                </p>

                <div className="row g-4">

                    <div className="col-md-6">
                        <div
                            className="card shadow-sm h-100"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/admin/provider-verification")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 mb-3">🏢</div>
                                <h4>Provider Verification</h4>
                                <p className="text-muted">
                                    Review mechanic and towing-provider
                                    registrations. Approve or reject applications.
                                </p>
                                <span className="btn btn-outline-primary">
                                    View Applications →
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div
                            className="card shadow-sm h-100"
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate("/admin/vehicle-verification")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 mb-3">🚛</div>
                                <h4>Vehicle Verification</h4>
                                <p className="text-muted">
                                    Review towing vehicles, registration
                                    information and uploaded documents.
                                </p>
                                <span className="btn btn-outline-primary">
                                    View Vehicles →
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}

export default Verification;
