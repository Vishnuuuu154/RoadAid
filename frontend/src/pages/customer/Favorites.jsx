import { useCallback, useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG, no extra dependency)                            */
/* ------------------------------------------------------------------ */

const Icon = ({ children, size = 18, ...rest }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
    >
        {children}
    </svg>
);

const PinIcon = () => (
    <Icon>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </Icon>
);

const ToolIcon = () => (
    <Icon>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2.3-.7-.7-2.3 2.7-2.7Z" />
    </Icon>
);

const PhoneIcon = () => (
    <Icon>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </Icon>
);

const HeartIcon = ({ filled = false, size = 20 }) => (
    <Icon size={size} fill={filled ? "currentColor" : "none"}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
    </Icon>
);

const SearchIcon = () => (
    <Icon>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
    </Icon>
);

const AlertIcon = () => (
    <Icon size={22}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
    </Icon>
);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const getInitials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? "")
        .join("") || "M";

const formatExperience = (years) => {
    if (years === null || years === undefined || years === "") {
        return "Not specified";
    }
    return `${years} ${Number(years) === 1 ? "year" : "years"}`;
};

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
    return (
        <div className="fav-card fav-skeleton" aria-hidden="true">
            <div className="fav-skeleton__row">
                <span className="fav-skeleton__block fav-skeleton__avatar" />
                <span className="fav-skeleton__block fav-skeleton__pill" />
            </div>
            <span className="fav-skeleton__block fav-skeleton__title" />
            <span className="fav-skeleton__block fav-skeleton__line" />
            <span className="fav-skeleton__block fav-skeleton__line fav-skeleton__line--short" />
            <span className="fav-skeleton__block fav-skeleton__button" />
        </div>
    );
}

function MechanicCard({
                          mechanic,
                          confirming,
                          removing,
                          onAskRemove,
                          onCancel,
                          onConfirm,
                      }) {
    const phone = mechanic.contactNumber?.trim();
    const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
    const titleId = `mechanic-${mechanic.id}-name`;

    return (
        <article className="fav-card" aria-labelledby={titleId}>
            <div className="fav-card__top">
                <div className="fav-avatar" aria-hidden="true">
                    {getInitials(mechanic.workshopName)}
                </div>

                <span
                    className={`fav-status ${
                        mechanic.available
                            ? "fav-status--on"
                            : "fav-status--off"
                    }`}
                >
                    <span className="fav-status__dot" aria-hidden="true" />
                    {mechanic.available ? "Available now" : "Unavailable"}
                </span>
            </div>

            <h2 className="fav-card__name" id={titleId}>
                {mechanic.workshopName || "Unnamed workshop"}
            </h2>

            <dl className="fav-details">
                <div className="fav-detail">
                    <dt>
                        <PinIcon />
                        <span className="fav-sr">Workshop address</span>
                    </dt>
                    <dd>
                        {mechanic.workshopAddress || "Address not available"}
                    </dd>
                </div>

                <div className="fav-detail">
                    <dt>
                        <ToolIcon />
                        <span className="fav-sr">Experience</span>
                    </dt>
                    <dd>
                        {formatExperience(mechanic.experienceYears)}
                        {mechanic.experienceYears !== null &&
                            mechanic.experienceYears !== undefined &&
                            mechanic.experienceYears !== "" && (
                                <span className="fav-muted">
                                    {" "}
                                    of experience
                                </span>
                            )}
                    </dd>
                </div>

                <div className="fav-detail">
                    <dt>
                        <PhoneIcon />
                        <span className="fav-sr">Contact number</span>
                    </dt>
                    <dd>{phone || "Not available"}</dd>
                </div>
            </dl>

            {confirming ? (
                <div
                    className="fav-confirm"
                    role="group"
                    aria-label="Confirm removal"
                >
                    <p className="fav-confirm__text">
                        Remove from your favorites?
                    </p>
                    <div className="fav-confirm__actions">
                        <button
                            type="button"
                            className="fav-btn fav-btn--soft"
                            onClick={onCancel}
                            disabled={removing}
                            autoFocus
                        >
                            Keep
                        </button>
                        <button
                            type="button"
                            className="fav-btn fav-btn--danger"
                            onClick={onConfirm}
                            disabled={removing}
                        >
                            {removing ? "Removing…" : "Remove"}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="fav-actions">
                    {telHref ? (
                        <a className="fav-btn fav-btn--primary" href={telHref}>
                            <PhoneIcon />
                            Call workshop
                        </a>
                    ) : (
                        <button
                            type="button"
                            className="fav-btn fav-btn--primary"
                            disabled
                        >
                            No phone number
                        </button>
                    )}

                    <button
                        type="button"
                        className="fav-iconbtn"
                        onClick={onAskRemove}
                        aria-label={`Remove ${
                            mechanic.workshopName || "this mechanic"
                        } from favorites`}
                        title="Remove from favorites"
                    >
                        <HeartIcon filled />
                    </button>
                </div>
            )}
        </article>
    );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function Favorites() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [confirmId, setConfirmId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [query, setQuery] = useState("");
    const [onlyAvailable, setOnlyAvailable] = useState(false);

    const loadFavorites = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/favorites");
            setFavorites(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Failed to load favorites:", err);
            setError(
                err.response?.data?.message ||
                "Failed to load favorite mechanics."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    const removeFavorite = async (mechanicId) => {
        try {
            setRemovingId(mechanicId);
            setActionError("");

            await api.delete(`/favorites/${mechanicId}`);

            setFavorites((current) =>
                current.filter(
                    (favorite) => favorite.mechanic?.id !== mechanicId
                )
            );
            setConfirmId(null);
        } catch (err) {
            console.error("Failed to remove favorite:", err);
            setActionError(
                err.response?.data?.message ||
                "Unable to remove favorite. Please try again."
            );
        } finally {
            setRemovingId(null);
        }
    };

    // Only keep entries that actually contain mechanic data
    const items = useMemo(
        () => favorites.filter((favorite) => favorite.mechanic),
        [favorites]
    );

    const availableCount = useMemo(
        () => items.filter((favorite) => favorite.mechanic.available).length,
        [items]
    );

    const visibleItems = useMemo(() => {
        const term = query.trim().toLowerCase();

        return items.filter(({ mechanic }) => {
            if (onlyAvailable && !mechanic.available) return false;
            if (!term) return true;

            return `${mechanic.workshopName ?? ""} ${
                mechanic.workshopAddress ?? ""
            }`
                .toLowerCase()
                .includes(term);
        });
    }, [items, query, onlyAvailable]);

    const clearFilters = () => {
        setQuery("");
        setOnlyAvailable(false);
    };

    const showContent = !loading && !error;

    return (
        <CustomerLayout>
            <style>{styles}</style>

            <div className="fav-root">
                {/* HEADER */}
                <header className="fav-header">
                    <div>
                        <h1 className="fav-title">Favorite mechanics</h1>
                        <p className="fav-subtitle">
                            {showContent && items.length > 0
                                ? `${items.length} saved · ${availableCount} available now`
                                : "Mechanics you save show up here for quick access."}
                        </p>
                    </div>

                    <a
                        className="fav-btn fav-btn--primary fav-header__cta"
                        href="/customer/mechanics"
                    >
                        <SearchIcon />
                        Find mechanics
                    </a>
                </header>

                {/* REMOVE ERROR (does not hide the list) */}
                {actionError && (
                    <div className="fav-banner" role="alert">
                        <AlertIcon />
                        <span>{actionError}</span>
                        <button
                            type="button"
                            className="fav-banner__close"
                            onClick={() => setActionError("")}
                            aria-label="Dismiss message"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* LOADING */}
                {loading && (
                    <div
                        className="fav-grid"
                        role="status"
                        aria-busy="true"
                        aria-label="Loading favorites"
                    >
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                )}

                {/* LOAD ERROR */}
                {!loading && error && (
                    <div className="fav-state fav-state--error" role="alert">
                        <div className="fav-state__icon">
                            <AlertIcon />
                        </div>
                        <h2 className="fav-state__title">
                            We couldn't load your favorites
                        </h2>
                        <p className="fav-state__text">{error}</p>
                        <button
                            type="button"
                            className="fav-btn fav-btn--primary"
                            onClick={loadFavorites}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* EMPTY */}
                {showContent && items.length === 0 && (
                    <div className="fav-state">
                        <div className="fav-state__icon fav-state__icon--heart">
                            <HeartIcon size={28} />
                        </div>
                        <h2 className="fav-state__title">
                            No favorites yet
                        </h2>
                        <p className="fav-state__text">
                            Tap the heart on any mechanic to save them here.
                            You can call them straight from this page.
                        </p>
                        <a
                            className="fav-btn fav-btn--primary"
                            href="/customer/mechanics"
                        >
                            Browse mechanics
                        </a>
                    </div>
                )}

                {/* LIST */}
                {showContent && items.length > 0 && (
                    <>
                        <div className="fav-toolbar">
                            <div className="fav-search">
                                <SearchIcon />
                                <label htmlFor="fav-search" className="fav-sr">
                                    Search favorites by name or address
                                </label>
                                <input
                                    id="fav-search"
                                    type="search"
                                    placeholder="Search by name or address"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>

                            <div
                                className="fav-chips"
                                role="group"
                                aria-label="Filter by availability"
                            >
                                <button
                                    type="button"
                                    className="fav-chip"
                                    aria-pressed={!onlyAvailable}
                                    onClick={() => setOnlyAvailable(false)}
                                >
                                    All
                                    <span className="fav-chip__count">
                                        {items.length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="fav-chip"
                                    aria-pressed={onlyAvailable}
                                    onClick={() => setOnlyAvailable(true)}
                                >
                                    Available
                                    <span className="fav-chip__count">
                                        {availableCount}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <p className="fav-sr" role="status" aria-live="polite">
                            {visibleItems.length} mechanics shown
                        </p>

                        {visibleItems.length === 0 ? (
                            <div className="fav-state">
                                <div className="fav-state__icon">
                                    <SearchIcon />
                                </div>
                                <h2 className="fav-state__title">
                                    No matches
                                </h2>
                                <p className="fav-state__text">
                                    None of your favorites match these
                                    filters.
                                </p>
                                <button
                                    type="button"
                                    className="fav-btn fav-btn--soft"
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </button>
                            </div>
                        ) : (
                            <div className="fav-grid">
                                {visibleItems.map((favorite) => (
                                    <MechanicCard
                                        key={favorite.id}
                                        mechanic={favorite.mechanic}
                                        confirming={
                                            confirmId === favorite.mechanic.id
                                        }
                                        removing={
                                            removingId === favorite.mechanic.id
                                        }
                                        onAskRemove={() => {
                                            setActionError("");
                                            setConfirmId(favorite.mechanic.id);
                                        }}
                                        onCancel={() => setConfirmId(null)}
                                        onConfirm={() =>
                                            removeFavorite(favorite.mechanic.id)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </CustomerLayout>
    );
}

/* ------------------------------------------------------------------ */
/*  Styles (scoped with the "fav-" prefix, no Bootstrap needed)        */
/* ------------------------------------------------------------------ */

const styles = `
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

.fav-root {
    --ink: #000000;
    --ink-2: #4b4b4b;
    --ink-3: #6b6b6b;
    --line: #e6e6e6;
    --surface: #f6f6f6;
    --surface-2: #eeeeee;
    --green: #0b7a43;
    --green-bg: #e3f4ea;
    --red: #d3200b;
    --red-bg: #fdeceb;
    --radius: 16px;

    max-width: 1120px;
    margin: 0 auto;
    padding: 8px 0 48px;
    color: var(--ink);
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
}

.fav-root *, .fav-root *::before, .fav-root *::after { box-sizing: border-box; }

.fav-sr {
    position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

.fav-root :is(a, button, input):focus-visible {
    outline: 3px solid var(--ink);
    outline-offset: 2px;
}

/* Header */
.fav-header {
    display: flex; flex-wrap: wrap; gap: 16px 24px;
    align-items: flex-end; justify-content: space-between;
    margin-bottom: 28px;
}
.fav-title {
    margin: 0; font-size: clamp(28px, 4vw, 40px);
    font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;
}
.fav-subtitle { margin: 8px 0 0; color: var(--ink-2); font-size: 16px; }

/* Buttons */
.fav-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 48px; padding: 0 22px;
    border: 0; border-radius: 12px;
    font: inherit; font-size: 15px; font-weight: 600;
    text-decoration: none; cursor: pointer;
    transition: background-color .15s ease, transform .1s ease;
}
.fav-btn:active:not(:disabled) { transform: scale(.98); }
.fav-btn:disabled { opacity: .5; cursor: not-allowed; }
.fav-btn--primary { background: var(--ink); color: #fff; }
.fav-btn--primary:hover:not(:disabled) { background: #2b2b2b; color: #fff; }
.fav-btn--soft { background: var(--surface); color: var(--ink); }
.fav-btn--soft:hover:not(:disabled) { background: var(--surface-2); }
.fav-btn--danger { background: var(--red); color: #fff; }
.fav-btn--danger:hover:not(:disabled) { background: #b81a08; }

.fav-iconbtn {
    flex: none; width: 48px; height: 48px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 0; border-radius: 12px;
    background: var(--red-bg); color: var(--red);
    cursor: pointer; transition: background-color .15s ease;
}
.fav-iconbtn:hover { background: #fbd9d6; }

/* Toolbar */
.fav-toolbar {
    display: flex; flex-wrap: wrap; gap: 12px 16px;
    align-items: center; margin-bottom: 24px;
}
.fav-search {
    position: relative; flex: 1 1 260px; max-width: 460px; color: var(--ink-3);
}
.fav-search > svg { position: absolute; left: 16px; top: 15px; pointer-events: none; }
.fav-search input {
    width: 100%; height: 48px; padding: 0 16px 0 46px;
    border: 2px solid transparent; border-radius: 12px;
    background: var(--surface); color: var(--ink);
    font: inherit; font-size: 15px;
}
.fav-search input::placeholder { color: var(--ink-3); }
.fav-search input:focus { outline: none; border-color: var(--ink); background: #fff; }

.fav-chips { display: flex; gap: 8px; }
.fav-chip {
    display: inline-flex; align-items: center; gap: 8px;
    min-height: 44px; padding: 0 18px;
    border: 0; border-radius: 999px;
    background: var(--surface); color: var(--ink);
    font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
    transition: background-color .15s ease, color .15s ease;
}
.fav-chip:hover { background: var(--surface-2); }
.fav-chip[aria-pressed="true"] { background: var(--ink); color: #fff; }
.fav-chip__count { font-weight: 500; opacity: .7; }

/* Grid + cards */
.fav-grid {
    display: grid; gap: 20px;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
}
.fav-card {
    display: flex; flex-direction: column;
    padding: 24px; background: #fff;
    border: 1px solid var(--line); border-radius: var(--radius);
}
.fav-card__top {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 20px;
}
.fav-avatar {
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: var(--ink); color: #fff;
    font-size: 18px; font-weight: 700; letter-spacing: .02em;
}
.fav-card__name {
    margin: 0 0 16px; font-size: 20px; font-weight: 700;
    letter-spacing: -0.02em; line-height: 1.25; overflow-wrap: anywhere;
}

.fav-status {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 12px; border-radius: 999px;
    font-size: 13px; font-weight: 600; white-space: nowrap;
}
.fav-status__dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.fav-status--on { background: var(--green-bg); color: var(--green); }
.fav-status--off { background: var(--surface); color: var(--ink-2); }

.fav-details { margin: 0 0 24px; padding: 0; flex: 1; display: grid; gap: 12px; }
.fav-detail { display: flex; gap: 12px; align-items: flex-start; color: var(--ink-2); }
.fav-detail dt { flex: none; margin-top: 2px; color: var(--ink-3); display: flex; }
.fav-detail dd { margin: 0; color: var(--ink); font-size: 15px; overflow-wrap: anywhere; }
.fav-muted { color: var(--ink-3); }

.fav-actions { display: flex; gap: 10px; }
.fav-actions .fav-btn { flex: 1; }

.fav-confirm {
    padding: 14px; border-radius: 12px; background: var(--red-bg);
}
.fav-confirm__text { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #7a1408; }
.fav-confirm__actions { display: flex; gap: 10px; }
.fav-confirm__actions .fav-btn { flex: 1; min-height: 44px; }
.fav-confirm .fav-btn--soft { background: #fff; }

/* Banner */
.fav-banner {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 20px; padding: 14px 16px; border-radius: 12px;
    background: var(--red-bg); color: #7a1408; font-weight: 500;
}
.fav-banner > svg { flex: none; color: var(--red); }
.fav-banner span { flex: 1; }
.fav-banner__close {
    flex: none; width: 36px; height: 36px; border: 0; border-radius: 50%;
    background: transparent; color: inherit; font-size: 22px; line-height: 1; cursor: pointer;
}
.fav-banner__close:hover { background: rgba(0,0,0,.06); }

/* Empty / error / no-results states */
.fav-state {
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: 56px 24px; border-radius: var(--radius); background: var(--surface);
}
.fav-state__icon {
    width: 64px; height: 64px; margin-bottom: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #fff; color: var(--ink);
}
.fav-state__icon--heart { color: var(--red); }
.fav-state--error .fav-state__icon { color: var(--red); }
.fav-state__title { margin: 0 0 8px; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.fav-state__text { margin: 0 0 24px; max-width: 420px; color: var(--ink-2); }

/* Loading skeleton */
.fav-skeleton { gap: 14px; }
.fav-skeleton__row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.fav-skeleton__block { display: block; border-radius: 8px; background: var(--surface-2); }
.fav-skeleton__avatar { width: 52px; height: 52px; border-radius: 50%; }
.fav-skeleton__pill { width: 104px; height: 28px; border-radius: 999px; }
.fav-skeleton__title { width: 65%; height: 24px; }
.fav-skeleton__line { width: 100%; height: 16px; }
.fav-skeleton__line--short { width: 55%; }
.fav-skeleton__button { width: 100%; height: 48px; margin-top: 10px; border-radius: 12px; }

@media (prefers-reduced-motion: no-preference) {
    .fav-skeleton__block {
        background: linear-gradient(90deg, var(--surface-2) 25%, #f7f7f7 50%, var(--surface-2) 75%);
        background-size: 200% 100%;
        animation: fav-shimmer 1.4s ease-in-out infinite;
    }
    @keyframes fav-shimmer {
        from { background-position: 200% 0; }
        to { background-position: -200% 0; }
    }
}

@media (prefers-reduced-motion: reduce) {
    .fav-root * { transition: none !important; }
}

@media (max-width: 600px) {
    .fav-header__cta { width: 100%; }
    .fav-search { max-width: none; }
    .fav-card { padding: 20px; }
}
`;

export default Favorites;