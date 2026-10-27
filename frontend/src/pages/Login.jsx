import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import {
    User,
    LockKeyhole,
    Eye,
    EyeOff,
    AlertCircle,
    LoaderCircle,
    ShieldCheck,
} from "lucide-react";

const REQUEST_TIMEOUT = 15000;

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

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    }

    function getLoginError(requestError) {
        const status = requestError.response?.status;
        const data = requestError.response?.data;

        if (!requestError.response) {
            if (requestError.code === "ECONNABORTED") {
                return "The server took too long to respond. Please try again.";
            }

            return "Cannot connect to the UniTeq server. Check your backend server and API configuration.";
        }

        if (status === 401) {
            return data?.message || "The email or password is incorrect.";
        }

        if (status === 403) {
            return (
                data?.message ||
                "Your account is inactive or is not authorized to access UniTeq."
            );
        }

        if (status === 422) {
            const validationErrors = data?.errors;

            if (validationErrors) {
                const messages = Object.values(validationErrors)
                    .flat()
                    .filter((message) => typeof message === "string");

                if (messages.length > 0) {
                    return messages.join(" ");
                }
            }

            return data?.message || "Please check your login information.";
        }

        if (status >= 500) {
            return "The server encountered an error. Please try again or check the Laravel logs.";
        }

        return (
            data?.message ||
            "Unable to complete your login request. Please try again."
        );
    }

    function clearSavedAuthentication() {
        const keys = ["uniteq_token", "uniteq_user"];

        keys.forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const email = form.email.trim();
        const password = form.password;

        if (!email) {
            setError("Please enter your email address.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }

        if (!password) {
            setError("Please enter your password.");
            return;
        }

        setLoading(true);

        try {
            // The shared Axios client supplies the API base URL.
            const response = await api.post(
                "/login",
                { email, password },
                { timeout: REQUEST_TIMEOUT }
            );

            const token = response.data?.token;
            const user = response.data?.user;

            if (
                typeof token !== "string" ||
                !token.trim() ||
                !user ||
                typeof user !== "object" ||
                Array.isArray(user)
            ) {
                setError(
                    "The server response is incomplete. Please check your Laravel login controller."
                );
                return;
            }

            const role = String(user.role || "").trim();
            const normalizedStatus = String(
                user.status ?? "Active"
            ).trim().toLowerCase();

            if (
                role !== "System Administrator" &&
                role !== "Cashier"
            ) {
                setError(
                    "This account does not have a recognized UniTeq role. Please contact the System Administrator."
                );
                return;
            }

            if (normalizedStatus !== "active") {
                setError(
                    "Your account is inactive. Please contact the System Administrator."
                );
                return;
            }

            clearSavedAuthentication();

            const storage = rememberMe ? localStorage : sessionStorage;

            storage.setItem("uniteq_token", token);
            storage.setItem("uniteq_user", JSON.stringify(user));

            // Keep authorization available for any remaining direct Axios calls.
            api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            navigate("/dashboard", { replace: true });
        } catch (requestError) {
            console.error(
                "UniTeq login request failed:",
                requestError.response?.status ||
                    requestError.code ||
                    "Network error"
            );

            setError(getLoginError(requestError));
        } finally {
            setLoading(false);
        }
    }

    function handleForgotPassword() {
        window.alert(
            "Please contact the System Administrator to reset your password."
        );
    }

    function handleCreateAccount() {
        window.alert(
            "UniTeq accounts are created by the System Administrator. Please contact your administrator to request an account."
        );
    }

    return (
        <div className="flex min-h-screen flex-col overflow-hidden bg-[#10284d]">
            {/* University Header */}
            <header className="relative z-10 bg-[#10284d] px-5 py-5 sm:px-8 lg:px-16">
                <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 sm:justify-start sm:gap-5">
                    <div className="h-16 w-16 shrink-0 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
                        <img
                            src="/Uniteq.png"
                            alt="UniTeq Team Logo"
                            className="h-full w-full object-contain drop-shadow-lg"
                        />
                    </div>

                    <div className="min-w-0 text-center text-white sm:text-left">
                        <h1 className="font-serif text-lg font-semibold tracking-wide sm:text-2xl lg:text-3xl">
                            UNIVERSITY OF ABRA
                        </h1>

                        <p className="mt-1 text-sm text-blue-100 sm:text-base">
                            Main Campus Cashier's Unit
                        </p>

                        <h2 className="mt-1 text-base font-bold leading-tight tracking-wide sm:text-xl lg:text-3xl">
                            Financial Management System
                        </h2>
                    </div>
                </div>
            </header>

            {/* Login Area */}
            <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#10284d] via-[#15345f] to-[#0c1f3c]" />

                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-40 top-10 h-[400px] w-[400px] rounded-full border border-white/10 sm:h-[500px] sm:w-[500px]"
                />

                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-40 bottom-0 h-[450px] w-[450px] rounded-full border border-white/10 sm:h-[600px] sm:w-[600px]"
                />

                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-200/20 to-transparent"
                />

                {/* Login Card */}
                <div className="relative z-10 w-full max-w-[500px]">
                    <div className="overflow-hidden rounded-3xl border border-white/20 bg-[#f8fbfd] shadow-[0_25px_70px_rgba(0,0,0,0.35)]">
                        <div className="px-6 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-9">
                            {/* University Logo */}
                            <div className="flex justify-center">
                                <div className="flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36">
                                    <img
                                        src="/university-of-abra-logo.png"
                                        alt="University of Abra Logo"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="mt-4 text-center">
                                <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800">
                                    <ShieldCheck size={15} />
                                    Authorized Personnel Only
                                </div>

                                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#10284d] sm:text-4xl">
                                    Secure Login
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Sign in to access the UniTeq Financial
                                    Management System.
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div
                                    role="alert"
                                    aria-live="assertive"
                                    className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-red-800"
                                >
                                    <AlertCircle
                                        size={20}
                                        className="mt-0.5 shrink-0"
                                    />

                                    <div className="text-sm leading-5">
                                        <p className="font-semibold">
                                            Login Unsuccessful
                                        </p>
                                        <p className="mt-1">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Login Form */}
                            <form
                                onSubmit={handleSubmit}
                                className="mt-7 space-y-5"
                            >
                                {/* Email */}
                                <div>
                                    <label
                                        htmlFor="login-email"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Email Address
                                    </label>

                                    <div className="relative">
                                        <User
                                            size={21}
                                            aria-hidden="true"
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            id="login-email"
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            placeholder="Enter your email address"
                                            autoComplete="username"
                                            maxLength={255}
                                            required
                                            disabled={loading}
                                            className="h-[54px] w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label
                                        htmlFor="login-password"
                                        className="mb-2 block text-sm font-semibold text-slate-700"
                                    >
                                        Password
                                    </label>

                                    <div className="relative">
                                        <LockKeyhole
                                            size={21}
                                            aria-hidden="true"
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            id="login-password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            required
                                            disabled={loading}
                                            className="h-[54px] w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((value) => !value)
                                            }
                                            disabled={loading}
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            aria-pressed={showPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 disabled:opacity-50"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={20} />
                                            ) : (
                                                <Eye size={20} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me and Forgot Password */}
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(event) =>
                                                setRememberMe(event.target.checked)
                                            }
                                            disabled={loading}
                                            className="h-4 w-4 rounded border-slate-300 accent-teal-700 focus:ring-teal-600 disabled:opacity-50"
                                        />
                                        Remember me
                                    </label>

                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        disabled={loading}
                                        className="text-sm font-semibold text-[#10284d] transition hover:text-teal-700 disabled:opacity-50"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-[#1595a5] px-5 text-base font-bold tracking-wide text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#108493] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-teal-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-teal-400"
                                >
                                    {loading ? (
                                        <>
                                            <LoaderCircle
                                                size={20}
                                                className="animate-spin"
                                            />
                                            Signing In...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={20} />
                                            LOG IN
                                        </>
                                    )}
                                </button>

                                {/* Create Account */}
                                <div className="pt-1 text-center">
                                    <p className="text-sm text-slate-600">
                                        Need an account?{" "}
                                        <button
                                            type="button"
                                            onClick={handleCreateAccount}
                                            disabled={loading}
                                            className="font-semibold text-[#10284d] underline decoration-teal-500 underline-offset-4 transition hover:text-teal-700 disabled:opacity-50"
                                        >
                                            Contact the Administrator
                                        </button>
                                    </p>
                                </div>
                            </form>
                        </div>

                        {/* Card Footer */}
                        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-center">
                            <p className="text-xs leading-5 text-slate-500">
                                Property of University of Abra · Internal
                                Financial System
                            </p>
                        </div>
                    </div>

                    <p className="mt-5 text-center text-xs leading-5 text-blue-100/80">
                        Please keep your account credentials confidential.
                    </p>
                </div>
            </main>
        </div>
    );
}
