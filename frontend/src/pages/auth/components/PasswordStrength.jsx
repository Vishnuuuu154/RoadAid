import { Check, X } from "lucide-react";

/**
 * Purely cosmetic strength feedback. This does NOT change validation —
 * the backend/form still only requires 8+ characters (see Register.jsx).
 * It just helps users choose a stronger password if they want to.
 */
const REQUIREMENTS = [
    { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
    { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
    { id: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getScore(password) {
    return REQUIREMENTS.reduce((score, req) => score + (req.test(password) ? 1 : 0), 0);
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

function PasswordStrength({ password }) {
    if (!password) return null;

    const score = getScore(password);

    return (
        <div className="password-strength" aria-live="polite">

            <div className="password-strength-bar">
                {[0, 1, 2, 3].map((i) => (
                    <span
                        key={i}
                        className={`password-strength-segment ${i < score ? `is-filled level-${score}` : ""}`}
                    />
                ))}
            </div>

            <p className="password-strength-label">{LABELS[score]}</p>

            <ul className="password-requirements">
                {REQUIREMENTS.map((req) => {
                    const met = req.test(password);
                    return (
                        <li key={req.id} className={met ? "is-met" : ""}>
                            {met ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2} />}
                            {req.label}
                        </li>
                    );
                })}
            </ul>

        </div>
    );
}

export default PasswordStrength;