import { useEffect, useState } from "react";
import MechanicLayout from "../../layouts/MechanicLayout";
import {
    getMyProfile,
    updateMyProfile
} from "../../services/mechanicService";


function Profile() {

    const [profile, setProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editing, setEditing] = useState(false);

    const [form, setForm] = useState({
        workshopName: "",
        workshopAddress: "",
        experienceYears: "",
        contactNumber: "",
        available: false
    });

    const [error, setError] = useState("");


    /* =========================================
       LOAD PROFILE
    ========================================= */

    useEffect(() => {
        loadProfile();
    }, []);


    const loadProfile = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await getMyProfile();

            setProfile(response.data);

            setForm({
                workshopName:
                    response.data.workshopName || "",

                workshopAddress:
                    response.data.workshopAddress || "",

                experienceYears:
                    response.data.experienceYears ?? "",

                contactNumber:
                    response.data.contactNumber || "",

                available:
                    response.data.available ?? false
            });

        } catch (error) {

            console.error(
                "Failed to load mechanic profile:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load your profile."
            );

        } finally {

            setLoading(false);

        }

    };


    /* =========================================
       FORM CHANGE
    ========================================= */

    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm({
            ...form,
            [name]: value
        });

    };


    /* =========================================
       SAVE PROFILE
    ========================================= */

    const handleSave = async (e) => {

        e.preventDefault();

        try {

            setSaving(true);
            setError("");

            const response =
                await updateMyProfile({
                    workshopName:
                        form.workshopName.trim(),

                    workshopAddress:
                        form.workshopAddress.trim(),

                    experienceYears:
                        Number(form.experienceYears),

                    contactNumber:
                        form.contactNumber.trim(),

                    available:
                    form.available
                });

            setProfile(response.data);

            setForm({
                workshopName:
                    response.data.workshopName || "",

                workshopAddress:
                    response.data.workshopAddress || "",

                experienceYears:
                    response.data.experienceYears ?? "",

                contactNumber:
                    response.data.contactNumber || "",

                available:
                    response.data.available ?? false
            });

            setEditing(false);

            alert(
                "Profile updated successfully."
            );

        } catch (error) {

            console.error(
                "Failed to update profile:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to update profile."
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
                            Loading your profile...
                        </p>

                    </div>

                </div>

            </MechanicLayout>

        );

    }


    /* =========================================
       ERROR
    ========================================= */

    if (error && !profile) {

        return (

            <MechanicLayout>

                <div className="alert alert-danger">

                    <h5 className="fw-bold">
                        Unable to Load Profile
                    </h5>

                    <p className="mb-3">
                        {error}
                    </p>

                    <button
                        className="btn btn-danger"
                        onClick={loadProfile}
                    >
                        Try Again
                    </button>

                </div>

            </MechanicLayout>

        );

    }


    return (

        <MechanicLayout>

            {/* =========================================
                PAGE HEADER
            ========================================= */}

            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">

                <div>

                    <h2 className="fw-bold mb-1">
                        👤 My Profile
                    </h2>

                    <p className="text-muted mb-0">
                        Manage your mechanic and workshop information.
                    </p>

                </div>


                {!editing && (

                    <button
                        className="btn btn-primary"
                        onClick={() =>
                            setEditing(true)
                        }
                    >
                        ✏️ Edit Profile
                    </button>

                )}

            </div>


            {/* ERROR */}

            {error && (

                <div className="alert alert-danger">
                    {error}
                </div>

            )}


            {/* =========================================
                PROFILE HEADER
            ========================================= */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="d-flex align-items-center flex-wrap gap-3">

                        <div
                            className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                                width: "80px",
                                height: "80px",
                                fontSize: "36px"
                            }}
                        >
                            🔧
                        </div>


                        <div className="flex-grow-1">

                            <h3 className="fw-bold mb-1">

                                {profile?.user?.fullName ||
                                    "Mechanic"}

                            </h3>


                            <p className="text-muted mb-2">

                                {profile?.workshopName ||
                                    "Independent Mechanic"}

                            </p>


                            {profile?.available ? (

                                <span className="badge bg-success">
                                    🟢 Available
                                </span>

                            ) : (

                                <span className="badge bg-secondary">
                                    ⚫ Offline
                                </span>

                            )}

                        </div>

                    </div>

                </div>

            </div>


            {/* =========================================
                VIEW MODE
            ========================================= */}

            {!editing && (

                <div className="row g-4">

                    {/* WORKSHOP */}

                    <div className="col-12 col-lg-6">

                        <div className="card border-0 shadow-sm h-100">

                            <div className="card-body p-4">

                                <h5 className="fw-bold mb-4">
                                    🏢 Workshop Information
                                </h5>


                                <div className="mb-4">

                                    <small className="text-muted d-block mb-1">
                                        Workshop Name
                                    </small>

                                    <strong>
                                        {profile?.workshopName ||
                                            "Not provided"}
                                    </strong>

                                </div>


                                <div>

                                    <small className="text-muted d-block mb-1">
                                        Workshop Address
                                    </small>

                                    <span>
                                        {profile?.workshopAddress ||
                                            "Not provided"}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>


                    {/* PROFESSIONAL */}

                    <div className="col-12 col-lg-6">

                        <div className="card border-0 shadow-sm h-100">

                            <div className="card-body p-4">

                                <h5 className="fw-bold mb-4">
                                    🛠️ Professional Information
                                </h5>


                                <div className="mb-4">

                                    <small className="text-muted d-block mb-1">
                                        Experience
                                    </small>

                                    <strong>
                                        {profile?.experienceYears ?? 0}{" "}
                                        {profile?.experienceYears === 1
                                            ? "year"
                                            : "years"}
                                    </strong>

                                </div>


                                <div className="mb-4">

                                    <small className="text-muted d-block mb-1">
                                        Contact Number
                                    </small>

                                    <strong>
                                        {profile?.contactNumber ||
                                            "Not provided"}
                                    </strong>

                                </div>


                                <div>

                                    <small className="text-muted d-block mb-1">
                                        Availability
                                    </small>

                                    <strong
                                        className={
                                            profile?.available
                                                ? "text-success"
                                                : "text-secondary"
                                        }
                                    >

                                        {profile?.available
                                            ? "🟢 Available"
                                            : "⚫ Offline"}

                                    </strong>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            )}


            {/* =========================================
                EDIT MODE
            ========================================= */}

            {editing && (

                <div className="card border-0 shadow-sm">

                    <div className="card-body p-4">

                        <div className="mb-4">

                            <h5 className="fw-bold mb-1">
                                ✏️ Edit Profile
                            </h5>

                            <p className="text-muted mb-0">
                                Update your workshop and professional information.
                            </p>

                        </div>


                        <form onSubmit={handleSave}>

                            <div className="row g-4">

                                {/* WORKSHOP NAME */}

                                <div className="col-12 col-md-6">

                                    <label className="form-label fw-semibold">
                                        Workshop Name
                                    </label>

                                    <input
                                        type="text"
                                        name="workshopName"
                                        className="form-control"
                                        value={
                                            form.workshopName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter workshop name"
                                        required
                                    />

                                </div>


                                {/* CONTACT */}

                                <div className="col-12 col-md-6">

                                    <label className="form-label fw-semibold">
                                        Contact Number
                                    </label>

                                    <input
                                        type="tel"
                                        name="contactNumber"
                                        className="form-control"
                                        value={
                                            form.contactNumber
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter contact number"
                                        required
                                    />

                                </div>


                                {/* ADDRESS */}

                                <div className="col-12">

                                    <label className="form-label fw-semibold">
                                        Workshop Address
                                    </label>

                                    <textarea
                                        name="workshopAddress"
                                        className="form-control"
                                        rows="3"
                                        value={
                                            form.workshopAddress
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter complete workshop address"
                                        required
                                    />

                                </div>


                                {/* EXPERIENCE */}

                                <div className="col-12 col-md-6">

                                    <label className="form-label fw-semibold">
                                        Experience (Years)
                                    </label>

                                    <input
                                        type="number"
                                        name="experienceYears"
                                        className="form-control"
                                        min="0"
                                        step="1"
                                        value={
                                            form.experienceYears
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    />

                                </div>


                                {/* AVAILABILITY */}

                                <div className="col-12 col-md-6">

                                    <label className="form-label fw-semibold">
                                        Availability
                                    </label>

                                    <select
                                        name="available"
                                        className="form-select"
                                        value={
                                            form.available
                                                ? "true"
                                                : "false"
                                        }
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                available:
                                                    e.target.value ===
                                                    "true"
                                            })
                                        }
                                    >

                                        <option value="true">
                                            Available
                                        </option>

                                        <option value="false">
                                            Offline
                                        </option>

                                    </select>

                                </div>

                            </div>


                            {/* BUTTONS */}

                            <div className="d-flex justify-content-end gap-2 mt-4">

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {

                                        setEditing(false);

                                        setError("");

                                        setForm({
                                            workshopName:
                                                profile?.workshopName ||
                                                "",

                                            workshopAddress:
                                                profile?.workshopAddress ||
                                                "",

                                            experienceYears:
                                                profile?.experienceYears ??
                                                "",

                                            contactNumber:
                                                profile?.contactNumber ||
                                                "",

                                            available:
                                                profile?.available ??
                                                false
                                        });

                                    }}
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

            )}

        </MechanicLayout>

    );

}


export default Profile;