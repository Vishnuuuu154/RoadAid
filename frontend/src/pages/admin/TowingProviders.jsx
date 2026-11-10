
import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../services/api";

function TowingProviders() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    const loadProviders = async () => {
        try {
            setLoading(true);

            const response = await api.get("/admin/towing-providers");

            setProviders(
                Array.isArray(response.data) ? response.data : []
            );

            setError("");
        } catch (err) {
            console.error("Failed to load towing providers:", err);
            setError(
                err.response?.data?.message ||
                "Unable to load towing providers."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProviders();
    }, []);

    const filteredProviders = providers.filter((provider) => {
        const searchText = search.toLowerCase();

        const matchesSearch =
            (provider.fullName || "").toLowerCase().includes(searchText) ||
            (provider.email || "").toLowerCase().includes(searchText) ||
            (provider.businessName || "").toLowerCase().includes(searchText) ||
            (provider.contactNumber || "").toLowerCase().includes(searchText);

        const matchesStatus =
            statusFilter === "ALL" ||
            provider.verificationStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case "APPROVED":
                return "bg-success";
            case "PENDING":
                return "bg-warning text-dark";
            case "REJECTED":
                return "bg-danger";
            default:
                return "bg-secondary";
        }
    };

    const handleAccountToggle = async (provider) => {
        const currentlyActive = provider.isActive === true;

        const action = currentlyActive ? "deactivate" : "activate";

        const confirmed = window.confirm(
            `Are you sure you want to ${action} ${provider.fullName}'s account?`
        );

        if (!confirmed) return;

        try {
            setProcessingId(provider.providerId);
            setActionError("");

            const endpoint = currentlyActive
                ? `/admin/users/${provider.userId}/deactivate`
                : `/admin/users/${provider.userId}/activate`;

            await api.put(endpoint);

            setProviders((previous) =>
                previous.map((item) =>
                    item.providerId === provider.providerId
                        ? { ...item, isActive: !currentlyActive }
                        : item
                )
            );

            setSelectedProvider((previous) =>
                previous?.providerId === provider.providerId
                    ? { ...previous, isActive: !currentlyActive }
                    : previous
            );

        } catch (err) {
            console.error("Failed to update provider account:", err);

            setActionError(
                err.response?.data?.message ||
                `Unable to ${action} provider account.`
            );
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <AdminLayout>
            <div className="container-fluid">

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                    <div>
                        <h2 className="mb-1">Towing Providers</h2>
                        <p className="text-muted mb-0">
                            View and manage registered towing provider accounts.
                        </p>
                    </div>

                    <button
                        className="btn btn-outline-primary"
                        onClick={loadProviders}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "↻ Refresh"}
                    </button>
                </div>

                {actionError && (
                    <div className="alert alert-danger alert-dismissible">
                        {actionError}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setActionError("")}
                        />
                    </div>
                )}

                {/* Statistics */}
                <div className="row g-3 mb-4">

                    <div className="col-md-3">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <h6 className="text-muted">Total Providers</h6>
                                <h3>{providers.length}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <h6 className="text-muted">Approved</h6>
                                <h3 className="text-success">
                                    {providers.filter(
                                        p => p.verificationStatus === "APPROVED"
                                    ).length}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <h6 className="text-muted">Pending</h6>
                                <h3 className="text-warning">
                                    {providers.filter(
                                        p => p.verificationStatus === "PENDING"
                                    ).length}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <h6 className="text-muted">Active Accounts</h6>
                                <h3 className="text-primary">
                                    {providers.filter(
                                        p => p.isActive === true
                                    ).length}
                                </h3>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Filters */}
                <div className="card shadow-sm mb-4">
                    <div className="card-body">
                        <div className="row g-3">

                            <div className="col-md-8">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by name, email, business or phone..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="col-md-4">
                                <select
                                    className="form-select"
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                >
                                    <option value="ALL">All Verification Statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Provider Table */}
                <div className="card shadow-sm">
                    <div className="card-body">

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" />
                                <p className="text-muted mt-2">
                                    Loading providers...
                                </p>
                            </div>
                        ) : error ? (
                            <div className="alert alert-danger">
                                {error}
                            </div>
                        ) : filteredProviders.length === 0 ? (
                            <div className="text-center py-5">
                                <div className="fs-1">🚚</div>
                                <h5 className="mt-2">No providers found</h5>
                                <p className="text-muted mb-0">
                                    No towing providers match your search.
                                </p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle">

                                    <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Provider</th>
                                        <th>Business</th>
                                        <th>Contact</th>
                                        <th>Verification</th>
                                        <th>Account</th>
                                        <th>Actions</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {filteredProviders.map((provider, index) => (
                                        <tr key={provider.providerId}>
                                            <td>{index + 1}</td>

                                            <td>
                                                <strong>{provider.fullName}</strong>
                                                <div className="text-muted small">
                                                    {provider.email}
                                                </div>
                                            </td>

                                            <td>
                                                {provider.businessName}
                                                <div className="text-muted small">
                                                    {provider.businessAddress}
                                                </div>
                                            </td>

                                            <td>
                                                {provider.contactNumber || provider.phone}
                                            </td>

                                            <td>
                                                    <span className={`badge ${getStatusBadge(provider.verificationStatus)}`}>
                                                        {provider.verificationStatus}
                                                    </span>
                                            </td>

                                            <td>
                                                    <span className={`badge ${provider.isActive ? "bg-success" : "bg-secondary"}`}>
                                                        {provider.isActive ? "Active" : "Inactive"}
                                                    </span>
                                            </td>

                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => setSelectedProvider(provider)}
                                                    >
                                                        View
                                                    </button>

                                                    <button
                                                        className={`btn btn-sm ${provider.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                                                        onClick={() => handleAccountToggle(provider)}
                                                        disabled={
                                                            processingId === provider.providerId ||
                                                            !provider.userId
                                                        }
                                                    >
                                                        {processingId === provider.providerId
                                                            ? "Please wait..."
                                                            : provider.isActive
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>

                                </table>
                            </div>
                        )}

                    </div>
                </div>

                {/* Provider Details Modal */}
                {selectedProvider && (
                    <div
                        className="modal d-block"
                        tabIndex="-1"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                        onClick={() => setSelectedProvider(null)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-content">

                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        Provider Details
                                    </h5>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setSelectedProvider(null)}
                                    />
                                </div>

                                <div className="modal-body">

                                    <h5>{selectedProvider.fullName}</h5>
                                    <p className="text-muted">
                                        {selectedProvider.email}
                                    </p>

                                    <hr />

                                    <p>
                                        <strong>Business:</strong>{" "}
                                        {selectedProvider.businessName}
                                    </p>

                                    <p>
                                        <strong>Business Address:</strong>{" "}
                                        {selectedProvider.businessAddress}
                                    </p>

                                    <p>
                                        <strong>Phone:</strong>{" "}
                                        {selectedProvider.phone || "—"}
                                    </p>

                                    <p>
                                        <strong>Business Contact:</strong>{" "}
                                        {selectedProvider.contactNumber || "—"}
                                    </p>

                                    <p>
                                        <strong>Registered:</strong>{" "}
                                        {selectedProvider.registeredAt
                                            ? new Date(selectedProvider.registeredAt).toLocaleString()
                                            : "—"}
                                    </p>

                                    <p>
                                        <strong>Verification:</strong>{" "}
                                        <span className={`badge ${getStatusBadge(selectedProvider.verificationStatus)}`}>
                                            {selectedProvider.verificationStatus}
                                        </span>
                                    </p>

                                    <p>
                                        <strong>Account:</strong>{" "}
                                        <span className={`badge ${selectedProvider.isActive ? "bg-success" : "bg-secondary"}`}>
                                            {selectedProvider.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </p>

                                    {selectedProvider.rejectionReason && (
                                        <div className="alert alert-danger mt-3">
                                            <strong>Rejection Reason:</strong>
                                            <p className="mb-0">
                                                {selectedProvider.rejectionReason}
                                            </p>
                                        </div>
                                    )}

                                </div>

                                <div className="modal-footer">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setSelectedProvider(null)}
                                    >
                                        Close
                                    </button>

                                    <button
                                        className={`btn ${selectedProvider.isActive ? "btn-danger" : "btn-success"}`}
                                        onClick={() => handleAccountToggle(selectedProvider)}
                                        disabled={processingId === selectedProvider.providerId}
                                    >
                                        {selectedProvider.isActive
                                            ? "Deactivate Account"
                                            : "Activate Account"}
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}

export default TowingProviders;
