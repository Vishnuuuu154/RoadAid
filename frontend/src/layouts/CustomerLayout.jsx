import { Link, useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

function CustomerLayout({ children }) {

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
                    to="/customer"
                    className="navbar-brand fw-bold"
                >
                    🚗 RoadAid
                </Link>

                <div className="d-flex align-items-center">

                    <Link
                        to="/customer"
                        className="text-white text-decoration-none me-4"
                    >
                        Home
                    </Link>

                    <span className="text-white me-3">
                        Customer
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
                        Customer Panel
                    </h5>


                    <ul className="nav nav-pills flex-column gap-2">

                        <li className="nav-item">

                            <Link
                                to="/customer"
                                className={`nav-link ${
                                    isActive("/customer")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                🏠 Dashboard
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/customer/vehicles"
                                className={`nav-link ${
                                    isActive("/customer/vehicles")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                🚗 My Vehicles
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/customer/requests"
                                className={`nav-link ${
                                    isActive("/customer/requests")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                📋 My Requests
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/customer/favorites"
                                className={`nav-link ${
                                    isActive("/customer/favorites")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                ❤️ Favorite Mechanics
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/customer/payments"
                                className={`nav-link ${
                                    isActive("/customer/payments")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                💳 Payments
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/customer/notifications"
                                className={`nav-link ${
                                    isActive("/customer/notifications")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                🔔 Notifications
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/customer/reviews"
                                className={`nav-link ${
                                    isActive("/customer/reviews")
                                        ? "active"
                                        : "text-white"
                                }`}
                            >
                                ⭐ My Reviews
                            </Link>

                        </li>


                        <li className="nav-item">

                            <Link
                                to="/customer/profile"
                                className={`nav-link ${
                                    isActive("/customer/profile")
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

export default CustomerLayout;