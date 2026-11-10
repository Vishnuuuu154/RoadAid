import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import {
    getPendingMechanics,
    approveMechanic,
    rejectMechanic
} from "../../services/adminService";

import {
    FaSyncAlt,
    FaSearch,
    FaCheck,
    FaTimes,
    FaPhoneAlt,
    FaMapMarkerAlt,
    FaEnvelope,
    FaStore,
    FaTools,
    FaCheckCircle,
    FaExclamationTriangle,
    FaUserShield,
    FaArrowRight,
    FaUser,
    FaIdBadge,
    FaCopy,
    FaChevronRight,
    FaBuilding,
    FaBriefcase,
    FaHashtag,
    FaFileAlt,
    FaExternalLinkAlt
} from "react-icons/fa";

import "../../styles/ProviderVerification.css";
/* Reuses the document-row + status-pill styling already defined for the
   towing-vehicle documents list, so both admin verification pages render
   documents identically instead of duplicating that CSS. */
import "../../styles/VehicleVerification.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 60000;
const MIN_REASON = 10;

const ROUTES = {
    mechanics: "/admin/users/mechanics"
};

const EXPERIENCE = [
    { key: "ALL", label: "All", test: () => true },
    { key: "0-2", label: "0–2 yrs", test: (y) => y <= 2 },
    { key: "3-5", label: "3–5 yrs", test: (y) => y >= 3 && y <= 5 },
    { key: "6+", label: "6+ yrs", test: (y) => y >= 6 }
];

const SORTS = [
    { key: "default", label: "Default order" },
    { key: "exp-desc", label: "Most experienced" },
    { key: "exp-asc", label: "Least experienced" },
    { key: "name", label: "Name A–Z" }
];

/* One tap fills the reason; the admin can still edit the text. */
const QUICK_REASONS = [
    "Contact number could not be reached.",
    "Workshop details are incomplete.",
    "Experience could not be verified.",
    "Duplicate registration."
];

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const idOf = (m) => m.mechanicId ?? m.id;
const towingIdOf = (provider) => provider.providerId ?? provider.id;

const years = (m) => Number(m.experienceYears) || 0;

const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?";

const missingFields = (m) => {
    const missing = [];
    if (!m.workshopName?.trim()) missing.push("workshop name");
    if (!m.contactNumber?.toString().trim()) missing.push("contact number");
    return missing;
};

/* Reads the first non-empty value, so a slightly different API shape still works. */
const pick = (m, ...keys) => {
    for (const key of keys) {
        const value = key.split(".").reduce((obj, part) => obj?.[part], m);
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
    }
    return "";
};

const emailOf = (m) => pick(m, "email", "user.email");
const phoneOf = (m) => pick(m, "phone", "phoneNumber", "user.phone");
const addressOf = (m) => pick(m, "workshopAddress", "address");
const joinedOf = (m) => pick(m, "createdAt", "registeredAt", "registrationDate", "user.createdAt");

/* ---------- Towing provider: everything submitted at registration ----------
 * Registration (Register.jsx, the TOWING_PROVIDER flow) collects business
 * type, district, PIN code, an alternate contact number, and three
 * verification documents — none of which the admin list previously showed.
 * The field names below are read defensively (several candidate keys per
 * field) since the exact response shape of GET /admin/towing-providers/pending
 * isn't available to check against; whichever key the backend actually
 * uses will display, and anything genuinely missing shows as "Not provided"
 * rather than silently vanishing. */

const businessNameOf = (p) => pick(p, "businessName", "business.name");
const businessTypeOf = (p) => pick(p, "businessType", "business_type", "business.type");
const businessAddressOf = (p) => pick(p, "businessAddress", "business.address");
const districtOf = (p) => pick(p, "district", "business.district");
const pinCodeOf = (p) => pick(p, "pinCode", "pincode", "pin_code", "postalCode");
const alternateContactOf = (p) => pick(p, "alternateContact", "alternateContactNumber", "contactNumber");

const BUSINESS_TYPE_LABELS = {
    INDIVIDUAL: "Individual",
    PARTNERSHIP: "Partnership",
    COMPANY: "Company"
};
const businessTypeLabel = (p) => {
    const raw = businessTypeOf(p);
    return BUSINESS_TYPE_LABELS[raw] || raw;
};

/* Reads the first array found under any of the candidate keys — for the
   documents list, which pick() (a string-only reader) can't return. */
const firstArray = (obj, ...keys) => {
    for (const key of keys) {
        const value = key.split(".").reduce((o, part) => o?.[part], obj);
        if (Array.isArray(value)) return value;
    }
    return [];
};

const towingDocumentsOf = (p) => firstArray(p, "documents", "verificationDocuments", "providerDocuments");

const missingTowingFields = (p) => {
    const missing = [];
    if (!businessAddressOf(p)) missing.push("business address");
    if (!towingDocumentsOf(p).length) missing.push("verification documents");
    return missing;
};

const DOCUMENT_TYPE_LABELS = {
    OWNER_ID_PROOF: "Owner's identity proof",
    ownerIdProof: "Owner's identity proof",
    BUSINESS_REG_CERT: "Business registration certificate",
    businessRegCert: "Business registration certificate",
    BUSINESS_ADDRESS_PROOF: "Business address proof",
    businessAddressProof: "Business address proof"
};
const documentLabel = (doc) =>
    DOCUMENT_TYPE_LABELS[doc.documentType] || DOCUMENT_TYPE_LABELS[doc.type] || doc.documentType || doc.type || "Document";

const documentUrlOf = (doc) => pick(doc, "url", "fileUrl", "documentUrl", "downloadUrl", "previewUrl");

const dateText = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const errorText = (error, fallback) => error?.response?.data?.message || fallback;

const timeText = (date) => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function Detail({ icon, label, children }) {
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

/* Generic approve confirmation, used for both mechanics and towing
   providers — the caller supplies the copy, this component just handles
   the overlay, focus and Escape-to-close. */
function ConfirmDialog({ title, message, warning, confirmLabel = "Yes, approve", busy, onCancel, onConfirm }) {
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
                <span className="pv-dialog-icon" aria-hidden="true"><FaUserShield /></span>
                <h2 id="pv-dialog-title">{title}</h2>
                <p>{message}</p>

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
                        className="pv-btn pv-btn-approve"
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? "Approving…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CopyButton({ value, label }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* Clipboard can be blocked; the text is still selectable. */
        }
    };

    return (
        <button type="button" className="pv-copy" onClick={copy} aria-label={`Copy ${label}`}>
            {copied ? "Copied" : <FaCopy aria-hidden="true" />}
        </button>
    );
}

function Row({ label, value, href, copy }) {
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

function DetailDrawer({ provider, busy, suspended, onClose, onApprove, onReject }) {
    const closeRef = useRef(null);
    const missing = missingFields(provider);
    const email = emailOf(provider);
    const phone = phoneOf(provider);
    const contact = pick(provider, "contactNumber");
    const joined = joinedOf(provider);

    useEffect(() => {
        closeRef.current?.focus();
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && !suspended) onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [suspended, onClose]);

    return (
        <div className="pv-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <aside className="pv-drawer" role="dialog" aria-modal="true" aria-labelledby="pv-drawer-title">
                <header className="pv-drawer-head">
                    <span className="pv-avatar pv-avatar-lg" aria-hidden="true">{initials(provider.fullName)}</span>
                    <div className="pv-card-id">
                        <h2 id="pv-drawer-title">{provider.fullName || "Unnamed provider"}</h2>
                        <span>Provider #{idOf(provider)} · Pending review</span>
                    </div>
                    <button type="button" ref={closeRef} className="pv-close" onClick={onClose} aria-label="Close details">
                        <FaTimes aria-hidden="true" />
                    </button>
                </header>

                <div className="pv-drawer-body">
                    {missing.length > 0 && (
                        <p className="pv-warn">
                            <FaExclamationTriangle aria-hidden="true" />
                            <span>Missing {missing.join(" and ")}</span>
                        </p>
                    )}

                    <section className="pv-section">
                        <h3><FaUser aria-hidden="true" /> Personal details</h3>
                        <dl>
                            <Row label="Full name" value={provider.fullName} copy />
                            <Row label="Email" value={email} href={email ? `mailto:${email}` : ""} copy />
                            <Row label="Phone" value={phone} href={phone ? `tel:${phone}` : ""} copy />
                        </dl>
                    </section>

                    <section className="pv-section">
                        <h3><FaStore aria-hidden="true" /> Workshop</h3>
                        <dl>
                            <Row label="Workshop name" value={provider.workshopName?.trim()} />
                            <Row label="Workshop address" value={addressOf(provider)} copy />
                            <Row label="Contact number" value={contact} href={contact ? `tel:${contact}` : ""} copy />
                            <Row
                                label="Experience"
                                value={`${years(provider)} ${years(provider) === 1 ? "year" : "years"}`}
                            />
                        </dl>
                    </section>

                    <section className="pv-section">
                        <h3><FaIdBadge aria-hidden="true" /> Account</h3>
                        <dl>
                            <Row label="Provider ID" value={`#${idOf(provider)}`} />
                            <Row label="Role" value={pick(provider, "role") || "MECHANIC"} />
                            <Row label="Status" value={pick(provider, "verificationStatus", "status") || "PENDING"} />
                            {joined && <Row label="Registered on" value={dateText(joined)} />}
                        </dl>
                    </section>
                </div>

                <footer className="pv-drawer-foot">
                    <button type="button" className="pv-btn pv-btn-reject" onClick={onReject} disabled={busy}>
                        <FaTimes aria-hidden="true" /> Reject
                    </button>
                    <button type="button" className="pv-btn pv-btn-approve" onClick={onApprove} disabled={busy}>
                        <FaCheck aria-hidden="true" /> Approve
                    </button>
                </footer>
            </aside>
        </div>
    );
}

/* The reason textarea + quick-reason chips + cancel/confirm actions shown
   when rejecting a mechanic or a towing provider — identical either way,
   previously duplicated inline in each card. */
function RejectPanel({ idPrefix, title, reason, onReason, busy, onCancel, onConfirm, quickReasons = true }) {
    const reasonOk = reason.trim().length >= MIN_REASON;

    return (
        <div className="pv-reject">
            <label htmlFor={idPrefix} className="pv-reject-title">
                {title}
            </label>

            {quickReasons && (
                <div className="pv-quick" role="group" aria-label="Quick reasons">
                    {QUICK_REASONS.map((text) => (
                        <button
                            type="button"
                            key={text}
                            className="pv-chip"
                            onClick={() => onReason(text)}
                            disabled={busy}
                        >
                            {text.replace(/\.$/, "")}
                        </button>
                    ))}
                </div>
            )}

            <textarea
                id={idPrefix}
                rows={3}
                maxLength={300}
                placeholder="Write the reason the provider will see…"
                value={reason}
                onChange={(e) => onReason(e.target.value)}
                disabled={busy}
                autoFocus
            />
            <div className="pv-reject-foot">
                <span className={reasonOk ? "" : "pv-hint"}>
                    {reasonOk ? `${reason.trim().length}/300` : `At least ${MIN_REASON} characters`}
                </span>
            </div>

            <div className="pv-actions">
                <button type="button" className="pv-btn" onClick={onCancel} disabled={busy}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="pv-btn pv-btn-reject-solid"
                    onClick={onConfirm}
                    disabled={busy || !reasonOk}
                >
                    {busy ? "Rejecting…" : "Confirm rejection"}
                </button>
            </div>
        </div>
    );
}

function ProviderCard({
                          provider,
                          busy,
                          rejecting,
                          reason,
                          onReason,
                          onApprove,
                          onOpenReject,
                          onCancelReject,
                          onConfirmReject,
                          onView
                      }) {
    const missing = missingFields(provider);
    const contact = provider.contactNumber?.toString().trim();

    return (
        <article className="pv-card" aria-busy={busy}>
            <header className="pv-card-head">
                <button type="button" className="pv-card-open" onClick={onView} aria-label={`View details for ${provider.fullName || "provider"}`}>
                    <span className="pv-avatar" aria-hidden="true">{initials(provider.fullName)}</span>
                    <span className="pv-card-id">
                        <h3>{provider.fullName || "Unnamed provider"}</h3>
                        <span>Provider #{idOf(provider)}</span>
                    </span>
                </button>
                <span className="pv-pill">Pending</span>
            </header>

            <div className="pv-details">
                <Detail icon={<FaStore />} label="Workshop">
                    {provider.workshopName?.trim() || <em>Not provided</em>}
                </Detail>
                <Detail icon={<FaTools />} label="Experience">
                    {years(provider)} {years(provider) === 1 ? "year" : "years"}
                </Detail>
                <Detail icon={<FaPhoneAlt />} label="Contact">
                    {contact ? <a href={`tel:${contact}`}>{contact}</a> : <em>Not provided</em>}
                </Detail>
                {emailOf(provider) && (
                    <Detail icon={<FaEnvelope />} label="Email">
                        <a href={`mailto:${emailOf(provider)}`}>{emailOf(provider)}</a>
                    </Detail>
                )}
                {addressOf(provider) && (
                    <Detail icon={<FaMapMarkerAlt />} label="Address">
                        {addressOf(provider)}
                    </Detail>
                )}
            </div>

            {missing.length > 0 && (
                <p className="pv-warn">
                    <FaExclamationTriangle aria-hidden="true" />
                    <span>Missing {missing.join(" and ")}</span>
                </p>
            )}

            <button type="button" className="pv-view" onClick={onView}>
                View full details <FaChevronRight aria-hidden="true" />
            </button>

            {rejecting ? (
                <RejectPanel
                    idPrefix={`reason-${idOf(provider)}`}
                    title="Why is this provider being rejected?"
                    reason={reason}
                    onReason={onReason}
                    busy={busy}
                    onCancel={onCancelReject}
                    onConfirm={onConfirmReject}
                />
            ) : (
                <div className="pv-actions">
                    <button type="button" className="pv-btn pv-btn-reject" onClick={onOpenReject} disabled={busy}>
                        <FaTimes aria-hidden="true" /> Reject
                    </button>
                    <button type="button" className="pv-btn pv-btn-approve" onClick={onApprove} disabled={busy}>
                        <FaCheck aria-hidden="true" /> Approve
                    </button>
                </div>
            )}
        </article>
    );
}

function TowingProviderCard({
                                provider,
                                busy,
                                rejecting,
                                reason,
                                onReason,
                                onApprove,
                                onOpenReject,
                                onCancelReject,
                                onConfirmReject,
                                onView
                            }) {
    const missing = missingTowingFields(provider);
    const id = towingIdOf(provider);

    return (
        <article className="pv-card" aria-busy={busy}>
            <header className="pv-card-head">
                <button
                    type="button"
                    className="pv-card-open"
                    onClick={onView}
                    aria-label={`View details for ${provider.businessName || "towing provider"}`}
                >
                    <span className="pv-avatar" aria-hidden="true">{initials(provider.businessName || provider.fullName)}</span>
                    <span className="pv-card-id">
                        <h3>{provider.businessName || "Unnamed towing business"}</h3>
                        <span>Provider #{id}</span>
                    </span>
                </button>
                <span className="pv-pill">Pending</span>
            </header>

            <div className="pv-details">
                <Detail icon={<FaUser />} label="Owner">{provider.fullName || <em>Not provided</em>}</Detail>
                <Detail icon={<FaBriefcase />} label="Business type">{businessTypeLabel(provider) || <em>Not provided</em>}</Detail>
                <Detail icon={<FaEnvelope />} label="Email">
                    {provider.email ? <a href={`mailto:${provider.email}`}>{provider.email}</a> : <em>Not provided</em>}
                </Detail>
                <Detail icon={<FaPhoneAlt />} label="Phone">
                    {provider.phone ? <a href={`tel:${provider.phone}`}>{provider.phone}</a> : <em>Not provided</em>}
                </Detail>
                <Detail icon={<FaMapMarkerAlt />} label="Business address">{businessAddressOf(provider) || <em>Not provided</em>}</Detail>
                <Detail icon={<FaHashtag />} label="District / PIN">
                    {[districtOf(provider), pinCodeOf(provider)].filter(Boolean).join(" · ") || <em>Not provided</em>}
                </Detail>
            </div>

            {missing.length > 0 && (
                <p className="pv-warn">
                    <FaExclamationTriangle aria-hidden="true" />
                    <span>Missing {missing.join(" and ")}</span>
                </p>
            )}

            <button type="button" className="pv-view" onClick={onView}>
                View full details <FaChevronRight aria-hidden="true" />
            </button>

            {rejecting ? (
                <RejectPanel
                    idPrefix={`towing-reason-${id}`}
                    title="Why is this application being rejected?"
                    reason={reason}
                    onReason={onReason}
                    busy={busy}
                    onCancel={onCancelReject}
                    onConfirm={onConfirmReject}
                />
            ) : (
                <div className="pv-actions">
                    <button type="button" className="pv-btn pv-btn-reject" onClick={onOpenReject} disabled={busy}>
                        <FaTimes aria-hidden="true" /> Reject
                    </button>
                    <button type="button" className="pv-btn pv-btn-approve" onClick={onApprove} disabled={busy}>
                        <FaCheck aria-hidden="true" /> {busy ? "Approving…" : "Approve"}
                    </button>
                </div>
            )}
        </article>
    );
}

function TowingDocumentsList({ documents }) {
    const [previewingId, setPreviewingId] = useState(null);
    const [previewError, setPreviewError] = useState("");

    const openDocument = async (doc) => {
        const id = doc.documentId ?? doc.id;
        if (!id) return;

        // Open a blank tab immediately to avoid popup blocking.
        const previewWindow = window.open("about:blank", "_blank");

        if (!previewWindow) {
            setPreviewError("Please allow pop-ups to preview documents.");
            return;
        }

        try {
            setPreviewingId(id);
            setPreviewError("");

            const response = await api.get(
                `/admin/towing-documents/${id}/view`,
                { responseType: "blob" }
            );

            const fileUrl = URL.createObjectURL(response.data);
            previewWindow.location.href = fileUrl;

            // Release the temporary URL after the preview has had time to load.
            setTimeout(() => URL.revokeObjectURL(fileUrl), 300000);

        } catch (error) {
            console.error("Document preview failed:", error);
            previewWindow.close();
            setPreviewError(
                error.response?.data?.message || "Could not open this document."
            );
        } finally {
            setPreviewingId(null);
        }
    };

    if (!documents.length) {
        return (
            <p className="pv-detail-value">
                No verification documents were found for this application.
            </p>
        );
    }

    return (
        <div className="pv-doc-list">
            {previewError && (
                <p className="pv-doc-row-reason">{previewError}</p>
            )}

            {documents.map((doc, i) => {
                const id = doc.documentId ?? doc.id;
                const status = doc.verificationStatus || doc.status;
                const fileName = doc.fileName || doc.name;

                return (
                    <div className="pv-doc-row" key={id ?? i}>
                        <div className="pv-doc-row-head">
                            <div>
                                <div className="pv-doc-row-name">
                                    {documentLabel(doc)}
                                </div>
                                {fileName && (
                                    <div className="pv-doc-row-file">
                                        {fileName}
                                    </div>
                                )}
                            </div>

                            {status && (
                                <span className="pv-pill" data-status={status}>
                                    {status.charAt(0) +
                                        status.slice(1).toLowerCase()}
                                </span>
                            )}
                        </div>

                        {doc.rejectionReason && (
                            <p className="pv-doc-row-reason">
                                Reason: {doc.rejectionReason}
                            </p>
                        )}

                        <button
                            type="button"
                            className="pv-doc-link pv-doc-link-preview"
                            onClick={() => openDocument(doc)}
                            disabled={!id || previewingId === id}
                        >
                            {previewingId === id
                                ? "Opening..."
                                : "View document"}
                            <FaExternalLinkAlt aria-hidden="true" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

/* Shows every field submitted on the towing-provider registration form:
   account details, business details, and verification documents. */
function TowingProviderDrawer({ provider, busy, suspended, onClose, onApprove, onReject }) {
    const closeRef = useRef(null);
    const documents = towingDocumentsOf(provider);
    const missing = missingTowingFields(provider);

    useEffect(() => {
        closeRef.current?.focus();
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && !suspended) onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [suspended, onClose]);

    const id = towingIdOf(provider);
    const joined = joinedOf(provider);

    return (
        <div className="pv-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <aside className="pv-drawer" role="dialog" aria-modal="true" aria-labelledby="pv-towing-drawer-title">
                <header className="pv-drawer-head">
                    <span className="pv-avatar pv-avatar-lg" aria-hidden="true">
                        {initials(provider.businessName || provider.fullName)}
                    </span>
                    <div className="pv-card-id">
                        <h2 id="pv-towing-drawer-title">{provider.businessName || "Unnamed towing business"}</h2>
                        <span>Provider #{id} · Pending review</span>
                    </div>
                    <button type="button" ref={closeRef} className="pv-close" onClick={onClose} aria-label="Close details">
                        <FaTimes aria-hidden="true" />
                    </button>
                </header>

                <div className="pv-drawer-body">
                    {missing.length > 0 && (
                        <p className="pv-warn">
                            <FaExclamationTriangle aria-hidden="true" />
                            <span>Missing {missing.join(" and ")}</span>
                        </p>
                    )}

                    <section className="pv-section">
                        <h3><FaUser aria-hidden="true" /> Account</h3>
                        <dl>
                            <Row label="Full name" value={provider.fullName} copy />
                            <Row label="Email" value={provider.email} href={provider.email ? `mailto:${provider.email}` : ""} copy />
                            <Row label="Phone" value={provider.phone} href={provider.phone ? `tel:${provider.phone}` : ""} copy />
                        </dl>
                    </section>

                    <section className="pv-section">
                        <h3><FaBuilding aria-hidden="true" /> Business</h3>
                        <dl>
                            <Row label="Business / company name" value={businessNameOf(provider)} copy />
                            <Row label="Business type" value={businessTypeLabel(provider)} />
                            <Row label="Business address" value={businessAddressOf(provider)} copy />
                            <Row label="District" value={districtOf(provider)} />
                            <Row label="PIN code" value={pinCodeOf(provider)} />
                            <Row
                                label="Alternate contact"
                                value={alternateContactOf(provider)}
                                href={alternateContactOf(provider) ? `tel:${alternateContactOf(provider)}` : ""}
                                copy
                            />
                        </dl>
                    </section>

                    <section className="pv-section">
                        <h3><FaFileAlt aria-hidden="true" /> Verification documents</h3>
                        <TowingDocumentsList documents={documents} />
                    </section>

                    <section className="pv-section">
                        <h3><FaIdBadge aria-hidden="true" /> Application</h3>
                        <dl>
                            <Row label="Provider ID" value={`#${id}`} />
                            <Row label="Role" value="TOWING_PROVIDER" />
                            <Row label="Status" value={pick(provider, "verificationStatus", "status") || "PENDING"} />
                            {joined && <Row label="Registered on" value={dateText(joined)} />}
                        </dl>
                    </section>
                </div>

                <footer className="pv-drawer-foot">
                    <button type="button" className="pv-btn pv-btn-reject" onClick={onReject} disabled={busy}>
                        <FaTimes aria-hidden="true" /> Reject
                    </button>
                    <button type="button" className="pv-btn pv-btn-approve" onClick={onApprove} disabled={busy}>
                        <FaCheck aria-hidden="true" /> {busy ? "Approving…" : "Approve"}
                    </button>
                </footer>
            </aside>
        </div>
    );
}

function SkeletonCards() {
    return (
        <div className="pv-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
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

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function ProviderVerification() {
    const [mechanics, setMechanics] = useState([]);
    const [towingProviders, setTowingProviders] = useState([]);
    const [activeTab, setActiveTab] = useState("MECHANICS");
    const [towingLoading, setTowingLoading] = useState(true);
    const [towingLoadError, setTowingLoadError] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [, tick] = useState(0);

    const [processingId, setProcessingId] = useState(null);
    const [towingProcessingId, setTowingProcessingId] = useState(null);
    const [towingRejectingId, setTowingRejectingId] = useState(null);
    const [towingReason, setTowingReason] = useState("");
    const [viewingTowingId, setViewingTowingId] = useState(null);
    const [confirmFor, setConfirmFor] = useState(null);
    const [confirmTowingFor, setConfirmTowingFor] = useState(null);
    const [viewingId, setViewingId] = useState(null);
    const [rejectingId, setRejectingId] = useState(null);
    const [reason, setReason] = useState("");

    const [search, setSearch] = useState("");
    const [experience, setExperience] = useState("ALL");
    const [sort, setSort] = useState("default");

    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);
    const busyRef = useRef(false);

    const notify = useCallback((message, tone = "ok") => {
        setToast({ message, tone });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    /* ---------- Load ---------- */

    const load = useCallback(async ({ silent = false } = {}) => {
        if (busyRef.current) return;
        if (!silent) setRefreshing(true);

        try {
            const response = await getPendingMechanics();
            const list = Array.isArray(response?.data) ? response.data : [];
            setMechanics(list);
            setLoadError("");
            setUpdatedAt(new Date());
        } catch (error) {
            console.error("Failed to load pending mechanics:", error);
            /* Keep what is on screen; only say so when the admin asked for it. */
            if (!silent) setLoadError(errorText(error, "Could not load verification requests."));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const loadTowingProviders = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setTowingLoading(true);
        try {
            const response = await api.get("/admin/towing-providers/pending");
            setTowingProviders(Array.isArray(response?.data) ? response.data : []);
            setTowingLoadError("");
            setUpdatedAt(new Date());
        } catch (error) {
            console.error("Failed to load pending towing providers:", error);
            if (!silent) setTowingLoadError(errorText(error, "Could not load towing-provider applications."));
        } finally {
            setTowingLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        loadTowingProviders();

        const poll = setInterval(() => {
            if (document.visibilityState === "visible") {
                load({ silent: true });
                loadTowingProviders({ silent: true });
            }
        }, POLL_MS);

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                load({ silent: true });
                loadTowingProviders({ silent: true });
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        const clock = setInterval(() => tick((n) => n + 1), 30000);

        return () => {
            clearInterval(poll);
            clearInterval(clock);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load, loadTowingProviders]);

    /* ---------- Actions ---------- */

    const removeFromList = (id) =>
        setMechanics((current) => current.filter((m) => idOf(m) !== id));

    const handleApprove = async () => {
        const provider = confirmFor;
        if (!provider) return;
        const id = idOf(provider);

        try {
            busyRef.current = true;
            setProcessingId(id);
            await approveMechanic(id);
            removeFromList(id);
            setConfirmFor(null);
            notify(`${provider.fullName} is approved and can now take requests.`);
        } catch (error) {
            console.error(error);
            setConfirmFor(null);
            notify(errorText(error, "Failed to approve provider."), "error");
        } finally {
            busyRef.current = false;
            setProcessingId(null);
        }
    };

    const openReject = (id) => {
        setRejectingId(id);
        setReason("");
    };

    const cancelReject = () => {
        setRejectingId(null);
        setReason("");
    };

    const handleReject = async (provider) => {
        const id = idOf(provider);
        const text = reason.trim();
        if (text.length < MIN_REASON) return;

        try {
            busyRef.current = true;
            setProcessingId(id);
            await rejectMechanic(id, text);
            removeFromList(id);
            cancelReject();
            notify(`${provider.fullName} was rejected.`);
        } catch (error) {
            console.error(error);
            notify(errorText(error, "Failed to reject provider."), "error");
        } finally {
            busyRef.current = false;
            setProcessingId(null);
        }
    };

    const removeTowingProvider = (id) =>
        setTowingProviders((current) => current.filter((provider) => towingIdOf(provider) !== id));

    const handleApproveTowingProvider = async () => {
        const provider = confirmTowingFor;
        if (!provider) return;
        const id = towingIdOf(provider);

        try {
            setTowingProcessingId(id);
            await api.put(`/admin/towing-providers/${id}/approve`);
            removeTowingProvider(id);
            setConfirmTowingFor(null);
            notify(`${provider.businessName || provider.fullName || "Towing provider"} approved. They can now sign in and add vehicles.`);
        } catch (error) {
            console.error(error);
            setConfirmTowingFor(null);
            notify(errorText(error, "Failed to approve towing provider."), "error");
        } finally {
            setTowingProcessingId(null);
        }
    };

    const handleRejectTowingProvider = async (provider) => {
        const id = towingIdOf(provider);
        const text = towingReason.trim();
        if (!id || text.length < MIN_REASON || towingProcessingId !== null) return;

        try {
            setTowingProcessingId(id);
            await api.put(`/admin/towing-providers/${id}/reject`, { reason: text });
            removeTowingProvider(id);
            setTowingRejectingId(null);
            setTowingReason("");
            notify(`${provider.businessName || provider.fullName || "Towing provider"} was rejected.`);
        } catch (error) {
            console.error(error);
            notify(errorText(error, "Failed to reject towing provider."), "error");
        } finally {
            setTowingProcessingId(null);
        }
    };

    /* ---------- Derived ---------- */

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();
        const range = EXPERIENCE.find((e) => e.key === experience) || EXPERIENCE[0];

        const list = mechanics.filter((m) => {
            const haystack = [
                m.fullName,
                m.workshopName,
                m.contactNumber,
                phoneOf(m),
                emailOf(m),
                addressOf(m),
                idOf(m)
            ]
                .filter((v) => v !== undefined && v !== null)
                .join(" ")
                .toLowerCase();

            return (!query || haystack.includes(query)) && range.test(years(m));
        });

        if (sort === "exp-desc") list.sort((a, b) => years(b) - years(a));
        if (sort === "exp-asc") list.sort((a, b) => years(a) - years(b));
        if (sort === "name") list.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));

        return list;
    }, [mechanics, search, experience, sort]);

    const summary = useMemo(() => {
        const total = mechanics.length;
        const incomplete = mechanics.filter((m) => missingFields(m).length > 0).length;
        const average = total ? mechanics.reduce((sum, m) => sum + years(m), 0) / total : 0;
        return { total, incomplete, average };
    }, [mechanics]);

    const hasFilters = search.trim() !== "" || experience !== "ALL" || sort !== "default";

    const clearFilters = () => {
        setSearch("");
        setExperience("ALL");
        setSort("default");
    };

    const viewing = viewingId === null ? null : mechanics.find((m) => idOf(m) === viewingId) || null;
    const closeDrawer = useCallback(() => setViewingId(null), []);

    const towingViewing =
        viewingTowingId === null ? null : towingProviders.find((p) => towingIdOf(p) === viewingTowingId) || null;
    const closeTowingDrawer = useCallback(() => setViewingTowingId(null), []);

    /* ---------- Render ---------- */

    return (
        <AdminLayout>
            <div className="pv-root">
                <header className="pv-header">
                    <div>
                        <p className="pv-eyebrow">Admin</p>
                        <h1 className="pv-title">Provider verification</h1>
                        <p className="pv-sub">
                            {activeTab === "MECHANICS" ? "Check each mechanic’s details before they join the RoadAid network." : "Review towing-provider business registrations before they can access RoadAid."}
                        </p>
                    </div>

                    <div className="pv-header-meta">
                        {updatedAt && <span className="pv-updated">Updated {timeText(updatedAt)}</span>}
                        <button
                            type="button"
                            className="pv-btn pv-btn-refresh"
                            onClick={() => load()}
                            disabled={refreshing}
                        >
                            <FaSyncAlt className={refreshing ? "pv-spin" : ""} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                </header>

                <div className="pv-chips" role="tablist" aria-label="Provider type" style={{ margin: "18px 0" }}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "MECHANICS"}
                        className="pv-chip"
                        onClick={() => setActiveTab("MECHANICS")}
                    >
                        Mechanics ({mechanics.length})
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "TOWING_PROVIDERS"}
                        className="pv-chip"
                        onClick={() => setActiveTab("TOWING_PROVIDERS")}
                    >
                        Towing Providers ({towingProviders.length})
                    </button>
                </div>

                {activeTab === "MECHANICS" && loadError && (
                    <div className="pv-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{loadError}</span>
                        <button type="button" onClick={() => load()}>Try again</button>
                    </div>
                )}

                {activeTab === "MECHANICS" ? (
                    <>
                        {!loading && (
                            <section className="pv-stats" aria-label="Summary">
                                <div className="pv-stat">
                                    <span className="pv-stat-value">{summary.total}</span>
                                    <span className="pv-stat-label">Waiting for review</span>
                                </div>
                                <div className="pv-stat">
                                    <span className="pv-stat-value">{summary.average.toFixed(1)}</span>
                                    <span className="pv-stat-label">Avg. years of experience</span>
                                </div>
                                <div className={`pv-stat ${summary.incomplete ? "pv-stat-warn" : ""}`}>
                                    <span className="pv-stat-value">{summary.incomplete}</span>
                                    <span className="pv-stat-label">With missing details</span>
                                </div>
                            </section>
                        )}

                        {!loading && mechanics.length > 0 && (
                            <section className="pv-filters" aria-label="Filters">
                                <label className="pv-search">
                                    <FaSearch aria-hidden="true" />
                                    <input
                                        type="search"
                                        placeholder="Search name, workshop, phone, email or ID"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        aria-label="Search providers"
                                    />
                                </label>

                                <div className="pv-chips" role="group" aria-label="Experience">
                                    {EXPERIENCE.map((option) => (
                                        <button
                                            type="button"
                                            key={option.key}
                                            className="pv-chip"
                                            aria-pressed={experience === option.key}
                                            onClick={() => setExperience(option.key)}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                <select
                                    className="pv-select"
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    aria-label="Sort providers"
                                >
                                    {SORTS.map((option) => (
                                        <option key={option.key} value={option.key}>{option.label}</option>
                                    ))}
                                </select>

                                {hasFilters && (
                                    <button type="button" className="pv-link-btn" onClick={clearFilters}>
                                        Clear
                                    </button>
                                )}
                            </section>
                        )}

                        {loading ? (
                            <SkeletonCards />
                        ) : mechanics.length === 0 ? (
                            <div className="pv-empty">
                                <span className="pv-empty-icon pv-empty-ok" aria-hidden="true"><FaCheckCircle /></span>
                                <h2>All caught up</h2>
                                <p>No providers are waiting for verification right now.</p>
                                <Link to={ROUTES.mechanics} className="pv-btn">
                                    View all mechanics <FaArrowRight aria-hidden="true" />
                                </Link>
                            </div>
                        ) : visible.length === 0 ? (
                            <div className="pv-empty">
                                <span className="pv-empty-icon" aria-hidden="true"><FaSearch /></span>
                                <h2>No matching providers</h2>
                                <p>Try a different search or experience range.</p>
                                <button type="button" className="pv-btn" onClick={clearFilters}>
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="pv-count" aria-live="polite">
                                    Showing <strong>{visible.length}</strong> of <strong>{mechanics.length}</strong> pending
                                </p>

                                <div className="pv-grid">
                                    {visible.map((provider) => {
                                        const id = idOf(provider);
                                        return (
                                            <ProviderCard
                                                key={id}
                                                provider={provider}
                                                busy={processingId === id}
                                                rejecting={rejectingId === id}
                                                reason={reason}
                                                onReason={setReason}
                                                onApprove={() => setConfirmFor(provider)}
                                                onOpenReject={() => openReject(id)}
                                                onCancelReject={cancelReject}
                                                onConfirmReject={() => handleReject(provider)}
                                                onView={() => setViewingId(id)}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {viewing && (
                            <DetailDrawer
                                provider={viewing}
                                busy={processingId === idOf(viewing)}
                                suspended={Boolean(confirmFor)}
                                onClose={closeDrawer}
                                onApprove={() => setConfirmFor(viewing)}
                                onReject={() => {
                                    openReject(idOf(viewing));
                                    closeDrawer();
                                }}
                            />
                        )}

                        {confirmFor && (
                            <ConfirmDialog
                                title={`Approve ${confirmFor.fullName}?`}
                                message="They will be able to sign in, go online and receive service requests straight away."
                                warning={
                                    missingFields(confirmFor).length > 0
                                        ? `Missing ${missingFields(confirmFor).join(" and ")}. Customers may not be able to reach them.`
                                        : null
                                }
                                busy={processingId === idOf(confirmFor)}
                                onCancel={() => setConfirmFor(null)}
                                onConfirm={handleApprove}
                            />
                        )}

                    </>
                ) : (
                    <>
                        {towingLoadError && (
                            <div className="pv-error" role="alert">
                                <FaExclamationTriangle aria-hidden="true" />
                                <span>{towingLoadError}</span>
                                <button type="button" onClick={() => loadTowingProviders()}>Try again</button>
                            </div>
                        )}

                        <section className="pv-stats" aria-label="Towing provider summary">
                            <div className="pv-stat">
                                <span className="pv-stat-value">{towingProviders.length}</span>
                                <span className="pv-stat-label">Waiting for review</span>
                            </div>
                        </section>

                        <div className="pv-header-meta" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
                            <button
                                type="button"
                                className="pv-btn pv-btn-refresh"
                                onClick={() => loadTowingProviders()}
                                disabled={towingLoading}
                            >
                                <FaSyncAlt className={towingLoading ? "pv-spin" : ""} aria-hidden="true" />
                                Refresh towing providers
                            </button>
                        </div>

                        {towingLoading ? (
                            <SkeletonCards />
                        ) : towingProviders.length === 0 ? (
                            <div className="pv-empty">
                                <span className="pv-empty-icon pv-empty-ok" aria-hidden="true"><FaCheckCircle /></span>
                                <h2>All caught up</h2>
                                <p>No towing-provider applications are waiting for verification.</p>
                            </div>
                        ) : (
                            <>
                                <p className="pv-count">{towingProviders.length} towing-provider application(s) pending review</p>
                                <div className="pv-grid">
                                    {towingProviders.map((provider) => {
                                        const id = towingIdOf(provider);
                                        return (
                                            <TowingProviderCard
                                                key={id}
                                                provider={provider}
                                                busy={towingProcessingId === id}
                                                rejecting={towingRejectingId === id}
                                                reason={towingReason}
                                                onReason={setTowingReason}
                                                onApprove={() => setConfirmTowingFor(provider)}
                                                onOpenReject={() => {
                                                    setTowingRejectingId(id);
                                                    setTowingReason("");
                                                }}
                                                onCancelReject={() => {
                                                    setTowingRejectingId(null);
                                                    setTowingReason("");
                                                }}
                                                onConfirmReject={() => handleRejectTowingProvider(provider)}
                                                onView={() => setViewingTowingId(id)}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {towingViewing && (
                            <TowingProviderDrawer
                                provider={towingViewing}
                                busy={towingProcessingId === towingIdOf(towingViewing)}
                                suspended={Boolean(confirmTowingFor)}
                                onClose={closeTowingDrawer}
                                onApprove={() => setConfirmTowingFor(towingViewing)}
                                onReject={() => {
                                    setTowingRejectingId(towingIdOf(towingViewing));
                                    setTowingReason("");
                                    closeTowingDrawer();
                                }}
                            />
                        )}

                        {confirmTowingFor && (
                            <ConfirmDialog
                                title={`Approve ${confirmTowingFor.businessName || confirmTowingFor.fullName || "this towing provider"}?`}
                                message="They will be able to sign in and add towing vehicles."
                                warning={
                                    missingTowingFields(confirmTowingFor).length > 0
                                        ? `Missing ${missingTowingFields(confirmTowingFor).join(" and ")}.`
                                        : null
                                }
                                busy={towingProcessingId === towingIdOf(confirmTowingFor)}
                                onCancel={() => setConfirmTowingFor(null)}
                                onConfirm={handleApproveTowingProvider}
                            />
                        )}
                    </>
                )}

                {toast && (
                    <div className={`pv-toast pv-toast-${toast.tone}`} role="status" aria-live="polite">
                        {toast.tone === "error" ? <FaExclamationTriangle aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                        <span>{toast.message}</span>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

export default ProviderVerification;