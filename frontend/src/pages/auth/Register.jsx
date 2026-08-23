import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";

function Register() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        role: "CUSTOMER",
        workshopName: "",
        workshopAddress: "",
        experienceYears: "",
        contactNumber: ""
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");
        setSuccess("");

        if (formData.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (!/^[6-9]\d{9}$/.test(formData.phone)) {
            setError("Phone number must be 10 digits and start with 6-9.");
            return;
        }

        if (
            formData.role === "MECHANIC" &&
            (
                !formData.workshopName ||
                !formData.workshopAddress ||
                !formData.experienceYears ||
                !formData.contactNumber
            )
        ) {
            setError("Please fill in all mechanic details.");
            return;
        }

        setLoading(true);

        try {

            await api.post("/users/register", formData);

            setSuccess(
                "Registration successful! Redirecting to login..."
            );

            setTimeout(() => {
                navigate("/");
            }, 1500);

        } catch (error) {

            console.error(error);

            setError(
                error.response?.data?.message ||
                "Registration failed."
            );

        } finally {

            setLoading(false);

        }

    };

    return (

        <div className="container mt-5 mb-5">

            <div className="row justify-content-center">

                <div className="col-md-7 col-lg-6">

                    <div className="card shadow">

                        <div className="card-body p-4">

                            <h2 className="text-center mb-4">
                                Create Account
                            </h2>

                            {error && (
                                <div className="alert alert-danger">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="alert alert-success">
                                    {success}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>

                                {/* Full Name */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Full Name
                                    </label>

                                    <input
                                        type="text"
                                        name="fullName"
                                        className="form-control"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>


                                {/* Email */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Email
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        className="form-control"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                    />

                                </div>


                                {/* Phone */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Phone Number
                                    </label>

                                    <input
                                        type="tel"
                                        name="phone"
                                        className="form-control"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        maxLength="10"
                                        required
                                    />

                                </div>


                                {/* Password */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        className="form-control"
                                        value={formData.password}
                                        onChange={handleChange}
                                        minLength="8"
                                        required
                                    />

                                </div>


                                {/* Role */}

                                <div className="mb-3">

                                    <label className="form-label">
                                        Register As
                                    </label>

                                    <select
                                        name="role"
                                        className="form-select"
                                        value={formData.role}
                                        onChange={handleChange}
                                    >

                                        <option value="CUSTOMER">
                                            Customer
                                        </option>

                                        <option value="MECHANIC">
                                            Mechanic
                                        </option>

                                    </select>

                                </div>


                                {/* Mechanic Fields */}

                                {formData.role === "MECHANIC" && (

                                    <div className="border rounded p-3 mb-3">

                                        <h5 className="mb-3">
                                            Mechanic Details
                                        </h5>


                                        {/* Workshop Name */}

                                        <div className="mb-3">

                                            <label className="form-label">
                                                Workshop Name
                                            </label>

                                            <input
                                                type="text"
                                                name="workshopName"
                                                className="form-control"
                                                value={formData.workshopName}
                                                onChange={handleChange}
                                                required
                                            />

                                        </div>


                                        {/* Workshop Address */}

                                        <div className="mb-3">

                                            <label className="form-label">
                                                Workshop Address
                                            </label>

                                            <textarea
                                                name="workshopAddress"
                                                className="form-control"
                                                rows="3"
                                                value={formData.workshopAddress}
                                                onChange={handleChange}
                                                required
                                            />

                                        </div>


                                        {/* Experience */}

                                        <div className="mb-3">

                                            <label className="form-label">
                                                Experience (Years)
                                            </label>

                                            <input
                                                type="number"
                                                name="experienceYears"
                                                className="form-control"
                                                min="0"
                                                value={formData.experienceYears}
                                                onChange={handleChange}
                                                required
                                            />

                                        </div>


                                        {/* Contact Number */}

                                        <div className="mb-3">

                                            <label className="form-label">
                                                Workshop Contact Number
                                            </label>

                                            <input
                                                type="tel"
                                                name="contactNumber"
                                                className="form-control"
                                                value={formData.contactNumber}
                                                onChange={handleChange}
                                                required
                                            />

                                        </div>

                                    </div>

                                )}


                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={loading}
                                >

                                    {loading
                                        ? "Creating Account..."
                                        : "Register"
                                    }

                                </button>

                            </form>


                            <div className="text-center mt-3">

                                Already have an account?{" "}

                                <Link to="/">
                                    Login
                                </Link>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}

export default Register;