import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

/* Where a payment takes the customer. Change this if your customer route differs. */
const ROUTES = {
    request: (id) => `/customer/requests/${id}`,
};

/* Accepts a plain list, or a list wrapped in a common field (Spring pages use "content"). */
const toList = (data) => {
    if (Array.isArray(data)) return data;

    for (const key of ["content", "data", "payments", "items", "results"]) {
        if (Array.isArray(data?.[key])) return data[key];
    }

    return null;
};

function Payments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/payments/my");
            const list = toList(response.data);

            if (list === null) {
                /* The server answered, but not with a list we can read. */
                console.warn("Unexpected /payments/my response:", response.data);
                setPayments([]);
                setError(
                    "The server sent payment data in a format this page could not read. " +
                    "Open the browser console (F12) to see the response."
                );
            } else {
                console.info(`[Payments] /payments/my returned ${list.length} record(s)`);
                setPayments(list);
            }
        } catch (error) {
            console.error("Failed to load payments:", error);
            setError(
                error.response?.data?.message ||
                "Failed to load payment history."
            );
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(Number(amount) || 0);

    const formatDate = (date) => {
        if (!date) return "—";

        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return "—";

        return parsed.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const getStatus = (payment) => {
        const status = String(payment?.paymentStatus || "").toUpperCase();

        if (status === "SUCCESS") return "SUCCESS";
        if (
            status === "PENDING" ||
            status === "CREATED" ||
            status === "CASH_PENDING"
        ) {
            return "PENDING";
        }
        if (status === "FAILED") return "FAILED";
        if (status === "REFUNDED") return "REFUNDED";

        return status || "UNKNOWN";
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "SUCCESS":
                return "Paid";
            case "PENDING":
                return "Pending";
            case "FAILED":
                return "Failed";
            case "REFUNDED":
                return "Refunded";
            default:
                return status.charAt(0) + status.slice(1).toLowerCase();
        }
    };

    const getMethodLabel = (method) => {
        const value = String(method || "").toUpperCase();

        switch (value) {
            case "RAZORPAY":
                return "Online Payment";
            case "CASH":
                return "Cash";
            case "UPI":
                return "UPI";
            case "CARD":
                return "Card";
            case "NETBANKING":
                return "Net Banking";
            default:
                return value
                    ? value
                        .toLowerCase()
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase())
                    : "—";
        }
    };

    const getRequest = (payment) =>
        payment?.quotation?.serviceRequest ||
        payment?.serviceRequest ||
        null;

    const getRequestId = (payment) => {
        const request = getRequest(payment);

        return (
            request?.id ??
            request?.requestId ??
            payment?.quotation?.serviceRequestId ??
            payment?.requestId ??
            "—"
        );
    };

    const getMechanicName = (payment) => {
        const request = getRequest(payment);
        const mechanic = request?.mechanic;

        return (
            mechanic?.user?.fullName ||
            mechanic?.fullName ||
            mechanic?.user?.name ||
            mechanic?.name ||
            "RoadAid Service Provider"
        );
    };

    const sortedPayments = useMemo(() => {
        return [...payments].sort((a, b) => {
            const dateA = a?.paymentDate
                ? new Date(a.paymentDate).getTime()
                : 0;
            const dateB = b?.paymentDate
                ? new Date(b.paymentDate).getTime()
                : 0;

            if (dateB !== dateA) return dateB - dateA;

            return Number(b?.id || 0) - Number(a?.id || 0);
        });
    }, [payments]);

    const filteredPayments = useMemo(() => {
        const query = search.trim().toLowerCase();

        return sortedPayments.filter((payment) => {
            const status = getStatus(payment);
            const requestId = String(getRequestId(payment));
            const mechanic = getMechanicName(payment).toLowerCase();
            const method = getMethodLabel(payment?.paymentMethod).toLowerCase();

            const matchesStatus =
                statusFilter === "ALL" || status === statusFilter;

            const matchesSearch =
                !query ||
                String(payment?.id || "").includes(query) ||
                requestId.toLowerCase().includes(query) ||
                mechanic.includes(query) ||
                method.includes(query);

            return matchesStatus && matchesSearch;
        });
    }, [sortedPayments, search, statusFilter]);

    const successfulPayments = payments.filter(
        (payment) => getStatus(payment) === "SUCCESS"
    );

    const pendingPayments = payments.filter(
        (payment) => getStatus(payment) === "PENDING"
    );

    const totalPaid = successfulPayments.reduce(
        (total, payment) => total + (Number(payment?.amount) || 0),
        0
    );

    const css = `
        .ra-payments {
            max-width: 1180px;
            margin: 0 auto;
            padding: 28px 24px 48px;
            color: #172033;
        }

        .ra-payments * {
            box-sizing: border-box;
        }

        .ra-payments-hero {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 24px;
        }

        .ra-payments-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 9px;
            font-size: 12px;
            font-weight: 750;
            letter-spacing: .08em;
            text-transform: uppercase;
            color: #667085;
        }

        .ra-payments-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #18a957;
        }

        .ra-payments-title {
            margin: 0;
            font-size: clamp(28px, 4vw, 38px);
            line-height: 1.12;
            letter-spacing: -.035em;
            font-weight: 800;
        }

        .ra-payments-subtitle {
            margin: 9px 0 0;
            color: #667085;
            font-size: 15px;
            line-height: 1.55;
        }

        .ra-refresh {
            border: 1px solid #e4e7ec;
            background: #fff;
            color: #344054;
            border-radius: 11px;
            padding: 10px 15px;
            font-weight: 700;
            cursor: pointer;
            transition: .2s ease;
        }

        .ra-refresh:hover {
            border-color: #cfd4dc;
            transform: translateY(-1px);
        }

        .ra-summary {
            display: grid;
            grid-template-columns: 1.35fr 1fr 1fr;
            gap: 14px;
            margin-bottom: 25px;
        }

        .ra-summary-card {
            min-height: 118px;
            padding: 20px;
            border: 1px solid #eaecf0;
            border-radius: 16px;
            background: #fff;
        }

        .ra-summary-card.primary {
            border-color: #d7e8dd;
            background: linear-gradient(135deg, #f5fbf7, #ffffff);
        }

        .ra-summary-label {
            color: #667085;
            font-size: 13px;
            font-weight: 650;
        }

        .ra-summary-value {
            margin-top: 9px;
            font-size: 25px;
            font-weight: 800;
            letter-spacing: -.025em;
        }

        .ra-summary-meta {
            margin-top: 6px;
            color: #98a2b3;
            font-size: 12px;
        }

        .ra-toolbar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 17px;
        }

        .ra-search-wrap {
            position: relative;
            flex: 1;
        }

        .ra-search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #98a2b3;
            font-size: 16px;
            pointer-events: none;
        }

        .ra-search {
            width: 100%;
            height: 44px;
            padding: 0 14px 0 39px;
            border: 1px solid #e4e7ec;
            border-radius: 11px;
            outline: none;
            background: #fff;
            color: #172033;
            font-size: 14px;
            transition: .2s ease;
        }

        .ra-search:focus {
            border-color: #98a2b3;
            box-shadow: 0 0 0 3px rgba(16, 24, 40, .04);
        }

        .ra-filter {
            height: 44px;
            min-width: 145px;
            padding: 0 13px;
            border: 1px solid #e4e7ec;
            border-radius: 11px;
            background: #fff;
            color: #344054;
            font-size: 14px;
            font-weight: 650;
            outline: none;
            cursor: pointer;
        }

        .ra-history-title {
            margin: 0 0 12px;
            font-size: 18px;
            font-weight: 780;
            letter-spacing: -.015em;
        }

        .ra-payment-list {
            display: grid;
            gap: 11px;
        }

        .ra-payment-card {
            border: 1px solid #eaecf0;
            border-radius: 15px;
            background: #fff;
            padding: 18px 20px;
            transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
        }

        .ra-payment-card:hover {
            border-color: #d5d9e0;
            box-shadow: 0 8px 24px rgba(16, 24, 40, .055);
            transform: translateY(-1px);
        }

        .ra-payment-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 16px;
            border-bottom: 1px solid #f0f1f3;
        }

        .ra-payment-heading {
            display: flex;
            align-items: center;
            gap: 11px;
            min-width: 0;
        }

        .ra-status-icon {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            display: grid;
            place-items: center;
            border-radius: 50%;
            font-size: 15px;
            font-weight: 900;
        }

        .ra-status-icon.success {
            background: #eaf8ef;
            color: #15803d;
        }

        .ra-status-icon.pending {
            background: #fff7e6;
            color: #b76e00;
        }

        .ra-status-icon.failed {
            background: #fef0f0;
            color: #c43232;
        }

        .ra-status-icon.refunded {
            background: #eef4ff;
            color: #315ca8;
        }

        .ra-status-icon.unknown {
            background: #f2f4f7;
            color: #667085;
        }

        .ra-payment-number {
            margin: 0;
            font-size: 15px;
            font-weight: 780;
        }

        .ra-payment-status {
            margin-top: 3px;
            color: #667085;
            font-size: 12px;
        }

        .ra-payment-amount {
            font-size: 20px;
            font-weight: 820;
            letter-spacing: -.02em;
            white-space: nowrap;
        }

        .ra-payment-details {
            display: grid;
            grid-template-columns: 1.3fr .8fr .9fr 1fr;
            gap: 18px;
            padding-top: 16px;
        }

        .ra-detail-label {
            display: block;
            margin-bottom: 5px;
            color: #98a2b3;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .045em;
            text-transform: uppercase;
        }

        .ra-detail-value {
            color: #344054;
            font-size: 13px;
            font-weight: 680;
            line-height: 1.4;
        }

        .ra-detail-value.muted {
            font-weight: 560;
            color: #667085;
        }

        .ra-payment-link {
            display: block;
            color: inherit;
            text-decoration: none;
            cursor: pointer;
        }

        .ra-payment-link:focus-visible {
            outline: 3px solid rgba(24, 169, 87, .35);
            outline-offset: 2px;
        }

        .ra-request-go {
            margin-left: 4px;
            color: #15803d;
            font-weight: 700;
            opacity: 0;
            transition: opacity .15s ease;
        }

        .ra-payment-link:hover .ra-request-go,
        .ra-payment-link:focus-visible .ra-request-go {
            opacity: 1;
        }

        @media (hover: none) {
            .ra-request-go {
                opacity: 1;
            }
        }

        .ra-empty,
        .ra-error,
        .ra-loading {
            border: 1px solid #eaecf0;
            border-radius: 15px;
            background: #fff;
            padding: 48px 24px;
            text-align: center;
        }

        .ra-empty-icon {
            width: 46px;
            height: 46px;
            display: grid;
            place-items: center;
            margin: 0 auto 13px;
            border-radius: 13px;
            background: #f2f4f7;
            font-size: 21px;
        }

        .ra-empty h3,
        .ra-error h3 {
            margin: 0;
            font-size: 17px;
            font-weight: 780;
        }

        .ra-empty p,
        .ra-error p {
            max-width: 430px;
            margin: 7px auto 0;
            color: #667085;
            font-size: 13px;
            line-height: 1.55;
        }

        .ra-error {
            border-color: #f1d0d0;
            background: #fffafa;
        }

        .ra-error h3 {
            color: #b42318;
        }

        .ra-loading-line {
            width: min(420px, 80%);
            height: 11px;
            margin: 0 auto 12px;
            border-radius: 99px;
            background: #f0f2f5;
            animation: raPulse 1.2s ease-in-out infinite;
        }

        .ra-loading-line.short {
            width: min(250px, 55%);
        }

        @keyframes raPulse {
            50% { opacity: .45; }
        }

        @media (max-width: 820px) {
            .ra-summary {
                grid-template-columns: 1fr 1fr;
            }

            .ra-summary-card.primary {
                grid-column: 1 / -1;
            }

            .ra-payment-details {
                grid-template-columns: 1fr 1fr;
                row-gap: 15px;
            }
        }

        @media (max-width: 620px) {
            .ra-payments {
                padding: 22px 15px 35px;
            }

            .ra-payments-hero {
                align-items: flex-start;
                flex-direction: column;
                gap: 14px;
            }

            .ra-refresh {
                width: 100%;
            }

            .ra-summary {
                grid-template-columns: 1fr;
            }

            .ra-summary-card.primary {
                grid-column: auto;
            }

            .ra-toolbar {
                flex-direction: column;
                align-items: stretch;
            }

            .ra-filter {
                width: 100%;
            }

            .ra-payment-card {
                padding: 16px;
            }

            .ra-payment-top {
                align-items: flex-start;
            }

            .ra-payment-amount {
                font-size: 17px;
            }

            .ra-payment-details {
                grid-template-columns: 1fr 1fr;
                gap: 15px 12px;
            }
        }

        @media (max-width: 410px) {
            .ra-payment-top {
                flex-direction: column;
            }

            .ra-payment-amount {
                align-self: flex-start;
            }

            .ra-payment-details {
                grid-template-columns: 1fr;
            }
        }
    `;

    if (loading) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <main className="ra-payments">
                    <div className="ra-payments-hero">
                        <div>
                            <div className="ra-payments-eyebrow">
                                <span className="ra-payments-dot" />
                                RoadAid Payments
                            </div>
                            <h1 className="ra-payments-title">Payments</h1>
                            <p className="ra-payments-subtitle">
                                View your RoadAid payment history in one place.
                            </p>
                        </div>
                    </div>

                    <div className="ra-loading">
                        <div className="ra-loading-line" />
                        <div className="ra-loading-line short" />
                    </div>
                </main>
            </CustomerLayout>
        );
    }

    if (error) {
        return (
            <CustomerLayout>
                <style>{css}</style>
                <main className="ra-payments">
                    <div className="ra-payments-hero">
                        <div>
                            <div className="ra-payments-eyebrow">
                                <span className="ra-payments-dot" />
                                RoadAid Payments
                            </div>
                            <h1 className="ra-payments-title">Payments</h1>
                            <p className="ra-payments-subtitle">
                                View your RoadAid payment history in one place.
                            </p>
                        </div>
                        <button className="ra-refresh" onClick={loadPayments}>
                            Try again
                        </button>
                    </div>

                    <div className="ra-error">
                        <h3>Unable to load payments</h3>
                        <p>{error}</p>
                    </div>
                </main>
            </CustomerLayout>
        );
    }

    return (
        <CustomerLayout>
            <style>{css}</style>

            <main className="ra-payments">
                <header className="ra-payments-hero">
                    <div>
                        <div className="ra-payments-eyebrow">
                            <span className="ra-payments-dot" />
                            RoadAid Payments
                        </div>

                        <h1 className="ra-payments-title">Payments</h1>

                        <p className="ra-payments-subtitle">
                            A clear record of your RoadAid service payments.
                        </p>
                    </div>

                    <button className="ra-refresh" onClick={loadPayments}>
                        Refresh
                    </button>
                </header>

                <section className="ra-summary">
                    <div className="ra-summary-card primary">
                        <div className="ra-summary-label">Total paid</div>
                        <div className="ra-summary-value">
                            {formatAmount(totalPaid)}
                        </div>
                        <div className="ra-summary-meta">
                            Across successful RoadAid payments
                        </div>
                    </div>

                    <div className="ra-summary-card">
                        <div className="ra-summary-label">Successful</div>
                        <div className="ra-summary-value">
                            {successfulPayments.length}
                        </div>
                        <div className="ra-summary-meta">Completed payments</div>
                    </div>

                    <div className="ra-summary-card">
                        <div className="ra-summary-label">Pending</div>
                        <div className="ra-summary-value">
                            {pendingPayments.length}
                        </div>
                        <div className="ra-summary-meta">Awaiting confirmation</div>
                    </div>
                </section>

                {payments.length > 0 && (
                    <>
                        <div className="ra-toolbar">
                            <div className="ra-search-wrap">
                                <span className="ra-search-icon">⌕</span>
                                <input
                                    className="ra-search"
                                    type="search"
                                    placeholder="Search payment, request or mechanic..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <select
                                className="ra-filter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All statuses</option>
                                <option value="SUCCESS">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="FAILED">Failed</option>
                                <option value="REFUNDED">Refunded</option>
                            </select>
                        </div>

                        <h2 className="ra-history-title">
                            Payment history
                        </h2>

                        {filteredPayments.length > 0 ? (
                            <section className="ra-payment-list">
                                {filteredPayments.map((payment) => {
                                    const status = getStatus(payment);
                                    const statusClass = status.toLowerCase();
                                    const requestId = getRequestId(payment);
                                    const linkable =
                                        requestId !== "—" &&
                                        requestId !== null &&
                                        requestId !== undefined;
                                    const Card = linkable ? Link : "article";
                                    const cardProps = linkable
                                        ? {
                                            to: ROUTES.request(requestId),
                                            className:
                                                "ra-payment-card ra-payment-link",
                                        }
                                        : { className: "ra-payment-card" };

                                    return (
                                        <Card key={payment.id} {...cardProps}>
                                            <div className="ra-payment-top">
                                                <div className="ra-payment-heading">
                                                    <div
                                                        className={`ra-status-icon ${statusClass}`}
                                                    >
                                                        {status === "SUCCESS"
                                                            ? "✓"
                                                            : status === "FAILED"
                                                                ? "!"
                                                                : status === "REFUNDED"
                                                                    ? "↩"
                                                                    : "•"}
                                                    </div>

                                                    <div>
                                                        <h3 className="ra-payment-number">
                                                            Payment #{payment.id}
                                                        </h3>
                                                        <div className="ra-payment-status">
                                                            {getStatusLabel(status)}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="ra-payment-amount">
                                                    {formatAmount(payment.amount)}
                                                </div>
                                            </div>

                                            <div className="ra-payment-details">
                                                <div>
                                                    <span className="ra-detail-label">
                                                        Paid to
                                                    </span>
                                                    <span className="ra-detail-value">
                                                        {getMechanicName(payment)}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="ra-detail-label">
                                                        Request
                                                    </span>
                                                    <span className="ra-detail-value">
                                                        #{requestId}
                                                        {linkable && (
                                                            <span className="ra-request-go">
                                                                {" "}View →
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="ra-detail-label">
                                                        Method
                                                    </span>
                                                    <span className="ra-detail-value muted">
                                                        {getMethodLabel(
                                                            payment.paymentMethod
                                                        )}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="ra-detail-label">
                                                        Date
                                                    </span>
                                                    <span className="ra-detail-value muted">
                                                        {formatDate(
                                                            payment.paymentDate
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </section>
                        ) : (
                            <div className="ra-empty">
                                <div className="ra-empty-icon">⌕</div>
                                <h3>No matching payments</h3>
                                <p>
                                    Try a different search term or status
                                    filter.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {payments.length === 0 && (
                    <div className="ra-empty">
                        <div className="ra-empty-icon">₹</div>
                        <h3>No payments yet</h3>
                        <p>
                            Your completed RoadAid payments will appear here
                            once you make your first payment.
                        </p>
                    </div>
                )}
            </main>
        </CustomerLayout>
    );
}

export default Payments;