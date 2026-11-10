import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

/* ----------------------------- Icons ----------------------------- */
/* Small inline icons, no extra dependency needed. All inherit color
   via currentColor so they follow text/theme colors automatically. */

const IconArrowLeft = (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 12H5" />
        <path d="M11 18l-6-6 6-6" />
    </svg>
);

const IconSearch = (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
    </svg>
);

const IconPin = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const IconWrench = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />
    </svg>
);

const IconPhone = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .8 2.9a2 2 0 0 1-.4 2.2L8.1 10a16 16 0 0 0 6 6l1.2-1.4a2 2 0 0 1 2.2-.4c.9.4 1.9.7 2.9.8a2 2 0 0 1 1.7 2Z" />
    </svg>
);

const IconHeart = ({ filled, ...props }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20.8 8.6c0 4.5-8.8 10.4-8.8 10.4S3.2 13.1 3.2 8.6a4.9 4.9 0 0 1 8.8-3 4.9 4.9 0 0 1 8.8 3Z" />
    </svg>
);

const IconAlert = (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
    </svg>
);

const IconRefresh = (props) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v6h-6" />
    </svg>
);

/* --------------------------- Helpers --------------------------- */

const initialsOf = (name = "") =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "RA";

/* --------------------------- Component --------------------------- */

function Mechanics() {

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const requestId = searchParams.get("reassign");

    const [mechanics, setMechanics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectingId, setSelectingId] = useState(null);
    const [selectError, setSelectError] = useState("");
    const [favorites, setFavorites] = useState([]);
    const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);

    const [query, setQuery] = useState("");
    const [favoritesFirst, setFavoritesFirst] = useState(false);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        loadMechanics();
        loadFavorites();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(t);
    }, [toast]);

    const loadMechanics = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/mechanics");
            setMechanics(response.data);

        } catch (error) {
            console.error("Failed to load mechanics:", error);
            setError(
                error.response?.data?.message ||
                "Failed to load available mechanics."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMechanic = async (mechanicId) => {
        if (!requestId) return;

        try {
            setSelectingId(mechanicId);
            setSelectError("");

            await api.put(`/requests/${requestId}/reassign/${mechanicId}`);
            navigate(`/customer/requests/${requestId}`);

        } catch (error) {
            console.error("Failed to assign mechanic:", error);
            setSelectError(
                error.response?.data?.message ||
                "Unable to assign this mechanic."
            );
        } finally {
            setSelectingId(null);
        }
    };

    const loadFavorites = async () => {
        try {
            const response = await api.get("/favorites");
            setFavorites(response.data);
        } catch (error) {
            console.error("Failed to load favorites:", error);
        }
    };

    const isFavorite = (mechanicId) =>
        favorites.some((favorite) => favorite.mechanic?.id === mechanicId);

    const toggleFavorite = async (mechanicId) => {
        try {
            setFavoriteLoadingId(mechanicId);

            if (isFavorite(mechanicId)) {
                await api.delete(`/favorites/${mechanicId}`);
                setFavorites(
                    favorites.filter((favorite) => favorite.mechanic?.id !== mechanicId)
                );
                setToast({ type: "success", message: "Removed from favorites." });
            } else {
                const response = await api.post(`/favorites/${mechanicId}`);
                setFavorites([...favorites, response.data]);
                setToast({ type: "success", message: "Added to favorites." });
            }
        } catch (error) {
            console.error("Failed to update favorite:", error);
            setToast({
                type: "error",
                message: error.response?.data?.message || "Unable to update favorite.",
            });
        } finally {
            setFavoriteLoadingId(null);
        }
    };

    const visibleMechanics = useMemo(() => {
        const q = query.trim().toLowerCase();

        let list = !q
            ? mechanics
            : mechanics.filter((m) =>
                [m.workshopName, m.workshopAddress]
                    .filter(Boolean)
                    .some((field) => field.toLowerCase().includes(q))
            );

        if (favoritesFirst) {
            list = [...list].sort(
                (a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id))
            );
        }

        return list;
    }, [mechanics, query, favoritesFirst, favorites]);

    const hasAnyMechanics = mechanics.length > 0;
    const hasResults = visibleMechanics.length > 0;

    return (
        <CustomerLayout>
            <div className="rm-page">
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');

                    .rm-page {
                        --rm-bg: #FAFAF9;
                        --rm-surface: #FFFFFF;
                        --rm-border: #E7E5E1;
                        --rm-text: #17191C;
                        --rm-muted: #6C7176;
                        --rm-accent: #FF5A1F;
                        --rm-accent-dark: #DE4D17;
                        --rm-success: #1E9E6B;
                        --rm-success-bg: #E8F7F0;
                        --rm-danger: #D64545;
                        --rm-danger-bg: #FDECEC;
                        --rm-radius: 14px;
                        font-family: 'Inter', -apple-system, sans-serif;
                        color: var(--rm-text);
                        background: var(--rm-bg);
                        margin: -1.5rem -1.5rem 0;
                        padding: 1.75rem 1.5rem 3rem;
                        min-height: 100%;
                    }
                    .rm-page * { box-sizing: border-box; }
                    .rm-page h1, .rm-page h2, .rm-page h5 {
                        font-family: 'Manrope', 'Inter', sans-serif;
                    }

                    .rm-back {
                        display: inline-flex; align-items: center; gap: 6px;
                        background: none; border: none; padding: 4px 0;
                        color: var(--rm-muted); font-size: 0.9rem; font-weight: 600;
                        cursor: pointer; margin-bottom: 14px;
                        transition: color .15s ease;
                    }
                    .rm-back:hover { color: var(--rm-text); }
                    .rm-back:focus-visible { outline: 2px solid var(--rm-accent); outline-offset: 3px; border-radius: 4px; }

                    .rm-title { font-size: 1.7rem; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em; }
                    .rm-subtitle { color: var(--rm-muted); font-size: 0.98rem; margin: 0 0 22px; max-width: 60ch; }

                    .rm-banner {
                        display: flex; gap: 12px; align-items: flex-start;
                        background: var(--rm-surface); border: 1px solid var(--rm-border);
                        border-left: 3px solid var(--rm-accent);
                        border-radius: var(--rm-radius); padding: 14px 16px; margin-bottom: 20px;
                    }
                    .rm-banner strong { font-weight: 700; font-size: 0.95rem; }
                    .rm-banner p { margin: 4px 0 0; color: var(--rm-muted); font-size: 0.9rem; }

                    .rm-toolbar {
                        display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
                        margin-bottom: 22px;
                    }
                    .rm-search {
                        position: relative; flex: 1 1 280px; max-width: 420px;
                    }
                    .rm-search svg {
                        position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
                        color: var(--rm-muted); pointer-events: none;
                    }
                    .rm-search input {
                        width: 100%; padding: 11px 14px 11px 40px;
                        border-radius: 999px; border: 1px solid var(--rm-border);
                        background: var(--rm-surface); font: inherit; font-size: 0.92rem;
                        transition: border-color .15s ease, box-shadow .15s ease;
                    }
                    .rm-search input:focus {
                        outline: none; border-color: var(--rm-text);
                        box-shadow: 0 0 0 3px rgba(23,25,28,0.08);
                    }
                    .rm-toggle {
                        display: inline-flex; align-items: center; gap: 8px;
                        font-size: 0.88rem; font-weight: 600; color: var(--rm-muted);
                        cursor: pointer; user-select: none;
                    }
                    .rm-toggle input { accent-color: var(--rm-text); width: 16px; height: 16px; cursor: pointer; }

                    .rm-grid {
                        display: grid; gap: 18px;
                        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    }

                    .rm-card {
                        background: var(--rm-surface); border: 1px solid var(--rm-border);
                        border-radius: var(--rm-radius); padding: 20px;
                        display: flex; flex-direction: column;
                        transition: box-shadow .18s ease, transform .18s ease;
                    }
                    .rm-card:hover { box-shadow: 0 6px 20px rgba(23,25,28,0.07); }

                    .rm-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
                    .rm-avatar {
                        width: 48px; height: 48px; border-radius: 12px;
                        background: var(--rm-text); color: #fff;
                        display: flex; align-items: center; justify-content: center;
                        font-weight: 700; font-size: 0.95rem; font-family: 'Manrope', sans-serif;
                        flex-shrink: 0;
                    }
                    .rm-status {
                        display: inline-flex; align-items: center; gap: 6px;
                        background: var(--rm-success-bg); color: var(--rm-success);
                        font-size: 0.76rem; font-weight: 700; padding: 5px 10px; border-radius: 999px;
                        white-space: nowrap;
                    }
                    .rm-status::before {
                        content: ''; width: 6px; height: 6px; border-radius: 50%;
                        background: var(--rm-success); display: inline-block;
                    }

                    .rm-name { font-size: 1.08rem; font-weight: 700; margin: 0 0 10px; line-height: 1.3; }

                    .rm-row {
                        display: flex; align-items: flex-start; gap: 8px;
                        font-size: 0.88rem; color: var(--rm-text); margin-bottom: 8px;
                    }
                    .rm-row svg { color: var(--rm-muted); margin-top: 2px; flex-shrink: 0; }
                    .rm-row-label { color: var(--rm-muted); }

                    .rm-stats {
                        display: flex; gap: 10px; margin: 4px 0 16px;
                    }
                    .rm-stat {
                        flex: 1; background: var(--rm-bg); border: 1px solid var(--rm-border);
                        border-radius: 10px; padding: 10px 12px;
                    }
                    .rm-stat-label {
                        display: flex; align-items: center; gap: 6px;
                        font-size: 0.74rem; color: var(--rm-muted); font-weight: 600;
                        margin-bottom: 3px;
                    }
                    .rm-stat-value { font-size: 0.92rem; font-weight: 700; }

                    .rm-actions { display: flex; gap: 10px; margin-top: auto; }

                    .rm-fav-btn {
                        width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
                        border: 1px solid var(--rm-border); background: var(--rm-surface);
                        display: flex; align-items: center; justify-content: center;
                        color: var(--rm-danger); cursor: pointer;
                        transition: background .15s ease, border-color .15s ease, transform .1s ease;
                    }
                    .rm-fav-btn:hover { background: var(--rm-danger-bg); border-color: var(--rm-danger); }
                    .rm-fav-btn:active { transform: scale(0.94); }
                    .rm-fav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                    .rm-fav-btn:focus-visible { outline: 2px solid var(--rm-accent); outline-offset: 2px; }

                    .rm-btn-primary, .rm-btn-secondary {
                        flex: 1; border: none; border-radius: 10px; padding: 0 16px; height: 44px;
                        font-weight: 700; font-size: 0.9rem; cursor: pointer;
                        display: flex; align-items: center; justify-content: center; gap: 6px;
                        transition: background .15s ease, opacity .15s ease;
                    }
                    .rm-btn-primary { background: var(--rm-text); color: #fff; }
                    .rm-btn-primary:hover { background: #000; }
                    .rm-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
                    .rm-btn-secondary { background: var(--rm-bg); color: var(--rm-text); border: 1px solid var(--rm-border); }
                    .rm-btn-secondary:hover { background: #F0EFEB; }
                    .rm-btn-primary:focus-visible, .rm-btn-secondary:focus-visible {
                        outline: 2px solid var(--rm-accent); outline-offset: 2px;
                    }

                    .rm-panel {
                        background: var(--rm-surface); border: 1px solid var(--rm-border);
                        border-radius: var(--rm-radius); padding: 56px 24px; text-align: center;
                    }
                    .rm-panel-icon {
                        width: 56px; height: 56px; border-radius: 14px; margin: 0 auto 16px;
                        display: flex; align-items: center; justify-content: center;
                    }
                    .rm-panel h5 { font-size: 1.05rem; font-weight: 700; margin: 0 0 6px; }
                    .rm-panel p { color: var(--rm-muted); font-size: 0.9rem; margin: 0 auto 18px; max-width: 42ch; }

                    .rm-btn-dark {
                        display: inline-flex; align-items: center; gap: 7px;
                        background: var(--rm-text); color: #fff; border: none;
                        border-radius: 10px; padding: 10px 20px; font-weight: 700;
                        font-size: 0.88rem; cursor: pointer; transition: background .15s ease;
                    }
                    .rm-btn-dark:hover { background: #000; }

                    .rm-error-banner {
                        display: flex; gap: 10px; align-items: center;
                        background: var(--rm-danger-bg); color: var(--rm-danger);
                        border-radius: 10px; padding: 12px 14px; margin-bottom: 20px;
                        font-size: 0.9rem; font-weight: 600;
                    }

                    .rm-skeleton {
                        background: var(--rm-surface); border: 1px solid var(--rm-border);
                        border-radius: var(--rm-radius); padding: 20px; height: 268px;
                    }
                    .rm-sk-block {
                        background: linear-gradient(90deg, #F0EFEC 25%, #F7F6F4 37%, #F0EFEC 63%);
                        background-size: 400% 100%;
                        animation: rm-shimmer 1.4s ease infinite;
                        border-radius: 8px;
                    }
                    @keyframes rm-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

                    .rm-toast {
                        position: fixed; bottom: 24px; right: 24px; z-index: 1000;
                        display: flex; align-items: center; gap: 10px;
                        background: var(--rm-text); color: #fff;
                        padding: 13px 18px; border-radius: 10px;
                        font-size: 0.88rem; font-weight: 600;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.18);
                        animation: rm-toast-in .2s ease;
                    }
                    .rm-toast.error { background: var(--rm-danger); }
                    @keyframes rm-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

                    @media (prefers-reduced-motion: reduce) {
                        .rm-card, .rm-toast, .rm-sk-block { animation: none !important; transition: none !important; }
                    }
                `}</style>

                {/* HEADER */}
                <button
                    type="button"
                    className="rm-back"
                    onClick={() =>
                        requestId
                            ? navigate(`/customer/requests/${requestId}`)
                            : navigate("/customer")
                    }
                >
                    <IconArrowLeft /> Back
                </button>

                <h1 className="rm-title">
                    {requestId ? "Choose a mechanic" : "Find a mechanic"}
                </h1>
                <p className="rm-subtitle">
                    {requestId
                        ? `Pick an available mechanic to reassign to request #${requestId}.`
                        : "Browse mechanics currently available near you."}
                </p>

                {/* REASSIGNMENT INFO */}
                {requestId && (
                    <div className="rm-banner">
                        <div>
                            <strong>Reassigning request #{requestId}</strong>
                            <p>Your request moves to whichever mechanic you select below.</p>
                        </div>
                    </div>
                )}

                {/* SELECT ERROR */}
                {selectError && (
                    <div className="rm-error-banner">
                        <IconAlert width="18" height="18" />
                        {selectError}
                    </div>
                )}

                {/* TOOLBAR */}
                {!loading && !error && hasAnyMechanics && (
                    <div className="rm-toolbar">
                        <div className="rm-search">
                            <IconSearch />
                            <input
                                type="text"
                                placeholder="Search by workshop or location"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                aria-label="Search mechanics"
                            />
                        </div>
                        <label className="rm-toggle">
                            <input
                                type="checkbox"
                                checked={favoritesFirst}
                                onChange={(e) => setFavoritesFirst(e.target.checked)}
                            />
                            Favorites first
                        </label>
                    </div>
                )}

                {/* LOADING SKELETONS */}
                {loading && (
                    <div className="rm-grid" aria-busy="true" aria-label="Loading mechanics">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div className="rm-skeleton" key={i}>
                                <div className="rm-sk-block" style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 16 }} />
                                <div className="rm-sk-block" style={{ width: "70%", height: 16, marginBottom: 10 }} />
                                <div className="rm-sk-block" style={{ width: "90%", height: 12, marginBottom: 8 }} />
                                <div className="rm-sk-block" style={{ width: "60%", height: 12, marginBottom: 20 }} />
                                <div className="rm-sk-block" style={{ width: "100%", height: 44, borderRadius: 10 }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* ERROR STATE */}
                {!loading && error && (
                    <div className="rm-panel">
                        <div className="rm-panel-icon" style={{ background: "var(--rm-danger-bg)", color: "var(--rm-danger)" }}>
                            <IconAlert />
                        </div>
                        <h5>Couldn't load mechanics</h5>
                        <p>{error}</p>
                        <button className="rm-btn-dark" onClick={loadMechanics}>
                            <IconRefresh /> Try again
                        </button>
                    </div>
                )}

                {/* NO MECHANICS AT ALL */}
                {!loading && !error && !hasAnyMechanics && (
                    <div className="rm-panel">
                        <div className="rm-panel-icon" style={{ background: "var(--rm-bg)", border: "1px solid var(--rm-border)" }}>
                            <IconWrench width="22" height="22" />
                        </div>
                        <h5>No mechanics available</h5>
                        <p>There are no mechanics online right now. Please check back shortly.</p>
                        <button className="rm-btn-dark" onClick={loadMechanics}>
                            <IconRefresh /> Refresh
                        </button>
                    </div>
                )}

                {/* SEARCH: NO RESULTS */}
                {!loading && !error && hasAnyMechanics && !hasResults && (
                    <div className="rm-panel">
                        <div className="rm-panel-icon" style={{ background: "var(--rm-bg)", border: "1px solid var(--rm-border)" }}>
                            <IconSearch width="20" height="20" />
                        </div>
                        <h5>No matches for "{query}"</h5>
                        <p>Try a different workshop name or location.</p>
                        <button className="rm-btn-secondary" style={{ flex: "none", padding: "0 20px" }} onClick={() => setQuery("")}>
                            Clear search
                        </button>
                    </div>
                )}

                {/* MECHANIC GRID */}
                {!loading && !error && hasResults && (
                    <div className="rm-grid">
                        {visibleMechanics.map((mechanic) => {
                            const favorite = isFavorite(mechanic.id);
                            const favLoading = favoriteLoadingId === mechanic.id;

                            return (
                                <div className="rm-card" key={mechanic.id}>
                                    <div className="rm-card-top">
                                        <div className="rm-avatar">{initialsOf(mechanic.workshopName)}</div>
                                        <span className="rm-status">Available</span>
                                    </div>

                                    <h5 className="rm-name">{mechanic.workshopName}</h5>

                                    <div className="rm-row">
                                        <IconPin />
                                        <span>{mechanic.workshopAddress}</span>
                                    </div>

                                    <div className="rm-stats">
                                        <div className="rm-stat">
                                            <div className="rm-stat-label"><IconWrench width="13" height="13" /> Experience</div>
                                            <div className="rm-stat-value">
                                                {mechanic.experienceYears} {mechanic.experienceYears === 1 ? "year" : "years"}
                                            </div>
                                        </div>
                                        <div className="rm-stat">
                                            <div className="rm-stat-label"><IconPhone width="13" height="13" /> Contact</div>
                                            <div className="rm-stat-value">{mechanic.contactNumber}</div>
                                        </div>
                                    </div>

                                    <div className="rm-actions">
                                        <button
                                            type="button"
                                            className="rm-fav-btn"
                                            disabled={favLoading}
                                            onClick={() => toggleFavorite(mechanic.id)}
                                            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                                            aria-pressed={favorite}
                                        >
                                            <IconHeart filled={favorite} />
                                        </button>

                                        {requestId ? (
                                            <button
                                                type="button"
                                                className="rm-btn-primary"
                                                disabled={selectingId !== null}
                                                onClick={() => handleSelectMechanic(mechanic.id)}
                                            >
                                                {selectingId === mechanic.id ? "Assigning…" : "Select mechanic"}
                                            </button>
                                        ) : (
                                            <a
                                                className="rm-btn-secondary"
                                                href={`tel:${mechanic.contactNumber}`}
                                                style={{ textDecoration: "none" }}
                                            >
                                                <IconPhone width="15" height="15" /> Call workshop
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* TOAST */}
                {toast && (
                    <div className={`rm-toast ${toast.type === "error" ? "error" : ""}`} role="status">
                        {toast.message}
                    </div>
                )}
            </div>
        </CustomerLayout>
    );
}

export default Mechanics;