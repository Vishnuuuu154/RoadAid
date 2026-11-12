import { Routes, Route } from "react-router-dom";
import Revenue from "../pages/admin/analytics/Revenue";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboard from "../pages/admin/Dashboard";
import CustomerDashboard from "../pages/customer/Dashboard";
import MechanicDashboard from "../pages/mechanic/Dashboard";
import Verification from "../pages/admin/Verification";
import Users from "../pages/admin/Users";
import Mechanics from "../pages/admin/Mechanics";
import Requests from "../pages/admin/Requests";
import Complaints from "../pages/admin/Complaints";
import Analytics from "../pages/admin/Analytics";
import RequestHelp from "../pages/customer/RequestHelp";
import Reviews from "../pages/customer/Reviews";
import Notifications from "../pages/customer/Notifications";
import MechanicNotifications from "../pages/mechanic/Notifications";
import Vehicles from "../pages/customer/Vehicles";
import CustomerRequests from "../pages/customer/Requests";
import Overview from "../pages/admin/analytics/Overview";
import ReqMechanics from "../pages/customer/Mechanics";
import Payments from "../pages/customer/Payments";
import Favorites from "../pages/customer/Favorites";
import Profile from "../pages/customer/Profile";
import TrackRequest from "../pages/customer/TrackRequest";
import MechanicRequests from "../pages/mechanic/Requests";
import MechanicRequestDetails from "../pages/mechanic/RequestDetails";
import MechanicQuotations from "../pages/mechanic/Quotations";
import MechanicProfile from "../pages/mechanic/Profile";
import MechanicReviews from "../pages/mechanic/Reviews";
import AdminPayments from "../pages/admin/Payments";
import MechanicDetails from "../pages/admin/MechanicDetails";
import AdminRequestDetails from "../pages/admin/RequestDetails";
import CustomerRequestDetails from "../pages/customer/RequestDetails";
import ProviderVerification from "../pages/admin/ProviderVerification";
import AllUsers from "../pages/admin/AllUsers";
import Customers from "../pages/admin/Customers";
import RequestsAnalytics from "../pages/admin/analytics/Requests";
import Services from "../pages/admin/analytics/Services";
import Providers from "../pages/admin/analytics/Providers";
import CustomersAnalytics from "../pages/admin/analytics/Customers";
import AdminReviews from "../pages/admin/analytics/Reviews";
import Reports from "../pages/admin/analytics/Reports";
import FindFuel from "../pages/customer/FindFuel";
import TowingProviders from "../pages/admin/TowingProviders";
import Location from "../pages/admin/analytics/Location";
import UserDetails from "../pages/admin/users/UserDetails";
import MechanicComplaints from "../pages/mechanic/Complaints";
import UserRequests from "../pages/admin/users/UserRequests";
import SystemLogs from "../pages/admin/SystemLogs";
import CustomerComplaints from "../pages/customer/Complaints";
import LiveMap from "../pages/customer/LiveMap";
import CustomerCommunication from "../pages/customer/Communications.jsx";
import MechanicCommunication from "../pages/mechanic/Communication.jsx";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import MechanicPayments from "../pages/mechanic/Payments";
import Messages from "../pages/messages/Messages";
import MechanicAnalytics from "../pages/mechanic/Analytics";
import VehicleVerification from "../pages/admin/VehicleVerification";
import TowingProviderDashboard from "../pages/towing/Dashboard";

// Wraps a page so only the given roles can open it.
function guard(roles, page) {
    return <ProtectedRoute allowedRoles={roles}>{page}</ProtectedRoute>;
}

const ADMIN = ["ADMIN"];
const CUSTOMER = ["CUSTOMER"];
const MECHANIC = ["MECHANIC"];
const TOWING = ["TOWING_PROVIDER"];

function AppRoutes() {

    return (

        <Routes>

            {/* ---------------- Public ---------------- */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ---------------- Admin ---------------- */}
            <Route path="/admin" element={guard(ADMIN, <AdminDashboard />)} />
            <Route path="/admin/verification" element={guard(ADMIN, <Verification />)} />
            <Route path="/admin/vehicle-verification" element={guard(ADMIN, <VehicleVerification />)} />
            <Route path="/admin/provider-verification" element={guard(ADMIN, <ProviderVerification />)} />
            <Route path="/admin/users" element={guard(ADMIN, <Users />)} />
            <Route path="/admin/users/all" element={guard(ADMIN, <AllUsers />)} />
            <Route path="/admin/users/customers" element={guard(ADMIN, <Customers />)} />
            <Route path="/admin/users/mechanics" element={guard(ADMIN, <Mechanics />)} />
            <Route path="/admin/users/towing-providers" element={guard(ADMIN, <TowingProviders />)} />
            <Route path="/admin/users/:userId" element={guard(ADMIN, <UserDetails />)} />
            <Route path="/admin/users/:userId/requests" element={guard(ADMIN, <UserRequests />)} />
            <Route path="/admin/mechanics/:mechanicId" element={guard(ADMIN, <MechanicDetails />)} />
            <Route path="/admin/requests" element={guard(ADMIN, <Requests />)} />
            <Route path="/admin/requests/:requestId" element={guard(ADMIN, <AdminRequestDetails />)} />
            <Route path="/admin/complaints" element={guard(ADMIN, <Complaints />)} />
            <Route path="/admin/payments" element={guard(ADMIN, <AdminPayments />)} />
            <Route path="/admin/logs" element={guard(ADMIN, <SystemLogs />)} />
            <Route path="/admin/analytics" element={guard(ADMIN, <Analytics />)} />
            <Route path="/admin/analytics/overview" element={guard(ADMIN, <Overview />)} />
            <Route path="/admin/analytics/requests" element={guard(ADMIN, <RequestsAnalytics />)} />
            <Route path="/admin/analytics/revenue" element={guard(ADMIN, <Revenue />)} />
            <Route path="/admin/analytics/services" element={guard(ADMIN, <Services />)} />
            <Route path="/admin/analytics/providers" element={guard(ADMIN, <Providers />)} />
            <Route path="/admin/analytics/customers" element={guard(ADMIN, <CustomersAnalytics />)} />
            <Route path="/admin/analytics/reviews" element={guard(ADMIN, <AdminReviews />)} />
            <Route path="/admin/analytics/reports" element={guard(ADMIN, <Reports />)} />
            <Route path="/admin/analytics/location" element={guard(ADMIN, <Location />)} />

            {/* ---------------- Customer ---------------- */}
            <Route path="/customer" element={guard(CUSTOMER, <CustomerDashboard />)} />
            <Route path="/customer/request-help" element={guard(CUSTOMER, <RequestHelp />)} />
            <Route path="/customer/requests" element={guard(CUSTOMER, <CustomerRequests />)} />
            <Route path="/customer/requests/:requestId" element={guard(CUSTOMER, <CustomerRequestDetails />)} />
            <Route path="/customer/requests/:requestId/communication" element={guard(CUSTOMER, <CustomerCommunication />)} />
            <Route path="/customer/requests/:requestId/track" element={guard(CUSTOMER, <TrackRequest />)} />
            <Route path="/customer/complaints" element={guard(CUSTOMER, <CustomerComplaints />)} />
            <Route path="/customer/reviews" element={guard(CUSTOMER, <Reviews />)} />
            <Route path="/customer/vehicles" element={guard(CUSTOMER, <Vehicles />)} />
            <Route path="/customer/notifications" element={guard(CUSTOMER, <Notifications />)} />
            <Route path="/customer/mechanics" element={guard(CUSTOMER, <ReqMechanics />)} />
            <Route path="/customer/payments" element={guard(CUSTOMER, <Payments />)} />
            <Route path="/customer/favorites" element={guard(CUSTOMER, <Favorites />)} />
            <Route path="/customer/profile" element={guard(CUSTOMER, <Profile />)} />
            <Route path="/customer/live-map" element={guard(CUSTOMER, <LiveMap />)} />
            <Route path="/customer/find-fuel" element={guard(CUSTOMER, <FindFuel />)} />
            <Route path="/customer/messages" element={guard(CUSTOMER, <Messages role="customer" />)} />

            {/* ---------------- Mechanic ---------------- */}
            <Route path="/mechanic" element={guard(MECHANIC, <MechanicDashboard />)} />
            <Route path="/mechanic/requests" element={guard(MECHANIC, <MechanicRequests />)} />
            <Route path="/mechanic/requests/:requestId" element={guard(MECHANIC, <MechanicRequestDetails />)} />
            <Route path="/mechanic/requests/:requestId/communication" element={guard(MECHANIC, <MechanicCommunication />)} />
            <Route path="/mechanic/quotations" element={guard(MECHANIC, <MechanicQuotations />)} />
            <Route path="/mechanic/profile" element={guard(MECHANIC, <MechanicProfile />)} />
            <Route path="/mechanic/reviews" element={guard(MECHANIC, <MechanicReviews />)} />
            <Route path="/mechanic/complaints" element={guard(MECHANIC, <MechanicComplaints />)} />
            <Route path="/mechanic/notifications" element={guard(MECHANIC, <MechanicNotifications />)} />
            <Route path="/mechanic/payments" element={guard(MECHANIC, <MechanicPayments />)} />
            <Route path="/mechanic/analytics" element={guard(MECHANIC, <MechanicAnalytics />)} />
            <Route path="/mechanic/messages" element={guard(MECHANIC, <Messages role="mechanic" />)} />

            {/* ---------------- Towing provider ---------------- */}
            <Route path="/towing/dashboard" element={guard(TOWING, <TowingProviderDashboard />)} />

        </Routes>

    );

}

export default AppRoutes;