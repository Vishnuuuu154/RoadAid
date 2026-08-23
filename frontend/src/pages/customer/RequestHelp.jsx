import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    getMyVehicles,
    getAvailableMechanics,
    createRequest
} from "../../services/customerService";
import CustomerLayout from "../../layouts/CustomerLayout";

function RequestHelp() {
    const navigate = useNavigate();

    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState("");
    const [loading, setLoading] = useState(true);

    const [step, setStep] = useState(1);


    const [problemCategory, setProblemCategory] = useState("");
    const [problemDescription, setProblemDescription] = useState("");
    const [vehicleDrivable, setVehicleDrivable] = useState("");
    const [images, setImages] = useState([]);
    const [location, setLocation] = useState("");
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [mechanics, setMechanics] = useState([]);
    const [selectedMechanic, setSelectedMechanic] = useState("");
    const [mechanicsLoading, setMechanicsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);


    const problemCategories = [
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

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {

        try {

            const response = await getMyVehicles();

            console.log(
                "REQUEST HELP VEHICLES:",
                response.data
            );

            setVehicles(response.data);

        } catch (error) {

            console.error(
                "Failed to load vehicles:",
                error
            );

        } finally {

            setLoading(false);

        }

    };
    const getCurrentLocation = () => {

        if (!navigator.geolocation) {

            setLocationError(
                "Geolocation is not supported by your browser."
            );

            return;
        }

        setLocationLoading(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition(

            (position) => {

                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                setLatitude(lat);
                setLongitude(lng);

                setLocation(
                    `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                );

                setLocationLoading(false);

            },

            (error) => {

                setLocationLoading(false);

                switch (error.code) {

                    case error.PERMISSION_DENIED:
                        setLocationError(
                            "Location permission was denied. Please allow location access or enter your location manually."
                        );
                        break;

                    case error.POSITION_UNAVAILABLE:
                        setLocationError(
                            "Your location could not be determined."
                        );
                        break;

                    case error.TIMEOUT:
                        setLocationError(
                            "Location request timed out. Please try again."
                        );
                        break;

                    default:
                        setLocationError(
                            "Unable to detect your location."
                        );
                }

            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }

        );

    };
    useEffect(() => {

        if (step === 4) {
            loadMechanics();
        }

    }, [step]);
    const loadMechanics = async () => {

        try {

            setMechanicsLoading(true);

            const response = await getAvailableMechanics();

            console.log(
                "AVAILABLE MECHANICS:",
                response.data
            );

            setMechanics(response.data);

        } catch (error) {

            console.error(
                "Failed to load mechanics:",
                error
            );

        } finally {

            setMechanicsLoading(false);

        }

    };
    const handleConfirmRequest = async () => {

        try {

            setSubmitting(true);

            const requestData = {
                issueDescription:
                    `Category: ${problemCategory}\n` +
                    `Description: ${problemDescription}\n` +
                    `Vehicle Drivable: ${
                        vehicleDrivable === "YES" ? "Yes" : "No"
                    }`,

                location: location
            };

            console.log("CREATING REQUEST:", {
                requestData,
                vehicleId: selectedVehicle,
                mechanicId: selectedMechanic,
                images
            });

            const response = await createRequest(
                requestData,
                selectedVehicle,
                selectedMechanic,
                images
            );

            console.log(
                "REQUEST CREATED:",
                response.data
            );

            alert(
                "Request sent successfully to the selected mechanic!"
            );

            navigate("/customer");

        } catch (error) {

            console.error(
                "FAILED TO CREATE REQUEST:",
                error
            );

            console.error(
                "SERVER RESPONSE:",
                error.response?.data
            );

            alert(
                error.response?.data?.message ||
                "Failed to send request. Please try again."
            );

        } finally {

            setSubmitting(false);

        }
    };
    return (

        <CustomerLayout>

            {/* Back to Dashboard */}

            <div className="mb-4">

                <Link
                    to="/customer"
                    className="text-decoration-none"
                >
                    ← Back to Dashboard
                </Link>

            </div>


            <div className="card shadow-sm border-0">

                <div className="card-body p-4">


                    {/* Header */}

                    <div className="text-center mb-4">

                        <h2 className="fw-bold">
                            🆘 Request Roadside Assistance
                        </h2>

                        <p className="text-muted">
                            Tell us what happened and we'll help you
                            find the right service provider.
                        </p>

                    </div>


                    {/* Progress */}

                    <div className="d-flex justify-content-center align-items-start mb-5">

                        {/* Step 1 */}

                        <div className="text-center">

                            <div
                                className={`badge rounded-pill px-3 py-2 ${
                                    step >= 1
                                        ? "bg-primary"
                                        : "bg-secondary"
                                }`}
                            >
                                1
                            </div>

                            <div className="small mt-1">
                                Vehicle
                            </div>

                        </div>


                        <div
                            className="mx-3 mt-3"
                            style={{ width: "60px" }}
                        >
                            <hr />
                        </div>


                        {/* Step 2 */}

                        <div className="text-center">

                            <div
                                className={`badge rounded-pill px-3 py-2 ${
                                    step >= 2
                                        ? "bg-primary"
                                        : "bg-secondary"
                                }`}
                            >
                                2
                            </div>

                            <div className="small mt-1">
                                Problem
                            </div>

                        </div>


                        <div
                            className="mx-3 mt-3"
                            style={{ width: "60px" }}
                        >
                            <hr />
                        </div>


                        {/* Step 3 */}

                        <div className="text-center">

                            <div
                                className={`badge rounded-pill px-3 py-2 ${
                                    step >= 3
                                        ? "bg-primary"
                                        : "bg-secondary"
                                }`}
                            >
                                3
                            </div>

                            <div className="small mt-1">
                                Location
                            </div>

                        </div>


                        <div
                            className="mx-3 mt-3"
                            style={{ width: "60px" }}
                        >
                            <hr />
                        </div>


                        {/* Step 4 */}

                        <div className="text-center">

                            <div
                                className={`badge rounded-pill px-3 py-2 ${
                                    step >= 4
                                        ? "bg-primary"
                                        : "bg-secondary"
                                }`}
                            >
                                4
                            </div>

                            <div className="small mt-1">
                                Provider
                            </div>

                        </div>
                        <div
                            className="mx-3 mt-3"
                            style={{ width: "60px" }}
                        >
                            <hr />
                        </div>

                        {/* Step 5 */}

                        <div className="text-center">

                            <div
                                className={`badge rounded-pill px-3 py-2 ${
                                    step >= 5
                                        ? "bg-primary"
                                        : "bg-secondary"
                                }`}
                            >
                                5
                            </div>

                            <div className="small mt-1">
                                Review
                            </div>

                        </div>

                    </div>


                    {/* ================================================= */}
                    {/* STEP 1 - VEHICLE */}
                    {/* ================================================= */}

                    {step === 1 && (

                        <div>

                            <h5 className="fw-bold mb-3">
                                1. Select Your Vehicle
                            </h5>

                            <p className="text-muted">
                                Which vehicle needs assistance?
                            </p>


                            {loading ? (

                                <div className="text-center py-4">

                                    <div className="spinner-border text-primary" />

                                    <p className="text-muted mt-2">
                                        Loading your vehicles...
                                    </p>

                                </div>

                            ) : vehicles.length === 0 ? (

                                <div className="text-center border rounded p-4">

                                    <h6 className="fw-bold">
                                        No vehicles found
                                    </h6>

                                    <p className="text-muted">
                                        Add a vehicle before requesting
                                        roadside assistance.
                                    </p>

                                    <Link
                                        to="/customer/vehicles"
                                        className="btn btn-primary"
                                    >
                                        + Add Vehicle
                                    </Link>

                                </div>

                            ) : (

                                <>

                                    {vehicles.map((vehicle) => (

                                        <div
                                            className={`border rounded p-3 mb-3 ${
                                                selectedVehicle ===
                                                String(vehicle.id)
                                                    ? "border-primary bg-light"
                                                    : ""
                                            }`}
                                            key={vehicle.id}
                                        >

                                            <div className="form-check">

                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="vehicle"
                                                    id={`vehicle-${vehicle.id}`}
                                                    value={vehicle.id}
                                                    checked={
                                                        selectedVehicle ===
                                                        String(vehicle.id)
                                                    }
                                                    onChange={(e) =>
                                                        setSelectedVehicle(
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                                <label
                                                    className="form-check-label w-100"
                                                    htmlFor={`vehicle-${vehicle.id}`}
                                                    style={{
                                                        cursor: "pointer"
                                                    }}
                                                >

                                                    <strong>
                                                        {vehicle.brand}{" "}
                                                        {vehicle.model}
                                                    </strong>

                                                    <div className="text-muted small">

                                                        {vehicle.registrationNumber}

                                                        {" · "}

                                                        {vehicle.fuelType}

                                                        {" · "}

                                                        {vehicle.manufacturingYear}

                                                    </div>

                                                </label>

                                            </div>

                                        </div>

                                    ))}

                                </>

                            )}


                            <Link
                                to="/customer/vehicles"
                                className="btn btn-outline-primary"
                            >
                                + Add Another Vehicle
                            </Link>


                            <div className="d-flex justify-content-end mt-5">

                                <button
                                    className="btn btn-primary px-4"
                                    disabled={!selectedVehicle}
                                    onClick={() => setStep(2)}
                                >
                                    Next →
                                </button>

                            </div>

                        </div>

                    )}


                    {/* ================================================= */}
                    {/* STEP 2 - PROBLEM */}
                    {/* ================================================= */}

                    {step === 2 && (

                        <div>

                            <h5 className="fw-bold mb-3">
                                2. What's Wrong?
                            </h5>

                            <p className="text-muted">
                                Tell us what is happening with your vehicle.
                            </p>


                            {/* Problem Category */}

                            <div className="mb-4">

                                <label className="form-label fw-semibold">
                                    Problem Category
                                </label>

                                <select
                                    className="form-select"
                                    value={problemCategory}
                                    onChange={(e) =>
                                        setProblemCategory(
                                            e.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Select a problem
                                    </option>

                                    {problemCategories.map(
                                        (category) => (

                                            <option
                                                key={category}
                                                value={category}
                                            >
                                                {category}
                                            </option>

                                        )
                                    )}

                                </select>

                            </div>


                            {/* Description */}

                            <div className="mb-4">

                                <label className="form-label fw-semibold">
                                    Describe the Problem
                                </label>

                                <textarea
                                    className="form-control"
                                    rows="4"
                                    placeholder="Tell us what happened..."
                                    value={problemDescription}
                                    onChange={(e) =>
                                        setProblemDescription(
                                            e.target.value
                                        )
                                    }
                                />

                                <div className="form-text">
                                    Example: Engine won't start after
                                    stopping at the roadside.
                                </div>

                            </div>


                            {/* Drivable */}

                            <div className="mb-4">

                                <label className="form-label fw-semibold d-block">
                                    Is the vehicle currently drivable?
                                </label>


                                <div className="form-check form-check-inline">

                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="drivable"
                                        id="drivableYes"
                                        value="YES"
                                        checked={
                                            vehicleDrivable === "YES"
                                        }
                                        onChange={(e) =>
                                            setVehicleDrivable(
                                                e.target.value
                                            )
                                        }
                                    />

                                    <label
                                        className="form-check-label"
                                        htmlFor="drivableYes"
                                    >
                                        Yes
                                    </label>

                                </div>


                                <div className="form-check form-check-inline">

                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="drivable"
                                        id="drivableNo"
                                        value="NO"
                                        checked={
                                            vehicleDrivable === "NO"
                                        }
                                        onChange={(e) =>
                                            setVehicleDrivable(
                                                e.target.value
                                            )
                                        }
                                    />

                                    <label
                                        className="form-check-label"
                                        htmlFor="drivableNo"
                                    >
                                        No
                                    </label>

                                </div>

                            </div>


                            {/* Images */}

                            <div className="mb-4">

                                <label className="form-label fw-semibold">

                                    Add Photos

                                    <span className="text-muted fw-normal">
                                        {" "} (Optional)
                                    </span>

                                </label>


                                <input
                                    type="file"
                                    className="form-control"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) =>
                                        setImages(
                                            Array.from(
                                                e.target.files
                                            )
                                        )
                                    }
                                />


                                <div className="form-text">
                                    Photos can help the mechanic
                                    understand the problem.
                                </div>

                                {images.length > 0 && (

                                    <div className="mt-2 text-muted small">

                                        {images.length} image
                                        {images.length > 1
                                            ? "s"
                                            : ""}{" "}
                                        selected.

                                    </div>

                                )}

                            </div>


                            {/* Navigation */}

                            <div className="d-flex justify-content-between mt-5">

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setStep(1)}
                                >
                                    ← Back
                                </button>


                                <button
                                    type="button"
                                    className="btn btn-primary px-4"
                                    disabled={
                                        !problemCategory ||
                                        !problemDescription.trim() ||
                                        !vehicleDrivable
                                    }
                                    onClick={() => setStep(3)}
                                >
                                    Next →
                                </button>

                            </div>

                        </div>

                    )}


                    {/* ================================================= */}
                    {/* STEP 3 - LOCATION */}
                    {/* ================================================= */}

                    {step === 3 && (

                        <div>

                            <h5 className="fw-bold mb-3">
                                3. Your Location
                            </h5>

                            <p className="text-muted">
                                We need your location to find nearby service providers.
                            </p>


                            <button
                                type="button"
                                className="btn btn-primary mb-4"
                                onClick={getCurrentLocation}
                                disabled={locationLoading}
                            >

                                {locationLoading
                                    ? "Detecting Location..."
                                    : "📍 Use My Current Location"
                                }

                            </button>


                            {location && (

                                <div className="alert alert-success">

                                    <strong>
                                        Location detected
                                    </strong>

                                    <div className="small mt-1">
                                        📍 {location}
                                    </div>

                                </div>

                            )}


                            {locationError && (

                                <div className="alert alert-danger">

                                    {locationError}

                                </div>

                            )}


                            <div className="mt-4">

                                <label className="form-label fw-semibold">
                                    Or enter your location manually
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Example: Aluva, Kerala"
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        setLatitude(null);
                                        setLongitude(null);
                                    }}
                                />

                            </div>


                            <div className="d-flex justify-content-between mt-5">

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setStep(2)}
                                >
                                    ← Back
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-primary px-4"
                                    disabled={!location.trim()}
                                    onClick={() => setStep(4)}
                                >
                                    Next →
                                </button>

                            </div>

                        </div>

                    )}


                    {/* ================================================= */}
                    {/* STEP 4 - SERVICE PROVIDER */}
                    {/* ================================================= */}

                    {step === 4 && (

                        <div>

                            <h5 className="fw-bold mb-3">
                                4. Choose a Service Provider
                            </h5>

                            <p className="text-muted">
                                Choose an available mechanic to assist you.
                            </p>

                            {/* Find One For Me */}

                            <div className="border rounded p-3 mb-4 bg-light">

                                <div className="d-flex justify-content-between align-items-center">

                                    <div>

                                        <h6 className="fw-bold mb-1">
                                            Don't know who to choose?
                                        </h6>

                                        <p className="text-muted small mb-0">
                                            Let RoadAid choose an available provider for you.
                                        </p>

                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        disabled={
                                            mechanicsLoading ||
                                            mechanics.length === 0
                                        }
                                        onClick={() => {

                                            if (mechanics.length > 0) {

                                                setSelectedMechanic(
                                                    String(mechanics[0].id)
                                                );

                                            }

                                        }}
                                    >
                                        ⚡ Find One For Me
                                    </button>

                                </div>

                            </div>


                            {/* Loading */}

                            {mechanicsLoading && (

                                <div className="text-center py-5">

                                    <div className="spinner-border text-primary" />

                                    <p className="text-muted mt-2">
                                        Finding available service providers...
                                    </p>

                                </div>

                            )}


                            {/* No Mechanics */}

                            {!mechanicsLoading &&
                                mechanics.length === 0 && (

                                    <div className="alert alert-warning">

                                        <strong>
                                            No mechanics are currently available.
                                        </strong>

                                        <p className="mb-0 mt-1 small">
                                            Please try again later.
                                        </p>

                                    </div>

                                )}


                            {/* Mechanics List */}

                            {!mechanicsLoading &&
                                mechanics.length > 0 && (

                                    <div>

                                        {mechanics.map((mechanic) => {

                                            const isSelected =
                                                selectedMechanic ===
                                                String(mechanic.id);

                                            return (

                                                <div
                                                    key={mechanic.id}
                                                    className={`border rounded p-4 mb-3 ${
                                                        isSelected
                                                            ? "border-primary bg-light"
                                                            : ""
                                                    }`}
                                                    style={{
                                                        cursor: "pointer",
                                                        transition: "all 0.2s ease"
                                                    }}
                                                    onClick={() =>
                                                        setSelectedMechanic(
                                                            String(mechanic.id)
                                                        )
                                                    }
                                                >

                                                    <div className="d-flex justify-content-between align-items-start">

                                                        <div className="d-flex">

                                                            {/* Selection */}

                                                            <div className="me-3">

                                                                <input
                                                                    className="form-check-input"
                                                                    type="radio"
                                                                    name="mechanic"
                                                                    value={mechanic.id}
                                                                    checked={isSelected}
                                                                    onChange={() =>
                                                                        setSelectedMechanic(
                                                                            String(mechanic.id)
                                                                        )
                                                                    }
                                                                    onClick={(e) =>
                                                                        e.stopPropagation()
                                                                    }
                                                                />

                                                            </div>


                                                            {/* Mechanic Information */}

                                                            <div>

                                                                <h5 className="fw-bold mb-1">

                                                                    {mechanic.user?.fullName ||
                                                                        "Mechanic"}

                                                                </h5>

                                                                <div className="text-muted mb-2">

                                                                    {mechanic.workshopName}

                                                                </div>

                                                            </div>

                                                        </div>


                                                        {/* Availability */}

                                                        <span className="badge bg-success">

                                    🟢 Available

                                </span>

                                                    </div>


                                                    <div className="ms-4 mt-3">

                                                        <div className="small text-muted mb-2">

                                                            📍{" "}
                                                            {mechanic.workshopAddress}

                                                        </div>

                                                        <div className="small text-muted mb-2">

                                                            💼{" "}
                                                            {mechanic.experienceYears} years
                                                            experience

                                                        </div>

                                                        <div className="small text-muted">

                                                            📞{" "}
                                                            {mechanic.contactNumber}

                                                        </div>

                                                    </div>


                                                    {/* Selected indicator */}

                                                    {isSelected && (

                                                        <div className="mt-3 ms-4">

                                    <span className="text-primary fw-semibold">

                                        ✓ Provider selected

                                    </span>

                                                        </div>

                                                    )}

                                                </div>

                                            );

                                        })}

                                    </div>

                                )}


                            {/* Navigation */}

                            <div className="d-flex justify-content-between mt-5">

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setStep(3)}
                                >
                                    ← Back
                                </button>


                                <button
                                    type="button"
                                    className="btn btn-primary px-4"
                                    disabled={!selectedMechanic}
                                    onClick={() => setStep(5)}
                                >
                                    Review →
                                </button>

                            </div>

                        </div>

                    )}
                    {/* ================================================= */}
                    {/* STEP 5 - REVIEW & CONFIRM */}
                    {/* ================================================= */}

                    {step === 5 && (

                        <div>

                            <h5 className="fw-bold mb-3">
                                5. Review & Confirm
                            </h5>

                            <p className="text-muted mb-4">
                                Please review your request before sending it.
                            </p>


                            {/* Vehicle */}

                            <div className="border rounded p-4 mb-3">

                                <h6 className="fw-bold mb-3">
                                    🚗 Vehicle
                                </h6>

                                {(() => {

                                    const vehicle = vehicles.find(
                                        (v) =>
                                            String(v.id) ===
                                            String(selectedVehicle)
                                    );

                                    if (!vehicle) {
                                        return (
                                            <p className="text-muted mb-0">
                                                Vehicle information unavailable.
                                            </p>
                                        );
                                    }

                                    return (
                                        <>
                                            <div className="fw-semibold">
                                                {vehicle.brand} {vehicle.model}
                                            </div>

                                            <div className="text-muted small">
                                                {vehicle.registrationNumber}
                                                {" · "}
                                                {vehicle.fuelType}
                                                {" · "}
                                                {vehicle.manufacturingYear}
                                            </div>
                                        </>
                                    );

                                })()}

                            </div>


                            {/* Problem */}

                            <div className="border rounded p-4 mb-3">

                                <h6 className="fw-bold mb-3">
                                    🔧 Problem
                                </h6>

                                <div className="mb-2">

                <span className="fw-semibold">
                    Category:
                </span>{" "}

                                    {problemCategory}

                                </div>

                                <div className="mb-2">

                <span className="fw-semibold">
                    Description:
                </span>

                                    <div className="text-muted mt-1">
                                        {problemDescription}
                                    </div>

                                </div>

                                <div>

                <span className="fw-semibold">
                    Vehicle status:
                </span>{" "}

                                    {vehicleDrivable === "YES"
                                        ? "Drivable"
                                        : "Not drivable"}

                                </div>

                            </div>


                            {/* Location */}

                            <div className="border rounded p-4 mb-3">

                                <h6 className="fw-bold mb-3">
                                    📍 Location
                                </h6>

                                <div>
                                    {location || "Location not provided"}
                                </div>

                                {latitude !== null &&
                                    longitude !== null && (

                                        <div className="text-muted small mt-1">
                                            Coordinates: {latitude.toFixed(6)},
                                            {" "}
                                            {longitude.toFixed(6)}
                                        </div>

                                    )}

                            </div>


                            {/* Provider */}

                            <div className="border rounded p-4 mb-3">

                                <h6 className="fw-bold mb-3">
                                    👨‍🔧 Service Provider
                                </h6>

                                {(() => {

                                    const mechanic = mechanics.find(
                                        (m) =>
                                            String(m.id) ===
                                            String(selectedMechanic)
                                    );

                                    if (!mechanic) {
                                        return (
                                            <p className="text-muted mb-0">
                                                Provider information unavailable.
                                            </p>
                                        );
                                    }

                                    return (
                                        <>
                                            <div className="fw-semibold">
                                                {mechanic.user?.fullName ||
                                                    "Mechanic"}
                                            </div>

                                            <div className="text-muted">
                                                {mechanic.workshopName}
                                            </div>

                                            <div className="text-muted small mt-2">
                                                📍 {mechanic.workshopAddress}
                                            </div>

                                            <div className="text-muted small">
                                                💼 {mechanic.experienceYears} years
                                                experience
                                            </div>

                                        </>
                                    );

                                })()}

                            </div>


                            {/* Photos */}

                            <div className="border rounded p-4 mb-4">

                                <h6 className="fw-bold mb-3">
                                    📷 Photos
                                </h6>

                                {images.length === 0 ? (

                                    <span className="text-muted">
                    No photos added.
                </span>

                                ) : (

                                    <span>
                    {images.length} photo
                                        {images.length > 1 ? "s" : ""} attached.
                </span>

                                )}

                            </div>


                            {/* Navigation */}

                            <div className="d-flex justify-content-between mt-5">

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setStep(4)}
                                >
                                    ← Back
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-danger px-4"
                                    onClick={handleConfirmRequest}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? "Sending Request..."
                                        : "🆘 Confirm Request"}
                                </button>

                            </div>

                        </div>

                    )}

                </div>


            </div>


        </CustomerLayout>

    );

}

export default RequestHelp;