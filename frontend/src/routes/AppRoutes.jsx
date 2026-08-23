import { Routes, Route } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboard from "../pages/admin/Dashboard";
import CustomerDashboard from "../pages/customer/Dashboard";
import MechanicDashboard from "../pages/mechanic/Dashboard";
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
import RequestDetails from "../pages/customer/RequestDetails";
import ReqMechanics from "../pages/customer/Mechanics";
import Payments from "../pages/customer/Payments";
import Favorites from "../pages/customer/Favorites";
import Profile from "../pages/customer/Profile";
import TrackRequest from "../pages/customer/TrackRequest";
import MechanicRequests from "../pages/mechanic/Requests";
import MechanicRequestDetails from "../pages/mechanic/RequestDetails";
import MechanicQuotations from "../pages/mechanic/Quotations";
import MechanicProfile from "../pages/mechanic/Profile";
function AppRoutes() {

    return (

        <Routes>

            <Route path="/" element={<Login />} />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route path="/admin/users" element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Users />
                </ProtectedRoute>
            } />

            <Route path="/admin/mechanics" element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Mechanics />
                </ProtectedRoute>
            } />

            <Route path="/admin/requests" element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Requests />
                </ProtectedRoute>
            } />

            <Route path="/admin/complaints" element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Complaints />
                </ProtectedRoute>
            } />

            <Route path="/admin/analytics" element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                    <Analytics />
                </ProtectedRoute>
            } />

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
                        <RequestDetails />
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
                path="/mechanic/requests"
                element={<MechanicRequests />}
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



            <Route path="/register" element={<Register />} />


        </Routes>


    );


}

export default AppRoutes;