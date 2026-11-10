import { useState } from "react";
import Navbar from "../components/common/Navbar";
import AdminSidebar from "../components/admin/AdminSidebar";

// Same token set as AdminSidebar.jsx / Navbar.jsx / Footer.jsx / Dashboard.jsx.
const COLOR = {
    bg: "#f6f7f9"
};

function AdminLayout({ children }) {
    // Single source of truth for the mobile drawer — Navbar's hamburger opens
    // it, AdminSidebar's backdrop/Escape/route-change close it. Without this
    // lifted here, the two components would each keep their own separate
    // "is the drawer open" state and go out of sync.
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <div>
            <Navbar onMenuClick={() => setMobileNavOpen(true)} />

            <div className="d-flex">
                <AdminSidebar
                    mobileOpen={mobileNavOpen}
                    onMobileClose={() => setMobileNavOpen(false)}
                />

                <div
                    className="flex-grow-1 p-4"
                    style={{ background: COLOR.bg, minHeight: "calc(100vh - 60px)" }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export default AdminLayout;