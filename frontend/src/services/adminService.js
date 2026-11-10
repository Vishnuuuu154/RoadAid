import api from "./api";

export const getDashboard = () => {
    return api.get("/admin/dashboard");
};

export const getUsers = (search = "") => {
    return api.get(`/admin/users?search=${search}`);
};

export const activateUser = (id) => {
    return api.put(`/admin/users/${id}/activate`);
};

export const deactivateUser = (id) => {
    return api.put(`/admin/users/${id}/deactivate`);
};
export const getRequests = (status = "", customer = "") => {

    return api.get("/admin/requests", {
        params: {
            status,
            customer
        }
    });

};
export const getComplaints = () => {
    return api.get("/admin/complaints");
};
export const getMechanics = (search = "") => {
    return api.get("/admin/mechanics", {
        params: {
            search
        }
    });
};
export const getAnalytics = () => {
    return api.get("/admin/analytics");
};
export const getPayments = (status = "") => {
    return api.get("/admin/payments", {
        params: {
            status
        }
    });
};
export const getMechanicDetails = (mechanicId) => {
    return api.get(`/admin/mechanics/${mechanicId}`);
};
export const getMechanicRequests = (mechanicId) => {
    return api.get(`/admin/mechanics/${mechanicId}/requests`);
};
export const getRequestDetails = (requestId) => {
    return api.get(`/admin/requests/${requestId}`);
};
export const getMechanicReviews = (mechanicId) => {
    return api.get(`/admin/mechanics/${mechanicId}/reviews`);
};
export const getPendingMechanics = () => {
    return api.get("/admin/mechanics/pending");
};

export const approveMechanic = (mechanicId) => {
    return api.put(`/admin/mechanics/${mechanicId}/approve`);
};

export const rejectMechanic = (mechanicId, reason) => {
    return api.put(`/admin/mechanics/${mechanicId}/reject`, {
        reason: reason
    });
};
export const getRequestAnalytics = async () => {
    const response = await api.get("/admin/analytics/requests");
    return response.data;
};
export const getRevenueAnalytics = async () => {
    const response = await api.get("/admin/analytics/revenue");
    return response.data;
};
export const getServiceAnalytics = async () => {
    const response = await api.get("/admin/analytics/services");
    return response.data;
};
export const getProviderAnalytics = async () => {
    const response = await api.get("/admin/analytics/providers");
    return response.data;
};
export const getCustomerAnalytics = async () => {
    const response = await api.get("/admin/analytics/customers");
    return response.data;
};
export const getReviewComplaintAnalytics = async () => {
    const response = await api.get("/admin/analytics/reviews");
    return response.data;
};
export const getAnalyticsReport = async (startDate, endDate) => {
    const response = await api.get("/admin/analytics/reports", {
        params: {
            startDate,
            endDate
        }
    });

    return response.data;
};
export const getLocationAnalytics = async () => {
    const response = await api.get("/admin/analytics/location");
    return response.data;
};
export const getReviews = async () => {
    return await api.get("/reviews/admin");
};
export const getUserDetails = (userId) => {
    return api.get(`/admin/users/${userId}`);
};
export const getUserRequests = (userId) => {
    return api.get(`/admin/users/${userId}/requests`);
};
export const getSystemLogs = (action = "") => {
    return api.get(
        `/admin/logs${action ? `?action=${encodeURIComponent(action)}` : ""}`
    );
};
export const updateComplaintStatus = (complaintId, status) => {
    return api.put(`/admin/complaints/${complaintId}/status`, {
        status
    });
};
// ===============================
// TOWING VEHICLE VERIFICATION
// ===============================

export const getPendingTowingVehicles = () => {
    return api.get("/admin/towing-vehicles/pending");
};

export const getAllTowingVehicles = () => {
    return api.get("/admin/towing-vehicles");
};

export const approveTowingVehicle = (vehicleId) => {
    return api.put(`/admin/towing-vehicles/${vehicleId}/approve`);
};

export const rejectTowingVehicle = (vehicleId, reason) => {
    return api.put(`/admin/towing-vehicles/${vehicleId}/reject`, {
        reason
    });
};

export const approveTowingDocument = (documentId) => {
    return api.put(`/admin/towing-documents/${documentId}/approve`);
};

export const rejectTowingDocument = (documentId, reason) => {
    return api.put(`/admin/towing-documents/${documentId}/reject`, {
        reason
    });
};

export const getTowingDocumentUrl = (documentId) => {
    return `http://localhost:8080/api/admin/towing-documents/${documentId}/view`;
};