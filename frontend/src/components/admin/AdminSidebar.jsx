import { NavLink } from "react-router-dom";
import {
    FaHome,
    FaUsers,
    FaTools,
    FaClipboardList,
    FaExclamationTriangle,
    FaChartBar,
    FaSignOutAlt
} from "react-icons/fa";

function AdminSidebar() {

    return (

        <div
            className="bg-dark text-white p-3"
            style={{
                width: "250px",
                minHeight: "calc(100vh - 56px)"
            }}
        >

            <h5 className="mb-4">

                Admin Panel

            </h5>

            <NavLink to="/admin" className="nav-link text-white mb-3">
                <FaHome className="me-2" />
                Dashboard
            </NavLink>

            <NavLink to="/admin/users" className="nav-link text-white mb-3">
                <FaUsers className="me-2" />
                Users
            </NavLink>

            <NavLink to="/admin/mechanics" className="nav-link text-white mb-3">
                <FaTools className="me-2" />
                Mechanics
            </NavLink>

            <NavLink to="/admin/requests" className="nav-link text-white mb-3">
                <FaClipboardList className="me-2" />
                Requests
            </NavLink>

            <NavLink to="/admin/complaints" className="nav-link text-white mb-3">
                <FaExclamationTriangle className="me-2" />
                Complaints
            </NavLink>

            <NavLink to="/admin/analytics" className="nav-link text-white mb-3">
                <FaChartBar className="me-2" />
                Analytics
            </NavLink>

            <NavLink to="/" className="nav-link text-danger mt-5">
                <FaSignOutAlt className="me-2" />
                Logout
            </NavLink>

        </div>

    );

}

export default AdminSidebar;