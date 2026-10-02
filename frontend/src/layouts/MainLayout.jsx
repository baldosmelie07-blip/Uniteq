import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

import {
    LayoutDashboard,
    Receipt,
    Wallet,
    FileCheck,
    FileText,
    Users,
    ShieldCheck,
    LogOut,
    Menu,
    X,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

export default function MainLayout() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    // =========================================================
    // CHECK AUTHENTICATION
    // =========================================================

    useEffect(() => {
        let mounted = true;

        async function verifyUser() {
            // Login can save the session in either localStorage
            // (Remember Me checked) or sessionStorage
            // (Remember Me unchecked). Check both.
            const token =
                localStorage.getItem("uniteq_token") ||
                sessionStorage.getItem("uniteq_token");

            const savedUser =
                localStorage.getItem("uniteq_user") ||
                sessionStorage.getItem("uniteq_user");

            console.log("MAIN LAYOUT TOKEN:", token);
            console.log(
                "TOKEN SOURCE:",
                localStorage.getItem("uniteq_token")
                    ? "localStorage"
                    : sessionStorage.getItem("uniteq_token")
                        ? "sessionStorage"
                        : "none"
            );

            if (!token) {
                console.log("NO TOKEN - GOING TO LOGIN");

                if (mounted) {
                    setCheckingAuth(false);
                    navigate("/", { replace: true });
                }

                return;
            }

            axios.defaults.headers.common.Authorization =
                `Bearer ${token}`;

            try {
                console.log("CHECKING /api/me...");

                const response = await axios.get(
                    `${API_URL}/me`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                        },
                    }
                );

                console.log("ME RESPONSE:", response.data);

                const authenticatedUser = response.data?.user;

                if (!authenticatedUser) {
                    throw new Error("Laravel returned no user.");
                }

                // Account status
                if (
                    authenticatedUser.status &&
                    authenticatedUser.status !== "Active"
                ) {
                    console.log("ACCOUNT IS INACTIVE");

                    localStorage.removeItem("uniteq_token");
                    localStorage.removeItem("uniteq_user");

                    delete axios.defaults.headers.common.Authorization;

                    if (mounted) {
                        setCheckingAuth(false);
                        navigate("/", { replace: true });
                    }

                    return;
                }

                // Save verified user
                localStorage.setItem(
                    "uniteq_user",
                    JSON.stringify(authenticatedUser)
                );

                if (mounted) {
                    setUser(authenticatedUser);
                    setCheckingAuth(false);
                }

                console.log(
                    "AUTHENTICATION SUCCESS:",
                    authenticatedUser
                );

            } catch (error) {
                console.error("AUTH CHECK ERROR:", error);

                // Only 401 means the token is invalid.
                if (error.response?.status === 401) {
                    console.log(
                        "TOKEN IS INVALID - CLEARING SESSION"
                    );

                    localStorage.removeItem("uniteq_token");
                    localStorage.removeItem("uniteq_user");

                    delete axios.defaults.headers.common.Authorization;

                    if (mounted) {
                        setCheckingAuth(false);
                        navigate("/", { replace: true });
                    }

                    return;
                }

                // Temporary server/network problem
                console.log(
                    "SERVER/NETWORK ERROR - KEEPING SESSION"
                );

                if (savedUser) {
                    try {
                        const parsedUser = JSON.parse(savedUser);

                        if (mounted) {
                            setUser(parsedUser);
                        }
                    } catch (parseError) {
                        console.error(
                            "Could not read saved user:",
                            parseError
                        );
                    }
                }

                if (mounted) {
                    setCheckingAuth(false);
                }
            }
        }

        verifyUser();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    // =========================================================
    // LOGOUT
    // =========================================================

    async function handleLogout() {
        const token =
            localStorage.getItem("uniteq_token") ||
            sessionStorage.getItem("uniteq_token");

        console.log("LOGGING OUT");

        try {
            if (token) {
                await axios.post(
                    `${API_URL}/logout`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/json",
                        },
                    }
                );
            }
        } catch (error) {
            console.error("Logout API error:", error);
        }

        localStorage.removeItem("uniteq_token");
        localStorage.removeItem("uniteq_user");

        sessionStorage.removeItem("uniteq_token");
        sessionStorage.removeItem("uniteq_user");

        delete axios.defaults.headers.common.Authorization;

        setUser(null);

        navigate("/", {
            replace: true,
        });
    }

    // =========================================================
    // LOADING
    // =========================================================

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">

                    <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto"></div>

                    <p className="mt-4 text-sm text-gray-500">
                        Verifying your account...
                    </p>

                </div>
            </div>
        );
    }

    // =========================================================
    // USER ROLE
    // =========================================================

    const isAdmin =
        user?.role === "System Administrator";

    // =========================================================
    // NAVIGATION
    // =========================================================

    const navigation = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            name: "Collections",
            path: "/collections",
            icon: Wallet,
        },
        {
            name: "Receipts",
            path: "/receipts",
            icon: Receipt,
        },
        {
            name: "Pending Balances",
            path: "/pending-balances",
            icon: FileCheck,
        },
        {
            name: "Vouchers",
            path: "/vouchers",
            icon: FileText,
        },
        {
            name: "Reports",
            path: "/reports",
            icon: FileText,
        },
        {
            name: "Audit Trail",
            path: "/audit-trail",
            icon: ShieldCheck,
        },
    ];

    // =========================================================
    // ADMIN ONLY
    // User Management already contains "Create New User",
    // so there is no separate Create Account navigation item.
    // =========================================================

    if (isAdmin) {
        navigation.push({
            name: "Users",
            path: "/users",
            icon: Users,
        });
    }

    // =========================================================
    // NAV LINK STYLE
    // =========================================================

    function navLinkClass({ isActive }) {
        return `
            flex items-center gap-3
            px-4 py-3
            rounded-xl
            transition
            ${
                isActive
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            }
        `;
    }

    // =========================================================
    // MAIN UI
    // =========================================================

    return (
        <div className="min-h-screen bg-gray-50 flex">

            {/* DESKTOP SIDEBAR */}

            <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200 flex-col">

                <div className="p-6 border-b border-gray-100">

                    <div className="flex items-center gap-3">

                        <img
                            src="/university-of-abra-logo.png"
                            alt="University of Abra"
                            className="w-12 h-12 object-contain"
                        />

                        <div>

                            <h1 className="text-xl font-bold text-blue-900">
                                UniTeq
                            </h1>

                            <p className="text-xs text-gray-500">
                                Financial Management
                            </p>

                        </div>

                    </div>

                </div>

                {/* USER */}

                <div className="px-5 py-5 border-b border-gray-100">

                    <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.name || "User"}
                    </p>

                    <p className="text-xs text-gray-500 mt-1 truncate">
                        {user?.email || ""}
                    </p>

                    <span className="inline-flex mt-3 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        {user?.role || "User"}
                    </span>

                </div>

                {/* NAVIGATION */}

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">

                    {navigation.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={navLinkClass}
                            >
                                <Icon size={19} />

                                <span>
                                    {item.name}
                                </span>
                            </NavLink>
                        );
                    })}

                </nav>

                {/* LOGOUT */}

                <div className="p-4 border-t border-gray-100">

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition"
                    >
                        <LogOut size={19} />

                        <span className="font-medium">
                            Logout
                        </span>

                    </button>

                </div>

            </aside>

            {/* MOBILE SIDEBAR */}

            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">

                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setMobileOpen(false)}
                    />

                    <aside className="relative w-72 h-full bg-white shadow-xl flex flex-col">

                        <div className="flex items-center justify-between p-5 border-b">

                            <div className="flex items-center gap-3">

                                <img
                                    src="/university-of-abra-logo.png"
                                    alt="University of Abra"
                                    className="w-10 h-10 object-contain"
                                />

                                <h1 className="font-bold text-blue-900">
                                    UniTeq
                                </h1>

                            </div>

                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >
                                <X size={20} />
                            </button>

                        </div>

                        <div className="px-5 py-4 border-b">

                            <p className="font-semibold text-gray-900 truncate">
                                {user?.name}
                            </p>

                            <p className="text-xs text-gray-500 truncate">
                                {user?.email}
                            </p>

                            <span className="inline-flex mt-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                                {user?.role}
                            </span>

                        </div>

                        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">

                            {navigation.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMobileOpen(false)}
                                        className={navLinkClass}
                                    >
                                        <Icon size={19} />

                                        <span>
                                            {item.name}
                                        </span>

                                    </NavLink>
                                );
                            })}

                        </nav>

                        <div className="p-4 border-t">

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50"
                            >
                                <LogOut size={19} />

                                <span>
                                    Logout
                                </span>

                            </button>

                        </div>

                    </aside>

                </div>
            )}

            {/* MAIN AREA */}

            <div className="flex-1 min-w-0">

                {/* TOP BAR */}

                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">

                    <button
                        onClick={() => setMobileOpen(true)}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="hidden lg:block">

                        <p className="text-sm text-gray-500">
                            University of Abra — Main Campus
                        </p>

                    </div>

                    <div className="ml-auto flex items-center gap-3">

                        <div className="text-right hidden sm:block">

                            <p className="text-sm font-semibold text-gray-800">
                                {user?.name}
                            </p>

                            <p className="text-xs text-gray-500">
                                {user?.role}
                            </p>

                        </div>

                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">

                            {user?.name
                                ?.charAt(0)
                                ?.toUpperCase() || "U"}

                        </div>

                    </div>

                </header>

                {/* PAGE CONTENT */}

                <main className="p-4 sm:p-6 lg:p-8">

                    <Outlet />

                </main>

            </div>

        </div>
    );
}
