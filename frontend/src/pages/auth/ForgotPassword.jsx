import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    FaArrowLeft,
    FaEnvelope,
    FaPaperPlane,
    FaShieldAlt,
    FaClock,
    FaHeadset,
    FaCheckCircle,
    FaRedo,
    FaSpinner,
} from "react-icons/fa";
import { forgotPassword } from "../../services/authService";
import AuthLayout from "./components/AuthLayout";
import FormField from "./components/FormField";
import StatusMessage from "./components/StatusMessage";
import "../../styles/auth.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN = 30; // seconds

const authLayoutProps = {
    eyebrow: "Account recovery",
    headline: "Let's get you back on the road.",
    subheadline:
        "Enter the email on your RoadAid account and we'll send you a secure link to get back in.",
    trustItems: [
        { icon: <FaShieldAlt />, label: "Your connection is encrypted" },
        { icon: <FaClock />, label: "Reset links expire automatically for your safety" },
        { icon: <FaHeadset />, label: "24/7 support if you get stuck" },
    ],
};

// The API may return a plain string or an object. Only ever render a string,
// otherwise React throws when it tries to render an object.
const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
    return fallback;
};

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [fieldError, setFieldError] = useState("");
    const [loading, setLoading] = useState(false);
    const [backendError, setBackendError] = useState("");
    const [sent, setSent] = useState(false);
    const [resent, setResent] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const headingRef = useRef(null);

    // Countdown for the resend cooldown.
    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    // When the page switches to "Check your email", move focus to the heading
    // so screen-reader users hear what happened.
    useEffect(() => {
        if (sent) headingRef.current?.focus();
    }, [sent]);

    const validate = () => {
        const trimmed = email.trim();
        if (!trimmed) {
            setFieldError("Please enter your email address.");
            return false;
        }
        if (!EMAIL_REGEX.test(trimmed)) {
            setFieldError("Please enter a valid email address.");
            return false;
        }
        return true;
    };

    // Returns true when the link was sent.
    const sendResetLink = async () => {
        setLoading(true);
        setBackendError("");
        try {
            await forgotPassword(email.trim());
            setSent(true);
            setCooldown(RESEND_COOLDOWN);
            return true;
        } catch (err) {
            setBackendError(
                getErrorMessage(err, "We couldn't send the reset link. Please try again.")
            );
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFieldError("");
        setBackendError("");
        if (!validate()) return;
        await sendResetLink();
    };

    const handleResend = async () => {
        if (cooldown > 0 || loading) return;
        setResent(false);
        const ok = await sendResetLink();
        if (ok) setResent(true);
    };

    const handleUseDifferentEmail = () => {
        setSent(false);
        setResent(false);
        setBackendError("");
        setFieldError("");
        setCooldown(0);
    };

    /* ---------- Step 2: link sent ---------- */
    if (sent) {
        return (
            <AuthLayout {...authLayoutProps}>
                <div className="auth-recovery success-panel">
                    <div className="success-panel-icon" aria-hidden="true">
                        <FaCheckCircle size={28} />
                    </div>

                    <h1 ref={headingRef} tabIndex={-1} className="success-panel-title">
                        Check your email
                    </h1>

                    <p className="success-panel-message">
                        If an account exists for{" "}
                        <span className="auth-email-highlight">{email.trim()}</span>, we've sent
                        a link to reset your password. It expires soon, so use it right away.
                    </p>

                    <p className="auth-note">Can't find it? Check your spam folder.</p>

                    {backendError && (
                        <StatusMessage type="error">{backendError}</StatusMessage>
                    )}

                    {resent && !backendError && (
                        <p className="auth-inline-note" role="status">
                            <FaCheckCircle size={14} aria-hidden="true" />
                            We've sent a new link.
                        </p>
                    )}

                    <div className="success-panel-actions">
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={cooldown > 0 || loading}
                            className="btn-secondary btn-block"
                        >
                            {loading ? (
                                <>
                                    <FaSpinner className="spin" aria-hidden="true" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <FaRedo size={13} aria-hidden="true" />
                                    {cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleUseDifferentEmail}
                            className="link-button link-button-lg"
                        >
                            Use a different email
                        </button>
                    </div>

                    <Link to="/login" className="auth-back-link auth-back-link-center">
                        <FaArrowLeft size={13} aria-hidden="true" />
                        Back to login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    /* ---------- Step 1: enter email ---------- */
    return (
        <AuthLayout {...authLayoutProps}>
            <div className="auth-recovery">
                <Link to="/login" className="auth-back-link">
                    <FaArrowLeft size={13} aria-hidden="true" />
                    Back to login
                </Link>

                <div className="auth-form-header">
                    <h1 className="auth-form-title">Forgot your password?</h1>
                    <p className="auth-form-subtitle">
                        Enter the email address on your RoadAid account and we'll send you a link
                        to reset it.
                    </p>
                </div>

                {backendError && <StatusMessage type="error">{backendError}</StatusMessage>}

                <form onSubmit={handleSubmit} noValidate>
                    <FormField
                        id="email"
                        name="email"
                        label="Email address"
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldError) setFieldError("");
                        }}
                        placeholder="name@example.com"
                        icon={FaEnvelope}
                        error={fieldError}
                        autoComplete="email"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        aria-busy={loading}
                        className="btn-primary"
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="spin" aria-hidden="true" />
                                Sending…
                            </>
                        ) : (
                            <>
                                <FaPaperPlane size={14} aria-hidden="true" />
                                Send reset link
                            </>
                        )}
                    </button>
                </form>

                <p className="auth-note">
                    For your security, we don't say whether an email is registered with RoadAid.
                </p>
            </div>
        </AuthLayout>
    );
};

export default ForgotPassword;