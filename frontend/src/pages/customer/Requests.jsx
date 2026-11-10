import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const REQUEST_HELP_PATH = "/customer/request-help";
const PAGE_SIZE = 10;

// step = position on the 5-step journey (null for rejected / cancelled)
const STATUS = {
    PENDING: { label: "Pending", tone: "amber", step: 0, group: "ACTIVE" },
    WAITING_FOR_QUOTATION: { label: "Waiting for quotation", tone: "blue", step: 1, group: "ACTIVE" },
    QUOTATION_PENDING: { label: "Quotation pending", tone: "amber", step: 1, group: "ACTIVE" },
    ACCEPTED: { label: "Accepted", tone: "green", step: 2, group: "ACTIVE" },
    IN_PROGRESS: { label: "In progress", tone: "dark", step: 3, group: "ACTIVE" },
    COMPLETED: { label: "Completed", tone: "green", step: 4, group: "COMPLETED" },
    CLOSED: { label: "Completed", tone: "green", step: 4, group: "COMPLETED" },
    REJECTED: { label: "Rejected", tone: "red", step: null, group: "CANCELLED" },
    CANCELLED: { label: "Cancelled", tone: "grey", step: null, group: "CANCELLED" },
};

const FILTERS = [
    { value: "ALL", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled or rejected" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const statusInfo = (status) =>
    STATUS[status] || { label: status || "Unknown", tone: "grey", step: null, group: "OTHER" };

const formatDate = (date) =>
    date
        ? new Date(date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : "—";

// The backend may send the issue as "Category: X\nDescription: Y\nVehicle Drivable: Yes".
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

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function StatusPill({ info }) {
    return (
        <span className={`rq-pill ${info.tone}`}>
            <i /> {info.label}
        </span>
    );
}

function RequestCard({ request, onOpen }) {
    const info = statusInfo(request.status);
    const issue = parseIssue(request.issue);
    const title = issue.category || "Roadside request";
    const summary = issue.description || (issue.category ? "" : "Not specified");

    return (
        <button
            type="button"
            className="rq-card"
            onClick={onOpen}
            aria-label={`Request ${request.requestId}, ${title}, ${info.label}. Open details.`}
        >
            <span className="rq-card-top">
                <span className="rq-icon" aria-hidden="true">
                    <i className={`bi ${categoryIcon(issue.category)}`} />
                </span>

                <span className="rq-card-text">
                    <strong>{title}</strong>
                    {summary && <span className="rq-summary">{summary}</span>}
                </span>

                <StatusPill info={info} />
            </span>

            {info.step !== null && (
                <span className="rq-bar" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((n) => (
                        <i key={n} className={n <= info.step ? "on" : ""} />
                    ))}
                </span>
            )}

            <span className="rq-meta">
                <span>
                    <i className="bi bi-hash" aria-hidden="true" />
                    {request.requestId}
                </span>
                <span>
                    <i className="bi bi-person-fill" aria-hidden="true" />
                    {request.mechanic || "No mechanic yet"}
                </span>
                <span>
                    <i className="bi bi-calendar3" aria-hidden="true" />
                    {formatDate(request.createdAt)}
                </span>
                <i className="bi bi-chevron-right rq-go" aria-hidden="true" />
            </span>
        </button>
    );
}

function EmptyState({ icon, title, text, actionLabel, onAction, tone }) {
    return (
        <div className={`rq-empty ${tone || ""}`}>
            <div className="rq-empty-icon">
                <i className={`bi ${icon}`} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            {actionLabel && (
                <button type="button" className="rq-btn dark" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Requests() {
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [filter, setFilter] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");
    const [visible, setVisible] = useState(PAGE_SIZE);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/requests/my");
            setRequests(Array.isArray(response.data) ? response.data : []);
        } catch (requestError) {
            console.error("Failed to load requests:", requestError);
            setError(
                requestError.response?.data?.message ||
                "Failed to load your requests."
            );
        } finally {
            setLoading(false);
        }
    };

    // Start from the first page again whenever the list changes shape.
    useEffect(() => {
        setVisible(PAGE_SIZE);
    }, [filter, searchTerm, sortOrder]);

    const counts = useMemo(() => {
        const result = { ALL: requests.length, ACTIVE: 0, COMPLETED: 0, CANCELLED: 0 };
        requests.forEach((request) => {
            const group = statusInfo(request.status).group;
            if (result[group] !== undefined) result[group] += 1;
        });
        return result;
    }, [requests]);

    const filteredRequests = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();

        const matches = requests.filter((request) => {
            if (filter !== "ALL" && statusInfo(request.status).group !== filter) {
                return false;
            }
            if (!q) return true;

            const text = [
                request.requestId,
                request.issue,
                request.mechanic,
                statusInfo(request.status).label,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(q);
        });

        return [...matches].sort((a, b) => {
            const first = new Date(a.createdAt || 0).getTime();
            const second = new Date(b.createdAt || 0).getTime();
            return sortOrder === "oldest" ? first - second : second - first;
        });
    }, [requests, filter, searchTerm, sortOrder]);

    const hasRequests = !loading && !error && requests.length > 0;
    const clearFilters = () => {
        setFilter("ALL");
        setSearchTerm("");
        setSortOrder("newest");
    };

    return (
        <CustomerLayout>
            <style>{css}</style>

            <div className="rq">
                <div className="rq-wrap">
                    <header className="rq-header">
                        <div>
                            <h1>My requests</h1>
                            <p>Track every roadside request in one place.</p>
                        </div>
                        <button
                            type="button"
                            className="rq-btn dark lg"
                            onClick={() => navigate(REQUEST_HELP_PATH)}
                        >
                            <i className="bi bi-plus-lg" /> Request help
                        </button>
                    </header>

                    {hasRequests && (
                        <section className="rq-stats" aria-label="Request summary">
                            <div>
                                <strong>{counts.ALL}</strong>
                                <span>Total</span>
                            </div>
                            <div>
                                <strong>{counts.ACTIVE}</strong>
                                <span>Active</span>
                            </div>
                            <div>
                                <strong>{counts.COMPLETED}</strong>
                                <span>Completed</span>
                            </div>
                            <div>
                                <strong>{counts.CANCELLED}</strong>
                                <span>Cancelled or rejected</span>
                            </div>
                        </section>
                    )}

                    {hasRequests && (
                        <section className="rq-toolbar" aria-label="Find requests">
                            <div className="rq-search">
                                <i className="bi bi-search" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by number, problem or mechanic"
                                    aria-label="Search requests"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm("")}
                                        aria-label="Clear search"
                                    >
                                        <i className="bi bi-x-circle-fill" />
                                    </button>
                                )}
                            </div>

                            <label className="rq-sort">
                                <span>Sort</span>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                </select>
                            </label>

                            <div className="rq-chips" role="group" aria-label="Request status">
                                {FILTERS.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        className={filter === item.value ? "on" : ""}
                                        aria-pressed={filter === item.value}
                                        onClick={() => setFilter(item.value)}
                                    >
                                        {item.label} <em>{counts[item.value]}</em>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {loading && (
                        <div className="rq-list" aria-busy="true" aria-label="Loading requests">
                            {[1, 2, 3].map((n) => (
                                <div className="rq-card rq-skel" key={n}>
                                    <i style={{ width: "55%", height: 22 }} />
                                    <i style={{ width: "100%", height: 10 }} />
                                    <i style={{ width: "70%", height: 16 }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && error && (
                        <EmptyState
                            tone="error"
                            icon="bi-wifi-off"
                            title="Couldn’t load your requests"
                            text={error}
                            actionLabel="Try again"
                            onAction={loadRequests}
                        />
                    )}

                    {!loading && !error && requests.length === 0 && (
                        <EmptyState
                            icon="bi-clipboard2-check"
                            title="No requests yet"
                            text="When you ask for roadside help, you can follow it here from start to finish."
                            actionLabel="Request roadside help"
                            onAction={() => navigate(REQUEST_HELP_PATH)}
                        />
                    )}

                    {hasRequests && filteredRequests.length === 0 && (
                        <EmptyState
                            icon="bi-search"
                            title="No requests match"
                            text="Try a different search or show all requests."
                            actionLabel="Clear filters"
                            onAction={clearFilters}
                        />
                    )}

                    {hasRequests && filteredRequests.length > 0 && (
                        <>
                            <p className="rq-count" role="status">
                                Showing {Math.min(visible, filteredRequests.length)} of{" "}
                                {filteredRequests.length}
                            </p>

                            <div className="rq-list">
                                {filteredRequests.slice(0, visible).map((request) => (
                                    <RequestCard
                                        key={request.requestId}
                                        request={request}
                                        onOpen={() =>
                                            navigate(`/customer/requests/${request.requestId}`)
                                        }
                                    />
                                ))}
                            </div>

                            {visible < filteredRequests.length && (
                                <div className="rq-more">
                                    <button
                                        type="button"
                                        className="rq-btn light"
                                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                                    >
                                        Show more
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Styles (scoped under .rq / .rq-*)                                   */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.rq{
  --ink:#000; --fog:#f6f6f6; --line:#e2e2e2; --mute:#5e5e5e;
  --blue:#276ef1; --green:#05944f; --red:#e11900; --amber:#b86e00;
  font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:var(--ink); -webkit-font-smoothing:antialiased;
  background:#fff;min-height:100%;padding:32px 24px 64px;
}
.rq-wrap{max-width:900px;margin:0 auto}
.rq *{box-sizing:border-box}
.rq h1,.rq h3,.rq p{margin:0}
.rq button{font-family:inherit;cursor:pointer}
.rq :focus-visible{outline:3px solid var(--blue);outline-offset:2px}

.rq-header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:28px}
.rq-header h1{font-size:clamp(2rem,4.5vw,3rem);font-weight:800;letter-spacing:-.035em;line-height:1.05}
.rq-header p{margin-top:8px;color:var(--mute);font-size:1.02rem}

.rq-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 24px;border:0;border-radius:999px;font-size:.95rem;font-weight:700;transition:background .15s,transform .1s;white-space:nowrap}
.rq-btn:active{transform:scale(.98)}
.rq-btn.lg{min-height:52px;padding:0 28px}
.rq-btn.dark{background:var(--ink);color:#fff}
.rq-btn.dark:hover{background:#2b2b2b}
.rq-btn.light{background:var(--fog);color:var(--ink)}
.rq-btn.light:hover{background:#e8e8e8}

.rq-stats{display:grid;grid-template-columns:repeat(4,1fr);margin-bottom:24px;border-radius:16px;background:var(--fog)}
.rq-stats div{padding:18px 22px;display:flex;flex-direction:column;gap:2px}
.rq-stats div + div{border-left:1px solid var(--line)}
.rq-stats strong{font-size:1.9rem;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.rq-stats span{color:var(--mute);font-size:.86rem;font-weight:500}

.rq-toolbar{display:grid;grid-template-columns:1fr auto;gap:12px 16px;align-items:center;margin-bottom:20px}
.rq-search{position:relative;display:flex;align-items:center}
.rq-search > i{position:absolute;left:18px;color:var(--mute);pointer-events:none}
.rq-search input{width:100%;height:52px;padding:0 48px 0 46px;border:2px solid transparent;border-radius:999px;background:var(--fog);font:inherit;font-size:.96rem;color:var(--ink);transition:border-color .15s,background .15s}
.rq-search input:focus{outline:none;border-color:var(--ink);background:#fff}
.rq-search input::placeholder{color:#777}
.rq-search button{position:absolute;right:8px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:var(--mute)}
.rq-sort{display:flex;align-items:center;gap:10px;font-size:.88rem;font-weight:600;color:var(--mute)}
.rq-sort select{height:52px;padding:0 38px 0 18px;border:0;border-radius:999px;background-color:var(--fog);font:inherit;font-weight:600;color:var(--ink);cursor:pointer}
.rq-chips{grid-column:1 / -1;display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
.rq-chips::-webkit-scrollbar{display:none}
.rq-chips button{flex-shrink:0;min-height:40px;padding:0 16px;border:0;border-radius:999px;background:var(--fog);color:var(--ink);font-size:.9rem;font-weight:600;transition:background .15s}
.rq-chips button:hover{background:#e8e8e8}
.rq-chips button.on{background:var(--ink);color:#fff}
.rq-chips em{font-style:normal;margin-left:4px;opacity:.55}
.rq-count{margin-bottom:12px;color:var(--mute);font-size:.9rem}

.rq-list{display:grid;gap:14px}
.rq-card{display:flex;flex-direction:column;gap:16px;width:100%;padding:20px 22px;border:1px solid var(--line);border-radius:20px;background:#fff;text-align:left;color:inherit;font:inherit;transition:border-color .15s,box-shadow .15s}
.rq-card:hover{border-color:#bdbdbd;box-shadow:0 8px 24px #0000000d}
.rq-card-top{display:flex;align-items:center;gap:14px}
.rq-icon{width:48px;height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--ink);color:#fff;font-size:1.15rem}
.rq-card-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.rq-card-text strong{font-size:1.1rem;font-weight:700;letter-spacing:-.015em}
.rq-summary{color:var(--mute);font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rq-bar{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.rq-bar i{height:5px;border-radius:99px;background:#e2e2e2}
.rq-bar i.on{background:var(--ink)}
.rq-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px 20px;color:var(--mute);font-size:.86rem;font-weight:500}
.rq-meta > span{display:inline-flex;align-items:center;gap:6px}
.rq-go{margin-left:auto;color:var(--ink)}

.rq-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;font-size:.82rem;font-weight:700;background:var(--fog);white-space:nowrap}
.rq-pill i{width:8px;height:8px;border-radius:50%;background:currentColor}
.rq-pill.green{color:var(--green);background:#e6f6ee}
.rq-pill.amber{color:var(--amber);background:#fff3dc}
.rq-pill.blue{color:var(--blue);background:#e8f0fe}
.rq-pill.red{color:var(--red);background:#fde8e5}
.rq-pill.dark{color:#fff;background:var(--ink)}
.rq-pill.grey{color:var(--mute)}

.rq-more{display:flex;justify-content:center;margin-top:20px}

.rq-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:64px 24px;border-radius:20px;background:var(--fog);text-align:center}
.rq-empty-icon{width:72px;height:72px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;border-radius:50%;background:var(--ink);color:#fff;font-size:1.9rem}
.rq-empty.error .rq-empty-icon{background:var(--red)}
.rq-empty h3{font-size:1.4rem;font-weight:800;letter-spacing:-.02em}
.rq-empty p{max-width:42ch;margin-bottom:14px;color:var(--mute)}

.rq-skel{pointer-events:none}
.rq-skel i{display:block;border-radius:8px;background:linear-gradient(90deg,#eee 25%,#f7f7f7 50%,#eee 75%);background-size:200% 100%;animation:rq-shimmer 1.4s infinite}
@keyframes rq-shimmer{to{background-position:-200% 0}}

@media(max-width:720px){
  .rq{padding:20px 16px 56px}
  .rq-header{flex-direction:column;align-items:stretch}
  .rq-header .rq-btn{width:100%}
  .rq-stats{grid-template-columns:1fr 1fr}
  .rq-stats div:nth-child(3){border-left:0}
  .rq-stats div:nth-child(n+3){border-top:1px solid var(--line)}
  .rq-toolbar{grid-template-columns:1fr}
  .rq-sort{justify-content:space-between}
  .rq-sort select{flex:1}
  .rq-card{padding:18px}
  .rq-card-top{flex-wrap:wrap}
  .rq-card-text{flex-basis:calc(100% - 70px)}
  .rq-card-top .rq-pill{margin-left:62px}
}
@media(prefers-reduced-motion:reduce){
  .rq *{animation:none!important;transition:none!important}
}
`;

export default Requests;