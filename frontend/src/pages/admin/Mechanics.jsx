import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { getMechanics } from "../../services/adminService";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../../styles/adminmechanics.css";

/* ============================================================
   ICONS
   ============================================================ */

const IconSearch = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
    </svg>
);
const IconWrench = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M14.7 6.3a4 4 0 0 0-5.6 4.6L3 17l4 4 6.1-6.1a4 4 0 0 0 4.6-5.6l-2.5 2.5-3-3 2.5-2.5Z" />
    </svg>
);

const AVAILABILITY_FILTERS = [
    { value: "ALL", label: "All" },
    { value: "AVAILABLE", label: "Available" },
    { value: "OFFLINE", label: "Offline" }
];

function AvailabilityPill({ available }) {
    return (
        <span className={`mech-pill ${available ? "mech-pill--available" : "mech-pill--offline"}`}>
            <span className="mech-pill__dot" />
            {available ? "Available" : "Offline"}
        </span>
    );
}

function Mechanics() {
    const [mechanics, setMechanics] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initialAvailability = searchParams.get("available") === "true" ? "AVAILABLE" : "ALL";
    const [availability, setAvailability] = useState(initialAvailability);

    const loadMechanics = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getMechanics(search);
            setMechanics(response.data);
        } catch (error) {
            console.error("Failed to load mechanics:", error);
            setError("We couldn't load mechanics. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMechanics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredMechanics = mechanics.filter((mechanic) => {
        if (availability === "AVAILABLE") return mechanic.available === true;
        if (availability === "OFFLINE") return mechanic.available === false;
        return true;
    });

    const resetFilters = () => {
        setSearch("");
        setAvailability("ALL");
        setTimeout(() => loadMechanics(), 0);
    };

    const goToMechanic = (id) => navigate(`/admin/mechanics/${id}`);

    const handleRowKeyDown = (event, id) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goToMechanic(id);
        }
    };

    return (
        <AdminLayout>
            <div className="mech">
                {/* HEADER */}
                <header className="mech-head">
                    <div>
                        <h1>Mechanics</h1>
                        <p>Manage registered RoadAid mechanics.</p>
                    </div>

                    <div className="mech-total">
                        <span className="mech-total__label">Total mechanics</span>
                        <span className="mech-total__value">{loading ? "–" : filteredMechanics.length}</span>
                    </div>
                </header>

                {error && (
                    <div className="mech-alert" role="alert">
                        <span>{error}</span>
                        <button type="button" onClick={loadMechanics}>
                            Try again
                        </button>
                    </div>
                )}

                {/* FILTERS */}
                <div className="mech-filters">
                    <div className="mech-field">
                        <label htmlFor="mech-search-input">Search</label>
                        <div className="mech-search-row">
                            <div className="mech-search">
                                <IconSearch />
                                <input
                                    id="mech-search-input"
                                    type="text"
                                    placeholder="Search mechanic or workshop..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") loadMechanics();
                                    }}
                                />
                            </div>
                            <button type="button" className="mech-search-btn" onClick={loadMechanics}>
                                Search
                            </button>
                        </div>
                    </div>

                    <div className="mech-field">
                        <span id="mech-availability-label">Availability</span>
                        <div className="mech-chips" role="group" aria-labelledby="mech-availability-label">
                            {AVAILABILITY_FILTERS.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    className="mech-chip"
                                    aria-pressed={availability === f.value}
                                    onClick={() => setAvailability(f.value)}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="button" className="mech-reset" onClick={resetFilters}>
                        Reset filters
                    </button>
                </div>

                {/* TABLE */}
                <div className="mech-table-card">
                    <div className="mech-scroll">
                        <table className="mech-table">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Mechanic</th>
                                <th>Workshop</th>
                                <th>Contact</th>
                                <th>Experience</th>
                                <th>Status</th>
                                <th className="is-end">Action</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loading ? (
                                Array.from({ length: 6 }, (_, i) => (
                                    <tr className="mech-skel-row" key={i}>
                                        {Array.from({ length: 7 }, (_, j) => (
                                            <td key={j}>
                                                <div className="mech-skel" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredMechanics.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="mech-empty">
                                            <IconWrench />
                                            <h3>No mechanics found</h3>
                                            <p>Try changing your search or availability filter.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredMechanics.map((mechanic) => (
                                    <tr
                                        key={mechanic.mechanicId}
                                        className="mech-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => goToMechanic(mechanic.mechanicId)}
                                        onKeyDown={(e) => handleRowKeyDown(e, mechanic.mechanicId)}
                                    >
                                        <td data-label="ID" className="mech-id">#{mechanic.mechanicId}</td>

                                        <td data-label="Mechanic" className="mech-person-cell">
                                            <div className="mech-person">
                                                <div className="mech-avatar">
                                                    {mechanic.fullName?.charAt(0)?.toUpperCase() || "?"}
                                                </div>
                                                <div>
                                                    <div className="mech-name">{mechanic.fullName}</div>
                                                    <div className="mech-subtext">RoadAid Mechanic</div>
                                                </div>
                                            </div>
                                        </td>

                                        <td data-label="Workshop">
                                            {mechanic.workshopName || <span className="mech-muted">Not provided</span>}
                                        </td>

                                        <td data-label="Contact">
                                            {mechanic.contactNumber || <span className="mech-muted">—</span>}
                                        </td>

                                        <td data-label="Experience">
                                            {mechanic.experienceYears != null ? (
                                                <strong>{mechanic.experienceYears} years</strong>
                                            ) : (
                                                <span className="mech-muted">—</span>
                                            )}
                                        </td>

                                        <td data-label="Status">
                                            <AvailabilityPill available={mechanic.available} />
                                        </td>

                                        <td data-label="Action" className="mech-action-cell">
                                            <button
                                                type="button"
                                                className="mech-view-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    goToMechanic(mechanic.mechanicId);
                                                }}
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export default Mechanics;