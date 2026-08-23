import { useEffect, useState } from "react";
import CustomerLayout from "../../layouts/CustomerLayout";
import api from "../../services/api";

function Payments() {

    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {

        try {

            setLoading(true);
            setError("");

            const response = await api.get("/payments/my");

            setPayments(response.data);

        } catch (error) {

            console.error(
                "Failed to load payments:",
                error
            );

            setError(
                error.response?.data?.message ||
                "Failed to load payment history."
            );

        } finally {

            setLoading(false);

        }
    };


    const formatAmount = (amount) => {

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR"
        }).format(amount || 0);

    };


    const formatDate = (date) => {

        if (!date) {
            return "—";
        }

        return new Date(date).toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );

    };


    return (

        <CustomerLayout>

            {/* HEADER */}

            <div className="mb-4">

                <h2 className="fw-bold mb-1">
                    💳 Payments
                </h2>

                <p className="text-muted mb-0">
                    View your RoadAid payment history.
                </p>

            </div>


            {/* LOADING */}

            {loading && (

                <div className="card border-0 shadow-sm">

                    <div className="card-body text-center py-5">

                        <div className="spinner-border text-primary mb-3">
                        </div>

                        <p className="text-muted mb-0">
                            Loading payments...
                        </p>

                    </div>

                </div>

            )}


            {/* ERROR */}

            {!loading && error && (

                <div className="alert alert-danger">

                    <h5 className="fw-bold">
                        Unable to Load Payments
                    </h5>

                    <p className="mb-3">
                        {error}
                    </p>

                    <button
                        className="btn btn-danger"
                        onClick={loadPayments}
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* EMPTY */}

            {!loading &&
                !error &&
                payments.length === 0 && (

                    <div className="card border-0 shadow-sm">

                        <div className="card-body text-center py-5">

                            <div className="fs-1 mb-3">
                                💳
                            </div>

                            <h5 className="fw-bold">
                                No Payments Yet
                            </h5>

                            <p className="text-muted mb-0">
                                Your completed RoadAid payments
                                will appear here.
                            </p>

                        </div>

                    </div>

                )}


            {/* PAYMENTS */}

            {!loading &&
                !error &&
                payments.length > 0 && (

                    <div className="row g-4">

                        {payments.map((payment) => (

                            <div
                                className="col-12 col-lg-6"
                                key={payment.id}
                            >

                                <div className="card border-0 shadow-sm h-100">

                                    <div className="card-body p-4">

                                        {/* HEADER */}

                                        <div className="d-flex justify-content-between align-items-start mb-4">

                                            <div>

                                                <small className="text-muted">
                                                    Payment #{payment.id}
                                                </small>

                                                <h5 className="fw-bold mt-1 mb-0">
                                                    {formatAmount(
                                                        payment.amount
                                                    )}
                                                </h5>

                                            </div>

                                            <span className="badge bg-success">
                                                ✅ {payment.paymentStatus}
                                            </span>

                                        </div>


                                        {/* DETAILS */}

                                        <div className="border-top pt-3">

                                            <div className="d-flex justify-content-between mb-3">

                                                <span className="text-muted">
                                                    Payment Method
                                                </span>

                                                <strong>
                                                    {payment.paymentMethod ||
                                                        "—"}
                                                </strong>

                                            </div>


                                            <div className="d-flex justify-content-between mb-3">

                                                <span className="text-muted">
                                                    Payment Date
                                                </span>

                                                <span className="text-end">
                                                    {formatDate(
                                                        payment.paymentDate
                                                    )}
                                                </span>

                                            </div>


                                            <div className="d-flex justify-content-between">

                                                <span className="text-muted">
                                                    Request
                                                </span>

                                                <strong>
                                                    #{payment.quotation?.serviceRequest?.id ||
                                                    "—"}
                                                </strong>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

        </CustomerLayout>

    );
}

export default Payments;