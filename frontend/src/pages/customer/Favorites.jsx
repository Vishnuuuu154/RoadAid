import { useEffect, useState } from "react";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function Favorites() {

    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState(null);

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await api.get("/favorites");

            setFavorites(response.data);

        } catch (error) {

            console.error(
                "Failed to load favorites:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load favorite mechanics."
            );

        } finally {

            setLoading(false);

        }
    };


    const removeFavorite = async (mechanicId) => {

        try {

            setRemovingId(mechanicId);

            await api.delete(
                `/favorites/${mechanicId}`
            );

            setFavorites(
                favorites.filter(
                    favorite =>
                        favorite.mechanic?.id !== mechanicId
                )
            );

        } catch (error) {

            console.error(
                "Failed to remove favorite:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Unable to remove favorite."
            );

        } finally {

            setRemovingId(null);

        }
    };


    return (

        <CustomerLayout>

            {/* HEADER */}

            <div className="d-flex justify-content-between align-items-start mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        ❤️ Favorite Mechanics
                    </h2>

                    <p className="text-muted mb-0">
                        Quickly access mechanics you have saved.
                    </p>

                </div>

                <button
                    className="btn btn-outline-primary"
                    onClick={() =>
                        window.location.href = "/customer/mechanics"
                    }
                >
                    🔧 Find Mechanics
                </button>

            </div>


            {/* LOADING */}

            {loading && (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading favorites...
                        </p>

                    </div>

                </div>

            )}


            {/* ERROR */}

            {!loading && error && (

                <div className="alert alert-danger">

                    <h5 className="fw-bold">
                        Unable to Load Favorites
                    </h5>

                    <p className="mb-3">
                        {error}
                    </p>

                    <button
                        className="btn btn-danger"
                        onClick={loadFavorites}
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* EMPTY */}

            {!loading &&
                !error &&
                favorites.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                ❤️
                            </div>

                            <h5 className="fw-bold">
                                No Favorite Mechanics
                            </h5>

                            <p className="text-muted mb-0">
                                Mechanics you save as favorites
                                will appear here.
                            </p>

                        </div>

                    </div>

                )}


            {/* FAVORITES */}

            {!loading &&
                !error &&
                favorites.length > 0 && (

                    <div className="row g-4">

                        {favorites.map((favorite) => {

                            const mechanic =
                                favorite.mechanic;

                            if (!mechanic) {
                                return null;
                            }

                            return (

                                <div
                                    className="col-md-6 col-xl-4"
                                    key={favorite.id}
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

                                                <span
                                                    className={`badge ${
                                                        mechanic.available
                                                            ? "bg-success"
                                                            : "bg-secondary"
                                                    }`}
                                                >
                                                    {mechanic.available
                                                        ? "🟢 Available"
                                                        : "⚫ Unavailable"}
                                                </span>

                                            </div>


                                            {/* NAME */}

                                            <h5 className="fw-bold mb-3">
                                                {mechanic.workshopName}

                                            </h5>
                                            <small className="text-muted">
                                                ❤️ Saved to your favorites
                                            </small>


                                            {/* ADDRESS */}

                                            <div className="mb-3">

                                                <small className="text-muted d-block mb-1">
                                                    📍 Workshop
                                                </small>

                                                <span>
                                                    {mechanic.workshopAddress ||
                                                        "Address not available"}
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
                                                    {mechanic.contactNumber ||
                                                        "Not available"}
                                                </span>

                                            </div>


                                            {/* REMOVE */}

                                            <button
                                                className="btn btn-outline-danger w-100"
                                                disabled={
                                                    removingId === mechanic.id
                                                }
                                                onClick={() =>
                                                    removeFavorite(
                                                        mechanic.id
                                                    )
                                                }
                                            >

                                                {removingId === mechanic.id
                                                    ? "Removing..."
                                                    : "❤️ Remove Favorite"}

                                            </button>

                                        </div>

                                    </div>

                                </div>

                            );

                        })}

                    </div>

                )}

        </CustomerLayout>

    );
}

export default Favorites;