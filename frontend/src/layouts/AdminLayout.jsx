import Navbar from "../components/common/Navbar";
import AdminSidebar from "../components/admin/AdminSidebar";

function AdminLayout({ children }) {

    return (

        <div>

            <Navbar />

            <div className="d-flex">

                <AdminSidebar />

                <div
                    className="flex-grow-1 p-4"
                    style={{ background: "#f4f7fb", minHeight: "100vh" }}
                >

                    {children}

                </div>

            </div>

        </div>

    );

}

export default AdminLayout;