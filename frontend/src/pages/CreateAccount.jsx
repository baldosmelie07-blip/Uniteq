
import { useEffect, useState } from "react";
import {
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ShieldCheck,
    ArrowLeft,
    UserPlus,
    CheckCircle,
    AlertCircle,
    LoaderCircle,
    Info,
    Check,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const INITIAL_FORM = {
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "Cashier",
    status: "Active",
};

function getSavedUser() {
    try {
        const savedUser = localStorage.getItem("uniteq_user");
        return savedUser ? JSON.parse(savedUser) : null;
    } catch {
        return null;
    }
}

function getErrorMessage(error) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    if (!error.response) {
        return "Cannot connect to Laravel. Make sure the backend is running and your API configuration is correct.";
    }

    if (status === 401) {
        return "Your session has expired or you are not logged in. Please sign in again.";
    }

    if (status === 403) {
        return "You do not have permission to create accounts. Please contact the System Administrator.";
    }

    if (status === 404) {
        return "The user registration endpoint was not found. Please check your Laravel API route.";
    }

    if (status === 422) {
        const errors = responseData?.errors;

        if (errors && typeof errors === "object") {
            const firstError = Object.values(errors)
                .flat()
                .find((message) => typeof message === "string");

            if (firstError) return firstError;
        }

        return responseData?.message ||
            "Please review the information you entered.";
    }

    if (status >= 500) {
        return "The server encountered a problem while creating the account. Check the Laravel logs for details.";
    }

    return responseData?.message ||
        "Unable to create the account. Please try again.";
}

function FieldLabel({ children, htmlFor, required = false }) {
    return (
        <label
            htmlFor={htmlFor}
            className="mb-2 block text-sm font-semibold text-slate-700"
        >
            {children}
            {required && (
                <span className="ml-1 text-red-500" aria-hidden="true">
                    *
                </span>
            )}
        </label>
    );
}

function InputIcon({ icon: Icon }) {
    return (
        <Icon
            size={19}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
    );
}

function PasswordChecklist({ password }) {
    const checks = [
        {
            label: "At least 8 characters",
            valid: password.length >= 8,
        },
        {
            label: "Passwords match",
            valid: false,
        },
    ];

    return (
        <div className="mt-3 space-y-2">
            {checks.slice(0, 1).map((check) => (
                <div
                    key={check.label}
                    className={`flex items-center gap-2 text-xs ${
                        check.valid ? "text-emerald-700" : "text-slate-500"
                    }`}
                >
                    {check.valid ? (
                        <Check size={14} />
                    ) : (
                        <Info size={14} />
                    )}
                    {check.label}
                </div>
            ))}
        </div>
    );
}

export default function CreateAccount() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [checkingUser, setCheckingUser] = useState(true);

    const [form, setForm] = useState(INITIAL_FORM);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const isAdministrator =
        String(currentUser?.role || "").trim().toLowerCase() ===
        "system administrator";

    useEffect(() => {
        setCurrentUser(getSavedUser());
        setCheckingUser(false);
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
        setSuccess("");
    }

    function validateForm() {
        const name = form.name.trim();
        const email = form.email.trim();

        if (!name) {
            return "Please enter the staff member's full name.";
        }

        if (name.length > 255) {
            return "The staff name must not exceed 255 characters.";
        }

        if (!email) {
            return "Please enter an email address.";
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return "Please enter a valid email address.";
        }

        if (form.password.length < 8) {
            return "The password must contain at least 8 characters.";
        }

        if (form.password !== form.password_confirmation) {
            return "The passwords do not match.";
        }

        if (!["Cashier", "System Administrator"].includes(form.role)) {
            return "Please select a valid system role.";
        }

        if (!["Active", "Inactive"].includes(form.status)) {
            return "Please select a valid account status.";
        }

        return "";
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!isAdministrator) {
            setError(
                "Only the System Administrator can create user accounts."
            );
            return;
        }

        const validationMessage = validateForm();

        if (validationMessage) {
            setError(validationMessage);
            return;
        }

        setLoading(true);

        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                password_confirmation: form.password_confirmation,
                role: form.role,
                status: form.status,
            };

            const response = await api.post("/users", payload);

            setSuccess(
                response.data?.message ||
                "The user account was created successfully."
            );

            setForm({ ...INITIAL_FORM });
            setShowPassword(false);
            setShowConfirmPassword(false);
        } catch (requestError) {
            console.error("Create account error:", requestError);
            setError(getErrorMessage(requestError));
        } finally {
            setLoading(false);
        }
    }

    if (checkingUser) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                    <LoaderCircle className="animate-spin" size={21} />
                    Checking account permissions...
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                        <ShieldCheck size={30} />
                    </div>

                    <h1 className="mt-5 text-2xl font-bold text-[#102d55]">
                        Sign-in Required
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Please sign in with your administrator account before
                        creating a UniTeq user account.
                    </p>

                    <Link
                        to="/login"
                        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#102d55] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                    >
                        <ArrowLeft size={17} />
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    if (!isAdministrator) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
                <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                        <ShieldCheck size={30} />
                    </div>

                    <h1 className="mt-5 text-2xl font-bold text-[#102d55]">
                        Administrator Access Required
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Only the System Administrator can create UniTeq user
                        accounts. Contact your administrator if you need an
                        account.
                    </p>

                    <Link
                        to="/dashboard"
                        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#102d55] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                    >
                        <ArrowLeft size={17} />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
                <div className="mb-7">
                    <Link
                        to="/users"
                        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-teal-700"
                    >
                        <ArrowLeft size={16} />
                        Back to User Management
                    </Link>

                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
                            <UserPlus size={27} />
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-teal-700">
                                UniTeq · User Management
                            </p>

                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#102d55] sm:text-3xl">
                                Create User Account
                            </h1>

                            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                                Register an authorized staff member and assign
                                the appropriate system role and account status.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-[#102d55] to-[#174a78] px-6 py-6 text-white sm:px-8">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
                                <ShieldCheck size={25} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold">
                                    New Staff Profile
                                </h2>
                                <p className="mt-1 text-sm leading-5 text-blue-100">
                                    Complete all required fields to create the
                                    account.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-8 p-6 sm:p-8"
                    >
                        {success && (
                            <div
                                role="status"
                                aria-live="polite"
                                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"
                            >
                                <CheckCircle
                                    size={21}
                                    className="mt-0.5 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">
                                        Account Created Successfully
                                    </p>
                                    <p className="mt-1 text-sm leading-5">
                                        {success}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate("/users")}
                                        className="mt-3 text-sm font-bold underline underline-offset-2"
                                    >
                                        Go to User Management
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div
                                role="alert"
                                aria-live="assertive"
                                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
                            >
                                <AlertCircle
                                    size={21}
                                    className="mt-0.5 shrink-0"
                                />
                                <div>
                                    <p className="font-semibold">
                                        Unable to Create Account
                                    </p>
                                    <p className="mt-1 text-sm leading-5">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        )}

                        <section>
                            <div className="mb-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                    Staff Information
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Enter the staff member's official
                                    information.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <FieldLabel htmlFor="staff-name" required>
                                        Full Name
                                    </FieldLabel>
                                    <div className="relative">
                                        <InputIcon icon={User} />
                                        <input
                                            id="staff-name"
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            autoComplete="name"
                                            maxLength={255}
                                            placeholder="Enter full name"
                                            required
                                            disabled={loading}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <FieldLabel htmlFor="staff-email" required>
                                        Email Address
                                    </FieldLabel>
                                    <div className="relative">
                                        <InputIcon icon={Mail} />
                                        <input
                                            id="staff-email"
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            autoComplete="email"
                                            maxLength={255}
                                            placeholder="staff@example.com"
                                            required
                                            disabled={loading}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <FieldLabel htmlFor="staff-role" required>
                                        System Role
                                    </FieldLabel>
                                    <select
                                        id="staff-role"
                                        name="role"
                                        value={form.role}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="Cashier">Cashier</option>
                                        <option value="System Administrator">
                                            System Administrator
                                        </option>
                                    </select>
                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        Assign only the permissions required by
                                        the staff member.
                                    </p>
                                </div>

                                <div>
                                    <FieldLabel htmlFor="staff-status" required>
                                        Account Status
                                    </FieldLabel>
                                    <select
                                        id="staff-status"
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                    <p className="mt-2 text-xs leading-5 text-slate-500">
                                        Inactive accounts should be prevented
                                        from signing in by the backend.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="border-t border-slate-100 pt-7">
                            <div className="mb-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                                    Account Password
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Set a password for the new staff member.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <FieldLabel
                                        htmlFor="staff-password"
                                        required
                                    >
                                        Password
                                    </FieldLabel>

                                    <div className="relative">
                                        <InputIcon icon={Lock} />
                                        <input
                                            id="staff-password"
                                            type={
                                                showPassword ? "text" : "password"
                                            }
                                            name="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            autoComplete="new-password"
                                            minLength={8}
                                            placeholder="At least 8 characters"
                                            required
                                            disabled={loading}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((value) => !value)
                                            }
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            aria-pressed={showPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={19} />
                                            ) : (
                                                <Eye size={19} />
                                            )}
                                        </button>
                                    </div>

                                    <PasswordChecklist password={form.password} />
                                </div>

                                <div>
                                    <FieldLabel
                                        htmlFor="staff-password-confirm"
                                        required
                                    >
                                        Confirm Password
                                    </FieldLabel>

                                    <div className="relative">
                                        <InputIcon icon={Lock} />
                                        <input
                                            id="staff-password-confirm"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="password_confirmation"
                                            value={form.password_confirmation}
                                            onChange={handleChange}
                                            autoComplete="new-password"
                                            minLength={8}
                                            placeholder="Re-enter password"
                                            required
                                            disabled={loading}
                                            aria-invalid={
                                                Boolean(form.password_confirmation) &&
                                                form.password !== form.password_confirmation
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-12 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword((value) => !value)
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? "Hide confirmation password"
                                                    : "Show confirmation password"
                                            }
                                            aria-pressed={showConfirmPassword}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff size={19} />
                                            ) : (
                                                <Eye size={19} />
                                            )}
                                        </button>
                                    </div>

                                    {form.password_confirmation && (
                                        <p
                                            className={`mt-3 flex items-center gap-2 text-xs ${
                                                form.password === form.password_confirmation
                                                    ? "text-emerald-700"
                                                    : "text-red-600"
                                            }`}
                                        >
                                            {form.password === form.password_confirmation ? (
                                                <Check size={14} />
                                            ) : (
                                                <AlertCircle size={14} />
                                            )}
                                            {form.password === form.password_confirmation
                                                ? "Passwords match"
                                                : "Passwords do not match"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <ShieldCheck
                                size={20}
                                className="mt-0.5 shrink-0 text-blue-700"
                            />
                            <div>
                                <p className="text-sm font-semibold text-blue-900">
                                    Account Security
                                </p>
                                <p className="mt-1 text-xs leading-5 text-blue-800">
                                    Share account credentials securely with the
                                    assigned staff member. Laravel must validate
                                    the submitted role, protect account creation,
                                    and store passwords securely.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                            <Link
                                to="/users"
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <ArrowLeft size={17} />
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? (
                                    <>
                                        <LoaderCircle
                                            size={18}
                                            className="animate-spin"
                                        />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        Create User Account
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-center text-xs text-slate-400">
                            Fields marked with * are required.
                        </p>
                    </form>
                </div>

                <p className="mt-5 text-center text-xs leading-5 text-slate-400">
                    UniTeq · Web-Based System for Digitalized Financial
                    Transactions
                </p>
            </div>
        </div>
    );
}
