import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

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

    useEffect(() => {
        loadMechanics();
        loadFavorites();
    }, []);


    const loadMechanics = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await api.get("/mechanics");

            setMechanics(response.data);

        } catch (error) {

            console.error(
                "Failed to load mechanics:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load available mechanics."
            );

        } finally {

            setLoading(false);

        }
    };


    const handleSelectMechanic = async (mechanicId) => {

        if (!requestId) {
            return;
        }

        try {

            setSelectingId(mechanicId);
            setSelectError("");

            await api.put(
                `/requests/${requestId}/reassign/${mechanicId}`
            );

            navigate(
                `/customer/requests/${requestId}`
            );

        } catch (error) {

            console.error(
                "Failed to assign mechanic:",
                error
            );

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

            const response =
                await api.get("/favorites");

            setFavorites(response.data);

        } catch (error) {

            console.error(
                "Failed to load favorites:",
                error
            );

        }
    };
    const isFavorite = (mechanicId) => {

        return favorites.some(
            (favorite) =>
                favorite.mechanic?.id === mechanicId
        );

    };


    const toggleFavorite = async (mechanicId) => {

        try {

            setFavoriteLoadingId(mechanicId);

            if (isFavorite(mechanicId)) {

                await api.delete(
                    `/favorites/${mechanicId}`
                );

                setFavorites(
                    favorites.filter(
                        (favorite) =>
                            favorite.mechanic?.id !== mechanicId
                    )
                );

            } else {

                const response =
                    await api.post(
                        `/favorites/${mechanicId}`
                    );

                setFavorites([
                    ...favorites,
                    response.data
                ]);

            }

        } catch (error) {

            console.error(
                "Failed to update favorite:",
                error
            );

            alert(
                error.response?.data?.message ||
                "Unable to update favorite."
            );

        } finally {

            setFavoriteLoadingId(null);

        }

    };


    return (

        <CustomerLayout>

            {/* HEADER */}

            <div className="d-flex justify-content-between align-items-start mb-4">

                <div>

                    <button
                        className="btn btn-link text-decoration-none px-0 mb-2"
                        onClick={() =>
                            requestId
                                ? navigate(
                                    `/customer/requests/${requestId}`
                                )
                                : navigate("/customer")
                        }
                    >
                        ← Back
                    </button>

                    <h2 className="fw-bold mb-1">
                        {requestId
                            ? "🔧 Choose a Mechanic"
                            : "🔧 Find a Mechanic"}
                    </h2>

                    <p className="text-muted mb-0">
                        {requestId
                            ? `Choose an available mechanic for Request #${requestId}.`
                            : "Browse currently available RoadAid mechanics."
                        }
                    </p>

                </div>

            </div>


            {/* REASSIGNMENT INFORMATION */}

            {requestId && (

                <div className="alert alert-info border-0 shadow-sm mb-4">

                    <div className="d-flex align-items-start gap-3">

                        <div className="fs-4">
                            ℹ️
                        </div>

                        <div>

                            <strong>
                                Selecting a mechanic for Request #{requestId}
                            </strong>

                            <p className="mb-0 mt-1">
                                Choose an available mechanic below.
                                Your request will be reassigned to the
                                selected mechanic.
                            </p>

                        </div>

                    </div>

                </div>

            )}


            {/* ERROR */}

            {selectError && (

                <div className="alert alert-danger">

                    {selectError}

                </div>

            )}


            {/* LOADING */}

            {loading && (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading available mechanics...
                        </p>

                    </div>

                </div>

            )}


            {/* ERROR */}

            {!loading && error && (

                <div className="alert alert-danger">

                    <h5 className="fw-bold">
                        Unable to Load Mechanics
                    </h5>

                    <p className="mb-3">
                        {error}
                    </p>

                    <button
                        className="btn btn-danger"
                        onClick={loadMechanics}
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* NO MECHANICS */}

            {!loading &&
                !error &&
                mechanics.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                🔧
                            </div>

                            <h5 className="fw-bold">
                                No Mechanics Available
                            </h5>

                            <p className="text-muted mb-4">
                                There are currently no available
                                mechanics. Please try again later.
                            </p>

                            <button
                                className="btn btn-primary"
                                onClick={loadMechanics}
                            >
                                Refresh
                            </button>

                        </div>

                    </div>

                )}


            {/* MECHANIC LIST */}

            {!loading &&
                !error &&
                mechanics.length > 0 && (

                    <div className="row g-4">

                        {mechanics.map((mechanic) => (

                            <div
                                className="col-md-6 col-xl-4"
                                key={mechanic.id}
                            >

                                <div className="card border-0 shadow-sm h-100">

                                    <div className="card-body p-4">

                                        {/* HEADER */}

                                        <div className="d-flex justify-content-between align-items-start mb-4">

                                            <div
                                                className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                                                style={{
                                                    width: "56px",
                                                    height: "56px",
                                                    fontSize: "24px"
                                                }}
                                            >
                                                🔧
                                            </div>

                                            <span className="badge bg-success">
                                                🟢 Available
                                            </span>

                                        </div>


                                        {/* WORKSHOP */}

                                        <h5 className="fw-bold mb-2">
                                            {mechanic.workshopName}
                                        </h5>


                                        {/* ADDRESS */}

                                        <div className="mb-3">

                                            <small className="text-muted d-block mb-1">
                                                📍 Workshop
                                            </small>

                                            <span>
                                                {mechanic.workshopAddress}
                                            </span>

                                        </div>


                                        {/* EXPERIENCE */}

                                        <div className="mb-3">

                                            <small className="text-muted d-block mb-1">
                                                🛠️ Experience
                                            </small>

                                            <span className="fw-semibold">
                                                {mechanic.experienceYears}{" "}
                                                {mechanic.experienceYears === 1
                                                    ? "year"
                                                    : "years"}
                                            </span>

                                        </div>


                                        {/* CONTACT */}

                                        <div className="mb-4">

                                            <small className="text-muted d-block mb-1">
                                                📞 Contact
                                            </small>

                                            <span>
                                                {mechanic.contactNumber}
                                            </span>

                                        </div>


                                        {/* ACTIONS */}

                                        <div className="d-flex gap-2">

                                            {/* FAVORITE */}

                                            <button
                                                type="button"
                                                className={`btn ${
                                                    isFavorite(mechanic.id)
                                                        ? "btn-danger"
                                                        : "btn-outline-danger"
                                                }`}
                                                disabled={
                                                    favoriteLoadingId === mechanic.id
                                                }
                                                onClick={() =>
                                                    toggleFavorite(mechanic.id)
                                                }
                                                title={
                                                    isFavorite(mechanic.id)
                                                        ? "Remove from favorites"
                                                        : "Add to favorites"
                                                }
                                            >

                                                {favoriteLoadingId === mechanic.id
                                                    ? "..."
                                                    : isFavorite(mechanic.id)
                                                        ? "❤️"
                                                        : "♡"
                                                }

                                            </button>


                                            {/* SELECT MECHANIC */}

                                            {requestId && (

                                                <button
                                                    className="btn btn-primary flex-grow-1"
                                                    disabled={
                                                        selectingId !== null
                                                    }
                                                    onClick={() =>
                                                        handleSelectMechanic(
                                                            mechanic.id
                                                        )
                                                    }
                                                >

                                                    {selectingId === mechanic.id
                                                        ? "Assigning..."
                                                        : "Choose This Mechanic"}

                                                </button>

                                            )}

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

export default Mechanics;