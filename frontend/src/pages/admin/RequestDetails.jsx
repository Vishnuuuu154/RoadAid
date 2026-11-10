import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams,useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { getRequestDetails } from "../../services/adminService";

import {
    FaArrowLeft,
    FaSyncAlt,
    FaCopy,
    FaCheck,
    FaUser,
    FaTools,
    FaCar,
    FaMapMarkerAlt,
    FaExternalLinkAlt,
    FaClipboardList,
    FaFileInvoiceDollar,
    FaCreditCard,
    FaStar,
    FaRegStar,
    FaExclamationTriangle,
    FaTimesCircle
} from "react-icons/fa";

import "../../styles/AdminReqDetails.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 30000;

const ROUTES = {
    requests: "/admin/requests"
};


/* Order a request normally moves through. */
const LIFECYCLE = [
    "PENDING",
    "WAITING_FOR_QUOTATION",
    "QUOTATION_PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "CLOSED"
];

/* Once a request reaches one of these it will not change, so polling stops. */
const FINAL = ["COMPLETED", "CLOSED", "CANCELLED"];

const TONES = {
    PENDING: "amber",
    WAITING_FOR_QUOTATION: "blue",
    QUOTATION_PENDING: "blue",
    IN_PROGRESS: "purple",
    COMPLETED: "green",
    CLOSED: "green",
    CANCELLED: "red"
};

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const statusLabel = (status) =>
    status
        ? status
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Unknown";

const money = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

const dateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const ago = (value) => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
};

const updatedText = (date) => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    return minutes < 1 ? "just now" : `${minutes}m ago`;
};

const paymentTone = (status) => {
    const value = String(status || "").toUpperCase();
    if (["SUCCESS", "PAID", "COMPLETED", "CASH_PAID"].includes(value)) return "green";
    if (["FAILED", "CANCELLED", "REFUNDED"].includes(value)) return "red";
    return "amber";
};

const mapsUrl = (location) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function CopyButton({ value, label }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* Clipboard can be blocked; the text stays selectable. */
        }
    };

    return (
        <button type="button" className="rd-icon-btn" onClick={copy} aria-label={`Copy ${label}`}>
            {copied ? <FaCheck aria-hidden="true" /> : <FaCopy aria-hidden="true" />}
        </button>
    );
}

function Card({ icon, title, hint, children, action }) {
    return (
        <section className="rd-card">
            <header className="rd-card-head">
                <span className="rd-card-icon" aria-hidden="true">{icon}</span>
                <div>
                    <h2>{title}</h2>
                    {hint && <p>{hint}</p>}
                </div>
                {action}
            </header>
            {children}
        </section>
    );
}

function Empty({ icon, title, text }) {
    return (
        <div className="rd-empty">
            <span aria-hidden="true">{icon}</span>
            <strong>{title}</strong>
            <p>{text}</p>
        </div>
    );
}

function Stars({ rating }) {
    const value = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    return (
        <span className="rd-stars" role="img" aria-label={`${value} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (n <= value ? <FaStar key={n} /> : <FaRegStar key={n} />))}
        </span>
    );
}

function Progress({ status }) {
    if (status === "CANCELLED") {
        return (
            <div className="rd-cancelled" role="status">
                <FaTimesCircle aria-hidden="true" />
                <span>This service request was cancelled.</span>
            </div>
        );
    }

    const current = LIFECYCLE.indexOf(status);

    if (current === -1) {
        return <p className="rd-muted">Progress is not available for the status “{statusLabel(status)}”.</p>;
    }

    return (
        <ol className="rd-steps" aria-label="Request progress">
            {LIFECYCLE.map((step, index) => {
                const state = index < current ? "done" : index === current ? "current" : "todo";
                return (
                    <li key={step} className="rd-step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
                        <span className="rd-step-dot" aria-hidden="true">
                            {state === "done" ? <FaCheck /> : index + 1}
                        </span>
                        <span className="rd-step-label">{statusLabel(step)}</span>
                    </li>
                );
            })}
        </ol>
    );
}

function Fact({ icon, label, children }) {
    return (
        <div className="rd-fact">
            <span className="rd-fact-icon" aria-hidden="true">{icon}</span>
            <div>
                <span className="rd-fact-label">{label}</span>
                <span className="rd-fact-value">{children}</span>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="rd-root" aria-busy="true" aria-label="Loading request details">
            <span className="rd-skel rd-skel-title" />
            <span className="rd-skel rd-skel-bar" />
            <div className="rd-layout">
                <div className="rd-col">
                    <span className="rd-skel rd-skel-card" />
                    <span className="rd-skel rd-skel-card" />
                </div>
                <div className="rd-col">
                    <span className="rd-skel rd-skel-card" />
                </div>
            </div>
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function RequestDetails() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [, tick] = useState(0);
    const requestRef = useRef(null);

    requestRef.current = request;

    const load = useCallback(
        async ({ silent = false } = {}) => {
            if (!silent) setRefreshing(true);

            try {
                const response = await getRequestDetails(requestId);
                setRequest(response.data);
                setError("");
                setUpdatedAt(new Date());
            } catch (err) {
                console.error("Failed to load request details:", err);
                /* Keep showing the last good data when a background refresh fails. */
                if (!silent || !requestRef.current) {
                    setError(err.response?.data?.message || "Failed to load request details.");
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [requestId]
    );

    useEffect(() => {
        setLoading(true);
        setRequest(null);
        load();
    }, [load]);

    useEffect(() => {
        const poll = setInterval(() => {
            const status = requestRef.current?.status;
            if (document.visibilityState === "visible" && status && !FINAL.includes(status)) {
                load({ silent: true });
            }
        }, POLL_MS);

        const clock = setInterval(() => tick((n) => n + 1), 30000);

        return () => {
            clearInterval(poll);
            clearInterval(clock);
        };
    }, [load]);

    if (loading) {
        return (
            <AdminLayout>
                <LoadingState />
            </AdminLayout>
        );
    }

    if (!request) {
        return (
            <AdminLayout>
                <div className="rd-root">
                    <Link to={ROUTES.requests} className="rd-back">
                        <FaArrowLeft aria-hidden="true" /> Back to requests
                    </Link>
                    <div className="rd-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{error || "Request not found."}</span>
                        <button type="button" onClick={() => load()}>Try again</button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    const { quotation, payment, review } = request;
    const tone = TONES[request.status] || "grey";
    const quoted = Number(quotation?.totalAmount);
    const paid = Number(payment?.amount);
    const mismatch = quotation && payment && Number.isFinite(quoted) && Number.isFinite(paid) && Math.abs(quoted - paid) > 0.005;

    return (
        <AdminLayout>
            <div className="rd-root">
                {/* ---------- Header ---------- */}
                <header className="rd-header">
                    <div>
                        <button
                            type="button"
                            className="rd-back"
                            onClick={() => navigate(-1)}
                        >
                            <FaArrowLeft aria-hidden="true" /> Go back
                        </button>

                        <div className="rd-title-row">
                            <h1 className="rd-title">Request #{request.requestId}</h1>
                            <CopyButton value={String(request.requestId)} label="request ID" />
                            <span className="rd-status" data-tone={tone}>{statusLabel(request.status)}</span>
                        </div>

                        <p className="rd-sub">
                            Created {dateTime(request.createdAt)}
                            {ago(request.createdAt) && <> · {ago(request.createdAt)}</>}
                        </p>
                    </div>

                    <div className="rd-header-meta">
                        {updatedAt && <span className="rd-updated">Updated {updatedText(updatedAt)}</span>}
                        <button type="button" className="rd-btn" onClick={() => load()} disabled={refreshing}>
                            <FaSyncAlt className={refreshing ? "rd-spin" : ""} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="rd-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{error}</span>
                        <button type="button" onClick={() => load()}>Try again</button>
                    </div>
                )}

                {/* ---------- Progress ---------- */}
                <Card icon={<FaClipboardList />} title="Progress" hint="Where this request is in its life cycle">
                    <Progress status={request.status} />
                </Card>

                <div className="rd-layout">
                    {/* ---------- Main column ---------- */}
                    <div className="rd-col">
                        <Card icon={<FaTools />} title="Reported issue" hint="Problem described by the customer">
                            <p className="rd-issue">{request.issue || "No issue description provided."}</p>
                        </Card>

                        <Card icon={<FaFileInvoiceDollar />} title="Quotation" hint="Charges quoted by the provider">
                            {quotation ? (
                                <>
                                    <dl className="rd-lines">
                                        <div><dt>Labour charge</dt><dd>{money(quotation.labourCharge)}</dd></div>
                                        <div><dt>Parts charge</dt><dd>{money(quotation.partsCharge)}</dd></div>
                                        <div><dt>Travel fee</dt><dd>{money(quotation.travelFee)}</dd></div>
                                    </dl>
                                    <div className="rd-total">
                                        <span>Total amount</span>
                                        <strong>{money(quotation.totalAmount)}</strong>
                                    </div>
                                </>
                            ) : (
                                <Empty
                                    icon={<FaFileInvoiceDollar />}
                                    title="No quotation yet"
                                    text="The provider has not sent a quotation for this request."
                                />
                            )}
                        </Card>

                        <Card icon={<FaCreditCard />} title="Payment" hint="How and when it was paid">
                            {payment ? (
                                <>
                                    <div className="rd-pay">
                                        <div className="rd-pay-amount">
                                            <span>Amount</span>
                                            <strong>{money(payment.amount)}</strong>
                                        </div>
                                        <div>
                                            <span>Status</span>
                                            <b className="rd-status rd-status-sm" data-tone={paymentTone(payment.paymentStatus)}>
                                                {statusLabel(payment.paymentStatus)}
                                            </b>
                                        </div>
                                        <div>
                                            <span>Method</span>
                                            <b>{statusLabel(payment.paymentMethod)}</b>
                                        </div>
                                        <div>
                                            <span>Date</span>
                                            <b>{dateTime(payment.paymentDate)}</b>
                                        </div>
                                    </div>

                                    {mismatch && (
                                        <p className="rd-note">
                                            <FaExclamationTriangle aria-hidden="true" />
                                            <span>
                                                The payment ({money(paid)}) differs from the quoted total ({money(quoted)}).
                                            </span>
                                        </p>
                                    )}
                                </>
                            ) : (
                                <Empty
                                    icon={<FaCreditCard />}
                                    title="No payment recorded"
                                    text="Nothing has been paid for this request yet."
                                />
                            )}
                        </Card>

                        <Card icon={<FaStar />} title="Customer review" hint="Feedback about the service">
                            {review ? (
                                <>
                                    <div className="rd-rating">
                                        <Stars rating={review.rating} />
                                        <strong>{Number(review.rating) || 0}/5</strong>
                                    </div>
                                    <blockquote className="rd-comment">
                                        {review.comment || "No written comment provided."}
                                    </blockquote>
                                    <p className="rd-muted">Reviewed on {dateTime(review.createdAt)}</p>
                                </>
                            ) : (
                                <Empty
                                    icon={<FaRegStar />}
                                    title="No review yet"
                                    text="The customer has not reviewed this request."
                                />
                            )}
                        </Card>
                    </div>

                    {/* ---------- Side column ---------- */}
                    <div className="rd-col">
                        <section className="rd-card">
                            <h2 className="rd-side-title">At a glance</h2>

                            <div className="rd-facts">
                                <Fact icon={<FaUser />} label="Customer">
                                    {request.customerName || "—"}
                                </Fact>

                                <Fact icon={<FaTools />} label="Provider">
                                    {request.mechanicName && request.mechanicName !== "Not Assigned" ? (
                                        request.mechanicName
                                    ) : (
                                        <em>Not assigned yet</em>
                                    )}
                                </Fact>

                                <Fact icon={<FaCar />} label="Vehicle">
                                    {request.vehicle?.trim() || <em>Not available</em>}
                                </Fact>

                                <Fact icon={<FaMapMarkerAlt />} label="Breakdown location">
                                    {request.location ? (
                                        <>
                                            <span>{request.location}</span>
                                            <span className="rd-fact-actions">
                                                <a href={mapsUrl(request.location)} target="_blank" rel="noopener noreferrer">
                                                    Open in Maps <FaExternalLinkAlt aria-hidden="true" />
                                                </a>
                                                <CopyButton value={request.location} label="location" />
                                            </span>
                                        </>
                                    ) : (
                                        <em>Not available</em>
                                    )}
                                </Fact>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export default RequestDetails;