import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import {
    createComplaint,
    getMyComplaints,
    getMyRequests,
} from "../../services/customerService";
import "../../styles/Complaints.css";
import {
    FaCheck,
    FaCheckCircle,
    FaChevronDown,
    FaClock,
    FaCommentDots,
    FaCreditCard,
    FaEllipsisH,
    FaExclamationTriangle,
    FaPaperPlane,
    FaReceipt,
    FaSearch,
    FaSyncAlt,
    FaTimes,
    FaUserShield,
    FaWrench,
} from "react-icons/fa";

/* -------------------------------------------------------------------------
   Config
   ------------------------------------------------------------------------- */

// `id` is the exact text sent to the backend as `reason`, so keep it unchanged.
const REASONS = [
    { id: "Service quality", icon: FaWrench, hint: "The repair or assistance didn't meet your expectations." },
    { id: "Incorrect billing", icon: FaReceipt, hint: "The final amount or quote looks wrong." },
    { id: "Mechanic behaviour", icon: FaUserShield, hint: "Unprofessional or worrying behaviour." },
    { id: "Delay / no-show", icon: FaClock, hint: "The mechanic was very late or never arrived." },
    { id: "Payment issue", icon: FaCreditCard, hint: "A problem with a payment, refund or transaction." },
    { id: "Other", icon: FaEllipsisH, hint: "Anything else about your service." },
];

const STATUS = {
    OPEN: ["Open", "warning"],
    IN_REVIEW: ["In review", "info"],
    RESOLVED: ["Resolved", "success"],
    REJECTED: ["Rejected", "danger"],
};

const FILTERS = [
    ["ALL", "All"],
    ["OPEN", "Open"],
    ["IN_REVIEW", "In review"],
    ["RESOLVED", "Resolved"],
    ["REJECTED", "Rejected"],
];

const COMPLAINT_WINDOW_DAYS = 7;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MAX_LENGTH = 1000;

/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */

function getComplaintDeadline(request) {
    if (!request?.completedAt) return null;
    const completedAt = new Date(request.completedAt);
    if (Number.isNaN(completedAt.getTime())) return null;
    return new Date(completedAt.getTime() + COMPLAINT_WINDOW_DAYS * DAY);
}

function isComplaintWindowOpen(request) {
    const deadline = getComplaintDeadline(request);
    return Boolean(deadline) && new Date() <= deadline;
}

function getRemainingText(request) {
    const deadline = getComplaintDeadline(request);
    if (!deadline) return "Date unavailable";

    const remaining = deadline.getTime() - Date.now();
    if (remaining <= 0) return "Window closed";

    const days = Math.floor(remaining / DAY);
    if (days >= 1) return `${days} ${days === 1 ? "day" : "days"} left`;

    const hours = Math.floor(remaining / HOUR);
    if (hours < 1) return "Less than an hour left";
    return `${hours} ${hours === 1 ? "hour" : "hours"} left`;
}

function formatDate(value, withYear = false) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        ...(withYear ? { year: "numeric" } : {}),
        hour: "numeric",
        minute: "2-digit",
    });
}

const requestNumberOf = (complaint) =>
    complaint.serviceRequest?.id ?? complaint.serviceRequest?.requestId ?? "";

/* -------------------------------------------------------------------------
   Small building blocks
   ------------------------------------------------------------------------- */

function Badge({ status }) {
    const [label, tone] = STATUS[status] || [status || "Unknown", "muted"];
    return <span className={`cc-badge ${tone}`}>{label}</span>;
}

function ComplaintProgress({ status }) {
    const rejected = status === "REJECTED";
    const steps = [
        { label: "Submitted" },
        { label: "In review" },
        { label: rejected ? "Rejected" : "Resolved" },
    ];

    // index of the step the complaint is on right now
    const index = { OPEN: 0, IN_REVIEW: 1, RESOLVED: 2, REJECTED: 2 }[status] ?? -1;
    const resolved = status === "RESOLVED";

    return (
        <ol className="cc-steps" aria-label="Complaint progress">
            {steps.map((step, i) => {
                const done = resolved ? true : i < index;
                const current = !resolved && i === index;
                const bad = rejected && current;

                return (
                    <li
                        key={step.label}
                        className={`cc-step ${done ? "done" : ""} ${current ? "current" : ""} ${bad ? "bad" : ""}`}
                        aria-current={current ? "step" : undefined}
                    >
                        <span className="cc-step-dot">
                            {done && <FaCheck aria-hidden="true" />}
                            {bad && <FaTimes aria-hidden="true" />}
                        </span>
                        {step.label}
                        <span className="cc-sr">{done ? " (done)" : current ? " (current step)" : ""}</span>
                    </li>
                );
            })}
        </ol>
    );
}

/* -------------------------------------------------------------------------
   Page
   ------------------------------------------------------------------------- */

export default function Complaints() {
    const [searchParams] = useSearchParams();
    const urlRequestId = searchParams.get("requestId") || "";

    const [complaints, setComplaints] = useState([]);
    const [requests, setRequests] = useState([]);
    const [requestId, setRequestId] = useState(urlRequestId);
    const [reason, setReason] = useState(REASONS[0].id);
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [showForm, setShowForm] = useState(Boolean(urlRequestId));
    const [expandedId, setExpandedId] = useState(null);
    const [historySearch, setHistorySearch] = useState("");
    const [historyFilter, setHistoryFilter] = useState("ALL");

    const successRef = useRef(null);

    /* ---------- Loading ---------- */

    async function load({ silent = false } = {}) {
        if (!silent) setLoading(true);
        setLoadError("");

        try {
            const [complaintResponse, requestResponse] = await Promise.all([
                getMyComplaints(),
                getMyRequests(),
            ]);

            setComplaints(complaintResponse.data || []);
            setRequests(requestResponse.data || []);
        } catch (e) {
            setLoadError(e.response?.data?.message || "Couldn't load your complaints.");
        } finally {
            setLoading(false);
        }
    }

    async function refreshComplaints() {
        setRefreshing(true);
        try {
            await load({ silent: true });
        } finally {
            setRefreshing(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (urlRequestId) {
            setRequestId(urlRequestId);
            setShowForm(true);
        }
    }, [urlRequestId]);

    useEffect(() => {
        if (!successMessage) return;
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        successRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    }, [successMessage]);

    /* ---------- Derived data ---------- */

    const completedRequests = useMemo(
        () => requests.filter((r) => ["COMPLETED", "CLOSED"].includes(r.status)),
        [requests]
    );

    // Requests still inside the 7-day window first, then the rest, newest first.
    const sortedRequests = useMemo(
        () =>
            [...completedRequests].sort(
                (a, b) =>
                    Number(isComplaintWindowOpen(b)) - Number(isComplaintWindowOpen(a)) ||
                    Number(b.requestId) - Number(a.requestId)
            ),
        [completedRequests]
    );

    const eligibleCount = useMemo(
        () => completedRequests.filter((r) => isComplaintWindowOpen(r)).length,
        [completedRequests]
    );

    const selectedRequest = useMemo(
        () => completedRequests.find((r) => Number(r.requestId) === Number(requestId)),
        [completedRequests, requestId]
    );

    const selectedEligible = Boolean(selectedRequest) && isComplaintWindowOpen(selectedRequest);
    const cameFromRequest = Boolean(urlRequestId);

    const filterCounts = useMemo(() => {
        const counts = { ALL: complaints.length };
        FILTERS.slice(1).forEach(([key]) => {
            counts[key] = complaints.filter((c) => c.status === key).length;
        });
        return counts;
    }, [complaints]);

    const filteredComplaints = useMemo(() => {
        const query = historySearch.trim().toLowerCase();

        return complaints.filter((complaint) => {
            if (historyFilter !== "ALL" && complaint.status !== historyFilter) return false;
            if (!query) return true;

            return [
                complaint.id,
                requestNumberOf(complaint),
                complaint.reason,
                complaint.description,
                complaint.status,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [complaints, historyFilter, historySearch]);

    const canSubmit = selectedEligible && Boolean(description.trim()) && !submitting;

    const submitNote = !selectedRequest
        ? "Choose a completed service to continue."
        : !selectedEligible
            ? "This service is outside the 7-day complaint window."
            : !description.trim()
                ? "Describe what happened before you submit."
                : "Your complaint will be linked to this service.";

    /* ---------- Actions ---------- */

    async function submitComplaint(e) {
        e.preventDefault();
        setSuccessMessage("");
        setFormError("");

        if (!requestId) {
            setFormError("Choose the completed service you want to report.");
            return;
        }

        const currentRequest = requests.find((r) => Number(r.requestId) === Number(requestId));

        if (!currentRequest || !isComplaintWindowOpen(currentRequest)) {
            setFormError("The 7-day complaint window for this service has closed.");
            return;
        }

        if (!description.trim()) {
            setFormError("Describe what happened before you submit.");
            return;
        }

        try {
            setSubmitting(true);

            await createComplaint({
                serviceRequestId: Number(requestId),
                reason,
                description: description.trim(),
            });

            setRequestId("");
            setReason(REASONS[0].id);
            setDescription("");
            setShowForm(false);
            setSuccessMessage("Our support team will review it. You can follow its progress in your complaints below.");

            await load({ silent: true });
        } catch (err) {
            setFormError(err.response?.data?.message || "Couldn't submit your complaint. Try again.");
        } finally {
            setSubmitting(false);
        }
    }

    function openForm() {
        setSuccessMessage("");
        setFormError("");
        setRequestId("");
        setReason(REASONS[0].id);
        setDescription("");
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setFormError("");
    }

    function clearFilters() {
        setHistorySearch("");
        setHistoryFilter("ALL");
    }

    /* ---------- Render ---------- */

    return (
        <CustomerLayout>
            <div className="cc-page">

                <header className="cc-head">
                    <div>
                        <h1>Complaints</h1>
                        <p>
                            Something went wrong with a service? Tell us within {COMPLAINT_WINDOW_DAYS} days
                            of it finishing and we'll look into it.
                        </p>
                    </div>
                    {!showForm && (
                        <button type="button" className="cc-btn primary" onClick={openForm}>
                            <FaCommentDots aria-hidden="true" />Raise a complaint
                        </button>
                    )}
                </header>

                {loadError && (
                    <div className="cc-alert warn" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <div className="cc-alert-body">
                            <strong>{loadError}</strong>
                            <p>Check your connection, then try again.</p>
                        </div>
                        <button type="button" className="cc-btn secondary" onClick={() => load()} disabled={loading}>
                            Try again
                        </button>
                    </div>
                )}

                {successMessage && (
                    <div className="cc-alert success" role="status" ref={successRef}>
                        <FaCheckCircle aria-hidden="true" />
                        <div className="cc-alert-body">
                            <strong>Complaint submitted</strong>
                            <p>{successMessage}</p>
                        </div>
                    </div>
                )}

                {/* ---------- Form ---------- */}
                {showForm && (
                    <section className="cc-card" aria-labelledby="cc-form-title">
                        <div className="cc-card-head">
                            <div>
                                <h2 id="cc-form-title">
                                    {cameFromRequest ? "Tell us what went wrong" : "Raise a complaint"}
                                </h2>
                                <p className="cc-muted">
                                    Complaints are accepted within {COMPLAINT_WINDOW_DAYS} days of a service being completed.
                                </p>
                            </div>
                            <button type="button" className="cc-btn secondary cc-icon-btn" onClick={closeForm} aria-label="Close form">
                                <FaTimes aria-hidden="true" />
                            </button>
                        </div>

                        {loading ? (
                            <div className="cc-skel" style={{ height: 220 }} aria-hidden="true" />
                        ) : completedRequests.length === 0 ? (
                            <div className="cc-empty">
                                <strong>No completed services yet</strong>
                                <p>Once a roadside service is finished, you can report a problem with it here.</p>
                            </div>
                        ) : (
                            <form className="cc-form" onSubmit={submitComplaint} noValidate>

                                <fieldset className="cc-fieldset">
                                    <legend>Which service was it?</legend>
                                    {eligibleCount === 0 && (
                                        <p className="cc-muted cc-legend-note">
                                            None of your services are inside the {COMPLAINT_WINDOW_DAYS}-day window right now.
                                        </p>
                                    )}

                                    <div className="cc-options">
                                        {sortedRequests.map((r) => {
                                            const eligible = isComplaintWindowOpen(r);
                                            return (
                                                <label className="cc-option" key={r.requestId}>
                                                    <input
                                                        type="radio"
                                                        name="cc-service"
                                                        className="cc-radio"
                                                        value={r.requestId}
                                                        checked={Number(requestId) === Number(r.requestId)}
                                                        disabled={!eligible}
                                                        onChange={() => {
                                                            setRequestId(String(r.requestId));
                                                            setSuccessMessage("");
                                                            setFormError("");
                                                        }}
                                                    />
                                                    <span className="cc-option-card">
                                                        <span className="cc-option-main">
                                                            <strong>Request #{r.requestId}</strong>
                                                            <span className="cc-option-sub">{r.issue || "Roadside assistance"}</span>
                                                            {r.completedAt && (
                                                                <span className="cc-option-sub">Completed {formatDate(r.completedAt)}</span>
                                                            )}
                                                        </span>
                                                        <span className={`cc-time ${eligible ? "" : "closed"}`}>
                                                            {getRemainingText(r)}
                                                        </span>
                                                        <FaCheck className="cc-check" aria-hidden="true" />
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {selectedRequest && !selectedEligible && (
                                        <div className="cc-note warn" role="alert">
                                            <FaExclamationTriangle aria-hidden="true" />
                                            <span>
                                                {getComplaintDeadline(selectedRequest)
                                                    ? `Request #${selectedRequest.requestId} is past its ${COMPLAINT_WINDOW_DAYS}-day complaint window, so a complaint can't be submitted for it.`
                                                    : `Request #${selectedRequest.requestId} has no completion date, so we can't work out its ${COMPLAINT_WINDOW_DAYS}-day window yet.`}
                                            </span>
                                        </div>
                                    )}

                                    {requestId && !selectedRequest && (
                                        <div className="cc-note warn" role="alert">
                                            <FaExclamationTriangle aria-hidden="true" />
                                            <span>We couldn't find a completed service #{requestId}. Choose one from the list.</span>
                                        </div>
                                    )}
                                </fieldset>

                                <fieldset className="cc-fieldset">
                                    <legend>What went wrong?</legend>
                                    <div className="cc-reasons">
                                        {REASONS.map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <label className="cc-option" key={item.id}>
                                                    <input
                                                        type="radio"
                                                        name="cc-reason"
                                                        className="cc-radio"
                                                        value={item.id}
                                                        checked={reason === item.id}
                                                        onChange={() => setReason(item.id)}
                                                    />
                                                    <span className="cc-option-card cc-reason">
                                                        <span className="cc-reason-icon" aria-hidden="true"><Icon /></span>
                                                        <strong>{item.id}</strong>
                                                        <span className="cc-option-sub">{item.hint}</span>
                                                        <FaCheck className="cc-check" aria-hidden="true" />
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </fieldset>

                                <div className="cc-field">
                                    <div className="cc-field-head">
                                        <label htmlFor="cc-description">Tell us what happened</label>
                                        <span className={`cc-counter ${description.length > 850 ? "near" : ""}`}>
                                            {description.length}/{MAX_LENGTH}
                                        </span>
                                    </div>
                                    <textarea
                                        id="cc-description"
                                        value={description}
                                        maxLength={MAX_LENGTH}
                                        onChange={(e) => setDescription(e.target.value)}
                                        aria-describedby="cc-description-help"
                                        placeholder="What happened, when it happened, and anything else our team should know."
                                    />
                                    <p className="cc-muted" id="cc-description-help">
                                        Clear, factual details help us look into it faster.
                                    </p>
                                </div>

                                {formError && (
                                    <div className="cc-note error" role="alert">
                                        <FaExclamationTriangle aria-hidden="true" />
                                        <span>{formError}</span>
                                    </div>
                                )}

                                <div className="cc-actions">
                                    <p className="cc-submit-note" id="cc-submit-note">{submitNote}</p>
                                    <button type="button" className="cc-btn secondary" onClick={closeForm} disabled={submitting}>
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="cc-btn primary"
                                        disabled={!canSubmit}
                                        aria-describedby="cc-submit-note"
                                    >
                                        <FaPaperPlane aria-hidden="true" />
                                        {submitting ? "Submitting…" : "Submit complaint"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                )}

                {/* ---------- History ---------- */}
                <section className="cc-card" aria-labelledby="cc-history-title">
                    <div className="cc-card-head">
                        <div>
                            <h2 id="cc-history-title">Your complaints</h2>
                            <p className="cc-muted">Follow the complaints you've already submitted.</p>
                        </div>
                        <button
                            type="button"
                            className="cc-btn secondary cc-icon-btn"
                            onClick={refreshComplaints}
                            disabled={loading || refreshing}
                            aria-label={refreshing ? "Refreshing" : "Refresh complaints"}
                            title="Refresh"
                        >
                            <FaSyncAlt className={refreshing ? "cc-spin" : ""} aria-hidden="true" />
                        </button>
                    </div>

                    {complaints.length > 0 && (
                        <div className="cc-tools">
                            <div className="cc-search">
                                <FaSearch aria-hidden="true" />
                                <input
                                    type="search"
                                    value={historySearch}
                                    onChange={(e) => setHistorySearch(e.target.value)}
                                    placeholder="Search by number, reason or words"
                                    aria-label="Search complaints"
                                />
                            </div>

                            <div className="cc-chips" role="group" aria-label="Filter by status">
                                {FILTERS.map(([key, label]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        className="cc-chip"
                                        aria-pressed={historyFilter === key}
                                        onClick={() => setHistoryFilter(key)}
                                    >
                                        {label}
                                        <span className="cc-chip-count">{filterCounts[key]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="cc-list" aria-hidden="true">
                            {[0, 1, 2].map((i) => <div key={i} className="cc-skel" style={{ height: 76 }} />)}
                        </div>
                    ) : filteredComplaints.length === 0 ? (
                        <div className="cc-empty">
                            <strong>
                                {complaints.length === 0 ? "No complaints yet" : "No complaints match"}
                            </strong>
                            <p>
                                {complaints.length === 0
                                    ? `If a completed service goes wrong, you can raise a complaint within ${COMPLAINT_WINDOW_DAYS} days.`
                                    : "Try a different search or status."}
                            </p>
                            {complaints.length > 0 && (
                                <button type="button" className="cc-btn secondary" onClick={clearFilters}>
                                    Clear search and filters
                                </button>
                            )}
                            {complaints.length === 0 && !showForm && (
                                <button type="button" className="cc-btn primary" onClick={openForm}>
                                    <FaCommentDots aria-hidden="true" />Raise a complaint
                                </button>
                            )}
                        </div>
                    ) : (
                        <ul className="cc-list">
                            {filteredComplaints.map((complaint) => {
                                const expanded = expandedId === complaint.id;
                                const detailId = `cc-detail-${complaint.id}`;
                                const reqNumber = requestNumberOf(complaint);

                                return (
                                    <li className="cc-item" key={complaint.id}>
                                        <h3>
                                            <button
                                                type="button"
                                                className="cc-item-btn"
                                                aria-expanded={expanded}
                                                aria-controls={detailId}
                                                onClick={() => setExpandedId(expanded ? null : complaint.id)}
                                            >
                                                <span className="cc-item-icon" aria-hidden="true"><FaCommentDots /></span>
                                                <span className="cc-item-main">
                                                    <strong>Complaint #{complaint.id}</strong>
                                                    <span className="cc-item-sub">
                                                        {reqNumber !== "" ? `Request #${reqNumber}` : "Request not shown"}
                                                    </span>
                                                    {complaint.reason && <span className="cc-item-sub">{complaint.reason}</span>}
                                                </span>
                                                <Badge status={complaint.status} />
                                                <FaChevronDown className={`cc-item-chevron ${expanded ? "open" : ""}`} aria-hidden="true" />
                                            </button>
                                        </h3>

                                        {expanded && (
                                            <div className="cc-detail" id={detailId}>
                                                <ComplaintProgress status={complaint.status} />

                                                <dl className="cc-facts">
                                                    <div>
                                                        <dt>Reason</dt>
                                                        <dd>{complaint.reason || "Not given"}</dd>
                                                    </div>
                                                    <div>
                                                        <dt>Submitted</dt>
                                                        <dd>{formatDate(complaint.createdAt, true) || "Not available"}</dd>
                                                    </div>
                                                    {complaint.reportedAgainst?.fullName && (
                                                        <div>
                                                            <dt>Reported against</dt>
                                                            <dd>{complaint.reportedAgainst.fullName}</dd>
                                                        </div>
                                                    )}
                                                    <div className="wide">
                                                        <dt>What you told us</dt>
                                                        <dd className="cc-desc">{complaint.description || "Not given"}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </CustomerLayout>
    );
}