import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const ICONS = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
};

/**
 * Inline status banner used for backend error / success / info messages.
 * Always renders the message exactly as received — never rewrites
 * backend text.
 */
function StatusMessage({ type = "info", children }) {
    if (!children) return null;

    const Icon = ICONS[type] || Info;

    return (
        <div className={`status-message status-${type}`} role={type === "error" ? "alert" : "status"}>
            <Icon size={17} strokeWidth={1.8} className="status-message-icon" />
            <span>{children}</span>
        </div>
    );
}

export default StatusMessage;