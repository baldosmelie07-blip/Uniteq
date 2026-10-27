
import axios from "axios";

// Use the deployed backend URL from the Vite environment.
// Fall back to localhost for local development.
const API_URL = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const api = axios.create({
    baseURL: API_URL,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

/*
|--------------------------------------------------------------------------
| GET AUTHENTICATION TOKEN
|--------------------------------------------------------------------------
*/

function getToken() {
    return (
        localStorage.getItem("uniteq_token") ||
        sessionStorage.getItem("uniteq_token")
    );
}

/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
| Automatically attach the current authentication token to requests.
*/

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

/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
| Clear saved authentication information when Laravel returns HTTP 401.
*/

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn(
                "Authentication failed. Clearing UniTeq session."
            );

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
