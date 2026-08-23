import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function Profile() {

    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const [profileMessage, setProfileMessage] = useState("");
    const [profileError, setProfileError] = useState("");

    const [passwordMessage, setPasswordMessage] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState("");


    useEffect(() => {
        loadProfile();
    }, []);


    const loadProfile = async () => {

        try {

            setLoading(true);

            const response =
                await api.get("/users/profile");

            setProfile(response.data);

            setFullName(response.data.fullName || "");
            setPhone(response.data.phone || "");

        } catch (error) {

            console.error(
                "Failed to load profile:",
                error
            );

            setProfileError(
                error.response?.data?.message ||
                "Failed to load profile."
            );

        } finally {

            setLoading(false);

        }
    };


    const handleProfileUpdate = async (e) => {

        e.preventDefault();

        try {

            setSaving(true);
            setProfileMessage("");
            setProfileError("");

            const response =
                await api.put(
                    "/users/profile",
                    {
                        fullName,
                        phone
                    }
                );

            setProfile(response.data);

            setProfileMessage(
                "Profile updated successfully."
            );

        } catch (error) {

            console.error(
                "Failed to update profile:",
                error
            );

            setProfileError(
                error.response?.data?.message ||
                "Failed to update profile."
            );

        } finally {

            setSaving(false);

        }
    };


    const handlePasswordChange = async (e) => {

        e.preventDefault();

        setPasswordMessage("");
        setPasswordError("");

        if (!currentPassword || !newPassword) {

            setPasswordError(
                "Please fill in all password fields."
            );

            return;
        }

        if (newPassword !== confirmPassword) {

            setPasswordError(
                "New passwords do not match."
            );

            return;
        }

        if (newPassword.length < 6) {

            setPasswordError(
                "New password must be at least 6 characters."
            );

            return;
        }

        try {

            setChangingPassword(true);

            await api.put(
                "/users/change-password",
                {
                    currentPassword,
                    newPassword
                }
            );

            setPasswordMessage(
                "Password changed successfully."
            );

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

        } catch (error) {

            console.error(
                "Failed to change password:",
                error
            );

            setPasswordError(
                error.response?.data?.message ||
                "Failed to change password."
            );

        } finally {

            setChangingPassword(false);

        }
    };


    const handleLogout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/");

    };
    const handleDeleteAccount = async () => {

        if (!deletePassword) {
            setDeleteError("Please enter your password.");
            return;
        }

        try {

            setDeletingAccount(true);
            setDeleteError("");

            await api.put(
                "/users/delete-account",
                {
                    password: deletePassword
                }
            );

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            navigate("/");

        } catch (error) {

            console.error(
                "Failed to delete account:",
                error
            );

            setDeleteError(
                error.response?.data?.message ||
                "Unable to delete your account."
            );

        } finally {

            setDeletingAccount(false);

        }
    };



    if (loading) {

        return (

            <CustomerLayout>

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading profile...
                        </p>

                    </div>

                </div>

            </CustomerLayout>

        );
    }


    if (!profile) {

        return (

            <CustomerLayout>

                <div className="alert alert-danger">

                    {profileError ||
                        "Unable to load profile."}

                </div>

            </CustomerLayout>

        );
    }


    return (

        <CustomerLayout>

            {/* HEADER */}

            <div className="mb-4">

                <h2 className="fw-bold mb-1">
                    👤 My Profile
                </h2>

                <p className="text-muted mb-0">
                    Manage your personal information and account security.
                </p>

            </div>


            {/* PROFILE INFORMATION */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <div className="d-flex align-items-center mb-4">

                        <div
                            className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
                            style={{
                                width: "72px",
                                height: "72px",
                                fontSize: "32px"
                            }}
                        >
                            👤
                        </div>

                        <div className="ms-3">

                            <h4 className="fw-bold mb-1">
                                {profile.fullName}
                            </h4>

                            <span className="badge bg-primary">
                                CUSTOMER
                            </span>

                        </div>

                    </div>


                    <h5 className="fw-bold mb-3">
                        Personal Information
                    </h5>


                    {profileMessage && (

                        <div className="alert alert-success">
                            {profileMessage}
                        </div>

                    )}


                    {profileError && (

                        <div className="alert alert-danger">
                            {profileError}
                        </div>

                    )}


                    <form onSubmit={handleProfileUpdate}>

                        <div className="row g-3">

                            <div className="col-md-6">

                                <label className="form-label fw-semibold">
                                    Full Name
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    value={fullName}
                                    onChange={(e) =>
                                        setFullName(e.target.value)
                                    }
                                    required
                                />

                            </div>


                            <div className="col-md-6">

                                <label className="form-label fw-semibold">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    className="form-control"
                                    value={profile.email || ""}
                                    disabled
                                />

                                <small className="text-muted">
                                    Email cannot be changed here.
                                </small>

                            </div>


                            <div className="col-md-6">

                                <label className="form-label fw-semibold">
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    className="form-control"
                                    value={phone}
                                    onChange={(e) =>
                                        setPhone(e.target.value)
                                    }
                                    required
                                />

                            </div>

                        </div>


                        <div className="mt-4">

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


            {/* ACCOUNT INFORMATION */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-4">
                        ℹ️ Account Information
                    </h5>

                    <div className="row g-4">

                        <div className="col-md-4">

                            <small className="text-muted d-block mb-1">
                                Account Status
                            </small>

                            <span className="badge bg-success">
                                ● {profile.isActive
                                ? "Active"
                                : "Inactive"}
                            </span>

                        </div>


                        <div className="col-md-4">

                            <small className="text-muted d-block mb-1">
                                Account Type
                            </small>

                            <strong>
                                Customer
                            </strong>

                        </div>


                        <div className="col-md-4">

                            <small className="text-muted d-block mb-1">
                                Member Since
                            </small>

                            <strong>
                                {profile.createdAt
                                    ? new Date(
                                        profile.createdAt
                                    ).toLocaleDateString(
                                        "en-IN",
                                        {
                                            dateStyle: "medium"
                                        }
                                    )
                                    : "—"}
                            </strong>

                        </div>

                    </div>

                </div>

            </div>


            {/* CHANGE PASSWORD */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-1">
                        🔐 Change Password
                    </h5>

                    <p className="text-muted mb-4">
                        Keep your RoadAid account secure.
                    </p>


                    {passwordMessage && (

                        <div className="alert alert-success">
                            {passwordMessage}
                        </div>

                    )}


                    {passwordError && (

                        <div className="alert alert-danger">
                            {passwordError}
                        </div>

                    )}


                    <form onSubmit={handlePasswordChange}>

                        <div className="row g-3">

                            <div className="col-md-4">

                                <label className="form-label fw-semibold">
                                    Current Password
                                </label>

                                <input
                                    type="password"
                                    className="form-control"
                                    value={currentPassword}
                                    onChange={(e) =>
                                        setCurrentPassword(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="col-md-4">

                                <label className="form-label fw-semibold">
                                    New Password
                                </label>

                                <input
                                    type="password"
                                    className="form-control"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>


                            <div className="col-md-4">

                                <label className="form-label fw-semibold">
                                    Confirm New Password
                                </label>

                                <input
                                    type="password"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                        </div>


                        <button
                            type="submit"
                            className="btn btn-warning mt-4"
                            disabled={changingPassword}
                        >
                            {changingPassword
                                ? "Changing..."
                                : "Change Password"}
                        </button>

                    </form>

                </div>

            </div>


            {/* ACCOUNT ACTIONS */}

            <div className="card border-0 shadow-sm mb-4">

                <div className="card-body p-4">

                    <h5 className="fw-bold mb-3">
                        ⚙️ Account Actions
                    </h5>

                    <button
                        className="btn btn-outline-danger"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </div>


            {/* DANGER ZONE */}

            <div className="card border-danger shadow-sm">

                <div className="card-body p-4">

                    <h5 className="fw-bold text-danger mb-2">
                        ⚠️ Danger Zone
                    </h5>

                    <p className="text-muted mb-3">
                        Permanently delete your RoadAid account.
                        Your completed service history will be preserved,
                        but your personal account information will be removed.
                    </p>

                    {!showDeleteConfirm ? (

                        <button
                            className="btn btn-danger"
                            onClick={() => {
                                setDeleteError("");
                                setDeletePassword("");
                                setShowDeleteConfirm(true);
                            }}
                        >
                            Delete My Account
                        </button>

                    ) : (

                        <div className="border border-danger rounded p-3">

                            <h6 className="fw-bold text-danger">
                                Are you absolutely sure?
                            </h6>

                            <p className="small text-muted">
                                This action cannot be undone.
                                Enter your current password to confirm.
                            </p>

                            {deleteError && (

                                <div className="alert alert-danger">
                                    {deleteError}
                                </div>

                            )}

                            <label className="form-label fw-semibold">
                                Current Password
                            </label>

                            <input
                                type="password"
                                className="form-control mb-3"
                                value={deletePassword}
                                onChange={(e) =>
                                    setDeletePassword(e.target.value)
                                }
                                placeholder="Enter your password"
                            />

                            <div className="d-flex gap-2">

                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setDeletePassword("");
                                        setDeleteError("");
                                    }}
                                    disabled={deletingAccount}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleDeleteAccount}
                                    disabled={deletingAccount}
                                >
                                    {deletingAccount
                                        ? "Deleting..."
                                        : "Permanently Delete Account"}
                                </button>

                            </div>

                        </div>

                    )}

                </div>

            </div>

        </CustomerLayout>

    );
}

export default Profile;