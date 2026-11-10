import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import CustomerLayout from "../../layouts/CustomerLayout";
import { getNearbyMechanics } from "../../services/customerService";

/* ───────────────────────── Constants ───────────────────────── */

const DEFAULT_CENTER = [10.8505, 76.2711];
const RADIUS_OPTIONS = [2, 5, 10];
const DEFAULT_RADIUS = 10;
const FONT_URL =
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";

/* ───────────────────────── Helpers ───────────────────────── */

const toNum = (v) => (v == null || v === "" ? NaN : Number(v));
const validCoord = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng);
const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

function haversineKm([lat1, lng1], [lat2, lng2]) {
    const rad = (d) => (d * Math.PI) / 180;
    const a =
        Math.sin(rad(lat2 - lat1) / 2) ** 2 +
        Math.cos(rad(lat1)) *
        Math.cos(rad(lat2)) *
        Math.sin(rad(lng2 - lng1) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
}

const formatKm = (km) =>
    !Number.isFinite(km)
        ? ""
        : km < 1
            ? `${Math.round(km * 1000)} m`
            : `${km.toFixed(1)} km`;

const directionsUrl = (lat, lng) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

/*
 * Availability can arrive as a boolean, a number or a word, and under a few
 * different field names. Normalising it once means the pin colour, the pill,
 * the counts and the "Available now" switch can never disagree.
 */
const toBool = (v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;
    if (typeof v === "string") {
        return ["true", "1", "yes", "available", "online", "active"].includes(
            v.trim().toLowerCase()
        );
    }
    return false;
};

const readAvailability = (p) =>
    toBool(
        p.available ??
        p.isAvailable ??
        p.availability ??
        p.availabilityStatus ??
        p.isOnline ??
        p.online
    );

/* ───────────────────────── Icons ───────────────────────── */

const PATHS = {
    wrench: [
        "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
    ],
    locate: [
        "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8",
        "M12 2v3",
        "M12 19v3",
        "M2 12h3",
        "M19 12h3",
    ],
    refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
    directions: ["M3 11l19-9-9 19-2-8-8-2z"],
    phone: [
        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
    ],
    star: [
        "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    ],
    plus: ["M12 5v14", "M5 12h14"],
    minus: ["M5 12h14"],
};

const svgString = (name, size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]
        .map((d) => `<path d="${d}"/>`)
        .join("")}</svg>`;

function Icon({ name, size = 18, filled = false }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[name].map((d) => (
                <path key={d} d={d} />
            ))}
        </svg>
    );
}

/* ───────────────────────── Map markers ───────────────────────── */

const iconCache = new Map();

function pinIcon({ available = true, selected = false } = {}) {
    const key = `${available}-${selected}`;
    if (iconCache.has(key)) return iconCache.get(key);

    const bg = available ? "#000000" : "#8A8A8A";
    const size = selected ? 48 : 38;

    const icon = L.divIcon({
        className: "ra-pin-wrap",
        html: `<div class="ra-pin${selected ? " is-selected" : ""}" style="background:${bg};color:#fff">${svgString(
            "wrench",
            selected ? 22 : 18
        )}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
    iconCache.set(key, icon);
    return icon;
}

const userIcon = L.divIcon({
    className: "ra-pin-wrap",
    html: `<div class="ra-me"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

/* ───────────────────────── Data hooks ───────────────────────── */

function useFont() {
    useEffect(() => {
        if (document.getElementById("ra-font")) return;
        const link = document.createElement("link");
        link.id = "ra-font";
        link.rel = "stylesheet";
        link.href = FONT_URL;
        document.head.appendChild(link);
    }, []);
}

function useUserLocation() {
    const [state, setState] = useState({
        position: null,
        status: "locating",
        error: "",
    });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!navigator.geolocation) {
            setState({
                position: null,
                status: "error",
                error: "This browser can't share your location.",
            });
            return;
        }

        setState((s) => ({ ...s, status: "locating", error: "" }));

        navigator.geolocation.getCurrentPosition(
            ({ coords }) =>
                setState({
                    position: [coords.latitude, coords.longitude],
                    status: "ready",
                    error: "",
                }),
            (err) =>
                setState({
                    position: null,
                    status: "error",
                    error:
                        err.code === 1
                            ? "Location access is blocked. Allow it in your browser settings, then try again."
                            : "We couldn't find your location. Check your GPS or connection and try again.",
                }),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }, [attempt]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    return { ...state, retry };
}

/**
 * Runs `load` whenever `requestKey` changes. `loading` is derived from the key,
 * so there is never a frame where stale data looks like a finished result.
 */
function useRequest(requestKey, load) {
    const [result, setResult] = useState({ key: null, data: [], error: false });

    useEffect(() => {
        if (!requestKey) return undefined;
        const controller = new AbortController();

        load(controller.signal)
            .then((data) => {
                if (controller.signal.aborted) return;
                setResult({ key: requestKey, data, error: false });
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                console.warn("RoadAid map request failed:", err);
                setResult({ key: requestKey, data: [], error: true });
            });

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    const settled = result.key === requestKey;
    return {
        data: result.data,
        loading: Boolean(requestKey) && !settled,
        error: settled && result.error,
    };
}

/* ───────────────────────── UI pieces ───────────────────────── */

function MapBridge({ onReady }) {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize({ animate: false });
        onReady(map);

        const el = map.getContainer();
        const observer =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => map.invalidateSize({ animate: false }))
                : null;
        observer?.observe(el);
        const timer = setTimeout(() => map.invalidateSize({ animate: false }), 300);

        return () => {
            clearTimeout(timer);
            observer?.disconnect();
            onReady(null);
        };
    }, [map, onReady]);
    return null;
}

function Banner({ children, actionLabel, onAction }) {
    return (
        <div className="ra-banner" role="alert">
            <p>{children}</p>
            {actionLabel && (
                <button type="button" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

function Skeletons({ count }) {
    return Array.from({ length: count }, (_, i) => (
        <li key={i} className="ra-skel" aria-hidden="true">
            <span className="ra-skel-dot" />
            <span className="ra-skel-lines">
                <span />
                <span />
            </span>
        </li>
    ));
}

function ResultCard({ item, selected, onSelect }) {
    const title = item.workshopName || item.name;
    const sub = item.workshopName && item.name && item.name !== item.workshopName ? item.name : "";
    const address = item.workshopAddress;
    const phone = item.phone || item.phoneNumber;
    const ratingNum = toNum(item.averageRating);

    return (
        <li
            className={`ra-card${selected ? " is-selected" : ""}`}
            data-key={`provider-${item.mechanicId}`}
        >
            <button
                type="button"
                className="ra-card-main"
                onClick={onSelect}
                aria-pressed={selected}
            >
                <span className={`ra-avatar ${item.available ? "" : "is-off"}`}>
                    <Icon name="wrench" />
                </span>

                <span className="ra-card-text">
                    <span className="ra-card-title">{title}</span>
                    {sub && <span className="ra-card-sub">{sub}</span>}
                    <span className="ra-rating">
                        <Icon name="star" size={13} filled />
                        {Number.isFinite(ratingNum) && ratingNum > 0
                            ? ratingNum.toFixed(1)
                            : "New"}
                    </span>
                </span>

                <span className="ra-card-side">
                    <span className="ra-dist">{formatKm(item.distanceKm)}</span>
                    <span className={`ra-pill ${item.available ? "is-on" : "is-off"}`}>
                        {item.available ? "Available" : "Offline"}
                    </span>
                </span>
            </button>

            {selected && (
                <div className="ra-card-more">
                    {address && <p>{address}</p>}
                    <div className="ra-actions">
                        <a
                            className="ra-btn ra-btn-primary"
                            href={directionsUrl(item.latitude, item.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Icon name="directions" size={16} />
                            Get directions
                        </a>
                        {phone && (
                            <a className="ra-btn" href={`tel:${phone}`}>
                                <Icon name="phone" size={16} />
                                Call
                            </a>
                        )}
                    </div>
                </div>
            )}
        </li>
    );
}

/* ───────────────────────── Page ───────────────────────── */

function LiveMap() {
    useFont();

    const location = useUserLocation();
    const { position } = location;

    const [map, setMap] = useState(null);
    const [radius, setRadius] = useState(DEFAULT_RADIUS);
    const [reloadKey, setReloadKey] = useState(0);
    const [availableOnly, setAvailableOnly] = useState(false);
    const [selectedKey, setSelectedKey] = useState(null);
    const [sheetOpen, setSheetOpen] = useState(true);
    const [fitTick, setFitTick] = useState(0);

    const listRef = useRef(null);
    const fittedRef = useRef("");

    /* ---------- Data ---------- */
    const posKey = position ? position.join(",") : null;

    const providerReq = useRequest(
        posKey && `${posKey}|${radius}|${reloadKey}`,
        async () => {
            const res = await getNearbyMechanics(position[0], position[1], radius);
            const list = Array.isArray(res?.data) ? res.data : [];

            if (list.length > 0 && !list.some((p) => p.available != null || p.isAvailable != null || p.availability != null || p.availabilityStatus != null || p.isOnline != null || p.online != null)) {
                console.warn(
                    "RoadAid map: no availability field found on nearby mechanics, so every mechanic will show as offline. Fields received:",
                    Object.keys(list[0])
                );
            }

            return list
                .map((p) => {
                    const latitude = toNum(p.latitude);
                    const longitude = toNum(p.longitude);
                    const apiDistance = toNum(p.distanceKm ?? p.distance);
                    return {
                        ...p,
                        latitude,
                        longitude,
                        available: readAvailability(p),
                        distanceKm: Number.isFinite(apiDistance)
                            ? apiDistance
                            : validCoord(latitude, longitude)
                                ? haversineKm(position, [latitude, longitude])
                                : NaN,
                    };
                })
                .filter((p) => validCoord(p.latitude, p.longitude));
        }
    );

    /*
     * Applied here on the client as well as in the request, so filtering takes
     * effect instantly and still works even if the server ignores the radius
     * or returns offline mechanics.
     */
    const radiusProviders = useMemo(
        () =>
            [...providerReq.data]
                .filter((p) => !Number.isFinite(p.distanceKm) || p.distanceKm <= radius)
                .sort(
                    (a, b) =>
                        Number(b.available) - Number(a.available) ||
                        a.distanceKm - b.distanceKm
                ),
        [providerReq.data, radius]
    );

    const availableCount = useMemo(
        () => radiusProviders.filter((p) => p.available).length,
        [radiusProviders]
    );

    const shownProviders = useMemo(
        () => (availableOnly ? radiusProviders.filter((p) => p.available) : radiusProviders),
        [radiusProviders, availableOnly]
    );

    const loadingAny = location.status === "locating" || providerReq.loading;

    /* ---------- Map actions ---------- */
    const focusOn = useCallback(
        (latlng, zoom) => {
            if (!map) return;
            const z = zoom ?? Math.max(map.getZoom(), 15);
            // On phones the sheet covers the lower part of the map, so nudge the target up.
            const shift = isMobile() && sheetOpen ? 110 : 0;
            const target = map.unproject(map.project(latlng, z).add([0, shift]), z);
            map.flyTo(target, z, { duration: 0.7 });
        },
        [map, sheetOpen]
    );

    const select = (key, latlng) => {
        setSelectedKey(key);
        setSheetOpen(true);
        focusOn(latlng);
    };

    const refresh = () => {
        setSelectedKey(null);
        setReloadKey((n) => n + 1);
    };

    /* Jump to the user as soon as we know where they are, before results arrive */
    useEffect(() => {
        if (map && position) map.setView(position, 14, { animate: false });
    }, [map, position]);

    /*
     * Fit the map to what is actually shown. This runs once per search AND whenever
     * the "Available now" switch changes, so the map always matches the list.
     */
    useEffect(() => {
        if (!map || !position || providerReq.loading) return;

        const fitKey = `${posKey}|${radius}|${reloadKey}|${availableOnly}`;
        if (fittedRef.current === fitKey) return;

        map.invalidateSize({ animate: false });
        const size = map.getSize();
        if (size.x < 1 || size.y < 1) {
            // Layout isn't ready yet: try again shortly.
            const retry = setTimeout(() => setFitTick((n) => n + 1), 250);
            return () => clearTimeout(retry);
        }
        fittedRef.current = fitKey;

        const points = [position, ...shownProviders.map((p) => [p.latitude, p.longitude])];

        if (points.length < 2) {
            focusOn(position, 14);
            return;
        }

        const desktop = !isMobile();
        const leftPad = Math.min(420, Math.round(size.x * 0.45));
        try {
            map.fitBounds(L.latLngBounds(points), {
                paddingTopLeft: desktop ? [leftPad, 48] : [40, 72],
                paddingBottomRight: desktop ? [64, 48] : [40, 300],
                maxZoom: 15,
                animate: true,
                duration: 0.5,
            });
        } catch (err) {
            console.warn("Could not fit map to results:", err);
            map.setView(position, 14, { animate: false });
        }
    }, [
        map,
        position,
        posKey,
        radius,
        reloadKey,
        availableOnly,
        providerReq.loading,
        shownProviders,
        focusOn,
        fitTick,
    ]);

    /* Drop the selection if the selected mechanic is filtered out */
    useEffect(() => {
        if (!selectedKey) return;
        const stillShown = shownProviders.some((p) => `provider-${p.mechanicId}` === selectedKey);
        if (!stillShown) setSelectedKey(null);
    }, [selectedKey, shownProviders]);

    /* Keep the selected card visible when a marker is tapped */
    useEffect(() => {
        if (!selectedKey) return;
        listRef.current
            ?.querySelector(`[data-key="${selectedKey}"]`)
            ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [selectedKey]);

    /* ---------- Copy ---------- */
    const mechanicWord = availableOnly ? "available mechanic" : "mechanic";
    const statusText =
        location.status === "locating"
            ? "Finding your location…"
            : location.status === "error"
                ? "Location needed to search"
                : loadingAny
                    ? "Searching nearby…"
                    : `${shownProviders.length} ${mechanicWord}${shownProviders.length === 1 ? "" : "s"} within ${radius} km`;

    const nothingToShow =
        location.status === "ready" &&
        !providerReq.loading &&
        shownProviders.length === 0 &&
        !providerReq.error;

    const widerRadius = RADIUS_OPTIONS.find((r) => r > radius);
    const hiddenOffline = availableOnly && radiusProviders.length - availableCount;

    // Show skeletons only when there is nothing to show yet; otherwise keep the list
    // visible while it refreshes so switching distance feels instant.
    const providersPending =
        location.status === "locating" ||
        (providerReq.loading && providerReq.data.length === 0);

    return (
        <CustomerLayout>
            <style>{STYLES}</style>

            <div className="ra-page">
                {/* Map */}
                <div className="ra-map">
                    <MapContainer
                        style={{ width: "100%", height: "100%" }}
                        center={position || DEFAULT_CENTER}
                        zoom={position ? 14 : 7}
                        zoomControl={false}
                        attributionControl
                    >
                        <MapBridge onReady={setMap} />
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maxZoom={19}
                        />

                        {position && (
                            <Marker
                                position={position}
                                icon={userIcon}
                                interactive={false}
                                keyboard={false}
                                zIndexOffset={1000}
                            />
                        )}

                        {shownProviders.map((p) => {
                            const key = `provider-${p.mechanicId}`;
                            const selected = selectedKey === key;
                            return (
                                <Marker
                                    key={key}
                                    position={[p.latitude, p.longitude]}
                                    icon={pinIcon({ available: p.available, selected })}
                                    title={p.workshopName || p.name}
                                    zIndexOffset={selected ? 900 : 0}
                                    eventHandlers={{
                                        click: () => select(key, [p.latitude, p.longitude]),
                                    }}
                                />
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Map tools */}
                <div className="ra-tools">
                    <button type="button" onClick={() => map?.zoomIn()} aria-label="Zoom in">
                        <Icon name="plus" />
                    </button>
                    <button type="button" onClick={() => map?.zoomOut()} aria-label="Zoom out">
                        <Icon name="minus" />
                    </button>
                    <button
                        type="button"
                        onClick={() => position && focusOn(position, 15)}
                        disabled={!position}
                        aria-label="Go to my location"
                    >
                        <Icon name="locate" />
                    </button>
                </div>

                {/* Panel (side card on desktop, bottom sheet on phones) */}
                <aside className={`ra-panel${sheetOpen ? "" : " is-collapsed"}`} aria-label="Mechanics nearby">
                    <header className="ra-head">
                        <button
                            type="button"
                            className="ra-grab"
                            onClick={() => setSheetOpen((o) => !o)}
                            aria-expanded={sheetOpen}
                            aria-controls="ra-body"
                            aria-label={sheetOpen ? "Collapse results" : "Show results"}
                        >
                            <span />
                        </button>

                        <div className="ra-head-row">
                            <div>
                                <h1 className="ra-title">Mechanics nearby</h1>
                                <p className="ra-status" aria-live="polite">
                                    {statusText}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="ra-round"
                                onClick={refresh}
                                disabled={loadingAny || !position}
                                aria-label="Refresh results"
                            >
                                <Icon name="refresh" />
                            </button>
                        </div>
                    </header>

                    <div className="ra-body" id="ra-body">
                        {location.status === "error" && (
                            <Banner actionLabel="Try again" onAction={location.retry}>
                                {location.error}
                            </Banner>
                        )}

                        {location.status !== "error" && (
                            <>
                                <div className="ra-options">
                                    <div className="ra-seg" role="group" aria-label="Search distance">
                                        {RADIUS_OPTIONS.map((r) => (
                                            <button
                                                key={r}
                                                type="button"
                                                aria-pressed={radius === r}
                                                onClick={() => setRadius(r)}
                                            >
                                                {r} km
                                            </button>
                                        ))}
                                    </div>

                                    <label className="ra-switch">
                                        <input
                                            type="checkbox"
                                            checked={availableOnly}
                                            onChange={(e) => setAvailableOnly(e.target.checked)}
                                        />
                                        <span className="ra-track" />
                                        Available now
                                        <em className="ra-switch-count">{availableCount}</em>
                                    </label>
                                </div>

                                {providerReq.error && (
                                    <Banner actionLabel="Try again" onAction={refresh}>
                                        We couldn't load mechanics right now.
                                    </Banner>
                                )}

                                <div className="ra-list" ref={listRef}>
                                    {(providersPending || shownProviders.length > 0) && (
                                        <section>
                                            <ul>
                                                {providersPending ? (
                                                    <Skeletons count={3} />
                                                ) : (
                                                    shownProviders.map((p) => (
                                                        <ResultCard
                                                            key={p.mechanicId}
                                                            item={p}
                                                            selected={selectedKey === `provider-${p.mechanicId}`}
                                                            onSelect={() =>
                                                                select(`provider-${p.mechanicId}`, [
                                                                    p.latitude,
                                                                    p.longitude,
                                                                ])
                                                            }
                                                        />
                                                    ))
                                                )}
                                            </ul>
                                        </section>
                                    )}

                                    {nothingToShow && (
                                        <div className="ra-empty">
                                            <strong>
                                                {availableOnly
                                                    ? `No available mechanics within ${radius} km`
                                                    : `Nothing found within ${radius} km`}
                                            </strong>
                                            <p>
                                                {availableOnly && hiddenOffline > 0
                                                    ? `${hiddenOffline} offline mechanic${hiddenOffline === 1 ? " is" : "s are"} hidden by “Available now”.`
                                                    : "Try a wider search distance."}
                                            </p>
                                            <div className="ra-actions" style={{ justifyContent: "center" }}>
                                                {availableOnly && hiddenOffline > 0 && (
                                                    <button
                                                        type="button"
                                                        className="ra-btn ra-btn-primary"
                                                        onClick={() => setAvailableOnly(false)}
                                                    >
                                                        Show offline too
                                                    </button>
                                                )}
                                                {widerRadius && (
                                                    <button
                                                        type="button"
                                                        className="ra-btn"
                                                        onClick={() => setRadius(widerRadius)}
                                                    >
                                                        Search {widerRadius} km
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </CustomerLayout>
    );
}

/* ───────────────────────── Styles ───────────────────────── */

const STYLES = `
.ra-page{
  --ink:#000; --paper:#fff; --fog:#F3F3F3; --line:#E2E2E2; --mute:#5E5E5E;
  --go:#046C3A; --go-bg:#E3F5EA; --blue:#276EF1;
  --danger:#8A1C1C; --danger-bg:#FDECEC;
  position:relative; width:100%; max-width:1400px; margin:0 auto;
  height:clamp(560px,calc(100vh - 150px),920px);
  height:clamp(560px,calc(100dvh - 150px),920px);
  border-radius:20px; overflow:hidden; border:1px solid var(--line);
  background:var(--fog); color:var(--ink);
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  font-size:15px; line-height:1.4; -webkit-font-smoothing:antialiased;
}
.ra-page .ra-panel, .ra-page .ra-panel *, .ra-page .ra-tools, .ra-page .ra-tools *{box-sizing:border-box}
.ra-page .ra-panel button, .ra-page .ra-panel a, .ra-page .ra-tools button{font:inherit}
.ra-page .ra-panel button, .ra-page .ra-tools button{cursor:pointer}
.ra-page .ra-panel button:disabled, .ra-page .ra-tools button:disabled{cursor:not-allowed;opacity:.45}
.ra-page .ra-panel :focus-visible, .ra-page .ra-tools :focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.ra-page .ra-panel h1, .ra-page .ra-panel h2, .ra-page .ra-panel p, .ra-page .ra-panel ul{margin:0;padding:0}
.ra-page .ra-panel ul{list-style:none}

.ra-page .ra-map{position:absolute;inset:0;width:100%;height:100%;z-index:0;font-family:inherit}
.ra-page .ra-map .leaflet-control-attribution{font-size:11px;background:rgba(255,255,255,.85)}

/* Pins */
.ra-page .ra-pin-wrap{background:none;border:0}
.ra-page .ra-pin{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;
  border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:transform .15s ease}
.ra-page .ra-pin.is-selected{box-shadow:0 0 0 3px #000,0 8px 18px rgba(0,0,0,.35)}
.ra-page .ra-me{position:relative;width:100%;height:100%}
.ra-page .ra-me::before{content:"";position:absolute;inset:-12px;border-radius:50%;
  background:rgba(39,110,241,.25);animation:ra-pulse 2.4s ease-out infinite}
.ra-page .ra-me::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--blue);
  border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}
@keyframes ra-pulse{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.3);opacity:0}}

/* Map tools */
.ra-page .ra-tools{position:absolute;z-index:1000;top:16px;right:16px;display:flex;flex-direction:column;
  background:#fff;border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.18);overflow:hidden}
.ra-page .ra-tools button{width:46px;height:46px;display:grid;place-items:center;border:0;background:#fff;color:var(--ink)}
.ra-page .ra-tools button+button{border-top:1px solid var(--line)}
.ra-page .ra-tools button:hover:not(:disabled){background:var(--fog)}

/* Panel */
.ra-page .ra-panel{position:absolute;z-index:1000;top:16px;left:16px;bottom:16px;width:392px;max-width:calc(100% - 32px);
  display:flex;flex-direction:column;background:#fff;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.2);overflow:hidden}
.ra-page .ra-head{padding:20px 20px 12px}
.ra-page .ra-head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.ra-page .ra-title{font-size:24px;font-weight:800;letter-spacing:-.02em;line-height:1.15}
.ra-page .ra-status{margin-top:4px;font-size:14px;color:var(--mute);font-weight:500}
.ra-page .ra-round{flex:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--fog);color:var(--ink);display:grid;place-items:center}
.ra-page .ra-round:hover:not(:disabled){background:#E8E8E8}
.ra-page .ra-grab{display:none}
.ra-page .ra-body{flex:1;min-height:0;overflow-y:auto;padding:0 20px 20px;overscroll-behavior:contain}

/* Controls */
.ra-page .ra-options{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:4px 0}
.ra-page .ra-seg{display:inline-flex;background:var(--fog);border-radius:12px;padding:3px}
.ra-page .ra-seg button{min-height:38px;padding:0 12px;border:0;border-radius:10px;background:transparent;font-weight:700;font-size:13px;color:var(--mute)}
.ra-page .ra-seg button[aria-pressed="true"]{background:#fff;color:var(--ink);box-shadow:0 1px 4px rgba(0,0,0,.18)}
.ra-page .ra-switch{display:inline-flex;align-items:center;gap:10px;min-height:44px;font-weight:600;font-size:14px;cursor:pointer;position:relative}
.ra-page .ra-switch input{position:absolute;opacity:0;width:44px;height:26px;margin:0;cursor:pointer}
.ra-page .ra-switch-count{font-style:normal;min-width:22px;padding:1px 7px;border-radius:999px;background:var(--go-bg);color:var(--go);font-size:12px;font-weight:700;text-align:center}
.ra-page .ra-track{width:44px;height:26px;border-radius:999px;background:#C8C8C8;position:relative;transition:background .15s;flex:none}
.ra-page .ra-track::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .15s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.ra-page .ra-switch input:checked+.ra-track{background:var(--ink)}
.ra-page .ra-switch input:checked+.ra-track::after{transform:translateX(18px)}
.ra-page .ra-switch input:focus-visible+.ra-track{outline:3px solid var(--blue);outline-offset:2px}

/* Banners & empty */
.ra-page .ra-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:12px 14px;
  border-radius:14px;background:var(--danger-bg);color:var(--danger);font-size:14px;font-weight:500}
.ra-page .ra-banner button{flex:none;min-height:40px;padding:0 14px;border-radius:999px;border:0;background:var(--danger);color:#fff;font-weight:700}
.ra-page .ra-empty{margin-top:16px;padding:24px 16px;text-align:center;border-radius:16px;background:var(--fog)}
.ra-page .ra-empty p{margin:6px 0 14px;color:var(--mute);font-size:14px}

/* List */
.ra-page .ra-list{margin-top:8px}
.ra-page .ra-card{border-radius:16px;margin-top:4px}
.ra-page .ra-card.is-selected{background:var(--fog);box-shadow:inset 0 0 0 2px var(--ink)}
.ra-page .ra-card-main{width:100%;display:flex;align-items:center;gap:12px;padding:12px;border:0;background:transparent;
  text-align:left;color:inherit;border-radius:16px}
.ra-page .ra-card:not(.is-selected) .ra-card-main:hover{background:var(--fog)}
.ra-page .ra-avatar{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--ink);color:#fff}
.ra-page .ra-avatar.is-off{background:#8A8A8A}
.ra-page .ra-card-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.ra-page .ra-card-title{font-weight:700;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ra-page .ra-card-sub{font-size:13px;color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ra-page .ra-rating{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:600}
.ra-page .ra-rating svg{color:#E8A100}
.ra-page .ra-card-side{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.ra-page .ra-dist{font-weight:700;font-size:14px}
.ra-page .ra-pill{padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700}
.ra-page .ra-pill.is-on{background:var(--go-bg);color:var(--go)}
.ra-page .ra-pill.is-off{background:#E8E8E8;color:var(--mute)}
.ra-page .ra-card-more{padding:0 14px 14px 68px}
.ra-page .ra-card-more p{font-size:14px;color:var(--mute);margin-bottom:6px}
.ra-page .ra-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.ra-page .ra-btn{min-height:44px;padding:0 18px;border-radius:999px;border:0;background:#E8E8E8;color:var(--ink);
  font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;text-decoration:none}
.ra-page .ra-btn:hover{background:#DCDCDC}
.ra-page .ra-btn-primary{background:var(--ink);color:#fff}
.ra-page .ra-btn-primary:hover{background:#2B2B2B}

/* Loading skeleton */
.ra-page .ra-skel{display:flex;align-items:center;gap:12px;padding:12px}
.ra-page .ra-skel-dot{width:44px;height:44px;border-radius:50%;background:var(--fog)}
.ra-page .ra-skel-lines{flex:1;display:flex;flex-direction:column;gap:8px}
.ra-page .ra-skel-lines span{height:12px;border-radius:6px;background:var(--fog)}
.ra-page .ra-skel-lines span:last-child{width:55%}
.ra-page .ra-skel-dot, .ra-page .ra-skel-lines span{animation:ra-fade 1.2s ease-in-out infinite}
@keyframes ra-fade{50%{opacity:.5}}

/* Phones: results become a bottom sheet */
@media (max-width:767px){
  .ra-page{border-radius:0;border-left:0;border-right:0}
  .ra-page .ra-panel{top:auto;left:0;right:0;bottom:0;width:auto;max-width:none;max-height:52%;border-radius:22px 22px 0 0}
  .ra-page .ra-head{padding:0 16px 10px}
  .ra-page .ra-body{padding:0 16px 16px}
  .ra-page .ra-grab{display:flex;justify-content:center;align-items:center;width:100%;height:28px;border:0;background:transparent}
  .ra-page .ra-grab span{width:40px;height:5px;border-radius:3px;background:#C8C8C8}
  .ra-page .ra-title{font-size:21px}
  .ra-page .ra-panel.is-collapsed .ra-body{display:none}
  .ra-page .ra-card-more{padding-left:14px}
}

@media (prefers-reduced-motion:reduce){
  .ra-page .ra-panel *, .ra-page .ra-tools *, .ra-page .ra-me::before, .ra-page .ra-pin{animation:none!important;transition:none!important}
}
`;

export default LiveMap;