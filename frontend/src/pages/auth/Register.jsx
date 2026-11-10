import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    User,
    Mail,
    Phone,
    Building2,
    MapPin,
    Wrench,
    Car,
    Truck,
    Users,
    Hash,
    ShieldCheck,
    Clock,
    ArrowRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Briefcase,
    Check,
    UploadCloud,
    FileText,
    X,
    Pencil,
} from "lucide-react";
import "./../../styles/auth.css";
import "../../styles/Register.css";
import api from "../../services/api";
import { submitTowingProviderApplication } from "../../services/towingProviderService";
import AuthLayout from "./components/AuthLayout";
import PasswordInput from "./components/PasswordInput";
import PasswordStrength from "./components/PasswordStrength";
import StatusMessage from "./components/StatusMessage";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PIN_RE = /^\d{6}$/;

const MAX_FILE_MB = 5;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
const ALLOWED_EXT_LABEL = "PDF, JPG or PNG";
const FILE_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/*
 * The flow, driven entirely by role:
 *   role -> account -> workshop                         (mechanic)
 *   role -> account -> business -> documents -> review   (towing provider)
 *   role -> account                                      (customer)
 * Linking to /register?role=mechanic, ?role=customer or ?role=towing_provider
 * skips the first screen.
 */
const ROLE_STEPS = {
    CUSTOMER: ["account"],
    MECHANIC: ["account", "workshop"],
    TOWING_PROVIDER: ["account", "business", "documents", "review"],
};

const STEP_FIELDS = {
    account: ["fullName", "email", "phone", "password", "confirmPassword", "terms"],
    workshop: ["workshopName", "workshopAddress", "experienceYears", "contactNumber"],
    business: ["businessName", "businessType", "businessAddress", "district", "pinCode", "alternateContact"],
    documents: ["ownerIdProof", "businessAddressProof"],
};

const ROLES = [
    {
        value: "CUSTOMER",
        icon: Car,
        title: "I need roadside help",
        description: "Break-downs, flat tyres, dead batteries. Get a mechanic to you.",
        perks: [
            "Request help in a couple of minutes",
            "See a clear price before work begins",
            "Follow your mechanic to your location",
        ],
        note: null,
    },
    {
        value: "MECHANIC",
        icon: Wrench,
        title: "I'm a mechanic",
        description: "Offer your skills and get requests from drivers near your workshop.",
        perks: [
            "Receive requests from nearby drivers",
            "Send quotes and set your own prices",
            "Go online only when you want to work",
        ],
        note: "Our team reviews your workshop before you go live.",
    },
    {
        value: "TOWING_PROVIDER",
        icon: Truck,
        title: "I have a tow truck",
        description: "Offer towing services and get dispatched to breakdowns near your district.",
        perks: [
            "Receive dispatches from nearby breakdowns",
            "Register your towing vehicles from your dashboard",
            "Go online only when you want to work",
        ],
        note: "Our team reviews your business before you go live.",
    },
];

const initialValues = {
    role: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
    // mechanic
    workshopName: "",
    workshopAddress: "",
    experienceYears: "",
    sameContact: true,
    contactNumber: "",
    // towing provider
    businessName: "",
    businessType: "",
    businessAddress: "",
    district: "",
    pinCode: "",
    alternateContact: "",
    ownerIdProof: null,
    businessRegCert: null,
    businessAddressProof: null,
};

/* One validator per field. Each returns an error message, or "" when the value is fine. */
const VALIDATORS = {
    fullName: (v) => {
        const name = v.fullName.trim();
        if (!name) return "Enter your full name.";
        if (name.length < 2) return "That name looks too short.";
        return "";
    },
    email: (v) => {
        const email = v.email.trim();
        if (!email) return "Enter your email address.";
        if (!EMAIL_RE.test(email)) return "Enter a valid email, like you@example.com.";
        return "";
    },
    phone: (v) => {
        if (!v.phone) return "Enter your mobile number.";
        if (!PHONE_RE.test(v.phone)) return "Use 10 digits, starting with 6, 7, 8 or 9.";
        return "";
    },
    password: (v) => {
        if (!v.password) return "Create a password.";
        if (v.password.length < 8) return "Use at least 8 characters.";
        return "";
    },
    confirmPassword: (v) => {
        if (!v.confirmPassword) return "Re-enter your password.";
        if (v.confirmPassword !== v.password) return "The passwords don't match.";
        return "";
    },
    terms: (v) => (v.terms ? "" : "Please accept the terms to continue."),

    // mechanic
    workshopName: (v) => (v.workshopName.trim() ? "" : "Enter your workshop's name."),
    workshopAddress: (v) => {
        const address = v.workshopAddress.trim();
        if (!address) return "Enter your workshop's address.";
        if (address.length < 10) return "Add the street, city and PIN code.";
        return "";
    },
    experienceYears: (v) => {
        if (v.experienceYears === "") return "Enter your years of experience.";
        const years = Number(v.experienceYears);
        if (!Number.isInteger(years) || years < 0) return "Use a whole number, like 5.";
        if (years > 60) return "That looks too high. Please check it.";
        return "";
    },
    contactNumber: (v) => {
        if (v.sameContact) return "";
        if (!v.contactNumber) return "Enter the workshop's contact number.";
        if (!PHONE_RE.test(v.contactNumber)) return "Use 10 digits, starting with 6, 7, 8 or 9.";
        return "";
    },

    // towing provider
    businessName: (v) => {
        const name = v.businessName.trim();
        if (!name) return "Enter your business or company name.";
        if (name.length < 2) return "That name looks too short.";
        return "";
    },
    businessType: (v) => (v.businessType ? "" : "Select a business type."),
    businessAddress: (v) => {
        const address = v.businessAddress.trim();
        if (!address) return "Enter your business address.";
        if (address.length < 10) return "Add the street, city and PIN code.";
        return "";
    },
    district: (v) => (v.district.trim() ? "" : "Enter your district."),
    pinCode: (v) => {
        if (!v.pinCode) return "Enter your PIN code.";
        if (!PIN_RE.test(v.pinCode)) return "Enter a valid 6-digit PIN code.";
        return "";
    },
    alternateContact: (v) => {
        if (!v.alternateContact) return "";
        if (!PHONE_RE.test(v.alternateContact)) return "Use 10 digits, starting with 6, 7, 8 or 9.";
        return "";
    },
    ownerIdProof: (v) => {
        if (!v.ownerIdProof) return "Upload your identity proof.";
        return validateFile(v.ownerIdProof);
    },
    businessRegCert: (v) => validateFile(v.businessRegCert),
    businessAddressProof: (v) => {
        if (!v.businessAddressProof) return "Upload a business address proof.";
        return validateFile(v.businessAddressProof);
    },
};

const digitsOnly = (value) => value.replace(/\D/g, "").slice(0, 10);
const pinDigitsOnly = (value) => value.replace(/\D/g, "").slice(0, 6);

const parseRole = (value) => {
    const role = String(value || "").toUpperCase();
    return role === "CUSTOMER" || role === "MECHANIC" || role === "TOWING_PROVIDER" ? role : "";
};

const fileExtension = (file) => (file?.name?.split(".").pop() || "").toLowerCase();

const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
};

function validateFile(file) {
    if (!file) return "";
    if (!ALLOWED_EXTENSIONS.includes(fileExtension(file))) {
        return `Only ${ALLOWED_EXT_LABEL} files are allowed.`;
    }
    if (file.size > MAX_FILE_BYTES) {
        return `That file is too large. Maximum size is ${MAX_FILE_MB}MB.`;
    }
    return "";
}

/* ================================================================== */
/* Small pieces                                                        */
/* ================================================================== */

/* A text field built from the shared auth.css classes, with built-in error and hint text. */
function Field({ label, name, icon: Icon, prefix, optional, error, hint, multiline = false, ...inputProps }) {
    const id = `reg-${name}`;
    const messageId = `${id}-message`;
    const describedBy = error || hint ? messageId : undefined;

    const control = multiline ? (
        <textarea
            id={id}
            name={name}
            className="field-input"
            rows="3"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            {...inputProps}
        />
    ) : (
        <input
            id={id}
            name={name}
            className="field-input"
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            {...inputProps}
        />
    );

    return (
        <div className={`field${error ? " field-invalid" : ""}`}>
            <label className="field-label" htmlFor={id}>
                {label}
                {optional && <span className="prov-optional-tag"> (Optional)</span>}
            </label>
            <div className={`field-control${multiline ? " field-control-textarea" : ""}`}>
                {Icon && (
                    <span className="field-icon" aria-hidden="true">
                        <Icon size={17} strokeWidth={1.8} />
                    </span>
                )}
                {prefix && <span className="field-prefix">{prefix}</span>}
                {control}
            </div>
            {error ? (
                <p className="field-error" id={messageId} role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="field-hint" id={messageId}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

function StepHeader({ current, total }) {
    if (total < 2) return null;
    return (
        <div className="reg-steps">
            <p className="reg-step-label" aria-live="polite">
                Step {current} of {total}
            </p>
            <div className="reg-progress" role="presentation">
                {Array.from({ length: total }, (_, i) => (
                    <span key={i} className="reg-progress-seg" data-state={i + 1 <= current ? "on" : "off"} />
                ))}
            </div>
        </div>
    );
}

/* Shows who they're signing up as, with a way back to the first screen. */
function RoleChip({ role, onChange }) {
    const info = ROLES.find((r) => r.value === role);
    if (!info) return null;
    const Icon = info.icon;
    const roleText =
        role === "MECHANIC" ? "a mechanic" : role === "TOWING_PROVIDER" ? "a towing provider" : "a customer";
    return (
        <div className="reg-role-chip">
            <span className="reg-role-chip-icon" aria-hidden="true">
                <Icon size={16} strokeWidth={1.9} />
            </span>
            <span className="reg-role-chip-text">
                Signing up as <strong>{roleText}</strong>
            </span>
            <button type="button" className="link-button link-button-lg" onClick={onChange}>
                Change
            </button>
        </div>
    );
}

function RoleChoice({ selected, onChoose }) {
    return (
        <div className="reg-role-grid" role="group" aria-label="Choose how you'll use RoadAid">
            {ROLES.map((role) => {
                const Icon = role.icon;
                return (
                    <button
                        key={role.value}
                        type="button"
                        className="reg-role-card"
                        aria-pressed={selected === role.value}
                        onClick={() => onChoose(role.value)}
                    >
                        <span className="reg-role-top">
                            <span className="reg-role-icon" aria-hidden="true">
                                <Icon size={24} strokeWidth={1.8} />
                            </span>
                            <span className="reg-role-heading">
                                <span className="reg-role-title">{role.title}</span>
                                <span className="reg-role-desc">{role.description}</span>
                            </span>
                        </span>

                        <ul className="reg-role-perks">
                            {role.perks.map((perk) => (
                                <li key={perk}>
                                    <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                                    {perk}
                                </li>
                            ))}
                        </ul>

                        <span className="reg-role-foot">
                            {role.note ? (
                                <span className="reg-role-note">
                                    <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
                                    {role.note}
                                </span>
                            ) : (
                                <span />
                            )}
                            <span className="reg-role-go">
                                Continue <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function BusinessTypeChoice({ selected, onChoose, error }) {
    const BUSINESS_TYPES = [
        { value: "INDIVIDUAL", label: "Individual", icon: User },
        { value: "PARTNERSHIP", label: "Partnership", icon: Users },
        { value: "COMPANY", label: "Company", icon: Building2 },
    ];
    return (
        <div className={`field${error ? " field-invalid" : ""}`}>
            <label className="field-label" htmlFor="reg-businessType">
                Business type
            </label>
            <div className="prov-segmented" role="radiogroup" aria-label="Business type" id="reg-businessType">
                {BUSINESS_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selected === type.value;
                    return (
                        <button
                            key={type.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className="prov-segmented-option"
                            data-selected={isSelected}
                            onClick={() => onChoose(type.value)}
                        >
                            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                            {type.label}
                        </button>
                    );
                })}
            </div>
            {error && (
                <p className="field-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

/* A single document upload slot: choose, replace or remove a PDF/JPG/PNG file. */
function FileUploadField({ label, name, file, optional, hint, error, onSelect, onRemove }) {
    const inputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);
    const id = `reg-file-${name}`;
    const messageId = `${id}-message`;

    const openPicker = () => inputRef.current?.click();

    const handleFiles = (fileList) => {
        const picked = fileList?.[0];
        if (picked) onSelect(name, picked);
    };

    return (
        <div className={`field prov-upload${error ? " field-invalid" : ""}`}>
            <label className="field-label" htmlFor={id}>
                {label}
                {optional && <span className="prov-optional-tag"> (Optional)</span>}
            </label>

            <input
                ref={inputRef}
                id={id}
                name={name}
                type="file"
                accept={FILE_ACCEPT}
                className="prov-upload-input"
                aria-describedby={error || hint ? messageId : undefined}
                onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                }}
            />

            {!file ? (
                <button
                    type="button"
                    className="prov-upload-dropzone"
                    data-active={dragActive}
                    onClick={openPicker}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        handleFiles(e.dataTransfer.files);
                    }}
                >
                    <UploadCloud size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span>
                        <strong>Click to upload</strong> or drag a file here
                    </span>
                    <span className="prov-upload-types">
                        {ALLOWED_EXT_LABEL} &middot; up to {MAX_FILE_MB}MB
                    </span>
                </button>
            ) : (
                <div className="prov-upload-file">
                    <span className="prov-upload-file-icon" aria-hidden="true">
                        <FileText size={18} strokeWidth={1.8} />
                    </span>
                    <span className="prov-upload-file-info">
                        <span className="prov-upload-file-name" title={file.name}>
                            {file.name}
                        </span>
                        <span className="prov-upload-file-size">{formatBytes(file.size)}</span>
                    </span>
                    <button type="button" className="prov-upload-replace" onClick={openPicker}>
                        Replace
                    </button>
                    <button
                        type="button"
                        className="prov-upload-remove"
                        onClick={() => onRemove(name)}
                        aria-label={`Remove ${file.name}`}
                    >
                        <X size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                </div>
            )}

            {error ? (
                <p className="field-error" id={messageId} role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="field-hint" id={messageId}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}

function ReviewRow({ label, value }) {
    return (
        <div className="prov-review-row">
            <span className="prov-review-row-label">{label}</span>
            <span className="prov-review-row-value">{value || <em>Not provided</em>}</span>
        </div>
    );
}

function ReviewSection({ title, onEdit, children }) {
    return (
        <div className="prov-review-section">
            <div className="prov-review-section-head">
                <h3>{title}</h3>
                <button type="button" className="link-button" onClick={onEdit}>
                    <Pencil size={13} strokeWidth={2.2} aria-hidden="true" />
                    Edit
                </button>
            </div>
            {children}
        </div>
    );
}

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [values, setValues] = useState(() => ({ ...initialValues, role: parseRole(searchParams.get("role")) }));
    const [step, setStep] = useState(() => (parseRole(searchParams.get("role")) ? "account" : "role"));
    const [touched, setTouched] = useState({});
    const [serverErrors, setServerErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(null); // "CUSTOMER" | "MECHANIC" | "TOWING_PROVIDER" once registered

    const formRef = useRef(null);
    const headingRef = useRef(null);
    const redirectTimer = useRef(null);
    const firstRender = useRef(true);

    const isMechanic = values.role === "MECHANIC";
    const isTowing = values.role === "TOWING_PROVIDER";

    const flowSteps = ROLE_STEPS[values.role] || [];
    const stepIndex = flowSteps.indexOf(step);
    const stepNumber = stepIndex + 1;
    const isLastStep = flowSteps.length > 0 && stepIndex === flowSteps.length - 1;

    useEffect(() => () => clearTimeout(redirectTimer.current), []);

    // Move focus to the heading when the screen changes, so screen-reader users hear where they are.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        headingRef.current?.focus();
    }, [step]);

    /* --------------------------- validation --------------------------- */

    const errors = useMemo(() => {
        const out = {};
        Object.keys(VALIDATORS).forEach((name) => {
            out[name] = VALIDATORS[name](values);
        });
        return out;
    }, [values]);

    // A field shows its error only after the person has left it (or tried to continue).
    const errorFor = (name) => serverErrors[name] || (touched[name] ? errors[name] : "");

    const touch = (names) =>
        setTouched((prev) => {
            const next = { ...prev };
            names.forEach((n) => (next[n] = true));
            return next;
        });

    const firstInvalid = (names) => names.find((n) => errors[n]);

    const focusField = (name) => {
        // Wait for the error messages to render before moving focus.
        requestAnimationFrame(() => formRef.current?.querySelector(`[name="${name}"]`)?.focus());
    };

    const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    /* ---------------------------- handlers ---------------------------- */

    const chooseRole = (role) => {
        setValues((prev) => ({ ...prev, role }));
        setFormError("");
        setStep("account");
        toTop();
    };

    const changeRole = () => {
        setFormError("");
        setStep("role");
        toTop();
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setValues((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
        if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: "" }));
        if (formError) setFormError("");
    };

    const handlePhoneChange = (e) => {
        const { name, value } = e.target;
        setValues((prev) => ({ ...prev, [name]: digitsOnly(value) }));
        if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: "" }));
        if (formError) setFormError("");
    };

    const handlePinChange = (e) => {
        const { name, value } = e.target;
        setValues((prev) => ({ ...prev, [name]: pinDigitsOnly(value) }));
        if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleBlur = (e) => touch([e.target.name]);

    const handleBusinessType = (type) => {
        setValues((prev) => ({ ...prev, businessType: type }));
        touch(["businessType"]);
    };

    const handleFileSelect = (name, file) => {
        setValues((prev) => ({ ...prev, [name]: file }));
        touch([name]);
    };

    const handleFileRemove = (name) => {
        setValues((prev) => ({ ...prev, [name]: null }));
        touch([name]);
    };

    const goToStep = (target) => {
        setFormError("");
        setStep(target);
        toTop();
    };

    const goBack = () => {
        if (stepIndex <= 0) return;
        goToStep(flowSteps[stepIndex - 1]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        // Moving forward validates just this step's fields (as before). The
        // final step re-validates every field across the whole flow, same
        // safety net the original mechanic flow had before it posted.
        const names = isLastStep ? flowSteps.flatMap((s) => STEP_FIELDS[s] || []) : STEP_FIELDS[step] || [];
        touch(names);
        const bad = firstInvalid(names);
        if (bad) {
            const badStep = flowSteps.find((s) => (STEP_FIELDS[s] || []).includes(bad));
            if (badStep && badStep !== step) setStep(badStep);
            focusField(bad);
            return;
        }

        if (!isLastStep) {
            setFormError("");
            setStep(flowSteps[stepIndex + 1]);
            toTop();
            return;
        }

        setLoading(true);
        setFormError("");

        try {
            if (isTowing) {
                // No backend endpoint exists for provider registration yet —
                // see services/towingProviderService.js. This builds a
                // FormData payload ready for multipart upload once it does.
                const formData = new FormData();
                formData.append("fullName", values.fullName.trim());
                formData.append("email", values.email.trim().toLowerCase());
                formData.append("phone", values.phone);
                formData.append("password", values.password);
                formData.append("businessName", values.businessName.trim());
                formData.append("businessType", values.businessType);
                formData.append("businessAddress", values.businessAddress.trim());
                formData.append("district", values.district.trim());
                formData.append("pinCode", values.pinCode);
                formData.append("alternateContact", values.alternateContact || "");
                if (values.ownerIdProof) formData.append("ownerIdProof", values.ownerIdProof);
                if (values.businessRegCert) formData.append("businessRegCert", values.businessRegCert);
                if (values.businessAddressProof) formData.append("businessAddressProof", values.businessAddressProof);

                await submitTowingProviderApplication(formData);
                setDone("TOWING_PROVIDER");
            } else {
                const contact = values.sameContact ? values.phone : values.contactNumber;

                // Same shape the backend has always received: workshop keys are sent (empty) for customers too.
                const payload = {
                    fullName: values.fullName.trim(),
                    email: values.email.trim().toLowerCase(),
                    phone: values.phone,
                    password: values.password,
                    role: values.role,
                    workshopName: isMechanic ? values.workshopName.trim() : "",
                    workshopAddress: isMechanic ? values.workshopAddress.trim() : "",
                    experienceYears: isMechanic ? Number(values.experienceYears) : "",
                    contactNumber: isMechanic ? contact : "",
                };

                await api.post("/users/register", payload);
                setDone(values.role);

                if (values.role === "CUSTOMER") {
                    redirectTimer.current = setTimeout(() => navigate("/"), 1800);
                }
            }
        } catch (err) {
            console.error(err);

            const message = err.response?.data?.message;

            if (!err.response) {
                setFormError("We couldn't reach RoadAid. Check your internet connection and try again.");
            } else if (message && /email/i.test(message)) {
                setServerErrors({
                    email: /exist|already|taken|use/i.test(message)
                        ? "An account with this email already exists. Try signing in instead."
                        : message,
                });
                touch(["email"]);
                setStep("account");
                focusField("email");
            } else if (message && /phone/i.test(message)) {
                setServerErrors({
                    phone: /exist|already|taken|use/i.test(message)
                        ? "An account with this phone number already exists."
                        : message,
                });
                touch(["phone"]);
                setStep("account");
                focusField("phone");
            } else {
                setFormError(message || "Registration failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    /* ---------------------------- render ---------------------------- */

    const brand =
        values.role === "MECHANIC"
            ? {
                headline: "Turn your workshop into a steady stream of jobs.",
                subheadline:
                    "Join RoadAid's verified mechanic network and get roadside requests from drivers near you.",
            }
            : values.role === "TOWING_PROVIDER"
                ? {
                    headline: "Put your tow truck to work.",
                    subheadline:
                        "Join RoadAid's verified towing network and get dispatched to breakdowns near your district.",
                }
                : values.role === "CUSTOMER"
                    ? {
                        headline: "Help is closer than you think.",
                        subheadline:
                            "Request a verified mechanic, agree a clear price, and follow them to your location.",
                    }
                    : {
                        headline: "Join the network keeping drivers moving.",
                        subheadline:
                            "Whether you need help on the road or you're ready to provide it, RoadAid connects you to the right people, fast.",
                    };

    const header = {
        role: {
            title: "How will you use RoadAid?",
            subtitle: "Pick one to get started. You can change it before you finish.",
        },
        account: {
            title: isTowing
                ? "Create your provider account"
                : isMechanic
                    ? "Create your mechanic account"
                    : "Create your account",
            subtitle: "It only takes a couple of minutes to get started.",
        },
        workshop: {
            title: "Tell us about your workshop",
            subtitle: "An administrator reviews these details before you can accept jobs.",
        },
        business: {
            title: "Tell us about your business",
            subtitle: "This helps customers and our team know who's responding.",
        },
        documents: {
            title: "Verification documents",
            subtitle: "An administrator checks these before your account goes live.",
        },
        review: {
            title: "Review your application",
            subtitle: "Make sure everything is correct, then submit for verification.",
        },
    }[step];

    const businessTypeLabel =
        values.businessType === "INDIVIDUAL"
            ? "Individual"
            : values.businessType === "PARTNERSHIP"
                ? "Partnership"
                : values.businessType === "COMPANY"
                    ? "Company"
                    : "";

    return (
        <AuthLayout
            eyebrow="RoadAid"
            headline={brand.headline}
            subheadline={brand.subheadline}
            trustItems={[
                { icon: <Clock size={15} strokeWidth={1.8} />, label: "Average response under 20 minutes" },
                { icon: <MapPin size={15} strokeWidth={1.8} />, label: "Verified mechanics near you" },
                { icon: <ShieldCheck size={15} strokeWidth={1.8} />, label: "Every provider background checked" },
            ]}
        >
            {done ? (
                <div className="success-panel" role="status">
                    <span className="success-panel-icon">
                        <CheckCircle2 size={28} strokeWidth={1.6} />
                    </span>

                    <h2 className="success-panel-title">
                        {done === "CUSTOMER" ? "Account created" : "Application submitted"}
                    </h2>

                    {done === "MECHANIC" ? (
                        <>
                            <p className="success-panel-message">
                                Thanks for applying. Your mechanic account is pending admin verification.
                            </p>

                            <ol className="reg-next">
                                <li>
                                    <span className="reg-next-num" aria-hidden="true">1</span>
                                    <span>An administrator reviews your workshop details.</span>
                                </li>
                                <li>
                                    <span className="reg-next-num" aria-hidden="true">2</span>
                                    <span>Once you're approved, you can sign in. Until then, sign-in is blocked.</span>
                                </li>
                                <li>
                                    <span className="reg-next-num" aria-hidden="true">3</span>
                                    <span>Go online from your dashboard and start receiving requests.</span>
                                </li>
                            </ol>

                            <Link to="/" className="btn-secondary">
                                Back to sign in
                            </Link>
                        </>
                    ) : done === "TOWING_PROVIDER" ? (
                        <>
                            <p className="success-panel-message">
                                Thanks for applying. Your towing provider account is pending admin verification.
                            </p>

                            <ol className="reg-next">
                                <li>
                                    <span className="reg-next-num" aria-hidden="true">1</span>
                                    <span>An administrator reviews your business and verification documents.</span>
                                </li>
                                <li>
                                    <span className="reg-next-num" aria-hidden="true">2</span>
                                    <span>Once you're approved, you can sign in. Until then, sign-in is blocked.</span>
                                </li>
                                <li>
                                    <span className="reg-next-num" aria-hidden="true">3</span>
                                    <span>Add your towing vehicles from your dashboard and start receiving requests.</span>
                                </li>
                            </ol>

                            <Link to="/" className="btn-secondary">
                                Back to sign in
                            </Link>
                        </>
                    ) : (
                        <>
                            <p className="success-panel-message">You're all set. Taking you to sign in…</p>
                            <Link to="/" className="btn-secondary">
                                Sign in now
                            </Link>
                        </>
                    )}
                </div>
            ) : (
                <>
                    {step !== "role" && <StepHeader current={stepNumber} total={flowSteps.length} />}

                    {step !== "role" && <RoleChip role={values.role} onChange={changeRole} />}

                    <div className="auth-form-header">
                        <h2 className="auth-form-title" ref={headingRef} tabIndex={-1}>
                            {header.title}
                        </h2>
                        <p className="auth-form-subtitle">{header.subtitle}</p>
                    </div>

                    {/* ------------------------ Screen 1: choose a role ------------------------ */}
                    {step === "role" && <RoleChoice selected={values.role} onChoose={chooseRole} />}

                    {/* ------------------------ Remaining screens: the form ------------------------ */}
                    {step !== "role" && (
                        <>
                            <StatusMessage type="error">{formError}</StatusMessage>

                            <form onSubmit={handleSubmit} noValidate ref={formRef}>
                                {step === "account" && (
                                    <>
                                        <Field
                                            label="Full name"
                                            icon={User}
                                            type="text"
                                            name="fullName"
                                            placeholder={isTowing ? "Owner or contact person's full name" : "Enter your full name"}
                                            autoComplete="name"
                                            value={values.fullName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("fullName")}
                                        />

                                        <Field
                                            label="Email"
                                            icon={Mail}
                                            type="email"
                                            name="email"
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            inputMode="email"
                                            autoCapitalize="none"
                                            spellCheck={false}
                                            value={values.email}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("email")}
                                        />

                                        <Field
                                            label="Mobile number"
                                            icon={Phone}
                                            type="tel"
                                            name="phone"
                                            prefix="+91"
                                            placeholder="98765 43210"
                                            autoComplete="tel-national"
                                            inputMode="numeric"
                                            maxLength={10}
                                            value={values.phone}
                                            onChange={handlePhoneChange}
                                            onBlur={handleBlur}
                                            error={errorFor("phone")}
                                            hint={
                                                isMechanic || isTowing
                                                    ? "Customers and our team will use this to reach you."
                                                    : "Mechanics use this to reach you during a service."
                                            }
                                        />

                                        <div
                                            className={errorFor("password") ? "field-invalid" : undefined}
                                            onBlur={() => touch(["password"])}
                                        >
                                            <PasswordInput
                                                label="Password"
                                                name="password"
                                                placeholder="At least 8 characters"
                                                autoComplete="new-password"
                                                minLength={8}
                                                value={values.password}
                                                onChange={handleChange}
                                            />
                                            {errorFor("password") && (
                                                <p className="field-error reg-field-error" role="alert">
                                                    {errorFor("password")}
                                                </p>
                                            )}
                                        </div>

                                        <PasswordStrength password={values.password} />

                                        <div
                                            className={errorFor("confirmPassword") ? "field-invalid" : undefined}
                                            onBlur={() => touch(["confirmPassword"])}
                                        >
                                            <PasswordInput
                                                label="Confirm password"
                                                name="confirmPassword"
                                                placeholder="Re-enter your password"
                                                autoComplete="new-password"
                                                value={values.confirmPassword}
                                                onChange={handleChange}
                                            />
                                            {errorFor("confirmPassword") ? (
                                                <p className="field-error reg-field-error" role="alert">
                                                    {errorFor("confirmPassword")}
                                                </p>
                                            ) : (
                                                values.confirmPassword &&
                                                values.confirmPassword === values.password && (
                                                    <p className="field-ok reg-field-error">
                                                        <Check size={14} strokeWidth={2.4} aria-hidden="true" /> Passwords match
                                                    </p>
                                                )
                                            )}
                                        </div>

                                        <div className={`field reg-terms-field${errorFor("terms") ? " field-invalid" : ""}`}>
                                            <label className="checkbox-field reg-terms">
                                                <input
                                                    type="checkbox"
                                                    name="terms"
                                                    checked={values.terms}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    aria-invalid={Boolean(errorFor("terms"))}
                                                />
                                                <span>I agree to RoadAid's terms of service and privacy policy.</span>
                                            </label>
                                            {errorFor("terms") && (
                                                <p className="field-error" role="alert">
                                                    {errorFor("terms")}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {step === "workshop" && (
                                    <>
                                        <Field
                                            label="Workshop name"
                                            icon={Building2}
                                            type="text"
                                            name="workshopName"
                                            placeholder="e.g. Highway Auto Works"
                                            autoComplete="organization"
                                            value={values.workshopName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("workshopName")}
                                        />

                                        <Field
                                            label="Workshop address"
                                            icon={MapPin}
                                            name="workshopAddress"
                                            multiline
                                            placeholder="Street, city, state, PIN code"
                                            autoComplete="street-address"
                                            value={values.workshopAddress}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("workshopAddress")}
                                            hint="Customers see this, so make it easy to find."
                                        />

                                        <Field
                                            label="Experience (years)"
                                            icon={Briefcase}
                                            type="number"
                                            name="experienceYears"
                                            min="0"
                                            max="60"
                                            step="1"
                                            inputMode="numeric"
                                            placeholder="e.g. 5"
                                            value={values.experienceYears}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("experienceYears")}
                                        />

                                        <div className="field reg-contact">
                                            <label className="checkbox-field">
                                                <input
                                                    type="checkbox"
                                                    name="sameContact"
                                                    checked={values.sameContact}
                                                    onChange={handleChange}
                                                />
                                                <span>
                                                    Use my mobile number (+91 {values.phone}) as the workshop contact
                                                </span>
                                            </label>
                                        </div>

                                        {!values.sameContact && (
                                            <Field
                                                label="Workshop contact number"
                                                icon={Phone}
                                                type="tel"
                                                name="contactNumber"
                                                prefix="+91"
                                                placeholder="98765 43210"
                                                autoComplete="tel-national"
                                                inputMode="numeric"
                                                maxLength={10}
                                                value={values.contactNumber}
                                                onChange={handlePhoneChange}
                                                onBlur={handleBlur}
                                                error={errorFor("contactNumber")}
                                            />
                                        )}

                                        <StatusMessage type="info">
                                            <strong>Verification required.</strong> Your workshop information will be
                                            reviewed by the RoadAid administration team before your provider account is
                                            activated.
                                        </StatusMessage>
                                    </>
                                )}

                                {step === "business" && (
                                    <>
                                        <Field
                                            label="Business / company name"
                                            icon={Building2}
                                            type="text"
                                            name="businessName"
                                            placeholder="e.g. Highway Towing Services"
                                            autoComplete="organization"
                                            value={values.businessName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("businessName")}
                                        />

                                        <BusinessTypeChoice
                                            selected={values.businessType}
                                            onChoose={handleBusinessType}
                                            error={errorFor("businessType")}
                                        />

                                        <Field
                                            label="Business address"
                                            icon={MapPin}
                                            name="businessAddress"
                                            multiline
                                            placeholder="Street, city, state, PIN code"
                                            autoComplete="street-address"
                                            value={values.businessAddress}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("businessAddress")}
                                            hint="Customers see this, so make it easy to find."
                                        />

                                        <Field
                                            label="District"
                                            icon={MapPin}
                                            type="text"
                                            name="district"
                                            placeholder="e.g. Ernakulam"
                                            autoComplete="address-level2"
                                            value={values.district}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={errorFor("district")}
                                            hint="Used to match you with nearby requests."
                                        />

                                        <Field
                                            label="PIN code"
                                            icon={Hash}
                                            type="text"
                                            name="pinCode"
                                            placeholder="682001"
                                            inputMode="numeric"
                                            maxLength={6}
                                            autoComplete="postal-code"
                                            value={values.pinCode}
                                            onChange={handlePinChange}
                                            onBlur={handleBlur}
                                            error={errorFor("pinCode")}
                                        />

                                        <Field
                                            label="Alternate contact number"
                                            icon={Phone}
                                            type="tel"
                                            name="alternateContact"
                                            prefix="+91"
                                            optional
                                            placeholder="98765 43210"
                                            inputMode="numeric"
                                            maxLength={10}
                                            value={values.alternateContact}
                                            onChange={handlePhoneChange}
                                            onBlur={handleBlur}
                                            error={errorFor("alternateContact")}
                                            hint="In case we can't reach you on your primary number."
                                        />
                                    </>
                                )}

                                {step === "documents" && (
                                    <>
                                        <StatusMessage type="info">
                                            <strong>Verification required.</strong> These documents are reviewed by the
                                            RoadAid administration team before your provider account is activated.
                                            You'll register your towing vehicles separately from your dashboard once
                                            approved.
                                        </StatusMessage>

                                        <FileUploadField
                                            label="Owner's identity proof"
                                            name="ownerIdProof"
                                            file={values.ownerIdProof}
                                            onSelect={handleFileSelect}
                                            onRemove={handleFileRemove}
                                            error={errorFor("ownerIdProof")}
                                            hint="Aadhaar or another accepted government ID."
                                        />

                                        <FileUploadField
                                            label="Business registration certificate"
                                            name="businessRegCert"
                                            file={values.businessRegCert}
                                            optional
                                            onSelect={handleFileSelect}
                                            onRemove={handleFileRemove}
                                            error={errorFor("businessRegCert")}
                                            hint="Recommended for partnerships and companies, where one exists."
                                        />

                                        <FileUploadField
                                            label="Business address proof"
                                            name="businessAddressProof"
                                            file={values.businessAddressProof}
                                            onSelect={handleFileSelect}
                                            onRemove={handleFileRemove}
                                            error={errorFor("businessAddressProof")}
                                            hint="A utility bill, lease, or similar document for the address above."
                                        />
                                    </>
                                )}

                                {step === "review" && (
                                    <>
                                        <ReviewSection title="Account" onEdit={() => goToStep("account")}>
                                            <ReviewRow label="Full name" value={values.fullName} />
                                            <ReviewRow label="Email" value={values.email} />
                                            <ReviewRow label="Mobile number" value={values.phone && `+91 ${values.phone}`} />
                                            <ReviewRow label="Password" value={values.password && "•".repeat(10)} />
                                        </ReviewSection>

                                        <ReviewSection title="Business" onEdit={() => goToStep("business")}>
                                            <ReviewRow label="Business name" value={values.businessName} />
                                            <ReviewRow label="Business type" value={businessTypeLabel} />
                                            <ReviewRow label="Address" value={values.businessAddress} />
                                            <ReviewRow label="District" value={values.district} />
                                            <ReviewRow label="PIN code" value={values.pinCode} />
                                            <ReviewRow
                                                label="Alternate contact"
                                                value={values.alternateContact && `+91 ${values.alternateContact}`}
                                            />
                                        </ReviewSection>

                                        <ReviewSection title="Documents" onEdit={() => goToStep("documents")}>
                                            <ReviewRow label="Identity proof" value={values.ownerIdProof?.name} />
                                            <ReviewRow
                                                label="Business registration certificate"
                                                value={values.businessRegCert?.name}
                                            />
                                            <ReviewRow
                                                label="Business address proof"
                                                value={values.businessAddressProof?.name}
                                            />
                                        </ReviewSection>
                                    </>
                                )}

                                <div className="reg-actions">
                                    {stepIndex > 0 && (
                                        <button
                                            type="button"
                                            className="btn-secondary reg-back"
                                            onClick={goBack}
                                            disabled={loading}
                                        >
                                            <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
                                            Back
                                        </button>
                                    )}

                                    <button type="submit" className="btn-primary" disabled={loading}>
                                        {loading ? (
                                            <>
                                                <Loader2 size={17} className="spin" aria-hidden="true" />
                                                Submitting…
                                            </>
                                        ) : (
                                            <>
                                                {!isLastStep
                                                    ? "Continue"
                                                    : isMechanic || isTowing
                                                        ? "Submit for verification"
                                                        : "Create account"}
                                                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    <p className="auth-form-footer">
                        Already have an account? <Link to="/">Sign in</Link>
                    </p>
                </>
            )}
        </AuthLayout>
    );
}

export default Register;