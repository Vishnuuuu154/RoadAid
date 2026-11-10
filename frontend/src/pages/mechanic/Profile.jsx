import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MechanicLayout, { useAvailability, useConfirm, useToast } from "../../layouts/MechanicLayout";
import {
    getMyProfile,
    updateMyProfile,
    getMyRequests,
    getMechanicReviews,
    getMechanicAverageRating
} from "../../services/mechanicService";
import api from "../../services/api";

import {
    FaPen,
    FaStar,
    FaStore,
    FaBriefcase,
    FaEnvelope,
    FaPhoneAlt,
    FaMapMarkerAlt,
    FaCheckCircle,
    FaRegCircle,
    FaHourglassHalf,
    FaExclamationTriangle,
    FaLocationArrow,
    FaRegCalendarAlt,
    FaUserShield,
    FaCamera,
    FaTrashAlt
} from "react-icons/fa";

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

const buildForm = (p) => ({
    workshopName: p?.workshopName || "",
    workshopAddress: p?.workshopAddress || "",
    experienceYears: p?.experienceYears ?? "",
    contactNumber: p?.contactNumber || ""
});

const FIELD_ORDER = ["workshopName", "contactNumber", "workshopAddress", "experienceYears"];

function validate(form) {
    const errors = {};
    const phone = form.contactNumber.trim();
    const digits = phone.replace(/\D/g, "");
    const years = Number(form.experienceYears);

    if (!form.workshopName.trim()) errors.workshopName = "Enter your workshop name.";
    if (!form.workshopAddress.trim()) errors.workshopAddress = "Enter your workshop address.";
    if (!/^\+?[\d\s\-()]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
        errors.contactNumber = "Enter a valid phone number, like +91 98765 43210.";
    }
    if (form.experienceYears === "" || !Number.isInteger(years) || years < 0 || years > 60) {
        errors.experienceYears = "Enter whole years, from 0 to 60.";
    }
    return errors;
}

const initials = (name) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "M";

const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

// Review objects are read defensively so a different field name never breaks the page.
const reviewText = (r) => r.comment || r.review || r.feedback || "";
const reviewer = (r) => r.customerName || r.customer?.fullName || r.user?.fullName || "Customer";

// Center-crops to a square and shrinks to a small JPEG so uploads stay light on mobile data.
function resizeImage(file, size = 480) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const side = Math.min(img.width, img.height);
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Unreadable image"));
        };
        img.src = url;
    });
}

function usePageFont() {
    useEffect(() => {
        if (document.getElementById("pf-font")) return;
        const link = document.createElement("link");
        link.id = "pf-font";
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap";
        document.head.appendChild(link);
    }, []);
}

/* ================================================================== */
/* Small components                                                    */
/* ================================================================== */

function Stars({ value }) {
    const rounded = Math.round(Number(value) || 0);
    return (
        <span className="pf-stars" role="img" aria-label={`${rounded} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <FaStar key={n} className={n <= rounded ? "is-on" : ""} aria-hidden="true" />
            ))}
        </span>
    );
}

function Row({ icon: Icon, label, children }) {
    return (
        <div className="pf-row">
            <span className="pf-row-icon"><Icon aria-hidden="true" /></span>
            <div className="pf-row-text">
                <dt>{label}</dt>
                <dd>{children}</dd>
            </div>
        </div>
    );
}

function Check({ ok, title, note, action }) {
    const Icon = ok ? FaCheckCircle : FaRegCircle;
    return (
        <li className="pf-check" data-ok={ok}>
            <Icon className="pf-check-icon" aria-hidden="true" />
            <div className="pf-check-text">
                <strong>{title}</strong>
                <span>{note}</span>
            </div>
            {action}
        </li>
    );
}

function Field({ id, label, error, hint, multiline, ...props }) {
    const Tag = multiline ? "textarea" : "input";
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
    return (
        <div className="pf-field">
            <label htmlFor={id}>{label}</label>
            <Tag id={id} name={id} aria-invalid={!!error} aria-describedby={describedBy} {...props} />
            {error ? (
                <p className="pf-msg pf-msg-error" id={`${id}-error`} role="alert">{error}</p>
            ) : (
                hint && <p className="pf-msg" id={`${id}-hint`}>{hint}</p>
            )}
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function ProfileContent() {
    usePageFont();
    const showToast = useToast();
    const confirm = useConfirm();
    const { online, approved, updating, locationError, toggleAvailability } = useAvailability();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState(buildForm(null));
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [stats, setStats] = useState({ rating: null, reviews: null, total: null, completed: null });

    const editBtn = useRef(null);
    const wasEditing = useRef(false);
    const fileInput = useRef(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [photo, setPhoto] = useState("");

    // Backend note: updateMyProfile must accept "profileImage" (a data URL string; "" removes it).
    const savePhoto = async (image, success) => {
        try {
            setPhotoBusy(true);

            const response = await api.put("/users/profile", {
                fullName: profile?.user?.fullName || "",
                phone: profile?.user?.phone || "",
                profileImage: image || null
            });

            setPhoto(response.data.profileImage || "");
            showToast(success, "success");
        } catch (err) {
            console.error("Failed to update photo:", err);
            showToast(
                err.response?.data?.message || "We couldn't update your photo. Try again.",
                "error"
            );
        } finally {
            setPhotoBusy(false);
        }
    };

    const handlePhotoPick = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            showToast("Choose a JPG, PNG or WebP image.", "error");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast("That image is over 10 MB. Choose a smaller one.", "error");
            return;
        }
        let image;
        try {
            image = await resizeImage(file);
        } catch {
            showToast("We couldn't read that image. Try a JPG or PNG.", "error");
            return;
        }
        savePhoto(image, "Profile photo updated.");
    };

    const removePhoto = async () => {
        const ok = await confirm({
            title: "Remove your photo?",
            message: "Customers will see your initials instead.",
            confirmLabel: "Remove"
        });
        if (ok) savePhoto("", "Profile photo removed.");
    };

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError("");

            const [mechanicResponse, userResponse] = await Promise.all([
                getMyProfile(),
                api.get("/users/profile")
            ]);

            setProfile(mechanicResponse.data);
            setForm(buildForm(mechanicResponse.data));
            setPhoto(userResponse.data.profileImage || "");
        } catch (err) {
            console.error("Failed to load mechanic profile:", err);
            setLoadError(err.response?.data?.message || "We couldn't load your profile.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Performance numbers. Any one failing just shows "—" instead of breaking the page.
    useEffect(() => {
        if (!profile?.id) return;
        let alive = true;
        Promise.allSettled([
            getMechanicAverageRating(profile.id),
            getMechanicReviews(profile.id),
            getMyRequests()
        ]).then(([rating, reviews, requests]) => {
            if (!alive) return;
            const list = requests.status === "fulfilled" && Array.isArray(requests.value.data) ? requests.value.data : null;
            const revs = reviews.status === "fulfilled" && Array.isArray(reviews.value.data) ? reviews.value.data : null;
            setStats({
                rating: rating.status === "fulfilled" ? Number(rating.value.data || 0) : null,
                reviews: revs,
                total: list ? list.length : null,
                completed: list ? list.filter((r) => ["COMPLETED", "CLOSED"].includes(r.status)).length : null
            });
        });
        return () => {
            alive = false;
        };
    }, [profile?.id]);

    // Move focus into the form when it opens, and back to the Edit button when it closes.
    useEffect(() => {
        if (editing) document.getElementById("workshopName")?.focus();
        else if (wasEditing.current) editBtn.current?.focus();
        wasEditing.current = editing;
    }, [editing]);

    const original = buildForm(profile);
    const dirty = Object.keys(original).some((k) => String(original[k]).trim() !== String(form[k]).trim());

    // Warn before the tab is closed with unsaved edits.
    useEffect(() => {
        if (!editing || !dirty) return;
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [editing, dirty]);

    const startEditing = () => {
        setForm(buildForm(profile));
        setErrors({});
        setSaveError("");
        setEditing(true);
        document.getElementById("pf-workshop")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    const cancelEditing = () => {
        if (saving) return;
        setForm(buildForm(profile));
        setErrors({});
        setSaveError("");
        setEditing(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const found = validate(form);
        setErrors(found);
        const firstBad = FIELD_ORDER.find((k) => found[k]);
        if (firstBad) {
            document.getElementById(firstBad)?.focus();
            return;
        }
        try {
            setSaving(true);
            setSaveError("");
            // Availability is controlled by the online switch, so it's passed through unchanged.
            const response = await updateMyProfile({
                workshopName: form.workshopName.trim(),
                workshopAddress: form.workshopAddress.trim(),
                experienceYears: Number(form.experienceYears),
                contactNumber: form.contactNumber.trim(),
                available: online,
                ...(photo ? { profileImage: photo } : {})
            });
            setProfile(response.data);
            setForm(buildForm(response.data));
            setEditing(false);
            showToast("Workshop details saved.", "success");
        } catch (err) {
            console.error("Failed to update profile:", err);
            setSaveError(err.response?.data?.message || "We couldn't save your changes. Try again.");
        } finally {
            setSaving(false);
        }
    };

    /* ----------------------------- states ---------------------------- */

    if (loading) {
        return (
            <div className="pf-page" aria-busy="true" aria-label="Loading profile">
                <style>{STYLES}</style>
                <div className="pf-state">
                    <div className="pf-skel" style={{ height: 210 }} />
                    <div className="pf-skel" style={{ height: 300 }} />
                </div>
            </div>
        );
    }

    if (loadError && !profile) {
        return (
            <div className="pf-page">
                <style>{STYLES}</style>
                <div className="pf-state">
                    <div className="pf-card pf-empty" role="alert">
                        <span className="pf-empty-icon"><FaExclamationTriangle aria-hidden="true" /></span>
                        <h1 className="pf-h2">We couldn't load your profile</h1>
                        <p>{loadError}</p>
                        <button type="button" className="pf-btn pf-btn-dark" onClick={load}>Try again</button>
                    </div>
                </div>
            </div>
        );
    }

    /* ----------------------------- derived --------------------------- */

    const name = profile?.user?.fullName || "Mechanic";
    const years = profile?.experienceYears ?? 0;
    const detailsComplete = !!(profile?.workshopName && profile?.workshopAddress && profile?.contactNumber);
    const locationOk = online && !locationError;
    const steps = [approved, detailsComplete, online, locationOk];
    const done = steps.filter(Boolean).length;

    const reviews = [...(stats.reviews || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const shownReviews = showAllReviews ? reviews : reviews.slice(0, 3);
    const hasRating = stats.rating !== null && stats.rating > 0;

    return (
        <div className="pf-page">
            <style>{STYLES}</style>

            <div className="pf-grid">
                {/* ---------------- Hero ---------------- */}
                <section className="pf-card pf-hero" aria-labelledby="pf-name">
                    <div className="pf-hero-top">
                        <div className="pf-avatar-wrap" aria-busy={photoBusy}>
                            <span className="pf-avatar" aria-hidden="true">
                                {photo ? <img src={photo} alt="" /> : initials(name)}
                            </span>
                            <button
                                type="button"
                                className="pf-avatar-btn"
                                onClick={() => fileInput.current?.click()}
                                disabled={photoBusy}
                                aria-label={photo ? "Change profile photo" : "Add profile photo"}
                            >
                                <FaCamera aria-hidden="true" />
                            </button>
                            {photo && (
                                <button
                                    type="button"
                                    className="pf-avatar-btn pf-avatar-remove"
                                    onClick={removePhoto}
                                    disabled={photoBusy}
                                    aria-label="Remove profile photo"
                                >
                                    <FaTrashAlt aria-hidden="true" />
                                </button>
                            )}
                            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhotoPick} />
                        </div>

                        <div className="pf-who">
                            <h1 className="pf-name" id="pf-name">{name}</h1>
                            <p className="pf-shop">{profile?.workshopName || "Independent mechanic"}</p>
                            <div className="pf-badges">
                                {approved ? (
                                    <span className="pf-badge pf-badge-ok"><FaCheckCircle aria-hidden="true" /> Verified</span>
                                ) : (
                                    <span className="pf-badge pf-badge-warn"><FaHourglassHalf aria-hidden="true" /> Pending verification</span>
                                )}
                                <span className={`pf-badge ${online ? "pf-badge-ok" : ""}`}>
                                    <span className="pf-dot" aria-hidden="true" /> {online ? "Online" : "Offline"}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className={`pf-btn pf-hero-cta ${online ? "pf-btn-danger" : "pf-btn-dark"}`}
                            onClick={toggleAvailability}
                            disabled={updating || !approved}
                        >
                            {updating ? "Updating…" : online ? "Go offline" : "Go online"}
                        </button>
                    </div>

                    {!approved && (
                        <p className="pf-notice" role="status">
                            <FaHourglassHalf aria-hidden="true" />
                            <span><strong>Waiting for approval.</strong> You can go online as soon as an admin verifies your account.</span>
                        </p>
                    )}

                    <div className="pf-stats">
                        <div className="pf-stat">
                            <span className="pf-stat-value">
                                <FaStar aria-hidden="true" className="pf-star-gold" />
                                {hasRating ? stats.rating.toFixed(1) : "—"}
                            </span>
                            <span className="pf-stat-label">
                                {stats.reviews?.length ? `${stats.reviews.length} ${stats.reviews.length === 1 ? "review" : "reviews"}` : "No reviews yet"}
                            </span>
                        </div>
                        <Link className="pf-stat pf-stat-link" to="/mechanic/requests?status=COMPLETED">
                            <span className="pf-stat-value">{stats.completed ?? "—"}</span>
                            <span className="pf-stat-label">Jobs completed</span>
                        </Link>
                        <div className="pf-stat">
                            <span className="pf-stat-value">{stats.total ?? "—"}</span>
                            <span className="pf-stat-label">Total requests</span>
                        </div>
                    </div>
                </section>

                {/* ---------------- Workshop (view / edit) ---------------- */}
                <section className="pf-card" id="pf-workshop" aria-labelledby="pf-workshop-title">
                    <div className="pf-card-head">
                        <h2 className="pf-h2" id="pf-workshop-title">Workshop details</h2>
                        {!editing && (
                            <button type="button" className="pf-btn pf-btn-sm" onClick={startEditing} ref={editBtn}>
                                <FaPen aria-hidden="true" /> Edit
                            </button>
                        )}
                    </div>

                    {!editing && !profile?.workshopName && !profile?.workshopAddress && !profile?.contactNumber && (
                        <div className="pf-empty pf-empty-inline">
                            <span className="pf-empty-icon"><FaStore aria-hidden="true" /></span>
                            <p>Add your workshop name, address and phone so customers can find and call you.</p>
                            <button type="button" className="pf-btn pf-btn-dark" onClick={startEditing}>Add workshop details</button>
                        </div>
                    )}

                    {!editing && (profile?.workshopName || profile?.workshopAddress || profile?.contactNumber) && (
                        <dl className="pf-rows">
                            <Row icon={FaStore} label="Workshop name">{profile?.workshopName || "Not added"}</Row>
                            <Row icon={FaPhoneAlt} label="Contact number">
                                {profile?.contactNumber ? (
                                    <a className="pf-link" href={`tel:${profile.contactNumber.replace(/[^\d+]/g, "")}`}>{profile.contactNumber}</a>
                                ) : "Not added"}
                            </Row>
                            <Row icon={FaMapMarkerAlt} label="Address">
                                {profile?.workshopAddress ? (
                                    <>
                                        {profile.workshopAddress}
                                        <a
                                            className="pf-link pf-link-sm"
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.workshopAddress)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <FaLocationArrow aria-hidden="true" /> Open in Maps<span className="pf-sr"> (opens in a new tab)</span>
                                        </a>
                                    </>
                                ) : "Not added"}
                            </Row>
                            <Row icon={FaBriefcase} label="Experience">{years} {years === 1 ? "year" : "years"}</Row>
                        </dl>
                    )}

                    {editing && (
                        <form onSubmit={handleSave} noValidate onKeyDown={(e) => e.key === "Escape" && cancelEditing()}>
                            {saveError && (
                                <p className="pf-notice pf-notice-danger" role="alert">
                                    <FaExclamationTriangle aria-hidden="true" /> <span>{saveError}</span>
                                </p>
                            )}
                            <div className="pf-form">
                                <Field id="workshopName" label="Workshop name" autoComplete="organization" value={form.workshopName} onChange={handleChange} disabled={saving} error={errors.workshopName} />
                                <Field id="contactNumber" label="Contact number" type="tel" inputMode="tel" autoComplete="tel" value={form.contactNumber} onChange={handleChange} disabled={saving} error={errors.contactNumber} hint="Customers can call this number." />
                                <div className="pf-span-2">
                                    <Field id="workshopAddress" label="Workshop address" multiline rows={3} autoComplete="street-address" value={form.workshopAddress} onChange={handleChange} disabled={saving} error={errors.workshopAddress} hint="Include area and landmark so customers can find you." />
                                </div>
                                <Field id="experienceYears" label="Years of experience" type="number" inputMode="numeric" min="0" max="60" step="1" value={form.experienceYears} onChange={handleChange} disabled={saving} error={errors.experienceYears} />
                            </div>
                            <div className="pf-actions">
                                <button type="button" className="pf-btn" onClick={cancelEditing} disabled={saving}>Cancel</button>
                                <button type="submit" className="pf-btn pf-btn-dark" disabled={saving || !dirty}>
                                    {saving ? "Saving…" : "Save changes"}
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                {/* ---------------- Readiness ---------------- */}
                <section className="pf-card" aria-labelledby="pf-ready-title">
                    <div className="pf-card-head">
                        <h2 className="pf-h2" id="pf-ready-title">Ready for jobs</h2>
                        <span className={`pf-badge ${done === 4 ? "pf-badge-ok" : ""}`}>{done === 4 ? "All set" : `${done} of 4`}</span>
                    </div>
                    <div className="pf-progress" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={4} aria-valuenow={done}>
                        <span style={{ width: `${(done / 4) * 100}%` }} />
                    </div>
                    <ul className="pf-checks">
                        <Check ok={approved} title="Account verified" note={approved ? "An admin approved your account." : "Waiting for admin approval."} />
                        <Check
                            ok={detailsComplete}
                            title="Workshop details added"
                            note={detailsComplete ? "Name, address and phone are saved." : "Add your workshop name, address and phone."}
                            action={!detailsComplete && !editing && <button type="button" className="pf-btn pf-btn-sm pf-btn-dark" onClick={startEditing}>Add</button>}
                        />
                        <Check
                            ok={online}
                            title="Online for requests"
                            note={online ? "Customers can find you." : approved ? "You're offline right now." : "Available after verification."}
                            action={!online && approved && <button type="button" className="pf-btn pf-btn-sm pf-btn-dark" onClick={toggleAvailability} disabled={updating}>Go online</button>}
                        />
                        <Check
                            ok={locationOk}
                            title="Live location"
                            note={!online ? "Turns on when you go online." : locationError ? "We can't read your location. Allow location access in your browser settings." : "Customers see your position during a job."}
                        />
                    </ul>
                </section>

                {/* ---------------- Reviews ---------------- */}
                <section className="pf-card" aria-labelledby="pf-reviews-title">
                    <div className="pf-card-head">
                        <h2 className="pf-h2" id="pf-reviews-title">Customer reviews</h2>
                        {hasRating && <span className="pf-rating"><Stars value={stats.rating} /> {stats.rating.toFixed(1)}</span>}
                    </div>

                    {reviews.length === 0 ? (
                        <div className="pf-empty pf-empty-inline">
                            <span className="pf-empty-icon"><FaStar aria-hidden="true" /></span>
                            <p>{stats.reviews === null ? "Reviews aren't available right now." : "No reviews yet. They appear here after you complete a job."}</p>
                        </div>
                    ) : (
                        <>
                            <ul className="pf-reviews">
                                {shownReviews.map((r, i) => (
                                    <li key={r.id ?? i} className="pf-review">
                                        <div className="pf-review-head">
                                            <strong>{reviewer(r)}</strong>
                                            {r.createdAt && <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>}
                                        </div>
                                        {r.rating != null && <Stars value={r.rating} />}
                                        {reviewText(r) && <p>{reviewText(r)}</p>}
                                    </li>
                                ))}
                            </ul>
                            {reviews.length > 3 && (
                                <button type="button" className="pf-btn pf-btn-sm pf-more" onClick={() => setShowAllReviews((v) => !v)} aria-expanded={showAllReviews}>
                                    {showAllReviews ? "Show fewer" : `Show all ${reviews.length} reviews`}
                                </button>
                            )}
                        </>
                    )}
                </section>

                {/* ---------------- Account ---------------- */}
                <section className="pf-card" aria-labelledby="pf-account-title">
                    <div className="pf-card-head">
                        <h2 className="pf-h2" id="pf-account-title">Account</h2>
                        <span className={`pf-badge ${profile?.user?.isActive ? "pf-badge-ok" : "pf-badge-warn"}`}>
                            {profile?.user?.isActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <dl className="pf-rows">
                        <Row icon={FaEnvelope} label="Email">{profile?.user?.email || "Not added"}</Row>
                        <Row icon={FaPhoneAlt} label="Phone">
                            {profile?.user?.phone ? (
                                <a className="pf-link" href={`tel:${profile.user.phone.replace(/[^\d+]/g, "")}`}>{profile.user.phone}</a>
                            ) : "Not added"}
                        </Row>
                        <Row icon={FaUserShield} label="Verification">{approved ? "Approved" : "Pending"}</Row>
                        <Row icon={FaRegCalendarAlt} label="Member since">{formatDate(profile?.user?.createdAt) || "Not available"}</Row>
                    </dl>
                </section>
            </div>
        </div>
    );
}

/* Self-contained styles. Only layout tokens (--rm-ink, --rm-border, ...) are reused. */
const STYLES = `
.pf-page { --pf-fill: #f1f4f8; --pf-fill-hover: #e5eaf1; --pf-font: "Manrope", var(--rm-font); max-width: 1080px; margin: 0 auto; font-family: var(--pf-font); }
.pf-page button, .pf-page input, .pf-page textarea { font-family: inherit; }
.pf-grid { display: grid; gap: 16px; align-items: start; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); grid-template-areas: "hero hero" "workshop ready" "reviews account"; }
.pf-grid > :nth-child(1) { grid-area: hero; }
.pf-grid > :nth-child(2) { grid-area: workshop; }
.pf-grid > :nth-child(3) { grid-area: ready; }
.pf-grid > :nth-child(4) { grid-area: reviews; }
.pf-grid > :nth-child(5) { grid-area: account; }
.pf-state { display: grid; gap: 16px; }

.pf-card { background: var(--rm-surface); border: 1px solid var(--rm-border); border-radius: 20px; padding: 24px; min-width: 0; }
.pf-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; margin-bottom: 14px; }
.pf-h2 { margin: 0; font-size: 20px; line-height: 1.25; font-weight: 800; letter-spacing: -.01em; color: var(--rm-ink); }

/* Buttons */
.pf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px; border: 0; border-radius: 999px; background: var(--pf-fill); color: var(--rm-ink); font-size: 15px; font-weight: 700; cursor: pointer; transition: background .15s, transform .05s; }
.pf-btn:hover:not(:disabled) { background: var(--pf-fill-hover); }
.pf-btn:active:not(:disabled) { transform: scale(.98); }
.pf-btn:disabled { opacity: .5; cursor: not-allowed; }
.pf-btn-dark { background: var(--rm-ink); color: #fff; }
.pf-btn-dark:hover:not(:disabled) { background: #1e293b; }
.pf-btn-danger { background: var(--rm-danger-soft); color: var(--rm-danger); }
.pf-btn-danger:hover:not(:disabled) { background: #fee2e2; }
.pf-btn-sm { min-height: 40px; padding: 0 16px; font-size: 14px; }

/* Hero */
.pf-hero { display: grid; gap: 22px; padding: 28px; }
.pf-hero-top { display: flex; flex-wrap: wrap; align-items: center; gap: 20px; }
.pf-avatar-wrap { position: relative; flex-shrink: 0; }
.pf-avatar-wrap[aria-busy="true"] .pf-avatar { opacity: .5; }
.pf-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pf-avatar-btn { position: absolute; right: -6px; bottom: -6px; width: 40px; height: 40px; display: grid; place-items: center; border: 3px solid var(--rm-surface); border-radius: 50%; background: var(--rm-ink); color: #fff; font-size: 14px; cursor: pointer; transition: background .15s, transform .05s; }
.pf-avatar-btn:hover:not(:disabled) { background: #1e293b; }
.pf-avatar-btn:active:not(:disabled) { transform: scale(.94); }
.pf-avatar-btn:disabled { cursor: progress; opacity: .7; }
.pf-avatar-remove { right: auto; left: -6px; background: var(--rm-danger-soft); color: var(--rm-danger); }
.pf-avatar-remove:hover:not(:disabled) { background: #fee2e2; }
.pf-avatar { overflow: hidden; width: 76px; height: 76px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: var(--rm-ink); color: #fff; font-size: 26px; font-weight: 800; letter-spacing: .02em; }
.pf-who { flex: 1; min-width: 220px; }
.pf-name { margin: 0; font-size: 32px; line-height: 1.15; font-weight: 800; letter-spacing: -.025em; color: var(--rm-ink); overflow-wrap: anywhere; }
.pf-shop { margin: 4px 0 12px; font-size: 16px; color: var(--rm-muted); }
.pf-hero-cta { min-width: 160px; min-height: 52px; font-size: 16px; }
.pf-badges { display: flex; flex-wrap: wrap; gap: 8px; }
.pf-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: var(--pf-fill); color: var(--rm-body); font-size: 13px; font-weight: 700; }
.pf-badge-ok { background: var(--rm-success-soft); color: var(--rm-success); }
.pf-badge-warn { background: var(--rm-warning-soft); color: var(--rm-warning); }
.pf-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

.pf-notice { display: flex; align-items: flex-start; gap: 12px; margin: 0; padding: 14px 16px; border-radius: 14px; background: var(--rm-warning-soft); color: var(--rm-warning); font-size: 14.5px; }
.pf-notice svg { flex-shrink: 0; margin-top: 3px; }
.pf-notice strong { color: var(--rm-ink); }
.pf-notice-danger { margin-bottom: 18px; background: var(--rm-danger-soft); color: var(--rm-danger); }

.pf-stats { display: grid; grid-template-columns: repeat(3, 1fr); padding-top: 22px; border-top: 1px solid var(--rm-border); }
.pf-stat { display: flex; flex-direction: column; gap: 2px; padding: 4px 20px; border-left: 1px solid var(--rm-border); border-radius: 12px; color: inherit; }
.pf-stat:first-child { padding-left: 0; border-left: 0; }
.pf-stat-value { display: inline-flex; align-items: center; gap: 8px; font-size: 32px; line-height: 1.15; font-weight: 800; letter-spacing: -.02em; color: var(--rm-ink); }
.pf-stat-value svg { font-size: 22px; }
.pf-star-gold { color: #f59e0b; }
.pf-stat-label { font-size: 14px; font-weight: 600; color: var(--rm-muted); }
.pf-page a.pf-stat-link:hover .pf-stat-label { color: var(--rm-ink); text-decoration: underline; }

/* Detail rows */
.pf-rows { display: grid; margin: 0; }
.pf-row { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--rm-border); }
.pf-row:first-child { padding-top: 0; }
.pf-row:last-child { padding-bottom: 0; border-bottom: 0; }
.pf-row-icon { width: 40px; height: 40px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; background: var(--pf-fill); color: var(--rm-ink); font-size: 15px; }
.pf-row-text { min-width: 0; }
.pf-row dt { font-size: 13.5px; font-weight: 600; color: var(--rm-muted); }
.pf-row dd { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin: 1px 0 0; font-size: 16px; font-weight: 700; color: var(--rm-ink); overflow-wrap: anywhere; }
.pf-page .pf-link { color: var(--rm-ink); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1.5px; }
.pf-page .pf-link-sm { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; font-size: 14px; font-weight: 700; color: var(--rm-primary); text-decoration: none; }
.pf-page .pf-link-sm:hover { text-decoration: underline; }
.pf-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Readiness */
.pf-progress { height: 8px; margin-bottom: 6px; border-radius: 999px; background: var(--pf-fill); overflow: hidden; }
.pf-progress span { display: block; height: 100%; border-radius: inherit; background: var(--rm-success); transition: width .3s ease; }
.pf-checks { list-style: none; margin: 0; padding: 0; }
.pf-check { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--rm-border); }
.pf-check:last-child { border-bottom: 0; padding-bottom: 0; }
.pf-check-icon { flex-shrink: 0; font-size: 22px; color: var(--rm-border-strong); }
.pf-check[data-ok="true"] .pf-check-icon { color: var(--rm-success); }
.pf-check-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pf-check-text strong { font-size: 15.5px; color: var(--rm-ink); }
.pf-check-text span { font-size: 14px; color: var(--rm-muted); }

/* Reviews */
.pf-rating { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; color: var(--rm-ink); }
.pf-stars { display: inline-flex; gap: 2px; font-size: 14px; color: var(--rm-border-strong); }
.pf-stars .is-on { color: #f59e0b; }
.pf-reviews { list-style: none; margin: 0; padding: 0; }
.pf-review { display: grid; gap: 4px; padding: 16px 0; border-bottom: 1px solid var(--rm-border); }
.pf-review:first-child { padding-top: 0; }
.pf-review:last-child { border-bottom: 0; }
.pf-review-head { display: flex; justify-content: space-between; gap: 10px; }
.pf-review-head strong { color: var(--rm-ink); }
.pf-review-head time { font-size: 13.5px; color: var(--rm-muted); }
.pf-review p { margin: 2px 0 0; max-width: 62ch; }
.pf-more { margin-top: 14px; }

/* Empty + error states */
.pf-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.pf-empty p { margin: 0; max-width: 42ch; }
.pf-empty-inline { padding: 12px 0 4px; }
.pf-empty-icon { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 50%; background: var(--pf-fill); color: var(--rm-ink); font-size: 22px; }
.pf-skel { border-radius: 20px; background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%); background-size: 200% 100%; animation: rm-shimmer 1.4s linear infinite; }

/* Form */
.pf-form { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.pf-span-2 { grid-column: 1 / -1; }
.pf-field label { display: block; margin-bottom: 6px; font-size: 14.5px; font-weight: 700; color: var(--rm-ink); }
.pf-field input, .pf-field textarea { width: 100%; padding: 0 16px; border: 2px solid transparent; border-radius: 14px; background: var(--pf-fill); font-size: 16px; font-weight: 600; color: var(--rm-ink); transition: border-color .15s, background .15s; }
.pf-field input { min-height: 52px; }
.pf-field textarea { padding: 14px 16px; min-height: 96px; resize: vertical; line-height: 1.5; }
.pf-field input:focus, .pf-field textarea:focus { outline: 0; border-color: var(--rm-ink); background: var(--rm-surface); }
.pf-field input:disabled, .pf-field textarea:disabled { opacity: .6; }
.pf-field [aria-invalid="true"] { border-color: var(--rm-danger); background: var(--rm-danger-soft); }
.pf-msg { margin: 6px 0 0; font-size: 13.5px; color: var(--rm-muted); }
.pf-msg-error { color: var(--rm-danger); font-weight: 600; }
.pf-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }

/* Tablet + mobile */
@media (max-width: 900px) {
    .pf-grid { grid-template-columns: minmax(0, 1fr); grid-template-areas: "hero" "ready" "workshop" "reviews" "account"; }
}
@media (max-width: 640px) {
    .pf-card { padding: 20px; border-radius: 18px; }
    .pf-hero { padding: 20px; }
    .pf-avatar { width: 64px; height: 64px; font-size: 22px; }
    .pf-name { font-size: 26px; }
    .pf-hero-cta { width: 100%; }
    .pf-stat { padding: 4px 12px; }
    .pf-stat-value { font-size: 24px; }
    .pf-stat-value svg { font-size: 17px; }
    .pf-stat-label { font-size: 12.5px; }
    .pf-form { grid-template-columns: 1fr; }
    .pf-actions .pf-btn { flex: 1; }
}
`;

function Profile() {
    return (
        <MechanicLayout>
            <ProfileContent />
        </MechanicLayout>
    );
}

export default Profile;