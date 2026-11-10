import { forwardRef, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

/**
 * Password field with a leading lock icon and a show/hide toggle.
 * Forwards all standard input props (name, value, onChange, autoComplete, ...).
 */
const PasswordInput = forwardRef(function PasswordInput(
    { label, error, id, hint, className = "", ...inputProps },
    ref
) {
    const [visible, setVisible] = useState(false);
    const inputId = id || inputProps.name;

    return (
        <div className={`field ${error ? "field-invalid" : ""} ${className}`}>

            <label className="field-label" htmlFor={inputId}>
                {label}
            </label>

            <div className="field-control">

                <span className="field-icon" aria-hidden="true">
                    <Lock size={17} strokeWidth={1.8} />
                </span>

                <input
                    ref={ref}
                    id={inputId}
                    type={visible ? "text" : "password"}
                    className="field-input field-input-password"
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    {...inputProps}
                />

                <button
                    type="button"
                    className="field-toggle"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    tabIndex={0}
                >
                    {visible ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                </button>

            </div>

            {hint && !error && <p className="field-hint">{hint}</p>}

            {error && (
                <p className="field-error" id={`${inputId}-error`} role="alert">
                    {error}
                </p>
            )}

        </div>
    );
});

export default PasswordInput;