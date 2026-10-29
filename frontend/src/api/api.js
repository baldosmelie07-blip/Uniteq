
import axios from "axios";

// =====================================================
// API CONFIGURATION
// =====================================================

const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

// =====================================================
// AUTHENTICATION TOKEN
// =====================================================

function getToken() {
    try {
        return (
            localStorage.getItem("uniteq_token") ||
            sessionStorage.getItem("uniteq_token") ||
            null
        );
    } catch (error) {
        console.error("Unable to read authentication token:", error);
        return null;
    }
}

// =====================================================
// REQUEST INTERCEPTOR
// Attach the saved token to API requests.
// =====================================================

api.interceptors.request.use(
    (config) => {
        const token = getToken();

        config.headers = config.headers || {};

        config.headers.Accept = "application/json";
        config.headers["X-Requested-With"] = "XMLHttpRequest";

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// =====================================================
// RESPONSE INTERCEPTOR
// Handle API errors.
// =====================================================

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const status = error.response.status;

            console.error("UniTeq API Error:", {
                url: error.config?.url,
                method: error.config?.method,
                status,
                response: error.response.data,
            });

            // Clear authentication data if the session expires.
            if (status === 401) {
                try {
                    localStorage.removeItem("uniteq_token");
                    localStorage.removeItem("uniteq_user");
                    sessionStorage.removeItem("uniteq_token");
                    sessionStorage.removeItem("uniteq_user");
                } catch (storageError) {
                    console.error(
                        "Unable to clear authentication data:",
                        storageError
                    );
                }

                // Return to login only when not already on the login page.
                if (window.location.pathname !== "/") {
                    window.location.replace("/");
                }
            }
        } else if (error.request) {
            console.error(
                "UniTeq API connection failed. Check whether Laravel is running and verify the API URL.",
                error.message
            );
        } else {
            console.error("UniTeq request setup error:", error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
