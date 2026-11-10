import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const initialFormData = {
    registrationNumber: "",
    vehicleType: "",
    brand: "",
    model: "",
    fuelType: "",
    manufacturingYear: "",
};

const vehicleTypes = [
    { value: "CAR", label: "Cars", single: "Car" },
    { value: "BIKE", label: "Bikes", single: "Bike" },
    { value: "SCOOTER", label: "Scooters", single: "Scooter" },
    { value: "TRUCK", label: "Trucks", single: "Truck" },
    { value: "VAN", label: "Vans", single: "Van" },
    { value: "OTHER", label: "Other", single: "Vehicle" },
];

const fuelTypes = [
    { value: "PETROL", label: "Petrol" },
    { value: "DIESEL", label: "Diesel" },
    { value: "ELECTRIC", label: "Electric" },
    { value: "HYBRID", label: "Hybrid" },
    { value: "CNG", label: "CNG" },
];

const sortOptions = [
    { value: "brandAsc", label: "Brand A–Z" },
    { value: "brandDesc", label: "Brand Z–A" },
    { value: "yearNewest", label: "Newest first" },
    { value: "yearOldest", label: "Oldest first" },
];

const currentYear = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const typeInfo = (value) =>
    vehicleTypes.find((t) => t.value === value) || vehicleTypes[5];

const fuelLabel = (value) =>
    fuelTypes.find((f) => f.value === value)?.label || value || "Not set";

const vehicleIcon = (type) => {
    switch (type) {
        case "BIKE":
        case "SCOOTER":
            return "bi-bicycle";
        case "TRUCK":
            return "bi-truck";
        case "VAN":
            return "bi-truck-front";
        default:
            return "bi-car-front-fill";
    }
};

const vehicleAge = (year) => {
    if (!year) return null;
    const age = currentYear - Number(year);
    return age >= 0 ? age : null;
};

const ageText = (age) =>
    age === null ? "—" : age === 0 ? "New" : `${age} ${age === 1 ? "yr" : "yrs"}`;

const vehicleName = (v) =>
    `${v.brand || "Unknown brand"} ${v.model || ""}`.trim();

const sortVehicles = (list, order) =>
    [...list].sort((a, b) => {
        const nameA = `${a.brand} ${a.model}`;
        const nameB = `${b.brand} ${b.model}`;
        const yearA = Number(a.manufacturingYear || 0);
        const yearB = Number(b.manufacturingYear || 0);
        if (order === "brandDesc") return nameB.localeCompare(nameA);
        if (order === "yearNewest") return yearB - yearA;
        if (order === "yearOldest") return yearA - yearB;
        return nameA.localeCompare(nameB);
    });

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Modal({ titleId, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose]);

    return (
        <div
            className="rg-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="rg-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                {children}
            </div>
        </div>
    );
}

function Field({ id, label, hint, children }) {
    return (
        <div className="rg-field">
            <label htmlFor={id}>{label}</label>
            {children}
            {hint && <small>{hint}</small>}
        </div>
    );
}

function VehicleForm({ vehicle, saving, onSave, onClose }) {
    const [data, setData] = useState(
        vehicle
            ? {
                registrationNumber: vehicle.registrationNumber || "",
                vehicleType: vehicle.vehicleType || "",
                brand: vehicle.brand || "",
                model: vehicle.model || "",
                fuelType: vehicle.fuelType || "",
                manufacturingYear: vehicle.manufacturingYear || "",
            }
            : initialFormData
    );
    const [error, setError] = useState("");
    const firstField = useRef(null);

    useEffect(() => {
        firstField.current?.focus();
    }, []);

    const change = (e) => {
        const { name, value } = e.target;
        setData((prev) => ({
            ...prev,
            [name]: name === "registrationNumber" ? value.toUpperCase() : value,
        }));
        if (error) setError("");
    };

    const submit = async (e) => {
        e.preventDefault();
        const message = await onSave(data);
        if (message) setError(message);
    };

    return (
        <form onSubmit={submit}>
            <div className="rg-modal-head">
                <div>
                    <h2 id="vehicle-form-title">
                        {vehicle ? "Edit vehicle" : "Add a vehicle"}
                    </h2>
                    <p>Accurate details help us send the right help.</p>
                </div>
                <button
                    type="button"
                    className="rg-icon-btn"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <i className="bi bi-x-lg" />
                </button>
            </div>

            <div className="rg-modal-body">
                {error && (
                    <div className="rg-alert" role="alert">
                        <i className="bi bi-exclamation-circle-fill" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="rg-grid-2">
                    <Field id="registrationNumber" label="Registration number">
                        <input
                            ref={firstField}
                            id="registrationNumber"
                            name="registrationNumber"
                            value={data.registrationNumber}
                            onChange={change}
                            placeholder="KL 01 AB 1234"
                            maxLength={20}
                            autoComplete="off"
                            required
                        />
                    </Field>

                    <Field id="vehicleType" label="Vehicle type">
                        <select
                            id="vehicleType"
                            name="vehicleType"
                            value={data.vehicleType}
                            onChange={change}
                            required
                        >
                            <option value="">Select type</option>
                            {vehicleTypes.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.single}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field id="brand" label="Brand">
                        <input
                            id="brand"
                            name="brand"
                            value={data.brand}
                            onChange={change}
                            placeholder="Toyota"
                            maxLength={100}
                            required
                        />
                    </Field>

                    <Field id="model" label="Model">
                        <input
                            id="model"
                            name="model"
                            value={data.model}
                            onChange={change}
                            placeholder="Innova"
                            maxLength={100}
                            required
                        />
                    </Field>

                    <Field id="fuelType" label="Fuel type">
                        <select
                            id="fuelType"
                            name="fuelType"
                            value={data.fuelType}
                            onChange={change}
                            required
                        >
                            <option value="">Select fuel</option>
                            {fuelTypes.map((f) => (
                                <option key={f.value} value={f.value}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field
                        id="manufacturingYear"
                        label="Manufacturing year"
                        hint={`Between 1900 and ${currentYear}`}
                    >
                        <input
                            id="manufacturingYear"
                            name="manufacturingYear"
                            type="number"
                            inputMode="numeric"
                            min="1900"
                            max={currentYear}
                            value={data.manufacturingYear}
                            onChange={change}
                            placeholder="2022"
                            required
                        />
                    </Field>
                </div>
            </div>

            <div className="rg-modal-foot">
                <button
                    type="button"
                    className="rg-btn rg-btn-light"
                    onClick={onClose}
                    disabled={saving}
                >
                    Cancel
                </button>
                <button type="submit" className="rg-btn rg-btn-dark" disabled={saving}>
                    {saving ? (
                        <>
                            <span className="rg-spinner" aria-hidden="true" /> Saving…
                        </>
                    ) : vehicle ? (
                        "Save changes"
                    ) : (
                        "Add vehicle"
                    )}
                </button>
            </div>
        </form>
    );
}

function ConfirmDelete({ vehicle, busy, onCancel, onConfirm }) {
    return (
        <Modal titleId="delete-title" onClose={busy ? () => {} : onCancel}>
            <div className="rg-modal-body rg-confirm">
                <div className="rg-confirm-icon">
                    <i className="bi bi-trash3" />
                </div>
                <h2 id="delete-title">Delete {vehicleName(vehicle)}?</h2>
                <p>
                    <strong>{vehicle.registrationNumber}</strong> will be removed from
                    your garage. This can’t be undone.
                </p>
            </div>
            <div className="rg-modal-foot">
                <button
                    type="button"
                    className="rg-btn rg-btn-light"
                    onClick={onCancel}
                    disabled={busy}
                >
                    Keep vehicle
                </button>
                <button
                    type="button"
                    className="rg-btn rg-btn-danger"
                    onClick={onConfirm}
                    disabled={busy}
                >
                    {busy ? (
                        <>
                            <span className="rg-spinner" aria-hidden="true" /> Deleting…
                        </>
                    ) : (
                        "Delete vehicle"
                    )}
                </button>
            </div>
        </Modal>
    );
}

function VehicleCard({ vehicle, onEdit, onDelete, onCopy }) {
    const type = typeInfo(vehicle.vehicleType);
    const age = vehicleAge(vehicle.manufacturingYear);
    const isEV = vehicle.fuelType === "ELECTRIC";

    return (
        <article className="rg-card">
            <div className="rg-card-head">
        <span className="rg-vicon" aria-hidden="true">
          <i className={`bi ${vehicleIcon(vehicle.vehicleType)}`} />
        </span>
                <div className="rg-card-title">
                    <h3>{vehicleName(vehicle)}</h3>
                    <p>
                        {type.single} · {fuelLabel(vehicle.fuelType)}
                    </p>
                </div>
            </div>

            <button
                type="button"
                className={`rg-plate ${isEV ? "ev" : ""}`}
                onClick={() => onCopy(vehicle.registrationNumber)}
                title="Copy registration number"
                aria-label={`Registration ${vehicle.registrationNumber}. Press to copy.`}
            >
                <span>{vehicle.registrationNumber || "NO REGISTRATION"}</span>
                <i className="bi bi-copy" aria-hidden="true" />
            </button>

            <dl className="rg-specs">
                <div>
                    <dt>Fuel</dt>
                    <dd>{fuelLabel(vehicle.fuelType)}</dd>
                </div>
                <div>
                    <dt>Year</dt>
                    <dd>{vehicle.manufacturingYear || "—"}</dd>
                </div>
                <div>
                    <dt>Age</dt>
                    <dd>{ageText(age)}</dd>
                </div>
            </dl>

            <div className="rg-card-foot">
        <span className="rg-ready">
          <i /> Ready for assistance
        </span>
                <div className="rg-actions">
                    <button
                        type="button"
                        className="rg-icon-btn"
                        onClick={() => onEdit(vehicle)}
                        aria-label={`Edit ${vehicleName(vehicle)}`}
                        title="Edit"
                    >
                        <i className="bi bi-pencil" />
                    </button>
                    <button
                        type="button"
                        className="rg-icon-btn danger"
                        onClick={() => onDelete(vehicle)}
                        aria-label={`Delete ${vehicleName(vehicle)}`}
                        title="Delete"
                    >
                        <i className="bi bi-trash3" />
                    </button>
                </div>
            </div>
        </article>
    );
}

function EmptyState({ icon, title, text, actionLabel, onAction, tone }) {
    return (
        <div className={`rg-empty ${tone || ""}`}>
            <div className="rg-empty-icon">
                <i className={`bi ${icon}`} />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <button type="button" className="rg-btn rg-btn-dark" onClick={onAction}>
                {actionLabel}
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Vehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [vehicleFilter, setVehicleFilter] = useState("ALL");
    const [sortOrder, setSortOrder] = useState("brandAsc");

    const showToast = useCallback((message, tone = "ok") => {
        setToast({ message, tone });
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(timer);
    }, [toast]);

    const loadVehicles = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError("");
            const response = await api.get("/vehicles/my");
            setVehicles(Array.isArray(response.data) ? response.data : []);
        } catch (requestError) {
            console.error("Failed to load vehicles:", requestError);
            setError(
                requestError.response?.data?.message ||
                "Failed to load vehicles. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVehicles();
    }, [loadVehicles]);

    const closeForm = useCallback(() => {
        setFormOpen(false);
        setEditing(null);
    }, []);

    const openAdd = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (vehicle) => {
        setEditing(vehicle);
        setFormOpen(true);
    };

    // Returns an error message string, or "" on success.
    const saveVehicle = async (data) => {
        const year = Number(data.manufacturingYear);
        if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
            return `Manufacturing year must be between 1900 and ${currentYear}.`;
        }

        try {
            setSaving(true);
            const payload = {
                ...data,
                registrationNumber: data.registrationNumber.trim().toUpperCase(),
                brand: data.brand.trim(),
                model: data.model.trim(),
                manufacturingYear: String(year),
            };

            if (editing) {
                await api.put(`/vehicles/${editing.id}`, payload);
            } else {
                await api.post("/vehicles", payload);
            }

            await loadVehicles(true);
            showToast(editing ? "Vehicle updated" : "Vehicle added");
            closeForm();
            return "";
        } catch (requestError) {
            console.error("Failed to save vehicle:", requestError);
            return (
                requestError.response?.data?.message ||
                "Failed to save vehicle. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        try {
            setDeleting(true);
            await api.delete(`/vehicles/${pendingDelete.id}`);
            setVehicles((prev) => prev.filter((v) => v.id !== pendingDelete.id));
            setPendingDelete(null);
            showToast("Vehicle deleted");
        } catch (requestError) {
            console.error("Failed to delete vehicle:", requestError);
            setPendingDelete(null);
            showToast(
                requestError.response?.data?.message ||
                "Failed to delete vehicle. Please try again.",
                "error"
            );
        } finally {
            setDeleting(false);
        }
    };

    const copyRegistration = async (value) => {
        try {
            await navigator.clipboard.writeText(value || "");
            showToast(`Copied ${value}`);
        } catch {
            showToast("Couldn’t copy. Select the text instead.", "error");
        }
    };

    const stats = useMemo(
        () => [
            { label: "Total", value: vehicles.length },
            {
                label: "Cars",
                value: vehicles.filter((v) => v.vehicleType === "CAR").length,
            },
            {
                label: "Two-wheelers",
                value: vehicles.filter((v) =>
                    ["BIKE", "SCOOTER"].includes(v.vehicleType)
                ).length,
            },
            {
                label: "Electric",
                value: vehicles.filter((v) => v.fuelType === "ELECTRIC").length,
            },
        ],
        [vehicles]
    );

    const typeCounts = useMemo(() => {
        const counts = {};
        vehicles.forEach((v) => {
            counts[v.vehicleType] = (counts[v.vehicleType] || 0) + 1;
        });
        return counts;
    }, [vehicles]);

    const filteredVehicles = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        const matches = vehicles.filter((v) => {
            const text = [
                v.brand,
                v.model,
                v.registrationNumber,
                v.vehicleType,
                v.fuelType,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return (
                text.includes(q) &&
                (vehicleFilter === "ALL" || v.vehicleType === vehicleFilter)
            );
        });
        return sortVehicles(matches, sortOrder);
    }, [vehicles, searchTerm, vehicleFilter, sortOrder]);

    const clearFilters = () => {
        setSearchTerm("");
        setVehicleFilter("ALL");
        setSortOrder("brandAsc");
    };

    const hasVehicles = !loading && !error && vehicles.length > 0;
    const filtersActive = searchTerm || vehicleFilter !== "ALL";

    return (
        <CustomerLayout>
            <style>{css}</style>

            <div className="rg">
                <div className="rg-wrap">
                    {/* Header */}
                    <header className="rg-header">
                        <div>
                            <h1>My garage</h1>
                            <p>
                                Save your vehicles once. Requesting roadside help gets faster.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="rg-btn rg-btn-dark rg-btn-lg"
                            onClick={openAdd}
                        >
                            <i className="bi bi-plus-lg" /> Add vehicle
                        </button>
                    </header>

                    {/* Stats */}
                    {hasVehicles && (
                        <section className="rg-stats" aria-label="Garage summary">
                            {stats.map((s) => (
                                <div key={s.label}>
                                    <strong>{s.value}</strong>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Toolbar */}
                    {hasVehicles && (
                        <section className="rg-toolbar" aria-label="Find vehicles">
                            <div className="rg-search">
                                <i className="bi bi-search" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search brand, model or registration"
                                    aria-label="Search vehicles"
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

                            <label className="rg-sort">
                                <span>Sort</span>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    {sortOptions.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="rg-chips" role="group" aria-label="Vehicle type">
                                <button
                                    type="button"
                                    className={vehicleFilter === "ALL" ? "on" : ""}
                                    aria-pressed={vehicleFilter === "ALL"}
                                    onClick={() => setVehicleFilter("ALL")}
                                >
                                    All <em>{vehicles.length}</em>
                                </button>
                                {vehicleTypes
                                    .filter((t) => typeCounts[t.value])
                                    .map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            className={vehicleFilter === t.value ? "on" : ""}
                                            aria-pressed={vehicleFilter === t.value}
                                            onClick={() => setVehicleFilter(t.value)}
                                        >
                                            {t.label} <em>{typeCounts[t.value]}</em>
                                        </button>
                                    ))}
                            </div>
                        </section>
                    )}

                    {/* States */}
                    {loading && (
                        <div className="rg-cards" aria-busy="true" aria-label="Loading">
                            {[1, 2, 3].map((n) => (
                                <div className="rg-card rg-skel" key={n}>
                                    <i style={{ width: "60%", height: 22 }} />
                                    <i style={{ width: "35%", height: 14 }} />
                                    <i style={{ width: "100%", height: 52 }} />
                                    <i style={{ width: "100%", height: 40 }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && error && (
                        <EmptyState
                            tone="error"
                            icon="bi-wifi-off"
                            title="Couldn’t load your garage"
                            text={error}
                            actionLabel="Try again"
                            onAction={() => loadVehicles()}
                        />
                    )}

                    {!loading && !error && vehicles.length === 0 && (
                        <EmptyState
                            icon="bi-car-front-fill"
                            title="Your garage is empty"
                            text="Add a vehicle to have its details ready the next time you need roadside help."
                            actionLabel="Add your first vehicle"
                            onAction={openAdd}
                        />
                    )}

                    {hasVehicles && filteredVehicles.length === 0 && (
                        <EmptyState
                            icon="bi-search"
                            title="No vehicles match"
                            text="Try a different search or clear your filters."
                            actionLabel="Clear filters"
                            onAction={clearFilters}
                        />
                    )}

                    {/* Vehicle list */}
                    {hasVehicles && filteredVehicles.length > 0 && (
                        <>
                            {filtersActive && (
                                <p className="rg-count" role="status">
                                    Showing {filteredVehicles.length} of {vehicles.length}
                                </p>
                            )}
                            <div className="rg-cards">
                                {filteredVehicles.map((vehicle) => (
                                    <VehicleCard
                                        key={vehicle.id}
                                        vehicle={vehicle}
                                        onEdit={openEdit}
                                        onDelete={setPendingDelete}
                                        onCopy={copyRegistration}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {formOpen && (
                <Modal titleId="vehicle-form-title" onClose={saving ? () => {} : closeForm}>
                    <VehicleForm
                        vehicle={editing}
                        saving={saving}
                        onSave={saveVehicle}
                        onClose={closeForm}
                    />
                </Modal>
            )}

            {pendingDelete && (
                <ConfirmDelete
                    vehicle={pendingDelete}
                    busy={deleting}
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={confirmDelete}
                />
            )}

            {toast && (
                <div className={`rg-toast ${toast.tone}`} role="status">
                    <i
                        className={`bi ${
                            toast.tone === "error"
                                ? "bi-exclamation-circle-fill"
                                : "bi-check-circle-fill"
                        }`}
                    />
                    {toast.message}
                </div>
            )}
        </CustomerLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Styles (scoped under .rg / .rg-* so nothing leaks into the app)     */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.rg, .rg-overlay, .rg-toast{
  --ink:#000; --paper:#fff; --fog:#f6f6f6; --line:#e2e2e2; --mute:#5e5e5e;
  --blue:#276ef1; --green:#05944f; --red:#e11900;
  font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:var(--ink); -webkit-font-smoothing:antialiased;
}
.rg{background:var(--paper);min-height:100%;padding:32px 24px 64px}
.rg-wrap{max-width:1120px;margin:0 auto}
.rg *,.rg-overlay *{box-sizing:border-box}
.rg h1,.rg h2,.rg h3,.rg p,.rg dl,.rg dd,.rg-overlay h2,.rg-overlay p{margin:0}
.rg button,.rg-overlay button{font-family:inherit;cursor:pointer}
.rg :focus-visible,.rg-overlay :focus-visible{outline:3px solid var(--blue);outline-offset:2px}

/* Header */
.rg-header{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:28px}
.rg-header h1{font-size:clamp(2rem,4.5vw,3rem);font-weight:800;letter-spacing:-.035em;line-height:1.05}
.rg-header p{margin-top:8px;color:var(--mute);font-size:1.02rem;max-width:44ch}

/* Buttons */
.rg-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 24px;border:0;border-radius:999px;font-size:.95rem;font-weight:700;transition:background .15s,transform .1s}
.rg-btn:active{transform:scale(.98)}
.rg-btn:disabled{opacity:.55;cursor:not-allowed}
.rg-btn-lg{min-height:52px;padding:0 28px}
.rg-btn-dark{background:var(--ink);color:#fff}
.rg-btn-dark:hover:not(:disabled){background:#2b2b2b}
.rg-btn-light{background:var(--fog);color:var(--ink)}
.rg-btn-light:hover:not(:disabled){background:#e8e8e8}
.rg-btn-danger{background:var(--red);color:#fff}
.rg-btn-danger:hover:not(:disabled){background:#b81400}
.rg-icon-btn{width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:var(--fog);color:var(--ink);font-size:1rem;transition:background .15s}
.rg-icon-btn:hover{background:#e8e8e8}
.rg-icon-btn.danger:hover{background:#fde8e5;color:var(--red)}
.rg-spinner{width:16px;height:16px;border:2px solid #ffffff55;border-top-color:#fff;border-radius:50%;animation:rg-spin .7s linear infinite}
@keyframes rg-spin{to{transform:rotate(360deg)}}

/* Stats */
.rg-stats{display:grid;grid-template-columns:repeat(4,1fr);margin-bottom:24px;border-radius:16px;background:var(--fog)}
.rg-stats div{padding:18px 22px;display:flex;flex-direction:column;gap:2px}
.rg-stats div + div{border-left:1px solid var(--line)}
.rg-stats strong{font-size:1.9rem;font-weight:800;letter-spacing:-.03em;line-height:1.1}
.rg-stats span{color:var(--mute);font-size:.86rem;font-weight:500}

/* Toolbar */
.rg-toolbar{display:grid;grid-template-columns:1fr auto;gap:12px 16px;align-items:center;margin-bottom:24px}
.rg-search{position:relative;display:flex;align-items:center}
.rg-search > i{position:absolute;left:18px;color:var(--mute);pointer-events:none}
.rg-search input{width:100%;height:52px;padding:0 48px 0 46px;border:2px solid transparent;border-radius:999px;background:var(--fog);font:inherit;font-size:.96rem;color:var(--ink);transition:border-color .15s,background .15s}
.rg-search input:focus{outline:none;border-color:var(--ink);background:#fff}
.rg-search input::placeholder{color:#777}
.rg-search button{position:absolute;right:8px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:var(--mute)}
.rg-sort{display:flex;align-items:center;gap:10px;font-size:.88rem;font-weight:600;color:var(--mute)}
.rg-sort select{height:52px;padding:0 38px 0 18px;border:0;border-radius:999px;background-color:var(--fog);font:inherit;font-weight:600;color:var(--ink);cursor:pointer}
.rg-chips{grid-column:1 / -1;display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
.rg-chips::-webkit-scrollbar{display:none}
.rg-chips button{flex-shrink:0;min-height:40px;padding:0 16px;border:0;border-radius:999px;background:var(--fog);color:var(--ink);font-size:.9rem;font-weight:600;transition:background .15s}
.rg-chips button:hover{background:#e8e8e8}
.rg-chips button.on{background:var(--ink);color:#fff}
.rg-chips em{font-style:normal;margin-left:4px;opacity:.55}
.rg-count{margin-bottom:14px;color:var(--mute);font-size:.9rem}

/* Cards */
.rg-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.rg-card{display:flex;flex-direction:column;gap:18px;padding:22px;border:1px solid var(--line);border-radius:20px;background:#fff;transition:border-color .15s,box-shadow .15s}
.rg-card:hover{border-color:#bdbdbd;box-shadow:0 8px 24px #0000000d}
.rg-card-head{display:flex;align-items:center;gap:14px}
.rg-vicon{width:52px;height:52px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--ink);color:#fff;font-size:1.25rem}
.rg-card-title{min-width:0}
.rg-card-title h3{font-size:1.15rem;font-weight:700;letter-spacing:-.015em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rg-card-title p{margin-top:2px;color:var(--mute);font-size:.88rem}

/* Number plate */
.rg-plate{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:12px 16px 12px 46px;border:2px solid var(--ink);border-radius:10px;background:#fff;color:var(--ink);font-size:1.15rem;font-weight:800;letter-spacing:.14em;text-align:left;overflow:hidden}
.rg-plate::before{content:"IND";position:absolute;left:0;top:0;bottom:0;width:32px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;background:#1d4fbf;color:#fff;font-size:.55rem;letter-spacing:.06em}
.rg-plate i{font-size:.9rem;opacity:.35;transition:opacity .15s}
.rg-plate:hover i{opacity:.9}
.rg-plate.ev{background:var(--green);border-color:var(--green);color:#fff}
.rg-plate.ev i{opacity:.7}

/* Specs */
.rg-specs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.rg-specs dt{color:var(--mute);font-size:.78rem;font-weight:500}
.rg-specs dd{margin-top:2px;font-size:.98rem;font-weight:700}

/* Card footer */
.rg-card-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:16px;border-top:1px solid var(--line)}
.rg-ready{display:inline-flex;align-items:center;gap:8px;color:var(--green);font-size:.86rem;font-weight:700}
.rg-ready i{width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px #05944f22}
.rg-actions{display:flex;gap:8px}

/* Empty & error */
.rg-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:64px 24px;border-radius:20px;background:var(--fog);text-align:center}
.rg-empty-icon{width:72px;height:72px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;border-radius:50%;background:var(--ink);color:#fff;font-size:1.9rem}
.rg-empty.error .rg-empty-icon{background:var(--red)}
.rg-empty h3{font-size:1.4rem;font-weight:800;letter-spacing:-.02em}
.rg-empty p{max-width:42ch;margin-bottom:14px;color:var(--mute)}

/* Skeleton */
.rg-skel{pointer-events:none}
.rg-skel i{display:block;border-radius:8px;background:linear-gradient(90deg,#eee 25%,#f7f7f7 50%,#eee 75%);background-size:200% 100%;animation:rg-shimmer 1.4s infinite}
@keyframes rg-shimmer{to{background-position:-200% 0}}

/* Modal */
.rg-overlay{position:fixed;inset:0;z-index:1055;display:flex;align-items:flex-end;justify-content:center;padding:0;background:#00000099;overflow-y:auto}
.rg-modal{width:100%;max-width:640px;max-height:100%;overflow-y:auto;background:#fff;border-radius:24px 24px 0 0;animation:rg-sheet .22s ease-out}
@keyframes rg-sheet{from{transform:translateY(24px);opacity:0}}
.rg-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:28px 28px 8px}
.rg-modal-head h2,.rg-confirm h2{font-size:1.6rem;font-weight:800;letter-spacing:-.025em}
.rg-modal-head p{margin-top:4px;color:var(--mute);font-size:.94rem}
.rg-modal-body{padding:20px 28px}
.rg-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 28px 28px}
.rg-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:18px 16px}
.rg-field label{display:block;margin-bottom:6px;font-size:.86rem;font-weight:700}
.rg-field input,.rg-field select{width:100%;height:52px;padding:0 16px;border:2px solid transparent;border-radius:12px;background:var(--fog);font:inherit;font-size:.96rem;color:var(--ink);transition:border-color .15s,background .15s}
.rg-field input:focus,.rg-field select:focus{outline:none;border-color:var(--ink);background:#fff}
.rg-field small{display:block;margin-top:5px;color:var(--mute);font-size:.78rem}
.rg-alert{display:flex;gap:10px;align-items:flex-start;margin-bottom:18px;padding:14px 16px;border-radius:12px;background:#fde8e5;color:#8c1000;font-size:.92rem;font-weight:600}
.rg-alert i{margin-top:2px}
.rg-confirm{text-align:center;padding-top:32px}
.rg-confirm-icon{width:64px;height:64px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;border-radius:50%;background:#fde8e5;color:var(--red);font-size:1.6rem}
.rg-confirm p{margin-top:8px;color:var(--mute)}
.rg-confirm p strong{color:var(--ink)}

/* Toast */
.rg-toast{position:fixed;left:50%;bottom:28px;z-index:1070;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:calc(100% - 32px);padding:14px 22px;border-radius:999px;background:var(--ink);color:#fff;font-size:.92rem;font-weight:600;box-shadow:0 10px 30px #0004;animation:rg-sheet .2s ease-out}
.rg-toast.ok i{color:#2fd27f}
.rg-toast.error i{color:#ff8a7a}

/* Responsive */
@media(min-width:640px){
  .rg-overlay{align-items:center;padding:24px}
  .rg-modal{border-radius:24px}
}
@media(max-width:720px){
  .rg{padding:20px 16px 56px}
  .rg-header{flex-direction:column;align-items:stretch}
  .rg-header .rg-btn{width:100%}
  .rg-stats{grid-template-columns:1fr 1fr}
  .rg-stats div:nth-child(3){border-left:0}
  .rg-stats div:nth-child(n+3){border-top:1px solid var(--line)}
  .rg-toolbar{grid-template-columns:1fr}
  .rg-sort{justify-content:space-between}
  .rg-sort select{flex:1}
  .rg-cards{grid-template-columns:1fr}
}
@media(max-width:520px){
  .rg-grid-2{grid-template-columns:1fr}
  .rg-modal-head,.rg-modal-body,.rg-modal-foot{padding-left:20px;padding-right:20px}
  .rg-modal-foot .rg-btn{flex:1}
}
@media(prefers-reduced-motion:reduce){
  .rg *,.rg-overlay *,.rg-toast{animation:none!important;transition:none!important}
}
`;

export default Vehicles;