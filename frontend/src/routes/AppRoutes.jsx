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

function AppRoutes() {

    return (

        <Routes>

            <Route path="/" element={<Login />} />

            <Route path="/login" element={<Login />} />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/verification"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Verification />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/vehicle-verification"
                element={<VehicleVerification />}
            />
            <Route
                path="/forgot-password"
                element={<ForgotPassword />}
            />

            <Route
                path="/reset-password"
                element={<ResetPassword />}
            />
            <Route
                path="/admin/users/towing-providers"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <TowingProviders />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Users />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/users/all"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AllUsers />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/users/customers"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Customers />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/users/mechanics"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Mechanics />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/requests/:requestId"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AdminRequestDetails />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/logs"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <SystemLogs />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/complaints"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Complaints />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Analytics />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/overview"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Overview />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/requests"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <RequestsAnalytics />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/revenue"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Revenue />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/services"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Services />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/providers"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Providers />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/customers"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <CustomersAnalytics />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/reviews"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AdminReviews />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/users/:userId"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <UserDetails />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/reports"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Reports />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/analytics/location"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Location />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/users/:userId/requests"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <UserRequests />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <CustomerDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/request-help"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <RequestHelp />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/requests/:requestId/communication"
                element={<CustomerCommunication />}
            />

            <Route
                path="/customer/complaints"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <CustomerComplaints />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/mechanic/requests/:requestId/communication"
                element={<MechanicCommunication />}
            />

            <Route
                path="/mechanic"
                element={
                    <ProtectedRoute allowedRoles={["MECHANIC"]}>
                        <MechanicDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/reviews"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <Reviews />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/vehicles"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <Vehicles />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/notifications"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <Notifications />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/mechanic/notifications"
                element={
                    <ProtectedRoute allowedRoles={["MECHANIC"]}>
                        <MechanicNotifications />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/requests"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <CustomerRequests />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/requests/:requestId"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <CustomerRequestDetails />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/mechanics"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <ReqMechanics />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/payments"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <Payments />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/favorites"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <Favorites />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/profile"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <Profile />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/requests/:requestId/track"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <TrackRequest />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/customer/live-map"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <LiveMap />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/mechanic/payments"
                element={
                    <ProtectedRoute allowedRoles={["MECHANIC"]}>
                        <MechanicPayments />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/mechanic/requests"
                element={<MechanicRequests />}
            />

            <Route
                path="/customer/find-fuel"
                element={<FindFuel />}
            />

            <Route
                path="/mechanic/requests/:requestId"
                element={<MechanicRequestDetails />}
            />

            <Route
                path="/mechanic/quotations"
                element={<MechanicQuotations />}
            />

            <Route
                path="/mechanic/profile"
                element={<MechanicProfile />}
            />

            <Route
                path="/mechanic/reviews"
                element={<MechanicReviews />}
            />

            <Route
                path="/mechanic/complaints"
                element={
                    <ProtectedRoute allowedRoles={["MECHANIC"]}>
                        <MechanicComplaints />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/payments"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AdminPayments />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/mechanics/:mechanicId"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <MechanicDetails />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/requests"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <Requests />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/provider-verification"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <ProviderVerification />
                    </ProtectedRoute>
                }
            />

            {/* Mechanic Messages */}
            <Route
                path="/mechanic/messages"
                element={
                    <ProtectedRoute allowedRoles={["MECHANIC"]}>
                        <Messages role="mechanic" />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/mechanic/analytics"
                element={
                    <ProtectedRoute allowedRoles={["MECHANIC"]}>
                        <MechanicAnalytics />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/towing/dashboard"
                element={
                    <ProtectedRoute allowedRoles={["TOWING_PROVIDER"]}>
                        <TowingProviderDashboard />
                    </ProtectedRoute>
                }
            />

            {/* Customer Messages */}
            <Route
                path="/customer/messages"
                element={
                    <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                        <Messages role="customer" />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/register"
                element={<Register />}
            />

        </Routes>

    );

}

export default AppRoutes;