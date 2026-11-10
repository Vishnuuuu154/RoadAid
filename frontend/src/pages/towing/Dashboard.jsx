import { useNavigate } from "react-router-dom";
import { getUser, logout } from "../../services/authService";

function TowingProviderDashboard() {
    const navigate = useNavigate();
    const user = getUser();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div style={{ padding: "30px" }}>
            <h1>Towing Provider Dashboard</h1>

            <p>Welcome, {user?.fullName || user?.email || "Provider"}!</p>

            <p>
                Your RoadAid towing provider account is ready.
            </p>

            <button onClick={handleLogout}>
                Logout
            </button>
        </div>
    );
}

export default TowingProviderDashboard;