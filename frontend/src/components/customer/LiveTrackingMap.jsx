import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/Maps.css";

import { getLiveTracking } from "../../services/customerService";

/* ================================================================== */
/* Constants + helpers                                                 */
/* ================================================================== */

const ROUTE_REFRESH_MS = 30000;
const TICK_MS = 5000;

const PATHS = {
    plus: ["M12 5v14", "M5 12h14"],
    minus: ["M5 12h14"],
    fit: ["M8 3H5a2 2 0 0 0-2 2v3", "M21 8V5a2 2 0 0 0-2-2h-3", "M3 16v3a2 2 0 0 0 2 2h3", "M16 21h3a2 2 0 0 0 2-2v-3"],
    phone: [
        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
    ],
    directions: ["M3 11l19-9-9 19-2-8-8-2z"],
    pin: ["M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z", "M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
    wrench: [
        "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
    ],
    refresh: ["M21 12a9 9 0 1 1-3-6.7L21 8", "M21 3v5h-5"],
    warn: ["M12 9v4", "M12 17h.01", "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"]
};

const svgString = (name, size) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]
        .map((d) => `<path d="${d}"/>`)
        .join("")}</svg>`;

function Icon({ name, size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {PATHS[name].map((d) => <path key={d} d={d} />)}
        </svg>
    );
}

const isCoord = (v) => v != null && v !== "" && Number.isFinite(Number(v));

const initials = (name = "") =>
    name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

const customerIcon = L.divIcon({
    className: "mp-pin-wrap",
    html: `<div class="mp-pin" data-kind="customer">${svgString("pin", 20)}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -24]
});

const mechanicIcon = L.divIcon({
    className: "mp-pin-wrap",
    html: `<div class="mp-pin" data-live="true">${svgString("wrench", 20)}</div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -26]
});

/* Keeps Leaflet's size right when the container resizes and hands the map to the page. */
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

const formatDistance = (meters) => {
    if (meters == null || !Number.isFinite(meters)) return "—";
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
};

const formatEta = (seconds) => {
    if (seconds == null || !Number.isFinite(seconds)) return "—";
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

const formatAgo = (seconds) => {
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ago`;
};

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */

export default function LiveTrackingMap({
                                            requestId,
                                            refreshInterval = 10000,
                                            viewerRole = "customer",
                                            customerName = "Customer"
                                        }) {
    const [tracking, setTracking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [route, setRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState("");
    const [now, setNow] = useState(() => Date.now());
    const [map, setMap] = useState(null);
    const [follow, setFollow] = useState(false);

    const trackingRef = useRef(null);
    const fittedRef = useRef(false);
    const isMechanic = viewerRole === "mechanic";

    /* ---------- Live position ---------- */

    const loadTracking = useCallback(
        async (showLoading = false) => {
            try {
                if (showLoading) setLoading(true);
                const response = await getLiveTracking(requestId);
                trackingRef.current = response.data;
                setTracking(response.data);
                setError("");
            } catch (err) {
                console.error("Failed to load live tracking:", err);
                // A failed background refresh shouldn't wipe a map that is already showing.
                if (showLoading || !trackingRef.current) {
                    setError(err.response?.data?.message || err.response?.data || "Unable to load live tracking.");
                }
            } finally {
                if (showLoading) setLoading(false);
            }
        },
        [requestId]
    );

    useEffect(() => {
        if (!requestId) {
            setError("Request ID is missing.");
            setLoading(false);
            return undefined;
        }

        fittedRef.current = false;
        loadTracking(true);

        const id = setInterval(() => !document.hidden && loadTracking(false), refreshInterval);
        return () => clearInterval(id);
    }, [requestId, refreshInterval, loadTracking]);

    /* Tick so "Updated 12 sec ago" and the Live badge keep moving between refreshes. */
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, []);

    /* ---------- Road route + ETA ---------- */

    const hasCoords =
        isCoord(tracking?.customerLatitude) &&
        isCoord(tracking?.customerLongitude) &&
        isCoord(tracking?.mechanicLatitude) &&
        isCoord(tracking?.mechanicLongitude);

    const loadRoute = useCallback(async () => {
        const data = trackingRef.current;
        if (
            !isCoord(data?.customerLatitude) ||
            !isCoord(data?.customerLongitude) ||
            !isCoord(data?.mechanicLatitude) ||
            !isCoord(data?.mechanicLongitude)
        ) {
            return;
        }

        try {
            setRouteLoading(true);
            setRouteError("");

            // The mechanic is the one travelling, so the route always runs mechanic -> customer.
            const from = `${data.mechanicLongitude},${data.mechanicLatitude}`;
            const to = `${data.customerLongitude},${data.customerLatitude}`;

            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${from};${to}?overview=full&geometries=geojson`
            );
            if (!response.ok) throw new Error("Routing service is unavailable.");

            const result = await response.json();
            if (result.code !== "Ok" || !result.routes?.length) throw new Error("No road route was found.");

            const best = result.routes[0];
            setRoute({
                coordinates: best.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
                distance: best.distance,
                duration: best.duration
            });
        } catch (err) {
            console.error("Failed to calculate road route:", err);
            setRoute(null);
            setRouteError(err.message || "Unable to calculate route.");
        } finally {
            setRouteLoading(false);
        }
    }, []);

    // Calculate as soon as both positions are known, then refresh on a steady timer.
    // (The old version only recalculated when GPS changed, so a skipped refresh was never retried.)
    useEffect(() => {
        if (!hasCoords) return undefined;
        loadRoute();
        const id = setInterval(() => !document.hidden && loadRoute(), ROUTE_REFRESH_MS);
        return () => clearInterval(id);
    }, [hasCoords, loadRoute]);

    /* ---------- Map framing ---------- */

    const fitRoute = useCallback(() => {
        const data = trackingRef.current;
        if (!map || !data) return;
        const points = [
            [Number(data.customerLatitude), Number(data.customerLongitude)],
            [Number(data.mechanicLatitude), Number(data.mechanicLongitude)]
        ];
        map.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom: 16, animate: true });
    }, [map]);

    // Fit once when the map first has both points, then leave the camera alone so people can pan.
    // Turning "Follow" on re-fits on every update.
    useEffect(() => {
        if (!map || !hasCoords) return;
        if (!fittedRef.current || follow) {
            fittedRef.current = true;
            fitRoute();
        }
    }, [map, hasCoords, follow, fitRoute, tracking?.mechanicLatitude, tracking?.mechanicLongitude]);

    /* ---------- Freshness ---------- */

    const freshness = useMemo(() => {
        if (!tracking?.locationUpdatedAt) {
            return { level: "none", label: "No location", ago: "Location unavailable" };
        }
        const seconds = Math.max(0, Math.floor((now - new Date(tracking.locationUpdatedAt).getTime()) / 1000));
        const ago = `Updated ${formatAgo(seconds)}`;
        if (seconds <= 30) return { level: "live", label: "Live", ago };
        if (seconds <= 120) return { level: "recent", label: "Recent", ago };
        return { level: "stale", label: "May be outdated", ago };
    }, [tracking, now]);

    /* ================================================================ */
    /* States                                                            */
    /* ================================================================ */

    if (loading) {
        return (
            <div className="mp" aria-busy="true" aria-label="Loading live tracking">
                <div className="mp-skel" style={{ height: 88 }} />
                <div className="mp-skel" style={{ height: 92 }} />
                <div className="mp-skel" style={{ height: 380 }} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="mp">
                <div className="mp-state">
                    <span className="mp-state-ico"><Icon name="warn" size={26} /></span>
                    <h3 className="mp-state-title">Live tracking unavailable</h3>
                    <p className="mp-state-text">{String(error)}</p>
                    <button type="button" className="mp-btn mp-btn-dark" onClick={() => loadTracking(true)}>
                        <Icon name="refresh" size={16} /> Try again
                    </button>
                </div>
            </div>
        );
    }

    if (!tracking) {
        return (
            <div className="mp">
                <div className="mp-state">
                    <span className="mp-state-ico"><Icon name="pin" size={26} /></span>
                    <h3 className="mp-state-title">Tracking isn't available yet</h3>
                    <p className="mp-state-text">Tracking information will appear here once the journey starts.</p>
                </div>
            </div>
        );
    }

    if (!hasCoords) {
        return (
            <div className="mp">
                <div className="mp-state">
                    <span className="mp-state-ico"><Icon name="pin" size={26} /></span>
                    <h3 className="mp-state-title">Waiting for the mechanic's location</h3>
                    <p className="mp-state-text">The mechanic's GPS location isn't available yet. This page updates by itself.</p>
                </div>
            </div>
        );
    }

    /* ================================================================ */
    /* Live view                                                         */
    /* ================================================================ */

    const customerPos = [Number(tracking.customerLatitude), Number(tracking.customerLongitude)];
    const mechanicPos = [Number(tracking.mechanicLatitude), Number(tracking.mechanicLongitude)];

    const personName = isMechanic ? customerName || "Customer" : tracking.mechanicName || "Mechanic";
    const personSub = isMechanic ? "Customer location" : tracking.workshopName || "Service provider";
    const phone = isMechanic ? null : tracking.contactNumber;

    const mapsHref = isMechanic
        ? `https://www.google.com/maps/dir/?api=1&destination=${customerPos[0]},${customerPos[1]}&travelmode=driving`
        : `https://www.google.com/maps/search/?api=1&query=${mechanicPos[0]},${mechanicPos[1]}`;

    return (
        <div className="mp">
            {/* Who + freshness */}
            <section className="mp-card" aria-label="Tracking status">
                <div className="lt-who">
                    <span className="lt-avatar" aria-hidden="true">{initials(personName)}</span>
                    <div className="lt-who-text">
                        <p className="lt-name">{personName}</p>
                        <p className="lt-sub">{personSub}</p>
                    </div>
                    <span className="lt-live" data-level={freshness.level}>
                        <i aria-hidden="true" /> {freshness.label}
                    </span>
                </div>
                <p className="lt-updated">{freshness.ago}</p>
            </section>

            {/* ETA */}
            <section className="lt-eta" aria-live="polite" aria-label="Estimated arrival">
                <div>
                    <span className="lt-eta-label">{isMechanic ? "Time to customer" : "Arriving in"}</span>
                    <strong className="lt-eta-value">{formatEta(route?.duration)}</strong>
                    {routeLoading && <p className="lt-eta-updating">Updating route…</p>}
                </div>
                <div>
                    <span className="lt-eta-label">Road distance</span>
                    <strong className="lt-eta-value is-small">{formatDistance(route?.distance)}</strong>
                </div>
            </section>

            {routeError && (
                <div className="lt-warn" role="status">
                    <Icon name="warn" size={16} />
                    <span>{routeError} Showing live locations without a route.</span>
                </div>
            )}

            {/* Map */}
            <div className="mp-frame" style={{ "--mp-height": "430px" }}>
                <MapContainer className="mp-map" center={customerPos} zoom={14} scrollWheelZoom zoomControl={false}>
                    <MapBridge onReady={setMap} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={19}
                    />

                    {route?.coordinates?.length > 1 && (
                        <>
                            <Polyline positions={route.coordinates} pathOptions={{ color: "#ffffff", weight: 11, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
                            <Polyline positions={route.coordinates} pathOptions={{ color: "#3b5bfd", weight: 6, opacity: 1, lineCap: "round", lineJoin: "round" }} />
                        </>
                    )}

                    <Marker position={customerPos} icon={customerIcon} zIndexOffset={500}>
                        <Popup className="mp-popup" minWidth={200}>
                            <div className="mp-pop">
                                <p className="mp-pop-name">{isMechanic ? personName : "Your location"}</p>
                                <p className="mp-pop-sub">Assistance location</p>
                            </div>
                        </Popup>
                    </Marker>

                    <Marker position={mechanicPos} icon={mechanicIcon} zIndexOffset={900}>
                        <Popup className="mp-popup" minWidth={220}>
                            <div className="mp-pop">
                                <p className="mp-pop-name">{isMechanic ? "Your location" : tracking.mechanicName || "Mechanic"}</p>
                                {!isMechanic && tracking.workshopName && <p className="mp-pop-sub">{tracking.workshopName}</p>}
                                {!isMechanic && tracking.contactNumber && (
                                    <a className="mp-pop-phone" href={`tel:${tracking.contactNumber}`}>
                                        <Icon name="phone" size={16} /> {tracking.contactNumber}
                                    </a>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                </MapContainer>

                <button type="button" className="mp-pill" aria-pressed={follow} onClick={() => setFollow((f) => !f)}>
                    <Icon name="directions" size={14} /> {follow ? "Following" : "Follow"}
                </button>

                <div className="mp-tools">
                    <button type="button" onClick={() => map?.zoomIn()} aria-label="Zoom in"><Icon name="plus" /></button>
                    <button type="button" onClick={() => map?.zoomOut()} aria-label="Zoom out"><Icon name="minus" /></button>
                    <button type="button" onClick={fitRoute} aria-label="Show the whole route" title="Show the whole route"><Icon name="fit" /></button>
                </div>

                <div className="mp-legend" aria-hidden="true">
                    <span><i style={{ background: "#3b5bfd" }} /> {isMechanic ? "Customer" : "You"}</span>
                    <span><i style={{ background: "#0d1321" }} /> {isMechanic ? "You" : "Mechanic"}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="lt-actions">
                {phone && (
                    <a className="mp-btn mp-btn-dark mp-btn-block" href={`tel:${phone}`}>
                        <Icon name="phone" size={16} /> Call mechanic
                    </a>
                )}
                <a className={`mp-btn mp-btn-block${isMechanic ? " mp-btn-dark" : ""}`} href={mapsHref} target="_blank" rel="noopener noreferrer">
                    <Icon name="directions" size={16} /> {isMechanic ? "Navigate in Google Maps" : "Open in Google Maps"}
                </a>
            </div>

            <p className="lt-foot">
                Location updates every {Math.round(refreshInterval / 1000)} seconds · Route and ETA refresh every 30 seconds
            </p>
        </div>
    );
}