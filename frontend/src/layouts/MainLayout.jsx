import { useEffect, useMemo, useRef, useState } from "react";
import {
    Outlet,
    NavLink,
    useNavigate,
    useLocation,
} from "react-router-dom";
import api from "../api/api";
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
    Search,
    Bell,
    Plus,
    ChevronDown,
    Inbox,
    ArrowUpRight,
    LoaderCircle,
    Scale,
    Landmark,
    Command,
    PanelLeftClose,
} from "lucide-react";

const getToken = () =>
    localStorage.getItem("uniteq_token") ||
    sessionStorage.getItem("uniteq_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

const textOf = (value) => String(value ?? "").trim();

const getList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.receipts)) return data.receipts;
    if (Array.isArray(data?.vouchers)) return data.vouchers;
    return [];
};

function SectionLabel({ children }) {
    return (
        <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {children}
        </p>
    );
}

function SidebarLink({ item, closeMobile }) {
    const Icon = item.icon;

    return (
        <NavLink
            to={item.path}
            onClick={closeMobile}
            className={({ isActive }) =>
                [
                    "group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5",
                    "text-[13px] font-medium transition-all duration-150",
                    isActive
                        ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")
            }
        >
            {({ isActive }) => (
                <>
                    <Icon
                        size={18}
                        strokeWidth={isActive ? 2.3 : 1.8}
                        className="shrink-0"
                    />
                    <span className="min-w-0 flex-1 truncate">
                        {item.name}
                    </span>
                    {item.badge && (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            {item.badge}
                        </span>
                    )}
                </>
            )}
        </NavLink>
    );
}

function InitialAvatar({ name, size = "h-9 w-9" }) {
    const initial = textOf(name).charAt(0).toUpperCase() || "U";

    return (
        <div
            className={`${size} flex shrink-0 items-center justify-center rounded-full bg-blue-700 font-bold text-white`}
        >
            {initial}
        </div>
    );
}

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const searchBoxRef = useRef(null);
    const searchInputRef = useRef(null);

    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [searchRecords, setSearchRecords] = useState([]);

    const [notificationOpen, setNotificationOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    // Verify the current user's session.
    useEffect(() => {
        let mounted = true;

        async function verifyUser() {
            const token = getToken();

            const savedUser =
                localStorage.getItem("uniteq_user") ||
                sessionStorage.getItem("uniteq_user");

            if (!token) {
                if (mounted) {
                    setCheckingAuth(false);
                    navigate("/", { replace: true });
                }
                return;
            }

            try {
                const response = await api.get("/me");
                const authenticatedUser = response.data?.user;

                if (!authenticatedUser) {
                    throw new Error("No authenticated user was returned.");
                }

                if (
                    authenticatedUser.status &&
                    authenticatedUser.status.toLowerCase() !== "active"
                ) {
                    throw new Error("This account is not active.");
                }

                const storage = localStorage.getItem("uniteq_token")
                    ? localStorage
                    : sessionStorage.getItem("uniteq_token")
                      ? sessionStorage
                      : localStorage;

                storage.setItem(
                    "uniteq_user",
                    JSON.stringify(authenticatedUser)
                );

                if (mounted) {
                    setUser(authenticatedUser);
                    setCheckingAuth(false);
                }
            } catch (error) {
                console.error("Authentication check failed:", error);

                if (
                    error.response?.status === 401 ||
                    error.response?.status === 403
                ) {
                    localStorage.removeItem("uniteq_token");
                    localStorage.removeItem("uniteq_user");
                    sessionStorage.removeItem("uniteq_token");
                    sessionStorage.removeItem("uniteq_user");
                    localStorage.removeItem("token");
                    sessionStorage.removeItem("token");

                    if (mounted) {
                        setUser(null);
                        setCheckingAuth(false);
                        navigate("/", { replace: true });
                    }
                    return;
                }

                if (savedUser) {
                    try {
                        const parsedUser = JSON.parse(savedUser);
                        if (mounted) setUser(parsedUser);
                    } catch {
                        console.error("Could not read saved user.");
                    }
                }

                if (mounted) setCheckingAuth(false);
            }
        }

        verifyUser();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    // Load records for the global search box.
    useEffect(() => {
        if (checkingAuth || !user) return;

        let cancelled = false;

        async function loadSearchRecords() {
            setSearchLoading(true);
            setSearchError("");

            try {
                const results = await Promise.allSettled([
                    api.get("/receipts"),
                    api.get("/vouchers"),
                ]);

                if (cancelled) return;

                const records = [];
                const receiptResult = results[0];
                const voucherResult = results[1];

                if (receiptResult.status === "fulfilled") {
                    getList(receiptResult.value.data).forEach((item) => {
                        records.push({
                            id: item.id,
                            title:
                                item.receipt_number ||
                                item.or_number ||
                                `Receipt #${item.id}`,
                            subtitle: [
                                item.payer_name,
                                item.purpose,
                                item.description,
                            ]
                                .map(textOf)
                                .filter(Boolean)
                                .join(" · "),
                            type: "Receipt / Collection",
                            path: "/receipts",
                            searchable: [
                                item.id,
                                item.receipt_number,
                                item.or_number,
                                item.payer_name,
                                item.purpose,
                                item.description,
                                item.payment_method,
                                item.address_department,
                                item.date,
                                item.status,
                            ]
                                .map(textOf)
                                .join(" ")
                                .toLowerCase(),
                        });
                    });
                }

                if (voucherResult.status === "fulfilled") {
                    getList(voucherResult.value.data).forEach((item) => {
                        records.push({
                            id: item.id,
                            title:
                                item.voucher_number ||
                                item.dv_number ||
                                item.voucher_no ||
                                `Voucher #${item.id}`,
                            subtitle: [
                                item.payee_name,
                                item.payee,
                                item.purpose,
                                item.description,
                            ]
                                .map(textOf)
                                .filter(Boolean)
                                .join(" · "),
                            type: "Disbursement Voucher",
                            path: "/vouchers",
                            searchable: [
                                item.id,
                                item.voucher_number,
                                item.dv_number,
                                item.voucher_no,
                                item.payee_name,
                                item.payee,
                                item.purpose,
                                item.description,
                                item.date,
                                item.status,
                            ]
                                .map(textOf)
                                .join(" ")
                                .toLowerCase(),
                        });
                    });
                }

                if (
                    receiptResult.status === "rejected" &&
                    voucherResult.status === "rejected"
                ) {
                    throw new Error(
                        "Could not load receipts or vouchers."
                    );
                }

                setSearchRecords(records);

                if (
                    receiptResult.status === "rejected" ||
                    voucherResult.status === "rejected"
                ) {
                    setSearchError(
                        "Some records could not be loaded. Search may be incomplete."
                    );
                }
            } catch (error) {
                console.error("Search loading error:", error);

                if (!cancelled) {
                    setSearchError(
                        error.message ||
                            "Unable to load records for search."
                    );
                }
            } finally {
                if (!cancelled) setSearchLoading(false);
            }
        }

        loadSearchRecords();

        return () => {
            cancelled = true;
        };
    }, [checkingAuth, user]);

    // Close floating menus when the route changes.
    useEffect(() => {
        setSearchOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
        setMobileOpen(false);
    }, [location.pathname, location.search]);

    // Handle clicks outside menus and keyboard shortcuts.
    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                searchBoxRef.current &&
                !searchBoxRef.current.contains(event.target)
            ) {
                setSearchOpen(false);
            }

            if (!event.target.closest("[data-profile-menu]")) {
                setProfileOpen(false);
            }

            if (!event.target.closest("[data-notification-menu]")) {
                setNotificationOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                setSearchOpen(false);
                setNotificationOpen(false);
                setProfileOpen(false);
                setMobileOpen(false);
            }

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();
                searchInputRef.current?.focus();
                setSearchOpen(true);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    async function handleLogout() {
        const token = getToken();

        try {
            if (token) {
                await api.post("/logout", {});
            }
        } catch (error) {
            console.error("Logout API error:", error);
        }

        localStorage.removeItem("uniteq_token");
        localStorage.removeItem("uniteq_user");
        sessionStorage.removeItem("uniteq_token");
        sessionStorage.removeItem("uniteq_user");
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");

        setUser(null);
        navigate("/", { replace: true });
    }

    const filteredSearchRecords = useMemo(() => {
        const query = searchText.trim().toLowerCase();

        if (!query) return [];

        return searchRecords
            .filter((record) => record.searchable.includes(query))
            .slice(0, 10);
    }, [searchText, searchRecords]);

    function handleSearchSubmit(event) {
        event.preventDefault();

        if (!searchText.trim()) {
            setSearchOpen(true);
            return;
        }

        if (filteredSearchRecords.length === 1) {
            openSearchResult(filteredSearchRecords[0]);
            return;
        }

        setSearchOpen(true);
    }

    function openSearchResult(record) {
        setSearchOpen(false);
        navigate(
            `${record.path}?search=${encodeURIComponent(searchText.trim())}`
        );
    }

    const isAdmin =
        String(user?.role || "").toLowerCase() === "system administrator";

    const primaryNavigation = [
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
            name: "Official Receipts",
            path: "/receipts",
            icon: Receipt,
        },
        {
            name: "Pending Balances",
            path: "/pending-balances",
            icon: FileCheck,
        },
    ];

    const financeNavigation = [
        {
            name: "Disbursement Vouchers",
            path: "/vouchers",
            icon: FileText,
        },
        {
            name: "Reconciliation",
            path: "/reconciliation",
            icon: Scale,
        },
        {
            name: "Reports",
            path: "/reports",
            icon: Landmark,
        },
    ];

    const administrationNavigation = [
        {
            name: "Audit Trail",
            path: "/audit-trail",
            icon: ShieldCheck,
        },
        ...(isAdmin
            ? [
                  {
                      name: "User Management",
                      path: "/users",
                      icon: Users,
                  },
              ]
            : []),
    ];

    if (checkingAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />
                    <p className="mt-4 text-sm text-slate-500">
                        Verifying your account...
                    </p>
                </div>
            </div>
        );
    }

    const sidebarContent = (
        <>
            <div className="px-5 pb-5 pt-6">
                <div className="flex min-w-0 items-center gap-3">
                    <img
                        src="/university-of-abra-logo.png"
                        alt="University of Abra"
                        onError={(event) => {
                            event.currentTarget.style.display = "none";
                        }}
                        className="h-10 w-10 shrink-0 object-contain"
                    />
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                            UniTeq
                        </h1>
                        <p className="mt-1 max-w-full whitespace-normal break-words text-[10px] font-medium uppercase leading-4 tracking-[0.1em] text-slate-500">
                            Financial Management
                        </p>
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                        Workspace
                    </span>
                </div>
            </div>

            <div className="px-4 pb-4">
                <NavLink
                    to="/collections"
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                    <Plus size={18} />
                    New Transaction
                </NavLink>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-4">
                <SectionLabel>Workspace</SectionLabel>
                <div className="space-y-1">
                    {primaryNavigation.map((item) => (
                        <SidebarLink
                            key={item.path}
                            item={item}
                            closeMobile={() => setMobileOpen(false)}
                        />
                    ))}
                </div>

                <SectionLabel>Financial Operations</SectionLabel>
                <div className="space-y-1">
                    {financeNavigation.map((item) => (
                        <SidebarLink
                            key={item.path}
                            item={item}
                            closeMobile={() => setMobileOpen(false)}
                        />
                    ))}
                </div>

                <SectionLabel>Governance & Administration</SectionLabel>
                <div className="space-y-1">
                    {administrationNavigation.map((item) => (
                        <SidebarLink
                            key={item.path}
                            item={item}
                            closeMobile={() => setMobileOpen(false)}
                        />
                    ))}
                </div>

                <div className="mx-2 mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                    <div className="flex items-center gap-2 text-blue-800">
                        <ShieldCheck size={17} />
                        <span className="text-xs font-semibold">
                            Secure workspace
                        </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
                        Use your authorized account and follow your office's
                        financial procedures.
                    </p>
                </div>
            </nav>

            <div className="border-t border-slate-200 bg-white/70 p-3">
                <div className="flex items-center gap-3 rounded-xl p-2">
                    <InitialAvatar name={user?.name} size="h-10 w-10" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                            {user?.name || "User"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {user?.role || "Staff"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        title="Sign out"
                        aria-label="Sign out"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                        <LogOut size={17} />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={() => setMobileOpen(false)}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                    />

                    <aside className="relative flex h-full w-72 max-w-[88vw] flex-col border-r border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-end border-b border-slate-100 px-3 py-2">
                            <button
                                type="button"
                                aria-label="Close menu"
                                onClick={() => setMobileOpen(false)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {sidebarContent}
                    </aside>
                </div>
            )}

            <div className="flex min-h-screen">
                <aside
                    className={[
                        "hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:flex",
                        sidebarCollapsed
                            ? "lg:w-[76px]"
                            : "lg:w-[260px] xl:w-[280px]",
                    ].join(" ")}
                >
                    {sidebarCollapsed ? (
                        <>
                            <div className="flex justify-center border-b border-slate-100 px-3 py-5">
                                <button
                                    type="button"
                                    title="Expand sidebar"
                                    onClick={() => setSidebarCollapsed(false)}
                                    className="rounded-xl bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                                >
                                    <Command size={21} />
                                </button>
                            </div>

                            <nav className="flex-1 space-y-2 px-3 py-5">
                                {[
                                    ...primaryNavigation,
                                    ...financeNavigation,
                                    ...administrationNavigation,
                                ].map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            title={item.name}
                                            className={({ isActive }) =>
                                                [
                                                    "flex justify-center rounded-xl p-3 transition",
                                                    isActive
                                                        ? "bg-blue-50 text-blue-700"
                                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                                                ].join(" ")
                                            }
                                        >
                                            <Icon size={20} />
                                        </NavLink>
                                    );
                                })}
                            </nav>
                        </>
                    ) : (
                        sidebarContent
                    )}
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur-md sm:px-5 lg:px-7">
                        <div className="flex min-h-10 items-center gap-3">
                            <button
                                type="button"
                                aria-label="Open navigation"
                                onClick={() => setMobileOpen(true)}
                                className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 lg:hidden"
                            >
                                <Menu size={21} />
                            </button>

                            <button
                                type="button"
                                aria-label={
                                    sidebarCollapsed
                                        ? "Expand sidebar"
                                        : "Collapse sidebar"
                                }
                                onClick={() =>
                                    setSidebarCollapsed(!sidebarCollapsed)
                                }
                                className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 lg:inline-flex"
                            >
                                <PanelLeftClose
                                    size={19}
                                    className={
                                        sidebarCollapsed ? "rotate-180" : ""
                                    }
                                />
                            </button>

                            <div className="hidden min-w-0 md:block">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                    {location.pathname === "/dashboard"
                                        ? "Financial Overview"
                                        : location.pathname
                                              .split("/")
                                              .filter(Boolean)
                                              .pop()
                                              ?.replace(/-/g, " ")
                                              .replace(/\b\w/g, (letter) =>
                                                  letter.toUpperCase()
                                              ) || "Workspace"}
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                    University of Abra · Main Campus
                                </p>
                            </div>

                            <div
                                ref={searchBoxRef}
                                className="relative ml-auto w-full max-w-[560px]"
                            >
                                <form onSubmit={handleSearchSubmit}>
                                    <div className="flex h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
                                        {searchLoading ? (
                                            <LoaderCircle
                                                size={17}
                                                className="shrink-0 animate-spin text-blue-600"
                                            />
                                        ) : (
                                            <Search
                                                size={17}
                                                className="shrink-0 text-slate-400"
                                            />
                                        )}

                                        <input
                                            ref={searchInputRef}
                                            type="search"
                                            value={searchText}
                                            onFocus={() => setSearchOpen(true)}
                                            onChange={(event) => {
                                                setSearchText(event.target.value);
                                                setSearchOpen(true);
                                            }}
                                            placeholder="Search receipts, vouchers, payer..."
                                            aria-label="Search financial records"
                                            aria-expanded={searchOpen}
                                            className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
                                        />

                                        {searchText && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchText("");
                                                    setSearchOpen(true);
                                                    searchInputRef.current?.focus();
                                                }}
                                                aria-label="Clear search"
                                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <X size={15} />
                                            </button>
                                        )}

                                        <span className="hidden shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[9px] text-slate-400 sm:inline-flex">
                                            <Command size={10} /> K
                                        </span>
                                    </div>
                                </form>

                                {searchOpen && (
                                    <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Search results
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setSearchOpen(false)}
                                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
                                                aria-label="Close search results"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>

                                        {!searchText.trim() ? (
                                            <div className="px-4 py-7 text-center">
                                                <Search
                                                    size={24}
                                                    className="mx-auto mb-2 text-slate-300"
                                                />
                                                <p className="text-sm font-medium text-slate-700">
                                                    Find a financial record
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    Search by receipt number,
                                                    payer, purpose, or voucher.
                                                </p>
                                            </div>
                                        ) : filteredSearchRecords.length > 0 ? (
                                            <div className="max-h-80 overflow-y-auto py-1">
                                                {filteredSearchRecords.map(
                                                    (record) => (
                                                        <button
                                                            key={`${record.type}-${record.id}`}
                                                            type="button"
                                                            onClick={() =>
                                                                openSearchResult(record)
                                                            }
                                                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                                                        >
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                                                {record.type ===
                                                                "Disbursement Voucher" ? (
                                                                    <FileText size={17} />
                                                                ) : (
                                                                    <Receipt size={17} />
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                                    {record.title}
                                                                </p>
                                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                    {record.subtitle ||
                                                                        record.type}
                                                                </p>
                                                            </div>

                                                            <ArrowUpRight
                                                                size={16}
                                                                className="shrink-0 text-slate-400"
                                                            />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        ) : searchLoading ? (
                                            <div className="px-4 py-7 text-center text-sm text-slate-500">
                                                Searching records...
                                            </div>
                                        ) : (
                                            <div className="px-4 py-7 text-center">
                                                <Inbox
                                                    size={25}
                                                    className="mx-auto mb-2 text-slate-300"
                                                />
                                                <p className="text-sm font-medium text-slate-700">
                                                    No matching records
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    Try another name, number,
                                                    or purpose.
                                                </p>
                                            </div>
                                        )}

                                        {searchError && (
                                            <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                                                {searchError}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="relative" data-notification-menu>
                                <button
                                    type="button"
                                    aria-label="Notifications"
                                    aria-expanded={notificationOpen}
                                    onClick={() => {
                                        setNotificationOpen(!notificationOpen);
                                        setProfileOpen(false);
                                        setSearchOpen(false);
                                    }}
                                    className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                >
                                    <Bell size={19} />
                                </button>

                                {notificationOpen && (
                                    <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                        <div className="border-b border-slate-100 px-4 py-3">
                                            <p className="text-sm font-semibold text-slate-800">
                                                Notifications
                                            </p>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                Transaction updates
                                            </p>
                                        </div>
                                        <div className="px-4 py-7 text-center">
                                            <Inbox
                                                size={25}
                                                className="mx-auto mb-2 text-slate-300"
                                            />
                                            <p className="text-sm font-medium text-slate-700">
                                                No new notifications
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-400">
                                                Notifications will appear here
                                                when connected to a notification
                                                backend.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative" data-profile-menu>
                                <button
                                    type="button"
                                    aria-label="Account menu"
                                    aria-expanded={profileOpen}
                                    onClick={() => {
                                        setProfileOpen(!profileOpen);
                                        setNotificationOpen(false);
                                        setSearchOpen(false);
                                    }}
                                    className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100"
                                >
                                    <InitialAvatar name={user?.name} />
                                    <ChevronDown
                                        size={14}
                                        className="hidden text-slate-400 sm:block"
                                    />
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                                            <InitialAvatar
                                                name={user?.name}
                                                size="h-11 w-11"
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {user?.name || "User"}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {user?.email || ""}
                                                </p>
                                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                                    {user?.role || "Staff"}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProfileOpen(false);
                                                handleLogout();
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                                        >
                                            <LogOut size={17} />
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 px-3 pb-6 pt-5 sm:px-5 lg:px-7 lg:pt-6">
                        <Outlet />
                    </main>

                    <footer className="flex flex-col gap-1 border-t border-slate-200/80 bg-white/70 px-4 py-4 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                        <p>
                            © {new Date().getFullYear()} UniTeq · Financial
                            Transactions Management
                        </p>
                        <p className="flex items-center gap-1">
                            <ShieldCheck size={12} />
                            Authorized access only
                        </p>
                    </footer>
                </div>
            </div>
        </div>
    );
}
