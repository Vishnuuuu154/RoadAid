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
export const getMyQuotations = () => {
    return api.get("/quotations/mechanic");
};
export const updateQuotation = (requestId, quotation) => {
    return api.put(`/quotations/${requestId}`, quotation);
};
export const updateMyProfile = (profile) => {
    return api.put("/mechanics/me", profile);
};