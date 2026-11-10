import { forwardRef } from "react";

/**
 * Labeled input with an optional leading icon and inline error message.
 * Forwards all standard input props (name, value, onChange, type, ...).
 */
const FormField = forwardRef(function FormField(
    { label, icon: Icon, error, id, prefix, hint, className = "", ...inputProps },
    ref
) {
    const inputId = id || inputProps.name;

    return (
        <div className={`field ${error ? "field-invalid" : ""} ${className}`}>

            <label className="field-label" htmlFor={inputId}>
                {label}
            </label>

            <div className="field-control">

                {Icon && (
                    <span className="field-icon" aria-hidden="true">
                        <Icon size={17} strokeWidth={1.8} />
                    </span>
                )}

                {prefix && <span className="field-prefix">{prefix}</span>}

                <input
                    ref={ref}
                    id={inputId}
                    className="field-input"
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    {...inputProps}
                />

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

export default FormField;