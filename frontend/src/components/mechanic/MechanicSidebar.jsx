import { Link, useLocation } from "react-router-dom";

import {
    FaWrench,
    FaTachometerAlt,
    FaClipboardList,
    FaFileInvoiceDollar,
    FaStar,
    FaBell,
    FaUserCog,
    FaSignOutAlt,
    FaTimes,
    FaChevronLeft,
    FaComments,
    FaMoneyBillWave,
    FaExclamationCircle,
    FaHeadset,
    FaEllipsisH,
    FaChartLine
} from "react-icons/fa";

// TODO: replace with your real support number.
const SUPPORT_PHONE = "+910000000000";

/* Grouped so nine links stay easy to scan. */
export const NAV_GROUPS = [
    {
        label: "Work",
        items: [
            { path: "/mechanic", label: "Dashboard", short: "Home", icon: FaTachometerAlt },
            { path: "/mechanic/requests", label: "My Requests", short: "Requests", icon: FaClipboardList },
            { path: "/mechanic/quotations", label: "Quotations", short: "Quotes", icon: FaFileInvoiceDollar },
            { path: "/mechanic/messages", label: "Messages", short: "Messages", icon: FaComments }
        ]
    },
    {
        label: "Money & feedback",
        items: [
            { path: "/mechanic/payments", label: "Earnings", icon: FaMoneyBillWave },
            { path: "/mechanic/reviews", label: "Reviews", icon: FaStar },
            { path: "/mechanic/complaints", label: "Complaints", icon: FaExclamationCircle }
        ]
    },
    {
        label: "Account",
        items: [
            { path: "/mechanic/notifications", label: "Notifications", icon: FaBell },
            { path: "/mechanic/analytics", label: "Analytics", icon: FaChartLine },
            { path: "/mechanic/profile", label: "Profile", icon: FaUserCog }
        ]
    }
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

// Mobile tab bar: the four everyday screens + "More" (opens the full menu).
const BOTTOM_NAV_ITEMS = NAV_ITEMS.filter((i) => i.short);

export const isPathActive = (pathname, path) =>
    path === "/mechanic"
        ? pathname === path
        : pathname === path || pathname.startsWith(path + "/");

function MechanicSidebar({ menuOpen, setMenuOpen, collapsed, onToggleCollapsed, onLogout }) {
    const { pathname } = useLocation();
    const isActive = (path) => isPathActive(pathname, path);
    const onBottomTab = BOTTOM_NAV_ITEMS.some((i) => isActive(i.path));

    return (
        <>
            {menuOpen && (
                <div className="rm-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            )}

            <aside
                className={`rm-sidebar ${menuOpen ? "rm-sidebar-open" : ""}`}
                aria-label="Mechanic navigation"
            >
                <button
                    type="button"
                    className="rm-icon-btn rm-sidebar-close"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close navigation menu"
                >
                    <FaTimes aria-hidden="true" />
                </button>

                <nav className="rm-nav">
                    {NAV_GROUPS.map((group) => (
                        <div className="rm-nav-section" key={group.label}>
                            <p className="rm-nav-group">{group.label}</p>
                            <ul>
                                {group.items.map((item) => {
                                    const active = isActive(item.path);
                                    return (
                                        <li key={item.path}>
                                            <Link
                                                to={item.path}
                                                title={item.label}
                                                className={`rm-nav-link ${active ? "rm-nav-link-active" : ""}`}
                                                aria-current={active ? "page" : undefined}
                                                onClick={() => setMenuOpen(false)}
                                            >
                                                <item.icon aria-hidden="true" />
                                                <span className="rm-nav-label">{item.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="rm-sidebar-footer">
                    <button type="button" className="rm-nav-link" onClick={onLogout} title="Log out">
                        <FaSignOutAlt aria-hidden="true" />
                        <span className="rm-nav-label">Log out</span>
                    </button>
                    <button
                        type="button"
                        className="rm-nav-link rm-collapse-btn"
                        onClick={onToggleCollapsed}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <FaChevronLeft aria-hidden="true" className="rm-collapse-icon" />
                        <span className="rm-nav-label">Collapse</span>
                    </button>
                </div>
            </aside>

            {!menuOpen && (
                <nav className="rm-bottom-nav" aria-label="Primary">
                    {BOTTOM_NAV_ITEMS.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`rm-bottom-nav-link ${active ? "is-active" : ""}`}
                                aria-current={active ? "page" : undefined}
                            >
                                <item.icon aria-hidden="true" />
                                <span>{item.short}</span>
                            </Link>
                        );
                    })}
                    <button
                        type="button"
                        className={`rm-bottom-nav-link ${!onBottomTab ? "is-active" : ""}`}
                        onClick={() => setMenuOpen(true)}
                        aria-label="More options"
                    >
                        <FaEllipsisH aria-hidden="true" />
                        <span>More</span>
                    </button>
                </nav>
            )}
        </>
    );
}

export default MechanicSidebar;