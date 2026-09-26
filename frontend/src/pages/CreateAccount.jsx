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
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

export default function CreateAccount() {

    const navigate = useNavigate();

    /*
    |--------------------------------------------------------------------------
    | CURRENT USER
    |--------------------------------------------------------------------------
    */

    const [currentUser, setCurrentUser] = useState(null);

    /*
    |--------------------------------------------------------------------------
    | FORM
    |--------------------------------------------------------------------------
    */

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        role: "Cashier",
        status: "Active",
    });

    /*
    |--------------------------------------------------------------------------
    | UI STATES
    |--------------------------------------------------------------------------
    */

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");


    /*
    |--------------------------------------------------------------------------
    | CHECK LOGGED-IN USER
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        try {

            const savedUser =
                localStorage.getItem("uniteq_user");

            if (savedUser) {

                const user =
                    JSON.parse(savedUser);

                setCurrentUser(user);

            }

        } catch (err) {

            console.error(
                "Unable to read logged-in user:",
                err
            );

        }

    }, []);


    /*
    |--------------------------------------------------------------------------
    | HANDLE INPUT
    |--------------------------------------------------------------------------
    */

    function handleChange(e) {

        const {
            name,
            value,
        } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
        setSuccess("");

    }


    /*
    |--------------------------------------------------------------------------
    | CHECK ADMIN
    |--------------------------------------------------------------------------
    */

    const isAdministrator =
        currentUser?.role ===
        "System Administrator";


    /*
    |--------------------------------------------------------------------------
    | CREATE ACCOUNT
    |--------------------------------------------------------------------------
    */

    async function handleSubmit(e) {

        e.preventDefault();

        setError("");
        setSuccess("");


        /*
         * Basic password check
         */

        if (
            form.password.length < 8
        ) {

            setError(
                "Password must contain at least 8 characters."
            );

            return;

        }


        /*
         * Confirm password
         */

        if (
            form.password !==
            form.password_confirmation
        ) {

            setError(
                "Passwords do not match."
            );

            return;

        }


        try {

            setLoading(true);


            /*
             * Send the account information
             * to Laravel.
             */

            const response =
                await api.post(
                    "/users",
                    form
                );


            setSuccess(
                response.data?.message ||
                "Cashier staff account created successfully."
            );


            /*
             * Clear the form.
             */

            setForm({
                name: "",
                email: "",
                password: "",
                password_confirmation: "",
                role: "Cashier",
                status: "Active",
            });


        } catch (err) {

            console.error(
                "Create account error:",
                err
            );


            /*
             * Laravel validation errors
             */

            if (
                err.response?.status === 422
            ) {

                const validationErrors =
                    err.response?.data?.errors;

                if (validationErrors) {

                    const firstError =
                        Object.values(
                            validationErrors
                        )[0]?.[0];

                    setError(
                        firstError ||
                        "Please check the information you entered."
                    );

                } else {

                    setError(
                        err.response?.data?.message ||
                        "Please check the information you entered."
                    );

                }

                return;

            }


            /*
             * User is not System Administrator
             */

            if (
                err.response?.status === 403
            ) {

                setError(
                    "Only the System Administrator can create cashier staff accounts."
                );

                return;

            }


            /*
             * Not logged in
             */

            if (
                err.response?.status === 401
            ) {

                setError(
                    "Your session has expired. Please log in again."
                );

                return;

            }


            /*
             * General error
             */

            setError(
                err.response?.data?.message ||
                "Unable to create the account. Please try again."
            );

        } finally {

            setLoading(false);

        }

    }


    /*
    |--------------------------------------------------------------------------
    | ACCESS DENIED PAGE
    |--------------------------------------------------------------------------
    */

    if (
        currentUser &&
        !isAdministrator
    ) {

        return (

            <div className="min-h-[80vh] flex items-center justify-center px-4">

                <div className="w-full max-w-lg">

                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 text-center">

                        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">

                            <ShieldCheck
                                size={32}
                            />

                        </div>


                        <h1 className="mt-6 text-2xl font-bold text-gray-900">
                            Administrator Access Required
                        </h1>


                        <p className="mt-3 text-sm leading-6 text-gray-500">

                            Only the System Administrator
                            can create new UniTeq user
                            accounts.

                        </p>


                        <p className="mt-2 text-sm leading-6 text-gray-500">

                            Please contact the System
                            Administrator if you need
                            a Cashier Staff account.

                        </p>


                        <Link
                            to="/dashboard"
                            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-semibold px-6 py-3 transition"
                        >

                            <ArrowLeft
                                size={17}
                            />

                            Back to Dashboard

                        </Link>

                    </div>

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | PAGE
    |--------------------------------------------------------------------------
    */

    return (

        <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">

            <div className="w-full max-w-3xl">


                {/* =====================================================
                    HEADER
                ====================================================== */}

                <div className="text-center mb-6">

                    <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center">

                        <UserPlus
                            size={30}
                        />

                    </div>


                    <h1 className="mt-4 text-3xl font-bold text-gray-900">
                        Create Cashier Staff Account
                    </h1>


                    <p className="mt-2 text-sm text-gray-500">
                        System Administrator — Create a new UniTeq user profile
                    </p>

                </div>


                {/* =====================================================
                    FORM CARD
                ====================================================== */}

                <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">


                    {/* TOP BLUE SECTION */}

                    <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 px-6 sm:px-8 py-6 text-white">

                        <div className="flex items-center gap-4">

                            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">

                                <ShieldCheck
                                    size={25}
                                />

                            </div>


                            <div>

                                <h2 className="font-bold text-lg">
                                    New Cashier Staff Profile
                                </h2>

                                <p className="text-sm text-blue-200 mt-1">
                                    The account will be used to access the UniTeq Financial Management System.
                                </p>

                            </div>

                        </div>

                    </div>


                    <form
                        onSubmit={handleSubmit}
                        className="p-6 sm:p-8"
                    >


                        {/* =================================================
                            SUCCESS
                        ================================================== */}

                        {success && (

                            <div className="mb-6 flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-green-800">

                                <CheckCircle
                                    size={20}
                                    className="mt-0.5 shrink-0"
                                />

                                <div>

                                    <p className="font-semibold">
                                        Account Created
                                    </p>

                                    <p className="text-sm mt-1">
                                        {success}
                                    </p>

                                </div>

                            </div>

                        )}


                        {/* =================================================
                            ERROR
                        ================================================== */}

                        {error && (

                            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-4 text-red-800">

                                <AlertCircle
                                    size={20}
                                    className="mt-0.5 shrink-0"
                                />

                                <div>

                                    <p className="font-semibold">
                                        Unable to Create Account
                                    </p>

                                    <p className="text-sm mt-1">
                                        {error}
                                    </p>

                                </div>

                            </div>

                        )}


                        {/* =================================================
                            STAFF INFORMATION
                        ================================================== */}

                        <div>

                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                Staff Information
                            </h3>

                            <p className="text-xs text-gray-500 mt-1">
                                Enter the official information of the new cashier staff member.
                            </p>

                        </div>


                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">


                            {/* NAME */}

                            <div className="md:col-span-2">

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Staff Full Name
                                </label>

                                <div className="relative">

                                    <User
                                        size={19}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Enter staff full name"
                                        required
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />

                                </div>

                            </div>


                            {/* EMAIL */}

                            <div className="md:col-span-2">

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Staff Email Address
                                </label>

                                <div className="relative">

                                    <Mail
                                        size={19}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="Enter staff email address"
                                        required
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />

                                </div>

                            </div>


                            {/* ROLE */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    System Role
                                </label>

                                <select
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                >

                                    <option value="Cashier">
                                        Cashier
                                    </option>

                                    <option value="System Administrator">
                                        System Administrator
                                    </option>

                                </select>

                            </div>


                            {/* STATUS */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Account Status
                                </label>

                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                >

                                    <option value="Active">
                                        Active
                                    </option>

                                    <option value="Inactive">
                                        Inactive
                                    </option>

                                </select>

                            </div>

                        </div>


                        {/* =================================================
                            PASSWORD
                        ================================================== */}

                        <div className="mt-8 pt-7 border-t border-gray-100">

                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                Account Password
                            </h3>

                            <p className="text-xs text-gray-500 mt-1">
                                Create a temporary password for the new staff account.
                            </p>

                        </div>


                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">


                            {/* PASSWORD */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Temporary Password
                                </label>

                                <div className="relative">

                                    <Lock
                                        size={19}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
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
                                        placeholder="Minimum 8 characters"
                                        required
                                        minLength={8}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-12 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                    >

                                        {showPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}

                                    </button>

                                </div>

                            </div>


                            {/* CONFIRM PASSWORD */}

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Confirm Password
                                </label>

                                <div className="relative">

                                    <Lock
                                        size={19}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="password_confirmation"
                                        value={
                                            form.password_confirmation
                                        }
                                        onChange={handleChange}
                                        placeholder="Re-enter password"
                                        required
                                        minLength={8}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-12 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                    >

                                        {showConfirmPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}

                                    </button>

                                </div>

                            </div>

                        </div>


                        {/* =================================================
                            NOTE
                        ================================================== */}

                        <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 p-4">

                            <div className="flex items-start gap-3">

                                <ShieldCheck
                                    size={19}
                                    className="text-blue-700 mt-0.5 shrink-0"
                                />

                                <p className="text-xs leading-5 text-blue-800">

                                    The System Administrator is responsible
                                    for creating and managing authorized
                                    UniTeq accounts. The account credentials
                                    should be provided securely to the
                                    assigned staff member.

                                </p>

                            </div>

                        </div>


                        {/* =================================================
                            BUTTONS
                        ================================================== */}

                        <div className="mt-7 flex flex-col sm:flex-row gap-3">

                            <Link
                                to="/users"
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 text-sm transition"
                            >

                                <ArrowLeft
                                    size={17}
                                />

                                Cancel

                            </Link>


                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-blue-800 hover:bg-blue-900 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 text-sm shadow-lg shadow-blue-900/20 transition"
                            >

                                <UserPlus
                                    size={18}
                                />

                                {loading
                                    ? "Creating Account..."
                                    : "Create Cashier Staff Account"}

                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </div>

    );

}