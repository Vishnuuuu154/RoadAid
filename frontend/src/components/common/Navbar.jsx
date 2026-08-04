import { getUser, logout } from "../../services/authService.js";
import { useNavigate } from "react-router-dom";

function Navbar() {

    const navigate = useNavigate();

    const user = getUser();

    const handleLogout = () => {

        logout();

        navigate("/");

    };

    return (

        <nav className="navbar navbar-dark bg-primary px-4">

            <span className="navbar-brand">

                🚗 RoadAid

            </span>

            <div>

                <span className="text-white me-3">

                    {user?.fullName}

                </span>

                <button
                    className="btn btn-light btn-sm"
                    onClick={handleLogout}
                >

                    Logout

                </button>

            </div>

        </nav>

    );

}

export default Navbar;