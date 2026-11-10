import { useEffect, useRef } from "react";
import { FaCopy, FaExclamationTriangle } from "react-icons/fa";

/* ================================================================== */
/* Shared pieces for the admin verification pages                     */
/*                                                                      */
/* Extracted from ProviderVerification.jsx so VehicleVerification.jsx  */
/* (and anything else under /admin/*-verification) can reuse the same  */
/* look, components and interaction patterns instead of reinventing    */
/* them — which is how the two pages drifted apart (Bootstrap cards vs */
/* Tailwind, toasts vs alert()) in the first place.                    */
/*                                                                      */
/* Styling comes from styles/ProviderVerification.css (the "pv-*"      */
/* classes below) — import that file wherever these are used.          */
/* ================================================================== */

/* ---------- Formatting helpers ---------- */

export const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?";

export const dateText = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

export const timeText = (date) => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

export const errorText = (error, fallback) => error?.response?.data?.message || fallback;

/* ---------- Small display pieces ---------- */

export function Detail({ icon, label, children }) {
    return (
        <div className="pv-detail">
            <span className="pv-detail-icon" aria-hidden="true">{icon}</span>
            <div>
                <span className="pv-detail-label">{label}</span>
                <span className="pv-detail-value">{children}</span>
            </div>
        </div>
    );
}

export function CopyButton({ value, label }) {
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            /* Clipboard can be blocked; the text is still selectable. */
        }
    };

    return (
        <button type="button" className="pv-copy" onClick={copy} aria-label={`Copy ${label}`}>
            <FaCopy aria-hidden="true" />
        </button>
    );
}

export function Row({ label, value, href, copy }) {
    return (
        <div className="pv-row">
            <dt>{label}</dt>
            <dd>
                {value ? (
                    <>
                        {href ? <a href={href}>{value}</a> : <span>{value}</span>}
                        {copy && <CopyButton value={value} label={label.toLowerCase()} />}
                    </>
                ) : (
                    <em>Not provided</em>
                )}
            </dd>
        </div>
    );
}

export function SkeletonCards({ count = 4 }) {
    return (
        <div className="pv-grid" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <div className="pv-card pv-skel" key={i}>
                    <div className="pv-skel-row">
                        <span className="pv-skel-block pv-skel-avatar" />
                        <span className="pv-skel-block pv-skel-line" />
                    </div>
                    <span className="pv-skel-block pv-skel-box" />
                    <span className="pv-skel-block pv-skel-btn" />
                </div>
            ))}
        </div>
    );
}

export function ToastBanner({ toast }) {
    if (!toast) return null;
    return (
        <div className={`pv-toast pv-toast-${toast.tone}`} role="status" aria-live="polite">
            {toast.icon}
            <span>{toast.message}</span>
        </div>
    );
}

/* ---------- Dialogs ---------- */

/* A single yes/no confirmation, e.g. "Approve this mechanic?" / "Approve this vehicle?".
   The caller supplies the title/message/warning text — this component has no
   opinion on what kind of thing is being approved. */
export function ConfirmDialog({
                                  icon,
                                  title,
                                  message,
                                  warning,
                                  tone = "approve",
                                  confirmLabel = "Yes, approve",
                                  busyLabel = "Working…",
                                  busy,
                                  onCancel,
                                  onConfirm,
                              }) {
    const confirmRef = useRef(null);

    useEffect(() => {
        confirmRef.current?.focus();
        const onKey = (e) => {
            if (e.key === "Escape" && !busy) onCancel();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [busy, onCancel]);

    return (
        <div className="pv-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
            <div className="pv-dialog" role="dialog" aria-modal="true" aria-labelledby="pv-dialog-title">
                {icon && <span className="pv-dialog-icon" aria-hidden="true">{icon}</span>}
                <h2 id="pv-dialog-title">{title}</h2>
                {message && <p>{message}</p>}

                {warning && (
                    <p className="pv-dialog-warn">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{warning}</span>
                    </p>
                )}

                <div className="pv-dialog-actions">
                    <button type="button" className="pv-btn" onClick={onCancel} disabled={busy}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        ref={confirmRef}
                        className={`pv-btn ${tone === "reject" ? "pv-btn-reject-solid" : "pv-btn-approve"}`}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* A confirmation that requires typing a reason first, e.g. rejecting a
   provider, a vehicle, or a single document. */
export function ReasonDialog({
                                 title,
                                 label = "Reason",
                                 placeholder = "Write the reason the recipient will see…",
                                 value,
                                 onChange,
                                 minLength = 10,
                                 maxLength = 300,
                                 confirmLabel = "Confirm rejection",
                                 busyLabel = "Rejecting…",
                                 busy,
                                 onCancel,
                                 onConfirm,
                             }) {
    const ok = value.trim().length >= minLength;
    const textRef = useRef(null);

    useEffect(() => {
        textRef.current?.focus();
        const onKey = (e) => {
            if (e.key === "Escape" && !busy) onCancel();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busy]);

    return (
        <div className="pv-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
            <div className="pv-dialog pv-dialog-reason" role="dialog" aria-modal="true" aria-labelledby="pv-reason-title">
                <h2 id="pv-reason-title">{title}</h2>

                <label htmlFor="pv-reason-text" className="pv-reject-title">
                    {label}
                </label>
                <textarea
                    id="pv-reason-text"
                    ref={textRef}
                    rows={3}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={busy}
                />
                <div className="pv-reject-foot">
                    <span className={ok ? "" : "pv-hint"}>
                        {ok ? `${value.trim().length}/${maxLength}` : `At least ${minLength} characters`}
                    </span>
                </div>

                <div className="pv-dialog-actions">
                    <button type="button" className="pv-btn" onClick={onCancel} disabled={busy}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="pv-btn pv-btn-reject-solid"
                        onClick={onConfirm}
                        disabled={busy || !ok}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}