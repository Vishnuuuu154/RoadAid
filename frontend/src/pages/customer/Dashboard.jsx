import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";
import { getUser } from "../../services/authService";
import "../../styles/dashboard.css";
import {
    getMyVehicles, getMyRequests, getMyPayments, getMyFavorites,
    getMyNotifications, getQuotation, acceptQuotation,
    cancelRequest, reassignMechanic, autoReassignMechanic,
    getAvailableMechanics, addReview, getMyReviews,
} from "../../services/customerService";
import {
    FaBell, FaCar, FaCarBattery, FaCheck, FaCircleNotch, FaCommentDots,
    FaCreditCard, FaExclamationTriangle, FaGasPump, FaHeart, FaHistory,
    FaKey, FaMapMarkerAlt, FaMoneyBillWave, FaPhoneAlt, FaPlus, FaReceipt,
    FaRoute, FaShieldAlt, FaStar, FaSyncAlt, FaTimes, FaTruckPickup,
    FaUser, FaWrench,
} from "react-icons/fa";
import LiveTrackingMap from "../../components/customer/LiveTrackingMap";

/* -------------------------------------------------------------------------
   Config
   ------------------------------------------------------------------------- */

// Every link on this page lives here. Set vehicles / payments to a route once
// those pages exist and a "View all" link will appear automatically.
const ROUTES = {
    request: "/customer/request-help",
    requests: "/customer/requests",
    favorites: "/customer/favorites",
    fuel: "/customer/find-fuel",
    profile: "/customer/profile",
    notifications: "/customer/notifications",
    vehicles: null,
    payments: null,
};

// The request-help page can read ?issue=<id> to pre-select the problem.
const ISSUES = [
    { id: "flat-tyre", label: "Flat tyre", icon: FaCircleNotch },
    { id: "battery", label: "Dead battery", icon: FaCarBattery },
    { id: "fuel", label: "Out of fuel", icon: FaGasPump },
    { id: "towing", label: "Towing", icon: FaTruckPickup },
    { id: "lockout", label: "Locked out", icon: FaKey },
    { id: "other", label: "Something else", icon: FaWrench },
];

const SHORTCUTS = [
    { icon: FaHistory, title: "My requests", text: "Past and current", to: ROUTES.requests },
    { icon: FaHeart, title: "Favourites", text: "Saved mechanics", to: ROUTES.favorites },
    { icon: FaGasPump, title: "Find fuel", text: "Nearby stations", to: ROUTES.fuel },
    { icon: FaUser, title: "My profile", text: "Account details", to: ROUTES.profile },
];

const STAGE = {
    NOT_STARTED: { label: "Waiting for a mechanic", step: 1 },
    ON_THE_WAY: { label: "Mechanic is on the way", step: 2 },
    ARRIVED: { label: "Mechanic has arrived", step: 3 },
    REPAIRING: { label: "Fixing your vehicle", step: 4 },
    COMPLETED: { label: "All done!", step: 5 },
};

const STEP_LABELS = ["Requested", "On the way", "Arrived", "Repairing", "Done"];

// [headline, tone, helper line] in plain language.
const STATUS = {
    PENDING: ["We got your request", "warning", "We're finding a mechanic for you."],
    WAITING_FOR_QUOTATION: ["Getting your price ready", "info", "Your mechanic is preparing a quote."],
    QUOTATION_PENDING: ["Your price is ready", "info", "Review the quote and accept it to continue."],
    ACCEPTED: ["Mechanic confirmed", "accent", "Your mechanic is getting ready to head to you."],
    IN_PROGRESS: ["Help is on the way", "accent", "Follow your mechanic on the map below."],
    COMPLETED: ["Service done", "success", "Pay when you're ready."],
    CANCELLED: ["Cancelled", "muted", "This request was cancelled."],
    REJECTED: ["Needs a new mechanic", "danger", "This mechanic can't take the job right now."],
    CLOSED: ["Closed", "muted", "This request is complete."],
};

const ACTIVE_STATUSES = ["PENDING", "WAITING_FOR_QUOTATION", "QUOTATION_PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"];
const CANCELLABLE = ["PENDING", "WAITING_FOR_QUOTATION", "QUOTATION_PENDING"];
const RATING_LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];
const REVIEW_TAGS = ["Professional", "Quick", "Friendly", "Fair price", "Great service"];

/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */

const inrFormat = new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const inr = (n) => inrFormat.format(Number(n) || 0);

function when(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;
const initialOf = (name) => (name || "?").trim().charAt(0).toUpperCase();

// The vehicle / favourite / payment / notification shapes weren't in the files
// shared, so these read the most likely field names. Adjust if yours differ.
const vehicleName = (v) => v.name || [v.make || v.brand, v.model].filter(Boolean).join(" ") || "Vehicle";
const vehiclePlate = (v) => v.registrationNumber || v.plateNumber || v.vehicleNumber || v.licensePlate || "";
const favName = (f) => f.mechanic?.user?.fullName || f.user?.fullName || f.mechanicName || f.fullName || f.name || "Mechanic";
const favSub = (f) => f.mechanic?.workshopName || f.workshopName || "";
const payDate = (p) => p.paidAt || p.paymentDate || p.createdAt || "";
const payMethod = (p) => {
    const m = String(p.paymentMethod || p.method || "").toLowerCase();
    return m ? m.charAt(0).toUpperCase() + m.slice(1) : "";
};
const noteText = (n) => n.message || n.title || n.content || "Notification";

/* -------------------------------------------------------------------------
   Small building blocks
   ------------------------------------------------------------------------- */

function Badge({ status }) {
    const [label, tone] = STATUS[status] || [status || "Unknown", "muted"];
    return <span className={`ra-badge ${tone}`}>{label}</span>;
}

function Button({ children, variant = "primary", className = "", as: Component = "button", ...props }) {
    const extra = Component === "button" && !props.type ? { type: "button" } : {};
    return (
        <Component className={`ra-btn ${variant} ${className}`.trim()} {...extra} {...props}>
            {children}
        </Component>
    );
}

function Card({ icon: Icon, title, unread = 0, to, children }) {
    return (
        <section className="ra-card">
            <div className="ra-card-head">
                <h2>
                    {Icon && <Icon aria-hidden="true" />}
                    {title}
                    {unread > 0 && <span className="ra-count">{unread}<span className="ra-sr"> unread</span></span>}
                </h2>
                {to && <Link className="ra-link" to={to}>View all</Link>}
            </div>
            {children}
        </section>
    );
}

function Row({ icon: Icon, initial, title, sub, sub2, end, unread }) {
    return (
        <li className="ra-row">
            <span className="ra-row-icon" aria-hidden="true">
                {Icon ? <Icon /> : initial}
            </span>
            <div className="ra-row-main">
                <div className="ra-row-title">
                    {unread && <span className="ra-unread"><span className="ra-sr">Unread: </span></span>}
                    {title}
                </div>
                {sub && <div className="ra-row-sub">{sub}</div>}
                {sub2 && <div className="ra-row-sub">{sub2}</div>}
            </div>
            {end && <div className="ra-row-end">{end}</div>}
        </li>
    );
}

function Empty({ title, text, children }) {
    return (
        <div className="ra-empty">
            <strong>{title}</strong>
            {text && <p>{text}</p>}
            {children}
        </div>
    );
}

function Progress({ current, complete }) {
    return (
        <ol className="ra-steps" aria-label="Service progress">
            {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const done = complete || n < current;
                const isCurrent = !complete && n === current;
                return (
                    <li
                        key={label}
                        className={`ra-step ${done ? "done" : ""} ${isCurrent ? "current" : ""}`}
                        aria-current={isCurrent ? "step" : undefined}
                    >
                        <span className="ra-step-dot">{done && <FaCheck aria-hidden="true" />}</span>
                        {label}
                        <span className="ra-sr">{done ? " (done)" : isCurrent ? " (current step)" : ""}</span>
                    </li>
                );
            })}
        </ol>
    );
}

/** Accessible dialog: Escape closes, Tab stays inside, focus returns on close. */
function Modal({ id, title, onClose, children }) {
    const ref = useRef(null);

    useEffect(() => {
        const previous = document.activeElement;
        const bodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        ref.current?.focus();
        return () => {
            document.body.style.overflow = bodyOverflow;
            previous?.focus?.();
        };
    }, []);

    function onKeyDown(e) {
        if (e.key === "Escape") {
            e.stopPropagation();
            onClose?.();
            return;
        }
        if (e.key !== "Tab" || !ref.current) return;
        const items = ref.current.querySelectorAll(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === ref.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    }

    return (
        <div
            className="ra-overlay"
            onKeyDown={onKeyDown}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div className="ra-modal" role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} ref={ref}>
                {onClose && (
                    <button type="button" className="ra-btn secondary ra-icon-btn ra-modal-close" aria-label="Close" onClick={onClose}>
                        <FaTimes aria-hidden="true" />
                    </button>
                )}
                <h2 id={id}>{title}</h2>
                {children}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------
   Page
   ------------------------------------------------------------------------- */

export default function Dashboard() {
    const user = useMemo(() => { try { return getUser?.() || null; } catch { return null; } }, []);
    const firstName = (user?.fullName || "").trim().split(/\s+/)[0];

    const [vehicles, setVehicles] = useState([]);
    const [requests, setRequests] = useState([]);
    const [payments, setPayments] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [quotation, setQuotation] = useState(null);

    const [initialLoading, setInitialLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [busy, setBusy] = useState("");
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [quotationLoading, setQuotationLoading] = useState(false);

    const [showPaymentOptions, setShowPaymentOptions] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showMechanics, setShowMechanics] = useState(false);
    const [mechanics, setMechanics] = useState([]);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewRequest, setReviewRequest] = useState(null);
    const [reviewTags, setReviewTags] = useState([]);
    const [showReviewPopup, setShowReviewPopup] = useState(false);
    const [locallyReviewedIds, setLocallyReviewedIds] = useState(() => new Set());

    const [confirm, setConfirm] = useState(null);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    /* ---------- Derived data ---------- */

    const activeRequest = useMemo(() => {
        return [...requests]
            .filter((r) => ACTIVE_STATUSES.includes(r.status))
            .sort((a, b) => Number(b.requestId) - Number(a.requestId))[0] || null;
    }, [requests]);

    const rejectedRequest = useMemo(() => requests.find((r) => r.status === "REJECTED"), [requests]);

    const unreviewed = useMemo(() => requests.filter((r) =>
        r.status === "CLOSED" &&
        !locallyReviewedIds.has(Number(r.requestId)) &&
        !reviews.some((x) => Number(x.serviceRequest?.requestId ?? x.serviceRequest?.id) === Number(r.requestId))
    ), [requests, reviews, locallyReviewedIds]);

    const recentRequests = useMemo(() => {
        return [...requests]
            .filter((r) => r !== activeRequest)
            .sort((a, b) => Number(b.requestId) - Number(a.requestId))
            .slice(0, 4);
    }, [requests, activeRequest]);

    const recentPayments = useMemo(() => {
        return [...payments]
            .sort((a, b) => (Date.parse(payDate(b)) || 0) - (Date.parse(payDate(a)) || 0))
            .slice(0, 3);
    }, [payments]);

    const live = ["ACCEPTED", "IN_PROGRESS"].includes(activeRequest?.status);
    const stage = STAGE[activeRequest?.serviceStage] || STAGE.NOT_STARTED;
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const paymentPending = activeRequest?.status === "COMPLETED" && quotation?.paymentStatus === "ACCEPTED";
    const unread = notifications.filter((n) => !n.isRead).length;

    const [statusLabel, , statusHelper] = STATUS[activeRequest?.status] || [];
    const headline = live && stage !== STAGE.NOT_STARTED ? stage.label : statusLabel || "Your service request";
    const showSteps = live || activeRequest?.status === "COMPLETED";

    /* ---------- Effects ---------- */

    useEffect(() => {
        loadDashboard().finally(() => setInitialLoading(false));
        return () => clearTimeout(toastTimer.current);
    }, []);

    // Keep an in-progress request fresh without the customer pressing refresh.
    useEffect(() => {
        if (!activeRequest) return undefined;
        const timer = setInterval(() => {
            if (document.visibilityState === "visible") {
                loadRequests();
                loadNotifications();
            }
        }, 30000);
        return () => clearInterval(timer);
    }, [activeRequest?.requestId]);

    useEffect(() => {
        if (showReviewPopup || unreviewed.length === 0) return;

        const nextReview = unreviewed[0];
        const skippedKey = `roadaid_review_skipped_${nextReview.requestId}`;
        if (localStorage.getItem(skippedKey) === "true") return;

        setReviewRequest(nextReview);
        setRating(0);
        setComment("");
        setReviewTags([]);
        setShowReviewPopup(true);
    }, [unreviewed, showReviewPopup]);

    /* ---------- Loading ---------- */

    function fail(e) {
        console.error(e);
        setLoadFailed(true);
    }

    async function loadDashboard() {
        setLoadFailed(false);
        await Promise.allSettled([
            loadVehicles(), loadRequests(), loadPayments(),
            loadFavorites(), loadNotifications(), loadReviews(),
        ]);
    }

    async function loadVehicles() {
        try { setVehicles((await getMyVehicles()).data || []); } catch (e) { fail(e); }
    }

    async function loadRequests() {
        try {
            const data = (await getMyRequests()).data || [];
            setRequests(data);
            const qRequest =
                data.find((x) => x.status === "QUOTATION_PENDING") ||
                data
                    .filter((x) => x.status === "COMPLETED")
                    .sort((a, b) => Number(b.requestId) - Number(a.requestId))[0];
            if (qRequest) {
                try { setQuotation((await getQuotation(qRequest.requestId)).data); }
                catch { setQuotation(null); }
            } else setQuotation(null);
        } catch (e) { fail(e); }
    }

    async function loadPayments() {
        try { setPayments((await getMyPayments()).data || []); } catch (e) { fail(e); }
    }

    async function loadFavorites() {
        try { setFavorites((await getMyFavorites()).data || []); } catch (e) { fail(e); }
    }

    async function loadNotifications() {
        try { setNotifications((await getMyNotifications()).data || []); } catch (e) { fail(e); }
    }

    async function loadReviews() {
        try { setReviews((await getMyReviews()).data || []); } catch (e) { fail(e); }
    }

    async function refresh() {
        setRefreshing(true);
        try { await loadDashboard(); } finally { setRefreshing(false); }
    }

    /* ---------- Feedback (toasts + confirm dialog) ---------- */

    function notify(message, tone = "info") {
        clearTimeout(toastTimer.current);
        setToast({ message, tone });
        toastTimer.current = setTimeout(() => setToast(null), tone === "error" ? 7000 : 4500);
    }

    async function runConfirm() {
        if (!confirm) return;
        setConfirmBusy(true);
        try { await confirm.run(); }
        finally { setConfirmBusy(false); setConfirm(null); }
    }

    /* ---------- Actions ---------- */

    async function viewQuote() {
        try {
            setQuotationLoading(true);
            setQuotation((await getQuotation(activeRequest.requestId)).data);
        } catch (e) {
            notify(errMsg(e, "Couldn't load the quote. Try again."), "error");
        } finally {
            setQuotationLoading(false);
        }
    }

    async function acceptQuote() {
        try {
            setBusy("accept");
            await acceptQuotation(activeRequest.requestId);
            setQuotation(null);
            await loadRequests();
            notify("Quote accepted", "success");
        } catch (e) {
            notify(errMsg(e, "Couldn't accept the quote. Try again."), "error");
        } finally {
            setBusy("");
        }
    }

    async function pay() {
        if (!quotation || quotation.paymentStatus !== "ACCEPTED") {
            notify("This quote has already been paid or isn't ready for payment.", "error");
            return;
        }

        try {
            setPaymentLoading(true);

            if (!window.Razorpay) {
                throw new Error("Online payment didn't load. Refresh the page and try again.");
            }

            // 1. Create Razorpay order on our backend
            const orderResponse = await api.post(`/payments/razorpay/order/${quotation.id}`);
            const orderId = orderResponse.data;
            if (!orderId) throw new Error("Failed to create Razorpay order.");

            // 2. Open Razorpay Checkout
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: Math.round(Number(quotation.totalAmount) * 100),
                currency: "INR",
                name: "RoadAid",
                description: `Roadside assistance - Request #${activeRequest.requestId}`,
                order_id: orderId,

                handler: async function (response) {
                    try {
                        // 3. Send Razorpay response to our backend
                        await api.post("/payments/razorpay/verify", {
                            quotationId: quotation.id,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            paymentMethod: "RAZORPAY",
                        });

                        setQuotation(null);
                        await Promise.all([loadRequests(), loadPayments()]);

                        const paidRequest = activeRequest;
                        if (paidRequest?.requestId) {
                            setReviewRequest(paidRequest);
                            setRating(0);
                            setComment("");
                            setReviewTags([]);
                            setShowReviewPopup(true);
                        }

                        notify("Payment successful", "success");
                    } catch (e) {
                        notify(errMsg(e, "Payment verification failed."), "error");
                    } finally {
                        setPaymentLoading(false);
                    }
                },

                modal: { ondismiss: () => setPaymentLoading(false) },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on("payment.failed", (response) => {
                console.error("Razorpay payment failed:", response.error);
                notify(response.error?.description || "Payment failed. Try again.", "error");
                setPaymentLoading(false);
            });
            razorpay.open();
        } catch (e) {
            notify(errMsg(e, e.message || "Unable to start payment."), "error");
            setPaymentLoading(false);
        }
    }

    async function payCash() {
        if (!quotation) return;
        try {
            setPaymentLoading(true);
            await api.post(`/payments/cash/${quotation.id}`);
            setShowPaymentOptions(false);
            setQuotation(null);
            await Promise.all([loadRequests(), loadPayments()]);
            notify("Cash payment requested. Waiting for your mechanic to confirm.", "success");
        } catch (e) {
            notify(errMsg(e, "Couldn't request cash payment. Try again."), "error");
        } finally {
            setPaymentLoading(false);
        }
    }

    function cancel() {
        if (!activeRequest) return;
        const id = activeRequest.requestId;
        setConfirm({
            title: "Cancel this request?",
            body: "Your mechanic will be told right away. You can ask for help again any time.",
            confirmLabel: "Cancel request",
            cancelLabel: "Keep request",
            danger: true,
            run: async () => {
                try {
                    await cancelRequest(id);
                    await loadRequests();
                    notify("Request cancelled", "success");
                } catch (e) {
                    notify(errMsg(e, "Couldn't cancel the request. Try again."), "error");
                }
            },
        });
    }

    async function chooseMechanic() {
        setMechanics(null);
        setShowMechanics(true);
        try {
            setMechanics((await getAvailableMechanics()).data || []);
        } catch (e) {
            setShowMechanics(false);
            notify(errMsg(e, "Couldn't load mechanics. Try again."), "error");
        }
    }

    function autoChoose() {
        if (!rejectedRequest) return;
        const id = rejectedRequest.requestId;
        setConfirm({
            title: "Let RoadAid find a mechanic?",
            body: `We'll send request #${id} to an available mechanic.`,
            confirmLabel: "Find a mechanic",
            cancelLabel: "Not now",
            run: async () => {
                try {
                    await autoReassignMechanic(id);
                    await loadRequests();
                    notify("Request sent to a new mechanic", "success");
                } catch (e) {
                    notify(errMsg(e, "No suitable mechanic is available right now."), "error");
                }
            },
        });
    }

    function selectMechanic(m) {
        if (!rejectedRequest) return;
        const id = rejectedRequest.requestId;
        const name = m.user?.fullName || "this mechanic";
        setConfirm({
            title: `Send this request to ${name}?`,
            body: `Request #${id} will go to ${name}.`,
            confirmLabel: "Send request",
            cancelLabel: "Go back",
            run: async () => {
                try {
                    await reassignMechanic(id, m.id);
                    setShowMechanics(false);
                    await loadRequests();
                    notify("Request sent to a new mechanic", "success");
                } catch (e) {
                    notify(errMsg(e, "Couldn't reassign the mechanic. Try again."), "error");
                }
            },
        });
    }

    async function review(requestId) {
        if (!rating) return notify("Choose a star rating first.", "error");
        if (reviewLoading) return;

        try {
            setReviewLoading(true);

            const tagText = reviewTags.length ? `Tags: ${reviewTags.join(", ")}` : "";
            const finalComment = [comment.trim(), tagText].filter(Boolean).join("\n");

            await addReview(requestId, { rating, comment: finalComment });

            // Stop the popup reopening before the review list refresh catches up.
            setLocallyReviewedIds((current) => {
                const next = new Set(current);
                next.add(Number(requestId));
                return next;
            });

            setRating(0);
            setComment("");
            setReviewTags([]);
            setShowReviewPopup(false);
            setReviewRequest(null);

            await Promise.all([loadRequests(), loadReviews()]);
            notify("Thanks for your review", "success");
        } catch (e) {
            notify(errMsg(e, "Couldn't submit your review. Try again."), "error");
        } finally {
            setReviewLoading(false);
        }
    }

    function skipReview() {
        if (reviewRequest?.requestId) {
            localStorage.setItem(`roadaid_review_skipped_${reviewRequest.requestId}`, "true");
        }
        setRating(0);
        setComment("");
        setReviewTags([]);
        setShowReviewPopup(false);
        setReviewRequest(null);
    }

    function toggleReviewTag(tag) {
        setReviewTags((current) =>
            current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
        );
    }

    /* ---------- Render ---------- */

    const subtitle = initialLoading
        ? "Loading your latest activity…"
        : activeRequest
            ? `Here's the latest on request #${activeRequest.requestId}.`
            : "No active requests right now.";

    return (
        <CustomerLayout>
            <div className="ra-page">

                <header className="ra-head">
                    <div>
                        <h1>{greeting()}{firstName ? `, ${firstName}` : ""}</h1>
                        <p>{subtitle}</p>
                    </div>
                    <div className="ra-head-actions">
                        <button
                            type="button"
                            className="ra-btn secondary ra-icon-btn"
                            onClick={refresh}
                            disabled={refreshing}
                            aria-label={refreshing ? "Refreshing" : "Refresh dashboard"}
                            title="Refresh"
                        >
                            <FaSyncAlt className={refreshing ? "ra-spin" : ""} aria-hidden="true" />
                        </button>
                        {activeRequest && (
                            <Button as={Link} to={ROUTES.request}>
                                <FaPlus aria-hidden="true" />New request
                            </Button>
                        )}
                    </div>
                </header>

                {loadFailed && !initialLoading && (
                    <div className="ra-alert warn" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <div className="ra-alert-body">
                            <strong>Some information didn't load</strong>
                            <p>Check your connection, then try again.</p>
                        </div>
                        <Button variant="secondary" onClick={refresh} disabled={refreshing}>Try again</Button>
                    </div>
                )}

                {rejectedRequest && (
                    <div className="ra-alert" role="alert">
                        <FaExclamationTriangle aria-hidden="true" />
                        <div className="ra-alert-body">
                            <strong>Your mechanic can't take request #{rejectedRequest.requestId}</strong>
                            <p>Choose another mechanic yourself, or let RoadAid find one for you.</p>
                            <div className="ra-actions">
                                <Button onClick={autoChoose}>Let RoadAid choose</Button>
                                <Button variant="secondary" onClick={chooseMechanic}>Choose a mechanic</Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="ra-layout">
                    <div className="ra-main">

                        {/* ---------- Primary card ---------- */}
                        {initialLoading ? (
                            <div className="ra-skel" style={{ height: 320, borderRadius: 20 }} aria-hidden="true" />
                        ) : activeRequest ? (
                            <article className="ra-active" aria-labelledby="active-title">
                                <div className="ra-active-band ra-dark">
                                    {live && <span className="ra-live"><i />Live</span>}
                                    <h2 id="active-title">{headline}</h2>
                                    {statusHelper && <p>{statusHelper}</p>}
                                    {showSteps && (
                                        <Progress
                                            current={stage.step}
                                            complete={activeRequest.status === "COMPLETED"}
                                        />
                                    )}
                                </div>

                                <div className="ra-active-body">
                                    <dl className="ra-facts">
                                        <div>
                                            <dt>Request</dt>
                                            <dd>#{activeRequest.requestId}</dd>
                                        </div>
                                        <div>
                                            <dt>Problem</dt>
                                            <dd>{activeRequest.issue || "Roadside assistance"}</dd>
                                        </div>
                                        {activeRequest.mechanic && (
                                            <div>
                                                <dt>Mechanic</dt>
                                                <dd>{activeRequest.mechanic}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    {activeRequest.status === "QUOTATION_PENDING" && (
                                        <section className="ra-panel quote" aria-labelledby="quote-title">
                                            {!quotation ? (
                                                <div className="ra-panel-head">
                                                    <div>
                                                        <h3 id="quote-title">Your mechanic sent a quote</h3>
                                                        <p className="ra-muted">Open it to see the price.</p>
                                                    </div>
                                                    <Button onClick={viewQuote} disabled={quotationLoading}>
                                                        {quotationLoading ? "Loading…" : "View quote"}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="ra-panel-head">
                                                        <h3 id="quote-title">Price quote</h3>
                                                        <span className="ra-total">{inr(quotation.totalAmount)}</span>
                                                    </div>
                                                    <ul className="ra-lines">
                                                        {[["Labour", quotation.labourCharge], ["Parts", quotation.partsCharge], ["Travel", quotation.travelFee]].map(([label, value]) => (
                                                            <li key={label}><span>{label}</span><span>{inr(value)}</span></li>
                                                        ))}
                                                    </ul>
                                                    <Button className="lg block" onClick={acceptQuote} disabled={busy === "accept"}>
                                                        {busy === "accept" ? "Accepting…" : "Accept quote"}
                                                    </Button>
                                                </>
                                            )}
                                        </section>
                                    )}

                                    {paymentPending && (
                                        <section className="ra-panel due" aria-labelledby="due-title">
                                            <div className="ra-panel-head">
                                                <h3 id="due-title">Payment due</h3>
                                                <span className="ra-total">{inr(quotation.totalAmount)}</span>
                                            </div>
                                            <p className="ra-muted ra-panel-text">
                                                Pay online with UPI, card or netbanking, or pay your mechanic in cash.
                                            </p>
                                            <Button className="lg block" onClick={() => setShowPaymentOptions(true)} disabled={paymentLoading}>
                                                Pay now
                                            </Button>
                                        </section>
                                    )}

                                    <div className="ra-actions">
                                        {live && (
                                            <Button as={Link} to={`/customer/requests/${activeRequest.requestId}/track`}>
                                                <FaRoute aria-hidden="true" />Track
                                            </Button>
                                        )}
                                        {live && activeRequest.mechanic && (
                                            <Button as={Link} variant="secondary" to={`/customer/requests/${activeRequest.requestId}/communication`}>
                                                <FaCommentDots aria-hidden="true" />Message
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            aria-expanded={showDetails}
                                            aria-controls="ra-details"
                                            onClick={() => setShowDetails((v) => !v)}
                                        >
                                            {showDetails ? "Hide details" : "Details"}
                                        </Button>
                                        {CANCELLABLE.includes(activeRequest.status) && (
                                            <Button variant="danger" onClick={cancel}>Cancel request</Button>
                                        )}
                                    </div>

                                    {showDetails && (
                                        <dl className="ra-facts ra-details" id="ra-details">
                                            <div>
                                                <dt>Requested</dt>
                                                <dd>{when(activeRequest.createdAt) || "Not available"}</dd>
                                            </div>
                                            {activeRequest.location && (
                                                <div>
                                                    <dt>Location</dt>
                                                    <dd>{activeRequest.location}</dd>
                                                </div>
                                            )}
                                        </dl>
                                    )}

                                    {live && (
                                        <section className="ra-map" aria-labelledby="map-title">
                                            <h3 id="map-title"><FaMapMarkerAlt aria-hidden="true" />Live location</h3>
                                            <LiveTrackingMap requestId={activeRequest.requestId} refreshInterval={10000} />
                                        </section>
                                    )}

                                    {activeRequest.status !== "COMPLETED" && (
                                        <aside className="ra-safety" aria-label="Safety tips">
                                            <FaShieldAlt aria-hidden="true" />
                                            <div>
                                                <strong>While you wait</strong>
                                                <ul>
                                                    <li>Switch on your hazard lights.</li>
                                                    <li>Move away from traffic if it's safe to do so.</li>
                                                    <li>Keep your phone charged and your location on.</li>
                                                </ul>
                                                <a className="ra-link" href="tel:112">
                                                    <FaPhoneAlt aria-hidden="true" /> Call emergency services (112)
                                                </a>
                                            </div>
                                        </aside>
                                    )}
                                </div>
                            </article>
                        ) : (
                            <section className="ra-launch ra-dark" aria-labelledby="launch-title">
                                <div className="ra-launch-top">
                                    <div className="ra-launch-copy">
                                        <h2 id="launch-title">Stuck on the road?</h2>
                                        <p>Tell us what's wrong. A mechanic will come to you.</p>
                                    </div>
                                    <Button as={Link} to={ROUTES.request} variant="accent" className="lg ra-launch-cta">
                                        <FaPlus aria-hidden="true" />Get help now
                                    </Button>
                                </div>

                                <div className="ra-launch-divider">
                                    <h3 className="ra-launch-sub">Or pick what went wrong</h3>
                                </div>

                                <div className="ra-issues">
                                    {ISSUES.map((issue) => {
                                        const Icon = issue.icon;
                                        return (
                                            <Link key={issue.id} className="ra-issue" to={`${ROUTES.request}?issue=${issue.id}`}>
                                                <span className="ra-issue-icon" aria-hidden="true"><Icon /></span>
                                                <span className="ra-issue-label">{issue.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* ---------- Shortcuts ---------- */}
                        <nav className="ra-tiles" aria-label="Shortcuts">
                            {SHORTCUTS.map(({ icon: Icon, title, text, to }) => (
                                <Link key={title} to={to} className="ra-tile">
                                    <span className="ra-tile-icon" aria-hidden="true"><Icon /></span>
                                    <span>
                                        {title}
                                        <small>{text}</small>
                                    </span>
                                </Link>
                            ))}
                        </nav>

                        {/* ---------- Recent requests ---------- */}
                        <Card icon={FaHistory} title="Recent requests" to={requests.length ? ROUTES.requests : null}>
                            {initialLoading ? (
                                <div className="ra-skel" style={{ height: 150 }} aria-hidden="true" />
                            ) : recentRequests.length === 0 ? (
                                <Empty
                                    title="No past requests"
                                    text="When you ask for help, your history shows up here."
                                />
                            ) : (
                                <ul className="ra-rows">
                                    {recentRequests.map((r) => (
                                        <Row
                                            key={r.requestId}
                                            icon={FaWrench}
                                            title={r.issue || "Roadside assistance"}
                                            sub={when(r.createdAt)}
                                            end={<Badge status={r.status} />}
                                        />
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>

                    {/* ---------- Side column ---------- */}
                    <aside className="ra-side" aria-label="Your account">

                        <Card icon={FaBell} title="Notifications" unread={unread} to={ROUTES.notifications}>
                            {initialLoading ? (
                                <div className="ra-skel" style={{ height: 120 }} aria-hidden="true" />
                            ) : notifications.length === 0 ? (
                                <Empty title="You're all caught up" text="Updates about your requests will appear here." />
                            ) : (
                                <ul className="ra-rows">
                                    {notifications.slice(0, 3).map((n, i) => (
                                        <Row
                                            key={n.id ?? i}
                                            icon={FaBell}
                                            unread={!n.isRead}
                                            title={noteText(n)}
                                            sub={when(n.createdAt)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card icon={FaReceipt} title="Payments" to={ROUTES.payments}>
                            {initialLoading ? (
                                <div className="ra-skel" style={{ height: 120 }} aria-hidden="true" />
                            ) : payments.length === 0 ? (
                                <Empty title="No payments yet" text="Receipts for your services will show up here." />
                            ) : (
                                <>
                                    <div className="ra-paid">
                                        <strong>{inr(totalPaid)}</strong>
                                        <span>paid so far</span>
                                    </div>
                                    <ul className="ra-rows">
                                        {recentPayments.map((p, i) => (
                                            <Row
                                                key={p.id ?? i}
                                                icon={payMethod(p) === "Cash" ? FaMoneyBillWave : FaCreditCard}
                                                title={inr(p.amount)}
                                                sub={[when(payDate(p)), payMethod(p)].filter(Boolean).join(", ")}
                                            />
                                        ))}
                                    </ul>
                                </>
                            )}
                        </Card>

                        <Card icon={FaCar} title="My vehicles" to={ROUTES.vehicles}>
                            {initialLoading ? (
                                <div className="ra-skel" style={{ height: 90 }} aria-hidden="true" />
                            ) : vehicles.length === 0 ? (
                                <Empty title="No vehicles saved" text="Saved vehicles help mechanics arrive prepared." />
                            ) : (
                                <ul className="ra-rows">
                                    {vehicles.slice(0, 3).map((v, i) => (
                                        <Row
                                            key={v.id ?? i}
                                            icon={FaCar}
                                            title={vehicleName(v)}
                                            sub={vehiclePlate(v)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </Card>

                        <Card icon={FaHeart} title="Favourite mechanics" to={favorites.length ? ROUTES.favorites : null}>
                            {initialLoading ? (
                                <div className="ra-skel" style={{ height: 90 }} aria-hidden="true" />
                            ) : favorites.length === 0 ? (
                                <Empty title="No favourites yet" text="Save a mechanic you trust to find them quickly next time." />
                            ) : (
                                <ul className="ra-rows">
                                    {favorites.slice(0, 3).map((f, i) => (
                                        <Row
                                            key={f.id ?? i}
                                            initial={initialOf(favName(f))}
                                            title={favName(f)}
                                            sub={favSub(f)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </aside>
                </div>

                {/* ---------- Dialogs ---------- */}

                {showPaymentOptions && (
                    <Modal id="pay-title" title="How would you like to pay?" onClose={() => setShowPaymentOptions(false)}>
                        <p className="ra-modal-text">Your service is complete. Pick a payment option.</p>

                        <div className="ra-pay-amount">
                            <span>Amount due</span>
                            <strong>{inr(quotation?.totalAmount)}</strong>
                        </div>

                        <button
                            type="button"
                            className="ra-choice"
                            disabled={paymentLoading}
                            onClick={() => { setShowPaymentOptions(false); pay(); }}
                        >
                            <span className="ra-choice-icon" aria-hidden="true"><FaCreditCard /></span>
                            <span>
                                <strong>Pay online</strong>
                                <small>UPI, cards, netbanking and more</small>
                                <small>Secure checkout by Razorpay</small>
                            </span>
                        </button>

                        <button
                            type="button"
                            className="ra-choice cash"
                            disabled={paymentLoading}
                            onClick={payCash}
                        >
                            <span className="ra-choice-icon" aria-hidden="true"><FaMoneyBillWave /></span>
                            <span>
                                <strong>Pay with cash</strong>
                                <small>Hand the amount to your mechanic</small>
                                <small>Your mechanic confirms once paid</small>
                            </span>
                        </button>
                    </Modal>
                )}

                {showMechanics && rejectedRequest && (
                    <Modal id="mech-title" title="Choose another mechanic" onClose={() => setShowMechanics(false)}>
                        <p className="ra-modal-text">Pick who should take request #{rejectedRequest.requestId}.</p>
                        {mechanics === null ? (
                            <div className="ra-skel" style={{ height: 140 }} aria-hidden="true" />
                        ) : mechanics.length === 0 ? (
                            <Empty title="No mechanics available" text="Try again in a few minutes, or let RoadAid choose for you." />
                        ) : (
                            <ul className="ra-rows">
                                {mechanics.map((m) => (
                                    <li className="ra-row" key={m.id}>
                                        <span className="ra-row-icon" aria-hidden="true">{initialOf(m.user?.fullName)}</span>
                                        <div className="ra-row-main">
                                            <div className="ra-row-title">{m.user?.fullName || "Mechanic"}</div>
                                            <div className="ra-row-sub">{m.workshopName || "Independent mechanic"}</div>
                                            {Number(m.experienceYears) > 0 && (
                                                <div className="ra-row-sub">
                                                    {m.experienceYears} {Number(m.experienceYears) === 1 ? "year" : "years"} of experience
                                                </div>
                                            )}
                                        </div>
                                        <Button onClick={() => selectMechanic(m)}>Select</Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Modal>
                )}

                {showReviewPopup && reviewRequest && (
                    <Modal id="review-title" title="How did it go?" onClose={skipReview}>
                        <p className="ra-modal-text">
                            Rate the service by{" "}
                            <strong>
                                {reviewRequest.mechanic || reviewRequest.mechanicName || reviewRequest.providerName || "your mechanic"}
                            </strong>
                            . It takes 10 seconds.
                        </p>

                        <div className="ra-stars" role="radiogroup" aria-label="Your rating">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    type="button"
                                    key={s}
                                    role="radio"
                                    aria-checked={rating === s}
                                    aria-label={`${s} star${s > 1 ? "s" : ""}`}
                                    className={`ra-star ${s <= rating ? "on" : ""}`}
                                    onClick={() => setRating(s)}
                                >
                                    <FaStar aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                        <div className="ra-star-label" aria-live="polite">{rating ? RATING_LABELS[rating - 1] : ""}</div>

                        <p className="ra-field-label">What stood out? (optional)</p>
                        <div className="ra-chips">
                            {REVIEW_TAGS.map((tag) => (
                                <button
                                    type="button"
                                    key={tag}
                                    className="ra-chip"
                                    aria-pressed={reviewTags.includes(tag)}
                                    onClick={() => toggleReviewTag(tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        <label className="ra-field-label" htmlFor="review-comment">Tell us more (optional)</label>
                        <textarea
                            id="review-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="What was your experience like?"
                        />

                        <div className="ra-modal-actions">
                            <Button variant="ghost" onClick={skipReview}>Skip for now</Button>
                            <Button disabled={!rating || reviewLoading} onClick={() => review(reviewRequest.requestId)}>
                                {reviewLoading ? "Submitting…" : "Submit review"}
                            </Button>
                        </div>
                    </Modal>
                )}

                {confirm && (
                    <Modal id="confirm-title" title={confirm.title} onClose={confirmBusy ? undefined : () => setConfirm(null)}>
                        <p className="ra-modal-text">{confirm.body}</p>
                        <div className="ra-modal-actions">
                            <Button variant="secondary" onClick={() => setConfirm(null)} disabled={confirmBusy}>
                                {confirm.cancelLabel || "Go back"}
                            </Button>
                            <Button variant={confirm.danger ? "destructive" : "primary"} onClick={runConfirm} disabled={confirmBusy}>
                                {confirmBusy ? "Working…" : confirm.confirmLabel}
                            </Button>
                        </div>
                    </Modal>
                )}

                <div className="ra-toasts" aria-live={toast?.tone === "error" ? "assertive" : "polite"}>
                    {toast && <div className={`ra-toast ${toast.tone}`} role="status">{toast.message}</div>}
                </div>
            </div>
        </CustomerLayout>
    );
}