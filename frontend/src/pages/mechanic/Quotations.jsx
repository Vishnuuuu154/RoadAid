import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import MechanicLayout, { useToast } from "../../layouts/MechanicLayout";
import { getMyQuotations, updateQuotation } from "../../services/mechanicService";
import "../../styles/Quotations.css";

import {
    FaSyncAlt,
    FaExclamationTriangle,
    FaFileInvoiceDollar,
    FaPen,
    FaEye,
    FaCheckCircle,
    FaHourglassHalf,
    FaTimesCircle,
    FaBan,
    FaCarSide,
    FaTimes,
    FaSearch,
    FaSlidersH,
    FaListUl,
    FaInfoCircle,
    FaWifi
} from "react-icons/fa";

/* ================================================================== */
/* Config + helpers                                                    */
/* ================================================================== */

const POLL_MS = 30000;

const GROUPS = [
    { key: "awaiting", label: "Awaiting customer" },
    { key: "accepted", label: "Accepted" },
    { key: "done", label: "Completed" },
    { key: "closed", label: "Closed" }
];

const SORTS = [
    { key: "awaiting", label: "Awaiting customer first" },
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "high", label: "Highest amount" },
    { key: "low", label: "Lowest amount" }
];

const GROUP_ORDER = { awaiting: 0, accepted: 1, done: 2, closed: 3 };

const REQUEST_STATUS_LABELS = {
    PENDING: "Pending",
    WAITING_FOR_QUOTATION: "Waiting for quotation",
    QUOTATION_PENDING: "Quotation sent",
    ACCEPTED: "Accepted",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled"
};

const CHARGES = [
    { name: "labourCharge", label: "Labour", seg: "qt-seg-labour" },
    { name: "partsCharge", label: "Parts", seg: "qt-seg-parts" },
    { name: "travelFee", label: "Travel fee", seg: "qt-seg-travel" }
];

const money = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const moneyCompact = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const initials = (name) =>
    (name || "C").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "C";

const idValue = (q) => (Number.isNaN(Number(q.id)) ? 0 : Number(q.id));

// One place decides how a quotation is described, so the badge and the filters always agree.
function getDisplayStatus(q) {
    const requestStatus = q.serviceRequest?.status;

    const paymentStatus = String(q.paymentStatus || "").toUpperCase();

    if (requestStatus === "CANCELLED") return { key: "closed", label: "Request cancelled", tone: "neutral", icon: FaBan };
    if (requestStatus === "REJECTED") return { key: "closed", label: "Request rejected", tone: "danger", icon: FaTimesCircle };

    // A paid quote is finished work, even if the request hasn't been marked completed yet.
    if (PAID_STATES.includes(paymentStatus)) return { key: "done", label: "Paid", tone: "success", icon: FaCheckCircle };
    if (requestStatus === "COMPLETED") return { key: "done", label: "Completed", tone: "success", icon: FaCheckCircle };

    if (paymentStatus === "ACCEPTED") return { key: "accepted", label: "Accepted", tone: "success", icon: FaCheckCircle };
    if (paymentStatus === "PENDING") return { key: "awaiting", label: "Awaiting customer", tone: "warning", icon: FaHourglassHalf };
    if (paymentStatus === "REJECTED") return { key: "closed", label: "Rejected", tone: "danger", icon: FaTimesCircle };

    // Anything we don't recognise still lands in Closed, but is flagged so it can be spotted.
    return { key: "closed", label: paymentStatus || "Unknown", tone: "neutral", icon: FaBan, unknown: true };
}

// Payment values that mean the customer has paid. Add yours here if it uses another word.
const PAID_STATES = ["PAID", "SUCCESS", "COMPLETED", "CASH_PAID"];

const emptyForm = { labourCharge: "", partsCharge: "", travelFee: "" };

/* ================================================================== */
/* Quotation card                                                      */
/* ================================================================== */

function QuotationCard({ q, onEdit, onView }) {
    const request = q.serviceRequest;
    const status = getDisplayStatus(q);
    const Icon = status.icon;
    const vehicle = [request?.vehicle?.brand, request?.vehicle?.model].filter(Boolean).join(" ");
    const canEdit = q.paymentStatus === "PENDING" && request?.status === "QUOTATION_PENDING";
    const customer = request?.customer?.fullName || "Customer";

    const parts = CHARGES.map((c) => ({ ...c, value: Number(q[c.name]) || 0 }));
    const sum = parts.reduce((s, p) => s + p.value, 0);

    return (
        <article className="qt-card" data-status={status.key}>
            <div className="qt-card-top">
                <span className="qt-badge" data-tone={status.tone}>
                    <Icon aria-hidden="true" /> {status.label}
                </span>
                <span className="qt-req-id">Request #{request?.id || "—"}</span>
            </div>

            <div className="qt-who">
                <span className="qt-avatar" aria-hidden="true">{initials(customer)}</span>
                <div>
                    <h2 className="qt-name">{customer}</h2>
                    {vehicle && (
                        <p className="qt-vehicle">
                            <FaCarSide aria-hidden="true" /> {vehicle}
                        </p>
                    )}
                </div>
            </div>

            <div className="qt-total-box">
                <div className="qt-total-row">
                    <span className="qt-total-label">Total quoted</span>
                    <span className="qt-total-value">{money(Number(q.totalAmount))}</span>
                </div>

                {sum > 0 && (
                    <div className="qt-bar" aria-hidden="true">
                        {parts.filter((p) => p.value > 0).map((p) => (
                            <i key={p.name} className={p.seg} style={{ width: `${(p.value / sum) * 100}%` }} />
                        ))}
                    </div>
                )}

                <dl className="qt-lines">
                    {parts.map((p) => (
                        <div className="qt-line" key={p.name}>
                            <dt><span className={`qt-dot ${p.seg}`} aria-hidden="true" /> {p.label}</dt>
                            <dd>{money(p.value)}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <p className="qt-meta">
                Request status: <strong>{REQUEST_STATUS_LABELS[request?.status] || request?.status || "Unknown"}</strong>
            </p>

            <div className="qt-actions">
                {canEdit && (
                    <button type="button" className="qt-btn qt-btn-dark" onClick={() => onEdit(q)}>
                        <FaPen aria-hidden="true" /> Edit quotation
                    </button>
                )}
                {request?.id && (
                    <button type="button" className="qt-btn" onClick={() => onView(request.id)}>
                        <FaEye aria-hidden="true" /> View request
                    </button>
                )}
            </div>

            {canEdit && (
                <p className="qt-hint">
                    <FaInfoCircle aria-hidden="true" /> You can edit this until the customer accepts it.
                </p>
            )}
        </article>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function QuotationsContent() {
    const navigate = useNavigate();
    const showToast = useToast();

    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [syncFailed, setSyncFailed] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const [groups, setGroups] = useState([]); // selected groups; empty = all
    const [sort, setSort] = useState("awaiting");
    const [query, setQuery] = useState("");
    const [panelOpen, setPanelOpen] = useState(false);

    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState("");

    const searchRef = useRef(null);
    const toolbarRef = useRef(null);

    /* ---------------------------- data ---------------------------- */

    const load = useCallback(async (silent = false) => {
        try {
            if (!silent) setError("");
            const response = await getMyQuotations();
            setQuotations(Array.isArray(response.data) ? response.data : []);
            setLastUpdated(new Date());
            setSyncFailed(false);
            setError("");
        } catch (err) {
            console.error("Failed to load quotations:", err);
            if (silent) setSyncFailed(true);
            else setError(err.response?.data?.message || "Failed to load quotations.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        // Quietly pick up a customer accepting or rejecting a quote.
        const id = setInterval(() => !document.hidden && load(true), POLL_MS);
        return () => clearInterval(id);
    }, [load]);

    const handleRefresh = () => {
        setRefreshing(true);
        load();
    };

    /* ---------- keyboard + outside click ---------- */

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") setPanelOpen(false);
            const tag = document.activeElement?.tagName;
            if (e.key === "/" && !editing && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        const onClick = (e) => {
            if (window.innerWidth > 760 && toolbarRef.current && !toolbarRef.current.contains(e.target)) {
                setPanelOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onClick);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onClick);
        };
    }, [editing]);

    /* ---------- derived ---------- */

    const stats = useMemo(() => {
        const out = { all: { count: 0, value: 0 } };
        GROUPS.forEach((g) => (out[g.key] = { count: 0, value: 0 }));
        quotations.forEach((q) => {
            const key = getDisplayStatus(q).key;
            const amount = Number(q.totalAmount) || 0;
            out[key].count += 1;
            out[key].value += amount;
            out.all.count += 1;
            // Rejected and cancelled quotes aren't money you can earn, so keep them out of the headline value.
            if (key !== "closed") out.all.value += amount;
        });
        return out;
    }, [quotations]);

    // Helps spot quotes whose status this page doesn't know how to group.
    useEffect(() => {
        const odd = quotations.filter((q) => getDisplayStatus(q).unknown);
        if (odd.length > 0) {
            console.warn(
                `${odd.length} quotation(s) have a status the page doesn't recognise:`,
                odd.map((q) => ({ id: q.id, paymentStatus: q.paymentStatus, requestStatus: q.serviceRequest?.status }))
            );
        }
    }, [quotations]);

    const visible = useMemo(() => {
        const text = query.trim().toLowerCase();
        const list = quotations
            .filter((q) => groups.length === 0 || groups.includes(getDisplayStatus(q).key))
            .filter((q) => {
                if (!text) return true;
                const r = q.serviceRequest;
                return [r?.id, r?.customer?.fullName, r?.vehicle?.brand, r?.vehicle?.model]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(text);
            });

        const newest = (a, b) => idValue(b) - idValue(a);
        const amount = (q) => Number(q.totalAmount) || 0;

        switch (sort) {
            case "oldest": return list.sort((a, b) => -newest(a, b));
            case "high": return list.sort((a, b) => amount(b) - amount(a));
            case "low": return list.sort((a, b) => amount(a) - amount(b));
            case "awaiting":
                return list.sort((a, b) => GROUP_ORDER[getDisplayStatus(a).key] - GROUP_ORDER[getDisplayStatus(b).key] || newest(a, b));
            default: return list.sort(newest);
        }
    }, [quotations, groups, query, sort]);

    const isFiltered = groups.length > 0 || query.trim() !== "";
    const filterCount = groups.length + (sort !== "awaiting" ? 1 : 0);

    const toggleGroup = (key) => setGroups((prev) => (prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]));
    const clearAll = () => {
        setGroups([]);
        setQuery("");
        setSort("awaiting");
    };

    const summaryCards = [
        { key: "all", label: "All quotes", tone: "neutral", icon: FaListUl, groups: [] },
        { key: "awaiting", label: "Awaiting customer", tone: "warning", icon: FaHourglassHalf, groups: ["awaiting"] },
        { key: "accepted", label: "Accepted", tone: "success", icon: FaCheckCircle, groups: ["accepted"] },
        { key: "done", label: "Completed", tone: "info", icon: FaFileInvoiceDollar, groups: ["done"] }
    ];

    const cardActive = (card) => card.groups.length === groups.length && card.groups.every((g) => groups.includes(g));

    /* ---------------------------- editing ---------------------------- */

    const closeEdit = useCallback(() => {
        if (saving) return;
        setEditing(null);
        setForm(emptyForm);
        setEditError("");
    }, [saving]);

    useEffect(() => {
        if (!editing) return;
        const onKey = (e) => e.key === "Escape" && closeEdit();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [editing, closeEdit]);

    const openEdit = (q) => {
        setEditing(q);
        setForm({
            labourCharge: q.labourCharge ?? "",
            partsCharge: q.partsCharge ?? "",
            travelFee: q.travelFee ?? ""
        });
        setEditError("");
    };

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const newTotal = Number(form.labourCharge || 0) + Number(form.partsCharge || 0) + Number(form.travelFee || 0);
    const oldTotal = editing ? Number(editing.totalAmount) || 0 : 0;
    const diff = newTotal - oldTotal;
    const unchanged = editing
        ? CHARGES.every((c) => Number(form[c.name] || 0) === (Number(editing[c.name]) || 0))
        : true;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editing) return;

        const values = [form.labourCharge, form.partsCharge, form.travelFee].map(Number);
        if (values.some((v) => !Number.isFinite(v) || v < 0)) {
            setEditError("Please enter valid charges.");
            return;
        }

        try {
            setSaving(true);
            setEditError("");
            await updateQuotation(editing.serviceRequest.id, {
                labourCharge: values[0],
                partsCharge: values[1],
                travelFee: values[2]
            });
            setEditing(null);
            showToast("Quotation updated. The customer will see the new total.", "success");
            await load(true);
        } catch (err) {
            console.error("Failed to update quotation:", err);
            setEditError(err.response?.data?.message || "Failed to update quotation.");
        } finally {
            setSaving(false);
        }
    };

    /* ----------------------------- render ---------------------------- */

    return (
        <div className="qt-root">
            <header className="qt-header">
                <div>
                    <h1 className="qt-title">Quotations</h1>
                    <p className="qt-sub">
                        <span className="qt-live">
                            <span className="qt-live-dot" aria-hidden="true" />
                            {lastUpdated
                                ? `Live · updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                                : "Loading your quotes…"}
                        </span>
                    </p>
                </div>
                <button type="button" className="qt-btn" onClick={handleRefresh} disabled={loading || refreshing}>
                    <FaSyncAlt aria-hidden="true" className={refreshing ? "qt-spin" : ""} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                </button>
            </header>

            {syncFailed && !error && (
                <div className="qt-banner" role="status">
                    <FaWifi aria-hidden="true" /> Couldn't refresh just now. Showing your last loaded quotes.
                </div>
            )}

            {/* Summary cards double as quick filters */}
            <section className="qt-stats" aria-label="Quick filters">
                {summaryCards.map((card) => {
                    const CardIcon = card.icon;
                    const s = stats[card.key];
                    return (
                        <button
                            key={card.key}
                            type="button"
                            className="qt-stat"
                            data-tone={card.tone}
                            aria-pressed={cardActive(card)}
                            onClick={() => setGroups(card.groups)}
                        >
                            <span className="qt-stat-top">
                                <span className="qt-stat-ico"><CardIcon aria-hidden="true" /></span>
                                {card.label}
                            </span>
                            <span className="qt-stat-value">{loading ? "–" : moneyCompact(s.value)}</span>
                            <span className="qt-stat-count">
                                {loading
                                    ? ""
                                    : card.key === "all" && stats.closed.count > 0
                                        ? `${s.count} quote${s.count === 1 ? "" : "s"} · ${stats.closed.count} closed`
                                        : `${s.count} quote${s.count === 1 ? "" : "s"}`}
                            </span>
                        </button>
                    );
                })}
            </section>

            {/* Search + filter */}
            <div className="qt-toolbar" ref={toolbarRef}>
                <div className="qt-search">
                    <FaSearch aria-hidden="true" />
                    <input
                        ref={searchRef}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search customer, vehicle or request no."
                        aria-label="Search quotations"
                    />
                    {query ? (
                        <button type="button" className="qt-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                            <FaTimes aria-hidden="true" />
                        </button>
                    ) : (
                        <span className="qt-kbd" aria-hidden="true">/</span>
                    )}
                </div>

                <button
                    type="button"
                    className="qt-btn qt-filter-btn"
                    aria-expanded={panelOpen}
                    aria-controls="qt-filter-panel"
                    onClick={() => setPanelOpen((o) => !o)}
                >
                    <FaSlidersH aria-hidden="true" />
                    <span className="qt-filter-text">Filter &amp; sort</span>
                    {filterCount > 0 && <span className="qt-filter-badge">{filterCount}</span>}
                </button>

                {panelOpen && (
                    <>
                        <div className="qt-scrim" onClick={() => setPanelOpen(false)} />
                        <div className="qt-panel" id="qt-filter-panel" role="dialog" aria-label="Filter and sort quotations">
                            <div className="qt-panel-head">
                                <h2 className="qt-panel-title">Filter &amp; sort</h2>
                                <button type="button" className="qt-icon-btn" onClick={() => setPanelOpen(false)} aria-label="Close filters">
                                    <FaTimes aria-hidden="true" />
                                </button>
                            </div>

                            <div className="qt-group">
                                <span className="qt-group-label">Status</span>
                                <div className="qt-chips">
                                    {GROUPS.map((g) => (
                                        <button
                                            key={g.key}
                                            type="button"
                                            className="qt-chip"
                                            aria-pressed={groups.includes(g.key)}
                                            onClick={() => toggleGroup(g.key)}
                                        >
                                            {g.label}
                                            <span className="qt-chip-count">{stats[g.key].count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="qt-group">
                                <label className="qt-group-label" htmlFor="qt-sort">Sort by</label>
                                <select id="qt-sort" className="qt-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                                    {SORTS.map((s) => (
                                        <option key={s.key} value={s.key}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="qt-panel-foot">
                                <button type="button" className="qt-btn" onClick={clearAll}>Reset</button>
                                <button type="button" className="qt-btn qt-btn-dark" onClick={() => setPanelOpen(false)}>
                                    Show {visible.length} quote{visible.length === 1 ? "" : "s"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Applied filters */}
            {!loading && !error && quotations.length > 0 && (
                <div className="qt-active" aria-live="polite">
                    <span className="qt-result-count">{visible.length} quote{visible.length === 1 ? "" : "s"}</span>
                    {groups.map((g) => (
                        <button key={g} type="button" className="qt-tag" onClick={() => toggleGroup(g)} aria-label={`Remove ${GROUPS.find((x) => x.key === g)?.label} filter`}>
                            {GROUPS.find((x) => x.key === g)?.label}
                            <span className="qt-tag-x"><FaTimes aria-hidden="true" /></span>
                        </button>
                    ))}
                    {isFiltered && <button type="button" className="qt-btn qt-btn-link" onClick={clearAll}>Clear all</button>}
                </div>
            )}

            {loading && (
                <div className="qt-grid" aria-busy="true" aria-label="Loading quotations">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="qt-skeleton" />)}
                </div>
            )}

            {!loading && error && (
                <div className="qt-error" role="alert">
                    <FaExclamationTriangle className="qt-error-ico" aria-hidden="true" />
                    <div>
                        <p className="qt-error-title">Unable to load quotations</p>
                        <p className="qt-error-text">{error}</p>
                        <button type="button" className="qt-btn" onClick={() => load()}>Try again</button>
                    </div>
                </div>
            )}

            {!loading && !error && visible.length === 0 && (
                <div className="qt-state">
                    <span className="qt-state-ico"><FaFileInvoiceDollar aria-hidden="true" /></span>
                    <h2 className="qt-state-title">{quotations.length === 0 ? "No quotations yet" : "No matching quotations"}</h2>
                    <p className="qt-state-text">
                        {quotations.length === 0
                            ? "Quotations you send to customers will appear here."
                            : "Try a different status or search term."}
                    </p>
                    {quotations.length === 0 ? (
                        <button type="button" className="qt-btn qt-btn-dark" onClick={() => navigate("/mechanic/requests")}>
                            View my requests
                        </button>
                    ) : (
                        <button type="button" className="qt-btn qt-btn-dark" onClick={clearAll}>Clear filters</button>
                    )}
                </div>
            )}

            {!loading && !error && visible.length > 0 && (
                <div className="qt-grid">
                    {visible.map((q) => (
                        <QuotationCard
                            key={q.id}
                            q={q}
                            onEdit={openEdit}
                            onView={(id) => navigate(`/mechanic/requests/${id}`)}
                        />
                    ))}
                </div>
            )}

            {editing && (
                <div className="qt-overlay" onClick={closeEdit}>
                    <form
                        className="qt-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="qt-edit-title"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleSave}
                    >
                        <div className="qt-modal-head">
                            <div>
                                <h2 id="qt-edit-title" className="qt-modal-title">Edit quotation</h2>
                                <p className="qt-modal-sub">
                                    Request #{editing.serviceRequest?.id} · {editing.serviceRequest?.customer?.fullName || "Customer"}
                                </p>
                            </div>
                            <button type="button" className="qt-icon-btn" onClick={closeEdit} disabled={saving} aria-label="Close">
                                <FaTimes aria-hidden="true" />
                            </button>
                        </div>

                        {editError && <div className="qt-alert" role="alert">{editError}</div>}

                        {CHARGES.map((c, i) => (
                            <div className="qt-field" key={c.name}>
                                <label htmlFor={`qt-${c.name}`}>
                                    <span className={`qt-dot ${c.seg}`} aria-hidden="true" /> {c.label} charge
                                </label>
                                <div className="qt-money">
                                    <span aria-hidden="true">₹</span>
                                    <input
                                        id={`qt-${c.name}`}
                                        name={c.name}
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={form[c.name]}
                                        onChange={handleChange}
                                        disabled={saving}
                                        autoFocus={i === 0}
                                        required
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="qt-new-total" aria-live="polite">
                            <span>
                                Updated total
                                <small>
                                    {diff === 0
                                        ? "No change"
                                        : `${diff > 0 ? "+" : "−"}${money(Math.abs(diff))} from ${money(oldTotal)}`}
                                </small>
                            </span>
                            <strong>{money(newTotal)}</strong>
                        </div>

                        <div className="qt-modal-actions">
                            <button type="button" className="qt-btn" onClick={closeEdit} disabled={saving}>Cancel</button>
                            <button type="submit" className="qt-btn qt-btn-dark" disabled={saving || newTotal <= 0 || unchanged}>
                                {saving ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function Quotations() {
    return (
        <MechanicLayout>
            <QuotationsContent />
        </MechanicLayout>
    );
}

export default Quotations;