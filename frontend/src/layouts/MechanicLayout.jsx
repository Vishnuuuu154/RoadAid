import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

function MechanicLayout({ children }) {

    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (

        <div className="d-flex flex-column min-vh-100">

            {/* Top Navbar */}

            <nav className="navbar navbar-dark bg-primary px-3">

                <Link
                    to="/mechanic"
                    className="navbar-brand fw-bold"
                >
                    🚗 RoadAid
                </Link>

                <div className="d-flex align-items-center">

                    <Link
                        to="/mechanic"
                        className="text-white text-decoration-none me-4"
                    >
                        Home
                    </Link>

                    <span className="text-white me-3">
                        Mechanic
                    </span>

                    <button
                        className="btn btn-light"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </nav>


            {/* Main Area */}

            <div className="d-flex flex-grow-1">

                {/* Sidebar */}

                <aside
                    className="bg-dark text-white p-3"
                    style={{
                        width: "240px",
                        minHeight: "calc(100vh - 56px)"
                    }}
                >

                    <h5 className="mb-4">
                        Mechanic Panel
                    </h5>


                    <ul className="nav nav-pills flex-column gap-2">

                        <li className="nav-item">

                            <Link
                                to="/mechanic"
                                className={`nav-link ${
                                    isActive("/mechanic")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                🏠 Dashboard
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/mechanic/requests"
                                className={`nav-link ${
                                    isActive("/mechanic/requests")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                📋 My Requests
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/mechanic/quotations"
                                className={`nav-link ${
                                    isActive("/mechanic/quotations")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                💰 Quotations
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/mechanic/notifications"
                                className={`nav-link ${
                                    isActive("/mechanic/notifications")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                🔔 Notifications
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/mechanic/profile"
                                className={`nav-link ${
                                    isActive("/mechanic/profile")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                👤 Profile
                            </Link>

                        </li>

                    </ul>


                    <hr className="border-secondary mt-4" />


                    <button
                        className="btn btn-outline-danger w-100"
                        onClick={handleLogout}
                    >
                        🚪 Logout
                    </button>

                </aside>


                {/* Page Content */}

                <main className="flex-grow-1 p-4 bg-light">

                    {children}

                </main>

            </div>

        </div>

    );
}

export default MechanicLayout;