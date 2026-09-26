import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Users as UsersIcon,
    UserPlus,
    ShieldCheck,
    Search,
    RefreshCw,
    Edit,
    Trash2,
    X,
    Save,
    UserCog,
    Activity,
    CheckCircle,
    XCircle,
    KeyRound,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api";
const LOGO_URL = "/university-of-abra-logo.png";

const EMPTY_FORM = {
    name: "",
    email: "",
    role: "Cashier",
    status: "Active",
    password: "",
    password_confirmation: "",
};

function getHeaders() {
    const token = localStorage.getItem("uniteq_token");

    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token
            ? {
                  Authorization: `Bearer ${token}`,
              }
            : {}),
    };
}

function getStoredUser() {
    try {
        return JSON.parse(
            localStorage.getItem("uniteq_user") ||
                sessionStorage.getItem("uniteq_user") ||
                "null"
        );
    } catch {
        return null;
    }
}

function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(value) {
    if (!value) {
        return "Not recorded";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not recorded";
    }

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getRoleClass(role) {
    if (role === "System Administrator") {
        return "bg-purple-100 text-purple-700";
    }

    return "bg-blue-100 text-blue-700";
}

function getStatusClass(status) {
    if (status === "Active") {
        return "bg-green-100 text-green-700";
    }

    return "bg-red-100 text-red-700";
}

export default function Users() {
    const [users, setUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    const [dateFrom, setDateFrom] = useState(getToday());
    const [dateTo, setDateTo] = useState(getToday());

    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);

    const [editingUser, setEditingUser] = useState(null);

    const [selectedRoleUserId, setSelectedRoleUserId] = useState("");
    const [selectedRole, setSelectedRole] = useState("Cashier");

    const [form, setForm] = useState(EMPTY_FORM);

    const currentUser = useMemo(
        () => getStoredUser(),
        []
    );

    const isAdmin =
        String(currentUser?.role || "").trim() ===
        "System Administrator";

    /* =========================================================
       LOAD USERS
    ========================================================= */

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            setLoading(true);

            const response = await axios.get(
                `${API_URL}/users`,
                {
                    headers: getHeaders(),
                }
            );

            console.log("Users response:", response.data);

            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];

            setUsers(data);
        } catch (error) {
            console.error("User loading error:", error);
            console.error(
                "Server response:",
                error.response?.data
            );

            setUsers([]);

            if (error.response?.status === 401) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (error.response?.status === 403) {
                alert(
                    "You are not authorized to view user accounts."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                        "Unable to load user accounts."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    /* =========================================================
       SUMMARY
    ========================================================= */

    const totalUsers = users.length;

    const activeUsers = users.filter(
        (user) =>
            String(user.status || "Active") ===
            "Active"
    ).length;

    const inactiveUsers = users.filter(
        (user) =>
            String(user.status || "Active") !==
            "Active"
    ).length;

    const roleCounts = useMemo(() => {
        const counts = {};

        users.forEach((user) => {
            const role =
                user.role || "Unassigned";

            counts[role] =
                (counts[role] || 0) + 1;
        });

        return counts;
    }, [users]);

    const systemAdminCount =
        roleCounts["System Administrator"] || 0;

    const cashierCount =
        roleCounts["Cashier"] || 0;

    /* =========================================================
       FILTER
    ========================================================= */

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...users]
            .filter((user) => {
                if (
                    roleFilter !== "All" &&
                    String(user.role || "") !== roleFilter
                ) {
                    return false;
                }

                if (
                    statusFilter !== "All" &&
                    String(
                        user.status || "Active"
                    ) !== statusFilter
                ) {
                    return false;
                }

                const searchableText = `
                    ${user.id || ""}
                    ${user.name || ""}
                    ${user.email || ""}
                    ${user.role || ""}
                    ${user.status || ""}
                `.toLowerCase();

                if (
                    query &&
                    !searchableText.includes(query)
                ) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                return (
                    Number(a.id || 0) -
                    Number(b.id || 0)
                );
            });
    }, [
        users,
        search,
        roleFilter,
        statusFilter,
    ]);

    /* =========================================================
       FORM
    ========================================================= */

    function openCreateUser() {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setShowUserModal(true);
    }

    function openEditUser(user) {
        setEditingUser(user);

        setForm({
            name: user.name || "",
            email: user.email || "",
            role: user.role || "Cashier",
            status: user.status || "Active",
            password: "",
            password_confirmation: "",
        });

        setShowUserModal(true);
    }

    function closeUserModal() {
        if (saving) {
            return;
        }

        setShowUserModal(false);
        setEditingUser(null);
        setForm(EMPTY_FORM);
    }

    function handleChange(event) {
        const {
            name,
            value,
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    /* =========================================================
       CREATE / UPDATE USER
    ========================================================= */

    async function handleSubmit(event) {
        event.preventDefault();

        if (!isAdmin) {
            alert(
                "Only the System Administrator can manage user accounts."
            );
            return;
        }

        if (!form.name.trim()) {
            alert("Please enter the user's full name.");
            return;
        }

        if (!form.email.trim()) {
            alert("Please enter the user's email address.");
            return;
        }

        if (!form.role) {
            alert("Please select a system role.");
            return;
        }

        if (!form.status) {
            alert("Please select an account status.");
            return;
        }

        if (!editingUser && !form.password) {
            alert("Please enter a password for the new user.");
            return;
        }

        if (
            form.password &&
            form.password.length < 8
        ) {
            alert(
                "Password must contain at least 8 characters."
            );
            return;
        }

        if (
            form.password !==
            form.password_confirmation
        ) {
            alert("The passwords do not match.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                role: form.role,
                status: form.status,
            };

            if (form.password) {
                payload.password = form.password;
                payload.password_confirmation =
                    form.password_confirmation;
            }

            let response;

            if (editingUser) {
                response = await axios.put(
                    `${API_URL}/users/${editingUser.id}`,
                    payload,
                    {
                        headers: getHeaders(),
                    }
                );
            } else {
                response = await axios.post(
                    `${API_URL}/users`,
                    payload,
                    {
                        headers: getHeaders(),
                    }
                );
            }

            console.log(
                "User save response:",
                response.data
            );

            alert(
                editingUser
                    ? "User account updated successfully."
                    : "User account created successfully."
            );

            closeUserModal();

            await loadUsers();
        } catch (error) {
            console.error(
                "User save error:",
                error
            );

            const status =
                error.response?.status;

            const data =
                error.response?.data;

            if (status === 422) {
                const validationErrors =
                    data?.errors;

                if (validationErrors) {
                    alert(
                        Object.values(
                            validationErrors
                        )
                            .flat()
                            .join("\n")
                    );
                } else {
                    alert(
                        data?.message ||
                            "Please check the information entered."
                    );
                }
            } else if (status === 401) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (status === 403) {
                alert(
                    "Access denied. Only the System Administrator can manage user accounts."
                );
            } else {
                alert(
                    data?.message ||
                        "Unable to save the user account."
                );
            }
        } finally {
            setSaving(false);
        }
    }

    /* =========================================================
       DELETE USER
    ========================================================= */

    async function handleDeleteUser(user) {
        if (!isAdmin) {
            alert(
                "Only the System Administrator can delete user accounts."
            );
            return;
        }

        if (
            Number(currentUser?.id) ===
            Number(user.id)
        ) {
            alert(
                "You cannot delete the account you are currently using."
            );
            return;
        }

        const confirmed = window.confirm(
            `Delete the account for "${user.name}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        try {
            await axios.delete(
                `${API_URL}/users/${user.id}`,
                {
                    headers: getHeaders(),
                }
            );

            alert(
                "User account deleted successfully."
            );

            await loadUsers();
        } catch (error) {
            console.error(
                "Delete user error:",
                error
            );

            if (
                error.response?.status ===
                401
            ) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (
                error.response?.status ===
                403
            ) {
                alert(
                    "You are not authorized to delete user accounts."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                        "Unable to delete the user account."
                );
            }
        }
    }

    /* =========================================================
       TOGGLE STATUS
    ========================================================= */

    async function toggleStatus(user) {
        if (!isAdmin) {
            alert(
                "Only the System Administrator can change account status."
            );
            return;
        }

        if (
            Number(currentUser?.id) ===
            Number(user.id)
        ) {
            alert(
                "You cannot deactivate the account you are currently using."
            );
            return;
        }

        const nextStatus =
            String(user.status || "Active") ===
            "Active"
                ? "Inactive"
                : "Active";

        try {
            await axios.put(
                `${API_URL}/users/${user.id}`,
                {
                    name: user.name,
                    email: user.email,
                    role:
                        user.role ||
                        "Cashier",
                    status: nextStatus,
                },
                {
                    headers: getHeaders(),
                }
            );

            await loadUsers();
        } catch (error) {
            console.error(
                "Status update error:",
                error
            );

            alert(
                error.response?.data?.message ||
                    "Unable to update account status."
            );
        }
    }

    /* =========================================================
       ROLE ASSIGNMENT
    ========================================================= */

    function openRoleModal() {
        if (!isAdmin) {
            alert(
                "Only the System Administrator can assign system roles."
            );
            return;
        }

        const firstUser = users[0];

        setSelectedRoleUserId(
            firstUser?.id
                ? String(firstUser.id)
                : ""
        );

        setSelectedRole(
            firstUser?.role ||
                "Cashier"
        );

        setShowRoleModal(true);
    }

    function handleRoleUserChange(event) {
        const userId = event.target.value;

        setSelectedRoleUserId(userId);

        const selectedUser =
            users.find(
                (user) =>
                    String(user.id) ===
                    String(userId)
            );

        setSelectedRole(
            selectedUser?.role ||
                "Cashier"
        );
    }

    async function saveAssignedRole() {
        if (!selectedRoleUserId) {
            alert(
                "Please select a user."
            );
            return;
        }

        const selectedUser =
            users.find(
                (user) =>
                    String(user.id) ===
                    String(
                        selectedRoleUserId
                    )
            );

        if (!selectedUser) {
            alert("User not found.");
            return;
        }

        if (
            Number(currentUser?.id) ===
                Number(selectedUser.id) &&
            selectedRole !==
                "System Administrator"
        ) {
            alert(
                "You cannot remove your own System Administrator role while logged in."
            );
            return;
        }

        try {
            setSaving(true);

            await axios.put(
                `${API_URL}/users/${selectedUser.id}`,
                {
                    name:
                        selectedUser.name,
                    email:
                        selectedUser.email,
                    role: selectedRole,
                    status:
                        selectedUser.status ||
                        "Active",
                },
                {
                    headers:
                        getHeaders(),
                }
            );

            alert(
                "System role updated successfully."
            );

            setShowRoleModal(false);

            await loadUsers();
        } catch (error) {
            console.error(
                "Role update error:",
                error
            );

            alert(
                error.response?.data?.message ||
                    "Unable to assign the system role."
            );
        } finally {
            setSaving(false);
        }
    }

    /* =========================================================
       AUDIT TOOL
    ========================================================= */

    function openAuditModal() {
        setShowAuditModal(true);
    }

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="min-h-screen bg-[#f5f7fa]">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="bg-[#102d55] text-white">

                <div className="max-w-[1500px] mx-auto px-6 py-7">

                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                        <div className="flex items-center gap-5">

                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">

                                <img
                                    src={LOGO_URL}
                                    alt="University of Abra"
                                    className="w-12 h-12 object-contain"
                                />

                            </div>

                            <div>

                                <p className="text-sm text-blue-100">
                                    University of Abra | Main Campus
                                    <span className="mx-2">
                                        •
                                    </span>
                                    Cashier's Unit
                                </p>

                                <h1 className="text-3xl sm:text-4xl font-bold mt-1">
                                    User Management Page
                                </h1>

                                <p className="text-blue-100 mt-2">
                                    Manage authorized UniTeq user accounts,
                                    roles, and account status.
                                </p>

                            </div>

                        </div>

                        <div className="flex items-center gap-3">

                            <div className="hidden sm:block text-right">

                                <p className="text-xs text-blue-200">
                                    System Date
                                </p>

                                <p className="font-semibold">
                                    {new Date().toLocaleString(
                                        "en-PH",
                                        {
                                            year: "numeric",
                                            month: "short",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }
                                    )}
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={loadUsers}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-white/80 hover:bg-white hover:text-[#102d55] transition font-semibold disabled:opacity-50"
                            >

                                <RefreshCw
                                    size={18}
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                Refresh

                            </button>

                        </div>

                    </div>

                </div>

            </div>

            {/* =================================================
                MAIN
            ================================================= */}

            <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-7">

                {/* =================================================
                    PAGE TITLE
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        <div>

                            <h2 className="text-3xl font-bold text-gray-900">
                                User Management Page
                            </h2>

                            <p className="text-gray-500 mt-1">
                                View, create, update, and manage authorized system accounts.
                            </p>

                        </div>

                        <div className="flex items-center gap-2 text-sm">

                            <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-full font-semibold">

                                <span className="w-2 h-2 rounded-full bg-green-500" />

                                System Connected

                            </span>

                        </div>

                    </div>

                    {/* DATE FILTER */}

                    <div className="mt-6 flex flex-col lg:flex-row lg:items-end gap-4">

                        <div className="w-full lg:w-52">

                            <label className="block text-xs uppercase font-bold text-gray-500 mb-2">
                                From
                            </label>

                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(event) =>
                                    setDateFrom(
                                        event.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                            />

                        </div>

                        <div className="w-full lg:w-52">

                            <label className="block text-xs uppercase font-bold text-gray-500 mb-2">
                                To
                            </label>

                            <input
                                type="date"
                                value={dateTo}
                                onChange={(event) =>
                                    setDateTo(
                                        event.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                            />

                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (
                                    dateFrom &&
                                    dateTo &&
                                    dateFrom >
                                        dateTo
                                ) {
                                    alert(
                                        "The From date cannot be later than the To date."
                                    );
                                    return;
                                }

                                loadUsers();
                            }}
                            className="inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-5 py-3 rounded-xl font-semibold"
                        >

                            Apply

                        </button>

                    </div>

                </div>

                {/* =================================================
                    SUMMARY + ROLE DISTRIBUTION + FILTER
                ================================================= */}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                    {/* LEFT CARD */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <h3 className="text-xl font-bold text-gray-900">
                                User Summary
                            </h3>

                            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                                <UsersIcon
                                    size={23}
                                    className="text-[#102d55]"
                                />
                            </div>

                        </div>

                        <div className="mt-6 space-y-4">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Users
                                </p>

                                <p className="text-3xl font-bold text-[#102d55]">
                                    {loading
                                        ? "..."
                                        : totalUsers}
                                </p>

                            </div>

                            <div className="flex items-center justify-between border-t pt-4">

                                <span className="text-gray-600">
                                    Active
                                </span>

                                <span className="font-bold text-green-600">
                                    {activeUsers}
                                </span>

                            </div>

                            <div className="flex items-center justify-between">

                                <span className="text-gray-600">
                                    Inactive
                                </span>

                                <span className="font-bold text-red-600">
                                    {inactiveUsers}
                                </span>

                            </div>

                        </div>

                    </div>

                    {/* CENTER CARD */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <h3 className="text-xl font-bold text-gray-900">
                                Role Distribution
                            </h3>

                            <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                                <ShieldCheck
                                    size={23}
                                    className="text-purple-700"
                                />
                            </div>

                        </div>

                        <div className="mt-6 space-y-4">

                            <div className="flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <ShieldCheck
                                            size={17}
                                            className="text-purple-700"
                                        />
                                    </div>

                                    <span className="text-gray-700">
                                        System Administrators
                                    </span>

                                </div>

                                <span className="text-2xl font-bold text-purple-700">
                                    {systemAdminCount}
                                </span>

                            </div>

                            <div className="flex items-center justify-between">

                                <div className="flex items-center gap-3">

                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <UserCog
                                            size={17}
                                            className="text-blue-700"
                                        />
                                    </div>

                                    <span className="text-gray-700">
                                        Cashiers
                                    </span>

                                </div>

                                <span className="text-2xl font-bold text-blue-700">
                                    {cashierCount}
                                </span>

                            </div>

                            {/* OTHER ROLES, IF THEY EXIST */}

                            {Object.entries(
                                roleCounts
                            )
                                .filter(
                                    ([role]) =>
                                        role !==
                                            "System Administrator" &&
                                        role !==
                                            "Cashier"
                                )
                                .map(
                                    ([
                                        role,
                                        count,
                                    ]) => (
                                        <div
                                            key={
                                                role
                                            }
                                            className="flex items-center justify-between"
                                        >

                                            <span className="text-gray-700">
                                                {role}
                                            </span>

                                            <span className="text-xl font-bold text-gray-700">
                                                {count}
                                            </span>

                                        </div>
                                    )
                                )}

                        </div>

                    </div>

                    {/* RIGHT CARD */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center gap-3 mb-5">

                            <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center">
                                <Search
                                    size={22}
                                    className="text-[#0797a6]"
                                />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900">
                                User Search & Filter
                            </h3>

                        </div>

                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Search
                        </label>

                        <div className="relative">

                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder="Search by name, ID, or email"
                                className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                            />

                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 mt-4">

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Role
                                </label>

                                <select
                                    value={
                                        roleFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setRoleFilter(
                                            event.target
                                                .value
                                        )
                                    }
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                >

                                    <option value="All">
                                        All Roles
                                    </option>

                                    <option value="System Administrator">
                                        System Administrator
                                    </option>

                                    <option value="Cashier">
                                        Cashier
                                    </option>

                                    {Object.keys(
                                        roleCounts
                                    )
                                        .filter(
                                            (role) =>
                                                role !==
                                                    "System Administrator" &&
                                                role !==
                                                    "Cashier"
                                        )
                                        .map(
                                            (
                                                role
                                            ) => (
                                                <option
                                                    key={
                                                        role
                                                    }
                                                    value={
                                                        role
                                                    }
                                                >
                                                    {role}
                                                </option>
                                            )
                                        )}

                                </select>

                            </div>

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Status
                                </label>

                                <select
                                    value={
                                        statusFilter
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setStatusFilter(
                                            event.target
                                                .value
                                        )
                                    }
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                >

                                    <option value="All">
                                        All Status
                                    </option>

                                    <option value="Active">
                                        Active
                                    </option>

                                    <option value="Inactive">
                                        Inactive
                                    </option>

                                </select>

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    MANAGEMENT TOOLS
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        <div>

                            <h3 className="text-xl font-bold text-gray-900">
                                Management Tools
                            </h3>

                            <p className="text-sm text-gray-500 mt-1">
                                Administrative actions for UniTeq user accounts.
                            </p>

                        </div>

                        <div className="flex flex-wrap gap-3">

                            <button
                                type="button"
                                onClick={
                                    openCreateUser
                                }
                                disabled={
                                    !isAdmin
                                }
                                className="inline-flex items-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >

                                <UserPlus
                                    size={18}
                                />

                                Create New User

                            </button>

                            <button
                                type="button"
                                onClick={
                                    openRoleModal
                                }
                                disabled={
                                    !isAdmin ||
                                    users.length ===
                                        0
                                }
                                className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-5 py-3 rounded-xl font-semibold text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >

                                <ShieldCheck
                                    size={18}
                                />

                                Assign System Roles

                            </button>

                            <button
                                type="button"
                                onClick={
                                    openAuditModal
                                }
                                className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 px-5 py-3 rounded-xl font-semibold text-gray-700"
                            >

                                <Activity
                                    size={18}
                                />

                                Audit System Access Logs

                            </button>

                        </div>

                    </div>

                    {!isAdmin && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                            User management actions are available only to the System Administrator.
                        </div>
                    )}

                </div>

                {/* =================================================
                    USER TABLE
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                        <div>

                            <h3 className="text-2xl font-bold text-gray-900">
                                User Registry
                            </h3>

                            <p className="text-sm text-gray-500 mt-1">
                                {filteredUsers.length} displayed user account
                                {filteredUsers.length !==
                                1
                                    ? "s"
                                    : ""}
                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setRoleFilter("All");
                                setStatusFilter("All");
                            }}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold hover:bg-gray-50"
                        >
                            Clear Filters
                        </button>

                    </div>

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[1150px]">

                            <thead className="bg-[#eef4f8]">

                                <tr>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        User ID
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Full Name
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Email Address
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        System Role
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Account Status
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Last Login
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-100">

                                {loading ? (
                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <RefreshCw
                                                size={28}
                                                className="animate-spin mx-auto mb-3"
                                            />

                                            Loading user accounts...

                                        </td>

                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <UsersIcon
                                                size={36}
                                                className="mx-auto mb-3 text-gray-300"
                                            />

                                            <p className="font-semibold">
                                                No user accounts found.
                                            </p>

                                            <p className="text-sm mt-1">
                                                Try another search or create a new user.
                                            </p>

                                        </td>

                                    </tr>
                                ) : (
                                    filteredUsers.map(
                                        (user) => {
                                            const status =
                                                user.status ||
                                                "Active";

                                            return (
                                                <tr
                                                    key={
                                                        user.id
                                                    }
                                                    className="hover:bg-blue-50/40 transition"
                                                >

                                                    {/* USER ID */}

                                                    <td className="px-5 py-5">

                                                        <span className="font-bold text-[#102d55]">
                                                            UA-
                                                            {String(
                                                                user.id ||
                                                                    0
                                                            ).padStart(
                                                                4,
                                                                "0"
                                                            )}
                                                        </span>

                                                    </td>

                                                    {/* NAME */}

                                                    <td className="px-5 py-5">

                                                        <div className="flex items-center gap-3">

                                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">

                                                                <UsersIcon
                                                                    size={
                                                                        18
                                                                    }
                                                                    className="text-[#102d55]"
                                                                />

                                                            </div>

                                                            <div>

                                                                <p className="font-bold text-gray-900">
                                                                    {
                                                                        user.name
                                                                    }
                                                                </p>

                                                                <p className="text-xs text-gray-500">
                                                                    Account #
                                                                    {
                                                                        user.id
                                                                    }
                                                                </p>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* EMAIL */}

                                                    <td className="px-5 py-5 text-sm text-gray-700">

                                                        {
                                                            user.email
                                                        }

                                                    </td>

                                                    {/* ROLE */}

                                                    <td className="px-5 py-5">

                                                        <span
                                                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${getRoleClass(
                                                                user.role
                                                            )}`}
                                                        >

                                                            <ShieldCheck
                                                                size={
                                                                    14
                                                                }
                                                            />

                                                            {
                                                                user.role
                                                            }

                                                        </span>

                                                    </td>

                                                    {/* STATUS */}

                                                    <td className="px-5 py-5 text-center">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleStatus(
                                                                    user
                                                                )
                                                            }
                                                            disabled={
                                                                !isAdmin ||
                                                                Number(
                                                                    currentUser?.id
                                                                ) ===
                                                                    Number(
                                                                        user.id
                                                                    )
                                                            }
                                                            title={
                                                                isAdmin &&
                                                                Number(
                                                                    currentUser?.id
                                                                ) !==
                                                                    Number(
                                                                        user.id
                                                                    )
                                                                    ? "Click to change status"
                                                                    : "You cannot change this account's status"
                                                            }
                                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold ${getStatusClass(
                                                                status
                                                            )} disabled:cursor-not-allowed`}
                                                        >

                                                            {status ===
                                                            "Active" ? (
                                                                <CheckCircle
                                                                    size={
                                                                        14
                                                                    }
                                                                />
                                                            ) : (
                                                                <XCircle
                                                                    size={
                                                                        14
                                                                    }
                                                                />
                                                            )}

                                                            {
                                                                status
                                                            }

                                                        </button>

                                                    </td>

                                                    {/* LAST LOGIN */}

                                                    <td className="px-5 py-5 text-sm text-gray-600">

                                                        {/*
                                                         * The current users table has no
                                                         * last_login column, so we do not
                                                         * pretend that created_at or
                                                         * updated_at is a login time.
                                                         */}
                                                        <span className="text-gray-400 italic">
                                                            Not recorded
                                                        </span>

                                                    </td>

                                                    {/* ACTION */}

                                                    <td className="px-5 py-5">

                                                        <div className="flex items-center justify-center gap-2">

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openEditUser(
                                                                        user
                                                                    )
                                                                }
                                                                disabled={
                                                                    !isAdmin
                                                                }
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >

                                                                <Edit
                                                                    size={
                                                                        15
                                                                    }
                                                                />

                                                                Edit

                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleStatus(
                                                                        user
                                                                    )
                                                                }
                                                                disabled={
                                                                    !isAdmin ||
                                                                    Number(
                                                                        currentUser?.id
                                                                    ) ===
                                                                        Number(
                                                                            user.id
                                                                        )
                                                                }
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >

                                                                <KeyRound
                                                                    size={
                                                                        15
                                                                    }
                                                                />

                                                                {status ===
                                                                "Active"
                                                                    ? "Deactivate"
                                                                    : "Activate"}

                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteUser(
                                                                        user
                                                                    )
                                                                }
                                                                disabled={
                                                                    !isAdmin ||
                                                                    Number(
                                                                        currentUser?.id
                                                                    ) ===
                                                                        Number(
                                                                            user.id
                                                                        )
                                                                }
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >

                                                                <Trash2
                                                                    size={
                                                                        15
                                                                    }
                                                                />

                                                                Delete

                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </main>

            {/* =================================================
                CREATE / EDIT USER MODAL
            ================================================= */}

            {showUserModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

                        <div className="sticky top-0 z-10 bg-white border-b px-6 py-5 flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    User Management
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {editingUser
                                        ? "Edit User Account"
                                        : "Create New User"}
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeUserModal
                                }
                                disabled={saving}
                                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                            >

                                <X
                                    size={22}
                                />

                            </button>

                        </div>

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="p-6 space-y-5"
                        >

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <div className="md:col-span-2">

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Full Name
                                    </label>

                                    <input
                                        type="text"
                                        name="name"
                                        value={
                                            form.name
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter full name"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                <div className="md:col-span-2">

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={
                                            form.email
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="name@abra.edu"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        System Role
                                    </label>

                                    <select
                                        name="role"
                                        value={
                                            form.role
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    >

                                        <option value="Cashier">
                                            Cashier
                                        </option>

                                        <option value="System Administrator">
                                            System Administrator
                                        </option>

                                    </select>

                                </div>

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Account Status
                                    </label>

                                    <select
                                        name="status"
                                        value={
                                            form.status
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    >

                                        <option value="Active">
                                            Active
                                        </option>

                                        <option value="Inactive">
                                            Inactive
                                        </option>

                                    </select>

                                </div>

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {editingUser
                                            ? "New Password (Optional)"
                                            : "Password"}
                                    </label>

                                    <input
                                        type="password"
                                        name="password"
                                        value={
                                            form.password
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="At least 8 characters"
                                        required={
                                            !editingUser
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Confirm Password
                                    </label>

                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        value={
                                            form.password_confirmation
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Repeat password"
                                        required={
                                            !editingUser ||
                                            Boolean(
                                                form.password
                                            )
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                            </div>

                            {editingUser && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                                    Leave the password fields empty if you only want to update the name, email, role, or status.
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">

                                <button
                                    type="button"
                                    onClick={
                                        closeUserModal
                                    }
                                    disabled={
                                        saving
                                    }
                                    className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold disabled:opacity-50"
                                >

                                    {saving ? (
                                        <RefreshCw
                                            size={
                                                18
                                            }
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Save
                                            size={
                                                18
                                            }
                                        />
                                    )}

                                    {saving
                                        ? "Saving..."
                                        : editingUser
                                        ? "Save Changes"
                                        : "Create User"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =================================================
                ASSIGN ROLE MODAL
            ================================================= */}

            {showRoleModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">

                        <div className="flex items-center justify-between p-6 border-b">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Management Tools
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    Assign System Role
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowRoleModal(
                                        false
                                    )
                                }
                                disabled={saving}
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >

                                <X
                                    size={22}
                                />

                            </button>

                        </div>

                        <div className="p-6 space-y-5">

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select User
                                </label>

                                <select
                                    value={
                                        selectedRoleUserId
                                    }
                                    onChange={
                                        handleRoleUserChange
                                    }
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                >

                                    {users.map(
                                        (
                                            user
                                        ) => (
                                            <option
                                                key={
                                                    user.id
                                                }
                                                value={
                                                    user.id
                                                }
                                            >
                                                {
                                                    user.name
                                                } —{" "}
                                                {
                                                    user.email
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                            </div>

                            <div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    System Role
                                </label>

                                <select
                                    value={
                                        selectedRole
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setSelectedRole(
                                            event.target
                                                .value
                                        )
                                    }
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                >

                                    <option value="Cashier">
                                        Cashier
                                    </option>

                                    <option value="System Administrator">
                                        System Administrator
                                    </option>

                                </select>

                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
                                Changing a role changes the account's access level. The Laravel backend should also enforce the corresponding authorization rules.
                            </div>

                            <div className="flex justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowRoleModal(
                                            false
                                        )
                                    }
                                    className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        saveAssignedRole
                                    }
                                    disabled={
                                        saving ||
                                        !selectedRoleUserId
                                    }
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold disabled:opacity-50"
                                >

                                    {saving ? (
                                        <RefreshCw
                                            size={
                                                18
                                            }
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <ShieldCheck
                                            size={
                                                18
                                            }
                                        />
                                    )}

                                    Save Role

                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

            {/* =================================================
                AUDIT MODAL
            ================================================= */}

            {showAuditModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl">

                        <div className="flex items-center justify-between p-6 border-b">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Security
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    Audit System Access Logs
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowAuditModal(
                                        false
                                    )
                                }
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >

                                <X
                                    size={22}
                                />

                            </button>

                        </div>

                        <div className="p-6 space-y-4">

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">

                                <div className="flex items-start gap-3">

                                    <Activity
                                        size={21}
                                        className="text-blue-700 mt-0.5"
                                    />

                                    <div>

                                        <p className="font-semibold text-blue-900">
                                            Access-log storage status
                                        </p>

                                        <p className="text-sm text-blue-800 mt-1">
                                            The current users table does not contain a dedicated last-login or access-log field. This page therefore does not invent login activity from created_at or updated_at.
                                        </p>

                                    </div>

                                </div>

                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">

                                <div className="bg-[#eef4f8] px-4 py-3 font-bold text-gray-700">
                                    Current Account Records
                                </div>

                                <div className="max-h-72 overflow-y-auto divide-y">

                                    {users.length ===
                                    0 ? (
                                        <div className="p-6 text-center text-gray-500">
                                            No user records available.
                                        </div>
                                    ) : (
                                        users.map(
                                            (
                                                user
                                            ) => (
                                                <div
                                                    key={
                                                        user.id
                                                    }
                                                    className="px-4 py-4 flex items-center justify-between gap-4"
                                                >

                                                    <div>

                                                        <p className="font-semibold text-gray-900">
                                                            {
                                                                user.name
                                                            }
                                                        </p>

                                                        <p className="text-xs text-gray-500">
                                                            {
                                                                user.email
                                                            }
                                                        </p>

                                                    </div>

                                                    <div className="text-right">

                                                        <p className="text-xs font-semibold text-gray-500">
                                                            {
                                                                user.role
                                                            }
                                                        </p>

                                                        <p
                                                            className={`text-xs font-bold ${
                                                                String(
                                                                    user.status ||
                                                                        "Active"
                                                                ) ===
                                                                "Active"
                                                                    ? "text-green-600"
                                                                    : "text-red-600"
                                                            }`}
                                                        >
                                                            {
                                                                user.status
                                                            }
                                                        </p>

                                                        <p className="text-xs text-gray-400 mt-1">
                                                            Last login: Not recorded
                                                        </p>

                                                    </div>

                                                </div>
                                            )
                                        )
                                    )}

                                </div>

                            </div>

                            <div className="flex justify-end">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAuditModal(
                                            false
                                        )
                                    }
                                    className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                                >
                                    Close
                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}
