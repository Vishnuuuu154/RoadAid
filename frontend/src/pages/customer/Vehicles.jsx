import { useEffect, useState } from "react";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function Vehicles() {

    const [vehicles, setVehicles] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);

    const [formData, setFormData] = useState({
        registrationNumber: "",
        vehicleType: "",
        brand: "",
        model: "",
        fuelType: "",
        manufacturingYear: ""
    });

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await api.get("/vehicles/my");

            setVehicles(response.data);

        } catch (error) {

            console.error(
                "Failed to load vehicles:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load vehicles."
            );

        } finally {

            setLoading(false);

        }
    };

    const handleChange = (event) => {

        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const resetForm = () => {

        setFormData({
            registrationNumber: "",
            vehicleType: "",
            brand: "",
            model: "",
            fuelType: "",
            manufacturingYear: ""
        });

        setEditingVehicle(null);
        setShowForm(false);
    };

    const handleSubmit = async (event) => {

        event.preventDefault();

        try {

            if (editingVehicle) {

                await api.put(
                    `/vehicles/${editingVehicle.id}`,
                    formData
                );

            } else {

                await api.post(
                    "/vehicles",
                    formData
                );

            }

            await loadVehicles();

            resetForm();

        } catch (error) {

            console.error(
                "Failed to save vehicle:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to save vehicle."
            );
        }
    };

    const handleEdit = (vehicle) => {

        setEditingVehicle(vehicle);

        setFormData({
            registrationNumber:
                vehicle.registrationNumber || "",

            vehicleType:
                vehicle.vehicleType || "",

            brand:
                vehicle.brand || "",

            model:
                vehicle.model || "",

            fuelType:
                vehicle.fuelType || "",

            manufacturingYear:
                vehicle.manufacturingYear || ""
        });

        setShowForm(true);
    };

    const handleDelete = async (vehicleId) => {

        const confirmed = window.confirm(
            "Are you sure you want to delete this vehicle?"
        );

        if (!confirmed) {
            return;
        }

        try {

            await api.delete(
                `/vehicles/${vehicleId}`
            );

            setVehicles((previous) =>
                previous.filter(
                    (vehicle) =>
                        vehicle.id !== vehicleId
                )
            );

        } catch (error) {

            console.error(
                "Failed to delete vehicle:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Failed to delete vehicle."
            );
        }
    };

    return (

        <CustomerLayout>

            {/* Header */}

            <div className="d-flex justify-content-between align-items-center mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        🚗 My Vehicles
                    </h2>

                    <p className="text-muted mb-0">
                        Manage the vehicles you use with RoadAid.
                    </p>

                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                >
                    + Add Vehicle
                </button>

            </div>


            {/* Add / Edit Form */}

            {showForm && (

                <div className="card shadow-sm border-0 mb-4">

                    <div className="card-body p-4">

                        <div className="d-flex justify-content-between align-items-center mb-4">

                            <h5 className="fw-bold mb-0">

                                {editingVehicle
                                    ? "✏️ Edit Vehicle"
                                    : "➕ Add Vehicle"}

                            </h5>

                            <button
                                type="button"
                                className="btn-close"
                                onClick={resetForm}
                            />

                        </div>


                        <form onSubmit={handleSubmit}>

                            <div className="row g-3">

                                {/* Registration */}

                                <div className="col-md-6">

                                    <label className="form-label fw-semibold">
                                        Registration Number
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        name="registrationNumber"
                                        value={
                                            formData.registrationNumber
                                        }
                                        onChange={handleChange}
                                        placeholder="KL 01 AB 1234"
                                        required
                                    />

                                </div>


                                {/* Vehicle Type */}

                                <div className="col-md-6">

                                    <label className="form-label fw-semibold">
                                        Vehicle Type
                                    </label>

                                    <select
                                        className="form-select"
                                        name="vehicleType"
                                        value={formData.vehicleType}
                                        onChange={handleChange}
                                        required
                                    >

                                        <option value="">
                                            Select vehicle type
                                        </option>

                                        <option value="CAR">
                                            Car
                                        </option>

                                        <option value="BIKE">
                                            Bike
                                        </option>

                                        <option value="SCOOTER">
                                            Scooter
                                        </option>

                                        <option value="TRUCK">
                                            Truck
                                        </option>

                                        <option value="VAN">
                                            Van
                                        </option>

                                        <option value="OTHER">
                                            Other
                                        </option>

                                    </select>

                                </div>


                                {/* Brand */}

                                <div className="col-md-6">

                                    <label className="form-label fw-semibold">
                                        Brand
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleChange}
                                        placeholder="Toyota"
                                        required
                                    />

                                </div>


                                {/* Model */}

                                <div className="col-md-6">

                                    <label className="form-label fw-semibold">
                                        Model
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        name="model"
                                        value={formData.model}
                                        onChange={handleChange}
                                        placeholder="Innova"
                                        required
                                    />

                                </div>


                                {/* Fuel */}

                                <div className="col-md-6">

                                    <label className="form-label fw-semibold">
                                        Fuel Type
                                    </label>

                                    <select
                                        className="form-select"
                                        name="fuelType"
                                        value={formData.fuelType}
                                        onChange={handleChange}
                                        required
                                    >

                                        <option value="">
                                            Select fuel type
                                        </option>

                                        <option value="PETROL">
                                            Petrol
                                        </option>

                                        <option value="DIESEL">
                                            Diesel
                                        </option>

                                        <option value="ELECTRIC">
                                            Electric
                                        </option>

                                        <option value="HYBRID">
                                            Hybrid
                                        </option>

                                        <option value="CNG">
                                            CNG
                                        </option>

                                    </select>

                                </div>


                                {/* Manufacturing Year */}

                                <div className="col-md-6">

                                    <label className="form-label fw-semibold">
                                        Manufacturing Year
                                    </label>

                                    <input
                                        type="number"
                                        className="form-control"
                                        name="manufacturingYear"
                                        value={
                                            formData.manufacturingYear
                                        }
                                        onChange={handleChange}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        placeholder="2022"
                                        required
                                    />

                                </div>

                            </div>


                            <div className="d-flex gap-2 mt-4">

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    {editingVehicle
                                        ? "Update Vehicle"
                                        : "Add Vehicle"}
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* Loading */}

            {loading && (

                <div className="card shadow-sm border-0">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading your vehicles...
                        </p>

                    </div>

                </div>

            )}


            {/* Error */}

            {!loading && error && (

                <div className="alert alert-danger">
                    {error}
                </div>

            )}


            {/* Empty */}

            {!loading &&
                !error &&
                vehicles.length === 0 && (

                    <div className="card shadow-sm border-0">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                🚗
                            </div>

                            <h5 className="fw-bold">
                                No Vehicles Added
                            </h5>

                            <p className="text-muted mb-3">
                                Add a vehicle to make requesting
                                roadside assistance faster.
                            </p>

                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    resetForm();
                                    setShowForm(true);
                                }}
                            >
                                + Add Your First Vehicle
                            </button>

                        </div>

                    </div>

                )}


            {/* Vehicle Cards */}

            {!loading &&
                !error &&
                vehicles.length > 0 && (

                    <div className="row g-4">

                        {vehicles.map((vehicle) => (

                            <div
                                className="col-md-6 col-lg-4"
                                key={vehicle.id}
                            >

                                <div className="card shadow-sm border-0 h-100">

                                    <div className="card-body p-4">

                                        <div className="d-flex justify-content-between align-items-start mb-3">

                                            <div>

                                                <h5 className="fw-bold mb-1">
                                                    {vehicle.brand}{" "}
                                                    {vehicle.model}
                                                </h5>

                                                <span className="badge bg-primary">
                                                    {vehicle.vehicleType}
                                                </span>

                                            </div>

                                            <span className="fs-3">
                                                🚗
                                            </span>

                                        </div>


                                        <div className="mb-3">

                                            <p className="mb-2">
                                                <strong>
                                                    Registration:
                                                </strong>{" "}
                                                {vehicle.registrationNumber}
                                            </p>

                                            <p className="mb-2">
                                                <strong>
                                                    Fuel:
                                                </strong>{" "}
                                                {vehicle.fuelType}
                                            </p>

                                            <p className="mb-0">
                                                <strong>
                                                    Year:
                                                </strong>{" "}
                                                {vehicle.manufacturingYear}
                                            </p>

                                        </div>


                                        <div className="d-flex gap-2">

                                            <button
                                                className="btn btn-outline-primary btn-sm flex-grow-1"
                                                onClick={() =>
                                                    handleEdit(vehicle)
                                                }
                                            >
                                                ✏️ Edit
                                            </button>

                                            <button
                                                className="btn btn-outline-danger btn-sm flex-grow-1"
                                                onClick={() =>
                                                    handleDelete(
                                                        vehicle.id
                                                    )
                                                }
                                            >
                                                🗑️ Delete
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

        </CustomerLayout>

    );
}

export default Vehicles;