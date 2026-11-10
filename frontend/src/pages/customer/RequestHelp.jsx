import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    getMyVehicles,
    getNearbyMechanics,
    createRequest,
    getMyFavorites,
    addFavorite,
    removeFavorite
} from "../../services/customerService";
import CustomerLayout from "../../layouts/CustomerLayout";
import NearbyMechanicsMap from "../../components/customer/NearbyMechanicsMap";
import "../../styles/Requesthelp.css";

import {
    FaCarSide,
    FaTools,
    FaMapMarkerAlt,
    FaUserCog,
    FaClipboardCheck,
    FaCheck,
    FaCheckCircle,
    FaChevronLeft,
    FaChevronRight,
    FaChevronDown,
    FaChevronUp,
    FaPlus,
    FaCogs,
    FaCarBattery,
    FaGasPump,
    FaThermometerHalf,
    FaCompactDisc,
    FaBolt,
    FaCarCrash,
    FaEllipsisH,
    FaCamera,
    FaImages,
    FaTimes,
    FaLocationArrow,
    FaSpinner,
    FaExclamationTriangle,
    FaStar,
    FaBriefcase,
    FaPhoneAlt,
    FaRoad,
    FaRegEdit,
    FaPaperPlane,
    FaShieldAlt,
    FaInfoCircle,
    FaLifeRing,
    FaHeart,
    FaRegHeart,
    FaRedo,
    FaSearch
} from "react-icons/fa";
import { MdOutlineTireRepair } from "react-icons/md";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const FAVORITES_KEY = "roadaidFavoriteMechanics";
const SEARCH_RADIUS_KM = 10;
const POLL_INTERVAL_MS = 10000;
const REDIRECT_DELAY_MS = 1400;

const DESCRIPTION_MAX = 500;
const LANDMARK_MAX = 150;
const MAX_PHOTOS = 5;
const MAX_PHOTO_MB = 10;

// Address search is limited to this country (ISO 3166-1 alpha-2, lowercase).
const GEOCODE_COUNTRY = "in";
const GEOCODE_BASE_URL = "https://nominatim.openstreetmap.org";
const EMERGENCY_NUMBER = "112";

const STEPS = [
    { id: 1, label: "Vehicle" },
    { id: 2, label: "Problem" },
    { id: 3, label: "Location" },
    { id: 4, label: "Provider" },
    { id: 5, label: "Review" }
];

const PROBLEM_CATEGORIES = [
    "Engine / Starting",
    "Battery",
    "Flat Tyre",
    "Fuel Problem",
    "Overheating",
    "Brake Problem",
    "Electrical Problem",
    "Accident / Collision",
    "Other"
];

const PROBLEM_CATEGORY_ICONS = {
    "Engine / Starting": FaCogs,
    "Battery": FaCarBattery,
    "Flat Tyre": MdOutlineTireRepair,
    "Fuel Problem": FaGasPump,
    "Overheating": FaThermometerHalf,
    "Brake Problem": FaCompactDisc,
    "Electrical Problem": FaBolt,
    "Accident / Collision": FaCarCrash,
    "Other": FaEllipsisH
};

const SORT_OPTIONS = [
    { value: "recommended", label: "Recommended" },
    { value: "nearest", label: "Nearest first" },
    { value: "rating", label: "Top rated" }
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pluralize = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const formatCoords = (lat, lng) => `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

// Unknown distance sorts last (Infinity) instead of pretending to be 0 km.
function distanceOf(mechanic) {
    if (mechanic.distanceKm == null || mechanic.distanceKm === "") return Infinity;
    const value = Number(mechanic.distanceKm);
    return Number.isFinite(value) ? value : Infinity;
}

function ratingOf(mechanic) {
    const value = Number(mechanic.averageRating);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatDistance(km) {
    if (!Number.isFinite(km)) return "—";
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function sortMechanics(list, mode, isFavorite) {
    const byDistance = (a, b) => distanceOf(a) - distanceOf(b);
    const copy = [...list];

    if (mode === "nearest") return copy.sort(byDistance);

    if (mode === "rating") {
        return copy.sort((a, b) => ratingOf(b) - ratingOf(a) || byDistance(a, b));
    }

    // "recommended": favourites first, then nearest.
    return copy.sort((a, b) => {
        const favoriteDiff = Number(isFavorite(b)) - Number(isFavorite(a));
        return favoriteDiff || byDistance(a, b);
    });
}

function getErrorMessage(error, fallback) {
    const serverMessage = error?.response?.data?.message;
    if (typeof serverMessage === "string" && serverMessage.trim()) {
        return serverMessage;
    }
    if (error && !error.response) {
        return "We couldn't reach the server. Check your connection and try again.";
    }
    return fallback;
}

function scrollOptions(extra = {}) {
    const reduce =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return { behavior: reduce ? "auto" : "smooth", ...extra };
}

async function geocodeAddress(query, signal) {
    const params = new URLSearchParams({
        format: "jsonv2",
        limit: "1",
        q: query,
        countrycodes: GEOCODE_COUNTRY,
        "accept-language": "en"
    });
    const response = await fetch(`${GEOCODE_BASE_URL}/search?${params}`, { signal });
    if (!response.ok) throw new Error("Geocoding failed");

    const [top] = await response.json();
    if (!top) return null;

    const lat = Number(top.lat);
    const lng = Number(top.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng, label: top.display_name };
}

async function reverseGeocode(lat, lng, signal) {
    const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lng),
        zoom: "17",
        "accept-language": "en"
    });
    const response = await fetch(`${GEOCODE_BASE_URL}/reverse?${params}`, { signal });
    if (!response.ok) throw new Error("Reverse geocoding failed");

    const data = await response.json();
    return data?.display_name || null;
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function useIsMounted() {
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);
    return mounted;
}

function readFavorites() {
    try {
        const parsed = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
}

function useFavoriteMechanics() {
    const [favoriteIds, setFavoriteIds] = useState([]);
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const response = await getMyFavorites();
                const ids = (response.data || []).map((favorite) =>
                    String(favorite.mechanic?.id ?? favorite.mechanicId)
                );
                setFavoriteIds(ids);
            } catch (error) {
                console.error("Failed to load favorites:", error);
            }
        };

        loadFavorites();
    }, []);

    // Persist as an effect (not inside a state updater) so it stays pure.


    // Keep several open tabs in sync.


    const toggleFavorite = useCallback(async (mechanicId) => {
        const id = String(mechanicId);

        try {
            if (favoriteIds.includes(id)) {
                await removeFavorite(Number(mechanicId));
                setFavoriteIds((current) =>
                    current.filter((favoriteId) => favoriteId !== id)
                );
            } else {
                await addFavorite(Number(mechanicId));
                setFavoriteIds((current) => [...current, id]);
            }
        } catch (error) {
            console.error("Failed to update favorite:", error);
        }
    }, [favoriteIds]);

    return { favoriteIds, toggleFavorite };
}

function usePhotoUploads() {
    const [photos, setPhotos] = useState([]);
    const [error, setError] = useState("");
    const photosRef = useRef([]);

    // Revoke every object URL when the page unmounts.
    useEffect(() => {
        return () => {
            photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
        };
    }, []);

    const commit = (next) => {
        photosRef.current = next;
        setPhotos(next);
    };

    const addFiles = useCallback((fileList) => {
        const incoming = Array.from(fileList || []);
        if (incoming.length === 0) return;

        const next = [...photosRef.current];
        const problems = new Set();

        for (const file of incoming) {
            if (!file.type.startsWith("image/")) {
                problems.add(`"${file.name}" isn't an image.`);
                continue;
            }
            if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
                problems.add(`"${file.name}" is larger than ${MAX_PHOTO_MB} MB.`);
                continue;
            }

            const id = `${file.name}-${file.size}-${file.lastModified}`;
            if (next.some((photo) => photo.id === id)) continue;

            if (next.length >= MAX_PHOTOS) {
                problems.add(`You can attach up to ${MAX_PHOTOS} photos.`);
                break;
            }

            next.push({ id, file, url: URL.createObjectURL(file) });
        }

        commit(next);
        setError([...problems].join(" "));
    }, []);

    const removePhoto = useCallback((id) => {
        const target = photosRef.current.find((photo) => photo.id === id);
        if (target) URL.revokeObjectURL(target.url);
        commit(photosRef.current.filter((photo) => photo.id !== id));
        setError("");
    }, []);

    return { photos, error, addFiles, removePhoto };
}

/**
 * Loads mechanics near a point while `enabled`, then refreshes quietly.
 * - Results are keyed by coordinates, so a stale list never shows for a new location.
 * - A failed background refresh keeps the last good list instead of wiping it.
 * - Polling pauses while the tab is hidden.
 * - `onSelectionLost` fires when the chosen mechanic disappears from fresh results.
 */
function useNearbyMechanics({ enabled, lat, lng, selectedId, onSelectionLost }) {
    const key = lat != null && lng != null ? `${lat},${lng}` : null;

    const [data, setData] = useState({ key: null, list: [] });
    const [errorState, setErrorState] = useState({ key: null, message: "" });
    const [stale, setStale] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const latest = useRef({});
    useEffect(() => {
        latest.current = { selectedId, onSelectionLost, readyKey: data.key };
    });

    useEffect(() => {
        if (!enabled || key === null) return undefined;

        let cancelled = false;
        let inFlight = false;

        const load = async () => {
            if (inFlight) return;
            inFlight = true;

            try {
                const response = await getNearbyMechanics(lat, lng, SEARCH_RADIUS_KM);
                if (cancelled) return;

                const list = Array.isArray(response?.data) ? response.data : [];
                setData({ key, list });
                setErrorState({ key: null, message: "" });
                setStale(false);

                const { selectedId: current, onSelectionLost: notify } = latest.current;
                if (current && !list.some((m) => String(m.mechanicId) === current)) {
                    notify?.();
                }
            } catch (error) {
                if (cancelled) return;

                if (latest.current.readyKey === key) {
                    setStale(true); // keep showing the last good list
                } else {
                    setErrorState({
                        key,
                        message: getErrorMessage(
                            error,
                            "We couldn't load nearby mechanics. Please try again."
                        )
                    });
                }
            } finally {
                inFlight = false;
            }
        };

        const onVisible = () => {
            if (!document.hidden) load();
        };

        load();
        const timer = setInterval(onVisible, POLL_INTERVAL_MS);
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            cancelled = true;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [enabled, key, lat, lng, reloadKey]);

    const ready = data.key === key;
    const error = errorState.key === key ? errorState.message : "";

    const retry = useCallback(() => {
        setErrorState({ key: null, message: "" });
        setReloadKey((n) => n + 1);
    }, []);

    return {
        mechanics: ready ? data.list : [],
        loading: Boolean(enabled && key !== null && !ready && !error),
        error,
        stale,
        retry
    };
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function SectionHeading({ icon: Icon, title, subtitle }) {
    return (
        <div className="raid-section-heading">
            <h2 className="raid-section-title" tabIndex={-1} data-step-heading>
                <Icon aria-hidden="true" />
                <span>{title}</span>
            </h2>
            {subtitle && <p className="raid-section-subtitle">{subtitle}</p>}
        </div>
    );
}

function Stepper({ step, onJump }) {
    const current = STEPS[step - 1];

    return (
        <div className="raid-stepper">
            <ol className="raid-stepper-full" aria-label="Request progress">
                {STEPS.map((s, index) => {
                    const state =
                        step === s.id ? "current" : step > s.id ? "done" : "upcoming";
                    const isLast = index === STEPS.length - 1;
                    const canJump = state === "done" && typeof onJump === "function";

                    const content = (
                        <>
                            <span className="raid-step-circle" data-state={state}>
                                {state === "done" ? (
                                    <FaCheck aria-hidden="true" />
                                ) : (
                                    s.id
                                )}
                            </span>
                            <span className="raid-step-label" data-state={state}>
                                {s.label}
                                {state === "done" && (
                                    <span className="raid-sr-only"> (completed)</span>
                                )}
                            </span>
                        </>
                    );

                    return (
                        <li
                            key={s.id}
                            className="raid-step"
                            data-last={isLast}
                            aria-current={state === "current" ? "step" : undefined}
                        >
                            {canJump ? (
                                <button
                                    type="button"
                                    className="raid-step-item raid-step-item-button"
                                    onClick={() => onJump(s.id)}
                                >
                                    {content}
                                </button>
                            ) : (
                                <div className="raid-step-item">{content}</div>
                            )}
                            {!isLast && (
                                <span
                                    className="raid-step-line"
                                    data-filled={step > s.id}
                                    aria-hidden="true"
                                />
                            )}
                        </li>
                    );
                })}
            </ol>

            <div
                className="raid-stepper-compact"
                role="progressbar"
                aria-label="Request progress"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={step}
                aria-valuetext={`Step ${step} of ${STEPS.length}: ${current.label}`}
            >
                <div className="raid-stepper-compact-top">
                    <span>
                        Step {step} of {STEPS.length}
                    </span>
                    <span className="raid-stepper-compact-label">{current.label}</span>
                </div>
                <div className="raid-stepper-compact-track">
                    <div
                        className="raid-stepper-compact-fill"
                        style={{ width: `${(step / STEPS.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

function Panel({ tone = "neutral", icon: Icon, title, children }) {
    const role =
        tone === "danger" ? "alert" : tone === "success" ? "status" : undefined;

    return (
        <div className={`raid-panel raid-panel-${tone}`} role={role}>
            {Icon && (
                <span className="raid-panel-icon" aria-hidden="true">
                    <Icon />
                </span>
            )}
            <div className="raid-panel-body">
                {title && <div className="raid-panel-title">{title}</div>}
                <div className="raid-panel-text">{children}</div>
            </div>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="raid-skeleton-card" aria-hidden="true">
            <div className="raid-skeleton-line" style={{ width: "45%", height: 16 }} />
            <div className="raid-skeleton-line" style={{ width: "85%" }} />
            <div className="raid-skeleton-line" style={{ width: "60%" }} />
        </div>
    );
}

function LoadingBlock({ message, count, layoutClass }) {
    return (
        <>
            <div className="raid-loading-row" role="status">
                <FaSpinner className="raid-spin-icon" aria-hidden="true" />
                {message}
            </div>
            <div className={layoutClass} aria-hidden="true">
                {Array.from({ length: count }, (_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        </>
    );
}

function StepFooter({
                        onBack,
                        onNext,
                        nextLabel,
                        NextIcon = FaChevronRight,
                        nextDisabled = false,
                        nextLoading = false,
                        hint
                    }) {
    return (
        <div className="raid-step-footer">
            {hint && <div className="raid-step-hint">{hint}</div>}
            <div className="raid-step-footer-row">
                {onBack ? (
                    <button
                        type="button"
                        className="raid-btn raid-btn-secondary"
                        onClick={onBack}
                    >
                        <FaChevronLeft aria-hidden="true" /> Back
                    </button>
                ) : (
                    <span aria-hidden="true" />
                )}

                <button
                    type="button"
                    className="raid-btn raid-btn-primary"
                    onClick={onNext}
                    disabled={nextDisabled || nextLoading}
                >
                    {nextLoading ? (
                        <FaSpinner className="raid-spin-icon" aria-hidden="true" />
                    ) : (
                        <NextIcon aria-hidden="true" />
                    )}
                    <span>{nextLabel}</span>
                </button>
            </div>
        </div>
    );
}

function VehicleCard({ vehicle, isSelected, onSelect }) {
    const inputId = `vehicle-${vehicle.id}`;
    const details = [vehicle.fuelType, vehicle.manufacturingYear].filter(Boolean);

    return (
        <label className="raid-vehicle-card" data-selected={isSelected} htmlFor={inputId}>
            <input
                type="radio"
                name="vehicle"
                id={inputId}
                value={vehicle.id}
                checked={isSelected}
                onChange={onSelect}
                className="raid-sr-only"
            />
            <span className="raid-vehicle-icon" aria-hidden="true">
                <FaCarSide />
            </span>
            <span className="raid-vehicle-info">
                <span className="raid-vehicle-name">
                    {vehicle.brand} {vehicle.model}
                </span>
                <span className="raid-vehicle-meta">
                    {[vehicle.registrationNumber, ...details].filter(Boolean).join(" · ")}
                </span>
            </span>
            <span className="raid-vehicle-check" aria-hidden="true">
                <FaCheckCircle />
            </span>
        </label>
    );
}

function MechanicCard({ mechanic, isSelected, isFavorite, onSelect, onToggleFavorite }) {
    const id = String(mechanic.mechanicId);
    const inputId = `mechanic-${id}`;
    const name = mechanic.name || "Mechanic";
    const rating = ratingOf(mechanic);
    const experience = mechanic.experienceYears;
    const phone = mechanic.contactNumber ? String(mechanic.contactNumber) : "";

    return (
        <div
            id={`mechanic-card-${id}`}
            className="raid-mechanic-card"
            data-selected={isSelected}
            data-favorite={isFavorite}
        >
            <input
                type="radio"
                name="mechanic"
                id={inputId}
                value={id}
                checked={isSelected}
                onChange={onSelect}
                className="raid-sr-only"
            />

            {isSelected && (
                <div className="raid-mechanic-selected-badge">
                    <FaCheckCircle aria-hidden="true" /> Selected
                </div>
            )}

            <div className="raid-mechanic-card-header">
                <label htmlFor={inputId} className="raid-mechanic-main-info">
                    <span className="raid-mechanic-avatar" aria-hidden="true">
                        {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="raid-mechanic-identity">
                        <span className="raid-mechanic-name">{name}</span>
                        {mechanic.workshopName && (
                            <span className="raid-mechanic-workshop">
                                {mechanic.workshopName}
                            </span>
                        )}
                    </span>
                </label>

                <div className="raid-mechanic-header-actions">
                    <button
                        type="button"
                        className="raid-favorite-button"
                        data-active={isFavorite}
                        onClick={() => onToggleFavorite(mechanic.mechanicId)}
                        aria-pressed={isFavorite}
                        aria-label={`Favourite ${name}`}
                        title={isFavorite ? "Remove from favourites" : "Add to favourites"}
                    >
                        {isFavorite ? (
                            <FaHeart aria-hidden="true" />
                        ) : (
                            <FaRegHeart aria-hidden="true" />
                        )}
                    </button>

                    <span className="raid-availability-pill">
                        <span className="raid-availability-dot" aria-hidden="true" />
                        Available
                    </span>
                </div>
            </div>

            <div className="raid-mechanic-stats">
                <div className="raid-stat">
                    <span className="raid-stat-label">
                        <FaRoad aria-hidden="true" /> Distance
                    </span>
                    <strong className="raid-stat-value">
                        {formatDistance(distanceOf(mechanic))}
                    </strong>
                </div>
                <div className="raid-stat">
                    <span className="raid-stat-label">
                        <FaStar aria-hidden="true" /> Rating
                    </span>
                    <strong className="raid-stat-value">
                        {rating > 0 ? rating.toFixed(1) : "New"}
                    </strong>
                </div>
                <div className="raid-stat">
                    <span className="raid-stat-label">
                        <FaBriefcase aria-hidden="true" /> Experience
                    </span>
                    <strong className="raid-stat-value">
                        {experience != null && experience !== ""
                            ? pluralize(Number(experience), "year")
                            : "—"}
                    </strong>
                </div>
            </div>

            {(mechanic.workshopAddress || phone) && (
                <div className="raid-mechanic-secondary">
                    {mechanic.workshopAddress && (
                        <div className="raid-mechanic-secondary-row">
                            <FaMapMarkerAlt aria-hidden="true" />
                            <span>{mechanic.workshopAddress}</span>
                        </div>
                    )}
                    {phone && (
                        <div className="raid-mechanic-secondary-row">
                            <FaPhoneAlt aria-hidden="true" />
                            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
                        </div>
                    )}
                </div>
            )}

            <div className="raid-mechanic-card-footer">
                <span className={isFavorite ? "raid-favorite-label" : "raid-card-helper"}>
                    {isFavorite ? (
                        <>
                            <FaHeart aria-hidden="true" /> Favourite mechanic
                        </>
                    ) : (
                        "Select this provider for assistance"
                    )}
                </span>

                <label
                    htmlFor={inputId}
                    className="raid-select-mechanic-button"
                    data-selected={isSelected}
                >
                    {isSelected ? (
                        <>
                            <FaCheck aria-hidden="true" /> Selected
                        </>
                    ) : (
                        <>
                            Select mechanic <FaChevronRight aria-hidden="true" />
                        </>
                    )}
                </label>
            </div>
        </div>
    );
}

function ReviewSection({ icon: Icon, title, onEdit, children }) {
    return (
        <section className="raid-review-section">
            <header className="raid-review-header">
                <div className="raid-review-header-left">
                    <span className="raid-review-icon" aria-hidden="true">
                        <Icon />
                    </span>
                    <h3 className="raid-review-title">{title}</h3>
                </div>
                {onEdit && (
                    <button
                        type="button"
                        className="raid-review-edit"
                        onClick={onEdit}
                        aria-label={`Edit ${title.toLowerCase()}`}
                    >
                        <FaRegEdit aria-hidden="true" /> Edit
                    </button>
                )}
            </header>
            <div className="raid-review-body">{children}</div>
        </section>
    );
}

function ReviewRow({ label, value }) {
    if (!value) return null;

    return (
        <div className="raid-review-row">
            <span className="raid-review-label">{label}</span>
            <span className="raid-review-value">{value}</span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 1 — Vehicle                                                    */
/* ------------------------------------------------------------------ */

function VehicleStep({
                         vehicles,
                         loading,
                         error,
                         onRetry,
                         selectedVehicle,
                         onSelect,
                         onNext
                     }) {
    return (
        <div>
            <SectionHeading
                icon={FaCarSide}
                title="Select your vehicle"
                subtitle="Which vehicle needs assistance?"
            />

            {loading && (
                <LoadingBlock
                    message="Loading your vehicles…"
                    count={2}
                    layoutClass="raid-vehicle-grid"
                />
            )}

            {!loading && error && (
                <Panel tone="danger" icon={FaExclamationTriangle} title="We couldn't load your vehicles">
                    <div>{error}</div>
                    <div className="raid-panel-action">
                        <button type="button" className="raid-btn raid-btn-outline" onClick={onRetry}>
                            <FaRedo aria-hidden="true" /> Try again
                        </button>
                    </div>
                </Panel>
            )}

            {!loading && !error && vehicles.length === 0 && (
                <div className="raid-empty-state">
                    <div className="raid-empty-icon" aria-hidden="true">
                        <FaCarSide />
                    </div>
                    <h3>No vehicles found</h3>
                    <p>Add a vehicle before requesting roadside assistance.</p>
                    <Link to="/customer/vehicles" className="raid-btn raid-btn-primary">
                        <FaPlus aria-hidden="true" /> Add vehicle
                    </Link>
                </div>
            )}

            {!loading && !error && vehicles.length > 0 && (
                <>
                    <div className="raid-vehicle-grid" role="radiogroup" aria-label="Your vehicles">
                        {vehicles.map((vehicle) => (
                            <VehicleCard
                                key={vehicle.id}
                                vehicle={vehicle}
                                isSelected={selectedVehicle === String(vehicle.id)}
                                onSelect={() => onSelect(String(vehicle.id))}
                            />
                        ))}
                    </div>

                    <div className="raid-add-vehicle-row">
                        <Link to="/customer/vehicles" className="raid-ghost-link">
                            <FaPlus aria-hidden="true" /> Add another vehicle
                        </Link>
                    </div>
                </>
            )}

            <StepFooter
                onNext={onNext}
                nextLabel="Next"
                nextDisabled={!selectedVehicle}
                hint={!selectedVehicle && vehicles.length > 0 ? "Select a vehicle to continue." : null}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 2 — Problem                                                    */
/* ------------------------------------------------------------------ */

function ProblemStep({
                         category,
                         onCategoryChange,
                         description,
                         onDescriptionChange,
                         drivable,
                         onDrivableChange,
                         uploads,
                         onBack,
                         onNext
                     }) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const missing = [];
    if (!category) missing.push("a category");
    if (!description.trim()) missing.push("a description");
    if (!drivable) missing.push("whether it's drivable");

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        uploads.addFiles(event.dataTransfer?.files);
    };

    const handleDragLeave = (event) => {
        // Ignore leave events fired when moving over child elements.
        if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
    };

    const remaining = DESCRIPTION_MAX - description.length;
    const photosFull = uploads.photos.length >= MAX_PHOTOS;

    return (
        <div>
            <SectionHeading
                icon={FaTools}
                title="What's wrong?"
                subtitle="Tell us what's happening so we can match you with the right help."
            />

            <div className="raid-field">
                <span className="raid-label" id="category-label">
                    Problem category
                </span>
                <div className="raid-category-grid" role="group" aria-labelledby="category-label">
                    {PROBLEM_CATEGORIES.map((item) => {
                        const Icon = PROBLEM_CATEGORY_ICONS[item] || FaEllipsisH;
                        const isSelected = category === item;

                        return (
                            <button
                                key={item}
                                type="button"
                                className="raid-category-tile"
                                data-selected={isSelected}
                                aria-pressed={isSelected}
                                onClick={() => onCategoryChange(item)}
                            >
                                {isSelected && (
                                    <FaCheckCircle className="raid-category-check" aria-hidden="true" />
                                )}
                                <Icon className="raid-category-icon" aria-hidden="true" />
                                <span>{item}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {category === "Accident / Collision" && (
                <Panel tone="danger" icon={FaExclamationTriangle} title="Is anyone hurt or in danger?">
                    Call <a href={`tel:${EMERGENCY_NUMBER}`}>{EMERGENCY_NUMBER}</a> for emergency
                    services first. If you're safe, carry on with your request.
                </Panel>
            )}

            <div className="raid-field">
                <label className="raid-label" htmlFor="problem-description">
                    Describe the problem
                </label>
                <textarea
                    id="problem-description"
                    className="raid-textarea"
                    rows={4}
                    maxLength={DESCRIPTION_MAX}
                    placeholder={'e.g. "Engine won\'t start after stalling at a signal."'}
                    value={description}
                    onChange={(event) => onDescriptionChange(event.target.value)}
                    aria-describedby="description-help"
                />
                <div className="raid-help-row" id="description-help">
                    <span className="raid-help-text">
                        A few details help the mechanic bring the right tools.
                    </span>
                    <span className="raid-counter" data-low={remaining <= 50}>
                        {remaining} left
                    </span>
                </div>
            </div>

            <div className="raid-field">
                <span className="raid-label" id="drivable-label">
                    Is the vehicle currently drivable?
                </span>
                <div className="raid-toggle-group" role="radiogroup" aria-labelledby="drivable-label">
                    {[
                        { value: "YES", label: "Yes, it's drivable", Icon: FaCheckCircle, variant: "yes" },
                        { value: "NO", label: "No, needs towing", Icon: FaExclamationTriangle, variant: "no" }
                    ].map(({ value, label, Icon, variant }) => (
                        <label
                            key={value}
                            className="raid-toggle-option"
                            data-selected={drivable === value}
                            data-variant={variant}
                            htmlFor={`drivable-${value}`}
                        >
                            <input
                                type="radio"
                                id={`drivable-${value}`}
                                name="drivable"
                                value={value}
                                checked={drivable === value}
                                onChange={(event) => onDrivableChange(event.target.value)}
                                className="raid-sr-only"
                            />
                            <Icon aria-hidden="true" />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="raid-field">
                <span className="raid-label" id="photos-label">
                    Photos <span className="raid-label-hint">(optional, up to {MAX_PHOTOS})</span>
                </span>

                <button
                    type="button"
                    className="raid-upload-zone"
                    data-dragging={isDragging}
                    aria-labelledby="photos-label"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <FaCamera className="raid-upload-icon" aria-hidden="true" />
                    <span className="raid-upload-text">
                        {photosFull ? "Photo limit reached" : "Tap to add photos, or drag them here"}
                    </span>
                    <span className="raid-upload-sub">
                        Images only, up to {MAX_PHOTO_MB} MB each
                    </span>
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    tabIndex={-1}
                    aria-hidden="true"
                    className="raid-sr-only"
                    onChange={(event) => {
                        uploads.addFiles(event.target.files);
                        event.target.value = "";
                    }}
                />

                {uploads.error && (
                    <div className="raid-field-error" role="alert">
                        {uploads.error}
                    </div>
                )}

                {uploads.photos.length > 0 && (
                    <>
                        <ul className="raid-preview-grid">
                            {uploads.photos.map((photo, index) => (
                                <li className="raid-preview-item" key={photo.id}>
                                    <img src={photo.url} alt={`Attached photo ${index + 1}`} />
                                    <button
                                        type="button"
                                        className="raid-preview-remove"
                                        onClick={() => uploads.removePhoto(photo.id)}
                                        aria-label={`Remove photo ${index + 1}`}
                                    >
                                        <FaTimes aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="raid-help-text">
                            {pluralize(uploads.photos.length, "photo")} attached
                        </div>
                    </>
                )}
            </div>

            <StepFooter
                onBack={onBack}
                onNext={onNext}
                nextLabel="Next"
                nextDisabled={missing.length > 0}
                hint={missing.length > 0 ? `Still needed: ${missing.join(", ")}.` : null}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 3 — Location                                                   */
/* ------------------------------------------------------------------ */

function LocationStep({
                          place,
                          onPlaceChange,
                          onLabelResolved,
                          landmark,
                          onLandmarkChange,
                          onBack,
                          onNext
                      }) {
    const mounted = useIsMounted();
    const searchAbort = useRef(null);
    const reverseAbort = useRef(null);

    const [detecting, setDetecting] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [showCoordinates, setShowCoordinates] = useState(false);

    useEffect(() => {
        return () => {
            searchAbort.current?.abort();
            reverseAbort.current?.abort();
        };
    }, []);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setError("Your browser doesn't support location detection. Search for your address below instead.");
            return;
        }

        setDetecting(true);
        setError("");

        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                if (!mounted.current) return;

                const { latitude: lat, longitude: lng, accuracy } = coords;
                setDetecting(false);
                onPlaceChange({ label: formatCoords(lat, lng), lat, lng, accuracy });

                // Best effort: swap the raw coordinates for a readable address.
                reverseAbort.current?.abort();
                const controller = new AbortController();
                reverseAbort.current = controller;

                try {
                    const name = await reverseGeocode(lat, lng, controller.signal);
                    if (name && mounted.current) onLabelResolved(lat, lng, name);
                } catch {
                    /* keep the coordinates as the label */
                }
            },
            (geoError) => {
                if (!mounted.current) return;
                setDetecting(false);

                switch (geoError.code) {
                    case geoError.PERMISSION_DENIED:
                        setError("Location permission was denied. Allow location access in your browser, or search for your address below.");
                        break;
                    case geoError.POSITION_UNAVAILABLE:
                        setError("We couldn't determine your location. Search for your address below instead.");
                        break;
                    case geoError.TIMEOUT:
                        setError("Location detection timed out. Try again, or search for your address below.");
                        break;
                    default:
                        setError("We couldn't detect your location.");
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const searchAddress = async (event) => {
        event.preventDefault();

        const text = query.trim();
        if (text.length < 3) {
            setError("Enter a town, area or landmark (at least 3 characters).");
            return;
        }

        searchAbort.current?.abort();
        const controller = new AbortController();
        searchAbort.current = controller;

        setSearching(true);
        setError("");

        try {
            const found = await geocodeAddress(text, controller.signal);
            if (!mounted.current) return;

            if (!found) {
                setError(`We couldn't find "${text}". Try adding the town or district.`);
            } else {
                onPlaceChange({ label: found.label, lat: found.lat, lng: found.lng, accuracy: null });
            }
        } catch (searchError) {
            if (searchError.name === "AbortError" || !mounted.current) return;
            setError("Address search isn't available right now. Try \"Use my current location\" instead.");
        } finally {
            if (mounted.current && searchAbort.current === controller) setSearching(false);
        }
    };

    const isApproximate = place && place.accuracy != null && place.accuracy > 1000;

    return (
        <div>
            <SectionHeading
                icon={FaMapMarkerAlt}
                title="Your location"
                subtitle="We need your location to find nearby service providers."
            />

            <div className="raid-location-intro">
                <FaInfoCircle aria-hidden="true" />
                <span>
                    We'll use your location to find nearby service providers, and share it
                    with the provider you select so they can reach you.
                </span>
            </div>

            <button
                type="button"
                className="raid-btn raid-btn-primary"
                onClick={detectLocation}
                disabled={detecting}
            >
                {detecting ? (
                    <>
                        <FaSpinner className="raid-spin-icon" aria-hidden="true" /> Detecting location…
                    </>
                ) : (
                    <>
                        <FaLocationArrow aria-hidden="true" /> Use my current location
                    </>
                )}
            </button>

            <div className="raid-divider">
                <span>or search for an address</span>
            </div>

            <form className="raid-search-row" onSubmit={searchAddress} role="search">
                <label className="raid-sr-only" htmlFor="manual-location">
                    Town, area or landmark
                </label>
                <input
                    id="manual-location"
                    type="search"
                    className="raid-input"
                    placeholder="e.g. Aluva, Kerala"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    autoComplete="off"
                />
                <button type="submit" className="raid-btn raid-btn-outline" disabled={searching}>
                    {searching ? (
                        <FaSpinner className="raid-spin-icon" aria-hidden="true" />
                    ) : (
                        <FaSearch aria-hidden="true" />
                    )}
                    <span>{searching ? "Searching…" : "Find"}</span>
                </button>
            </form>

            {error && (
                <Panel tone="danger" icon={FaExclamationTriangle} title="We couldn't set your location">
                    {error}
                </Panel>
            )}

            {place && (
                <Panel tone="success" icon={FaCheckCircle} title="Location set">
                    <div className="raid-place-label">{place.label}</div>
                    {place.accuracy != null && (
                        <div>Accurate to about {Math.round(place.accuracy)} m.</div>
                    )}
                    <button
                        type="button"
                        className="raid-coords-toggle"
                        onClick={() => setShowCoordinates((visible) => !visible)}
                        aria-expanded={showCoordinates}
                    >
                        {showCoordinates ? (
                            <FaChevronUp aria-hidden="true" />
                        ) : (
                            <FaChevronDown aria-hidden="true" />
                        )}
                        {showCoordinates ? "Hide" : "Show"} exact coordinates
                    </button>
                    {showCoordinates && (
                        <div className="raid-coords-value">{formatCoords(place.lat, place.lng)}</div>
                    )}
                </Panel>
            )}

            {isApproximate && (
                <Panel tone="warning" icon={FaExclamationTriangle} title="Your location looks approximate">
                    Your device reported a location that may be off by more than a kilometre.
                    Try again outdoors, or search for a precise address.
                </Panel>
            )}

            <div className="raid-field raid-field-spaced">
                <label className="raid-label" htmlFor="landmark">
                    Landmark or directions <span className="raid-label-hint">(optional)</span>
                </label>
                <input
                    id="landmark"
                    type="text"
                    className="raid-input"
                    maxLength={LANDMARK_MAX}
                    placeholder="e.g. Opposite the petrol pump, left lane"
                    value={landmark}
                    onChange={(event) => onLandmarkChange(event.target.value)}
                />
            </div>

            <StepFooter
                onBack={onBack}
                onNext={onNext}
                nextLabel="Next"
                nextDisabled={!place}
                hint={!place ? "Detect your location or search for an address to continue." : null}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 4 — Provider                                                   */
/* ------------------------------------------------------------------ */

function ProviderStep({
                          place,
                          mechanics,
                          loading,
                          error,
                          stale,
                          onRetry,
                          selectedId,
                          selectionLost,
                          onSelect,
                          favoriteIds,
                          onToggleFavorite,
                          onEditLocation,
                          onBack,
                          onNext
                      }) {
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("recommended");

    const isFavorite = (mechanic) => favoriteIds.includes(String(mechanic.mechanicId));
    const favoritesNearby = mechanics.filter(isFavorite).length;

    const visible = sortMechanics(
        mechanics.filter((m) => filter !== "favorites" || isFavorite(m)),
        sort,
        isFavorite
    );
    const nearest = sortMechanics(mechanics, "nearest", isFavorite)[0] || null;
    const selectedMechanic = mechanics.find((m) => String(m.mechanicId) === selectedId);

    const chooseMechanic = (mechanic) => {
        onSelect(String(mechanic.mechanicId));
        if (filter === "favorites" && !isFavorite(mechanic)) setFilter("all");

        requestAnimationFrame(() => {
            document
                .getElementById(`mechanic-card-${mechanic.mechanicId}`)
                ?.scrollIntoView(scrollOptions({ block: "nearest" }));
        });
    };

    return (
        <div>
            <SectionHeading
                icon={FaUserCog}
                title="Choose a service provider"
                subtitle="Nearby approved mechanics are shown based on your location."
            />

            {!place && (
                <Panel tone="warning" icon={FaExclamationTriangle} title="We need your location first">
                    <div>Set your location so we can find mechanics near you.</div>
                    <div className="raid-panel-action">
                        <button type="button" className="raid-btn raid-btn-outline" onClick={onEditLocation}>
                            <FaMapMarkerAlt aria-hidden="true" /> Set my location
                        </button>
                    </div>
                </Panel>
            )}

            {place && loading && (
                <LoadingBlock
                    message="Finding nearby mechanics…"
                    count={3}
                    layoutClass="raid-mechanic-list"
                />
            )}

            {place && !loading && error && (
                <Panel tone="danger" icon={FaExclamationTriangle} title="We couldn't load nearby mechanics">
                    <div>{error}</div>
                    <div className="raid-panel-action">
                        <button type="button" className="raid-btn raid-btn-outline" onClick={onRetry}>
                            <FaRedo aria-hidden="true" /> Try again
                        </button>
                    </div>
                </Panel>
            )}

            {place && !loading && !error && mechanics.length === 0 && (
                <Panel tone="warning" icon={FaExclamationTriangle} title="No nearby mechanics found">
                    <div>
                        There are no approved, available mechanics within {SEARCH_RADIUS_KM} km of
                        your location right now. The list keeps updating, or you can try a
                        different location.
                    </div>
                    <div className="raid-panel-action">
                        <button type="button" className="raid-btn raid-btn-outline" onClick={onEditLocation}>
                            <FaMapMarkerAlt aria-hidden="true" /> Change location
                        </button>
                    </div>
                </Panel>
            )}

            {selectionLost && !selectedId && (
                <Panel tone="warning" icon={FaExclamationTriangle} title="Your mechanic is no longer available">
                    Choose another provider to continue.
                </Panel>
            )}

            {place && !loading && !error && mechanics.length > 0 && (
                <div className="raid-provider-layout">
                    <div className="raid-provider-map">
                        <NearbyMechanicsMap
                            latitude={place.lat}
                            longitude={place.lng}
                            mechanics={mechanics}
                            selectedMechanicId={selectedMechanic?.mechanicId ?? null}
                            onSelectMechanic={chooseMechanic}
                        />
                    </div>

                    <div className="raid-provider-list">
                        <div className="raid-nearby-heading">
                            <div>
                                <h3 className="raid-section-title raid-section-title-sm">Nearby mechanics</h3>
                                <p className="raid-section-subtitle">
                                    Within {SEARCH_RADIUS_KM} km of your location.
                                </p>
                            </div>
                            <span className="raid-results-count" role="status">
                                {pluralize(mechanics.length, "mechanic")} found · updates automatically
                            </span>
                        </div>

                        {stale && (
                            <div className="raid-inline-note" role="status">
                                <FaExclamationTriangle aria-hidden="true" /> Couldn't refresh just now.
                                Showing the last results.
                            </div>
                        )}

                        <div className="raid-mechanic-filters">
                            <div role="group" aria-label="Filter mechanics" className="raid-filter-buttons">
                                <button
                                    type="button"
                                    data-active={filter === "all"}
                                    aria-pressed={filter === "all"}
                                    onClick={() => setFilter("all")}
                                >
                                    All mechanics
                                </button>
                                <button
                                    type="button"
                                    data-active={filter === "favorites"}
                                    aria-pressed={filter === "favorites"}
                                    onClick={() => setFilter("favorites")}
                                >
                                    <FaHeart aria-hidden="true" /> Favourites
                                    {favoritesNearby > 0 ? ` (${favoritesNearby})` : ""}
                                </button>
                            </div>

                            <label className="raid-sort">
                                <span className="raid-sr-only">Sort mechanics</span>
                                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        {filter === "favorites" && visible.length === 0 && (
                            <div className="raid-empty-favorites">
                                <FaHeart aria-hidden="true" />
                                <strong>
                                    {favoriteIds.length === 0
                                        ? "No favourite mechanics yet"
                                        : "None of your favourites are nearby"}
                                </strong>
                                <p>
                                    {favoriteIds.length === 0
                                        ? "Tap the heart on a mechanic to save them for faster selection next time."
                                        : "They may be out of range or unavailable right now."}
                                </p>
                                <button
                                    type="button"
                                    className="raid-btn raid-btn-secondary"
                                    onClick={() => setFilter("all")}
                                >
                                    Browse all mechanics
                                </button>
                            </div>
                        )}

                        {visible.length > 0 && (
                            <div className="raid-mechanic-list" role="group" aria-label="Nearby mechanics">
                                {visible.map((mechanic) => (
                                    <MechanicCard
                                        key={mechanic.mechanicId}
                                        mechanic={mechanic}
                                        isSelected={selectedId === String(mechanic.mechanicId)}
                                        isFavorite={isFavorite(mechanic)}
                                        onSelect={() => onSelect(String(mechanic.mechanicId))}
                                        onToggleFavorite={onToggleFavorite}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="raid-nearest-panel">
                            <div className="raid-nearest-panel-text">
                                <h4>
                                    <FaBolt aria-hidden="true" /> Not sure who to choose?
                                </h4>
                                <p>We can pick the nearest available provider for you.</p>
                            </div>
                            <button
                                type="button"
                                className="raid-btn raid-btn-outline"
                                disabled={!nearest}
                                onClick={() => nearest && chooseMechanic(nearest)}
                            >
                                <FaBolt aria-hidden="true" /> Choose nearest
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <StepFooter
                onBack={onBack}
                onNext={onNext}
                nextLabel="Review"
                NextIcon={FaClipboardCheck}
                nextDisabled={!selectedMechanic}
                hint={!selectedMechanic && mechanics.length > 0 ? "Select a provider to continue." : null}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step 5 — Review                                                     */
/* ------------------------------------------------------------------ */

function ReviewStep({
                        vehicle,
                        category,
                        description,
                        drivable,
                        place,
                        landmark,
                        mechanic,
                        photos,
                        submitting,
                        submitSuccess,
                        submitError,
                        onEdit,
                        onBack,
                        onConfirm
                    }) {
    return (
        <div>
            <SectionHeading
                icon={FaClipboardCheck}
                title="Review & confirm"
                subtitle="Please check your request before sending it."
            />

            <ReviewSection icon={FaCarSide} title="Vehicle" onEdit={() => onEdit(1)}>
                {vehicle ? (
                    <>
                        <ReviewRow label="Vehicle" value={`${vehicle.brand} ${vehicle.model}`} />
                        <ReviewRow label="Registration" value={vehicle.registrationNumber} />
                        <ReviewRow
                            label="Fuel / Year"
                            value={[vehicle.fuelType, vehicle.manufacturingYear].filter(Boolean).join(" · ")}
                        />
                    </>
                ) : (
                    <div className="raid-review-fallback">Vehicle information unavailable.</div>
                )}
            </ReviewSection>

            <ReviewSection icon={FaTools} title="Problem" onEdit={() => onEdit(2)}>
                <ReviewRow label="Category" value={category} />
                <ReviewRow label="Description" value={description.trim()} />
                <ReviewRow
                    label="Vehicle status"
                    value={drivable === "YES" ? "Drivable" : drivable === "NO" ? "Not drivable" : ""}
                />
            </ReviewSection>

            <ReviewSection icon={FaMapMarkerAlt} title="Location" onEdit={() => onEdit(3)}>
                <ReviewRow label="Location" value={place?.label || "Location not provided"} />
                {place && <ReviewRow label="Coordinates" value={formatCoords(place.lat, place.lng)} />}
                <ReviewRow label="Landmark" value={landmark.trim()} />
            </ReviewSection>

            <ReviewSection icon={FaUserCog} title="Service provider" onEdit={() => onEdit(4)}>
                {mechanic ? (
                    <>
                        <ReviewRow label="Provider" value={mechanic.name || "Mechanic"} />
                        <ReviewRow label="Workshop" value={mechanic.workshopName} />
                        <ReviewRow label="Address" value={mechanic.workshopAddress} />
                        <ReviewRow label="Contact" value={mechanic.contactNumber} />
                        <ReviewRow
                            label="Distance"
                            value={
                                Number.isFinite(distanceOf(mechanic))
                                    ? formatDistance(distanceOf(mechanic))
                                    : null
                            }
                        />
                    </>
                ) : (
                    <div className="raid-review-fallback">
                        Your selected provider is no longer available. Choose another one.
                    </div>
                )}
            </ReviewSection>

            <ReviewSection icon={FaImages} title="Photos" onEdit={() => onEdit(2)}>
                {photos.length === 0 ? (
                    <div className="raid-review-fallback">No photos added.</div>
                ) : (
                    <ul className="raid-review-photos">
                        {photos.map((photo, index) => (
                            <li key={photo.id}>
                                <img src={photo.url} alt={`Attached photo ${index + 1}`} />
                            </li>
                        ))}
                    </ul>
                )}
            </ReviewSection>

            <div className="raid-trust-note">
                <FaShieldAlt aria-hidden="true" />
                <span>
                    Your request and contact details are only shared with the provider you
                    selected.
                </span>
            </div>

            {submitError && (
                <Panel tone="danger" icon={FaExclamationTriangle} title="We couldn't send your request">
                    {submitError}
                </Panel>
            )}

            {submitSuccess && (
                <Panel tone="success" icon={FaCheckCircle} title="Request sent">
                    <div>Taking you back to your dashboard…</div>
                    <div className="raid-panel-action">
                        <Link to="/customer" className="raid-ghost-link">
                            Go now
                        </Link>
                    </div>
                </Panel>
            )}

            <StepFooter
                onBack={submitSuccess ? null : onBack}
                onNext={onConfirm}
                nextLabel={submitSuccess ? "Request sent" : submitting ? "Sending request…" : "Confirm request"}
                NextIcon={submitSuccess ? FaCheckCircle : FaPaperPlane}
                nextDisabled={submitSuccess || !mechanic || !vehicle}
                nextLoading={submitting}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function RequestHelp() {
    const navigate = useNavigate();
    const mounted = useIsMounted();

    const [step, setStep] = useState(1);

    // Vehicles
    const [vehicles, setVehicles] = useState([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(true);
    const [vehiclesError, setVehiclesError] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState("");

    // Problem
    const [problemCategory, setProblemCategory] = useState("");
    const [problemDescription, setProblemDescription] = useState("");
    const [vehicleDrivable, setVehicleDrivable] = useState("");
    const uploads = usePhotoUploads();

    // Location — one object so label and coordinates can never drift apart.
    const [place, setPlace] = useState(null); // { label, lat, lng, accuracy }
    const [landmark, setLandmark] = useState("");

    // Provider
    const [selectedMechanic, setSelectedMechanic] = useState("");
    const [selectionLost, setSelectionLost] = useState(false);
    const { favoriteIds, toggleFavorite } = useFavoriteMechanics();
    const [favoriteMechanics, setFavoriteMechanics] = useState([]);
    useEffect(() => {
        const loadFavoriteMechanics = async () => {
            try {
                const response = await getMyFavorites();
                const list = Array.isArray(response?.data) ? response.data : [];

                setFavoriteMechanics(
                    list
                        .map((favorite) => favorite.mechanic)
                        .filter(Boolean)
                );
            } catch (error) {
                console.error("Failed to load favorite mechanics:", error);
            }
        };

        loadFavoriteMechanics();
    }, []);

    const handleSelectionLost = useCallback(() => {
        setSelectedMechanic("");
        setSelectionLost(true);
    }, []);

    const nearby = useNearbyMechanics({
        enabled: step === 4,
        lat: place?.lat ?? null,
        lng: place?.lng ?? null,
        selectedId: selectedMechanic,
        onSelectionLost: handleSelectionLost
    });
    const providerMechanics = [
        ...nearby.mechanics,
        ...favoriteMechanics.filter(
            (favorite) =>
                !nearby.mechanics.some(
                    (mechanic) =>
                        String(mechanic.mechanicId ?? mechanic.id) ===
                        String(favorite.mechanicId ?? favorite.id)
                )
        )
    ];
    // Submit
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const submittingRef = useRef(false);
    const redirectTimer = useRef(null);

    const topRef = useRef(null);
    const previousStep = useRef(step);

    /* ---- Vehicles ---- */

    const loadVehicles = useCallback(async () => {
        setVehiclesLoading(true);
        setVehiclesError("");

        try {
            const response = await getMyVehicles();
            if (!mounted.current) return;

            const list = Array.isArray(response?.data) ? response.data : [];
            setVehicles(list);
            // Only one vehicle? Skip the choice.
            setSelectedVehicle((current) =>
                current || (list.length === 1 ? String(list[0].id) : "")
            );
        } catch (error) {
            if (!mounted.current) return;
            setVehiclesError(
                getErrorMessage(error, "Something went wrong while loading your vehicles.")
            );
        } finally {
            if (mounted.current) setVehiclesLoading(false);
        }
    }, [mounted]);

    useEffect(() => {
        loadVehicles();
    }, [loadVehicles]);

    /* ---- Housekeeping ---- */

    useEffect(() => () => clearTimeout(redirectTimer.current), []);

    // Move focus to the new step's heading and bring it into view.
    useEffect(() => {
        if (previousStep.current === step) return;
        previousStep.current = step;

        topRef.current?.scrollIntoView(scrollOptions({ block: "start" }));
        document
            .querySelector(".raid-page [data-step-heading]")
            ?.focus({ preventScroll: true });
    }, [step]);

    // Warn before a refresh or tab close would throw the form away.
    useEffect(() => {
        const hasProgress = step > 1 || problemCategory || problemDescription;
        if (!hasProgress || submitSuccess) return undefined;

        const warn = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [step, problemCategory, problemDescription, submitSuccess]);

    /* ---- Handlers ---- */

    const handlePlaceChange = useCallback((nextPlace) => {
        setPlace(nextPlace);
        // A different location means a different set of mechanics.
        setSelectedMechanic("");
        setSelectionLost(false);
    }, []);

    const handleLabelResolved = useCallback((lat, lng, label) => {
        setPlace((current) =>
            current && current.lat === lat && current.lng === lng
                ? { ...current, label }
                : current
        );
    }, []);

    const handleSelectMechanic = useCallback((id) => {
        setSelectedMechanic(id);
        setSelectionLost(false);
    }, []);

    const selectedVehicleObj = vehicles.find((v) => String(v.id) === selectedVehicle);
    const selectedMechanicObj = providerMechanics.find(
        (m) => String(m.mechanicId ?? m.id) === selectedMechanic
    );

    const handleConfirmRequest = async () => {
        if (submittingRef.current || submitSuccess) return;

        if (!selectedVehicleObj || !selectedMechanicObj || !place || !problemCategory) {
            setSubmitError("Some details are missing. Use Edit on the section above to complete them.");
            return;
        }

        submittingRef.current = true;
        setSubmitting(true);
        setSubmitError("");

        try {
            const issueLines = [
                `Category: ${problemCategory}`,
                `Description: ${problemDescription.trim()}`,
                `Vehicle Drivable: ${vehicleDrivable === "YES" ? "Yes" : "No"}`
            ];
            if (landmark.trim()) issueLines.push(`Landmark: ${landmark.trim()}`);

            await createRequest(
                {
                    issueDescription: issueLines.join("\n"),
                    location: place.label,
                    customerLatitude: place.lat,
                    customerLongitude: place.lng
                },
                selectedVehicle,
                selectedMechanic,
                uploads.photos.map((photo) => photo.file)
            );

            if (!mounted.current) return;
            setSubmitSuccess(true);
            redirectTimer.current = setTimeout(() => navigate("/customer"), REDIRECT_DELAY_MS);
        } catch (error) {
            if (!mounted.current) return;
            setSubmitError(getErrorMessage(error, "Failed to send request. Please try again."));
        } finally {
            submittingRef.current = false;
            if (mounted.current) setSubmitting(false);
        }
    };

    const canJump = !submitting && !submitSuccess;

    return (
        <CustomerLayout>
            <div className="raid-page">
                <div className="raid-topbar" ref={topRef}>
                    <Link to="/customer" className="raid-back-link">
                        <FaChevronLeft aria-hidden="true" /> Back to dashboard
                    </Link>
                </div>

                <div className="raid-card">
                    <div className="raid-card-body">
                        <div className="raid-header">
                            <div className="raid-header-icon" aria-hidden="true">
                                <FaLifeRing />
                            </div>
                            <div>
                                <h1 className="raid-title">Request roadside assistance</h1>
                                <p className="raid-subtitle">
                                    Tell us what happened and we'll help you find the right
                                    service provider, fast.
                                </p>
                            </div>
                        </div>

                        <Stepper step={step} onJump={canJump ? setStep : undefined} />

                        {step === 1 && (
                            <VehicleStep
                                vehicles={vehicles}
                                loading={vehiclesLoading}
                                error={vehiclesError}
                                onRetry={loadVehicles}
                                selectedVehicle={selectedVehicle}
                                onSelect={setSelectedVehicle}
                                onNext={() => setStep(2)}
                            />
                        )}

                        {step === 2 && (
                            <ProblemStep
                                category={problemCategory}
                                onCategoryChange={setProblemCategory}
                                description={problemDescription}
                                onDescriptionChange={setProblemDescription}
                                drivable={vehicleDrivable}
                                onDrivableChange={setVehicleDrivable}
                                uploads={uploads}
                                onBack={() => setStep(1)}
                                onNext={() => setStep(3)}
                            />
                        )}

                        {step === 3 && (
                            <LocationStep
                                place={place}
                                onPlaceChange={handlePlaceChange}
                                onLabelResolved={handleLabelResolved}
                                landmark={landmark}
                                onLandmarkChange={setLandmark}
                                onBack={() => setStep(2)}
                                onNext={() => setStep(4)}
                            />
                        )}

                        {step === 4 && (
                            <ProviderStep
                                place={place}
                                mechanics={providerMechanics}
                                loading={nearby.loading}
                                error={nearby.error}
                                stale={nearby.stale}
                                onRetry={nearby.retry}
                                selectedId={selectedMechanic}
                                selectionLost={selectionLost}
                                onSelect={handleSelectMechanic}
                                favoriteIds={favoriteIds}
                                onToggleFavorite={toggleFavorite}
                                onEditLocation={() => setStep(3)}
                                onBack={() => setStep(3)}
                                onNext={() => setStep(5)}
                            />
                        )}

                        {step === 5 && (
                            <ReviewStep
                                vehicle={selectedVehicleObj}
                                category={problemCategory}
                                description={problemDescription}
                                drivable={vehicleDrivable}
                                place={place}
                                landmark={landmark}
                                mechanic={selectedMechanicObj}
                                photos={uploads.photos}
                                submitting={submitting}
                                submitSuccess={submitSuccess}
                                submitError={submitError}
                                onEdit={setStep}
                                onBack={() => setStep(4)}
                                onConfirm={handleConfirmRequest}
                            />
                        )}
                    </div>
                </div>
            </div>
        </CustomerLayout>
    );
}

export default RequestHelp;