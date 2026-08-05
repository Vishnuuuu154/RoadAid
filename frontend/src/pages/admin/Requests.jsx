import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { getRequests } from "../../services/adminService";

function Requests() {

    const [requests, setRequests] = useState([]);
    const [status, setStatus] = useState("");
    const [customer, setCustomer] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {

        try {

            const response = await getRequests(status, customer);

            setRequests(response.data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    return (

        <AdminLayout>

            <h2 className="mb-4">

                Service Requests

            </h2>

            <div className="row mb-3">

                <div className="col-md-4">

                    <input
                        className="form-control"
                        placeholder="Search Customer..."
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                    />

                </div>

                <div className="col-md-3">

                    <select
                        className="form-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >

                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>

                    </select>

                </div>

                <div className="col-md-2">

                    <button
                        className="btn btn-primary w-100"
                        onClick={loadRequests}
                    >
                        Search
                    </button>

                </div>

            </div>

            {loading ? (

                <div className="text-center">

                    <div className="spinner-border text-primary"></div>

                </div>

            ) : (

                <table className="table table-hover align-middle">

                    <thead className="table-dark">

                    <tr>

                        <th>ID</th>
                        <th>Customer</th>
                        <th>Mechanic</th>
                        <th>Vehicle</th>
                        <th>Status</th>
                        <th>Date</th>

                    </tr>

                    </thead>

                    <tbody>

                    {requests.length === 0 ? (

                        <tr>

                            <td colSpan="6" className="text-center">

                                No Requests Found

                            </td>

                        </tr>

                    ) : (

                        requests.map((request) => (

                            <tr key={request.requestId}>

                                <td>{request.requestId}</td>

                                <td>{request.customerName}</td>

                                <td>{request.mechanicName}</td>

                                <td>{request.vehicle}</td>

                                <td>{request.status}</td>

                                <td>
                                    {new Date(request.createdAt).toLocaleDateString()}
                                </td>

                            </tr>

                        ))

                    )}

                    </tbody>

                </table>

            )}

        </AdminLayout>

    );

}

export default Requests;