import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MechanicLayout, { useConfirm, useToast } from "../../layouts/MechanicLayout";
import LiveTrackingMap from "../../components/customer/LiveTrackingMap";
import api from "../../services/api";
import {
    acceptRequest,
    rejectRequest,
    completeRequest,
    createQuotation,
    startWork,
    markArrived,
    startRepair
} from "../../services/mechanicService";
import "../../styles/RequestDetails.css";

import {
    FaArrowLeft,
    FaWrench,
    FaMapMarkerAlt,
    FaCamera,
    FaClipboardList,
    FaComments,
    FaCheck,
    FaTimes,
    FaMoneyBillWave,
    FaCarSide,
    FaFlag,
    FaRoute,
    FaExternalLinkAlt,
    FaExclamationTriangle,
    FaCopy,
    FaPhoneAlt,
    FaChevronLeft,
    FaChevronRight,
    FaFileInvoiceDollar,
    FaBolt
} from "react-icons/fa";

/* ================================================================== */
/* Config + helpers                                                    */
/* ================================================================== */

const STATUS_META = {
    PENDING: { label: "New request", tone: "warning" },
    WAITING_FOR_QUOTATION: { label: "Quotation needed", tone: "warning" },
    QUOTATION_PENDING: { label: "Quotation sent", tone: "info" },
    ACCEPTED: { label: "Accepted", tone: "primary" },
    IN_PROGRESS: { label: "In progress", tone: "primary" },
    COMPLETED: { label: "Completed", tone: "success" },
    REJECTED: { label: "Rejected", tone: "danger" },
    CANCELLED: { label: "Cancelled", tone: "neutral" }
};

const JOURNEY_STEPS = ["Accepted", "On the way", "Arrived", "Repairing", "Completed"];
const FINISHED = ["COMPLETED", "CANCELLED", "REJECTED"];
const POLL_MS = 15000;

const PAYMENT_STATUS = {
    CASH_PENDING: { label: "Cash pending", tone: "warning" },
    SUCCESS: { label: "Paid", tone: "success" },
    CREATED: { label: "Payment pending", tone: "warning" }
};

// Images come back as relative paths; resolve them against the API's own origin.
const API_ORIGIN = (() => {
    try {
        return new URL(api.defaults?.baseURL || "", window.location.origin).origin;
    } catch {
        return "http://localhost:8080";
    }
})();

const getImageUrl = (imageUrl) => {
    if (!imageUrl) return "";
    if (/^https?:\/\//.test(imageUrl)) return imageUrl;
    const path = imageUrl.replaceAll("\\", "/");
    return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
};

const money = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const initials = (name) =>
    (name || "C").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "C";

function getJourneyIndex(request) {
    if (request.status === "COMPLETED") return 4;
    if (request.status === "IN_PROGRESS") {
        if (request.serviceStage === "REPAIRING") return 3;
        if (request.serviceStage === "ARRIVED") return 2;
        return 1;
    }
    return request.status === "ACCEPTED" ? 0 : -1;
}

// A plain-language headline telling the mechanic exactly what to do now.
function getNextStep(st, stage) {
    switch (st) {
        case "PENDING":
            return { title: "New request waiting", text: "Review the problem and location, then accept or reject.", tone: "warning" };
        case "WAITING_FOR_QUOTATION":
            return { title: "Send your quotation", text: "The customer is waiting for a price.", tone: "warning" };
        case "QUOTATION_PENDING":
            return { title: "Waiting for the customer", text: "Your quotation has been sent. You'll be updated when they respond." };
        case "ACCEPTED":
            return { title: "Ready to go", text: "Start your journey when you leave for the customer." };
        case "IN_PROGRESS":
            if (stage === "ON_THE_WAY") return { title: "On the way", text: "Tap the button when you reach the customer." };
            if (stage === "ARRIVED") return { title: "You've arrived", text: "Inspect the vehicle and begin the repair." };
            if (stage === "REPAIRING") return { title: "Repair in progress", text: "Complete the work once everything is fixed." };
            return { title: "Job in progress", text: "This job is in progress." };
        case "COMPLETED":
            return { title: "Job complete", text: "This service has been completed.", tone: "success" };
        case "REJECTED":
            return { title: "Request rejected", text: "You rejected this request.", tone: "danger" };
        case "CANCELLED":
            return { title: "Request cancelled", text: "The customer cancelled this request." };
        default:
            return null;
    }
}

/* ================================================================== */
/* Small components                                                    */
/* ================================================================== */

function StatusBadge({ status }) {
    const meta = STATUS_META[status] || { label: status || "Unknown", tone: "neutral" };
    return <span className="dt-badge" data-tone={meta.tone}>{meta.label}</span>;
}

function Card({ icon: Icon, title, hint, aside, className = "", children }) {
    return (
        <section className={`dt-card ${className}`}>
            <div className="dt-card-head">
                <div>
                    <h2 className="dt-card-title">
                        <span className="dt-card-ico"><Icon aria-hidden="true" /></span> {title}
                    </h2>
                    {hint && <p className="dt-hint">{hint}</p>}
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}

function Progress({ request }) {
    const current = getJourneyIndex(request);
    if (current === -1) return null;

    return (
        <Card icon={FaFlag} title="Service progress">
            <ol className="dt-steps">
                {JOURNEY_STEPS.map((label, i) => {
                    const state = i < current || current === 4 ? "done" : i === current ? "now" : "next";
                    return (
                        <li key={label} className="dt-step" data-state={state} aria-current={state === "now" ? "step" : undefined}>
                            <span className="dt-step-dot" aria-hidden="true">{state === "done" ? <FaCheck /> : i + 1}</span>
                            <span className="dt-step-label">{label}</span>
                        </li>
                    );
                })}
            </ol>
        </Card>
    );
}

function ChargeField({ id, label, value, onChange, disabled }) {
    return (
        <div className="dt-field">
            <label htmlFor={id}>{label}</label>
            <div className="dt-money">
                <span aria-hidden="true">₹</span>
                <input
                    id={id}
                    name={id}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    required
                />
            </div>
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function RequestDetailsContent() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const showToast = useToast();
    const confirm = useConfirm();

    const [request, setRequest] = useState(null);
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [acting, setActing] = useState(false);
    const [quote, setQuote] = useState({ labourCharge: "", partsCharge: "", travelFee: "" });
    const [sendingQuote, setSendingQuote] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(null);
    const [payment, setPayment] = useState(null);

    /* ---------------------------- data ---------------------------- */

    const load = useCallback(
        async (silent = false) => {
            try {
                if (!silent) {
                    setLoading(true);
                    setError("");
                }
                const response = await api.get(`/requests/${requestId}/mechanic-details`);
                setRequest(response.data);
                setPayment({
                    amount: response.data?.paymentAmount,
                    method: response.data?.paymentMethod,
                    status: response.data?.paymentStatus
                });

                try {
                    const img = await api.get(`/requests/${requestId}/images`);
                    setImages(Array.isArray(img.data) ? img.data : []);
                } catch {
                    setImages(Array.isArray(response.data?.images) ? response.data.images : []);
                }
            } catch (err) {
                console.error("Failed to load request:", err);
                if (!silent) setError(err.response?.data?.message || "Failed to load request details.");
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [requestId]
    );

    useEffect(() => {
        load();
    }, [load]);

    // Keep an open job fresh (e.g. the customer cancels) without a manual reload.
    const status = request?.status;
    useEffect(() => {
        if (!status || FINISHED.includes(status)) return;
        const id = setInterval(() => !document.hidden && load(true), POLL_MS);
        return () => clearInterval(id);
    }, [status, load]);

    /* ---------------------------- photos ---------------------------- */

    const photoUrls = images
        .map((image) => getImageUrl(typeof image === "string" ? image : image?.imageUrl || image?.url))
        .filter(Boolean);

    useEffect(() => {
        if (previewIndex === null) return;
        const count = photoUrls.length;
        const onKey = (e) => {
            if (e.key === "Escape") setPreviewIndex(null);
            if (e.key === "ArrowRight") setPreviewIndex((i) => (i + 1) % count);
            if (e.key === "ArrowLeft") setPreviewIndex((i) => (i - 1 + count) % count);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [previewIndex, photoUrls.length]);

    /* --------------------------- actions --------------------------- */

    // One helper replaces seven near-identical confirm -> call -> reload -> toast handlers.
    const runAction = async ({ title, message, confirmLabel, tone = "success", call, success, failure }) => {
        const ok = await confirm({ title, message, tone, confirmLabel });
        if (!ok) return;
        try {
            setActing(true);
            await call();
            await load(true);
            showToast(success, "success");
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || failure, "error");
        } finally {
            setActing(false);
        }
    };

    const actions = {
        accept: () =>
            runAction({
                title: "Accept this request?",
                message: "The customer will be notified right away.",
                confirmLabel: "Accept",
                call: () => acceptRequest(requestId),
                success: "Request accepted.",
                failure: "Failed to accept request."
            }),
        reject: () =>
            runAction({
                title: "Reject this request?",
                message: "This can't be undone.",
                confirmLabel: "Reject",
                tone: "danger",
                call: () => rejectRequest(requestId),
                success: "Request rejected.",
                failure: "Failed to reject request."
            }),
        start: () =>
            runAction({
                title: "Start your journey?",
                message: "The customer will be able to follow you live.",
                confirmLabel: "Start journey",
                call: () => startWork(requestId),
                success: "Journey started.",
                failure: "Failed to start journey."
            }),
        arrived: () =>
            runAction({
                title: "Have you arrived?",
                message: "This lets the customer know you're on site.",
                confirmLabel: "I've arrived",
                call: () => markArrived(requestId),
                success: "Arrival confirmed.",
                failure: "Failed to update arrival status."
            }),
        repair: () =>
            runAction({
                title: "Start the repair?",
                message: "The job will move to the repairing stage.",
                confirmLabel: "Start repair",
                call: () => startRepair(requestId),
                success: "Repair started.",
                failure: "Failed to start repair."
            }),
        complete: () =>
            runAction({
                title: "Mark work as completed?",
                message: "Only do this once the repair is fully finished.",
                confirmLabel: "Complete work",
                call: () => completeRequest(requestId),
                success: "Service marked as completed.",
                failure: "Failed to complete service."
            }),
        cash: () =>
            runAction({
                title: "Cash received?",
                message: "Confirm only if you have collected the full payment.",
                confirmLabel: "Confirm payment",
                call: () => api.post(`/payments/cash/${requestId}/confirm`),
                success: "Cash payment confirmed.",
                failure: "Failed to confirm cash payment."
            })
    };

    const quoteTotal =
        Number(quote.labourCharge || 0) + Number(quote.partsCharge || 0) + Number(quote.travelFee || 0);

    const handleQuoteChange = (e) => setQuote({ ...quote, [e.target.name]: e.target.value });

    const handleSendQuote = async (e) => {
        e.preventDefault();
        const ok = await confirm({
            title: "Send this quotation?",
            message: `The customer will see a total of ${money(quoteTotal)}.`,
            tone: "success",
            confirmLabel: "Send quotation"
        });
        if (!ok) return;

        try {
            setSendingQuote(true);
            await createQuotation(requestId, {
                labourCharge: Number(quote.labourCharge),
                partsCharge: Number(quote.partsCharge),
                travelFee: Number(quote.travelFee)
            });
            showToast("Quotation sent successfully.", "success");
            setQuote({ labourCharge: "", partsCharge: "", travelFee: "" });
            await load(true);
        } catch (err) {
            console.error("Failed to create quotation:", err);
            showToast(err.response?.data?.message || "Failed to send quotation.", "error");
        } finally {
            setSendingQuote(false);
        }
    };

    const copyLocation = async () => {
        try {
            await navigator.clipboard.writeText(request.location);
            showToast("Location copied.", "success");
        } catch {
            showToast("Couldn't copy the location.", "error");
        }
    };

    /* ----------------------------- states ---------------------------- */

    const back = (
        <button type="button" className="dt-back" onClick={() => navigate("/mechanic/requests")}>
            <FaArrowLeft aria-hidden="true" /> Back to my requests
        </button>
    );

    if (loading) {
        return (
            <div className="dt-root" aria-busy="true" aria-label="Loading request">
                <div className="dt-skeleton" style={{ height: 24, width: 180 }} />
                <div className="dt-skeleton" style={{ height: 170 }} />
                <div className="dt-layout">
                    <div className="dt-skeleton" style={{ height: 340 }} />
                    <div className="dt-skeleton" style={{ height: 260 }} />
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="dt-root">
                {back}
                <div className="dt-error" role="alert">
                    <FaExclamationTriangle className="dt-error-ico" aria-hidden="true" />
                    <div>
                        <p className="dt-error-title">Unable to load request</p>
                        <p className="dt-error-text">{error || "This request could not be found."}</p>
                        <button type="button" className="dt-btn" onClick={() => load()}>Try again</button>
                    </div>
                </div>
            </div>
        );
    }

    const st = request.status;
    const stage = request.serviceStage;
    const next = getNextStep(st, stage);
    const phone = request.customerPhone || request.customerMobile || request.phone;
    const mapsUrl = request.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.location)}`
        : "";
    const paymentMeta = PAYMENT_STATUS[payment?.status] || { label: "Not requested", tone: "neutral" };

    return (
        <div className="dt-root">
            {back}

            {/* ---------------- Hero ---------------- */}
            <header className="dt-hero">
                <div className="dt-hero-top">
                    <div>
                        <p className="dt-eyebrow">Service request</p>
                        <h1 className="dt-title">Request #{request.requestId}</h1>
                        {request.createdAt && (
                            <p className="dt-created">Created {new Date(request.createdAt).toLocaleString("en-IN")}</p>
                        )}
                    </div>
                    <StatusBadge status={st} />
                </div>

                <div className="dt-hero-who">
                    <span className="dt-avatar" aria-hidden="true">{initials(request.customerName)}</span>
                    <div>
                        <p className="dt-hero-name">{request.customerName || "Customer"}</p>
                        <p className="dt-hero-vehicle">
                            <FaCarSide aria-hidden="true" /> {request.vehicle || "Vehicle information unavailable"}
                        </p>
                    </div>
                    <div className="dt-hero-actions">
                        {phone && (
                            <a className="dt-icon-btn" href={`tel:${phone}`} aria-label="Call customer">
                                <FaPhoneAlt aria-hidden="true" />
                            </a>
                        )}
                        {!FINISHED.includes(st) && (
                            <button
                                type="button"
                                className="dt-icon-btn"
                                onClick={() => navigate(`/mechanic/requests/${requestId}/communication`)}
                                aria-label="Message customer"
                            >
                                <FaComments aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className="dt-layout">
                {/* ---------------- Main column ---------------- */}
                <div className="dt-col">
                    <Progress request={request} />

                    <Card icon={FaWrench} title="The problem">
                        <p className="dt-problem">{request.issueDescription || "No description provided."}</p>

                        <div className="dt-location">
                            <span className="dt-pin"><FaMapMarkerAlt aria-hidden="true" /></span>
                            <div className="dt-loc-body">
                                <span className="dt-label">Service location</span>
                                <p className="dt-loc-text">{request.location || "Location unavailable"}</p>
                            </div>
                            {request.location && (
                                <div className="dt-loc-actions">
                                    <button type="button" className="dt-btn dt-btn-sm" onClick={copyLocation}>
                                        <FaCopy aria-hidden="true" /> Copy
                                    </button>
                                    <a className="dt-btn dt-btn-dark dt-btn-sm" href={mapsUrl} target="_blank" rel="noreferrer">
                                        Open in Maps <FaExternalLinkAlt aria-hidden="true" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </Card>

                    {st === "IN_PROGRESS" && stage === "ON_THE_WAY" && (
                        <Card
                            icon={FaRoute}
                            title="Route to customer"
                            hint="Live location, road distance and estimated arrival"
                            aside={<span className="dt-badge dt-badge-live" data-tone="success">Live</span>}
                        >
                            <LiveTrackingMap
                                requestId={requestId}
                                refreshInterval={10000}
                                viewerRole="mechanic"
                                customerName={request.customerName}
                            />
                        </Card>
                    )}

                    {photoUrls.length > 0 && (
                        <Card
                            icon={FaCamera}
                            title="Customer photos"
                            hint="Tap a photo to enlarge it."
                            aside={
                                <span className="dt-badge">
                                    {photoUrls.length} photo{photoUrls.length !== 1 ? "s" : ""}
                                </span>
                            }
                        >
                            <div className="dt-photos">
                                {photoUrls.map((url, i) => (
                                    <button
                                        type="button"
                                        key={i}
                                        className="dt-photo"
                                        onClick={() => setPreviewIndex(i)}
                                        aria-label={`View customer photo ${i + 1}`}
                                    >
                                        <img src={url} alt={`Customer breakdown ${i + 1}`} loading="lazy" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* ---------------- Side column: next action first ---------------- */}
                <aside className="dt-col dt-side">
                    <Card icon={FaBolt} title="What's next" className="dt-action-card">
                        {next && (
                            <div className="dt-next" data-tone={next.tone} aria-live="polite">
                                <p className="dt-next-title">{next.title}</p>
                                <p className="dt-next-text">{next.text}</p>
                            </div>
                        )}

                        {st === "PENDING" && (
                            <div className="dt-stack">
                                <button type="button" className="dt-btn dt-btn-dark" onClick={actions.accept} disabled={acting}>
                                    <FaCheck aria-hidden="true" /> Accept request
                                </button>
                                <button type="button" className="dt-btn dt-btn-danger" onClick={actions.reject} disabled={acting}>
                                    <FaTimes aria-hidden="true" /> Reject request
                                </button>
                            </div>
                        )}

                        {st === "WAITING_FOR_QUOTATION" && (
                            <form onSubmit={handleSendQuote} className="dt-stack">
                                <ChargeField id="labourCharge" label="Labour charge" value={quote.labourCharge} onChange={handleQuoteChange} disabled={sendingQuote} />
                                <ChargeField id="partsCharge" label="Parts charge" value={quote.partsCharge} onChange={handleQuoteChange} disabled={sendingQuote} />
                                <ChargeField id="travelFee" label="Travel fee" value={quote.travelFee} onChange={handleQuoteChange} disabled={sendingQuote} />
                                <div className="dt-total" aria-live="polite">
                                    <span>Total</span>
                                    <strong>{money(quoteTotal)}</strong>
                                </div>
                                <button type="submit" className="dt-btn dt-btn-dark" disabled={sendingQuote || quoteTotal <= 0}>
                                    <FaFileInvoiceDollar aria-hidden="true" /> {sendingQuote ? "Sending…" : "Send quotation"}
                                </button>
                            </form>
                        )}

                        {st === "ACCEPTED" && (
                            <button type="button" className="dt-btn dt-btn-dark" onClick={actions.start} disabled={acting}>
                                <FaCarSide aria-hidden="true" /> Start journey
                            </button>
                        )}

                        {st === "IN_PROGRESS" && stage === "ON_THE_WAY" && (
                            <button type="button" className="dt-btn dt-btn-dark" onClick={actions.arrived} disabled={acting}>
                                <FaMapMarkerAlt aria-hidden="true" /> I've arrived
                            </button>
                        )}

                        {st === "IN_PROGRESS" && stage === "ARRIVED" && (
                            <button type="button" className="dt-btn dt-btn-dark" onClick={actions.repair} disabled={acting}>
                                <FaWrench aria-hidden="true" /> Start repair
                            </button>
                        )}

                        {st === "IN_PROGRESS" && stage === "REPAIRING" && (
                            <button type="button" className="dt-btn dt-btn-success" onClick={actions.complete} disabled={acting}>
                                <FaCheck aria-hidden="true" /> Complete work
                            </button>
                        )}

                        {st === "COMPLETED" && payment?.status === "CASH_PENDING" && (
                            <button type="button" className="dt-btn dt-btn-dark" onClick={actions.cash} disabled={acting}>
                                <FaMoneyBillWave aria-hidden="true" />
                                {acting ? "Confirming…" : `Confirm cash received ${money(payment.amount)}`}
                            </button>
                        )}

                        {st === "COMPLETED" && payment?.status === "SUCCESS" && (
                            <div className="dt-next" data-tone="success">
                                <p className="dt-next-title">Payment received</p>
                                <p className="dt-next-text">{money(payment.amount)} collected.</p>
                            </div>
                        )}

                        <hr className="dt-divider" />

                        <button
                            type="button"
                            className="dt-btn"
                            onClick={() => navigate(`/mechanic/requests/${requestId}/communication`)}
                        >
                            <FaComments aria-hidden="true" /> {FINISHED.includes(st) ? "View messages" : "Message customer"}
                        </button>
                        {FINISHED.includes(st) && (
                            <p className="dt-hint">Messaging is closed for this request because it is {st.toLowerCase()}.</p>
                        )}
                    </Card>

                    <Card icon={FaMoneyBillWave} title="Payment" aside={<span className="dt-badge" data-tone={paymentMeta.tone}>{paymentMeta.label}</span>}>
                        <dl className="dt-list">
                            <div>
                                <dt>Amount</dt>
                                <dd className="dt-amount">{payment?.amount != null ? money(payment.amount) : "—"}</dd>
                            </div>
                            <div>
                                <dt>Method</dt>
                                <dd>{payment?.method === "CASH" ? "Cash" : payment?.method || "Not selected"}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card icon={FaClipboardList} title="Summary">
                        <dl className="dt-list">
                            <div>
                                <dt>Request ID</dt>
                                <dd>#{request.requestId}</dd>
                            </div>
                            <div>
                                <dt>Status</dt>
                                <dd><StatusBadge status={st} /></dd>
                            </div>
                            <div>
                                <dt>Created</dt>
                                <dd>{request.createdAt ? new Date(request.createdAt).toLocaleString("en-IN") : "—"}</dd>
                            </div>
                        </dl>
                    </Card>
                </aside>
            </div>

            {previewIndex !== null && photoUrls[previewIndex] && (
                <div className="dt-lightbox" onClick={() => setPreviewIndex(null)} role="dialog" aria-modal="true" aria-label="Photo preview">
                    <button type="button" className="dt-icon-btn dt-lightbox-close" onClick={() => setPreviewIndex(null)} aria-label="Close preview">
                        <FaTimes aria-hidden="true" />
                    </button>

                    {photoUrls.length > 1 && (
                        <>
                            <button
                                type="button"
                                className="dt-icon-btn dt-lightbox-nav dt-lightbox-prev"
                                onClick={(e) => { e.stopPropagation(); setPreviewIndex((i) => (i - 1 + photoUrls.length) % photoUrls.length); }}
                                aria-label="Previous photo"
                            >
                                <FaChevronLeft aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                className="dt-icon-btn dt-lightbox-nav dt-lightbox-next"
                                onClick={(e) => { e.stopPropagation(); setPreviewIndex((i) => (i + 1) % photoUrls.length); }}
                                aria-label="Next photo"
                            >
                                <FaChevronRight aria-hidden="true" />
                            </button>
                        </>
                    )}

                    <img src={photoUrls[previewIndex]} alt={`Customer breakdown ${previewIndex + 1}`} onClick={(e) => e.stopPropagation()} />
                    <span className="dt-lightbox-count">{previewIndex + 1} / {photoUrls.length}</span>
                </div>
            )}
        </div>
    );
}

function RequestDetails() {
    return (
        <MechanicLayout>
            <RequestDetailsContent />
        </MechanicLayout>
    );
}

export default RequestDetails;