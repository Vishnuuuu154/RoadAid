import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout, getUser } from "../services/authService";
import api from "../services/api";
import NotificationBell from "../components/NotificationBell";
import CustomerSidebar, { RoadAidMark } from "../components/customer/CustomerSidebar";
import { FaBars, FaSignOutAlt, FaChevronDown, FaUser } from "react-icons/fa";
import "../styles/Customer layout.css";

function initialsOf(name) {
    if (!name) return "?";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
}

function CustomerLayout({ children }) {
    const navigate = useNavigate();
    const user = getUser?.() || null;

    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileImage, setProfileImage] = useState("");
    const menuRef = useRef(null);

    useEffect(() => {
        const loadProfileImage = async () => {
            try {
                const response = await api.get("/users/profile");
                setProfileImage(response.data?.profileImage || "");
            } catch (error) {
                console.error("Failed to load profile image:", error);
            }
        };

        loadProfileImage();
    }, []);

    // Close the account menu on outside click or Escape.
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onPointerDown = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const firstName = (user?.fullName || "Customer").split(" ")[0];

    return (
        <div className="cl-shell">
            <a className="cl-skip" href="#main-content">Skip to main content</a>

            <header className="cl-topbar">
                <div className="cl-side-group">
                    <button
                        type="button"
                        className="cl-icon-btn cl-menu-trigger"
                        onClick={() => setMobileNavOpen(true)}
                        aria-label="Open menu"
                    >
                        <FaBars size={18} aria-hidden="true" />
                    </button>

                    <div className="cl-brand">
                        <span className="cl-brand-mark">
                            <RoadAidMark size={18} />
                        </span>
                        RoadAid
                    </div>
                </div>

                <div className="cl-side-group">
                    <NotificationBell notificationsPath="/customer/notifications" />

                    <div className="cl-user-wrap" ref={menuRef}>
                        <button
                            type="button"
                            className="cl-user"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-expanded={menuOpen}
                            aria-controls="cl-account-menu"
                        >
                            <span className="cl-avatar">
                                {profileImage ? (
                                    <img src={profileImage} alt="" />
                                ) : (
                                    initialsOf(user?.fullName)
                                )}
                            </span>
                            <span className="cl-user-name">{firstName}</span>
                            <FaChevronDown size={10} aria-hidden="true" className={menuOpen ? "cl-chevron open" : "cl-chevron"} />
                            <span className="cl-sr">Account menu</span>
                        </button>

                        {menuOpen && (
                            <div className="cl-menu" id="cl-account-menu">
                                <div className="cl-menu-head">
                                    <strong>{user?.fullName || "Customer"}</strong>
                                    <span>{user?.email || "Signed in"}</span>
                                </div>

                                <Link
                                    to="/customer/profile"
                                    className="cl-menu-item"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <FaUser size={14} aria-hidden="true" />
                                    My profile
                                </Link>

                                <button type="button" className="cl-menu-item danger" onClick={handleLogout}>
                                    <FaSignOutAlt size={14} aria-hidden="true" />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="cl-body">
                <CustomerSidebar
                    mobileOpen={mobileNavOpen}
                    onMobileClose={() => setMobileNavOpen(false)}
                />

                <main className="cl-main" id="main-content" tabIndex={-1}>
                    <div className="cl-content">{children}</div>
                </main>
            </div>
        </div>
    );
}

export default CustomerLayout;