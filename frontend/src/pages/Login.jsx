import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    User,
    LockKeyhole,
    Eye,
    EyeOff,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

export default function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // =========================================================
    // HANDLE INPUT
    // =========================================================

    function handleChange(e) {
        const { name, value } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    }

    // =========================================================
    // LOGIN
    // =========================================================

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");

        const email = form.email.trim();
        const password = form.password;

        if (!email) {
            setError("Please enter your email.");
            return;
        }

        if (!password) {
            setError("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            console.log("=================================");
            console.log("UNI TEQ LOGIN");
            console.log("Email:", email);
            console.log("Sending login request...");
            console.log("=================================");

            // -------------------------------------------------
            // LOGIN REQUEST
            // -------------------------------------------------

            const response = await axios.post(
                `${API_URL}/login`,
                {
                    email: email,
                    password: password,
                },
                {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                }
            );

            console.log(
                "LOGIN RESPONSE:",
                response.data
            );

            const token = response.data?.token;
            const user = response.data?.user;

            // -------------------------------------------------
            // CHECK SERVER RESPONSE
            // -------------------------------------------------

            if (!token) {
                setError(
                    "Login succeeded, but no authentication token was returned."
                );
                return;
            }

            if (!user) {
                setError(
                    "Login succeeded, but no user information was returned."
                );
                return;
            }

            // -------------------------------------------------
            // GET USER ROLE
            // -------------------------------------------------

            const role = String(
                user.role || ""
            ).trim();

            console.log(
                "Authenticated user:",
                user
            );

            console.log(
                "User role:",
                role
            );

            // -------------------------------------------------
            // VALID ROLES
            // -------------------------------------------------

            if (
                role !== "System Administrator" &&
                role !== "Cashier"
            ) {
                setError(
                    "This account does not have a valid UniTeq role."
                );
                return;
            }

            // -------------------------------------------------
            // ACCOUNT STATUS
            // -------------------------------------------------

            if (
                user.status &&
                user.status !== "Active"
            ) {
                setError(
                    "Your account is inactive. Please contact the System Administrator."
                );
                return;
            }

            // -------------------------------------------------
            // CLEAR OLD AUTHENTICATION
            // -------------------------------------------------

            localStorage.removeItem(
                "uniteq_token"
            );

            localStorage.removeItem(
                "uniteq_user"
            );

            sessionStorage.removeItem(
                "uniteq_token"
            );

            sessionStorage.removeItem(
                "uniteq_user"
            );

            // -------------------------------------------------
            // SAVE NEW AUTHENTICATION
            // -------------------------------------------------

            if (rememberMe) {
                localStorage.setItem(
                    "uniteq_token",
                    token
                );

                localStorage.setItem(
                    "uniteq_user",
                    JSON.stringify(user)
                );
            } else {
                sessionStorage.setItem(
                    "uniteq_token",
                    token
                );

                sessionStorage.setItem(
                    "uniteq_user",
                    JSON.stringify(user)
                );
            }

            // -------------------------------------------------
            // CONFIGURE AXIOS
            // -------------------------------------------------

            axios.defaults.headers.common[
                "Authorization"
            ] = `Bearer ${token}`;

            axios.defaults.headers.common[
                "Accept"
            ] = "application/json";

            console.log(
                "LOGIN SUCCESSFUL"
            );

            // -------------------------------------------------
            // GO TO DASHBOARD
            // -------------------------------------------------

            navigate("/dashboard", {
                replace: true,
            });

        } catch (error) {
            console.error(
                "================================="
            );

            console.error(
                "LOGIN ERROR:",
                error
            );

            console.error(
                "STATUS:",
                error.response?.status
            );

            console.error(
                "SERVER RESPONSE:",
                error.response?.data
            );

            console.error(
                "================================="
            );

            // -------------------------------------------------
            // ERROR HANDLING
            // -------------------------------------------------

            if (
                error.response?.status === 401
            ) {
                const message =
                    error.response?.data?.message;

                const validationErrors =
                    error.response?.data?.errors;

                if (validationErrors) {
                    setError(
                        Object.values(
                            validationErrors
                        )
                            .flat()
                            .join(" ")
                    );
                } else {
                    setError(
                        message ||
                        "The email or password is incorrect."
                    );
                }

            } else if (
                error.response?.status === 403
            ) {
                setError(
                    error.response?.data?.message ||
                    "Your account is not authorized to access UniTeq."
                );

            } else if (
                error.response?.status === 422
            ) {
                const validationErrors =
                    error.response?.data?.errors;

                if (validationErrors) {
                    setError(
                        Object.values(
                            validationErrors
                        )
                            .flat()
                            .join(" ")
                    );
                } else {
                    setError(
                        error.response?.data?.message ||
                        "Please check your login information."
                    );
                }

            } else if (
                error.response
            ) {
                setError(
                    error.response?.data?.message ||
                    "Unable to complete the login request."
                );

            } else if (
                error.code === "ECONNABORTED"
            ) {
                setError(
                    "The server took too long to respond. Please make sure Laravel is running."
                );

            } else {
                setError(
                    "Unable to connect to Laravel. Please make sure the Laravel server is running."
                );
            }

        } finally {
            setLoading(false);
        }
    }

    // =========================================================
    // FORGOT PASSWORD
    // =========================================================

    function handleForgotPassword() {
        alert(
            "Please contact the System Administrator to reset your password."
        );
    }

    // =========================================================
    // CREATE ACCOUNT
    // =========================================================

    function handleCreateAccount() {
        alert(
            "Please contact the System Administrator to create a UniTeq account."
        );
    }

    // =========================================================
    // UI
    // =========================================================

    return (
        <div className="min-h-screen bg-[#10284d] flex flex-col overflow-hidden">

            {/* =====================================================
                TOP HEADER
            ====================================================== */}

            <header className="relative z-20 bg-[#10284d] px-6 sm:px-10 lg:px-20 py-5">

                <div className="max-w-7xl mx-auto flex items-center justify-center lg:justify-start gap-5">

                    {/* LOGO */}

                    <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">

                        <img
                            src="/Uniteq.png"
                            alt="Uniteq Team Logo"
                            className="w-full h-full object-contain drop-shadow-lg"
                        />

                    </div>


                    {/* HEADER TEXT */}

                    <div className="text-white">

                        <div className="flex flex-col">

                            <h1 className="text-lg sm:text-2xl lg:text-3xl font-serif font-semibold tracking-wide">
                                UNIVERSITY OF ABRA
                                <span className="hidden sm:inline">
                                    {" "} | Main Campus Cashier's Unit
                                </span>
                            </h1>

                            <p className="sm:hidden text-sm text-blue-100 mt-1">
                                Main Campus Cashier's Unit
                            </p>

                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold tracking-wide leading-tight mt-1">
                                Financial Management System
                            </h2>

                        </div>

                    </div>

                </div>

            </header>


            {/* =====================================================
                MAIN AREA
            ====================================================== */}

            <main className="relative flex-1 flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12 overflow-hidden">

                {/* BACKGROUND DECORATION */}

                <div className="absolute inset-0 bg-gradient-to-b from-[#10284d] via-[#15345f] to-[#0c1f3c]" />


                {/* ABSTRACT CIRCLES */}

                <div className="absolute -left-40 top-10 w-[500px] h-[500px] rounded-full border border-white/5" />

                <div className="absolute -left-20 top-24 w-[400px] h-[400px] rounded-full border border-white/5" />

                <div className="absolute right-[-180px] bottom-[-180px] w-[600px] h-[600px] rounded-full border border-white/5" />

                <div className="absolute right-[-100px] bottom-[-100px] w-[450px] h-[450px] rounded-full border border-white/5" />


                {/* OFFICE / LAPTOP EFFECT */}

                <div className="absolute left-0 right-0 bottom-0 h-[42%] bg-gradient-to-t from-[#d8d4ca] via-[#eeeae1]/40 to-transparent opacity-40" />


                {/* =================================================
                    LOGIN CARD
                ================================================== */}

                <div className="relative z-10 w-full max-w-[535px]">

                    <div className="bg-[#f8fbfd] rounded-[22px] shadow-[0_25px_70px_rgba(0,0,0,0.35)] px-7 py-8 sm:px-12 sm:py-10">

                        {/* LOGO */}

                        <div className="flex justify-center">

                            <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">

                                <img
                                    src="/university-of-abra-logo.png"
                                    alt="University of Abra Logo"
                                    className="w-full h-full object-contain drop-shadow-xl"
                                />

                            </div>

                        </div>


                        {/* TITLE */}

                        <div className="text-center mt-4">

                            <h2 className="text-3xl sm:text-4xl font-bold text-[#10284d] tracking-tight">
                                Secure Login
                            </h2>

                        </div>


                        {/* ERROR */}

                        {error && (

                            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                                <div className="flex items-start gap-3">

                                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                        !
                                    </div>

                                    <p className="text-sm text-red-700 leading-relaxed">
                                        {error}
                                    </p>

                                </div>

                            </div>

                        )}


                        {/* =================================================
                            FORM
                        ================================================== */}

                        <form
                            onSubmit={handleSubmit}
                            className="mt-7 space-y-4"
                        >

                            {/* EMAIL */}

                            <div className="relative">

                                <User
                                    size={23}
                                    strokeWidth={1.8}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                                />

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="University Username"
                                    required
                                    autoComplete="email"
                                    disabled={loading}
                                    className="w-full h-[54px] rounded-xl border border-gray-300 bg-white pl-12 pr-4 text-base sm:text-lg text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-[#168fa0] focus:ring-4 focus:ring-[#168fa0]/10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />

                            </div>


                            {/* PASSWORD */}

                            <div className="relative">

                                <LockKeyhole
                                    size={23}
                                    strokeWidth={1.8}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                                />

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Secure Password"
                                    required
                                    autoComplete="current-password"
                                    disabled={loading}
                                    className="w-full h-[54px] rounded-xl border border-gray-300 bg-white pl-12 pr-14 text-base sm:text-lg text-gray-800 placeholder:text-gray-500 outline-none transition focus:border-[#168fa0] focus:ring-4 focus:ring-[#168fa0]/10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />


                                {/* SHOW PASSWORD */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                    disabled={loading}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#168fa0] transition disabled:opacity-50"
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >

                                    {showPassword ? (
                                        <EyeOff size={22} />
                                    ) : (
                                        <Eye size={22} />
                                    )}

                                </button>

                            </div>


                            {/* REMEMBER + FORGOT */}

                            <div className="flex items-center justify-between px-1">

                                {/* REMEMBER */}

                                <label className="flex items-center gap-2 cursor-pointer select-none">

                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) =>
                                            setRememberMe(
                                                e.target.checked
                                            )
                                        }
                                        disabled={loading}
                                        className="appearance-none w-5 h-5 rounded-full border-2 border-[#168fa0] bg-white checked:bg-[#168fa0] relative cursor-pointer disabled:opacity-50"
                                    />

                                    <span className="text-base text-gray-800">
                                        Remember me
                                    </span>

                                </label>


                                {/* FORGOT PASSWORD */}

                                <button
                                    type="button"
                                    onClick={
                                        handleForgotPassword
                                    }
                                    disabled={loading}
                                    className="text-base text-[#10284d] hover:text-[#168fa0] transition disabled:opacity-50"
                                >
                                    Forgot Password?
                                </button>

                            </div>


                            {/* =================================================
                                LOGIN BUTTON
                            ================================================== */}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full h-[54px] rounded-full text-white text-lg font-bold tracking-wide shadow-lg transition-all duration-200 ${
                                    loading
                                        ? "bg-[#73aeb5] cursor-not-allowed"
                                        : "bg-[#1595a5] hover:bg-[#108493] hover:-translate-y-0.5 hover:shadow-xl"
                                }`}
                            >

                                {loading
                                    ? "LOGGING IN..."
                                    : "LOG IN"}

                            </button>


                            {/* CREATE ACCOUNT */}

                            <button
                                type="button"
                                onClick={
                                    handleCreateAccount
                                }
                                disabled={loading}
                                className="w-full text-center text-base text-gray-800 hover:text-[#168fa0] transition pt-1 disabled:opacity-50"
                            >
                                New User?{" "}
                                <span className="font-medium">
                                    Create Account
                                </span>
                            </button>

                        </form>

                    </div>


                    {/* =================================================
                        PROPERTY NOTICE
                    ================================================== */}

                    <div className="mt-5 text-center">

                        <div className="inline-block rounded-lg bg-black/50 backdrop-blur-sm px-5 py-2.5 shadow-lg">

                            <p className="text-sm sm:text-base text-white/90">
                                Property of University of Abra -
                                Internal Financial System
                            </p>

                        </div>

                    </div>

                </div>

            </main>

        </div>
    );
}