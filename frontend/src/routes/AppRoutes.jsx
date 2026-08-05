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
                path="/mechanic"
                element={
                    <ProtectedRoute allowedRoles={["MECHANIC"]}>
                        <MechanicDashboard />
                    </ProtectedRoute>
                }
            />

            <Route path="/register" element={<Register />} />


        </Routes>

    );

}

export default AppRoutes;