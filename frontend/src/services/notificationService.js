import api from "./api";
export const getMyNotifications = () => {
    return api.get("/notifications");
};

export const markNotificationAsRead = (id) => {
    return api.put(`/notifications/${id}/read`);
};

export const deleteNotification = (id) => {
    return api.delete(`/notifications/${id}`);
};

export const markAllNotificationsAsRead = () => {
    return api.put("/notifications/read-all");
};