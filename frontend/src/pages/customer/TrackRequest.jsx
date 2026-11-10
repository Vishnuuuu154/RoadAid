import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";
import LiveTrackingMap from "../../components/customer/LiveTrackingMap";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const COMPLAINT_WINDOW_DAYS = 7;
const REFRESH_INTERVAL_MS = 15000;

const ACTIVE_STATUSES = [
    "PENDING",
    "WAITING_FOR_QUOTATION",
    "QUOTATION_PENDING",
    "ACCEPTED",
    "IN_PROGRESS",
];

// tone drives the colour of the big status card at the top.
const STATUS_META = {
    PENDING: {
        label: "Waiting for a mechanic",
        description: "We are looking for a suitable mechanic for your request.",
        tone: "default",
    },
    WAITING_FOR_QUOTATION: {
        label: "Waiting for quotation",
        description: "A mechanic has been assigned and will provide the service quotation.",
        tone: "default",
    },
    QUOTATION_PENDING: {
        label: "Quotation ready",
        description: "The mechanic has submitted a quotation. Review it from your request details.",
        tone: "default",
    },
    ACCEPTED: {
        label: "Request accepted",
        description: "Your mechanic has accepted the job and is ready to start the journey.",
        tone: "default",
    },
    IN_PROGRESS: {
        label: "Service in progress",
        description: "Your roadside assistance service is currently underway.",
        tone: "default",
    },
    COMPLETED: {
        label: "Service completed",
        description: "The mechanic has completed the roadside assistance service.",
        tone: "done",
    },
    CLOSED: {
        label: "Service completed",
        description: "This roadside assistance request has been completed and closed.",
        tone: "done",
    },
    REJECTED: {
        label: "Request rejected",
        description: "The assigned mechanic rejected this request.",
        tone: "bad",
    },
    CANCELLED: {
        label: "Request cancelled",
        description: "This request is no longer active.",
        tone: "off",
    },
};

const REQUEST_STEPS = [
    { status: "PENDING", label: "Request created" },
    { status: "WAITING_FOR_QUOTATION", label: "Mechanic assigned" },
    { status: "QUOTATION_PENDING", label: "Quotation received" },
    { status: "ACCEPTED", label: "Request accepted" },
    { status: "IN_PROGRESS", label: "Service started" },
    { status: "COMPLETED", label: "Service completed" },
];

const SERVICE_STAGES = [
    {
        stage: "NOT_STARTED",
        label: "Ready to start",
        short: "Ready",
        description: "The mechanic has accepted your request.",
    },
    {
        stage: "ON_THE_WAY",
        label: "Mechanic is on the way",
        short: "On the way",
        description: "The mechanic is travelling to your location.",
    },
    {
        stage: "ARRIVED",
        label: "Mechanic has arrived",
        short: "Arrived",
        description: "The mechanic has reached your location.",
    },
    {
        stage: "REPAIRING",
        label: "Repair in progress",
        short: "Repairing",
        description: "Your vehicle is currently being repaired.",
    },
    {
        stage: "COMPLETED",
        label: "Service completed",
        short: "Done",
        description: "The roadside assistance service has been completed.",
    },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatDate = (date) =>
    date
        ? new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : "—";

const initials = (name) =>
    (name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");

function getComplaintDeadline(completedAt) {
    if (!completedAt) return null;
    const completed = new Date(completedAt);
    if (Number.isNaN(completed.getTime())) return null;
    return new Date(completed.getTime() + COMPLAINT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function getRemainingTime(deadline, now) {
    if (!deadline) return null;

    const difference = deadline.getTime() - now.getTime();
    if (difference <= 0) {
        return { expired: true, text: "Complaint window has expired." };
    }

    const totalHours = Math.floor(difference / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return {
            expired: false,
            text: `${days} day${days === 1 ? "" : "s"} ${hours} hr${hours === 1 ? "" : "s"} remaining`,
        };
    }

    return { expired: false, text: `${hours} hr ${minutes} min remaining` };
}

// The backend sends "Category: X\nDescription: Y\nVehicle Drivable: Yes" as one text block.
const ISSUE_KEYS = {
    category: "category",
    description: "description",
    "vehicle drivable": "drivable",
    drivable: "drivable",
};

const parseIssue = (text) => {
    const issue = { category: "", description: "", drivable: "" };
    let current = null;
    let matched = false;

    String(text || "")
        .split(/\r?\n/)
        .forEach((line) => {
            const found = line.match(/^\s*([A-Za-z ]{3,20}?)\s*:\s*(.*)$/);
            const key = found && ISSUE_KEYS[found[1].trim().toLowerCase()];

            if (key) {
                matched = true;
                current = key;
                issue[key] = found[2].trim();
            } else if (current) {
                issue[current] = `${issue[current]}\n${line}`.trim();
            }
        });

    if (!matched) issue.description = String(text || "").trim();
    return issue;
};

const categoryIcon = (category) => {
    const c = category.toLowerCase();
    if (c.includes("fuel")) return "bi-fuel-pump-fill";
    if (c.includes("battery") || c.includes("jump")) return "bi-battery-half";
    if (/tyre|tire|puncture|flat/.test(c)) return "bi-record-circle";
    if (c.includes("engine")) return "bi-gear-wide-connected";
    if (/accident|collision/.test(c)) return "bi-exclamation-triangle-fill";
    if (c.includes("tow")) return "bi-truck";
    if (/key|lock/.test(c)) return "bi-key-fill";
    return "bi-wrench-adjustable";
};

const parseLocation = (location) => {
    if (!location) return null;
    const text = String(location).trim();
    const found = text.match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);

    if (found) {
        const lat = Number(found[1]);
        const lng = Number(found[2]);
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            return { isCoords: true, lat, lng, text };
        }
    }
    return { isCoords: false, text };
};

const formatCoords = ({ lat, lng }) =>
    `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}, ` +
    `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? "E" : "W"}`;

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function BackLink({ onClick }) {
    return (
        <button type="button" className="tr-back" onClick={onClick}>
            <i className="bi bi-arrow-left" /> My requests
        </button>
    );
}

function Card({ title, children, className = "" }) {
    return (
        <section className={`tr-card ${className}`}>
            {title && <h2>{title}</h2>}
            {children}
        </section>
    );
}

function ServiceProgress({ stageIndex }) {
    const stage = SERVICE_STAGES[stageIndex];

    return (
        <div className="tr-stage">
            <ol className="tr-segments" aria-label="Service progress">
                {SERVICE_STAGES.map((item, index) => (
                    <li
                        key={item.stage}
                        className={index <= stageIndex ? "on" : ""}
                        aria-current={index === stageIndex ? "step" : undefined}
                        title={item.label}
                    >
                        <span className="tr-seg-label">{item.short}</span>
                    </li>
                ))}
            </ol>
            <p className="tr-stage-now">
                <strong>{stage.label}</strong>
                <span>{stage.description}</span>
            </p>
        </div>
    );
}

function Timeline({ current }) {
    return (
        <ol className="tr-timeline">
            {REQUEST_STEPS.map((step, index) => {
                const state = index < current ? "done" : index === current ? "now" : "todo";
                return (
                    <li
                        key={step.status}
                        className={state}
                        aria-current={state === "now" ? "step" : undefined}
                    >
                        <span className="tr-dot">
                            {state === "done" && <i className="bi bi-check-lg" />}
                        </span>
                        <span className="tr-tl-text">
                            <strong>{step.label}</strong>
                            {state === "now" && <em>Current stage</em>}
                            {state === "done" && <em>Done</em>}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function TrackRequest() {
    const { requestId } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [now, setNow] = useState(new Date());

    const loadRequest = useCallback(
        async ({ silent = false } = {}) => {
            try {
                if (silent) setRefreshing(true);
                else {
                    setLoading(true);
                    setError("");
                }

                const response = await api.get(`/requests/${requestId}`);
                setRequest(response.data);
                setLastUpdated(new Date());
                setError("");
            } catch (requestError) {
                console.error("Failed to load request:", requestError);
                // A failed background refresh shouldn't replace a page that works.
                if (!silent) {
                    setError(
                        requestError.response?.data?.message ||
                        "Unable to load this request right now."
                    );
                }
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [requestId]
    );

    useEffect(() => {
        loadRequest();
    }, [loadRequest]);

    // Keep active requests fresh without the customer pressing refresh.
    const status = request?.status;
    useEffect(() => {
        if (!ACTIVE_STATUSES.includes(status)) return undefined;
        const timer = setInterval(
            () => loadRequest({ silent: true }),
            REFRESH_INTERVAL_MS
        );
        return () => clearInterval(timer);
    }, [status, loadRequest]);

    const isFinal = status === "COMPLETED" || status === "CLOSED";

    // Only tick the clock when the complaint countdown is on screen.
    useEffect(() => {
        if (!isFinal) return undefined;
        const timer = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(timer);
    }, [isFinal]);

    const statusInfo = request
        ? STATUS_META[request.status] || {
        label: request.status || "Unknown status",
        description: "The request status is currently unavailable.",
        tone: "off",
    }
        : null;

    const requestProgress = useMemo(() => {
        if (!request) return -1;
        if (request.status === "REJECTED" || request.status === "CANCELLED") return -1;
        if (request.status === "CLOSED") return REQUEST_STEPS.length - 1;

        const index = REQUEST_STEPS.findIndex((step) => step.status === request.status);
        return index === -1 ? 0 : index;
    }, [request]);

    const serviceStage = useMemo(() => {
        if (!request) return "NOT_STARTED";
        if (request.status === "COMPLETED" || request.status === "CLOSED") return "COMPLETED";
        return request.serviceStage || "NOT_STARTED";
    }, [request]);

    const serviceStageIndex = Math.max(
        0,
        SERVICE_STAGES.findIndex((item) => item.stage === serviceStage)
    );

    const showServiceProgress = ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED"].includes(
        request?.status
    );

    const showLiveTracking =
        request?.status === "IN_PROGRESS" &&
        serviceStage === "ON_THE_WAY" &&
        request?.mechanic?.id;

    const complaintDeadline = getComplaintDeadline(request?.completedAt);
    const complaintTime = getRemainingTime(complaintDeadline, now);
    const canRaiseComplaint =
        isFinal && Boolean(complaintDeadline) && Boolean(complaintTime) && !complaintTime.expired;

    const goBack = () => navigate("/customer/requests");

    /* ---------- Loading ---------- */
    if (loading) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <div className="tr" aria-busy="true" aria-label="Loading your request">
                    <div className="tr-wrap">
                        <div className="tr-skel">
                            <i style={{ width: 110, height: 18 }} />
                            <i style={{ width: "45%", height: 44 }} />
                            <i style={{ width: "100%", height: 200 }} />
                            <i style={{ width: "100%", height: 260 }} />
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    /* ---------- Error ---------- */
    if (error || !request) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <div className="tr">
                    <div className="tr-wrap">
                        <BackLink onClick={goBack} />
                        <div className="tr-empty">
                            <div className="tr-empty-icon">
                                <i className="bi bi-wifi-off" />
                            </div>
                            <h2>Couldn’t load this request</h2>
                            <p>{error || "This request could not be found."}</p>
                            <div className="tr-row">
                                <button
                                    type="button"
                                    className="tr-btn dark"
                                    onClick={() => loadRequest()}
                                >
                                    Try again
                                </button>
                                <button type="button" className="tr-btn light" onClick={goBack}>
                                    Back to requests
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    const id = request.id ?? request.requestId;
    const issue = parseIssue(request.issueDescription);
    const place = parseLocation(request.location);
    const drivable = /^(yes|y|true)$/i.test(issue.drivable)
        ? true
        : /^(no|n|false)$/i.test(issue.drivable)
            ? false
            : null;
    const vehicleName = request.vehicle?.brand
        ? `${request.vehicle.brand} ${request.vehicle.model || ""}`.trim()
        : "";
    const mechanicName = request.mechanic?.user?.fullName || "";
    const canMessage = mechanicName && !["REJECTED", "CANCELLED"].includes(request.status);
    const isLive = ACTIVE_STATUSES.includes(request.status);
    const mapTarget = place?.isCoords
        ? `${place.lat},${place.lng}`
        : encodeURIComponent(place?.text || "");

    return (
        <CustomerLayout>
            <style>{css}</style>

            <div className="tr">
                <div className="tr-wrap">
                    <BackLink onClick={goBack} />

                    {/* Header */}
                    <header className="tr-header">
                        <div>
                            <h1>Track request #{id}</h1>
                            <p>
                                {lastUpdated
                                    ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}`
                                    : "See what is happening right now."}
                                {isLive && " · refreshes automatically"}
                            </p>
                        </div>
                        <div className="tr-header-actions">
                            {isLive && (
                                <button
                                    type="button"
                                    className="tr-icon-btn"
                                    onClick={() => loadRequest({ silent: true })}
                                    disabled={refreshing}
                                    aria-label="Refresh status"
                                    title="Refresh status"
                                >
                                    <i className={`bi bi-arrow-clockwise ${refreshing ? "spin" : ""}`} />
                                </button>
                            )}
                            <button
                                type="button"
                                className="tr-btn light"
                                onClick={() => navigate(`/customer/requests/${id}`)}
                            >
                                Request details
                            </button>
                        </div>
                    </header>

                    {/* Status hero */}
                    <section className={`tr-hero ${statusInfo.tone}`} role="status">
                        <span className="tr-hero-label">Current status</span>
                        <h2>{statusInfo.label}</h2>
                        <p>{statusInfo.description}</p>

                        {showServiceProgress && <ServiceProgress stageIndex={serviceStageIndex} />}

                        {request.status === "REJECTED" && (
                            <button
                                type="button"
                                className="tr-btn white"
                                onClick={() => navigate(`/customer/requests/${id}`)}
                            >
                                Choose another mechanic
                            </button>
                        )}
                    </section>

                    {/* Live map */}
                    {showLiveTracking && (
                        <Card className="tr-live">
                            <div className="tr-live-head">
                                <div>
                                    <h2>Mechanic is on the way</h2>
                                    <p>The map shows your mechanic’s journey to you.</p>
                                </div>
                                <span className="tr-live-badge">
                                    <i /> Live
                                </span>
                            </div>
                            <LiveTrackingMap requestId={request.id} viewerRole="customer" />
                        </Card>
                    )}

                    <div className="tr-layout">
                        {/* Main column */}
                        <div className="tr-main">
                            <Card title="Service details">
                                <div className="tr-issue-head">
                                    <span className="tr-issue-icon" aria-hidden="true">
                                        <i className={`bi ${categoryIcon(issue.category)}`} />
                                    </span>
                                    <div>
                                        <span className="tr-label">Problem type</span>
                                        <h3>{issue.category || "Roadside issue"}</h3>
                                    </div>
                                    {drivable !== null && (
                                        <span className={`tr-drive ${drivable ? "yes" : "no"}`}>
                                            <i
                                                className={`bi ${drivable
                                                    ? "bi-check-circle-fill"
                                                    : "bi-x-circle-fill"
                                                }`}
                                            />
                                            {drivable ? "Can be driven" : "Can’t be driven"}
                                        </span>
                                    )}
                                </div>

                                <div className="tr-block">
                                    <span className="tr-label">Description</span>
                                    <p className={`tr-text ${issue.description ? "" : "empty"}`}>
                                        {issue.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="tr-block">
                                    <span className="tr-label">Location</span>
                                    {place ? (
                                        <div className="tr-loc">
                                            <i className="bi bi-geo-alt-fill" aria-hidden="true" />
                                            <div>
                                                <strong>
                                                    {place.isCoords ? formatCoords(place) : place.text}
                                                </strong>
                                                {place.isCoords && <span>Pinned location</span>}
                                            </div>
                                            <a
                                                className="tr-btn light sm"
                                                href={`https://www.google.com/maps/search/?api=1&query=${mapTarget}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Open in Maps
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="tr-text empty">Location unavailable</p>
                                    )}
                                </div>

                                <div className="tr-block">
                                    <span className="tr-label">Vehicle</span>
                                    <p className="tr-vehicle">
                                        <i className="bi bi-car-front-fill" aria-hidden="true" />
                                        {vehicleName || "Vehicle information unavailable"}
                                    </p>
                                </div>
                            </Card>

                            {requestProgress >= 0 && (
                                <Card title="Request progress">
                                    <Timeline current={requestProgress} />
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <aside className="tr-side">
                            <Card title="Your mechanic">
                                <div className="tr-mech">
                                    <span className="tr-avatar" aria-hidden="true">
                                        {mechanicName ? initials(mechanicName) : <i className="bi bi-person" />}
                                    </span>
                                    <div>
                                        <h3>{mechanicName || "Not assigned yet"}</h3>
                                        <p>
                                            {mechanicName
                                                ? "RoadAid service provider"
                                                : "We’ll show them here once assigned."}
                                        </p>
                                    </div>
                                </div>

                                {canMessage && (
                                    <button
                                        type="button"
                                        className="tr-btn dark full"
                                        onClick={() => navigate(`/customer/requests/${id}/communication`)}
                                    >
                                        <i className="bi bi-chat-dots-fill" /> Message mechanic
                                    </button>
                                )}
                            </Card>

                            <Card title="Summary">
                                <dl className="tr-summary">
                                    <div>
                                        <dt>Request</dt>
                                        <dd>#{id}</dd>
                                    </div>
                                    <div>
                                        <dt>Created</dt>
                                        <dd>{formatDate(request.createdAt)}</dd>
                                    </div>
                                    {request.completedAt && (
                                        <div>
                                            <dt>Completed</dt>
                                            <dd>{formatDate(request.completedAt)}</dd>
                                        </div>
                                    )}
                                </dl>
                            </Card>
                        </aside>
                    </div>

                    {/* Complaint window */}
                    {isFinal && (
                        <Card title="Something not right?" className="tr-complaint">
                            {complaintDeadline ? (
                                <div className={`tr-window ${complaintTime?.expired ? "over" : ""}`}>
                                    <div>
                                        <strong>
                                            {complaintTime?.expired
                                                ? `The ${COMPLAINT_WINDOW_DAYS}-day complaint period has ended`
                                                : `${complaintTime?.text} to raise a complaint`}
                                        </strong>
                                        <p>Deadline: {formatDate(complaintDeadline)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="tr-btn danger"
                                        disabled={!canRaiseComplaint}
                                        onClick={() => navigate(`/customer/complaints?requestId=${id}`)}
                                    >
                                        Raise a complaint
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <p className="tr-note">
                                        The completion time isn’t saved for this request yet, so we
                                        can’t show the complaint deadline. You can still raise a
                                        complaint.
                                    </p>
                                    <button
                                        type="button"
                                        className="tr-btn danger"
                                        onClick={() => navigate(`/customer/complaints?requestId=${id}`)}
                                    >
                                        Raise a complaint
                                    </button>
                                </>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Styles (scoped under .tr / .tr-*)                                   */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.tr{
  --ink:#000; --fog:#f6f6f6; --line:#e2e2e2; --mute:#5e5e5e;
  --blue:#276ef1; --green:#05944f; --red:#e11900;
  font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:var(--ink); -webkit-font-smoothing:antialiased;
  background:#fff;min-height:100%;padding:24px 24px 64px;
}
.tr-wrap{max-width:1120px;margin:0 auto}
.tr *{box-sizing:border-box}
.tr h1,.tr h2,.tr h3,.tr p,.tr dl,.tr dd,.tr ol{margin:0;padding:0}
.tr button{font-family:inherit;cursor:pointer}
.tr :focus-visible{outline:3px solid var(--blue);outline-offset:2px}

.tr-back{display:inline-flex;align-items:center;gap:8px;min-height:44px;margin-bottom:8px;padding:0;border:0;background:none;font-size:.92rem;font-weight:700;color:var(--ink)}
.tr-back:hover{text-decoration:underline}

.tr-header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:24px}
.tr-header h1{font-size:clamp(1.9rem,4.5vw,2.8rem);font-weight:800;letter-spacing:-.035em;line-height:1.05}
.tr-header p{margin-top:8px;color:var(--mute);font-size:.95rem}
.tr-header-actions{display:flex;align-items:center;gap:10px}

/* Buttons */
.tr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 24px;border:0;border-radius:999px;font-size:.94rem;font-weight:700;text-decoration:none;transition:background .15s,transform .1s;white-space:nowrap}
.tr-btn:active{transform:scale(.98)}
.tr-btn:disabled{opacity:.5;cursor:not-allowed}
.tr-btn.sm{min-height:40px;padding:0 16px;font-size:.86rem}
.tr-btn.full{width:100%}
.tr-btn.dark{background:var(--ink);color:#fff}
.tr-btn.dark:hover{background:#2b2b2b;color:#fff}
.tr-btn.light{background:var(--fog);color:var(--ink)}
.tr-btn.light:hover{background:#e8e8e8;color:var(--ink)}
.tr-btn.white{background:#fff;color:var(--ink);margin-top:20px}
.tr-btn.danger{background:var(--red);color:#fff}
.tr-btn.danger:hover:not(:disabled){background:#b81400}
.tr-icon-btn{width:48px;height:48px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:var(--fog);color:var(--ink);font-size:1.05rem}
.tr-icon-btn:hover:not(:disabled){background:#e8e8e8}
.tr-icon-btn .spin{animation:tr-spin .8s linear infinite}
@keyframes tr-spin{to{transform:rotate(360deg)}}
.tr-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}

/* Hero */
.tr-hero{margin-bottom:20px;padding:32px;border-radius:24px;background:var(--ink);color:#fff}
.tr-hero.done{background:var(--green)}
.tr-hero.bad{background:#b81400}
.tr-hero.off{background:#4a4a4a}
.tr-hero-label{display:block;margin-bottom:8px;font-size:.88rem;font-weight:600;opacity:.7}
.tr-hero h2{font-size:clamp(1.7rem,4vw,2.4rem);font-weight:800;letter-spacing:-.03em;line-height:1.1}
.tr-hero p{margin-top:10px;max-width:56ch;font-size:1.02rem;line-height:1.55;opacity:.85}

.tr-stage{margin-top:28px;padding-top:24px;border-top:1px solid #ffffff33}
.tr-segments{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;list-style:none}
.tr-segments li{display:flex;flex-direction:column;gap:8px}
.tr-segments li::before{content:"";height:6px;border-radius:99px;background:#ffffff40}
.tr-segments li.on::before{background:#fff}
.tr-seg-label{font-size:.76rem;font-weight:600;opacity:.6}
.tr-segments li.on .tr-seg-label{opacity:1}
.tr-stage-now{display:flex;flex-direction:column;gap:2px;margin-top:20px}
.tr-stage-now strong{font-size:1.1rem}
.tr-stage-now span{opacity:.8;font-size:.95rem}

/* Cards */
.tr-card{margin-bottom:20px;padding:24px;border:1px solid var(--line);border-radius:20px;background:#fff}
.tr-card > h2{margin-bottom:16px;font-size:1.1rem;font-weight:800;letter-spacing:-.015em}

/* Live map */
.tr-live-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}
.tr-live-head h2{font-size:1.25rem;font-weight:800;letter-spacing:-.02em}
.tr-live-head p{margin-top:4px;color:var(--mute);font-size:.92rem}
.tr-live-badge{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:#fde8e5;color:var(--red);font-size:.82rem;font-weight:800}
.tr-live-badge i{width:9px;height:9px;border-radius:50%;background:var(--red);animation:tr-pulse 1.4s ease-in-out infinite}
@keyframes tr-pulse{50%{opacity:.35}}

/* Layout */
.tr-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}

/* Issue details */
.tr-issue-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.tr-issue-head > div{flex:1;min-width:0}
.tr-issue-icon{width:56px;height:56px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--ink);color:#fff;font-size:1.35rem}
.tr-issue-head h3{margin-top:2px;font-size:1.35rem;font-weight:800;letter-spacing:-.025em}
.tr-label{display:block;color:var(--mute);font-size:.82rem;font-weight:600}
.tr-drive{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;font-size:.86rem;font-weight:700;white-space:nowrap}
.tr-drive.yes{color:var(--green);background:#e6f6ee}
.tr-drive.no{color:var(--red);background:#fde8e5}
.tr-block{margin-top:22px}
.tr-block > .tr-label{margin-bottom:8px}
.tr-text{padding:16px 18px;border-radius:14px;background:var(--fog);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.tr-text.empty{color:var(--mute)}
.tr-loc{display:flex;align-items:center;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:16px}
.tr-loc > i{color:var(--red);font-size:1.15rem}
.tr-loc > div{flex:1;min-width:0}
.tr-loc strong{display:block;font-size:1rem;overflow-wrap:anywhere}
.tr-loc span{display:block;margin-top:2px;color:var(--mute);font-size:.82rem}
.tr-vehicle{display:flex;align-items:center;gap:12px;font-weight:700;font-size:1.02rem}
.tr-vehicle i{color:var(--mute)}

/* Timeline */
.tr-timeline{list-style:none}
.tr-timeline li{position:relative;display:flex;gap:14px;padding-bottom:20px}
.tr-timeline li:last-child{padding-bottom:0}
.tr-timeline li:not(:last-child)::before{content:"";position:absolute;left:13px;top:28px;bottom:0;width:3px;background:#d4d4d4}
.tr-timeline li.done:not(:last-child)::before{background:var(--ink)}
.tr-dot{position:relative;z-index:1;width:28px;height:28px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#d4d4d4;color:#fff;font-size:.85rem}
.tr-timeline li.done .tr-dot{background:var(--ink)}
.tr-timeline li.now .tr-dot{background:#fff;border:8px solid var(--ink)}
.tr-tl-text{display:flex;flex-direction:column;gap:2px;padding-top:2px}
.tr-tl-text strong{font-size:.98rem;font-weight:700}
.tr-timeline li.todo .tr-tl-text strong{color:var(--mute);font-weight:600}
.tr-tl-text em{font-style:normal;color:var(--mute);font-size:.84rem}
.tr-timeline li.now .tr-tl-text em{color:var(--ink);font-weight:700}

/* Sidebar */
.tr-mech{display:flex;align-items:center;gap:14px}
.tr-mech + .tr-btn{margin-top:20px}
.tr-mech h3{font-size:1.05rem;font-weight:700}
.tr-mech p{margin-top:2px;color:var(--mute);font-size:.9rem}
.tr-avatar{width:52px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--ink);color:#fff;font-weight:800}
.tr-summary{display:grid;gap:14px}
.tr-summary div{display:flex;justify-content:space-between;align-items:center;gap:12px}
.tr-summary dt{color:var(--mute);font-size:.9rem}
.tr-summary dd{font-weight:700;text-align:right;font-size:.92rem}

/* Complaint */
.tr-window{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px;border-radius:16px;background:#fff8e6}
.tr-window.over{background:var(--fog)}
.tr-window strong{display:block;font-size:1rem}
.tr-window p{margin-top:4px;color:var(--mute);font-size:.88rem}
.tr-note{margin-bottom:16px;color:var(--mute);line-height:1.55}

/* Error */
.tr-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:64px 24px;border-radius:20px;background:var(--fog);text-align:center}
.tr-empty-icon{width:72px;height:72px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;border-radius:50%;background:var(--red);color:#fff;font-size:1.9rem}
.tr-empty h2{font-size:1.4rem;font-weight:800;letter-spacing:-.02em}
.tr-empty p{max-width:42ch;margin-bottom:14px;color:var(--mute)}

.tr-skel{display:grid;gap:18px}
.tr-skel i{display:block;border-radius:14px;background:linear-gradient(90deg,#eee 25%,#f7f7f7 50%,#eee 75%);background-size:200% 100%;animation:tr-shimmer 1.4s infinite}
@keyframes tr-shimmer{to{background-position:-200% 0}}

@media(max-width:900px){
  .tr-layout{grid-template-columns:1fr}
}
@media(max-width:600px){
  .tr{padding:16px 16px 56px}
  .tr-header{flex-direction:column;align-items:stretch}
  .tr-header-actions{justify-content:space-between}
  .tr-header-actions .tr-btn{flex:1}
  .tr-hero{padding:24px;border-radius:20px}
  .tr-card{padding:20px;border-radius:16px}
  .tr-seg-label{font-size:.66rem}
  .tr-loc{flex-wrap:wrap}
  .tr-loc .tr-btn{width:100%}
  .tr-window{flex-direction:column;align-items:stretch}
}
@media(prefers-reduced-motion:reduce){
  .tr *{animation:none!important;transition:none!important}
}
`;

export default TrackRequest;