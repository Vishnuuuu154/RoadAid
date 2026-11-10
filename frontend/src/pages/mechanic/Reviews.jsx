import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";
import { getMyProfile, getMechanicReviews, getMechanicAverageRating } from "../../services/mechanicService";

import {
    FaStar,
    FaRegStar,
    FaSyncAlt,
    FaExclamationTriangle,
    FaMapMarkerAlt,
    FaCommentDots,
    FaSearch,
    FaTimes,
    FaSlidersH,
    FaThumbsUp,
    FaComments,
    FaChevronRight,
    FaRegClock
} from "react-icons/fa";

import "../../styles/Reviews.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const PAGE_SIZE = 10;
const LONG_COMMENT = 220;
const RECENT_DAYS = 30;

/* Change here if your router uses different paths. */
const ROUTES = {
    request: (id) => `/mechanic/requests/${id}`
};

const SORTS = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "high", label: "Highest rating" },
    { key: "low", label: "Lowest rating" }
];

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const toDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const formatDate = (value) => {
    const d = toDate(value);
    return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
};

function relativeDate(value, now = Date.now()) {
    const d = toDate(value);
    if (!d) return "";
    const days = Math.floor((now - d.getTime()) / 86400000);
    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) {
        const weeks = Math.floor(days / 7);
        return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
    }
    return formatDate(value);
}

const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "C";

// The API may nest the request or expose its id directly; support both shapes.
const getRequestId = (review) =>
    review.serviceRequest?.id ?? review.serviceRequest?.requestId ?? review.requestId ?? review.serviceRequestId ?? null;

const roundStar = (r) => Math.min(5, Math.max(1, Math.round(Number(r) || 0)));
const time = (r) => toDate(r.createdAt)?.getTime() || 0;

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

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

function Stars({ rating, size }) {
    const rounded = Math.round(Number(rating) || 0);
    return (
        <span
            className="rw-stars"
            style={size ? { fontSize: size } : undefined}
            role="img"
            aria-label={`${rounded} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((n) =>
                n <= rounded ? <FaStar key={n} /> : <FaRegStar key={n} className="rw-star-off" />
            )}
        </span>
    );
}

function ReviewCard({ review, now }) {
    const [expanded, setExpanded] = useState(false);

    const stars = roundStar(review.rating);
    const name = review.customer?.fullName || "Customer";
    const requestId = getRequestId(review);
    const comment = review.comment?.trim();
    const long = Boolean(comment) && comment.length > LONG_COMMENT;

    return (
        <article className="rw-item" data-level={stars >= 4 ? "high" : stars === 3 ? "mid" : "low"}>
            <span className="rw-avatar" aria-hidden="true">{initials(name)}</span>

            <div className="rw-item-body">
                <div className="rw-item-top">
                    <strong className="rw-item-name">{name}</strong>
                    <time className="rw-item-date" dateTime={review.createdAt} title={formatDate(review.createdAt)}>
                        {relativeDate(review.createdAt, now)}
                    </time>
                </div>

                <div className="rw-item-meta">
                    <Stars rating={review.rating} />
                    <span className="rw-pill" data-level={stars >= 4 ? "high" : stars === 3 ? "mid" : "low"}>
                        {stars}.0
                    </span>
                </div>

                {comment ? (
                    <>
                        <p className="rw-comment" data-clamped={long && !expanded}>{comment}</p>
                        {long && (
                            <button
                                type="button"
                                className="rw-readmore"
                                aria-expanded={expanded}
                                onClick={() => setExpanded((v) => !v)}
                            >
                                {expanded ? "Show less" : "Read more"}
                            </button>
                        )}
                    </>
                ) : (
                    <p className="rw-comment rw-comment-empty">
                        <FaCommentDots aria-hidden="true" /> Rating only, no comment.
                    </p>
                )}

                {requestId && (
                    <Link to={ROUTES.request(requestId)} className="rw-view" aria-label={`Review by ${name}. Open request ${requestId}`}>
                        View request #{requestId} <FaChevronRight aria-hidden="true" />
                    </Link>
                )}
            </div>
        </article>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function ReviewsContent() {
    const [profile, setProfile] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [serverAverage, setServerAverage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [starFilter, setStarFilter] = useState(null);
    const [commentsOnly, setCommentsOnly] = useState(false);
    const [sort, setSort] = useState("newest");
    const [query, setQuery] = useState("");
    const [panelOpen, setPanelOpen] = useState(false);
    const [shown, setShown] = useState(PAGE_SIZE);
    const [now, setNow] = useState(() => Date.now());

    const searchRef = useRef(null);
    const toolbarRef = useRef(null);
    const filterBtnRef = useRef(null);

    usePageFont();

    /* ---------------------------- data ---------------------------- */

    const load = useCallback(async (mode = "initial") => {
        if (mode === "refresh") setRefreshing(true);
        try {
            setError("");
            const profileResponse = await getMyProfile();
            const mechanic = profileResponse.data;
            setProfile(mechanic);

            // The average is a nice-to-have: if it fails we calculate it from the reviews.
            const [reviewsResult, ratingResult] = await Promise.allSettled([
                getMechanicReviews(mechanic.id),
                getMechanicAverageRating(mechanic.id)
            ]);
            if (reviewsResult.status === "rejected") throw reviewsResult.reason;

            setReviews(Array.isArray(reviewsResult.value.data) ? reviewsResult.value.data : []);
            setServerAverage(ratingResult.status === "fulfilled" ? Number(ratingResult.value.data || 0) : 0);
            setNow(Date.now());
        } catch (err) {
            console.error("Failed to load reviews:", err);
            setError(err.response?.data?.message || "We couldn't load your reviews.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const onVisible = () => {
            if (!document.hidden) load("silent");
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [load]);

    /* ---------- keyboard + outside click ---------- */

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                setPanelOpen((open) => {
                    if (open) filterBtnRef.current?.focus();
                    return false;
                });
            }
            const tag = document.activeElement?.tagName;
            if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        const onPointer = (e) => {
            if (window.innerWidth > 760 && toolbarRef.current && !toolbarRef.current.contains(e.target)) {
                setPanelOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onPointer);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("pointerdown", onPointer);
        };
    }, []);

    /* ---------- derived ---------- */

    const stats = useMemo(() => {
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let withComment = 0;
        const cutoff = now - RECENT_DAYS * 86400000;
        let recentCount = 0;
        let recentSum = 0;

        reviews.forEach((r) => {
            dist[roundStar(r.rating)] += 1;
            if (r.comment?.trim()) withComment += 1;
            if (time(r) >= cutoff) {
                recentCount += 1;
                recentSum += Number(r.rating) || 0;
            }
        });

        const total = reviews.length;
        const computed = total ? reviews.reduce((t, r) => t + (Number(r.rating) || 0), 0) / total : 0;

        return {
            total,
            dist,
            withComment,
            average: serverAverage || computed,
            positive: total ? Math.round(((dist[5] + dist[4]) / total) * 100) : 0,
            recentCount,
            recentAverage: recentCount ? recentSum / recentCount : 0
        };
    }, [reviews, serverAverage, now]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = reviews
            .filter((r) => !starFilter || roundStar(r.rating) === starFilter)
            .filter((r) => !commentsOnly || r.comment?.trim())
            .filter((r) => !q || [r.comment, r.customer?.fullName].filter(Boolean).join(" ").toLowerCase().includes(q));

        switch (sort) {
            case "oldest": return list.sort((a, b) => time(a) - time(b));
            case "high": return list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || time(b) - time(a));
            case "low": return list.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0) || time(b) - time(a));
            default: return list.sort((a, b) => time(b) - time(a));
        }
    }, [reviews, starFilter, commentsOnly, query, sort]);

    const visible = filtered.slice(0, shown);
    const isFiltered = starFilter !== null || commentsOnly || query.trim() !== "";
    const filterCount = (starFilter ? 1 : 0) + (commentsOnly ? 1 : 0) + (sort !== "newest" ? 1 : 0);

    const toggleStar = (n) => {
        setStarFilter((prev) => (prev === n ? null : n));
        setShown(PAGE_SIZE);
    };
    const toggleComments = () => {
        setCommentsOnly((v) => !v);
        setShown(PAGE_SIZE);
    };
    const clearAll = () => {
        setStarFilter(null);
        setCommentsOnly(false);
        setQuery("");
        setSort("newest");
        setShown(PAGE_SIZE);
    };

    /* ----------------------------- states ---------------------------- */

    if (loading) {
        return (
            <div className="rw-root" aria-busy="true" aria-label="Loading reviews">
                <div className="rw-skeleton" style={{ height: 56, width: "45%" }} />
                <div className="rw-skeleton" style={{ height: 250 }} />
                <div className="rw-skeleton" style={{ height: 100 }} />
                <div className="rw-skeleton" style={{ height: 180 }} />
            </div>
        );
    }

    // Only replace the whole page with an error when there's nothing to show.
    if (error && !profile) {
        return (
            <div className="rw-root">
                <div className="rw-error" role="alert">
                    <FaExclamationTriangle className="rw-error-ico" aria-hidden="true" />
                    <div>
                        <p className="rw-error-title">Unable to load reviews</p>
                        <p className="rw-error-text">{error}</p>
                        <button type="button" className="rw-btn rw-btn-secondary" onClick={() => load("refresh")}>
                            <FaSyncAlt aria-hidden="true" className={refreshing ? "rw-spin" : ""} /> Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const ownerName = profile?.user?.fullName || "Mechanic";
    const hasReviews = stats.total > 0;

    return (
        <div className="rw-root">
            {/* ------------------------ Header ------------------------ */}
            <header className="rw-header">
                <div>
                    <h1 className="rw-title">Reviews &amp; ratings</h1>
                    <p className="rw-sub">See what customers think of your service.</p>
                </div>
                <button
                    type="button"
                    className="rw-btn rw-btn-secondary"
                    onClick={() => load("refresh")}
                    disabled={refreshing}
                    aria-busy={refreshing}
                >
                    <FaSyncAlt aria-hidden="true" className={refreshing ? "rw-spin" : ""} />
                    <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
                </button>
            </header>

            {error && (
                <div className="rw-notice" role="alert">
                    <FaExclamationTriangle className="rw-notice-ico" aria-hidden="true" />
                    <p className="rw-notice-text">
                        <strong>Couldn't refresh.</strong> {error} Showing the last data we had.
                    </p>
                    <button type="button" className="rw-btn rw-btn-secondary rw-btn-sm" onClick={() => load("refresh")}>
                        Try again
                    </button>
                </div>
            )}

            {/* --------- Hero: workshop + score + distribution --------- */}
            <section className="rw-hero" aria-label="Rating summary">
                <div className="rw-identity">
                    <span className="rw-identity-avatar" aria-hidden="true">{initials(ownerName)}</span>
                    <div className="rw-identity-text">
                        <h2 className="rw-name">{ownerName}</h2>
                        <p className="rw-workshop">{profile?.workshopName || "Independent Mechanic"}</p>
                        <p className="rw-address">
                            <FaMapMarkerAlt aria-hidden="true" /> {profile?.workshopAddress || "Location unavailable"}
                        </p>
                    </div>
                </div>

                <div className="rw-hero-body">
                    <div className="rw-score">
                        <div className="rw-score-value">{hasReviews ? stats.average.toFixed(1) : "–"}</div>
                        <Stars rating={stats.average} size={20} />
                        <p className="rw-score-count">
                            {stats.total} review{stats.total === 1 ? "" : "s"}
                        </p>
                    </div>

                    <div className="rw-bars" role="group" aria-label="Filter reviews by rating">
                        {[5, 4, 3, 2, 1].map((n) => {
                            const pct = stats.total ? Math.round((stats.dist[n] / stats.total) * 100) : 0;
                            return (
                                <button
                                    key={n}
                                    type="button"
                                    className="rw-bar-row"
                                    aria-pressed={starFilter === n}
                                    onClick={() => toggleStar(n)}
                                    disabled={stats.dist[n] === 0}
                                    aria-label={`${n} star reviews: ${stats.dist[n]}`}
                                >
                                    <span className="rw-bar-label">{n} <FaStar aria-hidden="true" /></span>
                                    <span className="rw-bar-track"><span className="rw-bar-fill" style={{ width: `${pct}%` }} /></span>
                                    <span className="rw-bar-count">{stats.dist[n]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ------------------------ Highlights ------------------------ */}
            {hasReviews && (
                <section className="rw-stats" aria-label="Highlights">
                    <div className="rw-stat" data-tone="success">
                        <span className="rw-stat-ico" aria-hidden="true"><FaThumbsUp /></span>
                        <div>
                            <p className="rw-stat-label">Happy customers</p>
                            <p className="rw-stat-value">{stats.positive}%</p>
                            <p className="rw-stat-note">gave 4 or 5 stars</p>
                        </div>
                    </div>

                    <div className="rw-stat" data-tone="primary">
                        <span className="rw-stat-ico" aria-hidden="true"><FaRegClock /></span>
                        <div>
                            <p className="rw-stat-label">Last {RECENT_DAYS} days</p>
                            <p className="rw-stat-value">
                                {stats.recentCount ? stats.recentAverage.toFixed(1) : "–"}
                            </p>
                            <p className="rw-stat-note">
                                {stats.recentCount} new review{stats.recentCount === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="rw-stat rw-stat-btn"
                        data-tone="star"
                        aria-pressed={starFilter === 5}
                        onClick={() => toggleStar(5)}
                        disabled={stats.dist[5] === 0}
                    >
                        <span className="rw-stat-ico" aria-hidden="true"><FaStar /></span>
                        <span>
                            <span className="rw-stat-label">5-star reviews</span>
                            <span className="rw-stat-value">{stats.dist[5]}</span>
                            <span className="rw-stat-note">out of {stats.total}. Tap to filter</span>
                        </span>
                    </button>

                    <button
                        type="button"
                        className="rw-stat rw-stat-btn"
                        aria-pressed={commentsOnly}
                        onClick={toggleComments}
                        disabled={stats.withComment === 0}
                    >
                        <span className="rw-stat-ico" aria-hidden="true"><FaComments /></span>
                        <span>
                            <span className="rw-stat-label">With comments</span>
                            <span className="rw-stat-value">{stats.withComment}</span>
                            <span className="rw-stat-note">written reviews. Tap to filter</span>
                        </span>
                    </button>
                </section>
            )}

            {/* ------------------------ Search + filter ------------------------ */}
            {hasReviews && (
                <div className="rw-toolbar" ref={toolbarRef}>
                    <div className="rw-search">
                        <FaSearch className="rw-search-ico" aria-hidden="true" />
                        <input
                            ref={searchRef}
                            type="search"
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setShown(PAGE_SIZE); }}
                            placeholder="Search comments or customer names"
                            aria-label="Search reviews"
                            aria-keyshortcuts="/"
                        />
                        {query ? (
                            <button type="button" className="rw-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                                <FaTimes aria-hidden="true" />
                            </button>
                        ) : (
                            <span className="rw-kbd" aria-hidden="true">/</span>
                        )}
                    </div>

                    <button
                        ref={filterBtnRef}
                        type="button"
                        className="rw-btn rw-btn-secondary rw-filter-btn"
                        aria-expanded={panelOpen}
                        aria-controls="rw-filter-panel"
                        onClick={() => setPanelOpen((o) => !o)}
                    >
                        <FaSlidersH aria-hidden="true" />
                        <span>Filter &amp; sort</span>
                        {filterCount > 0 && <span className="rw-filter-badge">{filterCount}</span>}
                    </button>

                    {panelOpen && (
                        <>
                            <div className="rw-scrim" onClick={() => setPanelOpen(false)} aria-hidden="true" />
                            <div className="rw-panel" id="rw-filter-panel" role="dialog" aria-label="Filter and sort reviews">
                                <div className="rw-panel-head">
                                    <h2 className="rw-panel-title">Filter &amp; sort</h2>
                                    <button type="button" className="rw-icon-btn" onClick={() => setPanelOpen(false)} aria-label="Close filters">
                                        <FaTimes aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="rw-group">
                                    <span className="rw-group-label">Rating</span>
                                    <div className="rw-chips">
                                        {[5, 4, 3, 2, 1].map((n) => (
                                            <button
                                                key={n}
                                                type="button"
                                                className="rw-chip"
                                                aria-pressed={starFilter === n}
                                                onClick={() => toggleStar(n)}
                                                disabled={stats.dist[n] === 0}
                                            >
                                                {n} <FaStar aria-hidden="true" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rw-group">
                                    <span className="rw-group-label">Content</span>
                                    <div className="rw-chips">
                                        <button type="button" className="rw-chip" aria-pressed={commentsOnly} onClick={toggleComments}>
                                            <FaCommentDots aria-hidden="true" /> With comments only
                                        </button>
                                    </div>
                                </div>

                                <div className="rw-group">
                                    <label className="rw-group-label" htmlFor="rw-sort">Sort by</label>
                                    <select
                                        id="rw-sort"
                                        className="rw-select"
                                        value={sort}
                                        onChange={(e) => { setSort(e.target.value); setShown(PAGE_SIZE); }}
                                    >
                                        {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                                    </select>
                                </div>

                                <div className="rw-panel-foot">
                                    <button type="button" className="rw-btn rw-btn-secondary" onClick={clearAll}>Reset</button>
                                    <button type="button" className="rw-btn rw-btn-primary" onClick={() => setPanelOpen(false)}>
                                        Show {filtered.length} review{filtered.length === 1 ? "" : "s"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ------------------------ Applied filters ------------------------ */}
            {hasReviews && (
                <div className="rw-active" aria-live="polite">
                    <span className="rw-result-count">{filtered.length} review{filtered.length === 1 ? "" : "s"}</span>
                    {starFilter && (
                        <button type="button" className="rw-tag" onClick={() => setStarFilter(null)} aria-label={`Remove ${starFilter} star filter`}>
                            {starFilter} stars <FaTimes aria-hidden="true" />
                        </button>
                    )}
                    {commentsOnly && (
                        <button type="button" className="rw-tag" onClick={() => setCommentsOnly(false)} aria-label="Remove comments filter">
                            With comments <FaTimes aria-hidden="true" />
                        </button>
                    )}
                    {isFiltered && (
                        <button type="button" className="rw-link-btn" onClick={clearAll}>Clear all</button>
                    )}
                </div>
            )}

            {/* ------------------------ List ------------------------ */}
            {filtered.length === 0 ? (
                <div className="rw-state">
                    <span className="rw-state-ico" aria-hidden="true"><FaStar /></span>
                    <h2 className="rw-state-title">{hasReviews ? "No matching reviews" : "No reviews yet"}</h2>
                    <p className="rw-state-text">
                        {hasReviews
                            ? "Try a different rating or search term."
                            : "Customer reviews will appear here after completed services."}
                    </p>
                    {hasReviews && (
                        <button type="button" className="rw-btn rw-btn-primary" onClick={clearAll}>Clear filters</button>
                    )}
                </div>
            ) : (
                <>
                    <ul className="rw-list">
                        {visible.map((review, i) => (
                            <li key={review.id ?? i}>
                                <ReviewCard review={review} now={now} />
                            </li>
                        ))}
                    </ul>

                    {filtered.length > shown && (
                        <button
                            type="button"
                            className="rw-btn rw-btn-secondary rw-more"
                            onClick={() => setShown((n) => n + PAGE_SIZE)}
                        >
                            Show {Math.min(filtered.length - shown, PAGE_SIZE)} more
                            <span className="rw-more-left">({filtered.length - shown} left)</span>
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

function Reviews() {
    return (
        <MechanicLayout>
            <ReviewsContent />
        </MechanicLayout>
    );
}

export default Reviews;