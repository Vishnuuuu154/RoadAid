import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import {
    getUsers,
    activateUser,
    deactivateUser
} from "../../services/adminService";

function Users() {

    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);
    const handleActivate = async (id) => {
        if (!window.confirm("activate this user?")) {
            return;
        }
        try {

            await activateUser(id);

            loadUsers();

        } catch (error) {

            console.error(error);

            alert("Failed to activate user.");

        }

    };

    const handleDeactivate = async (id) => {
        if (!window.confirm("Deactivate this user?")) {
            return;
        }
        try {

            await deactivateUser(id);

            loadUsers();

        } catch (error) {

            console.error(error);

            alert(
                error.response?.data?.message || "Failed to deactivate user."
            );

        }

    };

    const loadUsers = async () => {

        try {

            const response = await getUsers(search);

            setUsers(response.data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    const handleSearch = () => {
        loadUsers();
    };

    return (

        <AdminLayout>

            <h2 className="mb-4">

                User Management

            </h2>

            <div className="d-flex mb-3">

                <input
                    type="text"
                    className="form-control me-2"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {

                        if (e.key === "Enter") {

                            handleSearch();

                        }

                    }}
                />

                <button
                    className="btn btn-primary"
                    onClick={handleSearch}
                >
                    Search
                </button>

            </div>

            {loading ? (

                <div className="text-center">

                    <div
                        className="spinner-border text-primary"
                        role="status"
                    >
                    </div>

                    <p className="mt-2">

                        Loading users...

                    </p>

                </div>

            ) : (

                <table className="table table-hover align-middle shadow-sm">

                    <thead className="table-dark">

                    <tr>

                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Action</th>

                    </tr>

                    </thead>
                    <tbody>

                    {users.length === 0 ? (

                        <tr>

                            <td colSpan="6" className="text-center">

                                No users found.

                            </td>

                        </tr>

                    ) : (

                        users.map((user) => (

                            <tr key={user.id}>

                                <td>{user.id}</td>
                                <td>{user.fullName}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                                <td>
                                    {user.isActive ? (
                                        <span className="badge bg-success">
            Active
        </span>
                                    ) : (
                                        <span className="badge bg-danger">
            Inactive
        </span>
                                    )}
                                </td>

                                <td>

                                    {user.isActive ? (

                                        <button
                                            className="btn btn-outline-danger btn-sm"
                                            className="btn btn-outline-success btn-sm"
                                            onClick={() => handleDeactivate(user.id)}
                                        >
                                            Deactivate
                                        </button>

                                    ) : (

                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleActivate(user.id)}
                                        >
                                            Activate
                                        </button>

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

export default Users;