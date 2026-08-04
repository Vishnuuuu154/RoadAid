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