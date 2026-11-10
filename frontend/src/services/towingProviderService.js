import api from "./api";

export const submitTowingProviderApplication = (formData) => {
    return api.post("/towing-providers/register", formData);
};