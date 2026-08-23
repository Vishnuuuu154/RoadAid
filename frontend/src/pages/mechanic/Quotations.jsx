import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";
import {
    getMyQuotations,
    updateQuotation
} from "../../services/mechanicService";


function Quotations() {

    const navigate = useNavigate();

    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [editingQuotation, setEditingQuotation] = useState(null);

    const [editForm, setEditForm] = useState({
        labourCharge: "",
        partsCharge: "",
        travelFee: ""
    });

    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState("");


    /* =========================================
       LOAD QUOTATIONS
    ========================================= */

    useEffect(() => {
        loadQuotations();
    }, []);


    const loadQuotations = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await getMyQuotations();

            setQuotations(response.data);

        } catch (error) {

            console.error(
                "Failed to load quotations:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load quotations."
            );

        } finally {

            setLoading(false);
            setRefreshing(false);

        }

    };


    /* =========================================
       REFRESH
    ========================================= */

    const handleRefresh = async () => {

        setRefreshing(true);

        await loadQuotations();

    };


    /* =========================================
       STATUS BADGE
    ========================================= */

    const getStatusBadge = (status) => {

        switch (status) {

            case "PENDING":

                return (
                    <span className="badge bg-warning text-dark">
                        ⏳ Awaiting Customer
                    </span>
                );

            case "ACCEPTED":

                return (
                    <span className="badge bg-success">
                        ✓ Accepted
                    </span>
                );

            case "PAID":

                return (
                    <span className="badge bg-success">
                        💳 Paid
                    </span>
                );

            case "REJECTED":

                return (
                    <span className="badge bg-danger">
                        ✕ Rejected
                    </span>
                );

            default:

                return (
                    <span className="badge bg-secondary">
                        {status || "Unknown"}
                    </span>
                );

        }

    };
    const getQuotationDisplayStatus = (quotation) => {

        const requestStatus =
            quotation.serviceRequest?.status;

        if (requestStatus === "CANCELLED") {

            return (
                <span className="badge bg-secondary">
                ✕ Request Cancelled
            </span>
            );

        }

        if (requestStatus === "COMPLETED") {

            if (quotation.paymentStatus === "PAID") {
                return (
                    <span className="badge bg-success">
                    💳 Paid
                </span>
                );
            }

            return (
                <span className="badge bg-success">
                ✓ Completed
            </span>
            );

        }

        if (quotation.paymentStatus === "ACCEPTED") {

            return (
                <span className="badge bg-success">
                ✓ Accepted
            </span>
            );

        }

        if (quotation.paymentStatus === "PENDING") {

            return (
                <span className="badge bg-warning text-dark">
                ⏳ Awaiting Customer
            </span>
            );

        }

        if (quotation.paymentStatus === "REJECTED") {

            return (
                <span className="badge bg-danger">
                ✕ Rejected
            </span>
            );

        }

        return (
            <span className="badge bg-secondary">
            {quotation.paymentStatus || "Unknown"}
        </span>
        );

    };


    /* =========================================
       OPEN EDIT MODAL
    ========================================= */

    const handleEdit = (quotation) => {

        setEditingQuotation(quotation);

        setEditForm({
            labourCharge:
                quotation.labourCharge ?? "",

            partsCharge:
                quotation.partsCharge ?? "",

            travelFee:
                quotation.travelFee ?? ""
        });

        setEditError("");

    };


    /* =========================================
       CLOSE EDIT MODAL
    ========================================= */

    const handleCloseEdit = () => {

        if (saving) {
            return;
        }

        setEditingQuotation(null);

        setEditForm({
            labourCharge: "",
            partsCharge: "",
            travelFee: ""
        });

        setEditError("");

    };


    /* =========================================
       FORM CHANGE
    ========================================= */

    const handleEditChange = (e) => {

        const { name, value } = e.target;

        setEditForm({
            ...editForm,
            [name]: value
        });

    };


    /* =========================================
       EDIT TOTAL
    ========================================= */

    const editTotal =
        Number(editForm.labourCharge || 0) +
        Number(editForm.partsCharge || 0) +
        Number(editForm.travelFee || 0);


    /* =========================================
       SAVE QUOTATION
    ========================================= */

    const handleSaveQuotation = async (e) => {

        e.preventDefault();

        if (!editingQuotation) {
            return;
        }

        const labour =
            Number(editForm.labourCharge);

        const parts =
            Number(editForm.partsCharge);

        const travel =
            Number(editForm.travelFee);


        if (
            !Number.isFinite(labour) ||
            labour < 0 ||
            !Number.isFinite(parts) ||
            parts < 0 ||
            !Number.isFinite(travel) ||
            travel < 0
        ) {

            setEditError(
                "Please enter valid charges."
            );

            return;

        }


        try {

            setSaving(true);
            setEditError("");

            await updateQuotation(
                editingQuotation.serviceRequest.id,
                {
                    labourCharge: labour,
                    partsCharge: parts,
                    travelFee: travel
                }
            );

            alert(
                "Quotation updated successfully."
            );

            setEditingQuotation(null);

            await loadQuotations();

        } catch (error) {

            console.error(
                "Failed to update quotation:",
                error
            );

            setEditError(
                error.response?.data?.message ||
                "Failed to update quotation."
            );

        } finally {

            setSaving(false);

        }

    };


    /* =========================================
       LOADING
    ========================================= */

    if (loading) {

        return (

            <MechanicLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading quotations...
                        </p>

                    </div>

                </div>

            </MechanicLayout>

        );

    }


    /* =========================================
       PAGE
    ========================================= */

    return (

        <MechanicLayout>

            {/* =========================================
                HEADER
            ========================================= */}

            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        💰 Quotations
                    </h2>

                    <p className="text-muted mb-0">
                        View and manage quotations sent to customers.
                    </p>

                </div>


                <button
                    className="btn btn-outline-secondary"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >

                    🔄{" "}

                    {refreshing
                        ? "Refreshing..."
                        : "Refresh"}

                </button>

            </div>


            {/* =========================================
                ERROR
            ========================================= */}

            {error && (

                <div className="alert alert-danger">

                    <strong>
                        Unable to load quotations.
                    </strong>

                    <div className="mt-1">
                        {error}
                    </div>

                </div>

            )}


            {/* =========================================
                EMPTY
            ========================================= */}

            {!error &&
                quotations.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                💰
                            </div>

                            <h5 className="fw-bold">
                                No Quotations Yet
                            </h5>

                            <p className="text-muted mb-4">
                                Quotations you send to customers
                                will appear here.
                            </p>

                            <button
                                className="btn btn-primary"
                                onClick={() =>
                                    navigate(
                                        "/mechanic/requests"
                                    )
                                }
                            >
                                View My Requests
                            </button>

                        </div>

                    </div>

                )}


            {/* =========================================
                QUOTATIONS
            ========================================= */}

            {!error &&
                quotations.length > 0 && (

                    <div className="row g-4">

                        {quotations.map(
                            (quotation) => {

                                const request =
                                    quotation.serviceRequest;

                                const canEdit =
                                    quotation.paymentStatus ===
                                    "PENDING" &&
                                    request?.status === "QUOTATION_PENDING";


                                return (

                                    <div
                                        className="col-12 col-lg-6"
                                        key={quotation.id}
                                    >

                                        <div className="card border-0 shadow-sm h-100">

                                            <div className="card-body p-4">

                                                {/* HEADER */}

                                                <div className="d-flex justify-content-between align-items-start mb-4">

                                                    <div>

                                                        <small className="text-muted">

                                                            Request #

                                                            {request?.id ||
                                                                "—"}

                                                        </small>


                                                        <h5 className="fw-bold mb-1 mt-1">

                                                            {request?.customer?.fullName ||
                                                                "Customer"}

                                                        </h5>


                                                        <small className="text-muted">

                                                            {request?.vehicle?.brand}{" "}

                                                            {request?.vehicle?.model}

                                                        </small>

                                                    </div>


                                                    {getQuotationDisplayStatus(quotation)}

                                                </div>


                                                {/* CHARGES */}

                                                <div className="border rounded p-3 mb-4">

                                                    <div className="d-flex justify-content-between mb-2">

                                                        <span className="text-muted">
                                                            Labour
                                                        </span>

                                                        <span>
                                                            ₹
                                                            {Number(
                                                                quotation.labourCharge ||
                                                                0
                                                            ).toFixed(2)}
                                                        </span>

                                                    </div>


                                                    <div className="d-flex justify-content-between mb-2">

                                                        <span className="text-muted">
                                                            Parts
                                                        </span>

                                                        <span>
                                                            ₹
                                                            {Number(
                                                                quotation.partsCharge ||
                                                                0
                                                            ).toFixed(2)}
                                                        </span>

                                                    </div>


                                                    <div className="d-flex justify-content-between mb-3">

                                                        <span className="text-muted">
                                                            Travel
                                                        </span>

                                                        <span>
                                                            ₹
                                                            {Number(
                                                                quotation.travelFee ||
                                                                0
                                                            ).toFixed(2)}
                                                        </span>

                                                    </div>


                                                    <hr />


                                                    <div className="d-flex justify-content-between">

                                                        <strong>
                                                            Total
                                                        </strong>

                                                        <strong className="fs-5">
                                                            ₹
                                                            {Number(
                                                                quotation.totalAmount ||
                                                                0
                                                            ).toFixed(2)}
                                                        </strong>

                                                    </div>

                                                </div>


                                                {/* REQUEST STATUS */}

                                                <div className="mb-4">

                                                    <small className="text-muted d-block mb-1">
                                                        Request Status
                                                    </small>

                                                    <strong
                                                        className={
                                                            request?.status === "CANCELLED"
                                                                ? "text-secondary"
                                                                : request?.status === "COMPLETED"
                                                                    ? "text-success"
                                                                    : ""
                                                        }
                                                    >
                                                        {request?.status || "Unknown"}
                                                    </strong>

                                                </div>


                                                {/* ACTIONS */}

                                                <div className="d-flex flex-column flex-sm-row gap-2">

                                                    {canEdit && (

                                                        <button
                                                            className="btn btn-warning flex-grow-1"
                                                            onClick={() =>
                                                                handleEdit(
                                                                    quotation
                                                                )
                                                            }
                                                        >
                                                            ✏️ Edit Quotation
                                                        </button>

                                                    )}


                                                    {request?.id && (

                                                        <button
                                                            className="btn btn-outline-primary flex-grow-1"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/mechanic/requests/${request.id}`
                                                                )
                                                            }
                                                        >
                                                            View Request
                                                        </button>

                                                    )}

                                                </div>


                                                {/* EDITING INFO */}

                                                {canEdit && (

                                                    <small className="text-muted d-block mt-3">

                                                        You can edit this quotation
                                                        until the customer accepts it.

                                                    </small>

                                                )}

                                            </div>

                                        </div>

                                    </div>

                                );

                            }
                        )}

                    </div>

                )}


            {/* =========================================
                EDIT QUOTATION MODAL
            ========================================= */}

            {editingQuotation && (

                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{
                        backgroundColor:
                            "rgba(0, 0, 0, 0.5)"
                    }}
                >

                    <div className="modal-dialog modal-dialog-centered">

                        <div className="modal-content">

                            {/* HEADER */}

                            <div className="modal-header">

                                <div>

                                    <h5 className="modal-title fw-bold">
                                        ✏️ Edit Quotation
                                    </h5>

                                    <small className="text-muted">
                                        Request #
                                        {editingQuotation.serviceRequest?.id}
                                    </small>

                                </div>


                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={handleCloseEdit}
                                    disabled={saving}
                                >
                                </button>

                            </div>


                            {/* BODY */}

                            <div className="modal-body">

                                {editError && (

                                    <div className="alert alert-danger">
                                        {editError}
                                    </div>

                                )}


                                <form
                                    onSubmit={
                                        handleSaveQuotation
                                    }
                                >

                                    {/* LABOUR */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Labour Charge
                                        </label>

                                        <div className="input-group">

                                            <span className="input-group-text">
                                                ₹
                                            </span>

                                            <input
                                                type="number"
                                                name="labourCharge"
                                                className="form-control"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    editForm.labourCharge
                                                }
                                                onChange={
                                                    handleEditChange
                                                }
                                                disabled={saving}
                                                required
                                            />

                                        </div>

                                    </div>


                                    {/* PARTS */}

                                    <div className="mb-3">

                                        <label className="form-label fw-semibold">
                                            Parts Charge
                                        </label>

                                        <div className="input-group">

                                            <span className="input-group-text">
                                                ₹
                                            </span>

                                            <input
                                                type="number"
                                                name="partsCharge"
                                                className="form-control"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    editForm.partsCharge
                                                }
                                                onChange={
                                                    handleEditChange
                                                }
                                                disabled={saving}
                                                required
                                            />

                                        </div>

                                    </div>


                                    {/* TRAVEL */}

                                    <div className="mb-4">

                                        <label className="form-label fw-semibold">
                                            Travel Fee
                                        </label>

                                        <div className="input-group">

                                            <span className="input-group-text">
                                                ₹
                                            </span>

                                            <input
                                                type="number"
                                                name="travelFee"
                                                className="form-control"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    editForm.travelFee
                                                }
                                                onChange={
                                                    handleEditChange
                                                }
                                                disabled={saving}
                                                required
                                            />

                                        </div>

                                    </div>


                                    {/* TOTAL */}

                                    <div className="alert alert-light border mb-4">

                                        <div className="d-flex justify-content-between align-items-center">

                                            <span>
                                                Updated Total
                                            </span>

                                            <strong className="fs-5">
                                                ₹
                                                {editTotal.toFixed(2)}
                                            </strong>

                                        </div>

                                    </div>


                                    {/* BUTTONS */}

                                    <div className="d-flex justify-content-end gap-2">

                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={
                                                handleCloseEdit
                                            }
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>


                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={saving}
                                        >

                                            {saving
                                                ? "Saving..."
                                                : "Save Changes"}

                                        </button>

                                    </div>

                                </form>

                            </div>

                        </div>

                    </div>

                </div>

            )}

        </MechanicLayout>

    );

}


export default Quotations;