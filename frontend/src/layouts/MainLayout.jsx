
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Outlet,
    NavLink,
    useLocation,
    useNavigate,
} from "react-router-dom";
import axios from "axios";

import {
    LayoutDashboard,
    Receipt,
    Wallet,
    FileCheck,
    FileText,
    Users,
    LogOut,
    Menu,
    X,
    Search,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    AlertCircle,
    RefreshCw,
    Landmark,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";

const ROLE_ADMIN = "System Administrator";

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
];

function getToken() {
    return (
        localStorage.getItem("uniteq_token") ||
        sessionStorage.getItem("uniteq_token")
    );
}

function clearSession() {
    localStorage.removeItem("uniteq_token");
    localStorage.removeItem("uniteq_user");

    sessionStorage.removeItem("uniteq_token");
    sessionStorage.removeItem("uniteq_user");

    delete axios.defaults.headers.common.Authorization;
}

function getInitials(name = "") {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "U"
    );
}

function getPageTitle(pathname) {
    const matched = navigation.find(
        (item) =>
            pathname === item.path ||
            pathname.startsWith(`${item.path}/`)
    );

    if (matched) {
        return matched.name;
    }

    if (pathname.startsWith("/users")) {
        return "User Management";
    }

    return "Workspace";
}

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [authError, setAuthError] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);

    const isAdmin = user?.role === ROLE_ADMIN;
    const pageTitle = getPageTitle(location.pathname);

    const visibleNavigation = useMemo(() => {
        const items = [...navigation];

        if (isAdmin) {
            items.push({
                name: "User Management",
                path: "/users",
                icon: Users,
            });
        }

        return items;
    }, [isAdmin]);

    const filteredNavigation = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        if (!query) {
            return visibleNavigation;
        }

        return visibleNavigation.filter((item) =>
            item.name.toLowerCase().includes(query)
        );
    }, [visibleNavigation, searchTerm]);

    // ---------------------------------------------------------
    // AUTHENTICATION
    // Always verify the account with Laravel before rendering
    // protected content. Cached user data alone is not trusted.
    // ---------------------------------------------------------

    const verifyUser = useCallback(async () => {
        setCheckingAuth(true);
        setAuthError("");

        const token = getToken();

        if (!token) {
            clearSession();
            setUser(null);
            setCheckingAuth(false);
            navigate("/", { replace: true });
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                timeout: 15000,
            });

            const authenticatedUser = response.data?.user;

            if (!authenticatedUser?.id || !authenticatedUser?.role) {
                throw new Error(
                    "The server returned an incomplete user profile."
                );
            }

            if (
                authenticatedUser.status &&
                authenticatedUser.status.toLowerCase() !== "active"
            ) {
                clearSession();
                setUser(null);
                navigate("/", { replace: true });
                return;
            }

            setUser(authenticatedUser);

            // Store profile data for convenience, not as proof of login.
            const storage = localStorage.getItem("uniteq_token")
                ? localStorage
                : sessionStorage;

            storage.setItem(
                "uniteq_user",
                JSON.stringify(authenticatedUser)
            );
        } catch (error) {
            const status = error.response?.status;

            if (status === 401 || status === 403) {
                clearSession();
                setUser(null);
                navigate("/", { replace: true });
            } else {
                // Do not open protected pages using a cached profile
                // when the server cannot verify the session.
                setUser(null);
                setAuthError(
                    error.response
                        ? "UniTeq could not verify your account. Please try again."
                        : "Cannot connect to the UniTeq server. Check that Laravel is running, then try again."
                );
            }
        } finally {
            setCheckingAuth(false);
        }
    }, [navigate]);

    useEffect(() => {
        let mounted = true;

        async function check() {
            await verifyUser();
        }

        if (mounted) {
            check();
        }

        return () => {
            mounted = false;
        };
    }, [verifyUser]);

    // ---------------------------------------------------------
    // LOGOUT
    // ---------------------------------------------------------

    async function handleLogout() {
        const token = getToken();

        // Clear the local session immediately.
        clearSession();
        setUser(null);
        setAccountMenuOpen(false);
        setMobileOpen(false);

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
                        timeout: 10000,
                    }
                );
            }
        } catch (error) {
            // The local session is already cleared.
            // Laravel should also revoke the server-side token.
            console.error("Logout request failed:", error.message);
        } finally {
            navigate("/", { replace: true });
        }
    }

    // ---------------------------------------------------------
    // LOADING SCREEN
    // ---------------------------------------------------------

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                        <Landmark
                            size={28}
                            className="text-blue-700"
                        />
                    </div>

                    <div className="mx-auto mt-5 h-7 w-7 animate-spin rounded-full border-2 border-blue-100 border-t-blue-700" />

                    <p className="mt-4 text-sm font-medium text-slate-700">
                        Verifying your account
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Connecting securely to UniTeq...
                    </p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------
    // SERVER VERIFICATION ERROR
    // ---------------------------------------------------------

    if (authError) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                        <AlertCircle
                            size={24}
                            className="text-amber-600"
                        />
                    </div>

                    <h1 className="mt-5 text-center text-xl font-semibold text-slate-900">
                        Unable to verify account
                    </h1>

                    <p className="mt-2 text-center text-sm leading-6 text-slate-500">
                        {authError}
                    </p>

                    <button
                        type="button"
                        onClick={verifyUser}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                    >
                        <RefreshCw size={17} />
                        Try again
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            clearSession();
                            navigate("/", { replace: true });
                        }}
                        className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        Return to login
                    </button>
                </div>
            </div>
        );
    }

    // Never render protected layout without a verified user.
    if (!user) {
        return null;
    }

    // ---------------------------------------------------------
    // NAVIGATION ITEM
    // ---------------------------------------------------------

    function renderNavigationItem(item, mobile = false) {
        const Icon = item.icon;

        return (
            <NavLink
                key={item.path}
                to={item.path}
                title={sidebarCollapsed && !mobile ? item.name : undefined}
                onClick={() => {
                    setMobileOpen(false);
                    setSearchTerm("");
                }}
                className={({ isActive }) =>
                    [
                        "group flex items-center rounded-full text-sm transition-colors",
                        sidebarCollapsed && !mobile
                            ? "justify-center px-0 py-3"
                            : "gap-3 px-4 py-3",
                        isActive
                            ? "bg-blue-100 font-semibold text-blue-900"
                            : "text-slate-700 hover:bg-slate-100",
                    ].join(" ")
                }
            >
                <Icon
                    size={19}
                    className="shrink-0"
                    strokeWidth={1.8}
                />

                {(!sidebarCollapsed || mobile) && (
                    <span className="truncate">{item.name}</span>
                )}
            </NavLink>
        );
    }

    // ---------------------------------------------------------
    // SIDEBAR CONTENT
    // ---------------------------------------------------------

    function renderSidebar(mobile = false) {
        return (
            <div className="flex h-full min-h-0 flex-col bg-white">
                <div className="flex h-[76px] items-center justify-between gap-3 px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <img
                            src="/university-of-abra-logo.png"
                            alt="University of Abra"
                            className="h-10 w-10 shrink-0 object-contain"
                        />

                        {(!sidebarCollapsed || mobile) && (
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold tracking-tight text-blue-900">
                                    UniTeq
                                </h1>
                                <p className="text-[11px] text-slate-500">
                                    Financial Management
                                </p>
                            </div>
                        )}
                    </div>

                    {mobile ? (
                        <button
                            type="button"
                            onClick={() => setMobileOpen(false)}
                            aria-label="Close navigation"
                            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                        >
                            <X size={20} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                setSidebarCollapsed((previous) => !previous)
                            }
                            aria-label={
                                sidebarCollapsed
                                    ? "Expand sidebar"
                                    : "Collapse sidebar"
                            }
                            title={
                                sidebarCollapsed
                                    ? "Expand sidebar"
                                    : "Collapse sidebar"
                            }
                            className="hidden rounded-full p-2 text-slate-500 hover:bg-slate-100 lg:block"
                        >
                            {sidebarCollapsed ? (
                                <PanelLeftOpen size={19} />
                            ) : (
                                <PanelLeftClose size={19} />
                            )}
                        </button>
                    )}
                </div>

                <div className="px-3 pb-4">
                    <div
                        className={[
                            "flex items-center rounded-2xl bg-slate-50 p-3",
                            sidebarCollapsed && !mobile
                                ? "justify-center"
                                : "gap-3",
                        ].join(" ")}
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                            {getInitials(user.name)}
                        </div>

                        {(!sidebarCollapsed || mobile) && (
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                    {user.name}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                    {user.role}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-5 pb-2">
                    {(!sidebarCollapsed || mobile) && (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Workspace
                        </p>
                    )}
                </div>

                <nav
                    aria-label="Main navigation"
                    className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
                >
                    {filteredNavigation.map((item) =>
                        renderNavigationItem(item, mobile)
                    )}

                    {filteredNavigation.length === 0 && (
                        <p className="px-3 py-4 text-xs text-slate-500">
                            No matching navigation items.
                        </p>
                    )}
                </nav>

                <div className="border-t border-slate-100 p-3">
                    <div
                        className={[
                            "mb-3 flex items-center gap-2 rounded-xl px-3 py-2",
                            sidebarCollapsed && !mobile
                                ? "justify-center"
                                : "",
                        ].join(" ")}
                    >
                        <ShieldCheck
                            size={17}
                            className="shrink-0 text-emerald-600"
                        />

                        {(!sidebarCollapsed || mobile) && (
                            <div>
                                <p className="text-xs font-medium text-slate-700">
                                    Authorized access
                                </p>
                                <p className="text-[10px] text-slate-500">
                                    Signed-in account
                                </p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className={[
                            "flex w-full items-center rounded-full text-sm font-medium text-red-600 transition hover:bg-red-50",
                            sidebarCollapsed && !mobile
                                ? "justify-center px-0 py-3"
                                : "gap-3 px-4 py-3",
                        ].join(" ")}
                        title={
                            sidebarCollapsed && !mobile
                                ? "Logout"
                                : undefined
                        }
                    >
                        <LogOut size={19} className="shrink-0" />

                        {(!sidebarCollapsed || mobile) && (
                            <span>Logout</span>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------
    // MAIN UI
    // ---------------------------------------------------------

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-800">
            {/* DESKTOP SIDEBAR */}

            <aside
                className={[
                    "hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block",
                    sidebarCollapsed ? "w-[84px]" : "w-[264px]",
                ].join(" ")}
            >
                {renderSidebar(false)}
            </aside>

            {/* MOBILE SIDEBAR */}

            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation overlay"
                        className="absolute inset-0 h-full w-full bg-slate-950/40"
                        onClick={() => setMobileOpen(false)}
                    />

                    <aside className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] shadow-2xl">
                        {renderSidebar(true)}
                    </aside>
                </div>
            )}

            {/* MAIN CONTENT */}

            <div className="flex min-w-0 flex-1 flex-col">
                {/* TOP BAR */}

                <header className="sticky top-0 z-30 flex min-h-[76px] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open navigation"
                        className="rounded-full p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                    >
                        <Menu size={21} />
                    </button>

                    <div className="hidden min-w-0 sm:block">
                        <p className="truncate text-xs text-slate-500">
                            University of Abra · Main Campus
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-slate-900">
                            {pageTitle}
                        </h2>
                    </div>

                    <div className="relative ml-auto w-full max-w-md">
                        <Search
                            size={18}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Find a page..."
                            aria-label="Search navigation pages"
                            className="w-full rounded-full border border-transparent bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-500 focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-50"
                        />
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() =>
                                setAccountMenuOpen((previous) => !previous)
                            }
                            aria-expanded={accountMenuOpen}
                            aria-label="Open account menu"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 ring-2 ring-white transition hover:ring-blue-100"
                        >
                            {getInitials(user.name)}
                        </button>

                        {accountMenuOpen && (
                            <>
                                <button
                                    type="button"
                                    aria-label="Close account menu"
                                    className="fixed inset-0 z-40 cursor-default"
                                    onClick={() => setAccountMenuOpen(false)}
                                />

                                <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                                    <div className="border-b border-slate-100 px-3 pb-3">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {user.name}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-slate-500">
                                            {user.email}
                                        </p>
                                        <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                            {user.role}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                        <LogOut size={17} />
                                        Sign out
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* MOBILE PAGE TITLE */}

                <div className="border-b border-slate-200 bg-white px-5 py-3 sm:hidden">
                    <p className="text-xs text-slate-500">
                        University of Abra · Main Campus
                    </p>
                    <h2 className="mt-1 font-semibold text-slate-900">
                        {pageTitle}
                    </h2>
                </div>

                {/* PAGE CONTENT */}

                <main className="w-full flex-1 p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-[1600px]">
                        <Outlet />
                    </div>
                </main>

                <footer className="border-t border-slate-200 bg-white px-5 py-4 text-center text-xs text-slate-500">
                    UniTeq · University of Abra Main Campus
                </footer>
            </div>
        </div>
    );
}
