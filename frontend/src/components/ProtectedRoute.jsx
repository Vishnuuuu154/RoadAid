import { Navigate } from "react-router-dom";
import { getRole, isAuthenticated } from "../services/authService";

function ProtectedRoute({ children, allowedRoles }) {

    if (!isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    const role = getRole();

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;