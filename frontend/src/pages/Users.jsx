import { useCallback, useEffect, useMemo, useState } from "react";
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

const API_URL = "https://uniteq-production-zsysbh.laravel.cloud/api";

const ROLES = [
    "System Administrator",
    "Cashier",
    "Reviewer",
    "Viewer",
];

const STATUSES = ["Active", "Inactive"];

const EMPTY_FORM = {
    name: "",
    email: "",
    role: "Cashier",
    status: "Active",
    password: "",
    password_confirmation: "",
};

function getStoredUser() {
    try {
        const stored =
            localStorage.getItem("uniteq_user") ||
            sessionStorage.getItem("uniteq_user");

        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error("Unable to read stored user:", error);
        return null;
    }
}

function getHeaders() {
    const token =
        localStorage.getItem("uniteq_token") ||
        sessionStorage.getItem("uniteq_token");

    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getErrorMessage(error, fallback) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
        return "Your session has expired. Please log in again.";
    }

    if (status === 403) {
        return "You are not authorized to perform this action.";
    }

    if (status === 422 && data?.errors) {
        return Object.values(data.errors).flat().join("\n");
    }

    return data?.message || fallback;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getRoleClass(role) {
    return role === "System Administrator"
        ? "bg-purple-100 text-purple-700"
        : "bg-blue-100 text-blue-700";
}

function getStatusClass(status) {
    return status === "Active"
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700";
}

function normalizeUsers(responseData) {
    if (Array.isArray(responseData)) {
        return responseData;
    }

    if (Array.isArray(responseData?.data)) {
        return responseData.data;
    }

    if (Array.isArray(responseData?.users)) {
        return responseData.users;
    }

    return [];
}

function Modal({ title, onClose, children }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
                <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
                    <h2 className="text-lg font-bold text-gray-800">
                        {title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-700">
                {label}
            </span>
            {children}
        </label>
    );
}

function StatCard({ title, value, icon: Icon, color }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-800">
                        {value}
                    </p>
                </div>

                <div className={`rounded-xl p-3 ${color}`}>
                    <Icon size={23} />
                </div>
            </div>
        </div>
    );
}

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pageError, setPageError] = useState("");

    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);

    const [editingUser, setEditingUser] = useState(null);
    const [selectedRoleUserId, setSelectedRoleUserId] = useState("");
    const [selectedRole, setSelectedRole] = useState("Cashier");
    const [form, setForm] = useState(EMPTY_FORM);

    const currentUser = useMemo(() => getStoredUser(), []);
    const currentRole = String(currentUser?.role || "").trim();

    const isAdmin = currentRole === "System Administrator";

    const loadUsers = useCallback(async (showError = true) => {
        try {
            setLoading(true);
            setPageError("");

            const response = await axios.get(`${API_URL}/users`, {
                headers: getHeaders(),
            });

            setUsers(normalizeUsers(response.data));
        } catch (error) {
            console.error("User loading error:", error);
            console.error("Server response:", error.response?.data);

            setUsers([]);

            const message = getErrorMessage(
                error,
                "Unable to load user accounts. Check that the Laravel server is running and the API route exists."
            );

            setPageError(message);

            if (showError) {
                alert(message);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const activeUsers = users.filter(
        (user) => String(user.status || "Active") === "Active"
    ).length;

    const inactiveUsers = users.length - activeUsers;

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch =
                !term ||
                String(user.name || "").toLowerCase().includes(term) ||
                String(user.email || "").toLowerCase().includes(term) ||
                String(user.role || "").toLowerCase().includes(term) ||
                String(user.id || "").includes(term);

            const matchesRole =
                roleFilter === "All" || user.role === roleFilter;

            const matchesStatus =
                statusFilter === "All" ||
                String(user.status || "Active") === statusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, search, roleFilter, statusFilter]);

    function openAddModal() {
        if (!isAdmin) {
            alert("Only the System Administrator can manage user accounts.");
            return;
        }

        setEditingUser(null);
        setForm({ ...EMPTY_FORM });
        setShowUserModal(true);
    }

    function openEditModal(user) {
        if (!isAdmin) {
            alert("Only the System Administrator can manage user accounts.");
            return;
        }

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
        if (saving) return;

        setShowUserModal(false);
        setEditingUser(null);
        setForm({ ...EMPTY_FORM });
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!isAdmin) {
            alert("Only the System Administrator can manage user accounts.");
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

        if (!form.role || !form.status) {
            alert("Please select a role and account status.");
            return;
        }

        if (!editingUser && !form.password) {
            alert("Please enter a password for the new user.");
            return;
        }

        if (form.password && form.password.length < 8) {
            alert("Password must contain at least 8 characters.");
            return;
        }

        if (form.password !== form.password_confirmation) {
            alert("The passwords do not match.");
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            status: form.status,
        };

        if (form.password) {
            payload.password = form.password;
            payload.password_confirmation = form.password_confirmation;
        }

        try {
            setSaving(true);

            if (editingUser) {
                await axios.put(
                    `${API_URL}/users/${editingUser.id}`,
                    payload,
                    { headers: getHeaders() }
                );
            } else {
                await axios.post(
                    `${API_URL}/users`,
                    payload,
                    { headers: getHeaders() }
                );
            }

            alert(
                editingUser
                    ? "User account updated successfully."
                    : "User account created successfully."
            );

            setShowUserModal(false);
            setEditingUser(null);
            setForm({ ...EMPTY_FORM });

            await loadUsers(false);
        } catch (error) {
            console.error("User save error:", error);
            alert(getErrorMessage(error, "Unable to save the user account."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteUser(user) {
        if (!isAdmin) {
            alert("Only the System Administrator can delete user accounts.");
            return;
        }

        if (Number(currentUser?.id) === Number(user.id)) {
            alert("You cannot delete the account you are currently using.");
            return;
        }

        const confirmed = window.confirm(
            `Delete the account for "${user.name}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            await axios.delete(`${API_URL}/users/${user.id}`, {
                headers: getHeaders(),
            });

            alert("User account deleted successfully.");
            await loadUsers(false);
        } catch (error) {
            console.error("Delete user error:", error);
            alert(getErrorMessage(error, "Unable to delete the user account."));
        }
    }

    async function toggleStatus(user) {
        if (!isAdmin) {
            alert("Only the System Administrator can change account status.");
            return;
        }

        if (Number(currentUser?.id) === Number(user.id)) {
            alert("You cannot change the status of your current account.");
            return;
        }

        const nextStatus =
            String(user.status || "Active") === "Active"
                ? "Inactive"
                : "Active";

        const confirmed = window.confirm(
            `Change ${user.name}'s account status to ${nextStatus}?`
        );

        if (!confirmed) return;

        try {
            await axios.put(
                `${API_URL}/users/${user.id}`,
                {
                    name: user.name,
                    email: user.email,
                    role: user.role || "Cashier",
                    status: nextStatus,
                },
                { headers: getHeaders() }
            );

            await loadUsers(false);
        } catch (error) {
            console.error("Status update error:", error);
            alert(getErrorMessage(error, "Unable to update account status."));
        }
    }

    function openRoleModal() {
        if (!isAdmin) {
            alert("Only the System Administrator can assign system roles.");
            return;
        }

        const firstUser = users[0];

        setSelectedRoleUserId(firstUser ? String(firstUser.id) : "");
        setSelectedRole(firstUser?.role || "Cashier");
        setShowRoleModal(true);
    }

    function handleRoleUserChange(event) {
        const userId = event.target.value;
        setSelectedRoleUserId(userId);

        const user = users.find(
            (item) => String(item.id) === String(userId)
        );

        setSelectedRole(user?.role || "Cashier");
    }

    async function saveAssignedRole() {
        if (!isAdmin) {
            alert("Only the System Administrator can assign system roles.");
            return;
        }

        const user = users.find(
            (item) => String(item.id) === String(selectedRoleUserId)
        );

        if (!user) {
            alert("Please select a valid user.");
            return;
        }

        if (Number(currentUser?.id) === Number(user.id) &&
            selectedRole !== "System Administrator") {
            alert("You cannot remove your own System Administrator role while logged in.");
            return;
        }

        try {
            setSaving(true);

            await axios.put(
                `${API_URL}/users/${user.id}`,
                {
                    name: user.name,
                    email: user.email,
                    role: selectedRole,
                    status: user.status || "Active",
                },
                { headers: getHeaders() }
            );

            alert("System role updated successfully.");
            setShowRoleModal(false);

            await loadUsers(false);
        } catch (error) {
            console.error("Role update error:", error);
            alert(getErrorMessage(error, "Unable to assign the system role."));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Page heading */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                                <UsersIcon size={27} />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    User Management
                                </h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    Manage UniTeq user accounts, roles, and access.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => loadUsers()}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={openRoleModal}
                            disabled={!isAdmin}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ShieldCheck size={17} />
                            Assign Role
                        </button>

                        <button
                            type="button"
                            onClick={openAddModal}
                            disabled={!isAdmin}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <UserPlus size={17} />
                            Add User
                        </button>
                    </div>
                </div>

                {!isAdmin && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        Your stored account role is not{" "}
                        <strong>System Administrator</strong>. User-management
                        actions are disabled.
                    </div>
                )}

                {pageError && (
                    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                        <p className="whitespace-pre-line">{pageError}</p>

                        <button
                            type="button"
                            onClick={() => loadUsers()}
                            className="shrink-0 rounded-lg bg-red-100 px-3 py-2 font-semibold hover:bg-red-200"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        title="Total Users"
                        value={users.length}
                        icon={UsersIcon}
                        color="bg-blue-100 text-blue-700"
                    />

                    <StatCard
                        title="Active Accounts"
                        value={activeUsers}
                        icon={CheckCircle}
                        color="bg-green-100 text-green-700"
                    />

                    <StatCard
                        title="Inactive Accounts"
                        value={inactiveUsers}
                        icon={XCircle}
                        color="bg-red-100 text-red-700"
                    />
                </div>

                {/* Search and filters */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="relative">
                            <Search
                                size={19}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name, email, role, or ID..."
                                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        <select
                            value={roleFilter}
                            onChange={(event) => setRoleFilter(event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="All">All Roles</option>
                            {ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="All">All Statuses</option>
                            {STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
                        <span>
                            Showing {filteredUsers.length} of {users.length} users
                        </span>

                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setRoleFilter("All");
                                setStatusFilter("All");
                            }}
                            className="font-semibold text-blue-700 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                </div>

                {/* Users table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                        <div>
                            <h2 className="font-bold text-gray-800">
                                Registered Accounts
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                View and manage registered system users.
                            </p>
                        </div>

                        <Activity className="text-gray-400" size={21} />
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
                            <RefreshCw size={20} className="animate-spin" />
                            Loading user accounts...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-12 text-center">
                            <UsersIcon
                                size={40}
                                className="mx-auto mb-3 text-gray-300"
                            />
                            <h3 className="font-semibold text-gray-700">
                                No user accounts found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Try changing your search or filters.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th className="px-5 py-4">User</th>
                                        <th className="px-5 py-4">Role</th>
                                        <th className="px-5 py-4">Status</th>
                                        <th className="px-5 py-4">Created</th>
                                        <th className="px-5 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map((user) => {
                                        const isCurrentUser =
                                            Number(currentUser?.id) === Number(user.id);

                                        return (
                                            <tr
                                                key={user.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                                                            {String(user.name || "U")
                                                                .trim()
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </div>

                                                        <div>
                                                            <p className="font-semibold text-gray-800">
                                                                {user.name || "Unnamed User"}
                                                                {isCurrentUser && (
                                                                    <span className="ml-2 text-xs font-normal text-blue-600">
                                                                        You
                                                                    </span>
                                                                )}
                                                            </p>

                                                            <p className="mt-1 text-gray-500">
                                                                {user.email || "No email"}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-400">
                                                                ID: {user.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleClass(user.role)}`}
                                                    >
                                                        {user.role || "Unassigned"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(user.status || "Active")}`}
                                                    >
                                                        {user.status || "Active"}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4 text-gray-500">
                                                    {formatDate(user.created_at)}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(user)}
                                                            disabled={!isAdmin}
                                                            title="Edit user"
                                                            className="rounded-lg border border-blue-200 p-2 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Edit size={16} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => toggleStatus(user)}
                                                            disabled={!isAdmin || isCurrentUser}
                                                            title={
                                                                user.status === "Active"
                                                                    ? "Deactivate account"
                                                                    : "Activate account"
                                                            }
                                                            className="rounded-lg border border-amber-200 p-2 text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Activity size={16} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteUser(user)}
                                                            disabled={!isAdmin || isCurrentUser}
                                                            title="Delete user"
                                                            className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <p className="text-xs leading-5 text-gray-500">
                    Security note: role restrictions in this page improve the
                    interface, but Laravel must also enforce authorization on
                    the server for every user-management API request.
                </p>
            </div>

            {/* Add / Edit User Modal */}
            {showUserModal && (
                <Modal
                    title={editingUser ? "Edit User Account" : "Add New User"}
                    onClose={closeUserModal}
                >
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Field label="Full Name">
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                autoComplete="name"
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                placeholder="Enter full name"
                            />
                        </Field>

                        <Field label="Email Address">
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                autoComplete="email"
                                required
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                placeholder="name@example.com"
                            />
                        </Field>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="System Role">
                                <select
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
                                >
                                    {ROLES.map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field label="Account Status">
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
                                >
                                    {STATUSES.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-4">
                            <div className="mb-3 flex items-center gap-2">
                                <KeyRound size={18} className="text-gray-500" />
                                <p className="text-sm font-semibold text-gray-700">
                                    {editingUser
                                        ? "Change Password (Optional)"
                                        : "Set Password"}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Field label="Password">
                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        minLength={8}
                                        required={!editingUser}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
                                        placeholder={
                                            editingUser
                                                ? "Leave blank to keep current password"
                                                : "At least 8 characters"
                                        }
                                    />
                                </Field>

                                <Field label="Confirm Password">
                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        value={form.password_confirmation}
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        required={!editingUser && !form.password}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
                                        placeholder="Re-enter password"
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeUserModal}
                                disabled={saving}
                                className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saving ? (
                                    <RefreshCw size={17} className="animate-spin" />
                                ) : (
                                    <Save size={17} />
                                )}

                                {saving
                                    ? "Saving..."
                                    : editingUser
                                      ? "Save Changes"
                                      : "Create User"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Role Assignment Modal */}
            {showRoleModal && (
                <Modal
                    title="Assign System Role"
                    onClose={() => !saving && setShowRoleModal(false)}
                >
                    <div className="space-y-5">
                        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                            Select a user and assign the appropriate system
                            role. Ensure that each account receives only the
                            access it needs.
                        </div>

                        <Field label="Select User">
                            <select
                                value={selectedRoleUserId}
                                onChange={handleRoleUserChange}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
                            >
                                <option value="">Choose a user</option>

                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} — {user.email}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Assigned Role">
                            <select
                                value={selectedRole}
                                onChange={(event) =>
                                    setSelectedRole(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500"
                            >
                                {ROLES.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowRoleModal(false)}
                                disabled={saving}
                                className="rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={saveAssignedRole}
                                disabled={saving || !selectedRoleUserId}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                            >
                                <ShieldCheck size={17} />
                                {saving ? "Saving..." : "Save Role"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Basic account overview modal */}
            {showAuditModal && (
                <Modal
                    title="Account Overview"
                    onClose={() => setShowAuditModal(false)}
                >
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            This overview shows the current account counts.
                            It is not a server-side audit log.
                        </p>

                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">Total accounts</p>
                            <p className="text-2xl font-bold">{users.length}</p>
                        </div>

                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">Active accounts</p>
                            <p className="text-2xl font-bold text-green-700">
                                {activeUsers}
                            </p>
                        </div>

                        <div className="rounded-lg border p-4">
                            <p className="text-sm text-gray-500">Inactive accounts</p>
                            <p className="text-2xl font-bold text-red-700">
                                {inactiveUsers}
                            </p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
