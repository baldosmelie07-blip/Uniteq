
import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

// Get the saved authentication token.
function getToken() {
    return (
        localStorage.getItem("uniteq_token") ||
        sessionStorage.getItem("uniteq_token")
    );
}

// Attach the token to protected API requests.
api.interceptors.request.use(
    (config) => {
        const token = getToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        config.headers.Accept = "application/json";

        return config;
    },
    (error) => Promise.reject(error)
);

// Clear expired authentication information.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("uniteq_token");
            localStorage.removeItem("uniteq_user");
            sessionStorage.removeItem("uniteq_token");
            sessionStorage.removeItem("uniteq_user");

            if (window.location.pathname !== "/") {
                window.location.href = "/";
            }
        }

        return Promise.reject(error);
    }
);

export default api;
