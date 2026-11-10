import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MechanicLayout from "../../layouts/MechanicLayout";
import {
    createComplaint,
    getMyComplaints,
    getMyRequests
} from "../../services/mechanicService";
import "../../styles/Mechaniccomplaints.css";

/* =========================================================
   CONSTANTS
   ========================================================= */

const REASONS = [
    "Service issue",
    "Incorrect billing",
    "Customer behaviour",
    "Payment issue",
    "Abuse or misconduct",
    "Other"
];

const COMPLAINT_WINDOW_DAYS = 7;
const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 1000;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const STATUS = {
    OPEN: { label: "Open", tone: "info", note: "Waiting for our team to review it." },
    IN_PROGRESS: { label: "In progress", tone: "warning", note: "Our team is looking into it." },
    RESOLVED: { label: "Resolved", tone: "success", note: "This complaint has been resolved." }
};


/* =========================================================
   HELPERS
   ========================================================= */

const toTime = (value) => {
    const t = value ? new Date(value).getTime() : NaN;
    return Number.isNaN(t) ? 0 : t;
};

const requestIdOf = (request) => request.requestId ?? request.id;

function formatDate(value) {
    if (!toTime(value)) return "—";

    return new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function getDeadline(request) {
    const completed = toTime(request?.completedAt);
    return completed ? completed + COMPLAINT_WINDOW_DAYS * DAY : null;
}

const isWindowOpen = (request) => {
    const deadline = getDeadline(request);
    return deadline !== null && Date.now() <= deadline;
};

function timeLeft(request) {
    const deadline = getDeadline(request);

    if (deadline === null) return { text: "Date unavailable", tone: "closed" };

    const remaining = deadline - Date.now();

    if (remaining <= 0) return { text: "Window closed", tone: "closed" };

    const days = Math.floor(remaining / DAY);

    if (days >= 3) return { text: `${days} days left`, tone: "ok" };

    if (days >= 1) return { text: `${days} ${days === 1 ? "day" : "days"} left`, tone: "soon" };

    const hours = Math.max(1, Math.floor(remaining / HOUR));
    return { text: `${hours} ${hours === 1 ? "hour" : "hours"} left`, tone: "soon" };
}

const personName = (value) => (typeof value === "string" ? value : value?.fullName);


/* =========================================================
   SMALL PIECES
   ========================================================= */

function Choice({ name, type = "radio", value, checked, disabled, onChange, children, className = "" }) {
    return (
        <label className="mc-choice">
            <input type={type} name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} />
            <span className={`mc-choice__card ${className}`}>{children}</span>
        </label>
    );
}

function StatusPill({ status }) {
    const info = STATUS[status];

    return (
        <span className={`mc-pill mc-pill--${info?.tone || "closed"}`}>
            {info?.label || status || "Unknown"}
        </span>
    );
}

function ComplaintItem({ complaint }) {
    const [open, setOpen] = useState(false);

    const id = complaint.id ?? complaint.complaintId;
    const requestId = complaint.serviceRequest?.id ?? complaint.serviceRequestId;
    const against = personName(complaint.reportedAgainst);
    const bodyId = `mc-complaint-${id}`;

    return (
        <li className="mc-item">
            <button
                type="button"
                className="mc-item__btn"
                aria-expanded={open}
                aria-controls={bodyId}
                onClick={() => setOpen((v) => !v)}
            >
                <span className="mc-item__main">
                    <strong>Complaint #{id}</strong>
                    <span className="mc-muted">{complaint.reason || "No reason given"}</span>
                </span>

                <StatusPill status={complaint.status} />

                <svg className="mc-item__chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {open && (
                <div className="mc-item__body" id={bodyId}>
                    <dl className="mc-facts">
                        <div>
                            <dt>Service request</dt>
                            <dd>{requestId ? `#${requestId}` : "—"}</dd>
                        </div>
                        <div>
                            <dt>Submitted</dt>
                            <dd>{formatDate(complaint.createdAt)}</dd>
                        </div>
                        {against && (
                            <div>
                                <dt>Reported against</dt>
                                <dd>{against}</dd>
                            </div>
                        )}
                    </dl>

                    <div>
                        <div className="mc-label">What you told us</div>
                        <div className="mc-quote">{complaint.description || "—"}</div>
                    </div>

                    {STATUS[complaint.status] && (
                        <p className="mc-status-note">{STATUS[complaint.status].note}</p>
                    )}
                </div>
            )}
        </li>
    );
}


/* =========================================================
   PAGE
   ========================================================= */

export default function Complaints() {
    const [requests, setRequests] = useState([]);
    const [complaints, setComplaints] = useState([]);

    const [requestId, setRequestId] = useState("");
    const [reason, setReason] = useState("");
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const revealRef = useRef(null);
    const successRef = useRef(null);

    // silent = refresh in the background without replacing the page with skeletons
    const loadData = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        setLoadError("");

        try {
            const [requestsResponse, complaintsResponse] = await Promise.all([
                getMyRequests(),
                getMyComplaints()
            ]);

            setRequests(requestsResponse.data || []);
            setComplaints(complaintsResponse.data || []);
        } catch (err) {
            console.error("Failed to load complaints:", err);
            setLoadError(err.response?.data?.message || "We couldn't load your services and complaints.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Completed services: ones you can still report first, then the newest
    const services = useMemo(
        () =>
            requests
                .filter((r) => ["COMPLETED", "CLOSED"].includes(r.status))
                .sort(
                    (a, b) =>
                        Number(isWindowOpen(b)) - Number(isWindowOpen(a)) ||
                        toTime(b.completedAt) - toTime(a.completedAt)
                ),
        [requests]
    );

    const hasEligible = useMemo(() => services.some(isWindowOpen), [services]);

    const selectedRequest = useMemo(
        () => services.find((r) => Number(requestIdOf(r)) === Number(requestId)),
        [services, requestId]
    );

    const reportedIds = useMemo(
        () =>
            new Set(
                complaints.map((c) => Number(c.serviceRequest?.id ?? c.serviceRequestId)).filter(Boolean)
            ),
        [complaints]
    );

    const history = useMemo(
        () => [...complaints].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt)),
        [complaints]
    );

    // Bring the newly revealed "What went wrong?" section into view
    useEffect(() => {
        if (!selectedRequest) return;
        const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        revealRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "nearest" });
    }, [selectedRequest]);

    useEffect(() => {
        if (success) successRef.current?.focus();
    }, [success]);

    const trimmed = description.trim();
    const missing = !reason
        ? "Choose what went wrong to continue."
        : trimmed.length < MIN_DESCRIPTION
            ? `Add a little more detail (at least ${MIN_DESCRIPTION} characters).`
            : "";

    function selectRequest(id) {
        setRequestId(String(id));
        setError("");
        setSuccess(false);
    }

    async function submitComplaint(e) {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!selectedRequest || !isWindowOpen(selectedRequest)) {
            setError(`The ${COMPLAINT_WINDOW_DAYS}-day complaint window for this service has closed.`);
            return;
        }

        if (missing) {
            setError(missing);
            return;
        }

        setSubmitting(true);

        try {
            await createComplaint({
                serviceRequestId: Number(requestId),
                reason,
                description: trimmed
            });

            setRequestId("");
            setReason("");
            setDescription("");
            setSuccess(true);

            await loadData({ silent: true });
        } catch (err) {
            console.error("Failed to submit complaint:", err);
            setError(err.response?.data?.message || "We couldn't submit your complaint. Try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <MechanicLayout>
            <div className="mc">
                <h1 className="mc-title">Complaints</h1>
                <p className="mc-sub">
                    Report a problem with a completed service within {COMPLAINT_WINDOW_DAYS} days.
                </p>

                {loadError && (
                    <div className="mc-alert mc-alert--error" role="alert">
                        <span>{loadError}</span>
                        <button type="button" className="mc-btn" onClick={() => loadData()}>Try again</button>
                    </div>
                )}

                {success && (
                    <div className="mc-alert mc-alert--ok" role="status" tabIndex={-1} ref={successRef}>
                        <div>
                            <strong>Complaint submitted</strong>
                            <p>Our team will review it. You can follow its status under "Your complaints".</p>
                        </div>
                    </div>
                )}

                {/* ---------- Raise a complaint ---------- */}
                <section className="mc-card" aria-labelledby="mc-raise">
                    <h2 id="mc-raise">Raise a complaint</h2>
                    <p className="mc-card__hint">Start by choosing the service you want to report.</p>

                    {loading ? (
                        <>
                            <div className="mc-skel" />
                            <div className="mc-skel" />
                        </>
                    ) : !hasEligible ? (
                        <div className="mc-empty">
                            <strong>No services to report</strong>
                            <p>
                                Completed services can be reported for {COMPLAINT_WINDOW_DAYS} days.
                                None of yours are in that window right now.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={submitComplaint} noValidate>
                            <fieldset className="mc-fieldset">
                                <legend className="mc-legend">Which service was it?</legend>

                                <div className="mc-choices">
                                    {services.map((request) => {
                                        const id = requestIdOf(request);
                                        const eligible = isWindowOpen(request);
                                        const left = timeLeft(request);

                                        return (
                                            <Choice
                                                key={id}
                                                name="complaint-service"
                                                value={id}
                                                checked={Number(requestId) === Number(id)}
                                                disabled={!eligible}
                                                onChange={() => selectRequest(id)}
                                            >
                                                <span className="mc-choice__main">
                                                    <strong>Request #{id}</strong>
                                                    <span className="mc-choice__sub">
                                                        {request.issue || "Roadside assistance"}
                                                    </span>
                                                    {request.completedAt && (
                                                        <span className="mc-choice__sub">
                                                            Completed {formatDate(request.completedAt)}
                                                        </span>
                                                    )}
                                                </span>

                                                {reportedIds.has(Number(id)) && (
                                                    <span className="mc-pill mc-pill--info mc-pill--plain">Complaint filed</span>
                                                )}
                                                <span className={`mc-pill mc-pill--${left.tone}`}>{left.text}</span>
                                            </Choice>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            {/* Appears only after a service is selected */}
                            {selectedRequest && (
                                <div className="mc-reveal" ref={revealRef}>
                                    <fieldset className="mc-fieldset">
                                        <legend className="mc-legend">
                                            What went wrong with request #{requestIdOf(selectedRequest)}?
                                        </legend>

                                        <div className="mc-reasons">
                                            {REASONS.map((item) => (
                                                <Choice
                                                    key={item}
                                                    name="complaint-reason"
                                                    value={item}
                                                    checked={reason === item}
                                                    onChange={() => setReason(item)}
                                                >
                                                    {item}
                                                </Choice>
                                            ))}
                                        </div>
                                    </fieldset>

                                    <div>
                                        <label className="mc-label" htmlFor="mc-description">Tell us what happened</label>

                                        <textarea
                                            id="mc-description"
                                            className="mc-textarea"
                                            value={description}
                                            maxLength={MAX_DESCRIPTION}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Describe what happened and anything our support team should know."
                                        />

                                        <div className="mc-count">
                                            <span>Include names, times or amounts if they matter.</span>
                                            <span>{description.length}/{MAX_DESCRIPTION}</span>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="mc-alert mc-alert--error" role="alert" style={{ margin: 0 }}>
                                            {error}
                                        </div>
                                    )}

                                    <div className="mc-actions">
                                        <button type="submit" className="mc-btn mc-btn--dark" disabled={submitting || Boolean(missing)}>
                                            {submitting ? "Submitting…" : "Submit complaint"}
                                        </button>
                                        {missing && !submitting && <span className="mc-need">{missing}</span>}
                                    </div>
                                </div>
                            )}

                            {/* Errors before a service is chosen */}
                            {!selectedRequest && error && (
                                <div className="mc-alert mc-alert--error" role="alert" style={{ marginTop: 20 }}>
                                    {error}
                                </div>
                            )}
                        </form>
                    )}
                </section>

                {/* ---------- History ---------- */}
                <section className="mc-card" aria-labelledby="mc-history">
                    <h2 id="mc-history">Your complaints</h2>
                    <p className="mc-card__hint">Follow the complaints you have already sent.</p>

                    {loading ? (
                        <div className="mc-skel" />
                    ) : history.length === 0 ? (
                        <div className="mc-empty">
                            <strong>No complaints yet</strong>
                            <p>Complaints you submit will show up here with their status.</p>
                        </div>
                    ) : (
                        <ul className="mc-list">
                            {history.map((complaint) => (
                                <ComplaintItem key={complaint.id ?? complaint.complaintId} complaint={complaint} />
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </MechanicLayout>
    );
}