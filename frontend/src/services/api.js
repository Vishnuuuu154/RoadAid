import axios from "axios";

// Backend root URL (no trailing slash, no /api).
// Local dev falls back to localhost; production uses VITE_API_URL.
export const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
).replace(/\/$/, "");

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`
});

api.interceptors.request.use(

    (config) => {

        let user = null;

        try {
            user = JSON.parse(localStorage.getItem("user"));
        } catch {
            user = null;
        }

        if (user?.token) {

            config.headers.Authorization = `Bearer ${user.token}`;

        }

        return config;

    },

    (error) => {

        return Promise.reject(error);

    }

);

export default api;