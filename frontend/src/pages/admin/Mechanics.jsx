import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { getMechanics } from "../../services/adminService";

function Mechanics() {

    const [mechanics, setMechanics] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMechanics();
    }, []);

    const loadMechanics = async () => {

        try {

            const response = await getMechanics(search);

            setMechanics(response.data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    return (

        <AdminLayout>

            <h2 className="mb-4">
                Mechanics
            </h2>

            <div className="d-flex mb-3">

                <input
                    type="text"
                    className="form-control me-2"
                    placeholder="Search mechanic..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            loadMechanics();
                        }
                    }}
                />

                <button
                    className="btn btn-primary"
                    onClick={loadMechanics}
                >
                    Search
                </button>

            </div>

            {loading ? (

                <div className="text-center">
                    <div className="spinner-border text-primary"></div>
                </div>

            ) : (

                <table className="table table-hover align-middle">

                    <thead className="table-dark">

                    <tr>

                        <th>ID</th>
                        <th>Name</th>
                        <th>Workshop</th>
                        <th>Contact</th>
                        <th>Experience</th>
                        <th>Available</th>

                    </tr>

                    </thead>

                    <tbody>

                    {mechanics.length === 0 ? (

                        <tr>

                            <td colSpan="6" className="text-center">

                                No mechanics found.

                            </td>

                        </tr>

                    ) : (

                        mechanics.map((mechanic) => (

                            <tr key={mechanic.mechanicId}>

                                <td>{mechanic.mechanicId}</td>

                                <td>{mechanic.fullName}</td>

                                <td>{mechanic.workshopName}</td>

                                <td>{mechanic.contactNumber}</td>

                                <td>{mechanic.experienceYears} Years</td>

                                <td>

                                    {mechanic.available ? (

                                        <span className="badge bg-success">

                                                Available

                                            </span>

                                    ) : (

                                        <span className="badge bg-secondary">

                                                Offline

                                            </span>

                                    )}

                                </td>

                            </tr>

                        ))

                    )}

                    </tbody>

                </table>

            )}

        </AdminLayout>

    );

}

export default Mechanics;