import api from "./api";

export const login = (data) => {
    return api.post("/users/login", data);
};

export const saveUser = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
};

export const getUser = () => {
    return JSON.parse(localStorage.getItem("user"));
};

export const getToken = () => {
    return getUser()?.token;
};

export const getRole = () => {
    return getUser()?.role;
};

export const logout = () => {
    localStorage.removeItem("user");
};

export const isAuthenticated = () => {
    return getUser() !== null;
};