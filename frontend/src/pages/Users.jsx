import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api";
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

const LOGO_URL = "/university-of-abra-logo.png";
const ROLES = ["Cashier", "System Administrator"];
const STATUSES = ["Active", "Inactive"];
const EMPTY_FORM = {
    name: "",
    email: "",
    role: "Cashier",
    status: "Active",
    password: "",
    password_confirmation: "",
};
const inputClass =
    "w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]";

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

function normalizeUsers(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.data?.data)) return data.data.data;
    return [];
}

function errorMessage(error, fallback) {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 401) return "Your session has expired or is not authenticated. Please log in again.";
    if (status === 403) return "Access denied. Your account is not authorized to perform this action.";
    if (status === 404) return "The users API route was not found. Check your Laravel API routes.";
    if (status === 422 && data?.errors) {
        return Object.values(data.errors).flat().join("\n");
    }
    if (status >= 500) {
        return data?.message || "Laravel returned a server error. Check the Laravel terminal or log.";
    }
    if (!error?.response) {
        return "Cannot connect to the Laravel API. Make sure the backend is running and api.js has the correct baseURL.";
    }
    return data?.message || error?.message || fallback;
}

function formatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not recorded";
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

function Field({ label, children, className = "" }) {
    return (
        <div className={className}>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
                {label}
            </label>
            {children}
        </div>
    );
}

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [selectedRoleUserId, setSelectedRoleUserId] = useState("");
    const [selectedRole, setSelectedRole] = useState("Cashier");
    const [form, setForm] = useState({ ...EMPTY_FORM });

    const currentUser = useMemo(() => getStoredUser(), []);
    const isAdmin =
        String(currentUser?.role || "").trim() === "System Administrator";

    const loadUsers = useCallback(async ({ showError = true } = {}) => {
        setLoading(true);
        try {
            // Use the configured Axios instance instead of an undefined axios variable.
            const response = await api.get("/users");
            const records = normalizeUsers(response.data);
            setUsers(records);
            return records;
        } catch (error) {
            console.error("User loading error:", error);
            console.error("API response:", error?.response?.data);
            setUsers([]);
            if (showError) {
                alert(errorMessage(error, "Unable to load user accounts."));
            }
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const roleCounts = useMemo(() => {
        return users.reduce((counts, user) => {
            const role = user.role || "Unassigned";
            counts[role] = (counts[role] || 0) + 1;
            return counts;
        }, {});
    }, [users]);

    const totalUsers = users.length;
    const activeUsers = users.filter(
        (user) => String(user.status || "Active") === "Active"
    ).length;
    const inactiveUsers = totalUsers - activeUsers;

    const filteredUsers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...users]
            .filter((user) => {
                const role = String(user.role || "Unassigned");
                const status = String(user.status || "Active");

                if (roleFilter !== "All" && role !== roleFilter) return false;
                if (statusFilter !== "All" && status !== statusFilter) return false;

                const text = [
                    user.id,
                    user.name,
                    user.email,
                    role,
                    status,
                ].map((value) => String(value ?? "")).join(" ").toLowerCase();

                if (query && !text.includes(query)) return false;

                // Date range filters account creation date, not last-login date.
                if (dateFrom || dateTo) {
                    if (!user.created_at) return false;
                    const created = new Date(user.created_at);
                    if (Number.isNaN(created.getTime())) return false;
                    const createdDay = [
                        created.getFullYear(),
                        String(created.getMonth() + 1).padStart(2, "0"),
                        String(created.getDate()).padStart(2, "0"),
                    ].join("-");
                    if (dateFrom && createdDay < dateFrom) return false;
                    if (dateTo && createdDay > dateTo) return false;
                }

                return true;
            })
            .sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    }, [users, search, roleFilter, statusFilter, dateFrom, dateTo]);

    function openCreateUser() {
        if (!isAdmin) {
            alert("Only the System Administrator can manage user accounts.");
            return;
        }
        setEditingUser(null);
        setForm({ ...EMPTY_FORM });
        setShowUserModal(true);
    }

    function openEditUser(user) {
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
        setForm((previous) => ({ ...previous, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!isAdmin) {
            alert("Only the System Administrator can manage user accounts.");
            return;
        }
        if (!form.name.trim()) return alert("Please enter the user's full name.");
        if (!form.email.trim()) return alert("Please enter the user's email address.");
        if (!form.role) return alert("Please select a system role.");
        if (!form.status) return alert("Please select an account status.");
        if (!editingUser && !form.password) {
            return alert("Please enter a password for the new user.");
        }
        if (form.password && form.password.length < 8) {
            return alert("Password must contain at least 8 characters.");
        }
        if (form.password !== form.password_confirmation) {
            return alert("The passwords do not match.");
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

        setSaving(true);
        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, payload);
                alert("User account updated successfully.");
            } else {
                await api.post("/users", payload);
                alert("User account created successfully.");
            }

            setShowUserModal(false);
            setEditingUser(null);
            setForm({ ...EMPTY_FORM });
            await loadUsers({ showError: false });
        } catch (error) {
            console.error("User save error:", error);
            alert(errorMessage(error, "Unable to save the user account."));
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
            await api.delete(`/users/${user.id}`);
            alert("User account deleted successfully.");
            await loadUsers({ showError: false });
        } catch (error) {
            console.error("Delete user error:", error);
            alert(errorMessage(error, "Unable to delete the user account."));
        }
    }

    async function toggleStatus(user) {
        if (!isAdmin) {
            alert("Only the System Administrator can change account status.");
            return;
        }
        if (Number(currentUser?.id) === Number(user.id)) {
            alert("You cannot change the status of the account you are currently using.");
            return;
        }

        const nextStatus = String(user.status || "Active") === "Active"
            ? "Inactive"
            : "Active";

        try {
            await api.put(`/users/${user.id}`, {
                name: user.name,
                email: user.email,
                role: user.role || "Cashier",
                status: nextStatus,
            });
            await loadUsers({ showError: false });
        } catch (error) {
            console.error("Status update error:", error);
            alert(errorMessage(error, "Unable to update account status."));
        }
    }

    function openRoleModal() {
        if (!isAdmin) {
            alert("Only the System Administrator can assign system roles.");
            return;
        }
        if (users.length === 0) {
            alert("No user accounts are available.");
            return;
        }
        const firstUser = users[0];
        setSelectedRoleUserId(String(firstUser.id));
        setSelectedRole(firstUser.role || "Cashier");
        setShowRoleModal(true);
    }

    function handleRoleUserChange(event) {
        const id = event.target.value;
        setSelectedRoleUserId(id);
        const user = users.find((item) => String(item.id) === id);
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
        if (!user) return alert("Please select a valid user.");

        if (
            Number(currentUser?.id) === Number(user.id) &&
            selectedRole !== "System Administrator"
        ) {
            return alert("You cannot remove your own System Administrator role while logged in.");
        }

        setSaving(true);
        try {
            await api.put(`/users/${user.id}`, {
                name: user.name,
                email: user.email,
                role: selectedRole,
                status: user.status || "Active",
            });
            alert("System role updated successfully.");
            setShowRoleModal(false);
            await loadUsers({ showError: false });
        } catch (error) {
            console.error("Role update error:", error);
            alert(errorMessage(error, "Unable to assign the system role."));
        } finally {
            setSaving(false);
        }
    }

    const systemAdminCount = roleCounts["System Administrator"] || 0;
    const cashierCount = roleCounts.Cashier || 0;

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto max-w-[1500px] px-6 py-7">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-center gap-5">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                                <img src={LOGO_URL} alt="University of Abra" className="h-12 w-12 object-contain" />
                            </div>
                            <div>
                                <p className="text-sm text-blue-100">University of Abra | Main Campus • Cashier&apos;s Unit</p>
                                <h1 className="mt-1 text-3xl font-bold sm:text-4xl">User Management Page</h1>
                                <p className="mt-2 text-blue-100">Manage authorized UniTeq user accounts, roles, and account status.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden text-right sm:block">
                                <p className="text-xs text-blue-200">System Date</p>
                                <p className="font-semibold">{formatDate(new Date())}</p>
                            </div>
                            <button type="button" onClick={() => loadUsers()} disabled={loading}
                                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/80 px-5 py-3 font-semibold transition hover:bg-white hover:text-[#102d55] disabled:opacity-50">
                                <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-7 px-6 py-8">
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">User Registry Overview</h2>
                            <p className="mt-1 text-gray-500">View, create, update, and manage authorized system accounts.</p>
                        </div>
                        <span className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-sm font-semibold ${loading ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-700"}`}>
                            <span className={`h-2 w-2 rounded-full ${loading ? "bg-yellow-500" : "bg-green-500"}`} />
                            {loading ? "Connecting..." : "API request completed"}
                        </span>
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field label="Created From">
                            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Created To">
                            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
                        </Field>
                        <div className="flex items-end gap-2">
                            <button type="button" onClick={() => {
                                if (dateFrom && dateTo && dateFrom > dateTo) {
                                    alert("The From date cannot be later than the To date.");
                                    return;
                                }
                                loadUsers();
                            }} className="rounded-xl bg-[#0797a6] px-5 py-3 font-semibold text-white hover:bg-[#067f8b]">
                                Refresh Records
                            </button>
                            <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="rounded-xl border border-gray-300 px-4 py-3 font-semibold hover:bg-gray-50">
                                Clear Dates
                            </button>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">User Summary</h3>
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50"><UsersIcon size={23} className="text-[#102d55]" /></div>
                        </div>
                        <p className="mt-6 text-sm text-gray-500">Total Users</p>
                        <p className="text-3xl font-bold text-[#102d55]">{loading ? "…" : totalUsers}</p>
                        <div className="mt-4 flex justify-between border-t pt-4"><span className="text-gray-600">Active</span><span className="font-bold text-green-600">{activeUsers}</span></div>
                        <div className="mt-3 flex justify-between"><span className="text-gray-600">Inactive</span><span className="font-bold text-red-600">{inactiveUsers}</span></div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Role Distribution</h3>
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50"><ShieldCheck size={23} className="text-purple-700" /></div>
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                            <span className="flex items-center gap-3 text-gray-700"><ShieldCheck size={18} className="text-purple-700" /> System Administrators</span>
                            <strong className="text-2xl text-purple-700">{systemAdminCount}</strong>
                        </div>
                        <div className="mt-5 flex items-center justify-between">
                            <span className="flex items-center gap-3 text-gray-700"><UserCog size={18} className="text-blue-700" /> Cashiers</span>
                            <strong className="text-2xl text-blue-700">{cashierCount}</strong>
                        </div>
                        {Object.entries(roleCounts).filter(([role]) => !ROLES.includes(role)).map(([role, count]) => (
                            <div key={role} className="mt-4 flex items-center justify-between"><span>{role}</span><strong>{count}</strong></div>
                        ))}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50"><Search size={22} className="text-[#0797a6]" /></div>
                            <h3 className="text-xl font-bold">User Search & Filter</h3>
                        </div>
                        <Field label="Search">
                            <div className="relative">
                                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, ID, email, or role" className={`${inputClass} pl-10`} />
                            </div>
                        </Field>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                            <Field label="Role">
                                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputClass}>
                                    <option value="All">All Roles</option>
                                    {Array.from(new Set([...ROLES, ...Object.keys(roleCounts)])).map((role) => <option key={role} value={role}>{role}</option>)}
                                </select>
                            </Field>
                            <Field label="Status">
                                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
                                    <option value="All">All Statuses</option>
                                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                                </select>
                            </Field>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div><h3 className="text-xl font-bold">Management Tools</h3><p className="mt-1 text-sm text-gray-500">Administrative actions for UniTeq user accounts.</p></div>
                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={openCreateUser} disabled={!isAdmin} className="inline-flex items-center gap-2 rounded-xl bg-[#0797a6] px-5 py-3 font-semibold text-white hover:bg-[#067f8b] disabled:cursor-not-allowed disabled:opacity-50"><UserPlus size={18} /> Create New User</button>
                            <button type="button" onClick={openRoleModal} disabled={!isAdmin || users.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck size={18} /> Assign System Roles</button>
                            <button type="button" onClick={() => setShowAuditModal(true)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"><Activity size={18} /> Audit System Access Logs</button>
                        </div>
                    </div>
                    {!isAdmin && <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">Management actions are available only to the System Administrator. Your stored login role is: {currentUser?.role || "not found"}.</div>}
                </section>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div><h3 className="text-2xl font-bold">User Registry</h3><p className="mt-1 text-sm text-gray-500">{filteredUsers.length} displayed account{filteredUsers.length === 1 ? "" : "s"}</p></div>
                        <button type="button" onClick={() => { setSearch(""); setRoleFilter("All"); setStatusFilter("All"); setDateFrom(""); setDateTo(""); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50">Clear Filters</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px]">
                            <thead className="bg-[#eef4f8]"><tr>
                                {["User ID", "Full Name", "Email Address", "System Role", "Account Status", "Created At", "Actions"].map((heading) => <th key={heading} className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600">{heading}</th>)}
                            </tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={7} className="py-16 text-center text-gray-500"><RefreshCw size={28} className="mx-auto mb-3 animate-spin" />Loading user accounts...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={7} className="py-16 text-center text-gray-500"><UsersIcon size={36} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">No user accounts found.</p><p className="mt-1 text-sm">Refresh records or change the filters.</p></td></tr>
                                ) : filteredUsers.map((user) => {
                                    const status = user.status || "Active";
                                    const isSelf = Number(currentUser?.id) === Number(user.id);
                                    return <tr key={user.id} className="transition hover:bg-blue-50/40">
                                        <td className="px-5 py-5 font-bold text-[#102d55]">UA-{String(user.id ?? 0).padStart(4, "0")}</td>
                                        <td className="px-5 py-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50"><UsersIcon size={18} className="text-[#102d55]" /></div><div><p className="font-bold text-gray-900">{user.name || "Unnamed user"}</p><p className="text-xs text-gray-500">Account #{user.id}</p></div></div></td>
                                        <td className="px-5 py-5 text-sm text-gray-700">{user.email || "—"}</td>
                                        <td className="px-5 py-5"><span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${getRoleClass(user.role)}`}><ShieldCheck size={14} />{user.role || "Unassigned"}</span></td>
                                        <td className="px-5 py-5"><button type="button" onClick={() => toggleStatus(user)} disabled={!isAdmin || isSelf} title={isAdmin && !isSelf ? "Click to change status" : "You cannot change this account's status"} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${getStatusClass(status)}`}>{status === "Active" ? <CheckCircle size={14} /> : <XCircle size={14} />}{status}</button></td>
                                        <td className="px-5 py-5 text-sm text-gray-600">{formatDate(user.created_at)}</td>
                                        <td className="px-5 py-5"><div className="flex items-center justify-center gap-2">
                                            <button type="button" onClick={() => openEditUser(user)} disabled={!isAdmin} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"><Edit size={15} />Edit</button>
                                            <button type="button" onClick={() => toggleStatus(user)} disabled={!isAdmin || isSelf} className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"><KeyRound size={15} />{status === "Active" ? "Deactivate" : "Activate"}</button>
                                            <button type="button" onClick={() => handleDeleteUser(user)} disabled={!isAdmin || isSelf} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"><Trash2 size={15} />Delete</button>
                                        </div></td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {showUserModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
                        <div><p className="text-sm text-gray-500">User Management</p><h2 className="text-2xl font-bold text-[#102d55]">{editingUser ? "Edit User Account" : "Create New User"}</h2></div>
                        <button type="button" onClick={closeUserModal} disabled={saving} className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"><X size={22} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5 p-6">
                        <Field label="Full Name"><input name="name" value={form.name} onChange={handleChange} required placeholder="Enter full name" className={inputClass} /></Field>
                        <Field label="Email Address"><input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="name@abra.edu" className={inputClass} /></Field>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Field label="System Role"><select name="role" value={form.role} onChange={handleChange} className={inputClass}>{ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></Field>
                            <Field label="Account Status"><select name="status" value={form.status} onChange={handleChange} className={inputClass}>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></Field>
                            <Field label={editingUser ? "New Password (Optional)" : "Password"}><input type="password" name="password" value={form.password} onChange={handleChange} required={!editingUser} minLength={8} autoComplete="new-password" placeholder="At least 8 characters" className={inputClass} /></Field>
                            <Field label="Confirm Password"><input type="password" name="password_confirmation" value={form.password_confirmation} onChange={handleChange} required={!editingUser || Boolean(form.password)} minLength={8} autoComplete="new-password" placeholder="Repeat password" className={inputClass} /></Field>
                        </div>
                        {editingUser && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Leave both password fields empty if you do not want to change the password.</div>}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={closeUserModal} disabled={saving} className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0797a6] px-6 py-3 font-semibold text-white hover:bg-[#067f8b] disabled:opacity-50">{saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}{saving ? "Saving..." : editingUser ? "Save Changes" : "Create User"}</button>
                        </div>
                    </form>
                </div>
            </div>}

            {showRoleModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b p-6"><div><p className="text-sm text-gray-500">Management Tools</p><h2 className="text-2xl font-bold text-[#102d55]">Assign System Role</h2></div><button type="button" onClick={() => setShowRoleModal(false)} disabled={saving} className="rounded-lg p-2 hover:bg-gray-100"><X size={22} /></button></div>
                    <div className="space-y-5 p-6">
                        <Field label="Select User"><select value={selectedRoleUserId} onChange={handleRoleUserChange} className={inputClass}>{users.map((user) => <option key={user.id} value={user.id}>{user.name} — {user.email}</option>)}</select></Field>
                        <Field label="System Role"><select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className={inputClass}>{ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></Field>
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">The Laravel backend must enforce role-based permissions too. Frontend button restrictions alone are not security.</div>
                        <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowRoleModal(false)} className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50">Cancel</button><button type="button" onClick={saveAssignedRole} disabled={saving || !selectedRoleUserId} className="inline-flex items-center gap-2 rounded-xl bg-[#0797a6] px-6 py-3 font-semibold text-white hover:bg-[#067f8b] disabled:opacity-50">{saving ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}Save Role</button></div>
                    </div>
                </div>
            </div>}

            {showAuditModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b p-6"><div><p className="text-sm text-gray-500">Security</p><h2 className="text-2xl font-bold text-[#102d55]">Audit System Access Logs</h2></div><button type="button" onClick={() => setShowAuditModal(false)} className="rounded-lg p-2 hover:bg-gray-100"><X size={22} /></button></div>
                    <div className="space-y-4 p-6">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800"><div className="flex items-start gap-3"><Activity size={21} className="mt-0.5 text-blue-700" /><div><p className="font-semibold text-blue-900">Access-log storage status</p><p className="mt-1">The current user records do not expose a dedicated last-login or access-log field. This page does not invent login activity from account timestamps.</p></div></div></div>
                        <div className="overflow-hidden rounded-xl border border-gray-200"><div className="bg-[#eef4f8] px-4 py-3 font-bold text-gray-700">Current Account Records</div><div className="max-h-72 divide-y overflow-y-auto">
                            {users.length === 0 ? <div className="p-6 text-center text-gray-500">No user records available.</div> : users.map((user) => <div key={user.id} className="flex items-center justify-between gap-4 px-4 py-4"><div><p className="font-semibold text-gray-900">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p><p className="mt-1 text-xs text-gray-400">Account created: {formatDate(user.created_at)}</p></div><div className="text-right"><p className="text-xs font-semibold text-gray-500">{user.role || "Unassigned"}</p><p className={`text-xs font-bold ${String(user.status || "Active") === "Active" ? "text-green-600" : "text-red-600"}`}>{user.status || "Active"}</p><p className="mt-1 text-xs text-gray-400">Last login: Not recorded</p></div></div>)}
                        </div></div>
                        <div className="flex justify-end"><button type="button" onClick={() => setShowAuditModal(false)} className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50">Close</button></div>
                    </div>
                </div>
            </div>}
        </div>
    );
}
