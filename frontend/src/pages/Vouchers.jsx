import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Search,
    Plus,
    Eye,
    X,
    RefreshCw,
    Ticket,
    Wallet,
    CalendarDays,
    User,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    CreditCard,
    Bell,
    Ban,
} from "lucide-react";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "https://uniteq-production-zsysbh.laravel.cloud/api"
).replace(/\/+$/, "");

const API_URL = `${API_BASE_URL}/vouchers`;

const voucherApi = axios.create({
    timeout: 15000,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

/*
 * Check common token keys in localStorage and sessionStorage.
 * This helps when the login page uses a different token key.
 */
function getToken() {
    const tokenKeys = [
        "uniteq_token",
        "token",
        "access_token",
        "auth_token",
    ];

    for (const storage of [localStorage, sessionStorage]) {
        for (const key of tokenKeys) {
            const value = storage.getItem(key);

            if (value && value.trim()) {
                return value.replace(/^Bearer\s+/i, "").trim();
            }
        }
    }

    return null;
}

function getHeaders() {
    const token = getToken();

    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getErrorMessage(error, fallback) {
    const data = error?.response?.data;

    if (data?.errors) {
        return Object.values(data.errors).flat().join("\n");
    }

    return data?.message || error?.message || fallback;
}

function getResponseList(response) {
    const data = response?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.vouchers)) return data.vouchers;
    if (Array.isArray(data?.data?.data)) return data.data.data;

    return [];
}

function getToday() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Vouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pageError, setPageError] = useState("");

    const [form, setForm] = useState({
        voucher_number: "",
        student_id: "",
        voucher_type: "",
        assigned_value: "",
        amount_redeemed: "0",
        expiry_date: "",
        description: "",
    });

    /* =========================================================
       VOUCHER HELPERS
    ========================================================= */

    const getVoucherNumber = (voucher) =>
        voucher.voucher_number ||
        voucher.voucher_no ||
        `UABV-26-${String(voucher.id || 0).padStart(3, "0")}`;

    const getStudentId = (voucher) =>
        voucher.student_id || voucher.student_number || "—";

    const getVoucherType = (voucher) =>
        voucher.voucher_type || voucher.type || "—";

    const getAssignedValue = (voucher) =>
        Number(
            voucher.assigned_value ??
                voucher.total_value ??
                voucher.amount_due ??
                voucher.amount ??
                0
        ) || 0;

    const getAmountRedeemed = (voucher) =>
        Number(
            voucher.amount_redeemed ??
                voucher.redeemed_amount ??
                voucher.amount_paid ??
                0
        ) || 0;

    const getRemainingBalance = (voucher) => {
        if (
            voucher.remaining_balance !== null &&
            voucher.remaining_balance !== undefined
        ) {
            return Math.max(Number(voucher.remaining_balance) || 0, 0);
        }

        return Math.max(
            getAssignedValue(voucher) - getAmountRedeemed(voucher),
            0
        );
    };

    const getStatus = (voucher) => {
        const assigned = getAssignedValue(voucher);
        const redeemed = getAmountRedeemed(voucher);
        const balance = getRemainingBalance(voucher);

        if (
            voucher.expiry_date &&
            voucher.expiry_date.slice(0, 10) < getToday() &&
            balance > 0
        ) {
            return "Expired";
        }

        if (assigned > 0 && balance <= 0) {
            return "Fully Redeemed";
        }

        if (redeemed > 0 && balance > 0) {
            return "Partially Redeemed";
        }

        return "Unused";
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(Number(amount) || 0);

    const formatDate = (value) => {
        if (!value) return "—";

        const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "Fully Redeemed":
                return "bg-green-100 text-green-700";
            case "Partially Redeemed":
                return "bg-yellow-100 text-yellow-700";
            case "Expired":
                return "bg-red-100 text-red-700";
            default:
                return "bg-blue-100 text-blue-700";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "Fully Redeemed":
                return <CheckCircle size={15} />;
            case "Partially Redeemed":
                return <Clock size={15} />;
            case "Expired":
                return <AlertCircle size={15} />;
            default:
                return <Ticket size={15} />;
        }
    };

    /* =========================================================
       LOAD VOUCHERS
    ========================================================= */

    const loadVouchers = useCallback(async () => {
        setLoading(true);
        setPageError("");

        const token = getToken();

        if (!token) {
            setVouchers([]);
            setLoading(false);
            setPageError(
                "No authentication token was found. Please log out and log in again."
            );
            return;
        }

        try {
            const response = await voucherApi.get(API_URL, {
                headers: getHeaders(),
            });

            setVouchers(getResponseList(response));
        } catch (error) {
            console.error("Voucher loading error:", error);
            console.error("Server response:", error.response?.data);

            setVouchers([]);

            if (error.response?.status === 401) {
                setPageError(
                    "Laravel rejected your login token. Please log out and log in again. If this continues, the backend authentication configuration needs to be checked."
                );
            } else if (error.response?.status === 403) {
                setPageError(
                    "Your account is not authorized to view vouchers."
                );
            } else if (error.response?.status === 404) {
                setPageError(
                    "The vouchers API route was not found. Check the Laravel routes in backend/routes/api.php."
                );
            } else {
                setPageError(
                    getErrorMessage(error, "Unable to load voucher records.")
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVouchers();
    }, [loadVouchers]);

    /* =========================================================
       SEARCH AND SORT
    ========================================================= */

    const filteredVouchers = useMemo(() => {
        const sorted = [...vouchers].sort((a, b) => {
            const numberA = Number(
                String(getVoucherNumber(a)).match(/\d+$/)?.[0] || 0
            );

            const numberB = Number(
                String(getVoucherNumber(b)).match(/\d+$/)?.[0] || 0
            );

            return numberA - numberB;
        });

        const query = search.trim().toLowerCase();

        if (!query) return sorted;

        return sorted.filter((voucher) => {
            const text = [
                getVoucherNumber(voucher),
                getStudentId(voucher),
                getVoucherType(voucher),
                voucher.description || "",
                getStatus(voucher),
            ]
                .join(" ")
                .toLowerCase();

            return text.includes(query);
        });
    }, [vouchers, search]);

    /* =========================================================
       SUMMARY
    ========================================================= */

    const totalAssigned = vouchers.reduce(
        (total, voucher) => total + getAssignedValue(voucher),
        0
    );

    const totalRedeemed = vouchers.reduce(
        (total, voucher) => total + getAmountRedeemed(voucher),
        0
    );

    const totalUncollected = vouchers.reduce(
        (total, voucher) => total + getRemainingBalance(voucher),
        0
    );

    const collectionToday = vouchers.reduce((total, voucher) => {
        const date = String(
            voucher.updated_at ||
                voucher.date ||
                voucher.created_at ||
                ""
        ).slice(0, 10);

        return date === getToday()
            ? total + getAmountRedeemed(voucher)
            : total;
    }, 0);

    /* =========================================================
       FORM HANDLING
    ========================================================= */

    function resetForm() {
        setForm({
            voucher_number: "",
            student_id: "",
            voucher_type: "",
            assigned_value: "",
            amount_redeemed: "0",
            expiry_date: "",
            description: "",
        });
    }

    function openAddModal() {
        resetForm();
        setShowAddModal(true);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    /* =========================================================
       CREATE VOUCHER
    ========================================================= */

    async function handleSubmit(event) {
        event.preventDefault();

        if (!getToken()) {
            alert("Please log out and log in again before creating a voucher.");
            return;
        }

        if (!form.student_id.trim()) {
            alert("Please enter the Student ID.");
            return;
        }

        if (!form.voucher_type.trim()) {
            alert("Please enter the voucher type.");
            return;
        }

        if (
            form.assigned_value === "" ||
            !Number.isFinite(Number(form.assigned_value)) ||
            Number(form.assigned_value) < 0
        ) {
            alert("Please enter a valid assigned value.");
            return;
        }

        if (
            form.amount_redeemed === "" ||
            !Number.isFinite(Number(form.amount_redeemed)) ||
            Number(form.amount_redeemed) < 0
        ) {
            alert("Please enter a valid redeemed amount.");
            return;
        }

        const assignedValue = Number(form.assigned_value);
        const amountRedeemed = Number(form.amount_redeemed);

        if (amountRedeemed > assignedValue) {
            alert(
                "Amount redeemed cannot be greater than the assigned value."
            );
            return;
        }

        const payload = {
            voucher_number: form.voucher_number.trim() || null,
            student_id: form.student_id.trim(),
            voucher_type: form.voucher_type.trim(),
            assigned_value: assignedValue,
            amount_redeemed: amountRedeemed,
            remaining_balance: Math.max(
                assignedValue - amountRedeemed,
                0
            ),
            expiry_date: form.expiry_date || null,
            description: form.description.trim(),
        };

        setSaving(true);

        try {
            const response = await voucherApi.post(API_URL, payload, {
                headers: getHeaders(),
            });

            alert(response.data?.message || "Voucher saved successfully.");

            setShowAddModal(false);
            resetForm();

            await loadVouchers();
        } catch (error) {
            console.error("Voucher save error:", error);
            console.error("Server response:", error.response?.data);

            if (error.response?.status === 401) {
                alert(
                    "Laravel rejected your login token. Please log out and log in again."
                );
            } else if (error.response?.status === 403) {
                alert("Your account is not authorized to create vouchers.");
            } else if (error.response?.status === 404) {
                alert(
                    "The voucher creation route was not found. Check backend/routes/api.php."
                );
            } else {
                alert(
                    getErrorMessage(
                        error,
                        "Something went wrong while saving the voucher."
                    )
                );
            }
        } finally {
            setSaving(false);
        }
    }

    /* =========================================================
       VOUCHER ACTIONS
    ========================================================= */

    function handleReminder(voucher) {
        alert(
            `Payment reminder prepared for Student ID: ${getStudentId(voucher)}`
        );
    }

    function handlePenalty(voucher) {
        alert(
            `Penalty action selected for Student ID: ${getStudentId(voucher)}. This is a prototype action and has not changed the database.`
        );
    }

    function handleFinalNotice(voucher) {
        alert(
            `Final notice prepared for Voucher: ${getVoucherNumber(voucher)}`
        );
    }

    function handleRestrictAccess(voucher) {
        alert(
            `Access restriction selected for Student ID: ${getStudentId(voucher)}. This is a prototype action and has not changed student access.`
        );
    }

    /* =========================================================
       REUSABLE COMPONENTS
    ========================================================= */

    function SummaryCard({ title, amount, icon, color }) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm text-gray-500">{title}</p>
                        <h2 className={`mt-2 text-2xl font-bold ${color}`}>
                            {formatCurrency(amount)}
                        </h2>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                        {icon}
                    </div>
                </div>
            </div>
        );
    }

    function closeAddModal() {
        if (!saving) setShowAddModal(false);
    }

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            {/* HEADER */}
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-6 py-7 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                            <Ticket size={34} className="text-[#102d55]" />
                        </div>

                        <div>
                            <p className="text-sm text-blue-100">
                                University of Abra · Main Campus · Cashier's Unit
                            </p>
                            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                                Vouchers Page
                            </h1>
                            <p className="mt-2 text-blue-100">
                                Monitor voucher assignments, redemptions, and
                                pending balances.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={loadVouchers}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/80 px-5 py-3 font-semibold transition hover:bg-white hover:text-[#102d55] disabled:opacity-50"
                    >
                        <RefreshCw
                            size={18}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-7 px-6 py-8">
                {/* ERROR MESSAGE */}
                {pageError && (
                    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={22} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold">
                                    Unable to load vouchers
                                </p>
                                <p className="mt-1 text-sm">{pageError}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={loadVouchers}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold hover:bg-red-100"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* SUMMARY CARDS */}
                <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Total Assigned Values"
                        amount={totalAssigned}
                        color="text-[#102d55]"
                        icon={<FileText size={24} className="text-[#102d55]" />}
                    />

                    <SummaryCard
                        title="Total Redeemed"
                        amount={totalRedeemed}
                        color="text-green-600"
                        icon={<Wallet size={24} className="text-green-600" />}
                    />

                    <SummaryCard
                        title="Redemptions Today"
                        amount={collectionToday}
                        color="text-[#0797a6]"
                        icon={
                            <CalendarDays
                                size={24}
                                className="text-[#0797a6]"
                            />
                        }
                    />

                    <SummaryCard
                        title="Total Uncollected"
                        amount={totalUncollected}
                        color="text-red-600"
                        icon={<CreditCard size={24} className="text-red-600" />}
                    />
                </section>

                {/* VOUCHER REGISTRY */}
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                                    <Ticket
                                        size={25}
                                        className="text-[#102d55]"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Vouchers Registry
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        University of Abra
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={openAddModal}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#067f8b]"
                            >
                                <Plus size={19} />
                                Add Voucher
                            </button>
                        </div>

                        <div className="relative mt-6 max-w-2xl">
                            <Search
                                size={19}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search voucher number, student ID, type, or status..."
                                className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-[#0797a6]"
                            />
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px]">
                            <thead className="bg-[#eef4f8]">
                                <tr>
                                    {[
                                        "Voucher Number",
                                        "Student ID",
                                        "Voucher Type",
                                        "Assigned Value",
                                        "Amount Redeemed",
                                        "Pending Balance",
                                        "Expiry Date",
                                        "Status",
                                        "Actions",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-16 text-center text-gray-500"
                                        >
                                            <RefreshCw
                                                size={28}
                                                className="mx-auto mb-3 animate-spin"
                                            />
                                            Loading voucher records...
                                        </td>
                                    </tr>
                                ) : filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="py-16 text-center text-gray-500"
                                        >
                                            <Ticket
                                                size={35}
                                                className="mx-auto mb-3 text-gray-300"
                                            />
                                            <p className="font-semibold">
                                                No voucher records found.
                                            </p>
                                            <p className="mt-1 text-sm">
                                                Try another search or add a new
                                                voucher.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVouchers.map((voucher) => {
                                        const status = getStatus(voucher);

                                        return (
                                            <tr
                                                key={voucher.id}
                                                className="transition hover:bg-blue-50/40"
                                            >
                                                <td className="px-5 py-5 font-bold text-[#102d55]">
                                                    {getVoucherNumber(voucher)}
                                                </td>

                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50">
                                                            <User
                                                                size={17}
                                                                className="text-cyan-600"
                                                            />
                                                        </div>
                                                        <span className="font-semibold text-gray-900">
                                                            {getStudentId(
                                                                voucher
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                                        <FileText size={14} />
                                                        {getVoucherType(
                                                            voucher
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-5 text-right font-semibold">
                                                    {formatCurrency(
                                                        getAssignedValue(voucher)
                                                    )}
                                                </td>

                                                <td className="px-5 py-5 text-right font-bold text-green-700">
                                                    {formatCurrency(
                                                        getAmountRedeemed(voucher)
                                                    )}
                                                </td>

                                                <td className="px-5 py-5 text-right font-bold text-red-600">
                                                    {formatCurrency(
                                                        getRemainingBalance(
                                                            voucher
                                                        )
                                                    )}
                                                </td>

                                                <td className="px-5 py-5 text-center text-sm text-gray-600">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <CalendarDays
                                                            size={16}
                                                            className="text-gray-400"
                                                        />
                                                        {formatDate(
                                                            voucher.expiry_date
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-5 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${getStatusStyle(status)}`}
                                                    >
                                                        {getStatusIcon(status)}
                                                        {status}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleReminder(
                                                                    voucher
                                                                )
                                                            }
                                                            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-[#007c8b] hover:text-[#005b66]"
                                                        >
                                                            <Bell size={14} />
                                                            Send Reminder
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handlePenalty(
                                                                    voucher
                                                                )
                                                            }
                                                            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                                                        >
                                                            <AlertCircle
                                                                size={14}
                                                            />
                                                            Apply Penalty
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedVoucher(
                                                                    voucher
                                                                )
                                                            }
                                                            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#102d55]"
                                                        >
                                                            <Eye size={14} />
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* BOTTOM CARDS */}
                <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="min-h-[190px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <p className="text-lg font-bold text-gray-800">
                            Total Uncollected Balances
                        </p>
                        <p className="mt-1 text-sm text-gray-500">(Vouchers)</p>
                        <p className="mt-10 text-4xl font-bold text-[#102d55]">
                            {formatCurrency(totalUncollected)}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <p className="text-lg font-bold text-gray-800">
                            Balances Collection Today
                        </p>
                        <p className="mt-7 text-3xl font-bold text-[#102d55]">
                            {formatCurrency(collectionToday)}
                        </p>

                        <div className="mt-5 rounded-xl bg-gray-50 p-4">
                            <p className="font-semibold text-gray-800">
                                Recent Voucher Actions
                            </p>
                            <p className="mt-2 text-sm text-gray-600">
                                {vouchers.length
                                    ? `Latest voucher: ${getVoucherNumber(vouchers[vouchers.length - 1])}`
                                    : "No recent voucher actions."}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <p className="mb-5 text-lg font-bold text-gray-800">
                            Voucher Tools
                        </p>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() =>
                                    alert(
                                        "Bulk reminder feature selected. No messages have been sent."
                                    )
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-4 py-3 font-semibold text-white transition hover:bg-[#067f8b]"
                            >
                                <Bell size={18} />
                                Bulk Reminders
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    alert(
                                        "Student access restriction is a prototype action and has not changed access."
                                    )
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                <Ban size={18} />
                                Restrict Student Access
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    alert(
                                        "Late penalty feature selected. No penalty has been applied."
                                    )
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-4 py-3 font-semibold text-white transition hover:bg-[#067f8b]"
                            >
                                <AlertCircle size={18} />
                                Apply Late Penalties
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* ADD VOUCHER MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Cashier's Unit
                                </p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    Add Voucher
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddModal}
                                disabled={saving}
                                className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-6 p-6"
                        >
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Voucher Number
                                    </label>
                                    <input
                                        type="text"
                                        name="voucher_number"
                                        value={form.voucher_number}
                                        onChange={handleChange}
                                        placeholder="Leave blank if generated automatically"
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Student ID *
                                    </label>
                                    <input
                                        type="text"
                                        name="student_id"
                                        value={form.student_id}
                                        onChange={handleChange}
                                        placeholder="e.g. 2026-ABRA-001"
                                        required
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Voucher Type *
                                    </label>
                                    <input
                                        type="text"
                                        name="voucher_type"
                                        value={form.voucher_type}
                                        onChange={handleChange}
                                        placeholder="e.g. Academic Scholarship"
                                        required
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Assigned Value (PHP) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="assigned_value"
                                        value={form.assigned_value}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Amount Redeemed (PHP) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="amount_redeemed"
                                        value={form.amount_redeemed}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Expiry Date
                                    </label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={form.expiry_date}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Additional voucher details..."
                                        className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl bg-[#eef7f8] p-5">
                                <p className="text-sm text-gray-500">
                                    Current Pending Balance
                                </p>
                                <p className="mt-1 text-3xl font-bold text-[#102d55]">
                                    {formatCurrency(
                                        Math.max(
                                            Number(form.assigned_value || 0) -
                                                Number(
                                                    form.amount_redeemed || 0
                                                ),
                                            0
                                        )
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeAddModal}
                                    disabled={saving}
                                    className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-[#0797a6] px-6 py-3 font-semibold text-white hover:bg-[#067f8b] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Voucher"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW VOUCHER MODAL */}
            {selectedVoucher && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b p-6">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Voucher Record
                                </p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getVoucherNumber(selectedVoucher)}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedVoucher(null)}
                                className="rounded-lg p-2 hover:bg-gray-100"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="space-y-6 p-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Student ID
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {getStudentId(selectedVoucher)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Voucher Type
                                    </p>
                                    <p className="mt-1 font-semibold text-blue-700">
                                        {getVoucherType(selectedVoucher)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Expiry Date
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {formatDate(
                                            selectedVoucher.expiry_date
                                        )}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Status
                                    </p>
                                    <span
                                        className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${getStatusStyle(getStatus(selectedVoucher))}`}
                                    >
                                        {getStatusIcon(
                                            getStatus(selectedVoucher)
                                        )}
                                        {getStatus(selectedVoucher)}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="rounded-xl bg-gray-50 p-4">
                                    <p className="text-xs text-gray-500">
                                        Assigned Value
                                    </p>
                                    <p className="mt-1 text-lg font-bold">
                                        {formatCurrency(
                                            getAssignedValue(selectedVoucher)
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-green-50 p-4">
                                    <p className="text-xs text-green-700">
                                        Amount Redeemed
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-green-700">
                                        {formatCurrency(
                                            getAmountRedeemed(selectedVoucher)
                                        )}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-red-50 p-4">
                                    <p className="text-xs text-red-700">
                                        Pending Balance
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-red-700">
                                        {formatCurrency(
                                            getRemainingBalance(
                                                selectedVoucher
                                            )
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs uppercase text-gray-500">
                                    Description
                                </p>
                                <div className="rounded-xl bg-gray-50 p-4 text-gray-700">
                                    {selectedVoucher.description ||
                                        "No description provided."}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleReminder(selectedVoucher)
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-4 py-3 font-semibold text-white hover:bg-[#067f8b]"
                                >
                                    <Bell size={17} />
                                    Send Reminder
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleFinalNotice(selectedVoucher)
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    <FileText size={17} />
                                    Generate Final Notice
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleRestrictAccess(selectedVoucher)
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700 hover:bg-red-100"
                                >
                                    <Ban size={17} />
                                    Restrict Student Access
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handlePenalty(selectedVoucher)
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-4 py-3 font-semibold text-white hover:bg-[#067f8b]"
                                >
                                    <AlertCircle size={17} />
                                    Apply Late Penalty
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end border-t p-6">
                            <button
                                type="button"
                                onClick={() => setSelectedVoucher(null)}
                                className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}