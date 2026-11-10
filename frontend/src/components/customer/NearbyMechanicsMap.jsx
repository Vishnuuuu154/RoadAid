import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../styles/Maps.css";

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const PATHS = {
    plus: ["M12 5v14", "M5 12h14"],
    minus: ["M5 12h14"],
    fit: ["M8 3H5a2 2 0 0 0-2 2v3", "M21 8V5a2 2 0 0 0-2-2h-3", "M3 16v3a2 2 0 0 0 2 2h3", "M16 21h3a2 2 0 0 0 2-2v-3"],
    phone: [
        "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
    ],
    directions: ["M3 11l19-9-9 19-2-8-8-2z"],
    pin: ["M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z", "M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]
};

function Icon({ name, size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            {PATHS[name].map((d) => <path key={d} d={d} />)}
        </svg>
    );
}

const isCoord = (v) => v != null && v !== "" && Number.isFinite(Number(v));

const initials = (name = "") =>
    name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "M";

function formatDistance(distance) {
    const value = Number(distance);
    if (!Number.isFinite(value)) return "–";
    if (value < 0.1) return "< 0.1 km";
    return `${value.toFixed(1)} km`;
}

const directionsUrl = (lat, lng) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

/* ---------- Marker icons (cached so Leaflet doesn't rebuild them) ---------- */

const userIcon = L.divIcon({
    className: "mp-pin-wrap",
    html: `<div class="mp-me"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const iconCache = new Map();

function mechanicIcon({ number, selected, offline }) {
    const key = `${number}-${selected}-${offline}`;
    if (iconCache.has(key)) return iconCache.get(key);

    const size = selected ? 48 : 40;
    const state = selected ? "selected" : offline ? "off" : "on";
    const icon = L.divIcon({
        className: "mp-pin-wrap",
        html: `<div class="mp-pin" data-state="${state}">${number}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
    iconCache.set(key, icon);
    return icon;
}

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

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */

function NearbyMechanicsMap({
                                latitude,
                                longitude,
                                mechanics = [],
                                selectedMechanicId,
                                onSelectMechanic,
                                height = 440
                            }) {
    const [map, setMap] = useState(null);

    const hasLocation = isCoord(latitude) && isCoord(longitude);
    const customerPosition = hasLocation ? [Number(latitude), Number(longitude)] : null;

    const validMechanics = useMemo(
        () =>
            (mechanics || [])
                .filter((m) => isCoord(m.latitude) && isCoord(m.longitude))
                .map((m) => ({ ...m, lat: Number(m.latitude), lng: Number(m.longitude) })),
        [mechanics]
    );

    // Only re-fit when the actual set of mechanics changes, not on every parent render,
    // so the map doesn't snap back while someone is panning around.
    const idsKey = validMechanics.map((m) => m.mechanicId).join(",");

    const fitAll = useCallback(() => {
        if (!map || !customerPosition) return;
        const points = [customerPosition, ...validMechanics.map((m) => [m.lat, m.lng])];
        if (points.length === 1) {
            map.setView(points[0], 14);
            return;
        }
        map.fitBounds(L.latLngBounds(points), { padding: [64, 64], maxZoom: 15 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, latitude, longitude, idsKey]);

    useEffect(() => {
        fitAll();
    }, [fitAll]);

    if (!hasLocation) {
        return (
            <div className="mp">
                <div className="mp-state">
                    <span className="mp-state-ico"><Icon name="pin" size={26} /></span>
                    <h3 className="mp-state-title">Location needed</h3>
                    <p className="mp-state-text">Allow location access to see mechanics near you on the map.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mp" style={{ "--mp-height": typeof height === "number" ? `${height}px` : height }}>
            <div className="mp-frame">
                <MapContainer
                    className="mp-map"
                    center={customerPosition}
                    zoom={14}
                    scrollWheelZoom
                    zoomControl={false}
                >
                    <MapBridge onReady={setMap} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxZoom={19}
                    />

                    {/* You */}
                    <Marker position={customerPosition} icon={userIcon} interactive={false} keyboard={false} zIndexOffset={500} />

                    {/* Mechanics */}
                    {validMechanics.map((mechanic, index) => {
                        const id = mechanic.mechanicId;
                        const isSelected = String(id) === String(selectedMechanicId);
                        const rating = Number(mechanic.averageRating);

                        return (
                            <Marker
                                key={id}
                                position={[mechanic.lat, mechanic.lng]}
                                icon={mechanicIcon({
                                    number: index + 1,
                                    selected: isSelected,
                                    offline: mechanic.available === false
                                })}
                                zIndexOffset={isSelected ? 1000 : 700}
                                title={mechanic.workshopName || mechanic.name}
                                eventHandlers={{ click: () => onSelectMechanic?.(mechanic) }}
                            >
                                <Popup className="mp-popup" minWidth={250} maxWidth={290}>
                                    <div className="mp-pop">
                                        <div className="mp-pop-head">
                                            <span className="mp-pop-avatar">{initials(mechanic.name)}</span>
                                            <div>
                                                <p className="mp-pop-name">{mechanic.name || "Mechanic"}</p>
                                                {mechanic.workshopName && <p className="mp-pop-sub">{mechanic.workshopName}</p>}
                                            </div>
                                        </div>

                                        <div className="mp-pop-stats">
                                            <div className="mp-pop-stat">
                                                <strong>{formatDistance(mechanic.distanceKm)}</strong>
                                                <span>Away</span>
                                            </div>
                                            <div className="mp-pop-stat">
                                                <strong>{rating > 0 ? `★ ${rating.toFixed(1)}` : "New"}</strong>
                                                <span>Rating</span>
                                            </div>
                                            <div className="mp-pop-stat">
                                                <strong>{mechanic.experienceYears ?? 0} yr</strong>
                                                <span>Experience</span>
                                            </div>
                                        </div>

                                        {mechanic.contactNumber && (
                                            <a className="mp-pop-phone" href={`tel:${mechanic.contactNumber}`}>
                                                <Icon name="phone" size={16} /> {mechanic.contactNumber}
                                            </a>
                                        )}

                                        <div className="mp-pop-actions">
                                            <button
                                                type="button"
                                                className={`mp-btn mp-btn-block ${isSelected ? "mp-btn-success" : "mp-btn-dark"}`}
                                                onClick={() => onSelectMechanic?.(mechanic)}
                                            >
                                                {isSelected ? "✓ Selected" : "Select mechanic"}
                                            </button>
                                            <a
                                                className="mp-btn"
                                                href={directionsUrl(mechanic.lat, mechanic.lng)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Get directions"
                                                title="Get directions"
                                            >
                                                <Icon name="directions" size={16} />
                                            </a>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>

                <span className="mp-pill">
                    {validMechanics.length === 0
                        ? "No mechanics nearby"
                        : `${validMechanics.length} mechanic${validMechanics.length === 1 ? "" : "s"} nearby`}
                </span>

                <div className="mp-tools">
                    <button type="button" onClick={() => map?.zoomIn()} aria-label="Zoom in"><Icon name="plus" /></button>
                    <button type="button" onClick={() => map?.zoomOut()} aria-label="Zoom out"><Icon name="minus" /></button>
                    <button type="button" onClick={fitAll} aria-label="Show you and all mechanics" title="Show everything"><Icon name="fit" /></button>
                </div>

                <div className="mp-legend" aria-hidden="true">
                    <span><i style={{ background: "#3b5bfd" }} /> You</span>
                    <span><i style={{ background: "#0d1321" }} /> Mechanic</span>
                    <span><i style={{ background: "linear-gradient(135deg,#7a5cff,#3b5bfd)" }} /> Selected</span>
                </div>
            </div>
        </div>
    );
}

export default NearbyMechanicsMap;