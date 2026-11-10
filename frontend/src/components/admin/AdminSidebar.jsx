import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    FaHome,
    FaUsers,
    FaClipboardList,
    FaExclamationTriangle,
    FaChartBar,
    FaSignOutAlt,
    FaCreditCard,
    FaUserCheck,
    FaBars,
    FaTimes,
    FaChevronLeft,
    FaChevronRight
} from "react-icons/fa";

// ---- design tokens -------------------------------------------------------
// Light, elegant surface. Amber stays the ONE accent — used sparingly so it
// still means something (active state, brand mark) rather than everywhere.
export const COLOR = {
    bg: "#f6f7f9",
    panel: "#ffffff",
    border: "#e8eaee",
    borderSoft: "#f1f2f5",
    textBright: "#181b24",
    textMuted: "#616876",
    textFaint: "#9aa0ac",
    accent: "#e8912a",
    accentSoft: "#fdf1e2",
    danger: "#e5484d",
    dangerSoft: "#fdecec",
    shadow: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.05)",
    shadowHover: "0 6px 20px rgba(16,24,40,0.08)"
};

const NAV_ITEMS = [
    { to: "/admin", label: "Dashboard", icon: FaHome, end: true },
    { to: "/admin/requests", label: "Requests", icon: FaClipboardList },
    { to: "/admin/payments", label: "Payments", icon: FaCreditCard },
    { to: "/admin/complaints", label: "Reviews & Complaints ", icon: FaExclamationTriangle },
    { to: "/admin/analytics", label: "Analytics", icon: FaChartBar },
    { to: "/admin/verification", label: "Verification", icon: FaUserCheck },
    { to: "/admin/logs", label: "System Logs", icon: FaClipboardList }
];

const USER_SUBLINKS = [
    { to: "/admin/users/all", label: "All Users" },
    { to: "/admin/users/customers", label: "Customers" },
    { to: "/admin/users/mechanics", label: "Mechanics" }
];

function RoadAidMark({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path
                d="M12 2C7.6 2 4 5.5 4 9.8 4 15.3 12 22 12 22s8-6.7 8-12.2C20 5.5 16.4 2 12 2Z"
                fill={COLOR.accent}
            />
            <path
                d="M12 6.3c-1.9 0-3.4 1.5-3.4 3.4 0 .5.1.9.3 1.3l-1.6 1.6c-.2.2-.2.5 0 .7l.7.7c.2.2.5.2.7 0l1.6-1.6c.4.2.9.3 1.3.3.5 0 .9-.1 1.3-.3l1.6 1.6c.2.2.5.2.7 0l.7-.7c.2-.2.2-.5 0-.7l-1.6-1.6c.2-.4.3-.8.3-1.3 0-1.9-1.5-3.4-3.6-3.4Zm0 1.4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2Z"
                fill="#ffffff"
            />
        </svg>
    );
}

function AdminSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const isUsersSection = location.pathname.startsWith("/admin/users");

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const logout = () => navigate("/");

    const rowStyle = (isActive) => ({
        display: "flex",
        alignItems: "center",
        gap: "13px",
        padding: collapsed ? "11px" : "10px 14px",
        justifyContent: collapsed ? "center" : "flex-start",
        color: isActive ? COLOR.accent : COLOR.textMuted,
        background: isActive ? COLOR.accentSoft : "transparent",
        textDecoration: "none",
        fontSize: "14.5px",
        fontWeight: isActive ? 600 : 500,
        borderRadius: "9px",
        whiteSpace: "nowrap",
        overflow: "hidden"
    });

    const subRowStyle = (isActive) => ({
        display: "block",
        padding: "7px 12px 7px 42px",
        color: isActive ? COLOR.accent : COLOR.textMuted,
        textDecoration: "none",
        fontSize: "13.5px",
        fontWeight: isActive ? 600 : 400,
        borderRadius: "7px"
    });

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

                .admin-sidebar-scroll { scrollbar-width: thin; scrollbar-color: ${COLOR.border} transparent; }
                .admin-sidebar-scroll::-webkit-scrollbar { width: 6px; }
                .admin-sidebar-scroll::-webkit-scrollbar-thumb { background: ${COLOR.border}; border-radius: 3px; }

                .admin-sidebar-navlink { transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease; }
                .admin-sidebar-navlink:hover { background: ${COLOR.borderSoft}; color: ${COLOR.textBright}; }
                .admin-sidebar-navlink:active { transform: scale(0.98); }
                .admin-sidebar-navlink:focus-visible,
                .admin-sidebar-iconbtn:focus-visible,
                .admin-sidebar-logout:focus-visible {
                    outline: 2px solid ${COLOR.accent};
                    outline-offset: 2px;
                }

                .admin-sidebar-panel { transition: width 0.18s ease, transform 0.2s ease; }

                .admin-sidebar-iconbtn {
                    border: none; background: transparent; color: ${COLOR.textFaint};
                    cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
                    width: 26px; height: 26px; border-radius: 7px; transition: background 0.15s ease, color 0.15s ease;
                }
                .admin-sidebar-iconbtn:hover { color: ${COLOR.textBright}; background: ${COLOR.borderSoft}; }

                .admin-sidebar-logout { transition: background 0.15s ease; }
                .admin-sidebar-logout:hover { background: ${COLOR.dangerSoft} !important; }

                .admin-sidebar-backdrop { display: none; }
                .admin-sidebar-trigger { display: none; }

                @media (prefers-reduced-motion: reduce) {
                    .admin-sidebar-panel, .admin-sidebar-navlink { transition: none !important; }
                }

                @media (max-width: 900px) {
                    .admin-sidebar-panel {
                        position: fixed; left: 0; top: 0; bottom: 0; z-index: 1000;
                        width: 264px !important; transform: translateX(-100%);
                        box-shadow: ${COLOR.shadowHover};
                    }
                    .admin-sidebar-panel.open { transform: translateX(0); }
                    .admin-sidebar-backdrop.open {
                        display: block; position: fixed; inset: 0;
                        background: rgba(20, 22, 30, 0.35); z-index: 999;
                    }
                    .admin-sidebar-trigger { display: inline-flex !important; }
                    .admin-sidebar-collapse-btn { display: none !important; }
                }
            `}</style>

            <button
                className="admin-sidebar-trigger"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                style={{
                    alignItems: "center", justifyContent: "center",
                    width: "40px", height: "40px", borderRadius: "9px",
                    border: `1px solid ${COLOR.border}`, background: COLOR.panel,
                    color: COLOR.textBright, margin: "10px", boxShadow: COLOR.shadow
                }}
            >
                <FaBars size={16} />
            </button>

            <div
                className={`admin-sidebar-backdrop${mobileOpen ? " open" : ""}`}
                onClick={() => setMobileOpen(false)}
            />

            <aside
                className={`admin-sidebar-panel${mobileOpen ? " open" : ""}`}
                style={{
                    width: collapsed ? "76px" : "252px",
                    minHeight: "100vh",
                    background: COLOR.panel,
                    borderRight: `1px solid ${COLOR.border}`,
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "space-between",
                        padding: collapsed ? "20px 0 16px" : "20px 16px 16px",
                        borderBottom: `1px solid ${COLOR.borderSoft}`
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <div
                            style={{
                                width: "34px", height: "34px", minWidth: "34px",
                                borderRadius: "10px", background: COLOR.accent,
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                        >
                            <RoadAidMark size={19} />
                        </div>

                        {!collapsed && (
                            <div style={{ minWidth: 0 }}>
                                <div style={{ color: COLOR.textBright, fontWeight: 700, fontSize: "15px", letterSpacing: "-0.01em" }}>
                                    RoadAid
                                </div>
                                <div style={{ color: COLOR.textFaint, fontSize: "12px" }}>Admin panel</div>
                            </div>
                        )}
                    </div>

                    {!collapsed && (
                        <button
                            className="admin-sidebar-trigger"
                            onClick={() => setMobileOpen(false)}
                            aria-label="Close menu"
                            style={{ border: "none", background: "transparent", color: COLOR.textMuted, padding: "6px" }}
                        >
                            <FaTimes size={16} />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav
                    className="admin-sidebar-scroll"
                    style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "14px 10px" }}
                >
                    <NavLink to="/admin" end className="admin-sidebar-navlink" style={({ isActive }) => rowStyle(isActive)} title="Dashboard">
                        <FaHome size={15} />
                        {!collapsed && "Dashboard"}
                    </NavLink>

                    <NavLink to="/admin/users" className="admin-sidebar-navlink" style={() => rowStyle(isUsersSection)} title="Users">
                        <FaUsers size={15} />
                        {!collapsed && "Users"}
                    </NavLink>

                    {isUsersSection && !collapsed && (
                        <div style={{ margin: "2px 0 6px" }}>
                            {USER_SUBLINKS.map((item) => (
                                <NavLink key={item.to} to={item.to} className="admin-sidebar-navlink" style={({ isActive }) => subRowStyle(isActive)}>
                                    {item.label}
                                </NavLink>
                            ))}
                            <div
                                style={{
                                    ...subRowStyle(false),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    cursor: "pointer"
                                }}
                                onClick={() => navigate("/admin/users/towing-providers")}
                            >
                                <span>Towing Providers</span>
                            </div>
                        </div>
                    )}

                    {NAV_ITEMS.slice(1).map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.end} className="admin-sidebar-navlink" style={({ isActive }) => rowStyle(isActive)} title={item.label}>
                            <item.icon size={15} />
                            {!collapsed && item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Collapse toggle (desktop only) */}
                <button
                    className="admin-sidebar-collapse-btn"
                    onClick={() => setCollapsed((v) => !v)}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    style={{
                        display: "flex", alignItems: "center",
                        justifyContent: collapsed ? "center" : "flex-end",
                        gap: "6px", border: "none", background: "transparent",
                        color: COLOR.textFaint, padding: "10px 16px", cursor: "pointer", fontSize: "12px"
                    }}
                >
                    {collapsed ? <FaChevronRight size={12} /> : (<>Collapse <FaChevronLeft size={12} /></>)}
                </button>

                {/* Profile + logout */}
                <div style={{ padding: "12px 10px", borderTop: `1px solid ${COLOR.borderSoft}`, display: "flex", flexDirection: "column", gap: "6px" }}>
                    {!collapsed && (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 10px" }}>
                            <div
                                style={{
                                    width: "28px", height: "28px", minWidth: "28px", borderRadius: "50%",
                                    background: COLOR.accentSoft, color: COLOR.accent,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "12px", fontWeight: 700
                                }}
                            >
                                A
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ color: COLOR.textBright, fontSize: "13px", fontWeight: 600 }}>Admin</div>
                                <div style={{ color: COLOR.textFaint, fontSize: "11.5px" }}>Signed in</div>
                            </div>
                        </div>
                    )}

                    <button
                        className="admin-sidebar-logout"
                        onClick={logout}
                        title="Logout"
                        style={{
                            display: "flex", alignItems: "center", gap: "12px",
                            justifyContent: collapsed ? "center" : "flex-start",
                            width: "100%", border: "none", background: "transparent",
                            color: COLOR.danger, padding: "10px 14px", borderRadius: "9px",
                            fontSize: "14.5px", fontWeight: 500, cursor: "pointer", textAlign: "left"
                        }}
                    >
                        <FaSignOutAlt size={15} />
                        {!collapsed && "Logout"}
                    </button>
                </div>
            </aside>
        </>
    );
}

export default AdminSidebar;