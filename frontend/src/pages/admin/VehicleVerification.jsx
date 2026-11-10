import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";
import {
    getPendingTowingVehicles,
    getAllTowingVehicles,
    approveTowingVehicle,
    rejectTowingVehicle,
    approveTowingDocument,
    rejectTowingDocument,
    getTowingDocumentUrl,
} from "../../services/adminService";

import {
    FaSyncAlt,
    FaSearch,
    FaCheck,
    FaTimes,
    FaExclamationTriangle,
    FaCheckCircle,
    FaTruck,
    FaUser,
    FaBuilding,
    FaEnvelope,
    FaPhoneAlt,
    FaWeightHanging,
    FaCalendarAlt,
    FaFileAlt,
    FaChevronRight,
    FaTruckLoading,
} from "react-icons/fa";

import "../../styles/ProviderVerification.css";
import "../../styles/VehicleVerification.css";
import { Detail, Row, SkeletonCards, ToastBanner, ConfirmDialog, ReasonDialog, timeText, errorText } from "../../components/admin/Verificationui.jsx";

/* ================================================================== */
/* NOTE                                                                 */
/* ================================================================== */
/*
 * This page previously used Tailwind utility classes with no stylesheet
 * imported at all, and wasn't wrapped in <AdminLayout> — meaning it very
 * likely rendered unstyled, without the admin nav/sidebar. Both are
 * fixed here, and the page now shares its look and its dialog/toast
 * components with ProviderVerification.jsx (via ./components/VerificationUI)
 * instead of native alert()/confirm()/prompt().
 *
 * All data calls are unchanged from the original file — nothing here
 * invents a new endpoint.
 */

const MIN_REASON = 10;

const STATUSES = [
    { key: "ALL", label: "All statuses" },
    { key: "PENDING", label: "Pending" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
];

const idOf = (v) => v.vehicleId;
const statusOf = (v) => v.verificationStatus || "PENDING";

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function StatusPill({ status }) {
    return (
        <span className="pv-pill" data-status={status}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
    );
}

function DocumentRow({ document, busy, onPreview, onApprove, onReject }) {
    return (
        <div className="pv-doc-row">
            <div className="pv-doc-row-head">
                <div>
                    <div className="pv-doc-row-name">{document.documentType}</div>
                    <div className="pv-doc-row-file">{document.fileName}</div>
                </div>
                <StatusPill status={document.verificationStatus || "PENDING"} />
            </div>

            {document.rejectionReason && (
                <p className="pv-doc-row-reason">Reason: {document.rejectionReason}</p>
            )}

            <div className="pv-doc-row-actions">
                <button
                    type="button"
                    className="pv-doc-link pv-doc-link-preview"
                    onClick={() => onPreview(document)}
                    disabled={busy}
                >
                    Preview document
                </button>

                {document.verificationStatus !== "APPROVED" && (
                    <button
                        type="button"
                        className="pv-doc-link pv-doc-link-approve"
                        onClick={() => onApprove(document)}
                        disabled={busy}
                    >
                        Approve
                    </button>
                )}

                {document.verificationStatus !== "REJECTED" && (
                    <button
                        type="button"
                        className="pv-doc-link pv-doc-link-reject"
                        onClick={() => onReject(document)}
                        disabled={busy}
                    >
                        Reject
                    </button>
                )}
            </div>
        </div>
    );
}

function VehicleCard({ vehicle, onView }) {
    return (
        <article className="pv-card">
            <header className="pv-card-head">
                <button
                    type="button"
                    className="pv-card-open"
                    onClick={onView}
                    aria-label={`View details for ${vehicle.registrationNumber}`}
                >
                    <span className="pv-avatar" aria-hidden="true">
                        <FaTruck />
                    </span>
                    <span className="pv-card-id">
                        <h3>{vehicle.registrationNumber}</h3>
                        <span>
                            {vehicle.brand} {vehicle.model} &middot; {vehicle.vehicleType}
                        </span>
                    </span>
                </button>
                <StatusPill status={statusOf(vehicle)} />
            </header>

            <div className="pv-details">
                <Detail icon={<FaBuilding />} label="Provider">
                    {vehicle.businessName || <em>Not provided</em>}
                </Detail>
                <Detail icon={<FaUser />} label="Owner">
                    {vehicle.providerName || <em>Not provided</em>}
                </Detail>
                <Detail icon={<FaCalendarAlt />} label="Year">
                    {vehicle.manufacturingYear || <em>Not provided</em>}
                </Detail>
                <Detail icon={<FaWeightHanging />} label="Towing capacity">
                    {vehicle.towingCapacity ? `${vehicle.towingCapacity} kg` : <em>Not provided</em>}
                </Detail>
            </div>

            <button type="button" className="pv-view" onClick={onView}>
                View full details <FaChevronRight aria-hidden="true" />
            </button>
        </article>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function VehicleVerification() {
    const [vehicles, setVehicles] = useState([]);
    const [activeTab, setActiveTab] = useState("PENDING");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    const [selectedId, setSelectedId] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const [confirmTarget, setConfirmTarget] = useState(null); // { kind: "vehicle"|"document", id, label }
    const [reasonTarget, setReasonTarget] = useState(null); // { kind: "vehicle"|"document", id, label }
    const [reason, setReason] = useState("");

    const [previewUrl, setPreviewUrl] = useState("");
    const [previewType, setPreviewType] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);

    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    const notify = useCallback((message, tone = "ok") => {
        setToast({
            message,
            tone,
            icon: tone === "error" ? <FaExclamationTriangle aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />,
        });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => () => clearTimeout(toastTimer.current), []);

    /* ---------- Load ---------- */

    const loadVehicles = useCallback(
        async ({ silent = false } = {}) => {
            try {
                if (!silent) setLoading(true);
                setLoadError("");

                const response =
                    activeTab === "PENDING" ? await getPendingTowingVehicles() : await getAllTowingVehicles();

                setVehicles(response.data || []);
                setUpdatedAt(new Date());
            } catch (err) {
                console.error("Failed to load towing vehicles:", err);
                setLoadError(errorText(err, "Unable to load towing vehicles. Please try again."));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [activeTab]
    );

    useEffect(() => {
        loadVehicles();
    }, [loadVehicles]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadVehicles({ silent: true });
    };

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    /* ---------- Derived ---------- */

    const visibleVehicles = useMemo(() => {
        const query = search.trim().toLowerCase();

        return vehicles.filter((v) => {
            const haystack = [
                v.registrationNumber,
                v.brand,
                v.model,
                v.vehicleType,
                v.businessName,
                v.providerName,
                v.vehicleId,
            ]
                .filter((val) => val !== undefined && val !== null)
                .join(" ")
                .toLowerCase();

            const matchesQuery = !query || haystack.includes(query);
            const matchesStatus =
                activeTab !== "ALL" || statusFilter === "ALL" || statusOf(v) === statusFilter;

            return matchesQuery && matchesStatus;
        });
    }, [vehicles, search, statusFilter, activeTab]);

    const selectedVehicle = vehicles.find((v) => idOf(v) === selectedId) || null;

    const hasFilters = search.trim() !== "" || (activeTab === "ALL" && statusFilter !== "ALL");

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("ALL");
    };

    /* ---------- Actions: approve/reject ---------- */

    const openApproveVehicle = (vehicle) =>
        setConfirmTarget({ kind: "vehicle", id: idOf(vehicle), label: vehicle.registrationNumber });

    const openRejectVehicle = (vehicle) => {
        setReasonTarget({ kind: "vehicle", id: idOf(vehicle), label: vehicle.registrationNumber });
        setReason("");
    };

    const openApproveDocument = (document) =>
        setConfirmTarget({ kind: "document", id: document.documentId, label: document.documentType });

    const openRejectDocument = (document) => {
        setReasonTarget({ kind: "document", id: document.documentId, label: document.documentType });
        setReason("");
    };

    const confirmApprove = async () => {
        if (!confirmTarget) return;
        const { kind, id, label } = confirmTarget;

        try {
            setProcessingId(id);
            if (kind === "vehicle") {
                await approveTowingVehicle(id);
                notify(`Vehicle ${label} approved.`);
                setSelectedId(null);
            } else {
                await approveTowingDocument(id);
                notify(`${label} approved.`);
            }
            setConfirmTarget(null);
            loadVehicles({ silent: true });
        } catch (err) {
            notify(errorText(err, kind === "vehicle" ? "Vehicle approval failed." : "Document approval failed."), "error");
        } finally {
            setProcessingId(null);
        }
    };

    const confirmReject = async () => {
        if (!reasonTarget) return;
        const { kind, id, label } = reasonTarget;
        const text = reason.trim();
        if (text.length < MIN_REASON) return;

        try {
            setProcessingId(id);
            if (kind === "vehicle") {
                await rejectTowingVehicle(id, text);
                notify(`Vehicle ${label} rejected.`);
                setSelectedId(null);
            } else {
                await rejectTowingDocument(id, text);
                notify(`${label} rejected.`);
            }
            setReasonTarget(null);
            setReason("");
            loadVehicles({ silent: true });
        } catch (err) {
            notify(errorText(err, kind === "vehicle" ? "Vehicle rejection failed." : "Document rejection failed."), "error");
        } finally {
            setProcessingId(null);
        }
    };

    /* ---------- Document preview ---------- */

    const handleDocumentPreview = async (document) => {
        try {
            setPreviewLoading(true);
            const response = await api.get(getTowingDocumentUrl(document.documentId), { responseType: "blob" });

            if (previewUrl) URL.revokeObjectURL(previewUrl);

            const url = URL.createObjectURL(response.data);
            setPreviewUrl(url);
            setPreviewType(response.data.type);
        } catch (err) {
            console.error("Document preview failed:", err);
            notify("Unable to preview this document.", "error");
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setPreviewUrl("");
        setPreviewType("");
    };

    /* ---------- Render ---------- */

    return (
        <AdminLayout>
            <div className="pv-root">
                <header className="pv-header">
                    <div>
                        <p className="pv-eyebrow">Admin</p>
                        <h1 className="pv-title">Vehicle verification</h1>
                        <p className="pv-sub">Review towing vehicle details and verify uploaded documents.</p>
                    </div>

                    <div className="pv-header-meta">
                        {updatedAt && <span className="pv-updated">Updated {timeText(updatedAt)}</span>}
                        <button type="button" className="pv-btn pv-btn-refresh" onClick={handleRefresh} disabled={refreshing}>
                            <FaSyncAlt className={refreshing ? "pv-spin" : ""} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                </header>

                <div className="pv-chips" role="tablist" aria-label="Vehicle list" style={{ margin: "18px 0" }}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "PENDING"}
                        className="pv-chip"
                        onClick={() => setActiveTab("PENDING")}
                    >
                        Pending Vehicles
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "ALL"}
                        className="pv-chip"
                        onClick={() => setActiveTab("ALL")}
                    >
                        All Vehicles
                    </button>
                </div>

                {loadError && (
                    <div className="pv-error" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <span>{loadError}</span>
                        <button type="button" onClick={() => loadVehicles()}>Try again</button>
                    </div>
                )}

                {!loading && vehicles.length > 0 && (
                    <section className="pv-filters" aria-label="Filters">
                        <label className="pv-search">
                            <FaSearch aria-hidden="true" />
                            <input
                                type="search"
                                placeholder="Search registration, brand, model or provider"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search vehicles"
                            />
                        </label>

                        {activeTab === "ALL" && (
                            <div className="pv-chips" role="group" aria-label="Status">
                                {STATUSES.map((option) => (
                                    <button
                                        type="button"
                                        key={option.key}
                                        className="pv-chip"
                                        aria-pressed={statusFilter === option.key}
                                        onClick={() => setStatusFilter(option.key)}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {hasFilters && (
                            <button type="button" className="pv-link-btn" onClick={clearFilters}>
                                Clear
                            </button>
                        )}
                    </section>
                )}

                {loading ? (
                    <SkeletonCards />
                ) : vehicles.length === 0 ? (
                    <div className="pv-empty">
                        <span className="pv-empty-icon pv-empty-ok" aria-hidden="true"><FaCheckCircle /></span>
                        <h2>All caught up</h2>
                        <p>
                            {activeTab === "PENDING"
                                ? "No towing vehicles are waiting for verification right now."
                                : "No towing vehicles found."}
                        </p>
                    </div>
                ) : visibleVehicles.length === 0 ? (
                    <div className="pv-empty">
                        <span className="pv-empty-icon" aria-hidden="true"><FaSearch /></span>
                        <h2>No matching vehicles</h2>
                        <p>Try a different search or status.</p>
                        <button type="button" className="pv-btn" onClick={clearFilters}>
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="pv-count" aria-live="polite">
                            Showing <strong>{visibleVehicles.length}</strong> of <strong>{vehicles.length}</strong>{" "}
                            {activeTab === "PENDING" ? "pending" : "vehicles"}
                        </p>

                        <div className="pv-grid">
                            {visibleVehicles.map((vehicle) => (
                                <VehicleCard
                                    key={idOf(vehicle)}
                                    vehicle={vehicle}
                                    onView={() => setSelectedId(idOf(vehicle))}
                                />
                            ))}
                        </div>
                    </>
                )}

                {selectedVehicle && (
                    <div className="pv-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && setSelectedId(null)}>
                        <aside className="pv-drawer" role="dialog" aria-modal="true" aria-labelledby="pv-vehicle-drawer-title">
                            <header className="pv-drawer-head">
                                <span className="pv-avatar pv-avatar-lg" aria-hidden="true"><FaTruckLoading /></span>
                                <div className="pv-card-id">
                                    <h2 id="pv-vehicle-drawer-title">{selectedVehicle.registrationNumber}</h2>
                                    <span>
                                        {selectedVehicle.brand} {selectedVehicle.model} &middot; {selectedVehicle.vehicleType}
                                    </span>
                                </div>
                                <button type="button" className="pv-close" onClick={() => setSelectedId(null)} aria-label="Close details">
                                    <FaTimes aria-hidden="true" />
                                </button>
                            </header>

                            <div className="pv-drawer-body">
                                <section className="pv-section">
                                    <h3><FaBuilding aria-hidden="true" /> Provider information</h3>
                                    <dl>
                                        <Row label="Business" value={selectedVehicle.businessName} copy />
                                        <Row label="Provider" value={selectedVehicle.providerName} />
                                        <Row
                                            label="Email"
                                            value={selectedVehicle.providerEmail}
                                            href={selectedVehicle.providerEmail ? `mailto:${selectedVehicle.providerEmail}` : ""}
                                            copy
                                        />
                                        <Row
                                            label="Phone"
                                            value={selectedVehicle.providerPhone}
                                            href={selectedVehicle.providerPhone ? `tel:${selectedVehicle.providerPhone}` : ""}
                                            copy
                                        />
                                    </dl>
                                </section>

                                <section className="pv-section">
                                    <h3><FaTruck aria-hidden="true" /> Vehicle information</h3>
                                    <dl>
                                        <Row label="Registration" value={selectedVehicle.registrationNumber} copy />
                                        <Row label="Type" value={selectedVehicle.vehicleType} />
                                        <Row label="Brand" value={selectedVehicle.brand} />
                                        <Row label="Model" value={selectedVehicle.model} />
                                        <Row label="Year" value={selectedVehicle.manufacturingYear} />
                                        <Row
                                            label="Towing capacity"
                                            value={selectedVehicle.towingCapacity ? `${selectedVehicle.towingCapacity} kg` : ""}
                                        />
                                    </dl>
                                    <p style={{ marginTop: 10 }}>
                                        <StatusPill status={statusOf(selectedVehicle)} />
                                    </p>
                                    {selectedVehicle.rejectionReason && (
                                        <p className="pv-doc-row-reason" style={{ marginTop: 10 }}>
                                            <strong>Rejection reason:</strong> {selectedVehicle.rejectionReason}
                                        </p>
                                    )}
                                </section>

                                <section className="pv-section">
                                    <h3><FaFileAlt aria-hidden="true" /> Uploaded documents</h3>
                                    {!selectedVehicle.documents?.length ? (
                                        <p className="pv-detail-value">No documents uploaded.</p>
                                    ) : (
                                        <div className="pv-doc-list">
                                            {selectedVehicle.documents.map((document) => (
                                                <DocumentRow
                                                    key={document.documentId}
                                                    document={document}
                                                    busy={processingId === document.documentId || previewLoading}
                                                    onPreview={handleDocumentPreview}
                                                    onApprove={openApproveDocument}
                                                    onReject={openRejectDocument}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>

                            {statusOf(selectedVehicle) === "PENDING" && (
                                <footer className="pv-drawer-foot">
                                    <button
                                        type="button"
                                        className="pv-btn pv-btn-reject"
                                        onClick={() => openRejectVehicle(selectedVehicle)}
                                        disabled={processingId === idOf(selectedVehicle)}
                                    >
                                        <FaTimes aria-hidden="true" /> Reject Vehicle
                                    </button>
                                    <button
                                        type="button"
                                        className="pv-btn pv-btn-approve"
                                        onClick={() => openApproveVehicle(selectedVehicle)}
                                        disabled={processingId === idOf(selectedVehicle)}
                                    >
                                        <FaCheck aria-hidden="true" /> Approve Vehicle
                                    </button>
                                </footer>
                            )}
                        </aside>
                    </div>
                )}

                {confirmTarget && (
                    <ConfirmDialog
                        icon={<FaCheckCircle />}
                        title={confirmTarget.kind === "vehicle" ? `Approve vehicle ${confirmTarget.label}?` : `Approve ${confirmTarget.label}?`}
                        message={
                            confirmTarget.kind === "vehicle"
                                ? "This vehicle will be marked verified and available for dispatch."
                                : "This document will be marked as approved."
                        }
                        tone="approve"
                        busy={processingId === confirmTarget.id}
                        onCancel={() => setConfirmTarget(null)}
                        onConfirm={confirmApprove}
                    />
                )}

                {reasonTarget && (
                    <ReasonDialog
                        title={reasonTarget.kind === "vehicle" ? `Reject vehicle ${reasonTarget.label}?` : `Reject ${reasonTarget.label}?`}
                        label="Rejection reason"
                        placeholder="Write the reason the provider will see…"
                        value={reason}
                        onChange={setReason}
                        minLength={MIN_REASON}
                        busy={processingId === reasonTarget.id}
                        onCancel={() => {
                            setReasonTarget(null);
                            setReason("");
                        }}
                        onConfirm={confirmReject}
                    />
                )}

                {previewUrl && (
                    <div className="pv-preview-overlay" onMouseDown={(e) => e.target === e.currentTarget && closePreview()}>
                        <div className="pv-preview" role="dialog" aria-modal="true" aria-label="Document preview">
                            <div className="pv-preview-head">
                                <h3>Document preview</h3>
                                <button type="button" className="pv-close" onClick={closePreview} aria-label="Close preview">
                                    <FaTimes aria-hidden="true" />
                                </button>
                            </div>

                            <div className="pv-preview-body">
                                {previewType.startsWith("image/") ? (
                                    <img src={previewUrl} alt="Verification document" />
                                ) : previewType === "application/pdf" ? (
                                    <iframe src={previewUrl} title="Verification document" />
                                ) : (
                                    <div className="pv-preview-unsupported">
                                        Preview is not supported for this file type.
                                        <a href={previewUrl} download>
                                            Download document
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <ToastBanner toast={toast} />
            </div>
        </AdminLayout>
    );
}

export default VehicleVerification;