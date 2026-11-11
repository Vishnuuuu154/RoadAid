import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api, { API_BASE_URL } from "../../services/api";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

// Where uploaded images are served from. Move this to an env variable
// before deploying (it was hard-coded to localhost in the original).
const FILE_BASE_URL = API_BASE_URL;

const COMPLAINT_WINDOW_DAYS = 7;
const REFRESH_INTERVAL_MS = 30000;

// The normal life of a request, in order.
const STEPS = ["Requested", "Quotation", "Accepted", "In progress", "Completed"];

const STATUS = {
    PENDING: {
        label: "Pending",
        tone: "amber",
        step: 0,
        next: "Waiting for a mechanic to review your request.",
    },
    WAITING_FOR_QUOTATION: {
        label: "Waiting for quotation",
        tone: "blue",
        step: 1,
        next: "Your mechanic is preparing a price quote.",
    },
    QUOTATION_PENDING: {
        label: "Quotation pending",
        tone: "amber",
        step: 1,
        next: "A quotation is waiting for your decision.",
    },
    ACCEPTED: {
        label: "Accepted",
        tone: "green",
        step: 2,
        next: "Your request is confirmed. Message your mechanic for arrival details.",
    },
    IN_PROGRESS: {
        label: "In progress",
        tone: "dark",
        step: 3,
        next: "Your mechanic is working on your vehicle.",
    },
    COMPLETED: {
        label: "Completed",
        tone: "green",
        step: 4,
        next: "Service finished. If something isn’t right, you can raise a complaint.",
    },
    CLOSED: {
        label: "Completed",
        tone: "green",
        step: 4,
        next: "Service finished. If something isn’t right, you can raise a complaint.",
    },
    REJECTED: {
        label: "Rejected",
        tone: "red",
        step: null,
        next: "The mechanic couldn’t take this request. Choose how to continue below.",
    },
    CANCELLED: {
        label: "Cancelled",
        tone: "grey",
        step: null,
        next: "This request was cancelled.",
    },
};

const LIVE_STATUSES = [
    "PENDING",
    "WAITING_FOR_QUOTATION",
    "QUOTATION_PENDING",
    "ACCEPTED",
    "IN_PROGRESS",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const statusInfo = (status) =>
    STATUS[status] || {
        label: status || "Unknown",
        tone: "grey",
        step: null,
        next: "",
    };

const imageUrl = (image) => {
    if (!image) return "";
    if (image.startsWith("http://") || image.startsWith("https://")) return image;
    return `${FILE_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

const formatDate = (date) =>
    date
        ? new Date(date).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        })
        : "—";

const complaintDaysLeft = (completedAt) => {
    if (!completedAt) return 0;
    const deadline =
        new Date(completedAt).getTime() + COMPLAINT_WINDOW_DAYS * 86400000;
    return Math.max(0, Math.ceil((deadline - Date.now()) / 86400000));
};

const initials = (name) =>
    (name || "?")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");

const ISSUE_KEYS = {
    category: "category",
    description: "description",
    "vehicle drivable": "drivable",
    drivable: "drivable",
};

// The backend sends category, description and drivable as one text block
// ("Category: X\nDescription: Y\nVehicle Drivable: Yes"). Split it into fields.
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

    // Older requests may be plain text with no labels.
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
    const found = text.match(
        /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/
    );

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

function StatusPill({ info }) {
    return (
        <span className={`rd-pill ${info.tone}`}>
      <i /> {info.label}
    </span>
    );
}

function Stepper({ current }) {
    return (
        <ol className="rd-steps" aria-label="Request progress">
            {STEPS.map((label, index) => {
                const state =
                    index < current ? "done" : index === current ? "now" : "todo";
                return (
                    <li
                        key={label}
                        className={state}
                        aria-current={state === "now" ? "step" : undefined}
                    >
            <span className="rd-dot">
              {state === "done" && <i className="bi bi-check-lg" />}
            </span>
                        <span className="rd-step-label">{label}</span>
                    </li>
                );
            })}
        </ol>
    );
}

function Photo({ src, alt, onOpen }) {
    const [failed, setFailed] = useState(false);
    if (failed) {
        return (
            <div className="rd-photo missing" aria-label={`${alt} could not load`}>
                <i className="bi bi-image" />
            </div>
        );
    }
    return (
        <button
            type="button"
            className="rd-photo"
            onClick={onOpen}
            aria-label={`Open ${alt}`}
        >
            <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
        </button>
    );
}

function Lightbox({ images, index, onChange, onClose }) {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight") onChange((index + 1) % images.length);
            if (e.key === "ArrowLeft")
                onChange((index - 1 + images.length) % images.length);
        };
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [index, images.length, onChange, onClose]);

    return (
        <div
            className="rd-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <button
                type="button"
                className="rd-lb-btn close"
                onClick={onClose}
                aria-label="Close photo viewer"
            >
                <i className="bi bi-x-lg" />
            </button>

            {images.length > 1 && (
                <button
                    type="button"
                    className="rd-lb-btn prev"
                    onClick={() => onChange((index - 1 + images.length) % images.length)}
                    aria-label="Previous photo"
                >
                    <i className="bi bi-chevron-left" />
                </button>
            )}

            <img src={imageUrl(images[index])} alt={`Photo ${index + 1}`} />

            {images.length > 1 && (
                <button
                    type="button"
                    className="rd-lb-btn next"
                    onClick={() => onChange((index + 1) % images.length)}
                    aria-label="Next photo"
                >
                    <i className="bi bi-chevron-right" />
                </button>
            )}

            <span className="rd-lb-count">
        {index + 1} / {images.length}
      </span>
        </div>
    );
}

function Card({ title, children, className = "" }) {
    return (
        <section className={`rd-card ${className}`}>
            {title && <h2>{title}</h2>}
            {children}
        </section>
    );
}

function BackLink({ onClick }) {
    return (
        <button type="button" className="rd-back" onClick={onClick}>
            <i className="bi bi-arrow-left" /> My requests
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function IssueDetails({ request }) {
    const [copied, setCopied] = useState(false);

    const issue = parseIssue(request.issueDescription);
    const place = parseLocation(request.location);
    const drivable = /^(yes|y|true)$/i.test(issue.drivable)
        ? true
        : /^(no|n|false)$/i.test(issue.drivable)
            ? false
            : null;

    useEffect(() => {
        if (!copied) return undefined;
        const timer = setTimeout(() => setCopied(false), 2000);
        return () => clearTimeout(timer);
    }, [copied]);

    const copyLocation = async () => {
        try {
            await navigator.clipboard.writeText(place.text);
            setCopied(true);
        } catch {
            /* Clipboard not available (for example on plain http). */
        }
    };

    const target = place?.isCoords
        ? `${place.lat},${place.lng}`
        : encodeURIComponent(place?.text || "");

    // Small OpenStreetMap preview. No API key needed.
    const mapSrc = place?.isCoords
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${place.lng - 0.004}%2C${place.lat - 0.0025}%2C${place.lng + 0.004}%2C${place.lat + 0.0025}&layer=mapnik&marker=${place.lat}%2C${place.lng}`
        : "";

    return (
        <Card title="Issue details">
            <div className="rd-issue-head">
                <span className="rd-issue-icon" aria-hidden="true">
                    <i className={`bi ${categoryIcon(issue.category)}`} />
                </span>

                <div>
                    <span className="rd-label">Problem type</span>
                    <h3>{issue.category || "Roadside issue"}</h3>
                </div>

                {drivable !== null && (
                    <span className={`rd-drive ${drivable ? "yes" : "no"}`}>
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

            <div className="rd-block">
                <span className="rd-label">Description</span>
                <p className={`rd-issue-text ${issue.description ? "" : "empty"}`}>
                    {issue.description || "No description provided."}
                </p>
            </div>

            <div className="rd-block">
                <span className="rd-label">Location</span>

                {place ? (
                    <div className="rd-loc">
                        <div className="rd-loc-top">
                            <i className="bi bi-geo-alt-fill" aria-hidden="true" />
                            <div>
                                <strong className="rd-loc-main">
                                    {place.isCoords ? formatCoords(place) : place.text}
                                </strong>
                                {place.isCoords && (
                                    <span className="rd-loc-sub">Pinned location</span>
                                )}
                            </div>
                        </div>

                        {mapSrc && (
                            <iframe
                                title="Request location on map"
                                src={mapSrc}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        )}

                        <div className="rd-loc-actions">
                            <a
                                className="rd-chip-link primary"
                                href={`https://www.google.com/maps/search/?api=1&query=${target}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i className="bi bi-map" /> Open in Maps
                            </a>
                            <a
                                className="rd-chip-link"
                                href={`https://www.google.com/maps/dir/?api=1&destination=${target}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <i className="bi bi-signpost-2" /> Directions
                            </a>
                            <button
                                type="button"
                                className="rd-chip-link"
                                onClick={copyLocation}
                            >
                                <i className={`bi ${copied ? "bi-check2" : "bi-copy"}`} />
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="rd-issue-text empty">Location not available</p>
                )}
            </div>

            <div className="rd-tiles">
                <div className="rd-tile">
                    <i className="bi bi-car-front-fill" aria-hidden="true" />
                    <div>
                        <span className="rd-label">Vehicle</span>
                        <strong>{request.vehicle || "Not available"}</strong>
                    </div>
                </div>

                <div className="rd-tile">
                    <i className="bi bi-clock-history" aria-hidden="true" />
                    <div>
                        <span className="rd-label">Reported</span>
                        <strong>{formatDate(request.createdAt)}</strong>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function RequestDetails() {
    const { requestId } = useParams();
    const navigate = useNavigate();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [reassigning, setReassigning] = useState(false);
    const [reassignError, setReassignError] = useState("");

    const [photoIndex, setPhotoIndex] = useState(null);
    const [toast, setToast] = useState("");

    const loadRequestDetails = useCallback(
        async ({ silent = false } = {}) => {
            try {
                if (silent) setRefreshing(true);
                else setLoading(true);
                if (!silent) setError("");

                const response = await api.get(`/requests/${requestId}/details`);
                setRequest(response.data);
                setError("");
            } catch (requestError) {
                console.error("Failed to load request details:", requestError);
                // A failed background refresh shouldn't replace a page that works.
                if (!silent) {
                    setError(
                        requestError.response?.data?.message ||
                        "Failed to load request details."
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
        loadRequestDetails();
    }, [loadRequestDetails]);

    // Keep active requests up to date without the customer refreshing.
    const status = request?.status;
    useEffect(() => {
        if (!LIVE_STATUSES.includes(status)) return undefined;
        const timer = setInterval(
            () => loadRequestDetails({ silent: true }),
            REFRESH_INTERVAL_MS
        );
        return () => clearInterval(timer);
    }, [status, loadRequestDetails]);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(""), 3200);
        return () => clearTimeout(timer);
    }, [toast]);

    const handleAutoReassign = async () => {
        try {
            setReassigning(true);
            setReassignError("");
            await api.put(`/requests/${requestId}/auto-reassign`);
            await loadRequestDetails({ silent: true });
            setToast("Mechanic reassigned");
        } catch (requestError) {
            console.error("Failed to reassign mechanic:", requestError);
            setReassignError(
                requestError.response?.data?.message ||
                "Unable to find an available mechanic."
            );
        } finally {
            setReassigning(false);
        }
    };

    const goBack = () => navigate("/customer/requests");

    /* ---------- Loading ---------- */
    if (loading) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <div className="rd" aria-busy="true" aria-label="Loading request">
                    <div className="rd-wrap">
                        <div className="rd-skel">
                            <i style={{ width: 120, height: 18 }} />
                            <i style={{ width: "40%", height: 44 }} />
                            <i style={{ width: "100%", height: 96 }} />
                            <i style={{ width: "100%", height: 220 }} />
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    /* ---------- Error ---------- */
    if (error) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <div className="rd">
                    <div className="rd-wrap">
                        <BackLink onClick={goBack} />
                        <div className="rd-empty">
                            <div className="rd-empty-icon">
                                <i className="bi bi-wifi-off" />
                            </div>
                            <h2>Couldn’t load this request</h2>
                            <p>{error}</p>
                            <div className="rd-row">
                                <button
                                    type="button"
                                    className="rd-btn dark"
                                    onClick={() => loadRequestDetails()}
                                >
                                    Try again
                                </button>
                                <button type="button" className="rd-btn light" onClick={goBack}>
                                    Back to requests
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    if (!request) return null;

    const info = statusInfo(request.status);
    const id = request.requestId ?? request.id;
    const images = Array.isArray(request.images) ? request.images : [];
    const isFinished = ["COMPLETED", "CLOSED"].includes(request.status);
    const canMessage =
        request.mechanicName &&
        !["REJECTED", "CANCELLED"].includes(request.status);
    const daysLeft = isFinished ? complaintDaysLeft(request.completedAt) : 0;

    return (
        <CustomerLayout>
            <style>{css}</style>

            <div className="rd">
                <div className="rd-wrap">
                    <BackLink onClick={goBack} />

                    {/* Header */}
                    <header className="rd-header">
                        <div>
                            <h1>Request #{id}</h1>
                            <p>Created {formatDate(request.createdAt)}</p>
                        </div>
                        <div className="rd-header-side">
                            <StatusPill info={info} />
                            {LIVE_STATUSES.includes(request.status) && (
                                <button
                                    type="button"
                                    className="rd-icon-btn"
                                    onClick={() => loadRequestDetails({ silent: true })}
                                    disabled={refreshing}
                                    aria-label="Refresh status"
                                    title="Refresh status"
                                >
                                    <i
                                        className={`bi bi-arrow-clockwise ${
                                            refreshing ? "spin" : ""
                                        }`}
                                    />
                                </button>
                            )}
                        </div>
                    </header>

                    {/* Progress */}
                    <Card className="rd-progress">
                        {info.step !== null ? (
                            <Stepper current={info.step} />
                        ) : (
                            <div className={`rd-banner ${info.tone}`}>
                                <i
                                    className={`bi ${
                                        info.tone === "red"
                                            ? "bi-x-circle-fill"
                                            : "bi-slash-circle-fill"
                                    }`}
                                />
                                <strong>{info.label}</strong>
                            </div>
                        )}
                        {info.next && (
                            <p className="rd-next" role="status">
                                {info.next}
                            </p>
                        )}
                    </Card>

                    {/* Reassignment */}
                    {request.status === "REJECTED" && (
                        <Card title="Choose how to continue" className="rd-reassign">
                            {reassignError && (
                                <div className="rd-alert" role="alert">
                                    <i className="bi bi-exclamation-circle-fill" />
                                    <span>{reassignError}</span>
                                </div>
                            )}

                            <div className="rd-option">
                                <div>
                                    <h3>Let RoadAid find one</h3>
                                    <p>We’ll assign the nearest available mechanic for you.</p>
                                </div>
                                <button
                                    type="button"
                                    className="rd-btn dark"
                                    onClick={handleAutoReassign}
                                    disabled={reassigning}
                                >
                                    {reassigning ? (
                                        <>
                                            <span className="rd-spinner" aria-hidden="true" />{" "}
                                            Finding…
                                        </>
                                    ) : (
                                        "Find one for me"
                                    )}
                                </button>
                            </div>

                            <div className="rd-option">
                                <div>
                                    <h3>Choose a mechanic</h3>
                                    <p>Browse available mechanics and pick one yourself.</p>
                                </div>
                                <button
                                    type="button"
                                    className="rd-btn light"
                                    onClick={() =>
                                        navigate(`/customer/mechanics?reassign=${requestId}`)
                                    }
                                >
                                    Browse mechanics
                                </button>
                            </div>
                        </Card>
                    )}

                    <div className="rd-layout">
                        {/* Main column */}
                        <div className="rd-main">
                            <IssueDetails request={request} />

                            {images.length > 0 && (
                                <Card title={`Photos (${images.length})`}>
                                    <div className="rd-photos">
                                        {images.map((image, index) => (
                                            <Photo
                                                key={index}
                                                src={imageUrl(image)}
                                                alt={`Request photo ${index + 1}`}
                                                onOpen={() => setPhotoIndex(index)}
                                            />
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar */}
                        <aside className="rd-side">
                            <Card title="Your mechanic">
                                <div className="rd-mech">
                  <span className="rd-avatar" aria-hidden="true">
                    {request.mechanicName ? (
                        initials(request.mechanicName)
                    ) : (
                        <i className="bi bi-person" />
                    )}
                  </span>
                                    <div>
                                        <h3>{request.mechanicName || "Not assigned yet"}</h3>
                                        <p>
                                            {request.mechanicName
                                                ? "RoadAid service provider"
                                                : "We’ll show them here once assigned."}
                                        </p>
                                    </div>
                                </div>

                                {canMessage && (
                                    <button
                                        type="button"
                                        className="rd-btn dark full"
                                        onClick={() =>
                                            navigate(`/customer/requests/${id}/communication`)
                                        }
                                    >
                                        <i className="bi bi-chat-dots-fill" /> Message mechanic
                                    </button>
                                )}
                            </Card>

                            {isFinished && (
                                <Card title="Something wrong?">
                                    {daysLeft > 0 ? (
                                        <>
                                            <p className="rd-note">
                                                You can raise a complaint for{" "}
                                                <strong>
                                                    {daysLeft} more {daysLeft === 1 ? "day" : "days"}
                                                </strong>
                                                .
                                            </p>
                                            <button
                                                type="button"
                                                className="rd-btn outline-red full"
                                                onClick={() =>
                                                    navigate(`/customer/complaints?requestId=${id}`)
                                                }
                                            >
                                                Raise a complaint
                                            </button>
                                        </>
                                    ) : (
                                        <p className="rd-note">
                                            The {COMPLAINT_WINDOW_DAYS}-day complaint window for this
                                            service has ended.
                                        </p>
                                    )}
                                </Card>
                            )}

                            <Card title="Summary">
                                <dl className="rd-summary">
                                    <div>
                                        <dt>Request</dt>
                                        <dd>#{id}</dd>
                                    </div>
                                    <div>
                                        <dt>Status</dt>
                                        <dd>
                                            <StatusPill info={info} />
                                        </dd>
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
                </div>
            </div>

            {photoIndex !== null && (
                <Lightbox
                    images={images}
                    index={photoIndex}
                    onChange={setPhotoIndex}
                    onClose={() => setPhotoIndex(null)}
                />
            )}

            {toast && (
                <div className="rd-toast" role="status">
                    <i className="bi bi-check-circle-fill" /> {toast}
                </div>
            )}
        </CustomerLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Styles (scoped under .rd / .rd-*)                                   */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.rd, .rd-lightbox, .rd-toast{
  --ink:#000; --fog:#f6f6f6; --line:#e2e2e2; --mute:#5e5e5e;
  --blue:#276ef1; --green:#05944f; --red:#e11900; --amber:#b86e00;
  font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:var(--ink); -webkit-font-smoothing:antialiased;
}
.rd{background:#fff;min-height:100%;padding:24px 24px 64px}
.rd-wrap{max-width:1120px;margin:0 auto}
.rd *{box-sizing:border-box}
.rd h1,.rd h2,.rd h3,.rd p,.rd dl,.rd dd,.rd ol{margin:0;padding:0}
.rd button{font-family:inherit;cursor:pointer}
.rd :focus-visible,.rd-lightbox :focus-visible{outline:3px solid var(--blue);outline-offset:2px}

.rd-back{display:inline-flex;align-items:center;gap:8px;min-height:44px;margin-bottom:8px;padding:0;border:0;background:none;font-size:.92rem;font-weight:700;color:var(--ink)}
.rd-back:hover{text-decoration:underline}

.rd-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px}
.rd-header h1{font-size:clamp(1.9rem,4.5vw,2.8rem);font-weight:800;letter-spacing:-.035em;line-height:1.05}
.rd-header p{margin-top:8px;color:var(--mute)}
.rd-header-side{display:flex;align-items:center;gap:10px}

.rd-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;font-size:.86rem;font-weight:700;background:var(--fog);white-space:nowrap}
.rd-pill i{width:9px;height:9px;border-radius:50%;background:currentColor}
.rd-pill.green{color:var(--green);background:#e6f6ee}
.rd-pill.amber{color:var(--amber);background:#fff3dc}
.rd-pill.blue{color:var(--blue);background:#e8f0fe}
.rd-pill.red{color:var(--red);background:#fde8e5}
.rd-pill.dark{color:#fff;background:var(--ink)}
.rd-pill.grey{color:var(--mute)}

.rd-card{padding:24px;border:1px solid var(--line);border-radius:20px;background:#fff;margin-bottom:20px}
.rd-card h2{margin-bottom:16px;font-size:1.1rem;font-weight:800;letter-spacing:-.015em}

/* Stepper */
.rd-progress{background:var(--fog);border-color:transparent}
.rd-steps{display:flex;list-style:none}
.rd-steps li{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.rd-steps li + li::before{content:"";position:absolute;top:13px;right:50%;width:100%;height:3px;background:#d4d4d4;z-index:0}
.rd-steps li.done + li::before,.rd-steps li.now::before{background:var(--ink)}
.rd-dot{position:relative;z-index:1;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#d4d4d4;color:#fff;font-size:.85rem}
.rd-steps li.done .rd-dot{background:var(--ink)}
.rd-steps li.now .rd-dot{background:#fff;border:8px solid var(--ink)}
.rd-step-label{font-size:.8rem;font-weight:600;color:var(--mute)}
.rd-steps li.now .rd-step-label,.rd-steps li.done .rd-step-label{color:var(--ink);font-weight:700}
.rd-next{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);font-size:.98rem;font-weight:600}
.rd-banner{display:flex;align-items:center;gap:10px;font-size:1.05rem}
.rd-banner.red{color:var(--red)}
.rd-banner.grey{color:var(--mute)}

/* Reassign */
.rd-reassign{border:2px solid var(--ink)}
.rd-option{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 0}
.rd-option + .rd-option{border-top:1px solid var(--line)}
.rd-option h3{font-size:1rem;font-weight:700}
.rd-option p{margin-top:2px;color:var(--mute);font-size:.9rem}

/* Layout */
.rd-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}

/* Issue details */
.rd-issue-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.rd-issue-head > div{flex:1;min-width:0}
.rd-issue-icon{width:56px;height:56px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--ink);color:#fff;font-size:1.35rem}
.rd-issue-head h3{margin-top:2px;font-size:1.35rem;font-weight:800;letter-spacing:-.025em}
.rd-label{display:block;color:var(--mute);font-size:.82rem;font-weight:600}
.rd-drive{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;font-size:.86rem;font-weight:700;white-space:nowrap}
.rd-drive.yes{color:var(--green);background:#e6f6ee}
.rd-drive.no{color:var(--red);background:#fde8e5}
.rd-block{margin-top:24px}
.rd-block > .rd-label{margin-bottom:8px}
.rd-issue-text{padding:16px 18px;border-radius:14px;background:var(--fog);line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
.rd-issue-text.empty{color:var(--mute)}
.rd-loc{border:1px solid var(--line);border-radius:16px;overflow:hidden}
.rd-loc-top{display:flex;align-items:center;gap:12px;padding:14px 16px}
.rd-loc-top > i{color:var(--red);font-size:1.15rem}
.rd-loc-main{display:block;font-size:1rem;font-weight:700;overflow-wrap:anywhere}
.rd-loc-sub{display:block;margin-top:2px;color:var(--mute);font-size:.82rem}
.rd-loc iframe{display:block;width:100%;height:200px;border:0;border-top:1px solid var(--line);background:var(--fog)}
.rd-loc-actions{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid var(--line)}
.rd-chip-link{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 16px;border:0;border-radius:999px;background:var(--fog);color:var(--ink);font-size:.88rem;font-weight:700;text-decoration:none;transition:background .15s}
.rd-chip-link:hover{background:#e8e8e8;color:var(--ink)}
.rd-chip-link.primary{background:var(--ink);color:#fff}
.rd-chip-link.primary:hover{background:#2b2b2b;color:#fff}
.rd-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
.rd-tile{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:14px}
.rd-tile > i{margin-top:3px;color:var(--mute)}
.rd-tile strong{display:block;margin-top:2px;font-weight:700;overflow-wrap:anywhere}

/* Photos */
.rd-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.rd-photo{aspect-ratio:1;padding:0;border:0;border-radius:14px;overflow:hidden;background:var(--fog)}
.rd-photo img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .2s}
.rd-photo:hover img{transform:scale(1.04)}
.rd-photo.missing{display:flex;align-items:center;justify-content:center;color:#aaa;font-size:1.6rem;cursor:default}

/* Sidebar */
.rd-mech{display:flex;align-items:center;gap:14px}
.rd-mech h3{font-size:1.05rem;font-weight:700}
.rd-mech p,.rd-note{margin-top:2px;color:var(--mute);font-size:.9rem}
.rd-note{margin:0 0 14px;line-height:1.5}
.rd-note strong{color:var(--ink)}
.rd-avatar{width:52px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--ink);color:#fff;font-weight:800;font-size:1rem}
.rd-mech + .rd-btn{margin-top:20px}
.rd-summary{display:grid;gap:14px}
.rd-summary div{display:flex;justify-content:space-between;align-items:center;gap:12px}
.rd-summary dt{color:var(--mute);font-size:.9rem}
.rd-summary dd{font-weight:700;text-align:right;font-size:.92rem}

/* Buttons */
.rd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 24px;border:0;border-radius:999px;font-size:.94rem;font-weight:700;transition:background .15s,transform .1s;white-space:nowrap}
.rd-btn:active{transform:scale(.98)}
.rd-btn:disabled{opacity:.55;cursor:not-allowed}
.rd-btn.full{width:100%}
.rd-btn.dark{background:var(--ink);color:#fff}
.rd-btn.dark:hover:not(:disabled){background:#2b2b2b}
.rd-btn.light{background:var(--fog);color:var(--ink)}
.rd-btn.light:hover{background:#e8e8e8}
.rd-btn.outline-red{background:#fff;color:var(--red);box-shadow:inset 0 0 0 2px var(--red)}
.rd-btn.outline-red:hover{background:#fde8e5}
.rd-icon-btn{width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:var(--fog);color:var(--ink)}
.rd-icon-btn:hover:not(:disabled){background:#e8e8e8}
.rd-icon-btn .spin{animation:rd-spin .8s linear infinite}
.rd-spinner{width:16px;height:16px;border:2px solid #ffffff55;border-top-color:#fff;border-radius:50%;animation:rd-spin .7s linear infinite}
@keyframes rd-spin{to{transform:rotate(360deg)}}
.rd-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}

.rd-alert{display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;padding:14px 16px;border-radius:12px;background:#fde8e5;color:#8c1000;font-size:.92rem;font-weight:600}

/* Empty / error */
.rd-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:64px 24px;border-radius:20px;background:var(--fog);text-align:center}
.rd-empty-icon{width:72px;height:72px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;border-radius:50%;background:var(--red);color:#fff;font-size:1.9rem}
.rd-empty h2{font-size:1.4rem;font-weight:800;letter-spacing:-.02em}
.rd-empty p{max-width:42ch;margin-bottom:14px;color:var(--mute)}

/* Skeleton */
.rd-skel{display:grid;gap:18px}
.rd-skel i{display:block;border-radius:14px;background:linear-gradient(90deg,#eee 25%,#f7f7f7 50%,#eee 75%);background-size:200% 100%;animation:rd-shimmer 1.4s infinite}
@keyframes rd-shimmer{to{background-position:-200% 0}}

/* Lightbox */
.rd-lightbox{position:fixed;inset:0;z-index:1060;display:flex;align-items:center;justify-content:center;padding:56px 72px;background:#000000ee}
.rd-lightbox img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}
.rd-lb-btn{position:absolute;width:48px;height:48px;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:#ffffff26;color:#fff;font-size:1.1rem}
.rd-lb-btn:hover{background:#ffffff40}
.rd-lb-btn.close{top:16px;right:16px}
.rd-lb-btn.prev{left:16px}
.rd-lb-btn.next{right:16px}
.rd-lb-count{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:#fff;font-size:.86rem;font-weight:600}

/* Toast */
.rd-toast{position:fixed;left:50%;bottom:28px;z-index:1070;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:14px 22px;border-radius:999px;background:var(--ink);color:#fff;font-size:.92rem;font-weight:600;box-shadow:0 10px 30px #0004}
.rd-toast i{color:#2fd27f}

@media(max-width:900px){
  .rd-layout{grid-template-columns:1fr}
}
@media(max-width:600px){
    .rd-tiles{grid-template-columns:1fr}
  .rd{padding:16px 16px 56px}
  .rd-header{flex-direction:column}
  .rd-card{padding:20px;border-radius:16px}
  .rd-step-label{font-size:.68rem}
  .rd-option{flex-direction:column;align-items:stretch}
  .rd-lightbox{padding:64px 12px}
  .rd-lb-btn.prev,.rd-lb-btn.next{top:auto;bottom:12px}
  .rd-lb-btn.prev{left:12px}
  .rd-lb-btn.next{right:12px}
}
@media(prefers-reduced-motion:reduce){
  .rd *,.rd-lightbox *{animation:none!important;transition:none!important}
}
`;

export default RequestDetails;