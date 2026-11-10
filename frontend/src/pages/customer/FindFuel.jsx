import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CustomerLayout from "../../layouts/CustomerLayout";
import { getFuelStations } from "../../services/customerService";
import "../../styles/FindFuel.css";

/* ================================================================== */
/* Constants                                                           */
/* ================================================================== */

const DEFAULT_CENTER = [10.8505, 76.2711];
const RADIUS_OPTIONS = [2, 5, 10];
const DEFAULT_RADIUS = 5;
const FUEL_LIMIT = 60;
const RESEARCH_DISTANCE_KM = 0.5; // search again once you've moved this far (when not navigating)
const OFF_ROUTE_KM = 0.2;
const REROUTE_COOLDOWN_MS = 10000;
const ARRIVED_KM = 0.05;
const CACHE_TTL_MS = 10 * 60 * 1000;
const TYPE_STORAGE_KEY = "ff-station-type";

/*
 * The three categories the customer can pick on the first screen. Petrol/
 * Diesel and CNG both come from the backend's category=FUEL query (OSM
 * amenity=fuel) and are told apart client-side by fuel:* tags — see
 * matchesType(). EV is a structurally different OSM place type
 * (amenity=charging_station), so it uses category=EV and always triggers
 * its own backend request. LPG support has been dropped entirely: it is
 * not a tab and is not folded into CNG.
 */
const STATION_TYPES = [
    {
        key: "petrolDiesel",
        category: "FUEL",
        icon: "fuel",
        label: "Petrol / Diesel",
        pickerDesc: "Petrol pumps and diesel stations near you.",
        headerTitle: "Find fuel",
        headerSub: "Nearby petrol & diesel stations, real driving routes and turn-by-turn directions."
    },
    {
        key: "cng",
        category: "FUEL",
        icon: "cng",
        label: "CNG",
        pickerDesc: "Compressed natural gas filling stations.",
        headerTitle: "Find CNG",
        headerSub: "Nearby CNG stations, real driving routes and turn-by-turn directions."
    },
    {
        key: "ev",
        category: "EV",
        icon: "bolt",
        label: "EV Charging",
        pickerDesc: "Electric vehicle charging points, with connector types and capacity.",
        headerTitle: "Find EV charging",
        headerSub: "Nearby EV charging points, real driving routes and turn-by-turn directions."
    }
];

const FUEL_TYPES = [
    { key: "fuelPetrol", label: "Petrol" },
    { key: "fuelDiesel", label: "Diesel" },
    { key: "fuelCng", label: "CNG" }
];

const SUBFILTER_TYPES = [
    { key: "fuelPetrol", label: "Petrol" },
    { key: "fuelDiesel", label: "Diesel" }
];

const SORTS = [
    { key: "nearest", label: "Nearest first" },
    { key: "farthest", label: "Farthest first" },
    { key: "name", label: "Name A–Z" }
];

/*
 * Petrol/diesel and CNG share one backend query; a station lands under CNG
 * only when it is explicitly tagged fuel:cng=yes. Everything else returned
 * for category=FUEL (including untagged pumps, the common case on OSM)
 * shows under Petrol/Diesel. This means switching between those two tabs
 * never needs a new network request — only switching to/from EV does,
 * since that is a different backend category/amenity entirely.
 */
function matchesType(station, typeKey) {
    if (typeKey === "cng") return Boolean(station.fuelCng);
    if (typeKey === "ev") return true;
    return !station.fuelCng;
}

/* ================================================================== */
/* Icons                                                               */
/* ================================================================== */

const PATHS = {
    fuel: [
        "M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5",
        "M14 21V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16",
        "M2 21h13",
        "M3 9h11"
    ],
    cng: [
        "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
    ],
    bolt: ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
    close: ["M6 6l12 12", "M18 6L6 18"],
    locate: ["M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8", "M12 2v3", "M12 19v3", "M2 12h3", "M19 12h3"],
    clock: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18", "M12 7.5v5l3.2 2"],
    phone: [
        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
    ],
    globe: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18", "M3 12h18", "M12 3c2.4 2.6 2.4 15.4 0 18", "M12 3c-2.4 2.6-2.4 15.4 0 18"],
    turn: ["M6 18V9a4 4 0 0 1 4-4h8", "M14 1l4 4-4 4"],
    refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
    directions: ["M3 11l19-9-9 19-2-8-8-2z"],
    plus: ["M12 5v14", "M5 12h14"],
    minus: ["M5 12h14"]
};

const svgString = (name, size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]
        .map((d) => `<path d="${d}"/>`)
        .join("")}</svg>`;

function Icon({ name, size = 18, spin = false }) {
    return (
        <svg
            className={spin ? "ff-spin" : undefined}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[name].map((d) => <path key={d} d={d} />)}
        </svg>
    );
}

/* ---------- Map marker icons (cached per type+state) ---------- */

const userIcon = L.divIcon({
    className: "ff-pin-wrap",
    html: `<div class="ff-me"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const pinCache = new Map();
function stationIcon(typeKey, state, iconName) {
    const cacheId = `${typeKey}:${state}`;
    if (pinCache.has(cacheId)) return pinCache.get(cacheId);
    const size = state === "selected" ? 50 : 40;
    const dataType = typeKey === "cng" || typeKey === "ev" ? ` data-type="${typeKey}"` : "";
    const icon = L.divIcon({
        className: "ff-pin-wrap",
        html: `<div class="ff-pin" data-state="${state}"${dataType}>${svgString(iconName, state === "selected" ? 22 : 18)}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
    pinCache.set(cacheId, icon);
    return icon;
}

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

function haversineKm([lat1, lng1], [lat2, lng2]) {
    const rad = (d) => (d * Math.PI) / 180;
    const a =
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
}

const formatKm = (km) => {
    if (km == null || Number.isNaN(km)) return "";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
};

/* Turns raw OSRM maneuver data into a short, human-readable instruction. */
const formatManeuver = (step) => {
    if (!step || !step.maneuver) {
        return step?.name ? `Continue on ${step.name}` : "Continue on the route";
    }

    const { type, modifier } = step.maneuver;
    const roadName = step.name && step.name.trim().length > 0 ? step.name : "";

    if (type === "arrive") return "Arrive at your destination";
    if (type === "depart") return roadName ? `Head out on ${roadName}` : "Head out";
    if (type === "roundabout" || type === "rotary") return "Enter the roundabout";

    let verb = "Continue";
    if (type === "turn" || type === "end of road") verb = "Turn";
    else if (type === "merge") verb = "Merge";
    else if (type === "fork") verb = "Keep";

    if (modifier) verb = `${verb} ${modifier}`;
    else if (verb === "Continue") verb = "Continue straight";

    return roadName ? `${verb} onto ${roadName}` : verb;
};

/*
 * Normalises a station coming back from the backend's /map/fuel-stations
 * route. Field names/casing aren't assumed to be exactly one shape, the same
 * defensive approach used for the mechanics data in LiveMap.jsx.
 */
const normalizeStation = (raw) => {
    const latitude = Number(raw.latitude ?? raw.lat);
    const longitude = Number(raw.longitude ?? raw.lng ?? raw.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
        id: raw.id ?? raw.stationId ?? `${latitude},${longitude}`,
        type: raw.type || "",
        name: raw.name || raw.brand || "Station",
        latitude,
        longitude,
        brand: raw.brand || "",
        address: raw.address || "",
        openingHours: raw.openingHours || raw.opening_hours || "",
        phone: raw.phone || raw.contactPhone || raw.phoneNumber || "",
        website: raw.website || raw.contactWebsite || "",
        fuelPetrol: Boolean(raw.fuelPetrol),
        fuelDiesel: Boolean(raw.fuelDiesel),
        fuelLpg: Boolean(raw.fuelLpg),
        fuelCng: Boolean(raw.fuelCng),
        fuelElectricity: Boolean(raw.fuelElectricity),
        operator: raw.operator || "",
        socketTypes: raw.socketTypes || raw.socket_types || "",
        capacity: Number(raw.capacity) || 0,
        fee: raw.fee || ""
    };
};

/* ---------- Short-lived cache so the backend isn't hammered on every pan/zoom ---------- */
/* Keyed by backend category (not the UI type), since Petrol/Diesel and CNG
 * share one category/query and should share one cached fetch. */

const cacheKey = ([lat, lng], radiusKm, category) =>
    `ff-stations:${category}:${lat.toFixed(3)},${lng.toFixed(3)}:${radiusKm}`;

function readCache(key, allowStale = false) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { at, stations } = JSON.parse(raw);
        if (!allowStale && Date.now() - at > CACHE_TTL_MS) return null;
        return stations;
    } catch {
        return null;
    }
}

function writeCache(key, stations) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), stations }));
    } catch {
        /* storage is optional */
    }
}

/*
 * Stations come from the backend's /map/fuel-stations route (see
 * getFuelStations in customerService.js), the same endpoint LiveMap.jsx used
 * for mechanics-adjacent data. category is "FUEL" (OSM amenity=fuel, covers
 * both the Petrol/Diesel and CNG tabs) or "EV" (OSM amenity=charging_station,
 * a different OSM place type, not a filter on fuel stations). This used to
 * query OpenStreetMap's Overpass API directly from the browser, but that
 * depends on a single public cluster prone to overload; the real fix lives
 * server-side where retries across genuinely independent providers can
 * happen without hitting CORS.
 */
async function fetchStations(center, radiusKm, category, signal) {
    const key = cacheKey(center, radiusKm, category);
    const cached = readCache(key);
    if (cached) return cached;

    const [lat, lng] = center;

    try {
        const response = await getFuelStations(lat, lng, radiusKm, category, signal);
        const list = Array.isArray(response?.data) ? response.data : [];
        const stations = list.map(normalizeStation).filter(Boolean).slice(0, FUEL_LIMIT * 2);
        writeCache(key, stations);
        return stations;
    } catch (err) {
        if (signal?.aborted) throw err;

        // Backend failed: an older saved answer is better than an empty list.
        const stale = readCache(key, true);
        if (stale) return stale;

        throw new Error(
            err.response?.data?.message || "Station lookup is unavailable. Try again shortly."
        );
    }
}

/* ================================================================== */
/* Map helpers                                                         */
/* ================================================================== */

function MapBridge({ onReady }) {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize({ animate: false });
        onReady(map);

        const observer =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => map.invalidateSize({ animate: false }))
                : null;
        observer?.observe(map.getContainer());

        return () => {
            observer?.disconnect();
            onReady(null);
        };
    }, [map, onReady]);
    return null;
}

/* Keeps the driver in view while navigating. */
function FollowUser({ position, enabled }) {
    const map = useMap();
    useEffect(() => {
        if (!enabled || !position) return;
        map.setView(position, Math.max(map.getZoom(), 16), { animate: true, duration: 0.5 });
    }, [enabled, position, map]);
    return null;
}

/* Frames the whole route once when it is calculated (not on every GPS tick). */
function FitRoute({ route, station, positionRef, enabled }) {
    const map = useMap();
    useEffect(() => {
        if (!enabled || !route?.coordinates?.length) return;
        const points = [...route.coordinates];
        if (station) points.push([station.latitude, station.longitude]);
        if (positionRef.current) points.push(positionRef.current);
        map.fitBounds(L.latLngBounds(points), { padding: [64, 64], maxZoom: 16, animate: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route, enabled]);
    return null;
}

/* ================================================================== */
/* Presentational blocks                                               */
/* ================================================================== */

function TypePicker({ onSelect }) {
    return (
        <div className="ff-picker">
            <div className="ff-picker-inner">
                <p className="ff-eyebrow">RoadAid</p>
                <h1 className="ff-picker-title">What are you looking for?</h1>
                <p className="ff-picker-sub">Pick a category to see nearby stations, real routes and turn-by-turn directions.</p>
                <div className="ff-picker-grid">
                    {STATION_TYPES.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className="ff-picker-card"
                            data-type={t.key}
                            onClick={() => onSelect(t.key)}
                        >
                            <span className="ff-picker-ico"><Icon name={t.icon} size={26} /></span>
                            <span className="ff-picker-label">{t.label}</span>
                            <span className="ff-picker-desc">{t.pickerDesc}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StationCard({ station, selected, nearest, iconName, typeKey, onSelect }) {
    return (
        <button type="button" className="ff-card" aria-pressed={selected} onClick={() => onSelect(station)}>
            <span className="ff-card-top">
                <span className="ff-card-ico" data-type={typeKey} data-nearest={nearest}><Icon name={iconName} size={18} /></span>
                <span className="ff-card-name">{station.name}</span>
            </span>
            <span className="ff-card-meta">
                <span>{formatKm(station.distanceKm)}</span>
                {nearest && <span className="ff-tag">Nearest</span>}
            </span>
        </button>
    );
}

function NavigationBanner({ station, arrived, progress, step, rerouting, accuracy, onExit, onOpenMaps }) {
    return (
        <section className="ff-nav" aria-live="polite" aria-label="Navigation">
            <div className="ff-nav-row">
                <div className="ff-nav-info">
                    <div className="ff-nav-title">
                        <span className="ff-live" data-arrived={arrived} aria-hidden="true" />
                        <span>{station.name}</span>
                    </div>

                    {arrived ? (
                        <p className="ff-arrived">You've arrived at {station.name}</p>
                    ) : (
                        progress.distanceRemainingKm !== null && (
                            <div className="ff-nav-card">
                                <div className="ff-nav-stats">
                                    <span>{formatKm(progress.distanceRemainingKm)} <small>left</small></span>
                                    <span>{Math.max(0, Math.round(progress.etaMinutes))} <small>min</small></span>
                                </div>
                                <div className="ff-track">
                                    <div className="ff-fill" style={{ width: `${Math.min(100, Math.max(0, progress.progressPercent))}%` }} />
                                </div>
                                {step && (
                                    <div className="ff-step">
                                        <Icon name="turn" size={16} />
                                        <span>{formatManeuver(step)}</span>
                                    </div>
                                )}
                                {rerouting && (
                                    <div className="ff-reroute">
                                        <Icon name="refresh" size={14} spin /> Recalculating route…
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {!arrived && accuracy != null && <p className="ff-accuracy">GPS accuracy ±{Math.round(accuracy)} m</p>}
                </div>

                <div className="ff-nav-actions">
                    <button type="button" className="ff-btn ff-btn-ghost" onClick={onExit}>End navigation</button>
                    {arrived && (
                        <button type="button" className="ff-btn ff-btn-ghost" onClick={onOpenMaps}>Open in Maps</button>
                    )}
                </div>
            </div>
        </section>
    );
}

function StationSheet({
                          station, typeKey, nearest, distanceKm, route, routeLoading, routeError, navigationMode, progress,
                          nextStep, hasPosition, onPrimary, onOpenMaps, onClose
                      }) {
    const isEv = typeKey === "ev";
    const fuels = isEv ? [] : FUEL_TYPES.filter((t) => station[t.key]);
    const connectors = isEv && station.socketTypes
        ? station.socketTypes.split(",").map((c) => c.trim()).filter(Boolean)
        : [];
    const feeLabel = station.fee === "yes" ? "Paid" : station.fee === "no" ? "Free" : station.fee && station.fee !== "unknown" ? station.fee : "";
    const showInfo = !route && (
        station.openingHours || station.phone || station.website || fuels.length > 0 || connectors.length > 0 || (isEv && (station.capacity > 0 || feeLabel))
    );

    return (
        <aside className="ff-sheet" aria-label="Selected station">
            <span className="ff-handle" aria-hidden="true" />

            <div className="ff-sheet-head">
                <h2 className="ff-sheet-name">{station.name}</h2>
                {nearest && <span className="ff-tag">Nearest</span>}
            </div>

            {isEv && station.operator && station.operator !== station.name && <p className="ff-sheet-sub">{station.operator}</p>}
            {!isEv && station.brand && station.brand !== station.name && <p className="ff-sheet-sub">{station.brand}</p>}
            {station.address && <p className="ff-sheet-sub">{station.address}</p>}
            {!route && distanceKm != null && <p className="ff-sheet-sub">{formatKm(distanceKm)} away in a straight line</p>}

            {showInfo && (
                <div className="ff-info">
                    {station.openingHours && <div className="ff-info-row"><Icon name="clock" size={15} /><span>{station.openingHours}</span></div>}
                    {station.phone && <div className="ff-info-row"><Icon name="phone" size={15} /><span>{station.phone}</span></div>}
                    {station.website && <div className="ff-info-row"><Icon name="globe" size={15} /><span>{station.website}</span></div>}
                    {fuels.length > 0 && (
                        <div className="ff-badges">
                            {fuels.map((t) => (
                                <span key={t.key} className="ff-badge" data-tone={t.key === "fuelCng" ? "cng" : undefined}>{t.label}</span>
                            ))}
                        </div>
                    )}
                    {connectors.length > 0 && (
                        <div className="ff-badges">
                            {connectors.map((c) => <span key={c} className="ff-badge" data-tone="ev">{c}</span>)}
                        </div>
                    )}
                    {isEv && (station.capacity > 0 || feeLabel) && (
                        <div className="ff-badges">
                            {station.capacity > 0 && (
                                <span className="ff-badge" data-tone="ev">{station.capacity} connector{station.capacity === 1 ? "" : "s"}</span>
                            )}
                            {feeLabel && <span className="ff-badge" data-tone="ev">{feeLabel}</span>}
                        </div>
                    )}
                </div>
            )}

            {!navigationMode && route && nextStep && (
                <div className="ff-preview">
                    <div className="ff-preview-label">First turn</div>
                    <div className="ff-preview-text">{formatManeuver(nextStep)}</div>
                </div>
            )}

            {route && (
                <div className="ff-stats">
                    <div className="ff-stat">
                        <div className="ff-stat-label">Distance</div>
                        <div className="ff-stat-value">
                            {navigationMode && progress.distanceRemainingKm !== null ? formatKm(progress.distanceRemainingKm) : formatKm(route.distanceKm)}
                        </div>
                    </div>
                    <div className="ff-stat">
                        <div className="ff-stat-label">Arrival</div>
                        <div className="ff-stat-value">
                            {navigationMode && progress.etaMinutes !== null
                                ? Math.max(0, Math.round(progress.etaMinutes))
                                : Math.max(1, Math.round(route.durationMinutes))}{" "}min
                        </div>
                    </div>
                </div>
            )}

            {routeError && <div className="ff-sheet-error" role="alert">{routeError}</div>}

            <div className="ff-sheet-actions">
                <button type="button" className="ff-btn ff-btn-dark ff-btn-block" disabled={!hasPosition || routeLoading} onClick={onPrimary}>
                    {routeLoading ? (<><Icon name="refresh" size={16} spin /> Calculating…</>) : route ? "Start navigation" : "Calculate route"}
                </button>
                <div className="ff-row">
                    <button type="button" className="ff-btn" onClick={onOpenMaps} disabled={!hasPosition}>
                        <Icon name="directions" size={16} /> Open in Maps
                    </button>
                    <button type="button" className="ff-btn" onClick={onClose}>
                        <Icon name="close" size={16} /> Close
                    </button>
                </div>
            </div>
        </aside>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

const emptyProgress = { distanceRemainingKm: null, etaMinutes: null, progressPercent: 0, currentStepIndex: 0 };

function FindFuel() {
    const [map, setMap] = useState(null);

    const [stationTypeKey, setStationTypeKeyState] = useState(() => {
        try {
            const saved = sessionStorage.getItem(TYPE_STORAGE_KEY);
            return STATION_TYPES.some((t) => t.key === saved) ? saved : null;
        } catch {
            return null;
        }
    });

    const [position, setPosition] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [locationError, setLocationError] = useState("");
    const [locationAttempt, setLocationAttempt] = useState(0);

    const [searchCenter, setSearchCenter] = useState(null);
    const [stations, setStations] = useState([]);
    const [loadingStations, setLoadingStations] = useState(false);
    const [stationsError, setStationsError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const [radius, setRadius] = useState(DEFAULT_RADIUS);
    const [sortMode, setSortMode] = useState("nearest");
    const [fuelSubFilter, setFuelSubFilter] = useState([]);

    const [selectedStation, setSelectedStation] = useState(null);
    const [route, setRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState("");

    const [navigationMode, setNavigationMode] = useState(false);
    const [rerouting, setRerouting] = useState(false);
    const [progress, setProgress] = useState(emptyProgress);

    /* Refs hold the latest values for GPS callbacks that outlive a single render. */
    const positionRef = useRef(null);
    const routeRef = useRef(null);
    const stationRef = useRef(null);
    const progressRef = useRef(emptyProgress);
    const reroutingRef = useRef(false);
    const lastRerouteRef = useRef(0);
    const routeRequestRef = useRef(0);

    useEffect(() => { routeRef.current = route; }, [route]);
    useEffect(() => { stationRef.current = selectedStation; }, [selectedStation]);
    useEffect(() => { progressRef.current = progress; }, [progress]);

    const updateRerouting = (value) => {
        reroutingRef.current = value;
        setRerouting(value);
    };

    /* ---------------------------------------------------------------- */
    /* Routing                                                           */
    /* ---------------------------------------------------------------- */

    const calculateRoute = useCallback(async (station, preserveNavigation = false) => {
        const from = positionRef.current;
        if (!from || !station) return;

        const requestId = ++routeRequestRef.current;
        setRouteLoading(true);
        setRouteError("");
        if (!preserveNavigation) {
            setRoute(null);
            setProgress(emptyProgress);
        }

        try {
            const [startLat, startLng] = from;
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${station.longitude},${station.latitude}?overview=full&geometries=geojson&steps=true`
            );
            if (!response.ok) throw new Error("Unable to calculate route.");

            const data = await response.json();
            if (data.code !== "Ok" || !data.routes?.length) throw new Error("No driving route found.");

            // Ignore the answer if the person picked a different station while this was loading.
            if (requestId !== routeRequestRef.current) return;

            const best = data.routes[0];
            setRoute({
                coordinates: best.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
                distanceKm: best.distance / 1000,
                durationMinutes: best.duration / 60,
                steps: best.legs?.[0]?.steps || []
            });
        } catch (error) {
            console.error("Failed to calculate station route:", error);
            if (requestId !== routeRequestRef.current) return;
            setRouteError(
                preserveNavigation
                    ? "Couldn't recalculate the route. Still tracking your location."
                    : "Couldn't calculate a route to this station. Try again."
            );
        } finally {
            if (requestId === routeRequestRef.current) setRouteLoading(false);
        }
    }, []);

    /* ---------------------------------------------------------------- */
    /* Navigation progress                                               */
    /* ---------------------------------------------------------------- */

    const calculateProgress = useCallback((lat, lng) => {
        const active = routeRef.current;
        if (!active?.coordinates?.length) return;

        let closestIndex = 0;
        let closest = Infinity;
        active.coordinates.forEach((point, index) => {
            const d = haversineKm([lat, lng], point);
            if (d < closest) {
                closest = d;
                closestIndex = index;
            }
        });

        let travelledKm = 0;
        for (let i = 1; i <= closestIndex; i += 1) {
            travelledKm += haversineKm(active.coordinates[i - 1], active.coordinates[i]);
        }

        const routeLengthKm = active.distanceKm > 0 ? active.distanceKm : travelledKm;
        const percent = routeLengthKm > 0 ? Math.min(100, Math.max(0, (travelledKm / routeLengthKm) * 100)) : 0;
        const remaining = Math.max(0, routeLengthKm - travelledKm);
        const eta = routeLengthKm > 0 ? Math.max(0, active.durationMinutes * (remaining / routeLengthKm)) : 0;

        // Find which turn-by-turn step we're on, so the banner shows the relevant manoeuvre.
        const steps = active.steps || [];
        let cumulative = 0;
        let stepIndex = 0;
        for (let i = 0; i < steps.length; i += 1) {
            const stepKm = (steps[i].distance || 0) / 1000;
            if (travelledKm < cumulative + stepKm || i === steps.length - 1) {
                stepIndex = i;
                break;
            }
            cumulative += stepKm;
        }

        setProgress({ distanceRemainingKm: remaining, etaMinutes: eta, progressPercent: percent, currentStepIndex: stepIndex });
        return closest;
    }, []);

    const distanceFromRoute = (lat, lng) => {
        const active = routeRef.current;
        if (!active?.coordinates?.length) return Infinity;
        return active.coordinates.reduce((min, point) => Math.min(min, haversineKm([lat, lng], point)), Infinity);
    };

    /* ---------------------------------------------------------------- */
    /* GPS                                                               */
    /* ---------------------------------------------------------------- */

    // One reading to find where the person is.
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError("This browser can't share your location.");
            return;
        }
        setLocationError("");

        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const next = [coords.latitude, coords.longitude];
                positionRef.current = next;
                setPosition(next);
                setAccuracy(coords.accuracy ?? null);
            },
            (err) =>
                setLocationError(
                    err.code === 1
                        ? "Location access is blocked. Allow it in your browser settings, then try again."
                        : "We couldn't find your location. Check your GPS or connection and try again."
                ),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }, [locationAttempt]);

    // Continuous tracking only while navigating.
    useEffect(() => {
        if (!navigationMode || !navigator.geolocation) return undefined;

        const watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
                const { latitude, longitude } = coords;
                const next = [latitude, longitude];
                positionRef.current = next;
                setPosition(next);
                setAccuracy(coords.accuracy ?? null);

                calculateProgress(latitude, longitude);

                const off = distanceFromRoute(latitude, longitude);
                const remaining = progressRef.current.distanceRemainingKm;
                const isArrived = remaining !== null && remaining <= ARRIVED_KM;
                const station = stationRef.current;

                if (
                    off > OFF_ROUTE_KM &&
                    station &&
                    !reroutingRef.current &&
                    !isArrived &&
                    Date.now() - lastRerouteRef.current > REROUTE_COOLDOWN_MS
                ) {
                    lastRerouteRef.current = Date.now();
                    updateRerouting(true);
                    calculateRoute(station, true).finally(() => updateRerouting(false));
                }
            },
            () => setLocationError("Lost your GPS signal. Still trying…"),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigationMode]);

    /* ---------------------------------------------------------------- */
    /* Station search                                                    */
    /* ---------------------------------------------------------------- */

    // Search around where you are. Only search again after moving a good distance, and never
    // while navigating (the old version re-ran the search on every GPS update).
    useEffect(() => {
        if (!position) return;
        if (!searchCenter || (!navigationMode && haversineKm(position, searchCenter) > RESEARCH_DISTANCE_KM)) {
            setSearchCenter(position);
        }
    }, [position, searchCenter, navigationMode]);

    useEffect(() => {
        if (!searchCenter || !stationTypeKey) return undefined;

        const category = STATION_TYPES.find((t) => t.key === stationTypeKey)?.category || "FUEL";
        const controller = new AbortController();
        setLoadingStations(true);
        setStationsError("");

        fetchStations(searchCenter, radius, category, controller.signal)
            .then((list) => {
                if (!controller.signal.aborted) setStations(list);
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                console.warn("Station lookup unavailable:", err);
                setStations([]);
                setStationsError("Couldn't load nearby stations. Check your connection and try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoadingStations(false);
            });

        return () => controller.abort();
    }, [searchCenter, radius, stationTypeKey, reloadKey]);

    /* ---------------------------------------------------------------- */
    /* Derived data                                                      */
    /* ---------------------------------------------------------------- */

    const withDistance = useMemo(
        () => stations.map((s) => ({ ...s, distanceKm: position ? haversineKm(position, [s.latitude, s.longitude]) : null })),
        [stations, position]
    );

    const typedStations = useMemo(
        () => withDistance.filter((s) => matchesType(s, stationTypeKey)),
        [withDistance, stationTypeKey]
    );

    const availableSubFilters = useMemo(
        () => (stationTypeKey === "petrolDiesel" ? SUBFILTER_TYPES.filter((t) => typedStations.some((s) => s[t.key])) : []),
        [typedStations, stationTypeKey]
    );

    // Distance and the petrol/diesel sub-filter are applied here too, so the filters work instantly.
    const visibleStations = useMemo(() => {
        let list = typedStations.filter((s) => s.distanceKm == null || s.distanceKm <= radius);
        if (stationTypeKey === "petrolDiesel" && fuelSubFilter.length > 0) {
            list = list.filter((s) => fuelSubFilter.some((key) => s[key]));
        }

        if (sortMode === "farthest") list.sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0));
        else if (sortMode === "name") list.sort((a, b) => a.name.localeCompare(b.name));
        else list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

        return list.slice(0, FUEL_LIMIT);
    }, [typedStations, radius, fuelSubFilter, sortMode, stationTypeKey]);

    const nearestId = useMemo(() => {
        const withD = visibleStations.filter((s) => s.distanceKm != null);
        if (withD.length === 0) return null;
        return withD.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a)).id;
    }, [visibleStations]);

    const selectedDistance = useMemo(
        () => (position && selectedStation ? haversineKm(position, [selectedStation.latitude, selectedStation.longitude]) : null),
        [position, selectedStation]
    );

    const arrived = navigationMode && progress.distanceRemainingKm !== null && progress.distanceRemainingKm <= ARRIVED_KM;
    const currentStep = route?.steps?.[progress.currentStepIndex] || null;
    const firstStep = route?.steps?.[0] || null;
    const currentType = STATION_TYPES.find((t) => t.key === stationTypeKey) || STATION_TYPES[0];

    /* ---------------------------------------------------------------- */
    /* Selection + navigation lifecycle                                  */
    /* ---------------------------------------------------------------- */

    const resetRoute = () => {
        routeRequestRef.current += 1; // cancels any route still loading
        setRoute(null);
        setRouteError("");
        setRouteLoading(false);
        setNavigationMode(false);
        updateRerouting(false);
        setProgress(emptyProgress);
    };

    const clearSelection = () => {
        setSelectedStation(null);
        resetRoute();
    };

    const selectStation = (station) => {
        if (selectedStation?.id === station.id) return;
        if (route || navigationMode || routeLoading) resetRoute();
        setSelectedStation(station);
        map?.flyTo([station.latitude, station.longitude], Math.max(map.getZoom(), 15), { duration: 0.6 });
    };

    const startNavigation = () => {
        if (!route || !selectedStation) return;
        setRouteError("");
        setNavigationMode(true);
        if (positionRef.current) calculateProgress(positionRef.current[0], positionRef.current[1]);
    };

    const stopNavigation = () => {
        setNavigationMode(false);
        updateRerouting(false);
        setProgress(emptyProgress);
    };

    const openInMaps = (station) => {
        if (!position || !station) return;
        window.open(
            `https://www.google.com/maps/dir/?api=1&origin=${position[0]},${position[1]}&destination=${station.latitude},${station.longitude}&travelmode=driving`,
            "_blank",
            "noopener,noreferrer"
        );
    };

    // Switches category/tab. Petrol/Diesel <-> CNG reuses the already-fetched
    // FUEL list (matchesType() just refilters it); EV always needs a fresh
    // fetch since it is a different backend category.
    const changeType = (key) => {
        if (!STATION_TYPES.some((t) => t.key === key)) return;
        setStationTypeKeyState(key);
        try {
            sessionStorage.setItem(TYPE_STORAGE_KEY, key);
        } catch {
            /* storage is optional */
        }
        setSelectedStation(null);
        resetRoute();
        setFuelSubFilter([]);
        setSortMode("nearest");
    };

    // Drop the selection if filters hide the selected station (but never mid-navigation).
    useEffect(() => {
        if (!selectedStation || navigationMode) return;
        if (!visibleStations.some((s) => s.id === selectedStation.id)) clearSelection();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleStations]);

    const toggleSubFilter = (key) => setFuelSubFilter((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    const refresh = () => {
        try {
            Object.keys(sessionStorage).filter((k) => k.startsWith("ff-stations:")).forEach((k) => sessionStorage.removeItem(k));
        } catch {
            /* ignore */
        }
        setReloadKey((n) => n + 1);
    };

    const recenter = () => {
        if (map && position) map.flyTo(position, Math.max(map.getZoom(), 15), { duration: 0.7 });
    };

    /* ---------------------------------------------------------------- */
    /* Render                                                            */
    /* ---------------------------------------------------------------- */

    // First screen: nothing loads behind this but GPS and the chosen type is
    // remembered in sessionStorage, so reloading the page (or coming back
    // from a station sheet) doesn't force the picker again.
    if (!stationTypeKey) {
        return (
            <CustomerLayout>
                <div className="ff-root">
                    <TypePicker onSelect={changeType} />
                </div>
            </CustomerLayout>
        );
    }

    const subtitle = loadingStations
        ? `Finding nearby ${currentType.label.toLowerCase()} stations…`
        : searchCenter
            ? `${visibleStations.length} result${visibleStations.length === 1 ? "" : "s"} within ${radius} km`
            : currentType.headerSub;

    const widerRadius = RADIUS_OPTIONS.find((r) => r > radius);

    return (
        <CustomerLayout>
            <div className="ff-root">
                <header className="ff-head">
                    <div className="ff-head-text">
                        <span className="ff-head-ico" data-type={stationTypeKey}><Icon name={currentType.icon} size={22} /></span>
                        <div>
                            <p className="ff-eyebrow">RoadAid</p>
                            <h1 className="ff-title">{currentType.headerTitle}</h1>
                            <p className="ff-sub">{subtitle}</p>
                        </div>
                    </div>
                    <button type="button" className="ff-refresh" onClick={refresh} disabled={loadingStations || !position} aria-label="Refresh stations" title="Refresh">
                        <Icon name="refresh" size={18} spin={loadingStations} />
                    </button>
                </header>

                <div className="ff-type-switch" role="group" aria-label="Station type">
                    {STATION_TYPES.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className="ff-type-btn"
                            aria-pressed={stationTypeKey === t.key}
                            onClick={() => changeType(t.key)}
                        >
                            <Icon name={t.icon} size={15} />
                            {t.label}
                        </button>
                    ))}
                </div>

                {locationError && (
                    <div className="ff-banner" data-tone="warn" role="status">
                        <span>{locationError}</span>
                        {!navigationMode && (
                            <button type="button" className="ff-btn ff-btn-link" onClick={() => setLocationAttempt((n) => n + 1)}>Try again</button>
                        )}
                    </div>
                )}

                {stationsError && (
                    <div className="ff-banner" data-tone="danger" role="alert">
                        <span>{stationsError}</span>
                        <button type="button" className="ff-btn ff-btn-link" onClick={refresh}>Try again</button>
                    </div>
                )}

                {/* Controls */}
                <div className="ff-bar">
                    <div className="ff-bar-row">
                        <div className="ff-segment" role="group" aria-label="Search distance">
                            {RADIUS_OPTIONS.map((r) => (
                                <button key={r} type="button" className="ff-seg-btn" aria-pressed={radius === r} onClick={() => setRadius(r)}>
                                    {r} km
                                </button>
                            ))}
                        </div>

                        <span className="ff-spacer" />

                        {visibleStations.length > 1 && (
                            <select className="ff-select" value={sortMode} onChange={(e) => setSortMode(e.target.value)} aria-label="Sort stations">
                                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                        )}

                        {selectedStation && (
                            <button type="button" className="ff-btn" onClick={clearSelection}>Clear selection</button>
                        )}
                    </div>

                    {stationTypeKey === "petrolDiesel" && availableSubFilters.length > 0 && (
                        <>
                            <div className="ff-chips" role="group" aria-label="Fuel type">
                                {availableSubFilters.map((t) => (
                                    <button key={t.key} type="button" className="ff-chip" aria-pressed={fuelSubFilter.includes(t.key)} onClick={() => toggleSubFilter(t.key)}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            {fuelSubFilter.length > 0 && <p className="ff-note">Only stations that list their fuel types are shown.</p>}
                        </>
                    )}
                </div>

                {/* Station strip */}
                {visibleStations.length > 0 && (
                    <div className="ff-strip" aria-label="Nearby stations">
                        {visibleStations.map((station) => (
                            <StationCard
                                key={station.id}
                                station={station}
                                selected={selectedStation?.id === station.id}
                                nearest={station.id === nearestId}
                                iconName={currentType.icon}
                                typeKey={stationTypeKey}
                                onSelect={selectStation}
                            />
                        ))}
                    </div>
                )}

                {!loadingStations && !stationsError && searchCenter && visibleStations.length === 0 && (
                    <div className="ff-empty">
                        <strong>No {currentType.label.toLowerCase()} stations within {radius} km</strong>
                        <p>{fuelSubFilter.length > 0 ? "Clear the filter or search a wider distance." : "Try a wider search distance."}</p>
                        <div style={{ display: "flex", gap: 8 }}>
                            {fuelSubFilter.length > 0 && <button type="button" className="ff-btn" onClick={() => setFuelSubFilter([])}>Clear filter</button>}
                            {widerRadius && (
                                <button type="button" className="ff-btn ff-btn-dark" onClick={() => setRadius(widerRadius)}>
                                    Search {widerRadius} km
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {navigationMode && route && selectedStation && (
                    <NavigationBanner
                        station={selectedStation}
                        arrived={arrived}
                        progress={progress}
                        step={currentStep}
                        rerouting={rerouting}
                        accuracy={accuracy}
                        onExit={stopNavigation}
                        onOpenMaps={() => openInMaps(selectedStation)}
                    />
                )}

                {/* Map */}
                <div className="ff-map-wrap">
                    <MapContainer className="ff-map" center={position || DEFAULT_CENTER} zoom={position ? 14 : 7} zoomControl={false}>
                        <MapBridge onReady={setMap} />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maxZoom={19}
                        />

                        <FollowUser position={position} enabled={navigationMode} />
                        <FitRoute route={route} station={selectedStation} positionRef={positionRef} enabled={Boolean(route) && !navigationMode} />

                        {route && (
                            <>
                                <Polyline positions={route.coordinates} pathOptions={{ color: "#ffffff", weight: 11, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
                                <Polyline positions={route.coordinates} pathOptions={{ color: "#3b5bfd", weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }} />
                            </>
                        )}

                        {position && <Marker position={position} icon={userIcon} interactive={false} keyboard={false} zIndexOffset={1000} />}

                        {visibleStations.map((station) => {
                            const selected = selectedStation?.id === station.id;
                            const state = selected ? "selected" : station.id === nearestId ? "nearest" : "default";
                            return (
                                <Marker
                                    key={station.id}
                                    position={[station.latitude, station.longitude]}
                                    icon={stationIcon(stationTypeKey, state, currentType.icon)}
                                    title={station.name}
                                    zIndexOffset={selected ? 900 : 0}
                                    eventHandlers={{ click: () => selectStation(station) }}
                                />
                            );
                        })}
                    </MapContainer>

                    <div className="ff-legend" aria-hidden="true">
                        <span><i style={{ background: "#3b5bfd" }} /> You</span>
                        <span><i style={{ background: "#0d1321" }} /> Station</span>
                        <span><b /> Route</span>
                    </div>

                    <div className="ff-tools">
                        <button type="button" onClick={() => map?.zoomIn()} aria-label="Zoom in"><Icon name="plus" /></button>
                        <button type="button" onClick={() => map?.zoomOut()} aria-label="Zoom out"><Icon name="minus" /></button>
                        <button type="button" onClick={recenter} disabled={!position} aria-label="Go to my location"><Icon name="locate" /></button>
                    </div>

                    {selectedStation && (
                        <StationSheet
                            station={selectedStation}
                            typeKey={stationTypeKey}
                            nearest={selectedStation.id === nearestId}
                            distanceKm={selectedDistance}
                            route={route}
                            routeLoading={routeLoading}
                            routeError={routeError}
                            navigationMode={navigationMode}
                            progress={progress}
                            nextStep={firstStep}
                            hasPosition={Boolean(position)}
                            onPrimary={() => (route ? startNavigation() : calculateRoute(selectedStation))}
                            onOpenMaps={() => openInMaps(selectedStation)}
                            onClose={clearSelection}
                        />
                    )}
                </div>
            </div>
        </CustomerLayout>
    );
}

export default FindFuel;