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