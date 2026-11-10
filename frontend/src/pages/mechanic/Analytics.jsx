import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    FaArrowLeft,
    FaChevronLeft,
    FaChevronRight,
    FaSyncAlt,
    FaExclamationTriangle,
    FaClipboardList,
    FaCheckCircle,
    FaBolt,
    FaBan,
    FaMoneyBillWave,
    FaHourglassHalf,
    FaHandHoldingUsd,
    FaCommentSlash,
    FaWifi
} from "react-icons/fa";
import { getMyAnalytics } from "../../services/mechanicService";
import "../../styles/Analytics.css";

/* ================================================================== */
/* Config + helpers                                                    */
/* ================================================================== */

const PERIODS = [
    { key: "7", label: "7 days" },
    { key: "30", label: "30 days" },
    { key: "90", label: "90 days" },
    { key: "all", label: "All time" }
];

const PAGE_SIZE = 8;

const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);

const pretty = (value) => String(value || "").replaceAll("_", " ").toLowerCase();

// Colour a status by what it means, so the page can be read at a glance.
const toneFor = (value = "") => {
    const v = String(value).toUpperCase();
    if (["COMPLETED", "CLOSED", "SUCCESS", "PAID", "RESOLVED"].some((k) => v.includes(k))) return "success";
    if (["CANCELLED", "REJECTED", "FAILED"].some((k) => v.includes(k))) return "danger";
    if (["PENDING", "WAITING", "CREATED", "OPEN"].some((k) => v.includes(k))) return "warning";
    if (["PROGRESS", "ACCEPTED"].some((k) => v.includes(k))) return "accent";
    return "neutral";
};

// A tile with a `to` is a link: tapping it opens the matching list.
function Tile({ icon: Icon, title, value, subtitle, tone, to }) {
    const body = (
        <>
            <div className="an-tile-top">
                <span className="an-tile-ico"><Icon aria-hidden="true" /></span>
                {title}
                {to && <FaChevronRight className="an-tile-go" aria-hidden="true" />}
            </div>
            <div className="an-tile-value">{value}</div>
            {subtitle && <p className="an-tile-sub">{subtitle}</p>}
        </>
    );

    return to ? (
        <Link className="an-tile an-tile-link" data-tone={tone} to={to}>{body}</Link>
    ) : (
        <div className="an-tile" data-tone={tone}>{body}</div>
    );
}

function BarList({ entries, format = (v) => v, toneOf, showShare = true, hrefOf }) {
    const total = entries.reduce((s, [, v]) => s + (Number(v) || 0), 0);
    const max = Math.max(...entries.map(([, v]) => Number(v) || 0), 1);

    return (
        <div className="an-bars">
            {entries.map(([name, value]) => {
                const n = Number(value) || 0;
                const share = total ? Math.round((n / total) * 100) : 0;
                const href = hrefOf?.(name);
                const Wrap = href ? Link : "div";
                const wrapProps = href ? { to: href, className: "an-bar-link" } : {};
                return (
                    <Wrap key={name} {...wrapProps}>
                        <div className="an-bar-top">
                            <span className="an-bar-name">{pretty(name)}</span>
                            <span className="an-bar-val">
                                {format(n)}
                                {showShare && <small>{share}%</small>}
                            </span>
                        </div>
                        <div className="an-track" role="img" aria-label={`${pretty(name)}: ${format(n)} (${share}%)`}>
                            <span className="an-fill" data-tone={toneOf ? toneOf(name) : undefined} style={{ "--w": `${(n / max) * 100}%` }} />
                        </div>
                    </Wrap>
                );
            })}
        </div>
    );
}

const sortedEntries = (obj) => Object.entries(obj ?? {}).sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));

/* ---------- Weekly chart ---------- */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PAID_STATES = ["SUCCESS", "PAID"];

const startOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // weeks start on Monday
    return d;
};

const compactMoney = (n) => {
    if (n >= 100000) return `₹${+(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${+(n / 1000).toFixed(1)}k`;
    return `₹${Math.round(n)}`;
};

// Pick tidy axis steps (1, 2, 5 or 10 times a power of ten) so gridlines read cleanly.
const niceScale = (max, integer) => {
    const raw = Math.max(max, integer ? 4 : 400) / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const norm = raw / mag;
    let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    if (integer) step = Math.max(1, Math.ceil(step));
    return { step, top: step * 4 };
};

const shortDate = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function WeekChart({ services }) {
    const [metric, setMetric] = useState("services");
    const [offset, setOffset] = useState(0); // 0 = this week, -1 = last week...
    const [picked, setPicked] = useState(null);

    const weekStart = useMemo(() => {
        const s = startOfWeek(new Date());
        s.setDate(s.getDate() + offset * 7);
        return s;
    }, [offset]);

    const buckets = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) => {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const key = date.toDateString();
                const items = services.filter((s) => s.date && new Date(s.date).toDateString() === key);
                const earnings = items
                    .filter((s) => PAID_STATES.includes(String(s.paymentStatus || "").toUpperCase()))
                    .reduce((t, s) => t + (Number(s.amount) || 0), 0);
                return { date, items, count: items.length, earnings };
            }),
        [weekStart, services]
    );

    const isEarnings = metric === "earnings";
    const values = buckets.map((b) => (isEarnings ? b.earnings : b.count));
    const weekTotal = values.reduce((a, b) => a + b, 0);
    const { step, top } = niceScale(Math.max(...values, 0), !isEarnings);
    const fmt = isEarnings ? compactMoney : (v) => String(v);

    const todayIndex = (new Date().getDay() + 6) % 7;
    const lastWithData = buckets.reduce((last, b, i) => (b.count ? i : last), 0);
    const active = picked ?? (offset === 0 ? todayIndex : lastWithData);
    const activeBucket = buckets[active];

    const go = (delta) => {
        setOffset((o) => Math.min(0, Math.max(-52, o + delta)));
        setPicked(null);
    };

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekLabel = offset === 0 ? "This week" : offset === -1 ? "Last week" : `${shortDate(weekStart)} – ${shortDate(weekEnd)}`;

    return (
        <section className="an-panel an-week" aria-label="Weekly activity">
            <div className="an-panel-head">
                <h2 className="an-panel-title">Weekly activity</h2>
                <div className="an-segment an-segment-sm" role="group" aria-label="Chart shows">
                    <button type="button" className="an-seg-btn" aria-pressed={!isEarnings} onClick={() => setMetric("services")}>Services</button>
                    <button type="button" className="an-seg-btn" aria-pressed={isEarnings} onClick={() => setMetric("earnings")}>Earnings</button>
                </div>
            </div>

            <div className="an-week-hero" aria-live="polite">
                <p className="an-week-big">
                    {isEarnings ? money(values[active]) : `${values[active]} service${values[active] === 1 ? "" : "s"}`}
                </p>
                <p className="an-week-date">
                    {activeBucket.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </p>
            </div>

            <div className="an-chart">
                <div className="an-chart-grid" aria-hidden="true">
                    {[4, 3, 2, 1, 0].map((i) => (
                        <div key={i} className="an-grid-line"><span>{fmt(step * i)}</span></div>
                    ))}
                </div>
                <div className="an-cols-row">
                    {buckets.map((b, i) => (
                        <button
                            key={DAY_LABELS[i]}
                            type="button"
                            className="an-col"
                            data-active={i === active}
                            aria-pressed={i === active}
                            aria-label={`${DAY_LABELS[i]} ${shortDate(b.date)}: ${isEarnings ? money(values[i]) : `${values[i]} services`}`}
                            onClick={() => setPicked(i)}
                        >
                            <span className="an-col-track">
                                <span className="an-col-bar" style={{ height: `${values[i] ? Math.max(4, (values[i] / top) * 100) : 0}%` }} />
                            </span>
                            <span className="an-col-label">{DAY_LABELS[i]}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="an-week-nav">
                <button type="button" className="an-round" onClick={() => go(-1)} disabled={offset <= -52} aria-label="Previous week">
                    <FaChevronLeft aria-hidden="true" />
                </button>
                <div className="an-week-nav-label">
                    <strong>{weekLabel}</strong>
                    <span>{isEarnings ? money(weekTotal) : `${weekTotal} service${weekTotal === 1 ? "" : "s"}`} this week</span>
                </div>
                <button type="button" className="an-round" onClick={() => go(1)} disabled={offset >= 0} aria-label="Next week">
                    <FaChevronRight aria-hidden="true" />
                </button>
            </div>

            <div className="an-day">
                <h3 className="an-subhead">{activeBucket.items.length ? `On ${shortDate(activeBucket.date)}` : "That day"}</h3>
                {activeBucket.items.length === 0 ? (
                    <p className="an-empty">No services on this day.</p>
                ) : (
                    <ul className="an-day-list">
                        {activeBucket.items.slice(0, 5).map((s) => (
                            <li key={s.requestId}>
                                <Link to={`/mechanic/requests/${s.requestId}`} className="an-day-row">
                                    <span className="an-day-id">#{s.requestId}</span>
                                    <span className="an-day-text">{s.vehicle || s.issue || "Service"}</span>
                                    {s.amount != null && <span className="an-amount">{money(s.amount)}</span>}
                                    <FaChevronRight aria-hidden="true" className="an-day-go" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="an-week-note">Based on your recent service history.</p>
            </div>
        </section>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

export default function MechanicAnalytics() {
    const [period, setPeriod] = useState("30");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0); // bumping this refetches (the old Retry button never did)
    const [shown, setShown] = useState(PAGE_SIZE);
    const navigate = useNavigate();
    const location = useLocation();

    // Back to wherever the person came from; if the page was opened directly, go to the dashboard.
    const handleBack = () => {
        if (location.key !== "default") navigate(-1);
        else navigate("/mechanic/dashboard");
    };

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");

        getMyAnalytics(period)
            .then((response) => {
                if (active) {
                    setData(response.data);
                    setShown(PAGE_SIZE);
                }
            })
            .catch((err) => {
                if (active) {
                    setError(err.response?.data?.message || "Unable to load analytics. Please try again.");
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [period, reload]);

    const summary = data?.summary ?? {};
    const earnings = data?.earnings ?? {};
    const complaints = data?.complaints ?? {};
    const trends = data?.trends ?? {};
    const services = useMemo(() => data?.recentServices ?? [], [data]);

    const statusEntries = useMemo(() => sortedEntries(trends.requestStatuses), [trends.requestStatuses]);
    const methodEntries = useMemo(() => sortedEntries(earnings.earningsByMethod), [earnings.earningsByMethod]);
    const reasonEntries = useMemo(() => sortedEntries(complaints.byReason), [complaints.byReason]);

    const completion = Math.max(0, Math.min(100, Number(summary.completionRate) || 0));
    const CIRC = 2 * Math.PI * 42;
    const periodLabel = PERIODS.find((p) => p.key === period)?.label || "";

    /* ---------- states ---------- */

    if (loading && !data) {
        return (
            <main className="an-root" aria-busy="true" aria-label="Loading analytics">
                <div className="an-skel" style={{ height: 56, width: "40%" }} />
                <div className="an-skel" style={{ height: 190 }} />
                <div className="an-grid">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="an-skel" style={{ height: 108 }} />)}
                </div>
            </main>
        );
    }

    if (error && !data) {
        return (
            <main className="an-root">
                <div className="an-error" role="alert">
                    <FaExclamationTriangle className="an-error-ico" aria-hidden="true" />
                    <div>
                        <p className="an-error-title">Couldn't load analytics</p>
                        <p className="an-error-text">{error}</p>
                        <button type="button" className="an-btn" onClick={() => setReload((n) => n + 1)}>
                            <FaSyncAlt aria-hidden="true" /> Try again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const hasEarningsAlert = Number(earnings.cashPendingConfirmations) > 0;

    return (
        <main className="an-root">
            <button type="button" className="an-back" onClick={handleBack}>
                <FaArrowLeft aria-hidden="true" /> Back
            </button>

            <header className="an-header">
                <div>
                    <p className="an-eyebrow">Performance</p>
                    <h1 className="an-title">Analytics</h1>
                    <p className="an-sub">
                        {loading ? (
                            <span className="an-updating"><FaSyncAlt className="an-spin" aria-hidden="true" /> Updating…</span>
                        ) : (
                            `Your service performance and earnings · ${periodLabel.toLowerCase()}`
                        )}
                    </p>
                </div>

                <div className="an-segment" role="group" aria-label="Analytics date range">
                    {PERIODS.map((p) => (
                        <button key={p.key} type="button" className="an-seg-btn" aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </header>

            {error && (
                <div className="an-banner" role="status">
                    <FaWifi aria-hidden="true" /> {error} Showing the last loaded data.
                </div>
            )}

            <div className="an-in" style={{ display: "flex", flexDirection: "column", gap: 22 }} key={period}>
                {/* Earnings hero */}
                <section className="an-hero" aria-label="Earnings">
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <p className="an-hero-label">Total earnings</p>
                        <p className="an-hero-value">{money(earnings.totalEarnings)}</p>
                        <p className="an-hero-note">
                            from {earnings.successfulPayments ?? 0} successful payment{(earnings.successfulPayments ?? 0) === 1 ? "" : "s"}
                        </p>
                    </div>
                    <div className="an-hero-side">
                        <Link className="an-hero-chip" to="/mechanic/requests?status=COMPLETED">
                            <span>Pending payments</span>
                            <strong>{earnings.pendingPayments ?? 0}</strong>
                        </Link>
                        <Link className="an-hero-chip" data-alert={hasEarningsAlert} to="/mechanic/requests?status=COMPLETED">
                            <span>Cash to confirm</span>
                            <strong>{earnings.cashPendingConfirmations ?? 0}</strong>
                        </Link>
                    </div>
                </section>

                {/* KPI tiles */}
                <section className="an-grid" aria-label="Key numbers">
                    <Tile icon={FaClipboardList} tone="accent" title="Total requests" value={summary.totalRequests ?? 0} to="/mechanic/requests" />
                    <Tile icon={FaCheckCircle} tone="success" title="Completed" value={summary.completedServices ?? 0} to="/mechanic/requests?status=COMPLETED,CLOSED" />
                    <Tile icon={FaBolt} tone="warning" title="Active now" value={summary.activeRequests ?? 0} to="/mechanic/requests?status=ACCEPTED,IN_PROGRESS" />
                    <Tile icon={FaBan} tone="danger" title="Cancelled / rejected" value={summary.cancelledOrRejected ?? 0} to="/mechanic/requests?status=REJECTED,CANCELLED" />
                </section>

                <WeekChart services={services} />

                <div className="an-cols">
                    {/* Completion + status */}
                    <section className="an-panel">
                        <div className="an-panel-head">
                            <h2 className="an-panel-title">Completion rate</h2>
                        </div>
                        <div className="an-ring-wrap">
                            <div className="an-ring" role="img" aria-label={`Completion rate ${completion}%`}>
                                <svg viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="an-grad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#3b5bfd" />
                                            <stop offset="100%" stopColor="#7a5cff" />
                                        </linearGradient>
                                    </defs>
                                    <circle className="an-ring-bg" cx="50" cy="50" r="42" />
                                    <circle className="an-ring-fg" cx="50" cy="50" r="42" strokeDasharray={`${(completion / 100) * CIRC} ${CIRC}`} />
                                </svg>
                                <div className="an-ring-center">
                                    <strong>{completion}%</strong>
                                    <span>completed</span>
                                </div>
                            </div>
                            <div className="an-legend">
                                <div className="an-legend-row"><span><i style={{ background: "#3b5bfd" }} /> Completed</span><strong>{summary.completedServices ?? 0}</strong></div>
                                <div className="an-legend-row"><span><i style={{ background: "#f59e0b" }} /> Active</span><strong>{summary.activeRequests ?? 0}</strong></div>
                                <div className="an-legend-row"><span><i style={{ background: "#ef4444" }} /> Cancelled / rejected</span><strong>{summary.cancelledOrRejected ?? 0}</strong></div>
                            </div>
                        </div>
                    </section>

                    <section className="an-panel">
                        <div className="an-panel-head">
                            <h2 className="an-panel-title">Request status</h2>
                            <span className="an-panel-meta">{statusEntries.length} type{statusEntries.length === 1 ? "" : "s"}</span>
                        </div>
                        {statusEntries.length === 0 ? (
                            <p className="an-empty">No request data for this period.</p>
                        ) : (
                            <BarList
                                entries={statusEntries}
                                toneOf={toneFor}
                                hrefOf={(status) => `/mechanic/requests?status=${encodeURIComponent(String(status).toUpperCase())}`}
                            />
                        )}
                    </section>

                    {/* Earnings by method + complaints */}
                    <section className="an-panel">
                        <div className="an-panel-head">
                            <h2 className="an-panel-title">Earnings by payment method</h2>
                        </div>
                        {methodEntries.length === 0 ? (
                            <p className="an-empty">No successful payments for this period.</p>
                        ) : (
                            <BarList entries={methodEntries} format={money} toneOf={() => "success"} />
                        )}
                    </section>

                    <section className="an-panel">
                        <div className="an-panel-head">
                            <h2 className="an-panel-title">Complaints</h2>
                            <span className="an-panel-meta">{complaints.total ?? 0} total</span>
                        </div>
                        <div className="an-mini">
                            <div className="an-mini-tile"><strong>{complaints.open ?? 0}</strong><span>Open</span></div>
                            <div className="an-mini-tile"><strong>{complaints.inProgress ?? 0}</strong><span>In progress</span></div>
                            <div className="an-mini-tile"><strong>{complaints.resolved ?? 0}</strong><span>Resolved</span></div>
                        </div>
                        <h3 className="an-subhead">Reasons</h3>
                        {reasonEntries.length === 0 ? (
                            <p className="an-empty">
                                <FaCommentSlash aria-hidden="true" style={{ marginRight: 8 }} />
                                No complaints. Nice work!
                            </p>
                        ) : (
                            <BarList entries={reasonEntries} toneOf={() => "warning"} />
                        )}
                    </section>
                </div>

                {/* Recent services */}
                <section className="an-panel">
                    <div className="an-panel-head">
                        <h2 className="an-panel-title">Recent service history</h2>
                        <span className="an-panel-meta">{services.length} service{services.length === 1 ? "" : "s"}</span>
                    </div>

                    {services.length === 0 ? (
                        <p className="an-empty">No services found for this period.</p>
                    ) : (
                        <>
                            <div className="an-table-wrap">
                                <table className="an-table">
                                    <thead>
                                    <tr>
                                        <th>Request</th>
                                        <th>Date</th>
                                        <th>Vehicle</th>
                                        <th>Issue</th>
                                        <th>Status</th>
                                        <th>Payment</th>
                                        <th>Amount</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {services.slice(0, shown).map((s) => (
                                        <tr key={s.requestId}>
                                            <td><Link className="an-link" to={`/mechanic/requests/${s.requestId}`}>#{s.requestId}</Link></td>
                                            <td>{s.date ? new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
                                            <td>{s.vehicle || "—"}</td>
                                            <td><div className="an-issue" title={s.issue || ""}>{s.issue || "—"}</div></td>
                                            <td>{s.status ? <span className="an-pill" data-tone={toneFor(s.status)}>{pretty(s.status)}</span> : "—"}</td>
                                            <td>{s.paymentStatus ? <span className="an-pill" data-tone={toneFor(s.paymentStatus)}>{pretty(s.paymentStatus)}</span> : "—"}</td>
                                            <td className="an-amount">{s.amount == null ? "—" : money(s.amount)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Phones get cards instead of a wide table */}
                            <div className="an-cards">
                                {services.slice(0, shown).map((s) => (
                                    <Link key={s.requestId} className="an-card" to={`/mechanic/requests/${s.requestId}`}>
                                        <div className="an-card-top">
                                            <span className="an-card-id">#{s.requestId}</span>
                                            {s.status && <span className="an-pill" data-tone={toneFor(s.status)}>{pretty(s.status)}</span>}
                                        </div>
                                        <p className="an-card-vehicle">{s.vehicle || "Vehicle unavailable"}</p>
                                        <p className="an-card-issue">{s.issue || "No description"}</p>
                                        <div className="an-card-bottom">
                                            <span>{s.date ? new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span>
                                            <span className="an-amount">{s.amount == null ? "—" : money(s.amount)}</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {services.length > shown && (
                                <button type="button" className="an-btn an-more" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                                    Show more ({services.length - shown} left)
                                </button>
                            )}
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}