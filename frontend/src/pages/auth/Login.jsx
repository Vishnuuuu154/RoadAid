import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./../../styles/auth.css";
import { login, saveUser } from "../../services/authService";
function Login() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");

        try {

            const response = await login(formData);

            saveUser(response.data);

            if (response.data.role === "ADMIN") {

                navigate("/admin");


            } else if (response.data.role === "MECHANIC") {

                navigate("/mechanic");


            } else {

                navigate("/customer");


            }

        } catch (err) {

            if (err.response) {

                setError(err.response.data.message);

            } else {

                setError("Server not reachable.");

            }

        }

    };

    return (

        <div className="login-page">

            <div className="card shadow-lg login-card">

                <div className="card-body p-5">

                    <div className="text-center mb-4">

                        <div className="logo">
                            🚗
                        </div>

                        <h2 className="login-title">
                            RoadAid
                        </h2>

                        <p className="subtitle">
                            Roadside Assistance Platform
                        </p>

                    </div>

                    <form onSubmit={handleSubmit}>

                        <div className="mb-3">

                            <label className="form-label">
                                Email
                            </label>

                            <input
                                type="email"
                                name="email"
                                className="form-control"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                            />

                        </div>

                        <div className="mb-3">

                            <label className="form-label">
                                Password
                            </label>

                            <input
                                type="password"
                                name="password"
                                className="form-control"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                            />

                        </div>

                        {error && (
                            <div className="alert alert-danger">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-100"
                        >
                            Login
                        </button>

                    </form>

                    <p className="text-center mt-4">

                        New user?{" "}

                        <Link to="/register">
                            Register
                        </Link>

                    </p>

                </div>

            </div>

        </div>

    );

}

export default Login;