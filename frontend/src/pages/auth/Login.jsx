import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ShieldCheck, MapPin, Clock, ArrowRight, Loader2 } from "lucide-react";
import "./../../styles/auth.css";
import { login, saveUser } from "../../services/authService";
import AuthLayout from "./components/AuthLayout";
import FormField from "./components/FormField";
import PasswordInput from "./components/PasswordInput";
import StatusMessage from "./components/StatusMessage";

function Login() {

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);


    const handleChange = (e) => {

        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (isSubmitting) return;

        setError("");
        setIsSubmitting(true);

        try {

            const response = await login(formData);

            saveUser(response.data);

            if (response.data.role === "ADMIN") {

                navigate("/admin");


            } else if (response.data.role === "MECHANIC") {

                navigate("/mechanic");
            } else if (response.data.role === "TOWING_PROVIDER") {
                navigate("/towing/dashboard");


            } else {

                navigate("/customer");


            }

        } catch (err) {

            if (err.response) {

                setError(err.response.data.message);

            } else {

                setError("Server not reachable.");

            }

            setIsSubmitting(false);

        }

    };

    return (

        <AuthLayout
            eyebrow="RoadAid"
            headline="Help is never far away."
            subheadline="Sign in to connect with reliable roadside assistance whenever you need it, wherever the road takes you."
            trustItems={[
                { icon: <Clock size={15} strokeWidth={1.8} />, label: "Average response under 20 minutes" },
                { icon: <MapPin size={15} strokeWidth={1.8} />, label: "Verified mechanics near you" },
                { icon: <ShieldCheck size={15} strokeWidth={1.8} />, label: "Every provider background checked" },
            ]}
        >

            <div className="auth-form-header">
                <h2 className="auth-form-title">Welcome back</h2>
                <p className="auth-form-subtitle">Sign in to your RoadAid account to continue.</p>
            </div>

            <StatusMessage type="error">{error}</StatusMessage>

            <form onSubmit={handleSubmit} noValidate>

                <FormField
                    label="Email"
                    icon={Mail}
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <PasswordInput
                    label="Password"
                    name="password"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <div className="auth-form-row">

                    <label className="checkbox-field">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span>Remember me</span>
                    </label>

                    <Link
                        to="/forgot-password"
                        className="link-button"
                    >
                        Forgot password?
                    </Link>

                </div>



                <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={17} className="spin" />
                            Signing in…
                        </>
                    ) : (
                        <>
                            Sign in
                            <ArrowRight size={17} strokeWidth={2} />
                        </>
                    )}
                </button>

            </form>

            <p className="auth-form-footer">
                New to RoadAid?{" "}
                <Link to="/register">Create an account</Link>
            </p>

        </AuthLayout>

    );

}

export default Login;