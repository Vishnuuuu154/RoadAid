import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const MIN_PASSWORD_LENGTH = 6;
const MAX_PHOTO_INPUT_BYTES = 5 * 1024 * 1024; // photos are resized before upload
const PHOTO_MAX_SIDE = 512;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join("");
};

const formatDate = (date, options) =>
    date ? new Date(date).toLocaleDateString("en-IN", options) : "—";

// Shrinks a picked photo to a small square-ish JPEG so the upload stays light.
const resizeImage = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("read"));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("decode"));
            img.onload = () => {
                const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
                const width = Math.round(img.width * scale);
                const height = Math.round(img.height * scale);
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });

const passwordStrength = (value) => {
    if (!value) return { score: 0, label: "" };
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    if (value.length < MIN_PASSWORD_LENGTH) score = Math.min(score, 1);
    return { score, label: ["Too weak", "Weak", "Fair", "Good", "Strong"][score] };
};

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Avatar({ src, name, size = 96 }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    return (
        <span
            className="pf-avatar"
            style={{ width: size, height: size, fontSize: size * 0.34 }}
        >
            {src && !failed ? (
                <img src={src} alt={`${name || "Your"} profile`} onError={() => setFailed(true)} />
            ) : (
                <span aria-hidden="true">{getInitials(name)}</span>
            )}
        </span>
    );
}

function Card({ title, subtitle, children, className = "" }) {
    return (
        <section className={`pf-card ${className}`}>
            <header>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
            </header>
            {children}
        </section>
    );
}

function Alert({ children }) {
    return (
        <div className="pf-alert" role="alert">
            <i className="bi bi-exclamation-circle-fill" />
            <span>{children}</span>
        </div>
    );
}

function Field({ id, label, hint, children }) {
    return (
        <div className="pf-field">
            <label htmlFor={id}>{label}</label>
            {children}
            {hint && <small>{hint}</small>}
        </div>
    );
}

function PasswordField({ id, label, value, onChange, autoComplete, hint, autoFocus }) {
    const [visible, setVisible] = useState(false);

    return (
        <Field id={id} label={label} hint={hint}>
            <div className="pf-password">
                <input
                    id={id}
                    autoFocus={autoFocus}
                    type={visible ? "text" : "password"}
                    value={value}
                    onChange={onChange}
                    autoComplete={autoComplete}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                >
                    <i className={`bi ${visible ? "bi-eye-slash" : "bi-eye"}`} />
                </button>
            </div>
        </Field>
    );
}

function Rule({ ok, children }) {
    return (
        <li className={ok ? "ok" : ""}>
            <i className={`bi ${ok ? "bi-check-circle-fill" : "bi-circle"}`} aria-hidden="true" />
            {children}
        </li>
    );
}

function Modal({ titleId, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [onClose]);

    return (
        <div
            className="pf-overlay"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="pf-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                {children}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Profile() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [profileImage, setProfileImage] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const [toast, setToast] = useState("");

    useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(""), 3200);
        return () => clearTimeout(timer);
    }, [toast]);

    const applyProfile = useCallback((data) => {
        setProfile(data);
        setFullName(data.fullName || "");
        setPhone(data.phone || "");
        setProfileImage(data.profileImage || "");
    }, []);

    const loadProfile = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError("");

            const response = await api.get("/users/profile");
            applyProfile(response.data);
        } catch (error) {
            console.error("Failed to load profile:", error);
            setLoadError(error.response?.data?.message || "Failed to load profile.");
        } finally {
            setLoading(false);
        }
    }, [applyProfile]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    /* ---------- Personal information ---------- */

    const dirty =
        profile !== null &&
        (fullName.trim() !== (profile.fullName || "") ||
            phone.trim() !== (profile.phone || "") ||
            (profileImage || "") !== (profile.profileImage || ""));

    const discardChanges = () => {
        applyProfile(profile);
        setProfileError("");
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileError("");

        const digits = phone.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) {
            setProfileError("Enter a valid phone number.");
            return;
        }

        try {
            setSaving(true);

            const response = await api.put("/users/profile", {
                fullName: fullName.trim(),
                phone: phone.trim(),
                profileImage: profileImage || null,
            });

            applyProfile({ ...profile, ...response.data });
            setToast("Profile updated");
        } catch (error) {
            console.error("Failed to update profile:", error);
            setProfileError(error.response?.data?.message || "Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    const handleProfileImageChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // lets the same file be picked again later
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setProfileError("Please select a valid image file.");
            return;
        }

        if (file.size > MAX_PHOTO_INPUT_BYTES) {
            setProfileError("Profile photo must be smaller than 5 MB.");
            return;
        }

        try {
            setProfileImage(await resizeImage(file));
            setProfileError("");
        } catch {
            setProfileError("We couldn’t read that image. Try a different one.");
        }
    };

    /* ---------- Password ---------- */

    const strength = passwordStrength(newPassword);
    const rules = {
        length: newPassword.length >= MIN_PASSWORD_LENGTH,
        different: Boolean(newPassword) && newPassword !== currentPassword,
        match: Boolean(newPassword) && newPassword === confirmPassword,
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPasswordError("");

        if (!currentPassword || !newPassword) {
            setPasswordError("Please fill in all password fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }

        if (newPassword === currentPassword) {
            setPasswordError("Your new password must be different from the current one.");
            return;
        }

        try {
            setChangingPassword(true);

            await api.put("/users/change-password", { currentPassword, newPassword });

            setToast("Password changed");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            console.error("Failed to change password:", error);
            setPasswordError(error.response?.data?.message || "Failed to change password.");
        } finally {
            setChangingPassword(false);
        }
    };

    /* ---------- Logout & delete ---------- */

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    const openDelete = () => {
        setDeleteError("");
        setDeletePassword("");
        setDeleteOpen(true);
    };

    const closeDelete = useCallback(() => {
        setDeleteOpen(false);
        setDeletePassword("");
        setDeleteError("");
    }, []);

    const handleDeleteAccount = async (e) => {
        e.preventDefault();

        if (!deletePassword) {
            setDeleteError("Please enter your password.");
            return;
        }

        try {
            setDeletingAccount(true);
            setDeleteError("");

            await api.put("/users/delete-account", { password: deletePassword });

            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/");
        } catch (error) {
            console.error("Failed to delete account:", error);
            setDeleteError(error.response?.data?.message || "Unable to delete your account.");
        } finally {
            setDeletingAccount(false);
        }
    };

    /* ---------- Loading & error ---------- */

    if (loading) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <div className="pf" aria-busy="true" aria-label="Loading profile">
                    <div className="pf-wrap">
                        <div className="pf-skel">
                            <i style={{ width: "100%", height: 150 }} />
                            <i style={{ width: "100%", height: 320 }} />
                            <i style={{ width: "100%", height: 240 }} />
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    if (!profile) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <div className="pf">
                    <div className="pf-wrap">
                        <div className="pf-empty">
                            <div className="pf-empty-icon">
                                <i className="bi bi-wifi-off" />
                            </div>
                            <h2>Couldn’t load your profile</h2>
                            <p>{loadError || "Unable to load profile."}</p>
                            <button type="button" className="pf-btn dark" onClick={loadProfile}>
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        );
    }

    const isActive = profile.isActive !== false;

    return (
        <CustomerLayout>
            <style>{css}</style>

            <div className="pf">
                <div className="pf-wrap">
                    {/* Identity */}
                    <header className="pf-identity">
                        <Avatar src={profile.profileImage} name={profile.fullName} size={96} />

                        <div className="pf-identity-text">
                            <h1>{profile.fullName}</h1>
                            <p>{profile.email}</p>
                            <div className="pf-tags">
                                <span className="pf-tag">Customer</span>
                                <span className={`pf-tag ${isActive ? "ok" : "off"}`}>
                                    <i /> {isActive ? "Active" : "Inactive"}
                                </span>
                                <span className="pf-tag">
                                    Member since{" "}
                                    {formatDate(profile.createdAt, { month: "short", year: "numeric" })}
                                </span>
                            </div>
                        </div>

                        <button type="button" className="pf-btn light" onClick={handleLogout}>
                            <i className="bi bi-box-arrow-right" /> Log out
                        </button>
                    </header>

                    {/* Personal information */}
                    <Card title="Personal information" subtitle="This is how you appear to mechanics.">
                        <form onSubmit={handleProfileUpdate} noValidate>
                            <div className="pf-photo">
                                <Avatar src={profileImage} name={fullName || profile.fullName} size={72} />
                                <div>
                                    <strong>Profile photo</strong>
                                    <p>Any photo works. We resize it for you.</p>
                                    <div className="pf-row">
                                        <span className="pf-file">
                                            <label htmlFor="pf-photo" className="pf-btn light sm">
                                                <i className="bi bi-camera-fill" />
                                                {profileImage ? "Change photo" : "Add photo"}
                                            </label>
                                            <input
                                                id="pf-photo"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleProfileImageChange}
                                            />
                                        </span>
                                        {profileImage && (
                                            <button
                                                type="button"
                                                className="pf-btn plain sm"
                                                onClick={() => setProfileImage("")}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {profileError && <Alert>{profileError}</Alert>}

                            <div className="pf-grid">
                                <Field id="pf-name" label="Full name">
                                    <input
                                        id="pf-name"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        autoComplete="name"
                                        required
                                    />
                                </Field>

                                <Field id="pf-phone" label="Phone number">
                                    <input
                                        id="pf-phone"
                                        type="tel"
                                        inputMode="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        autoComplete="tel"
                                        required
                                    />
                                </Field>

                                <Field id="pf-email" label="Email" hint="Email can’t be changed here.">
                                    <div className="pf-locked">
                                        <input
                                            id="pf-email"
                                            type="email"
                                            value={profile.email || ""}
                                            disabled
                                        />
                                        <i className="bi bi-lock-fill" aria-hidden="true" />
                                    </div>
                                </Field>
                            </div>

                            <div className="pf-actions">
                                {dirty && <span className="pf-unsaved">Unsaved changes</span>}
                                <button
                                    type="button"
                                    className="pf-btn light"
                                    onClick={discardChanges}
                                    disabled={!dirty || saving}
                                >
                                    Discard
                                </button>
                                <button
                                    type="submit"
                                    className="pf-btn dark"
                                    disabled={!dirty || saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="pf-spinner" aria-hidden="true" /> Saving…
                                        </>
                                    ) : (
                                        "Save changes"
                                    )}
                                </button>
                            </div>
                        </form>
                    </Card>

                    {/* Password */}
                    <Card title="Password" subtitle="Use a password you don’t use anywhere else.">
                        <form onSubmit={handlePasswordChange} noValidate>
                            {passwordError && <Alert>{passwordError}</Alert>}

                            <div className="pf-grid">
                                <PasswordField
                                    id="pf-current"
                                    label="Current password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <span className="pf-spacer" aria-hidden="true" />

                                <PasswordField
                                    id="pf-new"
                                    label="New password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                                <PasswordField
                                    id="pf-confirm"
                                    label="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                            </div>

                            {newPassword && (
                                <div className="pf-strength" aria-live="polite">
                                    <div className={`pf-meter s${strength.score}`} aria-hidden="true">
                                        {[1, 2, 3, 4].map((n) => (
                                            <i key={n} className={n <= Math.max(strength.score, 1) ? "on" : ""} />
                                        ))}
                                    </div>
                                    <span>Password strength: {strength.label}</span>
                                </div>
                            )}

                            {newPassword && (
                                <ul className="pf-rules">
                                    <Rule ok={rules.length}>At least {MIN_PASSWORD_LENGTH} characters</Rule>
                                    <Rule ok={rules.different}>Different from your current password</Rule>
                                    <Rule ok={rules.match}>Matches the confirmation</Rule>
                                </ul>
                            )}

                            <div className="pf-actions">
                                <button
                                    type="submit"
                                    className="pf-btn dark"
                                    disabled={changingPassword}
                                >
                                    {changingPassword ? (
                                        <>
                                            <span className="pf-spinner" aria-hidden="true" /> Changing…
                                        </>
                                    ) : (
                                        "Change password"
                                    )}
                                </button>
                            </div>
                        </form>
                    </Card>

                    {/* Account details */}
                    <Card title="Account details">
                        <dl className="pf-facts">
                            <div>
                                <dt>Status</dt>
                                <dd>
                                    <span className={`pf-tag ${isActive ? "ok" : "off"}`}>
                                        <i /> {isActive ? "Active" : "Inactive"}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt>Account type</dt>
                                <dd>Customer</dd>
                            </div>
                            <div>
                                <dt>Member since</dt>
                                <dd>{formatDate(profile.createdAt, { dateStyle: "medium" })}</dd>
                            </div>
                        </dl>
                    </Card>

                    {/* Danger zone */}
                    <Card
                        title="Delete account"
                        subtitle="Permanently remove your RoadAid account. Your completed service history is kept, but your personal information is removed."
                        className="pf-danger"
                    >
                        <button type="button" className="pf-btn danger-outline" onClick={openDelete}>
                            Delete my account
                        </button>
                    </Card>
                </div>
            </div>

            {deleteOpen && (
                <Modal titleId="pf-delete-title" onClose={deletingAccount ? () => {} : closeDelete}>
                    <form onSubmit={handleDeleteAccount} noValidate>
                        <div className="pf-modal-body">
                            <div className="pf-modal-icon">
                                <i className="bi bi-exclamation-triangle-fill" />
                            </div>
                            <h2 id="pf-delete-title">Delete your account?</h2>
                            <p>
                                This can’t be undone. Enter your current password to confirm.
                            </p>

                            {deleteError && <Alert>{deleteError}</Alert>}

                            <PasswordField
                                id="pf-delete-password"
                                label="Current password"
                                value={deletePassword}
                                onChange={(e) => {
                                    setDeletePassword(e.target.value);
                                    if (deleteError) setDeleteError("");
                                }}
                                autoComplete="current-password"
                                autoFocus
                            />
                        </div>
                        <div className="pf-modal-foot">
                            <button
                                type="button"
                                className="pf-btn light"
                                onClick={closeDelete}
                                disabled={deletingAccount}
                            >
                                Keep my account
                            </button>
                            <button type="submit" className="pf-btn danger" disabled={deletingAccount}>
                                {deletingAccount ? (
                                    <>
                                        <span className="pf-spinner" aria-hidden="true" /> Deleting…
                                    </>
                                ) : (
                                    "Delete account"
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {toast && (
                <div className="pf-toast" role="status">
                    <i className="bi bi-check-circle-fill" /> {toast}
                </div>
            )}
        </CustomerLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Styles (scoped under .pf / .pf-*)                                   */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.pf, .pf-overlay, .pf-toast{
  --ink:#000; --fog:#f6f6f6; --line:#e2e2e2; --mute:#5e5e5e;
  --blue:#276ef1; --green:#05944f; --red:#e11900; --amber:#b86e00;
  font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:var(--ink); -webkit-font-smoothing:antialiased;
}
.pf{background:#fff;min-height:100%;padding:32px 24px 64px}
.pf-wrap{max-width:780px;margin:0 auto}
.pf *,.pf-overlay *{box-sizing:border-box}
.pf h1,.pf h2,.pf p,.pf dl,.pf dd,.pf ul,.pf-overlay h2,.pf-overlay p{margin:0;padding:0}
.pf button,.pf-overlay button{font-family:inherit;cursor:pointer}
.pf :focus-visible,.pf-overlay :focus-visible{outline:3px solid var(--blue);outline-offset:2px}

/* Identity */
.pf-identity{display:flex;align-items:center;gap:20px;margin-bottom:28px}
.pf-identity-text{flex:1;min-width:0}
.pf-identity h1{font-size:clamp(1.7rem,4vw,2.4rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;overflow-wrap:anywhere}
.pf-identity p{margin-top:4px;color:var(--mute);overflow-wrap:anywhere}
.pf-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.pf-tag{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;background:var(--fog);font-size:.8rem;font-weight:700}
.pf-tag i{width:8px;height:8px;border-radius:50%;background:currentColor}
.pf-tag.ok{color:var(--green);background:#e6f6ee}
.pf-tag.off{color:var(--red);background:#fde8e5}

.pf-avatar{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:var(--ink);color:#fff;font-weight:800;overflow:hidden}
.pf-avatar img{width:100%;height:100%;object-fit:cover;display:block}

/* Cards */
.pf-card{margin-bottom:20px;padding:28px;border:1px solid var(--line);border-radius:20px;background:#fff}
.pf-card > header{margin-bottom:22px}
.pf-card h2{font-size:1.2rem;font-weight:800;letter-spacing:-.02em}
.pf-card > header p{margin-top:4px;color:var(--mute);font-size:.92rem;line-height:1.5;max-width:62ch}

/* Photo */
.pf-photo{display:flex;align-items:center;gap:18px;margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--line)}
.pf-photo strong{display:block;font-size:.98rem}
.pf-photo p{margin:2px 0 12px;color:var(--mute);font-size:.86rem}
.pf-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.pf-file{position:relative;display:inline-flex}
.pf-file input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.pf-file:focus-within label{outline:3px solid var(--blue);outline-offset:2px}

/* Forms */
.pf-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 18px}
.pf-spacer{display:block}
.pf-field label{display:block;margin-bottom:6px;font-size:.86rem;font-weight:700}
.pf-field input{width:100%;height:52px;padding:0 16px;border:2px solid transparent;border-radius:12px;background:var(--fog);font:inherit;font-size:.96rem;color:var(--ink);transition:border-color .15s,background .15s}
.pf-field input:focus{outline:none;border-color:var(--ink);background:#fff}
.pf-field input:disabled{color:var(--mute);cursor:not-allowed}
.pf-field small{display:block;margin-top:5px;color:var(--mute);font-size:.78rem}
.pf-locked,.pf-password{position:relative}
.pf-locked input{padding-right:44px}
.pf-locked i{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:var(--mute)}
.pf-password input{padding-right:52px}
.pf-password button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:40px;height:40px;border:0;border-radius:50%;background:transparent;color:var(--mute);font-size:1.05rem}
.pf-password button:hover{background:#e8e8e8;color:var(--ink)}
.pf-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:26px}
.pf-unsaved{margin-right:auto;color:var(--amber);font-size:.86rem;font-weight:700}

/* Password helper */
.pf-strength{display:flex;align-items:center;gap:12px;margin-top:20px;font-size:.86rem;font-weight:600;color:var(--mute)}
.pf-meter{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;width:120px}
.pf-meter i{height:5px;border-radius:99px;background:#e2e2e2}
.pf-meter.s0 i.on,.pf-meter.s1 i.on{background:var(--red)}
.pf-meter.s2 i.on{background:#e8a200}
.pf-meter.s3 i.on,.pf-meter.s4 i.on{background:var(--green)}
.pf-rules{list-style:none;display:grid;gap:8px;margin-top:14px}
.pf-rules li{display:flex;align-items:center;gap:10px;color:var(--mute);font-size:.88rem}
.pf-rules li.ok{color:var(--green);font-weight:600}

/* Account details */
.pf-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.pf-facts dt{margin-bottom:6px;color:var(--mute);font-size:.84rem;font-weight:600}
.pf-facts dd{font-weight:700}

/* Danger */
.pf-danger{border-color:#f3c4be}
.pf-danger h2{color:var(--red)}

/* Buttons */
.pf-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 24px;border:0;border-radius:999px;font-size:.94rem;font-weight:700;transition:background .15s,transform .1s;white-space:nowrap}
.pf-btn:active:not(:disabled){transform:scale(.98)}
.pf-btn:disabled{opacity:.45;cursor:not-allowed}
.pf-btn.sm{min-height:40px;padding:0 16px;font-size:.86rem}
.pf-btn.dark{background:var(--ink);color:#fff}
.pf-btn.dark:hover:not(:disabled){background:#2b2b2b}
.pf-btn.light{background:var(--fog);color:var(--ink)}
.pf-btn.light:hover:not(:disabled){background:#e8e8e8}
.pf-btn.plain{background:transparent;color:var(--red)}
.pf-btn.plain:hover{background:#fde8e5}
.pf-btn.danger{background:var(--red);color:#fff}
.pf-btn.danger:hover:not(:disabled){background:#b81400}
.pf-btn.danger-outline{background:#fff;color:var(--red);box-shadow:inset 0 0 0 2px var(--red)}
.pf-btn.danger-outline:hover{background:#fde8e5}
.pf-spinner{width:16px;height:16px;border:2px solid #ffffff55;border-top-color:#fff;border-radius:50%;animation:pf-spin .7s linear infinite}
@keyframes pf-spin{to{transform:rotate(360deg)}}

.pf-alert{display:flex;gap:10px;align-items:flex-start;margin-bottom:18px;padding:14px 16px;border-radius:12px;background:#fde8e5;color:#8c1000;font-size:.92rem;font-weight:600}
.pf-alert i{margin-top:2px}

/* Empty & skeleton */
.pf-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:64px 24px;border-radius:20px;background:var(--fog);text-align:center}
.pf-empty-icon{width:72px;height:72px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;border-radius:50%;background:var(--red);color:#fff;font-size:1.9rem}
.pf-empty h2{font-size:1.4rem;font-weight:800;letter-spacing:-.02em}
.pf-empty p{max-width:42ch;margin-bottom:14px;color:var(--mute)}
.pf-skel{display:grid;gap:18px}
.pf-skel i{display:block;border-radius:20px;background:linear-gradient(90deg,#eee 25%,#f7f7f7 50%,#eee 75%);background-size:200% 100%;animation:pf-shimmer 1.4s infinite}
@keyframes pf-shimmer{to{background-position:-200% 0}}

/* Modal */
.pf-overlay{position:fixed;inset:0;z-index:1055;display:flex;align-items:flex-end;justify-content:center;background:#00000099;overflow-y:auto}
.pf-modal{width:100%;max-width:460px;max-height:100%;overflow-y:auto;background:#fff;border-radius:24px 24px 0 0;animation:pf-sheet .22s ease-out}
@keyframes pf-sheet{from{transform:translateY(24px);opacity:0}}
.pf-modal-body{padding:32px 28px 8px;text-align:center}
.pf-modal-body h2{font-size:1.5rem;font-weight:800;letter-spacing:-.025em}
.pf-modal-body > p{margin:8px 0 22px;color:var(--mute);line-height:1.5}
.pf-modal-body .pf-field{text-align:left}
.pf-modal-body .pf-alert{text-align:left}
.pf-modal-icon{width:64px;height:64px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;border-radius:50%;background:#fde8e5;color:var(--red);font-size:1.6rem}
.pf-modal-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 28px 28px}

/* Toast */
.pf-toast{position:fixed;left:50%;bottom:28px;z-index:1070;transform:translateX(-50%);display:flex;align-items:center;gap:10px;max-width:calc(100% - 32px);padding:14px 22px;border-radius:999px;background:var(--ink);color:#fff;font-size:.92rem;font-weight:600;box-shadow:0 10px 30px #0004;animation:pf-sheet .2s ease-out}
.pf-toast i{color:#2fd27f}

@media(min-width:640px){
  .pf-overlay{align-items:center;padding:24px}
  .pf-modal{border-radius:24px}
}
@media(max-width:720px){
  .pf{padding:20px 16px 56px}
  .pf-identity{flex-wrap:wrap}
  .pf-identity .pf-btn{width:100%}
  .pf-card{padding:22px;border-radius:16px}
  .pf-grid{grid-template-columns:1fr}
  .pf-spacer{display:none}
  .pf-facts{grid-template-columns:1fr;gap:16px}
}
@media(max-width:520px){
  .pf-actions{flex-wrap:wrap}
  .pf-actions .pf-btn{flex:1}
  .pf-unsaved{flex-basis:100%}
  .pf-modal-foot .pf-btn{flex:1}
}
@media(prefers-reduced-motion:reduce){
  .pf *,.pf-overlay *,.pf-toast{animation:none!important;transition:none!important}
}
`;

export default Profile;