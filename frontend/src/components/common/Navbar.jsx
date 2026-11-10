import { useEffect, useState } from "react";
import { getUser, logout } from "../../services/authService.js";
import { useNavigate } from "react-router-dom";
import { FaBars, FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import api from "../../services/api";
import "../../styles/Navbar.css";

/* ------------------------------------------------------------------
   Brand mark — a simple, static logo. (The previous version secretly
   fetched the user's profile photo inside this component too, even
   though the result was never used anywhere — that fetch is gone.)
   ------------------------------------------------------------------ */
function RoadAidMark({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M12 2C7.6 2 4 5.5 4 9.8 4 15.3 12 22 12 22s8-6.7 8-12.2C20 5.5 16.4 2 12 2Z"
                fill="#ffffff"
                fillOpacity="0.92"
            />
            <path
                d="M12 6.3c-1.9 0-3.4 1.5-3.4 3.4 0 .5.1.9.3 1.3l-1.6 1.6c-.2.2-.2.5 0 .7l.7.7c.2.2.5.2.7 0l1.6-1.6c.4.2.9.3 1.3.3.5 0 .9-.1 1.3-.3l1.6 1.6c.2.2.5.2.7 0l.7-.7c.2-.2.2-.5 0-.7l-1.6-1.6c.2-.4.3-.8.3-1.3 0-1.9-1.5-3.4-3.6-3.4Zm0 1.4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2Z"
                fill="#e2661f"
            />
        </svg>
    );
}

function initialsOf(name) {
    if (!name) return "?";

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
}

function Navbar({ onMenuClick }) {
    const navigate = useNavigate();
    const user = getUser();

    const [menuOpen, setMenuOpen] = useState(false);
    const [profileImage, setProfileImage] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await api.get("/users/profile");
                setProfileImage(response.data?.profileImage || null);
            } catch (error) {
                console.error("Failed to load profile image:", error);
            }
        };

        loadProfile();
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const renderAvatar = (size = 30) => (
        <div className="navbar__avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
            {profileImage ? (
                <img src={profileImage} alt="" />
            ) : (
                initialsOf(user?.fullName)
            )}
        </div>
    );

    return (
        <nav className="navbar">
            {/* LEFT */}
            <div className="navbar__left">
                <button
                    type="button"
                    className="navbar__menu-btn"
                    onClick={onMenuClick}
                    aria-label="Open menu"
                >
                    <FaBars size={16} />
                </button>

                <a href="/mechanic" className="navbar__brand">
                    <span className="navbar__mark">
                        <RoadAidMark size={16} />
                    </span>
                    <span className="navbar__name">RoadAid</span>
                </a>
            </div>

            {/* RIGHT */}
            <div className="navbar__right">
                <button
                    type="button"
                    className="navbar__user-btn"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                >
                    {renderAvatar(28)}
                    <span className="navbar__user-name">{user?.fullName || "Account"}</span>
                    <FaChevronDown className="navbar__chevron" />
                </button>

                {menuOpen && (
                    <>
                        <div className="navbar__scrim" onClick={() => setMenuOpen(false)} />

                        <div className="navbar__dropdown">
                            <div className="navbar__dropdown-header">
                                <div className="navbar__dropdown-name">{user?.fullName || "Account"}</div>
                                <div className="navbar__dropdown-email">{user?.email || "Signed in"}</div>
                            </div>

                            <button
                                type="button"
                                className="navbar__dropdown-item"
                                onClick={handleLogout}
                            >
                                <FaSignOutAlt />
                                Logout
                            </button>
                        </div>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Navbar;