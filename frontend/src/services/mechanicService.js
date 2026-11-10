import api from "./api";

export const getMyProfile = () => {
    return api.get("/mechanics/me");
};

export const updateAvailability = (available) => {
    return api.patch("/mechanics/availability", {
        available: available
    });
};

export const getMyRequests = () => {
    return api.get("/mechanics/requests");
};
export const acceptRequest = (requestId) => {
    return api.put(`/requests/${requestId}/accept`);
};

export const rejectRequest = (requestId) => {
    return api.put(`/requests/${requestId}/reject`);
};
export const createQuotation = (requestId, quotation) => {
    return api.post(`/quotations/${requestId}`, quotation);
};
export const completeRequest = (requestId) => {
    return api.put(`/requests/${requestId}/complete`);
};
export const startWork = (requestId) => {
    return api.put(`/requests/${requestId}/start`);
};
export const getMyQuotations = () => {
    return api.get("/quotations/mechanic");
};
export const updateQuotation = (requestId, quotation) => {
    return api.put(`/quotations/${requestId}`, quotation);
};
export const updateMyProfile = (profile) => {
    return api.put("/mechanics/me", profile);
};
export const getMechanicReviews = (mechanicId) => {
    return api.get(`/reviews/mechanic/${mechanicId}`);
};

export const getMechanicAverageRating = (mechanicId) => {
    return api.get(`/reviews/mechanic/${mechanicId}/average`);
};
export const getMyNotifications = () => {
    return api.get("/notifications");
};

export const markNotificationAsRead = (id) => {
    return api.put(`/notifications/${id}/read`);
};
export const updateLocation = (latitude, longitude) => {
    return api.patch("/mechanics/location", {
        latitude,
        longitude
    });
};
export const markArrived = (requestId) => {
    return api.put(`/requests/${requestId}/arrived`);
};

export const startRepair = (requestId) => {
    return api.put(`/requests/${requestId}/start-repair`);
};
export const getMyPayments = () => {
    return api.get("/payments/my");
};
export const createComplaint = (complaint) => {
    return api.post("/complaints", complaint);
};

export const getMyComplaints = () => {
    return api.get("/complaints/my");
};
export const getMyConversations = () => {
    return api.get("/messages/conversations");
};

export const getMyAnalytics = (period = "30") => {
    return api.get(`/mechanics/analytics?period=${period}`);
};
