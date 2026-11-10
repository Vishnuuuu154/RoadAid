import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import {
    getComplaints,
    getReviews,
    updateComplaintStatus
} from "../../services/adminService";
import "../../styles/admincomplaint.css";

/* =========================================================
   CONSTANTS & HELPERS
   ========================================================= */

const RATINGS = [5, 4, 3, 2, 1];

const COMPLAINT_STATUSES = [
    { value: "OPEN", label: "Open", tone: "danger" },
    { value: "IN_PROGRESS", label: "In progress", tone: "warning" },
    { value: "RESOLVED", label: "Resolved", tone: "success" }
];

const REVIEW_SORTS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "highest", label: "Highest rating" },
    { value: "lowest", label: "Lowest rating" }
];

const COMPLAINT_SORTS = REVIEW_SORTS.slice(0, 2);

const time = (date) => (date ? new Date(date).getTime() || 0 : 0);

const SORTERS = {
    newest: (a, b) => time(b.createdAt) - time(a.createdAt),
    oldest: (a, b) => time(a.createdAt) - time(b.createdAt),
    highest: (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0),
    lowest: (a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0)
};

const formatDate = (date) =>
    date
        ? new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        : "—";

const has = (value, query) =>
    String(value ?? "").toLowerCase().includes(query);

const formatStatus = (status) =>
    status
        ? status
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/^\w/, (c) => c.toUpperCase())
        : "Unknown";


/* =========================================================
   SMALL UI PIECES
   ========================================================= */

const Icon = ({ name }) => {
    const paths = {
        search: "M11 4a7 7 0 105.2 11.7l3.5 3.5 1.4-1.4-3.5-3.5A7 7 0 0011 4z",
        refresh: "M17.7 6.3A8 8 0 104 12h2a6 6 0 111.8 4.2L10 14H4v6l2.4-2.4A8 8 0 1017.7 6.3z"
    };
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
};

function StarRating({ value }) {
    const rating = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));

    return (
        <span className="cx-stars" role="img" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} viewBox="0 0 20 20" className={i <= rating ? "on" : ""} aria-hidden="true">
                    <path d="M10 1.6l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L1.4 7.9l6-.8z" />
                </svg>
            ))}
        </span>
    );
}

function StatusPill({ status }) {
    const match = COMPLAINT_STATUSES.find((s) => s.value === status);

    return (
        <span className={`cx-pill cx-pill--${match?.tone || "neutral"}`}>
            {match?.label || formatStatus(status)}
        </span>
    );
}

function RequestLink({ id }) {
    if (!id) return <span className="cx-muted">—</span>;

    return (
        <Link className="cx-req" to={`/admin/requests/${id}`}>
            #{id}
        </Link>
    );
}

function ExpandableText({ text, fallback }) {
    const [open, setOpen] = useState(false);

    if (!text) return <span className="cx-muted">{fallback}</span>;

    const isLong = text.length > 90;

    return (
        <div>
            <p className={`cx-text ${isLong && !open ? "is-clamped" : ""}`}>{text}</p>
            {isLong && (
                <button
                    type="button"
                    className="cx-more"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? "Show less" : "Show more"}
                </button>
            )}
        </div>
    );
}

/* ---------- Detail drawer ---------- */

function Drawer({ title, badge, onClose, children }) {
    const closeRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const overflow = document.body.style.overflow;
        const onKey = (e) => e.key === "Escape" && onCloseRef.current();

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKey);
        closeRef.current?.focus();

        return () => {
            document.body.style.overflow = overflow;
            document.removeEventListener("keydown", onKey);
            previouslyFocused?.focus?.();
        };
    }, []);

    return (
        <div className="cx-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <aside className="cx-drawer" role="dialog" aria-modal="true" aria-labelledby="cx-drawer-title">
                <div className="cx-drawer__head">
                    <div>
                        <h2 id="cx-drawer-title">{title}</h2>
                        {badge}
                    </div>
                    <button ref={closeRef} type="button" className="cx-close" aria-label="Close details" onClick={onClose}>
                        ✕
                    </button>
                </div>
                <div className="cx-drawer__body">{children}</div>
            </aside>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="cx-field">
            <dt>{label}</dt>
            <dd>{children || "—"}</dd>
        </div>
    );
}

function ReviewDetail({ review }) {
    return (
        <>
            <div className="cx-rating">
                <StarRating value={review.rating} />
                <strong>{review.rating ?? 0}/5</strong>
            </div>

            <div>
                <div className="cx-label">Comment</div>
                <div className="cx-quote">
                    {review.comment || <span className="cx-muted">No comment left.</span>}
                </div>
            </div>

            <dl className="cx-fields">
                <Field label="Customer">{review.customer?.fullName}</Field>
                <Field label="Mechanic">{review.mechanic?.user?.fullName}</Field>
                <Field label="Request">
                    {review.serviceRequest?.id && <RequestLink id={review.serviceRequest.id} />}
                </Field>
                <Field label="Submitted">{formatDate(review.createdAt)}</Field>
            </dl>
        </>
    );
}

function ComplaintDetail({ complaint, onStatusChange }) {
    const [draft, setDraft] = useState(complaint.status);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => setDraft(complaint.status), [complaint.status]);

    const dirty = draft !== complaint.status;

    const save = async () => {
        setSaving(true);
        setMessage(null);

        try {
            await onStatusChange(complaint.complaintId, draft);
            setMessage({ error: false, text: `Status changed to ${formatStatus(draft).toLowerCase()}.` });
        } catch (error) {
            console.error("Failed to update complaint status:", error);
            setMessage({ error: true, text: "We couldn't update the status. Try again." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div>
                <div className="cx-label">Reason</div>
                <div className="cx-quote">
                    {complaint.reason || <span className="cx-muted">No reason given.</span>}
                </div>
            </div>

            <dl className="cx-fields">
                <Field label="Reported by">{complaint.reportedBy}</Field>
                <Field label="Reported against">{complaint.reportedAgainst}</Field>
                <Field label="Request">
                    {complaint.serviceRequestId && <RequestLink id={complaint.serviceRequestId} />}
                </Field>
                <Field label="Reported on">{formatDate(complaint.createdAt)}</Field>
            </dl>

            <div>
                <div className="cx-label" id="cx-status-label">Update status</div>
                <div className="cx-chips" role="group" aria-labelledby="cx-status-label">
                    {COMPLAINT_STATUSES.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            className="cx-chip"
                            aria-pressed={draft === s.value}
                            onClick={() => {
                                setDraft(s.value);
                                setMessage(null);
                            }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    className="cx-btn cx-btn--dark cx-save"
                    disabled={!dirty || saving}
                    onClick={save}
                >
                    {saving ? "Saving…" : "Save status"}
                </button>

                <p className={`cx-msg ${message?.error ? "is-error" : ""}`} role="status" aria-live="polite">
                    {message?.text}
                </p>
            </div>
        </>
    );
}

function TableSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading">
            {Array.from({ length: 6 }, (_, i) => (
                <div className="cx-skel-row" key={i}>
                    {Array.from({ length: 7 }, (_, j) => (
                        <div className="cx-skel" key={j} />
                    ))}
                </div>
            ))}
        </div>
    );
}

function EmptyState({ title, message, onReset }) {
    return (
        <div className="cx-empty">
            <h3>{title}</h3>
            <p>{message}</p>
            {onReset && (
                <button type="button" className="cx-btn cx-btn--dark" onClick={onReset}>
                    Clear filters
                </button>
            )}
        </div>
    );
}


/* =========================================================
   PANEL — search, sort, filter chips, result count
   ========================================================= */

function Panel({
                   title, hint, noun, total, shown,
                   search, onSearch, placeholder,
                   sort, onSort, sortOptions,
                   chips, chipValue, onChip, chipLabel,
                   isFiltered, onReset, detail, children
               }) {
    return (
        <div className="cx-panel">
            <div className="cx-panel__top">
                <div>
                    <h2>{title}</h2>
                    <p className="cx-panel__hint">{hint}</p>
                </div>

                <div className="cx-tools">
                    <label className="cx-search">
                        <span className="cx-sr">Search {noun}</span>
                        <Icon name="search" />
                        <input
                            type="search"
                            className="cx-input"
                            placeholder={placeholder}
                            value={search}
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    </label>

                    <label className="cx-select-wrap">
                        <span className="cx-sr">Sort {noun}</span>
                        <select className="cx-select" value={sort} onChange={(e) => onSort(e.target.value)}>
                            {sortOptions.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="cx-chips" role="group" aria-label={chipLabel}>
                    {chips.map((chip) => (
                        <button
                            key={chip.value}
                            type="button"
                            className="cx-chip"
                            aria-pressed={chipValue === chip.value}
                            onClick={() => onChip(chip.value)}
                        >
                            {chip.label} <span>{chip.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="cx-meta">
                <span role="status" aria-live="polite">
                    Showing <strong>{shown}</strong> of <strong>{total}</strong> {noun}
                </span>
                {isFiltered && (
                    <button type="button" className="cx-link-btn" onClick={onReset}>
                        Clear filters
                    </button>
                )}
            </div>

            {children}
            {detail}
        </div>
    );
}


/* =========================================================
   REVIEWS
   ========================================================= */

function ReviewsSection({ reviews, loading }) {
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState("");
    const [rating, setRating] = useState("ALL");
    const [sort, setSort] = useState("newest");

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return reviews
            .filter((r) => {
                const matchesRating = rating === "ALL" || String(r.rating) === rating;
                const matchesSearch =
                    !q ||
                    [r.customer?.fullName, r.mechanic?.user?.fullName, r.serviceRequest?.id, r.comment].some((v) =>
                        has(v, q)
                    );
                return matchesRating && matchesSearch;
            })
            .sort(SORTERS[sort]);
    }, [reviews, search, rating, sort]);

    const chips = [
        { value: "ALL", label: "All", count: reviews.length },
        ...RATINGS.map((n) => ({
            value: String(n),
            label: `${n} ${n === 1 ? "star" : "stars"}`,
            count: reviews.filter((r) => String(r.rating) === String(n)).length
        }))
    ];

    const selected = reviews.find((r) => r.id === selectedId);
    const closeDetail = useCallback(() => setSelectedId(null), []);

    const isFiltered = search.trim() !== "" || rating !== "ALL";
    const reset = () => {
        setSearch("");
        setRating("ALL");
    };

    return (
        <Panel
            title="Customer reviews"
            hint="Feedback left after a completed service."
            noun="reviews"
            total={reviews.length}
            shown={rows.length}
            search={search}
            onSearch={setSearch}
            placeholder="Search by customer, mechanic, request or comment"
            sort={sort}
            onSort={setSort}
            sortOptions={REVIEW_SORTS}
            chips={chips}
            chipValue={rating}
            onChip={setRating}
            chipLabel="Filter by rating"
            isFiltered={isFiltered}
            onReset={reset}
            detail={
                selected && (
                    <Drawer title={`Review #${selected.id}`} onClose={closeDetail}>
                        <ReviewDetail review={selected} />
                    </Drawer>
                )
            }
        >
            {loading ? (
                <TableSkeleton />
            ) : rows.length === 0 ? (
                <EmptyState
                    title={reviews.length === 0 ? "No reviews yet" : "No reviews match your filters"}
                    message={
                        reviews.length === 0
                            ? "Reviews appear here once customers rate a completed service."
                            : "Try a different search or rating."
                    }
                    onReset={reviews.length ? reset : undefined}
                />
            ) : (
                <div className="cx-scroll">
                    <table className="cx-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Mechanic</th>
                            <th>Request</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Date</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((r) => (
                            <tr key={r.id} className="is-clickable" onClick={(e) => !e.target.closest("a,button") && setSelectedId(r.id)}>
                                <td data-label="ID">
                                    <button type="button" className="cx-id-btn" aria-label={`View review ${r.id}`} onClick={() => setSelectedId(r.id)}>#{r.id}</button>
                                </td>
                                <td data-label="Customer">{r.customer?.fullName || "—"}</td>
                                <td data-label="Mechanic">{r.mechanic?.user?.fullName || "—"}</td>
                                <td data-label="Request"><RequestLink id={r.serviceRequest?.id} /></td>
                                <td data-label="Rating">
                                    <div className="cx-rating">
                                        <StarRating value={r.rating} />
                                        <span className="cx-muted">{r.rating ?? 0}/5</span>
                                    </div>
                                </td>
                                <td data-label="Comment"><ExpandableText text={r.comment} fallback="No comment" /></td>
                                <td data-label="Date" className="cx-date">{formatDate(r.createdAt)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
}


/* =========================================================
   COMPLAINTS
   ========================================================= */

function ComplaintsSection({ complaints, loading, onStatusChange }) {
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("ALL");
    const [sort, setSort] = useState("newest");

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return complaints
            .filter((c) => {
                const matchesStatus = status === "ALL" || c.status === status;
                const matchesSearch =
                    !q ||
                    [c.serviceRequestId, c.reportedBy, c.reportedAgainst, c.reason].some((v) => has(v, q));
                return matchesStatus && matchesSearch;
            })
            .sort(SORTERS[sort]);
    }, [complaints, search, status, sort]);

    const chips = [
        { value: "ALL", label: "All", count: complaints.length },
        ...COMPLAINT_STATUSES.map((s) => ({
            value: s.value,
            label: s.label,
            count: complaints.filter((c) => c.status === s.value).length
        }))
    ];

    const selected = complaints.find((c) => c.complaintId === selectedId);
    const closeDetail = useCallback(() => setSelectedId(null), []);

    const isFiltered = search.trim() !== "" || status !== "ALL";
    const reset = () => {
        setSearch("");
        setStatus("ALL");
    };

    return (
        <Panel
            title="Complaints"
            hint="Issues reported on service requests."
            noun="complaints"
            total={complaints.length}
            shown={rows.length}
            search={search}
            onSearch={setSearch}
            placeholder="Search by request, person or reason"
            sort={sort}
            onSort={setSort}
            sortOptions={COMPLAINT_SORTS}
            chips={chips}
            chipValue={status}
            onChip={setStatus}
            chipLabel="Filter by status"
            isFiltered={isFiltered}
            onReset={reset}
            detail={
                selected && (
                    <Drawer
                        title={`Complaint #${selected.complaintId}`}
                        badge={<StatusPill status={selected.status} />}
                        onClose={closeDetail}
                    >
                        <ComplaintDetail complaint={selected} onStatusChange={onStatusChange} />
                    </Drawer>
                )
            }
        >
            {loading ? (
                <TableSkeleton />
            ) : rows.length === 0 ? (
                <EmptyState
                    title={complaints.length === 0 ? "No complaints" : "No complaints match your filters"}
                    message={
                        complaints.length === 0
                            ? "Reported issues will show up here."
                            : "Try a different search or status."
                    }
                    onReset={complaints.length ? reset : undefined}
                />
            ) : (
                <div className="cx-scroll">
                    <table className="cx-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Request</th>
                            <th>Reported by</th>
                            <th>Reported against</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((c) => (
                            <tr key={c.complaintId} className="is-clickable" onClick={(e) => !e.target.closest("a,button") && setSelectedId(c.complaintId)}>
                                <td data-label="ID">
                                    <button type="button" className="cx-id-btn" aria-label={`View complaint ${c.complaintId}`} onClick={() => setSelectedId(c.complaintId)}>#{c.complaintId}</button>
                                </td>
                                <td data-label="Request"><RequestLink id={c.serviceRequestId} /></td>
                                <td data-label="Reported by">{c.reportedBy || "—"}</td>
                                <td data-label="Against">{c.reportedAgainst || "—"}</td>
                                <td data-label="Reason"><ExpandableText text={c.reason} fallback="—" /></td>
                                <td data-label="Status"><StatusPill status={c.status} /></td>
                                <td data-label="Date" className="cx-date">{formatDate(c.createdAt)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
}


/* =========================================================
   PAGE
   ========================================================= */

const TABS = [
    { id: "reviews", label: "Reviews" },
    { id: "complaints", label: "Complaints" }
];

function Complaints() {
    const [activeTab, setActiveTab] = useState("reviews");
    const [reviews, setReviews] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setErrors([]);

        // allSettled: one failing request no longer hides the other list
        const [reviewsResult, complaintsResult] = await Promise.allSettled([
            getReviews(),
            getComplaints()
        ]);

        const failed = [];

        if (reviewsResult.status === "fulfilled") {
            setReviews(reviewsResult.value.data || []);
        } else {
            console.error("Failed to load reviews:", reviewsResult.reason);
            failed.push("reviews");
        }

        if (complaintsResult.status === "fulfilled") {
            setComplaints(complaintsResult.value.data || []);
        } else {
            console.error("Failed to load complaints:", complaintsResult.reason);
            failed.push("complaints");
        }

        setErrors(failed);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Saves to the server first, then updates the list so counts and pills stay in sync
    const changeComplaintStatus = useCallback(async (complaintId, status) => {
        await updateComplaintStatus(complaintId, status);
        setComplaints((list) =>
            list.map((c) => (c.complaintId === complaintId ? { ...c, status } : c))
        );
    }, []);

    const stats = useMemo(() => {
        const rated = reviews.map((r) => Number(r.rating)).filter((n) => n > 0);
        const count = (status) => complaints.filter((c) => c.status === status).length;

        return {
            average: rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : "—",
            open: count("OPEN"),
            inProgress: count("IN_PROGRESS"),
            resolved: count("RESOLVED")
        };
    }, [reviews, complaints]);

    // Arrow keys move between tabs (WAI-ARIA tabs pattern)
    const handleTabKeys = (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const next = TABS.find((t) => t.id !== activeTab);
        setActiveTab(next.id);
        document.getElementById(`tab-${next.id}`)?.focus();
    };

    const counts = { reviews: reviews.length, complaints: complaints.length };
    const dash = (value) => (loading ? "–" : value);

    return (
        <AdminLayout>
            <div className="cx">
                <header className="cx-head">
                    <div>
                        <h1 className="cx-title">Reviews & complaints</h1>
                        <p className="cx-sub">See what customers say and follow up on reported issues.</p>
                    </div>

                    <button type="button" className="cx-btn" onClick={loadData} disabled={loading}>
                        <span className={loading ? "cx-spin" : undefined} style={{ display: "inline-flex" }}>
                            <Icon name="refresh" />
                        </span>
                        {loading ? "Refreshing" : "Refresh"}
                    </button>
                </header>

                {errors.length > 0 && (
                    <div className="cx-alert" role="alert">
                        <span>We couldn't load {errors.join(" or ")}. Check your connection and try again.</span>
                        <button type="button" className="cx-btn" onClick={loadData}>Try again</button>
                    </div>
                )}

                <dl className="cx-stats">
                    <div className="cx-stat">
                        <dt>Average rating</dt>
                        <dd>{dash(stats.average)} {stats.average !== "—" && !loading && <small>/ 5</small>}</dd>
                    </div>
                    <div className="cx-stat">
                        <dt>Open complaints</dt>
                        <dd>{dash(stats.open)}</dd>
                    </div>
                    <div className="cx-stat">
                        <dt>In progress</dt>
                        <dd>{dash(stats.inProgress)}</dd>
                    </div>
                    <div className="cx-stat">
                        <dt>Resolved</dt>
                        <dd>{dash(stats.resolved)}</dd>
                    </div>
                </dl>

                <div className="cx-tabs" role="tablist" aria-label="Reviews or complaints" onKeyDown={handleTabKeys}>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            id={`tab-${tab.id}`}
                            type="button"
                            role="tab"
                            className="cx-tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`panel-${tab.id}`}
                            tabIndex={activeTab === tab.id ? 0 : -1}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                            <span className="cx-count">{counts[tab.id]}</span>
                        </button>
                    ))}
                </div>

                {/* Both stay mounted so search, filters and sorting survive switching tabs */}
                <div id="panel-reviews" role="tabpanel" aria-labelledby="tab-reviews" hidden={activeTab !== "reviews"}>
                    <ReviewsSection reviews={reviews} loading={loading} />
                </div>

                <div id="panel-complaints" role="tabpanel" aria-labelledby="tab-complaints" hidden={activeTab !== "complaints"}>
                    <ComplaintsSection
                        complaints={complaints}
                        loading={loading}
                        onStatusChange={changeComplaintStatus}
                    />
                </div>
            </div>
        </AdminLayout>
    );
}

export default Complaints;