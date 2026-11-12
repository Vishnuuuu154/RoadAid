import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import { getDashboard } from "../../services/adminService";

import {
    FaSyncAlt,
    FaShieldAlt,
    FaUsers,
    FaTools,
    FaClipboardList,
    FaBolt,
    FaRupeeSign,
    FaExclamationTriangle,
    FaChevronRight,
    FaArrowRight,
    FaCheckCircle,
    FaCommentDots
} from "react-icons/fa";

import "../../styles/adminDash.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const POLL_MS = 60000;

/* Every link on this page lives here. Same paths as before. */
const ROUTES = {
    customers: "/admin/users",
    mechanics: "/admin/users/mechanics",
    onlineMechanics: "/admin/users/mechanics?available=true",
    verification: "/admin/provider-verification",
    requests: "/admin/requests",
    requestsBy: (status) => `/admin/requests?status=${status}`,
    payments: "/admin/payments?status=SUCCESS",
    complaints: "/admin/complaints"
};

const NUMERIC_FIELDS = [
    "totalCustomers",
    "totalMechanics",
    "totalRequests",
    "pendingRequests",
    "completedRequests",
    "cancelledRequests",
    "inProgressRequests",
    "quotationPendingRequests",
    "totalComplaints",
    "totalPayments",
    "onlineMechanics",
    "totalRevenue",
    "pendingProviders"
];

/* Amber stays reserved for "pending", the thing that most needs attention. */
const STATUS_ROWS = [
    { key: "pending", label: "Pending", field: "pendingRequests", query: "PENDING", color: "#e8912a" },
    { key: "quotation", label: "Awaiting quotation", field: "quotationPendingRequests", query: "QUOTATION_PENDING", color: "#3b6fd8" },
    { key: "inProgress", label: "In progress", field: "inProgressRequests", query: "IN_PROGRESS", color: "#6d5bd0" },
    { key: "completed", label: "Completed", field: "completedRequests", query: "COMPLETED", color: "#1f9d63" },
    { key: "cancelled", label: "Cancelled", field: "cancelledRequests", query: "CANCELLED", color: "#d6393f" }
];

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const number = (n) => new Intl.NumberFormat("en-IN").format(n || 0);

const currency = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const plural = (n, one, many = `${one}s`) => `${number(n)} ${n === 1 ? one : many}`;

const percent = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);

/* The API may leave a field out; treat anything missing as zero. */
const normalize = (data = {}) => Object.fromEntries(NUMERIC_FIELDS.map((key) => [key, Number(data[key]) || 0]));

function timeAgo(date, now) {
    if (!date) return "";
    const sec = Math.max(0, Math.round((now - date.getTime()) / 1000));
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.round(min / 60)}h ago`;
}

/* Loads the page font once. Safe to call from several components. */
function usePageFont() {
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

function StatCard({ icon: Icon, label, value, hint, to }) {
    return (
        <Link to={to} className="dsh-stat" aria-label={`${label}: ${value}. ${hint}`}>
            <span className="dsh-stat-top">
                <span className="dsh-stat-label">{label}</span>
                <span className="dsh-stat-icon" aria-hidden="true">
                    <Icon />
                </span>
            </span>
            <span className="dsh-stat-value">{value}</span>
            <span className="dsh-stat-hint">{hint}</span>
        </Link>
    );
}

function AttentionPanel({ items }) {
    if (items.length === 0) {
        return (
            <section className="dsh-attention" data-state="clear" aria-label="Needs your attention">
                <span className="dsh-attention-icon" aria-hidden="true">
                    <FaCheckCircle />
                </span>
                <div>
                    <h2 className="dsh-attention-title">All clear</h2>
                    <p className="dsh-attention-text">Nothing needs your attention right now.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="dsh-attention" data-state="alert" aria-label="Needs your attention">
            <div className="dsh-attention-head">
                <h2 className="dsh-attention-title">Needs your attention</h2>
                <span className="dsh-attention-count">{items.length}</span>
            </div>

            <ul className="dsh-attention-list">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <li key={item.key}>
                            <Link to={item.to} className="dsh-attention-item">
                                <span className="dsh-attention-item-icon" aria-hidden="true">
                                    <Icon />
                                </span>
                                <span className="dsh-attention-item-text">
                                    <strong>{item.title}</strong>
                                    <span>{item.text}</span>
                                </span>
                                <span className="dsh-attention-cta">
                                    {item.cta} <FaArrowRight aria-hidden="true" />
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

function StatusPanel({ data }) {
    const known = STATUS_ROWS.reduce((sum, row) => sum + data[row.field], 0);
    // Some requests may be in a state this page doesn't list (for example rejected).
    const other = Math.max(data.totalRequests - known, 0);
    const total = Math.max(data.totalRequests, known);

    const rows = [
        ...STATUS_ROWS.map((row) => ({ ...row, value: data[row.field], to: ROUTES.requestsBy(row.query) })),
        ...(other > 0
            ? [{ key: "other", label: "Other", value: other, color: "#9aa0ac", to: ROUTES.requests }]
            : [])
    ];

    const completionRate = percent(data.completedRequests, total);
    const cancelRate = percent(data.cancelledRequests, total);

    return (
        <section className="dsh-panel" aria-labelledby="dsh-status-title">
            <div className="dsh-panel-head">
                <div>
                    <h2 className="dsh-panel-title" id="dsh-status-title">Request status</h2>
                    <p className="dsh-panel-sub">Where every request stands right now</p>
                </div>
                <Link to={ROUTES.requests} className="dsh-link">
                    {number(data.totalRequests)} total <FaArrowRight aria-hidden="true" />
                </Link>
            </div>

            {total === 0 ? (
                <p className="dsh-empty">No requests yet. They'll show up here as customers ask for help.</p>
            ) : (
                <>
                    <div
                        className="dsh-stack"
                        role="img"
                        aria-label={`Request status split: ${rows.map((r) => `${r.label} ${r.value}`).join(", ")}`}
                    >
                        {rows
                            .filter((r) => r.value > 0)
                            .map((r) => (
                                <span
                                    key={r.key}
                                    className="dsh-stack-seg"
                                    style={{ width: `${(r.value / total) * 100}%`, background: r.color }}
                                />
                            ))}
                    </div>

                    <div className="dsh-rates">
                        <span className="dsh-rate" data-tone="good">
                            <strong>{completionRate}%</strong> completed
                        </span>
                        <span className="dsh-rate" data-tone={cancelRate >= 20 ? "bad" : "neutral"}>
                            <strong>{cancelRate}%</strong> cancelled
                        </span>
                    </div>

                    <ul className="dsh-status-list">
                        {rows.map((r) => (
                            <li key={r.key}>
                                <Link to={r.to} className="dsh-status-row">
                                    <span className="dsh-status-dot" style={{ background: r.color }} aria-hidden="true" />
                                    <span className="dsh-status-label">{r.label}</span>
                                    <span className="dsh-status-pct">{percent(r.value, total)}%</span>
                                    <strong className="dsh-status-value">{number(r.value)}</strong>
                                    <FaChevronRight className="dsh-status-go" aria-hidden="true" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}

function RevenuePanel({ data }) {
    return (
        <Link to={ROUTES.payments} className="dsh-revenue" aria-label={`Total revenue ${currency(data.totalRevenue)}. View payments`}>
            <span className="dsh-revenue-top">
                <span className="dsh-revenue-label">Total revenue</span>
                <span className="dsh-revenue-icon" aria-hidden="true">
                    <FaRupeeSign />
                </span>
            </span>
            <span className="dsh-revenue-value">{currency(data.totalRevenue)}</span>
            <span className="dsh-revenue-note">From successful payments</span>
            <span className="dsh-revenue-foot">
                <span>
                    <span className="dsh-revenue-foot-label">Payment transactions</span>
                    <strong>{number(data.totalPayments)}</strong>
                </span>
                <span className="dsh-revenue-cta">
                    View payments <FaArrowRight aria-hidden="true" />
                </span>
            </span>
        </Link>
    );
}

function ComplaintsPanel({ data }) {
    return (
        <Link to={ROUTES.complaints} className="dsh-complaints" aria-label={`Complaints: ${data.totalComplaints}. View complaints`}>
            <span className="dsh-complaints-top">
                <span className="dsh-complaints-label">Complaints</span>
                <span className="dsh-complaints-icon" aria-hidden="true">
                    <FaCommentDots />
                </span>
            </span>
            <span className="dsh-complaints-value">{number(data.totalComplaints)}</span>
            <span className="dsh-complaints-note">Total complaints submitted</span>
            <span className="dsh-complaints-cta">
                View complaints <FaArrowRight aria-hidden="true" />
            </span>
        </Link>
    );
}

function LoadingState() {
    return (
        <div className="dsh-root" aria-busy="true" aria-label="Loading admin dashboard">
            <div className="dsh-skeleton" style={{ height: 56, width: "45%" }} />
            <div className="dsh-skeleton" style={{ height: 96 }} />
            <div className="dsh-stats">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="dsh-skeleton" style={{ height: 124 }} />
                ))}
            </div>
            <div className="dsh-grid">
                <div className="dsh-skeleton" style={{ height: 380 }} />
                <div className="dsh-skeleton" style={{ height: 380 }} />
            </div>
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function DashboardContent() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const now = useNow();

    usePageFont();

    const load = useCallback(async (mode = "initial") => {
        if (mode === "refresh") setRefreshing(true);
        try {
            const response = await getDashboard();
            setData(normalize(response.data));
            setLastUpdated(new Date());
            setError("");
        } catch (err) {
            console.error("Failed to load admin dashboard:", err);
            // A background refresh failing shouldn't wipe the screen; only say what went wrong.
            if (mode !== "silent") setError(err.response?.data?.message || "Failed to load dashboard.");
            else setError("We couldn't refresh just now.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const tick = () => {
            if (!document.hidden) load("silent");
        };
        const id = setInterval(tick, POLL_MS);
        document.addEventListener("visibilitychange", tick);
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [load]);

    const attention = useMemo(() => {
        if (!data) return [];
        const items = [];
        if (data.pendingProviders > 0) {
            items.push({
                key: "providers",
                icon: FaShieldAlt,
                title: `${plural(data.pendingProviders, "provider")} waiting for approval`,
                text: "Mechanics can't sign in or take jobs until you approve them.",
                cta: "Review",
                to: ROUTES.verification
            });
        }
        if (data.pendingRequests > 0) {
            items.push({
                key: "requests",
                icon: FaClipboardList,
                title: `${plural(data.pendingRequests, "request")} still pending`,
                text: "Requests that haven't been accepted by a mechanic yet.",
                cta: "View",
                to: ROUTES.requestsBy("PENDING")
            });
        }
        return items;
    }, [data]);

    if (loading) return <LoadingState />;

    // Nothing to show at all: full error page.
    if (!data) {
        return (
            <div className="dsh-root">
                <div className="dsh-error" role="alert">
                    <FaExclamationTriangle className="dsh-error-icon" aria-hidden="true" />
                    <div>
                        <h2 className="dsh-error-title">Unable to load dashboard</h2>
                        <p className="dsh-error-text">{error}</p>
                        <button type="button" className="dsh-btn dsh-btn-danger" onClick={() => load("refresh")}>
                            <FaSyncAlt aria-hidden="true" className={refreshing ? "dsh-spin" : ""} /> Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const onlinePct = percent(data.onlineMechanics, data.totalMechanics);
    const dateLabel = new Date(now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

    return (
        <div className="dsh-root">
            {/* ------------------------ Header ------------------------ */}
            <header className="dsh-header">
                <div>
                    <p className="dsh-eyebrow">{dateLabel}</p>
                    <h1 className="dsh-title">Admin dashboard</h1>
                    <p className="dsh-sub">Monitor RoadAid activity and system performance.</p>
                </div>

                <div className="dsh-header-meta">
                    {lastUpdated && (
                        <span className="dsh-updated" aria-live="polite">
                            <span className="dsh-live-dot" aria-hidden="true" />
                            Updated {timeAgo(lastUpdated, now)}
                        </span>
                    )}
                    <button
                        type="button"
                        className="dsh-btn dsh-btn-secondary"
                        onClick={() => load("refresh")}
                        disabled={refreshing}
                        aria-busy={refreshing}
                    >
                        <FaSyncAlt aria-hidden="true" className={refreshing ? "dsh-spin" : ""} />
                        <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
                    </button>
                </div>
            </header>

            {error && (
                <div className="dsh-notice" role="alert">
                    <FaExclamationTriangle aria-hidden="true" />
                    <p>
                        <strong>{error}</strong> Showing the last data we had.
                    </p>
                    <button type="button" className="dsh-btn dsh-btn-secondary dsh-btn-sm" onClick={() => load("refresh")}>
                        Try again
                    </button>
                </div>
            )}

            {/* ------------------------ Attention ------------------------ */}
            <AttentionPanel items={attention} />

            {/* ------------------------ Key numbers ------------------------ */}
            <nav className="dsh-stats" aria-label="Key numbers">
                <StatCard
                    icon={FaUsers}
                    label="Customers"
                    value={number(data.totalCustomers)}
                    hint="View all customers"
                    to={ROUTES.customers}
                />
                <StatCard
                    icon={FaTools}
                    label="Mechanics"
                    value={number(data.totalMechanics)}
                    hint="View all mechanics"
                    to={ROUTES.mechanics}
                />
                <StatCard
                    icon={FaBolt}
                    label="Online now"
                    value={number(data.onlineMechanics)}
                    hint={data.totalMechanics ? `${onlinePct}% of mechanics` : "No mechanics yet"}
                    to={ROUTES.onlineMechanics}
                />
                <StatCard
                    icon={FaClipboardList}
                    label="Total requests"
                    value={number(data.totalRequests)}
                    hint="View all requests"
                    to={ROUTES.requests}
                />
            </nav>

            {/* ------------------------ Details ------------------------ */}
            <div className="dsh-grid">
                <StatusPanel data={data} />

                <div className="dsh-side">
                    <RevenuePanel data={data} />
                    <ComplaintsPanel data={data} />
                </div>
            </div>
        </div>
    );
}

function Dashboard() {
    return (
        <AdminLayout>
            <DashboardContent />
        </AdminLayout>
    );
}

export default Dashboard;