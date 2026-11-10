import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";

import {
    FaChartLine,
    FaClipboardList,
    FaRupeeSign,
    FaTools,
    FaUsers,
    FaUser,
    FaStar,
    FaMapMarkerAlt,
    FaFileExport,
    FaArrowRight
} from "react-icons/fa";

import "../../styles/AdminAnalytics.css";

/* ================================================================== */
/* Config                                                              */
/* ================================================================== */

/* Same pages and paths as before, now grouped by what they help you decide. */
const OVERVIEW = {
    title: "Overview",
    description: "Key numbers and how this month compares with last month.",
    Icon: FaChartLine,
    path: "/admin/analytics/overview"
};

const SECTIONS = [
    {
        title: "Business",
        items: [
            {
                title: "Revenue",
                description: "Earnings, payments and transactions over time.",
                Icon: FaRupeeSign,
                path: "/admin/analytics/revenue"
            },
            {
                title: "Reports & export",
                description: "Pick a date range and download a report.",
                Icon: FaFileExport,
                path: "/admin/analytics/reports"
            }
        ]
    },
    {
        title: "Operations",
        items: [
            {
                title: "Requests",
                description: "Trends, status, completions and cancellations.",
                Icon: FaClipboardList,
                path: "/admin/analytics/requests"
            },
            {
                title: "Services",
                description: "Which problems customers ask for help with most.",
                Icon: FaTools,
                path: "/admin/analytics/services"
            },
            {
                title: "Locations",
                description: "Hotspots and areas with the highest demand.",
                Icon: FaMapMarkerAlt,
                path: "/admin/analytics/location"
            }
        ]
    },
    {
        title: "People",
        items: [
            {
                title: "Providers",
                description: "Mechanic availability, ratings and completed jobs.",
                Icon: FaUsers,
                path: "/admin/analytics/providers"
            },
            {
                title: "Customers",
                description: "Sign-ups, activity and repeat usage.",
                Icon: FaUser,
                path: "/admin/analytics/customers"
            },
            {
                title: "Reviews & complaints",
                description: "Ratings, open complaints and customer feedback.",
                Icon: FaStar,
                path: "/admin/analytics/reviews"
            }
        ]
    }
];

/* ================================================================== */
/* Page                                                                */
/* ================================================================== */

function Analytics() {
    const HeroIcon = OVERVIEW.Icon;

    return (
        <AdminLayout>
            <div className="an-root">
                <header className="an-header">
                    <h1 className="an-title">Analytics</h1>
                    <p className="an-sub">See how RoadAid is doing and where to look next.</p>
                </header>

                <Link to={OVERVIEW.path} className="an-hero">
                    <span className="an-hero-icon" aria-hidden="true"><HeroIcon /></span>
                    <span className="an-hero-text">
                        <strong>{OVERVIEW.title}</strong>
                        <span>{OVERVIEW.description}</span>
                    </span>
                    <span className="an-hero-go">
                        Open <FaArrowRight aria-hidden="true" />
                    </span>
                </Link>

                {SECTIONS.map((section) => (
                    <section key={section.title} className="an-section" aria-labelledby={`an-${section.title}`}>
                        <h2 id={`an-${section.title}`} className="an-section-title">{section.title}</h2>

                        <div className="an-grid">
                            {section.items.map(({ title, description, Icon, path }) => (
                                <Link key={path} to={path} className="an-card">
                                    <span className="an-card-icon" aria-hidden="true"><Icon /></span>

                                    <span className="an-card-text">
                                        <strong>{title}</strong>
                                        <span>{description}</span>
                                    </span>

                                    <FaArrowRight className="an-card-go" aria-hidden="true" />
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </AdminLayout>
    );
}

export default Analytics;