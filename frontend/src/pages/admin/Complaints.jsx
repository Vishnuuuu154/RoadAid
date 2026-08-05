import { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { getComplaints } from "../../services/adminService";

function Complaints() {

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {

        try {

            const response = await getComplaints();

            setComplaints(response.data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }

    };

    return (

        <AdminLayout>

            <h2 className="mb-4">

                Complaints

            </h2>

            {loading ? (

                <div className="text-center">

                    <div
                        className="spinner-border text-primary"
                        role="status"
                    >
                    </div>

                    <p className="mt-2">

                        Loading complaints...

                    </p>

                </div>

            ) : (

                <table className="table table-hover align-middle">

                    <thead className="table-dark">

                    <tr>

                        <th>ID</th>
                        <th>Request</th>
                        <th>Reported By</th>
                        <th>Reported Against</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Date</th>

                    </tr>

                    </thead>

                    <tbody>

                    {complaints.length === 0 ? (

                        <tr>

                            <td
                                colSpan="7"
                                className="text-center"
                            >

                                No complaints found.

                            </td>

                        </tr>

                    ) : (

                        complaints.map((complaint) => (

                            <tr key={complaint.complaintId}>

                                <td>{complaint.complaintId}</td>

                                <td>{complaint.serviceRequestId}</td>

                                <td>{complaint.reportedBy}</td>

                                <td>{complaint.reportedAgainst}</td>

                                <td>{complaint.reason}</td>

                                <td>

                                    {complaint.status === "OPEN" ? (

                                        <span className="badge bg-danger">

                                            OPEN

                                        </span>

                                    ) : (

                                        <span className="badge bg-success">

                                            RESOLVED

                                        </span>

                                    )}

                                </td>

                                <td>

                                    {new Date(
                                        complaint.createdAt
                                    ).toLocaleDateString()}

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

export default Complaints;