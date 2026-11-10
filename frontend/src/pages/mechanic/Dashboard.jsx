import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MechanicLayout, { useAvailability, useConfirm, useToast } from "../../layouts/MechanicLayout";

import { getMyProfile, getMyRequests, acceptRequest, rejectRequest, getMyPayments } from "../../services/mechanicService";

import {
    FaWrench,
    FaClipboardList,
    FaHourglassHalf,
    FaTools,
    FaCheckCircle,
    FaMoneyBillWave,
    FaCreditCard,
    FaTimesCircle,
    FaBan,
    FaExclamationCircle,
    FaExclamationTriangle,
    FaMapMarkerAlt,
    FaCarSide,
    FaSyncAlt,
    FaInbox,
    FaBoxOpen,
    FaEye,
    FaRoute,
    FaComments,
    FaArrowRight,
    FaChevronRight,
    FaSearch,
    FaTimes,
    FaPhoneAlt,
    FaDirections,
    FaWallet,
    FaRegClock
} from "react-icons/fa";

import "../../styles/mechdashboard.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 30000;

/*
 * Every link on this page lives here. If your router uses different paths,
 * change them in this one place.
 *
 * The four stat cards open the requests page with a ?status= filter.
 * Your requests page should read that query value (PENDING, IN_PROGRESS,
 * COMPLETED, or nothing for "all").
 */
const ROUTES = {
    requests: "/mechanic/requests",
    payments: "/mechanic/payments",
    request: (id) => `/mechanic/requests/${id}`,
    chat: (id) => `/mechanic/requests/${id}/communication`
};

const STATUS_CONFIG = {
    PENDING: { label: "Pending", icon: FaHourglassHalf, tone: "warning" },
    WAITING_FOR_QUOTATION: { label: "Quotation needed", icon: FaMoneyBillWave, tone: "info" },
    IN_PROGRESS: { label: "In progress", icon: FaTools, tone: "primary" },
    COMPLETED: { label: "Completed", icon: FaCheckCircle, tone: "success" },
    REJECTED: { label: "Rejected", icon: FaTimesCircle, tone: "danger" },
    CANCELLED: { label: "Cancelled", icon: FaBan, tone: "neutral" }
};

const SERVICE_STAGES = [
    { key: "ON_THE_WAY", label: "On the way", icon: FaRoute },
    { key: "ARRIVED", label: "Arrived", icon: FaMapMarkerAlt },
    { key: "REPAIRING", label: "Repairing", icon: FaTools }
];

const TABS = [
    { key: "incoming", label: "Incoming", icon: FaInbox },
    { key: "active", label: "Active", icon: FaTools },
    { key: "quotation", label: "Quotes", icon: FaMoneyBillWave }
];

const EMPTY_CONFIG = {
    incoming: { icon: FaInbox, title: "No new requests", description: "New requests show up here the moment customers reach out." },
    active: { icon: FaBoxOpen, title: "No active jobs", description: "Jobs you've accepted and are working on appear here." },
    quotation: { icon: FaMoneyBillWave, title: "No quotes to send", description: "Requests that need a price quote first will appear here." }
};

const PAYMENT_STATUS = {
    SUCCESS: { label: "Paid", tone: "success" },
    CASH_PENDING: { label: "Cash pending", tone: "warning" },
    CREATED: { label: "Awaiting payment", tone: "warning" },
    FAILED: { label: "Failed", tone: "danger" }
};

const PENDING_PAYMENT = ["CASH_PENDING", "CREATED"];

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const money = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

const moneyCompact = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(n || 0);

function timeAgo(date, now = Date.now()) {
    if (!date) return "";
    const sec = Math.max(0, Math.round((now - date.getTime()) / 1000));
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.round(hr / 24)}d ago`;
}

function greeting(hour) {
    if (hour < 5) return "Working late";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();

/* Different backends name this field differently; use the first one present. */
const paidOn = (p) => p.paymentDate || p.paidAt || p.createdAt || null;

const prettify = (value) =>
    String(value || "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "Date unavailable";

const asList = (value) => (Array.isArray(value) ? value : []);

/* ================================================================== */
/* Hooks                                                               */
/* ================================================================== */

/* Loads the page font once. Safe to call from several components. */
function useDashboardFont() {
    useEffect(() => {
        if (document.getElementById("rm-font-jakarta")) return;
        const link = document.createElement("link");
        link.id = "rm-font-jakarta";
        link.rel = "stylesheet";
        link.href =
            "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
        document.head.appendChild(link);
    }, []);
}

/* Re-renders on an interval so "Updated 2m ago" keeps counting. */
function useNow(interval = 30000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), interval);
        return () => clearInterval(id);
    }, [interval]);
    return now;
}

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || { label: prettify(status) || "Unknown", icon: FaExclamationCircle, tone: "neutral" };
    return (
        <span className="db-badge" data-tone={cfg.tone}>
            <cfg.icon aria-hidden="true" />
            {cfg.label}
        </span>
    );
}

function StageTracker({ stage }) {
    const current = SERVICE_STAGES.findIndex((s) => s.key === stage);
    return (
        <ol className="db-stages" aria-label="Service stage">
            {SERVICE_STAGES.map((s, i) => {
                const state = current === -1 ? "next" : i < current ? "done" : i === current ? "now" : "next";
                return (
                    <li key={s.key} className="db-stage" data-state={state} aria-current={state === "now" ? "step" : undefined}>
                        <span className="db-stage-dot" aria-hidden="true">
                            {state === "done" && <FaCheckCircle />}
                        </span>
                        {s.label}
                    </li>
                );
            })}
        </ol>
    );
}

function Notice({ tone = "warning", icon: Icon = FaExclamationTriangle, title, children, action, role = "status" }) {
    return (
        <div className="db-notice" data-tone={tone} role={role}>
            <Icon className="db-notice-icon" aria-hidden="true" />
            <div className="db-notice-body">
                <p className="db-notice-title">{title}</p>
                {children && <p className="db-notice-text">{children}</p>}
            </div>
            {action}
        </div>
    );
}

function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="db-empty">
            <span className="db-empty-icon">
                <Icon aria-hidden="true" />
            </span>
            <h3 className="db-empty-title">{title}</h3>
            <p className="db-empty-text">{description}</p>
            {action}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, hint, tone, to }) {
    return (
        <Link to={to} className="db-stat" data-tone={tone} aria-label={`${label}: ${value}. ${hint}`}>
            <span className="db-stat-icon">
                <Icon aria-hidden="true" />
            </span>
            <span className="db-stat-main">
                <span className="db-stat-value">{value}</span>
                <span className="db-stat-label">{label}</span>
            </span>
            <span className="db-stat-go" aria-hidden="true">
                <FaChevronRight />
            </span>
        </Link>
    );
}

/* ================================================================== */
/* Availability hero                                                   */
/* ================================================================== */

function AvailabilityHero({ profile, online, approved, updating, onToggle }) {
    const live = online && approved;
    const state = !approved ? "unverified" : live ? "online" : "offline";

    const headline = { unverified: "Not verified yet", online: "You're online", offline: "You're offline" }[state];
    const sub = {
        unverified: "Waiting for admin approval",
        online: "Nearby customers can send you requests",
        offline: "Go online to start receiving requests"
    }[state];

    return (
        <section className="db-hero" data-state={state} aria-label="Workshop and availability">
            <div className="db-hero-shop">
                <span className="db-hero-avatar" aria-hidden="true">
                    <FaWrench />
                </span>
                <div className="db-hero-shop-text">
                    <h2 className="db-hero-name">{profile.workshopName || "Independent Mechanic"}</h2>
                    <p className="db-hero-address">
                        <FaMapMarkerAlt aria-hidden="true" /> {profile.workshopAddress || "Location unavailable"}
                    </p>
                </div>
            </div>

            <div className="db-hero-status">
                <div className="db-hero-status-text">
                    <p className="db-hero-state">
                        <span className="db-pulse" aria-hidden="true" />
                        {headline}
                    </p>
                    <p className="db-hero-sub">{sub}</p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={live}
                    aria-label="Available for new requests"
                    className="db-switch"
                    onClick={onToggle}
                    disabled={updating || !approved}
                >
                    <span className="db-switch-knob" />
                    <span className="db-switch-text">{updating ? "Wait…" : live ? "ON" : "OFF"}</span>
                </button>
            </div>
        </section>
    );
}

/* ================================================================== */
/* Requests                                                            */
/* ================================================================== */

function RequestCard({ request, variant, busy, now, onAccept, onReject, onView, onMessage }) {
    const created = request.createdAt ? new Date(request.createdAt) : null;
    const initial = (request.customerName || "?").trim().charAt(0).toUpperCase();
    const mapsUrl = request.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.location)}`
        : null;

    const mine = busy && busy.id === request.requestId;
    const accepting = mine && busy.type === "accept";
    const rejecting = mine && busy.type === "reject";

    return (
        <article className="db-req" data-variant={variant}>
            <div className="db-req-top">
                <span className="db-req-avatar" aria-hidden="true">{initial}</span>
                <div className="db-req-who">
                    <h3 className="db-req-name">{request.customerName || "Customer"}</h3>
                    <p className="db-req-id">
                        #{request.requestId}
                        {created && !Number.isNaN(created.getTime()) && (
                            <>
                                <span aria-hidden="true"> · </span>
                                <FaRegClock aria-hidden="true" /> {timeAgo(created, now)}
                            </>
                        )}
                    </p>
                </div>
                <StatusBadge status={request.status} />
            </div>

            <ul className="db-req-meta">
                {request.vehicle && (
                    <li>
                        <FaCarSide aria-hidden="true" />
                        <span><span className="db-sr">Vehicle: </span>{request.vehicle}</span>
                    </li>
                )}
                {request.issue && (
                    <li>
                        <FaTools aria-hidden="true" />
                        <span><span className="db-sr">Issue: </span>{request.issue}</span>
                    </li>
                )}
                {request.location && (
                    <li>
                        <FaMapMarkerAlt aria-hidden="true" />
                        <span>
                            <span className="db-sr">Location: </span>
                            {request.location}
                            {mapsUrl && (
                                <>
                                    {" "}
                                    <a className="db-inline-link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
                                        <FaDirections aria-hidden="true" /> Directions
                                    </a>
                                </>
                            )}
                        </span>
                    </li>
                )}
            </ul>

            {variant === "active" && request.serviceStage && <StageTracker stage={request.serviceStage} />}

            <div className="db-req-actions">
                {variant === "incoming" && (
                    <>
                        <button
                            type="button"
                            className="db-btn db-btn-success"
                            onClick={() => onAccept(request.requestId)}
                            disabled={mine}
                        >
                            {accepting ? <span className="db-btn-spinner" aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                            {accepting ? "Accepting…" : "Accept"}
                        </button>
                        <button
                            type="button"
                            className="db-btn db-btn-danger-outline"
                            onClick={() => onReject(request.requestId)}
                            disabled={mine}
                        >
                            {rejecting ? <span className="db-btn-spinner" aria-hidden="true" /> : null}
                            {rejecting ? "Rejecting…" : "Reject"}
                        </button>
                    </>
                )}
                {variant === "quotation" && (
                    <button type="button" className="db-btn db-btn-primary" onClick={() => onView(request.requestId)}>
                        <FaMoneyBillWave aria-hidden="true" /> Send quotation
                    </button>
                )}
                {variant === "active" && (
                    <button type="button" className="db-btn db-btn-primary" onClick={() => onView(request.requestId)}>
                        <FaEye aria-hidden="true" /> View job
                    </button>
                )}
                <button type="button" className="db-btn db-btn-secondary" onClick={() => onMessage(request.requestId)}>
                    <FaComments aria-hidden="true" /> Message
                </button>
                {request.customerPhone && (
                    <a
                        className="db-btn db-btn-secondary db-btn-icon"
                        href={`tel:${request.customerPhone}`}
                        aria-label={`Call ${request.customerName || "customer"}`}
                    >
                        <FaPhoneAlt aria-hidden="true" />
                    </a>
                )}
            </div>
        </article>
    );
}

function RequestsPanel({ groups, activeTab, setActiveTab, query, setQuery, totalCount, busy, now, handlers }) {
    const tabRefs = useRef({});
    const visible = groups[activeTab] || [];
    const searching = query.trim().length > 0;

    const onTabKeyDown = (e) => {
        const index = TABS.findIndex((t) => t.key === activeTab);
        let next = null;
        if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
        if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = TABS.length - 1;
        if (next === null) return;
        e.preventDefault();
        const key = TABS[next].key;
        setActiveTab(key);
        tabRefs.current[key]?.focus();
    };

    return (
        <section className="db-panel" aria-labelledby="db-requests-title">
            <div className="db-panel-head">
                <div>
                    <h2 className="db-panel-title" id="db-requests-title">Your requests</h2>
                    <p className="db-panel-sub">Work that needs you right now</p>
                </div>
                <Link to={ROUTES.requests} className="db-link">
                    View all <FaArrowRight aria-hidden="true" />
                </Link>
            </div>

            {totalCount > 0 && (
                <div className="db-search">
                    <FaSearch aria-hidden="true" className="db-search-icon" />
                    <input
                        type="search"
                        className="db-search-input"
                        placeholder="Search by name, vehicle, issue or place"
                        aria-label="Search requests"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button type="button" className="db-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                            <FaTimes aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}

            <div className="db-tabs" role="tablist" aria-label="Request type" onKeyDown={onTabKeyDown}>
                {TABS.map((tab) => {
                    const selected = activeTab === tab.key;
                    const count = groups[tab.key].length;
                    return (
                        <button
                            key={tab.key}
                            ref={(el) => (tabRefs.current[tab.key] = el)}
                            type="button"
                            role="tab"
                            id={`db-tab-${tab.key}`}
                            aria-selected={selected}
                            aria-controls="db-tabpanel"
                            tabIndex={selected ? 0 : -1}
                            className="db-tab"
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <tab.icon aria-hidden="true" />
                            {tab.label}
                            {count > 0 && <span className="db-count" data-hot={tab.key === "incoming"}>{count}</span>}
                        </button>
                    );
                })}
            </div>

            <div id="db-tabpanel" role="tabpanel" aria-labelledby={`db-tab-${activeTab}`} tabIndex={0}>
                {visible.length === 0 ? (
                    searching ? (
                        <EmptyState
                            icon={FaSearch}
                            title="No matches"
                            description={`Nothing in this tab matches "${query.trim()}".`}
                            action={
                                <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={() => setQuery("")}>
                                    Clear search
                                </button>
                            }
                        />
                    ) : (
                        <EmptyState {...EMPTY_CONFIG[activeTab]} />
                    )
                ) : (
                    <div className="db-req-grid">
                        {visible.map((r) => (
                            <RequestCard
                                key={r.requestId}
                                request={r}
                                variant={activeTab}
                                busy={busy}
                                now={now}
                                {...handlers}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ================================================================== */
/* Earnings                                                            */
/* ================================================================== */

function EarningsPanel({ payments }) {
    const stats = useMemo(() => {
        const sum = (list) => list.reduce((t, p) => t + (Number(p.amount) || 0), 0);
        const paid = payments.filter((p) => p.paymentStatus === "SUCCESS");
        const awaiting = payments.filter((p) => PENDING_PAYMENT.includes(p.paymentStatus));

        const today = new Date();
        const thisMonth = paid.filter((p) => {
            if (!paidOn(p)) return false;
            const d = new Date(paidOn(p));
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });

        const week = Array.from({ length: 7 }, (_, i) => {
            const day = new Date();
            day.setHours(0, 0, 0, 0);
            day.setDate(day.getDate() - (6 - i));
            const total = sum(paid.filter((p) => paidOn(p) && sameDay(new Date(paidOn(p)), day)));
            return {
                key: day.toISOString(),
                label: day.toLocaleDateString("en-IN", { weekday: "short" }),
                total,
                today: i === 6
            };
        });

        return {
            earned: sum(paid),
            awaiting: sum(awaiting),
            month: sum(thisMonth),
            week,
            weekMax: Math.max(...week.map((d) => d.total), 0),
            weekTotal: week.reduce((t, d) => t + d.total, 0)
        };
    }, [payments]);

    const recent = payments.slice(0, 4);

    return (
        <section className="db-panel db-earnings" aria-labelledby="db-earnings-title">
            <div className="db-panel-head">
                <div>
                    <h2 className="db-panel-title" id="db-earnings-title">Earnings</h2>
                    <p className="db-panel-sub">From completed services</p>
                </div>
                <Link to={ROUTES.payments} className="db-link">
                    All payments <FaArrowRight aria-hidden="true" />
                </Link>
            </div>

            <div className="db-earn-hero">
                <span className="db-earn-hero-icon" aria-hidden="true"><FaWallet /></span>
                <div>
                    <p className="db-earn-label">Total earned</p>
                    <p className="db-earn-total">{money(stats.earned)}</p>
                </div>
            </div>

            <dl className="db-earn-grid">
                <div className="db-earn-cell">
                    <dt>This month</dt>
                    <dd>{money(stats.month)}</dd>
                </div>
                <div className="db-earn-cell" data-tone="warning">
                    <dt>Awaiting</dt>
                    <dd>{money(stats.awaiting)}</dd>
                </div>
                <div className="db-earn-cell">
                    <dt>Payments</dt>
                    <dd>{payments.length}</dd>
                </div>
            </dl>

            <div className="db-week">
                <div className="db-week-head">
                    <span>Last 7 days</span>
                    <strong>{money(stats.weekTotal)}</strong>
                </div>
                {stats.weekTotal === 0 ? (
                    <p className="db-week-empty">
                        No paid earnings in the last 7 days. Completed, paid jobs will show up here day by day.
                    </p>
                ) : (
                    <div
                        className="db-bars"
                        role="img"
                        aria-label={`Earnings over the last 7 days: ${stats.week
                            .map((d) => `${d.label} ${money(d.total)}`)
                            .join(", ")}`}
                    >
                        {stats.week.map((d) => (
                            <div className="db-bar-col" key={d.key} title={`${d.label}: ${money(d.total)}`}>
                            <span className="db-bar-amount" aria-hidden="true">
                                {d.total > 0 ? moneyCompact(d.total) : ""}
                            </span>
                                <span className="db-bar-track">
                                <span
                                    className="db-bar"
                                    data-today={d.today}
                                    data-empty={d.total === 0}
                                    style={{ height: stats.weekMax ? `${Math.max((d.total / stats.weekMax) * 100, 6)}%` : "4px" }}
                                />
                            </span>
                                <span className="db-bar-label" data-today={d.today}>{d.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="db-recent">
                <h3 className="db-recent-title">Recent payments</h3>
                {recent.length === 0 ? (
                    <EmptyState
                        icon={FaMoneyBillWave}
                        title="No payments yet"
                        description="Payments from completed services will appear here."
                    />
                ) : (
                    <ul className="db-pay-list">
                        {recent.map((p, i) => {
                            const cfg = PAYMENT_STATUS[p.paymentStatus] || { label: prettify(p.paymentStatus) || "Pending", tone: "neutral" };
                            const isCash = String(p.paymentMethod || "").toUpperCase().includes("CASH");
                            const MethodIcon = isCash ? FaMoneyBillWave : FaCreditCard;
                            return (
                                <li className="db-pay" key={p.id ?? i}>
                                    <span className="db-pay-icon" data-tone={cfg.tone} aria-hidden="true">
                                        <MethodIcon />
                                    </span>
                                    <div className="db-pay-info">
                                        <p className="db-pay-title">Request #{p.quotation?.serviceRequest?.id || "—"}</p>
                                        <p className="db-pay-meta">
                                            {prettify(p.paymentMethod) || "Payment"} · {formatDate(paidOn(p))}
                                        </p>
                                    </div>
                                    <div className="db-pay-amount">
                                        <strong>{money(Number(p.amount))}</strong>
                                        <span className="db-badge db-badge-sm" data-tone={cfg.tone}>{cfg.label}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}

/* ================================================================== */
/* Loading                                                             */
/* ================================================================== */

function LoadingState() {
    return (
        <div className="db-root" aria-busy="true" aria-label="Loading dashboard">
            <div className="db-skeleton" style={{ height: 56, width: "55%" }} />
            <div className="db-skeleton" style={{ height: 120 }} />
            <div className="db-stats">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="db-skeleton" style={{ height: 88 }} />
                ))}
            </div>
            <div className="db-grid">
                <div className="db-skeleton" style={{ height: 380 }} />
                <div className="db-skeleton" style={{ height: 380 }} />
            </div>
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function DashboardContent() {
    const navigate = useNavigate();
    const showToast = useToast();
    const confirm = useConfirm();
    const { online, approved, updating, locationError, toggleAvailability } = useAvailability();

    const [profile, setProfile] = useState(null);
    const [requests, setRequests] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [partialFail, setPartialFail] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState("incoming");
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState(null);

    const knownPending = useRef(null);
    const pickedTab = useRef(false);
    const now = useNow();

    useDashboardFont();

    /* ---------------------------- data ---------------------------- */

    const load = useCallback(
        async (silent = false) => {
            const [p, r, pay] = await Promise.allSettled([getMyProfile(), getMyRequests(), getMyPayments()]);

            if (p.status === "fulfilled") setProfile(p.value.data);

            if (r.status === "fulfilled") {
                const rows = asList(r.value.data);
                setRequests(rows);

                const pending = rows.filter((x) => x.status === "PENDING").length;
                if (silent && knownPending.current !== null && pending > knownPending.current) {
                    showToast("New service request received.", "info");
                }
                knownPending.current = pending;

                // First load only: open the tab that actually has something in it.
                if (!pickedTab.current) {
                    pickedTab.current = true;
                    if (pending === 0) {
                        if (rows.some((x) => x.status === "IN_PROGRESS")) setActiveTab("active");
                        else if (rows.some((x) => x.status === "WAITING_FOR_QUOTATION")) setActiveTab("quotation");
                    }
                }
            }

            if (pay.status === "fulfilled") setPayments(asList(pay.value.data));

            const results = [p, r, pay];
            const failed = results.filter((x) => x.status === "rejected");
            failed.forEach((x) => console.error("Dashboard request failed:", x.reason));

            setPartialFail(failed.length > 0);
            if (failed.length < results.length) setLastUpdated(new Date());
            if (failed.length > 0 && !silent) {
                showToast("Some information couldn't be loaded. Please try again.", "error");
            }

            setLoading(false);
            setRefreshing(false);
        },
        [showToast]
    );

    useEffect(() => {
        load();
        const tick = () => {
            if (!document.hidden) load(true);
        };
        const id = setInterval(tick, POLL_MS);
        document.addEventListener("visibilitychange", tick);
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [load]);

    const handleRefresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        load();
    };

    /* --------------------------- derived --------------------------- */

    const groupsRaw = useMemo(
        () => ({
            incoming: requests.filter((r) => r.status === "PENDING"),
            active: requests.filter((r) => r.status === "IN_PROGRESS"),
            quotation: requests.filter((r) => r.status === "WAITING_FOR_QUOTATION")
        }),
        [requests]
    );

    const completedCount = useMemo(() => requests.filter((r) => r.status === "COMPLETED").length, [requests]);

    const needle = query.trim().toLowerCase();
    const groups = useMemo(() => {
        if (!needle) return groupsRaw;
        const hit = (r) =>
            [r.requestId, r.customerName, r.vehicle, r.issue, r.location].some((v) =>
                String(v ?? "").toLowerCase().includes(needle)
            );
        return {
            incoming: groupsRaw.incoming.filter(hit),
            active: groupsRaw.active.filter(hit),
            quotation: groupsRaw.quotation.filter(hit)
        };
    }, [groupsRaw, needle]);

    const openCount = groupsRaw.incoming.length + groupsRaw.active.length + groupsRaw.quotation.length;

    // Put the waiting-request count in the browser tab, so it's visible from other tabs.
    useEffect(() => {
        const original = document.title;
        const pending = groupsRaw.incoming.length;
        document.title = pending > 0 ? `(${pending}) Dashboard` : "Dashboard";
        return () => {
            document.title = original;
        };
    }, [groupsRaw.incoming.length]);

    /* --------------------------- actions --------------------------- */

    const handleAccept = async (id) => {
        const ok = await confirm({
            title: "Accept this request?",
            message: `The customer will be notified right away that you're taking request #${id}.`,
            tone: "success",
            confirmLabel: "Accept"
        });
        if (!ok) return;
        setBusy({ id, type: "accept" });
        try {
            await acceptRequest(id);
            await load(true);
            showToast(`Request #${id} accepted.`, "success");
            setActiveTab("active");
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to accept request.", "error");
        } finally {
            setBusy(null);
        }
    };

    const handleReject = async (id) => {
        const ok = await confirm({
            title: "Reject this request?",
            message: `Request #${id} will be declined. This can't be undone.`,
            confirmLabel: "Reject"
        });
        if (!ok) return;
        setBusy({ id, type: "reject" });
        try {
            await rejectRequest(id);
            await load(true);
            showToast(`Request #${id} rejected.`, "info");
        } catch (error) {
            showToast(error.response?.data?.message || "Failed to reject request.", "error");
        } finally {
            setBusy(null);
        }
    };

    const handlers = {
        onAccept: handleAccept,
        onReject: handleReject,
        onView: (id) => navigate(ROUTES.request(id)),
        onMessage: (id) => navigate(ROUTES.chat(id))
    };

    /* ---------------------------- render ---------------------------- */

    if (loading) return <LoadingState />;

    const today = new Date(now);
    const firstName = (profile?.user?.fullName || "Mechanic").trim().split(/\s+/)[0];
    const dateLabel = today.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    const refreshLabel = refreshing ? "Refreshing…" : "Refresh";

    return (
        <div className="db-root">
            {/* ------------------------ Header ------------------------ */}
            <header className="db-header">
                <div>
                    <p className="db-eyebrow">{dateLabel}</p>
                    <h1 className="db-title">
                        {greeting(today.getHours())}, {firstName}
                    </h1>
                    <p className="db-sub">
                        {openCount > 0
                            ? `You have ${openCount} open ${openCount === 1 ? "request" : "requests"} today.`
                            : "No open requests right now. We'll tell you the moment one arrives."}
                    </p>
                </div>

                <div className="db-header-meta">
                    {lastUpdated && (
                        <span className="db-updated" aria-live="polite">
                            <span className="db-live-dot" aria-hidden="true" />
                            Updated {timeAgo(lastUpdated, now)}
                        </span>
                    )}
                    <button
                        type="button"
                        className="db-btn db-btn-secondary db-btn-sm db-refresh"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        aria-busy={refreshing}
                    >
                        <FaSyncAlt aria-hidden="true" className={refreshing ? "db-spin" : ""} />
                        <span>{refreshLabel}</span>
                    </button>
                </div>
            </header>

            {/* ------------------------ Alerts ------------------------ */}
            {(!profile || (profile && !approved) || partialFail || (online && locationError)) && (
                <div className="db-alerts">
                    {!profile && (
                        <Notice
                            tone="warning"
                            role="alert"
                            title="Profile unavailable"
                            action={
                                <button type="button" className="db-btn db-btn-secondary db-btn-sm" onClick={handleRefresh}>
                                    Try again
                                </button>
                            }
                        >
                            We couldn't load your profile.
                        </Notice>
                    )}
                    {profile && !approved && (
                        <Notice tone="info" icon={FaHourglassHalf} title="Waiting for verification">
                            An admin needs to approve your account before you can go online.
                        </Notice>
                    )}
                    {profile && partialFail && (
                        <Notice tone="warning" title="Some data is out of date">
                            We couldn't refresh everything. What you see may be a little behind.
                        </Notice>
                    )}
                    {online && locationError && (
                        <Notice tone="danger" role="alert" title="Location signal weak">
                            {locationError}
                        </Notice>
                    )}
                </div>
            )}

            {/* ------------------------- Hero ------------------------- */}
            {profile && (
                <AvailabilityHero
                    profile={profile}
                    online={online}
                    approved={approved}
                    updating={updating}
                    onToggle={toggleAvailability}
                />
            )}

            {/* ------------------------- Stats ------------------------ */}
            <nav className="db-stats" aria-label="Request summary">
                <StatCard
                    icon={FaClipboardList}
                    label="Total requests"
                    value={requests.length}
                    hint="View all requests"
                    tone="neutral"
                    to={ROUTES.requests}
                />
                <StatCard
                    icon={FaHourglassHalf}
                    label="Pending"
                    value={groupsRaw.incoming.length}
                    hint="View pending requests"
                    tone="warning"
                    to={`${ROUTES.requests}?status=PENDING`}
                />
                <StatCard
                    icon={FaTools}
                    label="In progress"
                    value={groupsRaw.active.length}
                    hint="View jobs in progress"
                    tone="primary"
                    to={`${ROUTES.requests}?status=IN_PROGRESS`}
                />
                <StatCard
                    icon={FaCheckCircle}
                    label="Completed"
                    value={completedCount}
                    hint="View completed jobs"
                    tone="success"
                    to={`${ROUTES.requests}?status=COMPLETED`}
                />
            </nav>

            {/* ------------------- Requests + Earnings ------------------ */}
            <div className="db-grid">
                <RequestsPanel
                    groups={groups}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    query={query}
                    setQuery={setQuery}
                    totalCount={openCount}
                    busy={busy}
                    now={now}
                    handlers={handlers}
                />
                <EarningsPanel payments={payments} />
            </div>
        </div>
    );
}

function Dashboard() {
    return (
        <MechanicLayout>
            <DashboardContent />
        </MechanicLayout>
    );
}

export default Dashboard;