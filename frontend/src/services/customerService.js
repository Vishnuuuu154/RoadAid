import api from "./api";

export const getMyVehicles = () => {
    return api.get("/vehicles/my");
};
export const getMyRequests = () => {
    return api.get("/requests/my");
};
export const getMyPayments = () => {
    return api.get("/payments/my");
};
export const getMyFavorites = () => {
    return api.get("/favorites");
};
export const addFavorite = (mechanicId) => {
    return api.post(`/favorites/${mechanicId}`);
};

export const removeFavorite = (mechanicId) => {
    return api.delete(`/favorites/${mechanicId}`);
};
export const getMyNotifications = () => {
    return api.get("/notifications");
};
export const getAvailableMechanics = () => {
    return api.get("/mechanics");
};
export const getNearbyMechanics = (
    latitude,
    longitude,
    radius = 10
) => {
    return api.get("/mechanics/nearby", {
        params: {
            latitude,
            longitude,
            radius
        }
    });


};



export const createRequest = (
    requestData,
    vehicleId,
    mechanicId,
    images = []
) => {

    const formData = new FormData();

    formData.append(
        "request",
        new Blob(
            [JSON.stringify(requestData)],
            { type: "application/json" }
        )
    );

    formData.append("vehicleId", vehicleId);
    formData.append("mechanicId", mechanicId);

    images.forEach((image) => {
        formData.append("images", image);
    });

    return api.post("/requests", formData);
};
export const getQuotation = (requestId) => {
    return api.get(`/quotations/request/${requestId}`);
};

export const acceptQuotation = (requestId) => {
    return api.put(`/quotations/${requestId}/accept`);
};
export const makePayment = (quotationId, paymentData) => {
    return api.post(`/payments/${quotationId}`, paymentData);
};
export const cancelRequest = (requestId) => {
    return api.put(`/requests/${requestId}/cancel`);
};
export const reassignMechanic = (requestId, mechanicId) => {
    return api.put(
        `/requests/${requestId}/reassign/${mechanicId}`
    );
};
export const autoReassignMechanic = (requestId) => {
    return api.put(`/requests/${requestId}/auto-reassign`);
};
export const addReview = (requestId, reviewData) => {
    return api.post(`/reviews/${requestId}`, reviewData);
};
export const getMyReviews = () => {
    return api.get("/reviews/my");
};
export const getLiveTracking = (requestId) => {
    return api.get(`/requests/${requestId}/tracking`);
};
export const createComplaint = (complaintData) => {
    return api.post("/complaints", complaintData);
};

export const getMyComplaints = () => {
    return api.get("/complaints/my");
};
export const getMyConversations = () => {
    return api.get("/messages/conversations");
};
// Add this export to src/services/customerService.js (the existing api client adds your JWT).
export const getFuelStations = (latitude, longitude, radiusKm = 5, category = "FUEL", signal) =>
    api.get("/map/fuel-stations", {
        params: { lat: latitude, lng: longitude, radiusKm, category },
        signal,
    });