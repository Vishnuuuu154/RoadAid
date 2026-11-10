import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    FaArrowLeft,
    FaCheckCircle,
    FaRegCircle,
    FaShieldAlt,
    FaExclamationCircle,
    FaKey,
    FaLock,
    FaSpinner,
} from "react-icons/fa";
import { resetPassword } from "../../services/authService";
import AuthLayout from "./components/AuthLayout";
import PasswordInput from "./components/PasswordInput";
import StatusMessage from "./components/StatusMessage";
import "../../styles/auth.css";

const MIN_LENGTH = 6;

const authLayoutProps = {
    eyebrow: "Secure your account",
    headline: "Choose a new password and get back on the road.",
    subheadline:
        "Pick something strong and memorable. You'll use it every time you log in to RoadAid.",
    trustItems: [
        { icon: <FaLock />, label: "Your password is encrypted, never stored in plain text" },
        { icon: <FaKey />, label: "This link can only be used once" },
        { icon: <FaShieldAlt />, label: "You'll be signed out everywhere else after resetting" },
    ],
};

// 0 = nothing typed, 1 = weak (or too short) ... 4 = strong.
// Uses the same four-step meter as the rest of the auth pages.
const getStrengthLevel = (pwd) => {
    if (!pwd) return 0;
    if (pwd.length < MIN_LENGTH) return 1;
    let score = 1; // meets the minimum length
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(4, score);
};

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

// The API may return a plain string or an object. Only ever render a string.
const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
    return fallback;
};

const Requirement = ({ met, children }) => (
    <li className={met ? "is-met" : ""}>
        {met ? (
            <FaCheckCircle size={14} aria-hidden="true" />
        ) : (
            <FaRegCircle size={14} aria-hidden="true" />
        )}
        <span>{children}</span>
        <span className="auth-sr-only">{met ? " (done)" : " (not done yet)"}</span>
    </li>
);

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [touched, setTouched] = useState({ newPassword: false, confirmPassword: false });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [backendError, setBackendError] = useState("");

    const successHeadingRef = useRef(null);

    useEffect(() => {
        if (success) successHeadingRef.current?.focus();
    }, [success]);

    const meetsLength = newPassword.length >= MIN_LENGTH;
    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
    const strengthLevel = useMemo(() => getStrengthLevel(newPassword), [newPassword]);
    const strengthLabel = meetsLength ? STRENGTH_LABELS[strengthLevel] : "Too short";

    // Errors show after the person leaves a field, or after they press the
    // button. Empty-field errors only appear on submit so tabbing past a
    // field (or tapping the show/hide button) doesn't flash an error.
    const showNewError = touched.newPassword || submitted;
    const showConfirmError = touched.confirmPassword || submitted;

    const newPasswordError = !showNewError
        ? ""
        : !newPassword
            ? submitted
                ? "Enter a new password."
                : ""
            : !meetsLength
                ? `Use at least ${MIN_LENGTH} characters.`
                : "";

    const confirmPasswordError = !showConfirmError
        ? ""
        : !confirmPassword
            ? submitted
                ? "Confirm your new password."
                : ""
            : !passwordsMatch
                ? "Passwords don't match."
                : "";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBackendError("");
        setSubmitted(true);

        // Send the person to the first field that needs attention.
        if (!meetsLength) {
            document.getElementById("newPassword")?.focus();
            return;
        }
        if (!passwordsMatch) {
            document.getElementById("confirmPassword")?.focus();
            return;
        }

        try {
            setLoading(true);
            await resetPassword(token, newPassword);
            setSuccess(true);
        } catch (err) {
            setBackendError(
                getErrorMessage(
                    err,
                    "We couldn't reset your password. The link may have expired."
                )
            );
        } finally {
            setLoading(false);
        }
    };

    /* ---------- Missing or malformed link ---------- */
    if (!token) {
        return (
            <AuthLayout {...authLayoutProps}>
                <div className="auth-recovery success-panel">
                    <div className="success-panel-icon is-error" aria-hidden="true">
                        <FaExclamationCircle size={28} />
                    </div>

                    <h1 className="success-panel-title">This link isn't valid</h1>

                    <p className="success-panel-message">
                        The reset link is missing or incomplete. Request a new one and we'll email
                        you a fresh link.
                    </p>

                    <div className="success-panel-actions">
                        <Link to="/forgot-password" className="btn-primary">
                            Request a new link
                        </Link>
                    </div>

                    <Link to="/login" className="auth-back-link auth-back-link-center">
                        <FaArrowLeft size={13} aria-hidden="true" />
                        Back to login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    /* ---------- Password changed ---------- */
    if (success) {
        return (
            <AuthLayout {...authLayoutProps}>
                <div className="auth-recovery success-panel">
                    <div className="success-panel-icon" aria-hidden="true">
                        <FaCheckCircle size={28} />
                    </div>

                    <h1 ref={successHeadingRef} tabIndex={-1} className="success-panel-title">
                        Password updated
                    </h1>

                    <p className="success-panel-message">
                        Your RoadAid password has been changed. You can now log in with your new
                        password.
                    </p>

                    <div className="success-panel-actions">
                        <Link to="/login" className="btn-primary">
                            Continue to login
                        </Link>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    /* ---------- Choose a new password ---------- */
    return (
        <AuthLayout {...authLayoutProps}>
            <div className="auth-recovery">
                <Link to="/login" className="auth-back-link">
                    <FaArrowLeft size={13} aria-hidden="true" />
                    Back to login
                </Link>

                <div className="auth-form-header">
                    <h1 className="auth-form-title">Create a new password</h1>
                    <p className="auth-form-subtitle">
                        Choose a new password for your RoadAid account.
                    </p>
                </div>

                {backendError && <StatusMessage type="error">{backendError}</StatusMessage>}

                <form onSubmit={handleSubmit} noValidate>
                    <PasswordInput
                        id="newPassword"
                        name="newPassword"
                        label="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
                        placeholder="Enter your new password"
                        error={newPasswordError}
                        autoComplete="new-password"
                        required
                    />

                    {newPassword.length > 0 && (
                        <div className="password-strength">
                            <div className="password-strength-bar" aria-hidden="true">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className={`password-strength-segment${
                                            i <= strengthLevel ? ` is-filled level-${strengthLevel}` : ""
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="password-strength-label">
                                Password strength: {strengthLabel}
                            </p>
                        </div>
                    )}

                    <PasswordInput
                        id="confirmPassword"
                        name="confirmPassword"
                        label="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                        placeholder="Re-enter your new password"
                        error={confirmPasswordError}
                        autoComplete="new-password"
                        required
                    />

                    <div className="auth-requirements">
                        <p id="password-requirements-title" className="password-requirements-title">
                            Password requirements
                        </p>
                        <ul
                            className="password-requirements password-requirements-stack"
                            aria-labelledby="password-requirements-title"
                        >
                            <Requirement met={meetsLength}>
                                At least {MIN_LENGTH} characters
                            </Requirement>
                            <Requirement met={passwordsMatch}>Both passwords match</Requirement>
                        </ul>
                        <p className="auth-note">
                            Your new password must be different from your current one.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        aria-busy={loading}
                        className="btn-primary"
                    >
                        {loading ? (
                            <>
                                <FaSpinner className="spin" aria-hidden="true" />
                                Updating password…
                            </>
                        ) : (
                            "Reset password"
                        )}
                    </button>
                </form>

                <p className="auth-form-footer">
                    Link expired? <Link to="/forgot-password">Request a new one</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default ResetPassword;