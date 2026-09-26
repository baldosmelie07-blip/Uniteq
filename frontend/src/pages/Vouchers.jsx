import { useEffect, useMemo, useState } from "react";
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
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/vouchers";

/* =========================================================
   DATE
========================================================= */

function getToday() {
    return new Date().toISOString().split("T")[0];
}

/* =========================================================
   HEADERS
========================================================= */

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

/* =========================================================
   COMPONENT
========================================================= */

export default function Vouchers() {
    const [vouchers, setVouchers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [selectedVoucher, setSelectedVoucher] =
        useState(null);

    const [showAddModal, setShowAddModal] =
        useState(false);

    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        voucher_number: "",
        student_id: "",
        voucher_type: "",
        assigned_value: "",
        amount_redeemed: "",
        expiry_date: "",
        description: "",
    });

    /* =========================================================
       LOAD VOUCHERS
    ========================================================= */

    useEffect(() => {
        loadVouchers();
    }, []);

    async function loadVouchers() {
        try {
            setLoading(true);

            const response = await axios.get(
                API_URL,
                {
                    headers: getHeaders(),
                }
            );

            console.log(
                "Vouchers response:",
                response.data
            );

            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];

            setVouchers(data);
        } catch (error) {
            console.error(
                "Voucher loading error:",
                error
            );

            console.error(
                "Server response:",
                error.response?.data
            );

            setVouchers([]);

            if (error.response?.status === 401) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (
                error.response?.status === 403
            ) {
                alert(
                    "You are not authorized to view vouchers."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                        "Unable to load voucher records."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    /* =========================================================
       HELPERS
    ========================================================= */

    function getVoucherNumber(voucher) {
        return (
            voucher.voucher_number ||
            voucher.voucher_no ||
            `UABV-26-${String(
                voucher.id || 0
            ).padStart(3, "0")}`
        );
    }

    function getStudentId(voucher) {
        return (
            voucher.student_id ||
            voucher.student_number ||
            "—"
        );
    }

    function getVoucherType(voucher) {
        return (
            voucher.voucher_type ||
            voucher.type ||
            "—"
        );
    }

    function getAssignedValue(voucher) {
        return Number(
            voucher.assigned_value ??
                voucher.total_value ??
                voucher.amount_due ??
                voucher.amount ??
                0
        );
    }

    function getAmountRedeemed(voucher) {
        return Number(
            voucher.amount_redeemed ??
                voucher.redeemed_amount ??
                voucher.amount_paid ??
                0
        );
    }

    function getRemainingBalance(voucher) {
        if (
            voucher.remaining_balance !== null &&
            voucher.remaining_balance !== undefined
        ) {
            return Math.max(
                Number(voucher.remaining_balance),
                0
            );
        }

        return Math.max(
            getAssignedValue(voucher) -
                getAmountRedeemed(voucher),
            0
        );
    }

    function getStatus(voucher) {
        const assigned =
            getAssignedValue(voucher);

        const redeemed =
            getAmountRedeemed(voucher);

        const balance =
            getRemainingBalance(voucher);

        const expiryDate =
            voucher.expiry_date;

        if (
            expiryDate &&
            new Date(expiryDate) <
                new Date(
                    getToday()
                ) &&
            balance > 0
        ) {
            return "Expired";
        }

        if (
            assigned > 0 &&
            balance <= 0
        ) {
            return "Fully Redeemed";
        }

        if (
            redeemed > 0 &&
            balance > 0
        ) {
            return "Partially Redeemed";
        }

        return "Unused";
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: "PHP",
            }
        ).format(
            Number(amount) || 0
        );
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }

        return date.toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "numeric",
            }
        );
    }

    function getStatusStyle(status) {
        if (status === "Fully Redeemed") {
            return "bg-green-100 text-green-700";
        }

        if (status === "Partially Redeemed") {
            return "bg-yellow-100 text-yellow-700";
        }

        if (status === "Expired") {
            return "bg-red-100 text-red-700";
        }

        return "bg-blue-100 text-blue-700";
    }

    function getStatusIcon(status) {
        if (status === "Fully Redeemed") {
            return (
                <CheckCircle size={15} />
            );
        }

        if (status === "Partially Redeemed") {
            return (
                <Clock size={15} />
            );
        }

        if (status === "Expired") {
            return (
                <AlertCircle size={15} />
            );
        }

        return (
            <Ticket size={15} />
        );
    }

    /* =========================================================
       SORT
    ========================================================= */

    const sortedVouchers = useMemo(() => {
        return [...vouchers].sort(
            (a, b) => {
                const numberA =
                    Number(
                        String(
                            getVoucherNumber(a)
                        ).match(
                            /\d+$/ 
                        )?.[0] || 0
                    );

                const numberB =
                    Number(
                        String(
                            getVoucherNumber(b)
                        ).match(
                            /\d+$/
                        )?.[0] || 0
                    );

                return (
                    numberA -
                    numberB
                );
            }
        );
    }, [vouchers]);

    /* =========================================================
       SEARCH
    ========================================================= */

    const filteredVouchers =
        sortedVouchers.filter(
            (voucher) => {
                const text = `
                    ${getVoucherNumber(voucher)}
                    ${getStudentId(voucher)}
                    ${getVoucherType(voucher)}
                    ${voucher.description || ""}
                    ${getStatus(voucher)}
                `.toLowerCase();

                return text.includes(
                    search.toLowerCase()
                );
            }
        );

    /* =========================================================
       RESET FORM
    ========================================================= */

    function resetForm() {
        setForm({
            voucher_number: "",
            student_id: "",
            voucher_type: "",
            assigned_value: "",
            amount_redeemed: "",
            expiry_date: "",
            description: "",
        });
    }

    /* =========================================================
       OPEN ADD MODAL
    ========================================================= */

    function openAddModal() {
        resetForm();
        setShowAddModal(true);
    }

    /* =========================================================
       FORM CHANGE
    ========================================================= */

    function handleChange(e) {
        const {
            name,
            value,
        } = e.target;

        setForm(
            (previous) => ({
                ...previous,
                [name]: value,
            })
        );
    }

    /* =========================================================
       ADD VOUCHER
    ========================================================= */

    async function handleSubmit(e) {
        e.preventDefault();

        if (!form.student_id.trim()) {
            alert(
                "Please enter the Student ID."
            );
            return;
        }

        if (!form.voucher_type.trim()) {
            alert(
                "Please enter the voucher type."
            );
            return;
        }

        if (
            form.assigned_value === "" ||
            Number(form.assigned_value) < 0
        ) {
            alert(
                "Please enter a valid assigned value."
            );
            return;
        }

        if (
            form.amount_redeemed === "" ||
            Number(form.amount_redeemed) < 0
        ) {
            alert(
                "Please enter a valid redeemed amount."
            );
            return;
        }

        const assignedValue =
            Number(
                form.assigned_value
            );

        const amountRedeemed =
            Number(
                form.amount_redeemed
            );

        if (
            amountRedeemed >
            assignedValue
        ) {
            alert(
                "Amount redeemed cannot be greater than the assigned value."
            );
            return;
        }

        try {
            setSaving(true);

            const payload = {
                voucher_number:
                    form.voucher_number.trim() ||
                    null,

                student_id:
                    form.student_id.trim(),

                voucher_type:
                    form.voucher_type.trim(),

                assigned_value:
                    assignedValue,

                amount_redeemed:
                    amountRedeemed,

                remaining_balance:
                    Math.max(
                        assignedValue -
                            amountRedeemed,
                        0
                    ),

                expiry_date:
                    form.expiry_date ||
                    null,

                description:
                    form.description.trim(),
            };

            console.log(
                "Voucher payload:",
                payload
            );

            const response =
                await axios.post(
                    API_URL,
                    payload,
                    {
                        headers:
                            getHeaders(),
                    }
                );

            console.log(
                "Voucher saved:",
                response.data
            );

            alert(
                "Voucher saved successfully!"
            );

            setShowAddModal(false);

            resetForm();

            await loadVouchers();
        } catch (error) {
            console.error(
                "Voucher save error:",
                error
            );

            const status =
                error.response?.status;

            const data =
                error.response?.data;

            if (status === 422) {
                if (data?.errors) {
                    const messages =
                        Object.values(
                            data.errors
                        )
                            .flat()
                            .join(
                                "\n"
                            );

                    alert(
                        messages
                    );
                } else {
                    alert(
                        data?.message ||
                            "Please check the information entered."
                    );
                }
            } else if (
                status === 401
            ) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (
                status === 403
            ) {
                alert(
                    "You are not authorized to create vouchers."
                );
            } else {
                alert(
                    data?.message ||
                        "Something went wrong while saving the voucher."
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
            `Payment reminder prepared for Student ID: ${getStudentId(
                voucher
            )}`
        );
    }

    function handlePenalty(voucher) {
        alert(
            `Penalty action selected for Student ID: ${getStudentId(
                voucher
            )}.`
        );
    }

    function handleFinalNotice(voucher) {
        alert(
            `Final notice prepared for Voucher: ${getVoucherNumber(
                voucher
            )}`
        );
    }

    function handleRestrictAccess(voucher) {
        alert(
            `Access restriction selected for Student ID: ${getStudentId(
                voucher
            )}.`
        );
    }

    /* =========================================================
       SUMMARY
    ========================================================= */

    const totalAssigned =
        vouchers.reduce(
            (total, voucher) =>
                total +
                getAssignedValue(
                    voucher
                ),
            0
        );

    const totalRedeemed =
        vouchers.reduce(
            (total, voucher) =>
                total +
                getAmountRedeemed(
                    voucher
                ),
            0
        );

    const totalUncollected =
        vouchers.reduce(
            (total, voucher) =>
                total +
                getRemainingBalance(
                    voucher
                ),
            0
        );

    const collectionToday =
        vouchers.reduce(
            (
                total,
                voucher
            ) => {
                const date =
                    String(
                        voucher.updated_at ||
                            voucher.date ||
                            voucher.created_at ||
                            ""
                    ).substring(
                        0,
                        10
                    );

                if (
                    date ===
                    getToday()
                ) {
                    return (
                        total +
                        getAmountRedeemed(
                            voucher
                        )
                    );
                }

                return total;
            },
            0
        );

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

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        <div className="flex items-center gap-5">

                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">

                                <Ticket
                                    size={34}
                                    className="text-[#102d55]"
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
                                    Vouchers Page
                                </h1>

                                <p className="text-blue-100 mt-2">
                                    Monitor voucher assignments,
                                    redemptions, and pending balances.
                                </p>

                            </div>

                        </div>

                        <button
                            type="button"
                            onClick={loadVouchers}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-white/80 hover:bg-white hover:text-[#102d55] transition font-semibold"
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

            {/* =================================================
                MAIN
            ================================================= */}

            <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-7">

                {/* =================================================
                    SUMMARY CARDS
                ================================================= */}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

                    {/* ASSIGNED */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Assigned Values
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55] mt-2">
                                    {formatCurrency(
                                        totalAssigned
                                    )}
                                </h2>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                <FileText
                                    size={24}
                                    className="text-[#102d55]"
                                />

                            </div>

                        </div>

                    </div>

                    {/* REDEEMED */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Redeemed
                                </p>

                                <h2 className="text-2xl font-bold text-green-600 mt-2">
                                    {formatCurrency(
                                        totalRedeemed
                                    )}
                                </h2>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">

                                <Wallet
                                    size={24}
                                    className="text-green-600"
                                />

                            </div>

                        </div>

                    </div>

                    {/* TODAY */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Redemptions Today
                                </p>

                                <h2 className="text-2xl font-bold text-[#0797a6] mt-2">
                                    {formatCurrency(
                                        collectionToday
                                    )}
                                </h2>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">

                                <CalendarDays
                                    size={24}
                                    className="text-[#0797a6]"
                                />

                            </div>

                        </div>

                    </div>

                    {/* BALANCE */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Uncollected
                                </p>

                                <h2 className="text-2xl font-bold text-red-600 mt-2">
                                    {formatCurrency(
                                        totalUncollected
                                    )}
                                </h2>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">

                                <CreditCard
                                    size={24}
                                    className="text-red-600"
                                />

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    VOUCHER REGISTRY
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* TITLE */}

                    <div className="p-6 border-b border-gray-200">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                            <div className="flex items-center gap-4">

                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                    <Ticket
                                        size={25}
                                        className="text-[#102d55]"
                                    />

                                </div>

                                <div>

                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Vouchers Registry
                                    </h2>

                                    <p className="text-sm text-gray-500 mt-1">
                                        University of Abra
                                    </p>

                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    openAddModal
                                }
                                className="inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition"
                            >

                                <Plus
                                    size={19}
                                />

                                Add Voucher

                            </button>

                        </div>

                        {/* SEARCH */}

                        <div className="relative mt-6 max-w-2xl">

                            <Search
                                size={19}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder="Search voucher number, student ID, voucher type..."
                                className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] focus:border-[#0797a6]"
                            />

                        </div>

                    </div>

                    {/* =================================================
                        TABLE
                    ================================================= */}

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[1250px]">

                            <thead className="bg-[#eef4f8]">

                                <tr>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Voucher Number
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Student ID
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Voucher Type
                                    </th>

                                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Assigned Value
                                    </th>

                                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Amount Redeemed
                                    </th>

                                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Current Pending Balance
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Expiry Date
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Status
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Actions
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-100">

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan="9"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <RefreshCw
                                                size={28}
                                                className="animate-spin mx-auto mb-3"
                                            />

                                            Loading voucher records...

                                        </td>

                                    </tr>

                                ) : filteredVouchers.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="9"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <Ticket
                                                size={35}
                                                className="mx-auto mb-3 text-gray-300"
                                            />

                                            <p className="font-semibold">
                                                No voucher records found.
                                            </p>

                                            <p className="text-sm mt-1">
                                                Try another search or add a new voucher.
                                            </p>

                                        </td>

                                    </tr>

                                ) : (

                                    filteredVouchers.map(
                                        (voucher) => {

                                            const status =
                                                getStatus(
                                                    voucher
                                                );

                                            return (

                                                <tr
                                                    key={
                                                        voucher.id
                                                    }
                                                    className="hover:bg-blue-50/40 transition"
                                                >

                                                    {/* VOUCHER NUMBER */}

                                                    <td className="px-5 py-5">

                                                        <span className="font-bold text-[#102d55]">

                                                            {getVoucherNumber(
                                                                voucher
                                                            )}

                                                        </span>

                                                    </td>

                                                    {/* STUDENT ID */}

                                                    <td className="px-5 py-5">

                                                        <div className="flex items-center gap-3">

                                                            <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">

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

                                                    {/* TYPE */}

                                                    <td className="px-5 py-5">

                                                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">

                                                            <FileText
                                                                size={14}
                                                            />

                                                            {getVoucherType(
                                                                voucher
                                                            )}

                                                        </span>

                                                    </td>

                                                    {/* ASSIGNED */}

                                                    <td className="px-5 py-5 text-right font-semibold">

                                                        {formatCurrency(
                                                            getAssignedValue(
                                                                voucher
                                                            )
                                                        )}

                                                    </td>

                                                    {/* REDEEMED */}

                                                    <td className="px-5 py-5 text-right font-bold text-green-700">

                                                        {formatCurrency(
                                                            getAmountRedeemed(
                                                                voucher
                                                            )
                                                        )}

                                                    </td>

                                                    {/* BALANCE */}

                                                    <td className="px-5 py-5 text-right font-bold text-red-600">

                                                        {formatCurrency(
                                                            getRemainingBalance(
                                                                voucher
                                                            )
                                                        )}

                                                    </td>

                                                    {/* EXPIRY */}

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

                                                    {/* STATUS */}

                                                    <td className="px-5 py-5 text-center">

                                                        <span
                                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold ${getStatusStyle(
                                                                status
                                                            )}`}
                                                        >

                                                            {getStatusIcon(
                                                                status
                                                            )}

                                                            {status}

                                                        </span>

                                                    </td>

                                                    {/* ACTIONS */}

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

                                                                <Bell
                                                                    size={14}
                                                                />

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

                                                                <Eye
                                                                    size={14}
                                                                />

                                                                View

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

                {/* =================================================
                    BOTTOM DASHBOARD CARDS
                ================================================= */}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* TOTAL */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[190px]">

                        <p className="font-bold text-gray-800 text-lg">
                            Total Uncollected Balances
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                            (Vouchers)
                        </p>

                        <p className="text-4xl font-bold text-[#102d55] mt-10">

                            {formatCurrency(
                                totalUncollected
                            )}

                        </p>

                    </div>

                    {/* TODAY */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <p className="font-bold text-gray-800 text-lg">
                            Balances Collection Today
                        </p>

                        <p className="text-3xl font-bold text-[#102d55] mt-7">

                            {formatCurrency(
                                collectionToday
                            )}

                        </p>

                        <div className="mt-5 bg-gray-50 rounded-xl p-4">

                            <p className="font-semibold text-gray-800">
                                Recent Voucher Actions
                            </p>

                            <p className="text-sm text-gray-600 mt-2">

                                {vouchers.length > 0
                                    ? `Latest voucher: ${getVoucherNumber(
                                          vouchers[
                                              vouchers.length -
                                                  1
                                          ]
                                      )}`
                                    : "No recent voucher actions."}

                            </p>

                        </div>

                    </div>

                    {/* TOOLS */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <p className="font-bold text-gray-800 text-lg mb-5">
                            Voucher Tools
                        </p>

                        <div className="space-y-3">

                            <button
                                type="button"
                                onClick={() =>
                                    alert(
                                        "Bulk reminder feature selected."
                                    )
                                }
                                className="w-full inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-4 py-3 rounded-xl font-semibold transition"
                            >

                                <Bell
                                    size={18}
                                />

                                Bulk Reminders

                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    alert(
                                        "Restrict student access feature selected."
                                    )
                                }
                                className="w-full inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-semibold transition"
                            >

                                <Ban
                                    size={18}
                                />

                                Restrict Student Access

                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    alert(
                                        "Late penalty feature selected."
                                    )
                                }
                                className="w-full inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-4 py-3 rounded-xl font-semibold transition"
                            >

                                <AlertCircle
                                    size={18}
                                />

                                Apply Late Penalties

                            </button>

                        </div>

                    </div>

                </div>

            </main>

            {/* =================================================
                ADD VOUCHER MODAL
            ================================================= */}

            {showAddModal && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

                        <div className="sticky top-0 z-10 bg-white border-b px-6 py-5 flex items-center justify-between">

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
                                onClick={() =>
                                    setShowAddModal(
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

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="p-6 space-y-6"
                        >

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* VOUCHER NUMBER */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Voucher Number
                                    </label>

                                    <input
                                        type="text"
                                        name="voucher_number"
                                        value={
                                            form.voucher_number
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Leave blank to auto-generate"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                {/* STUDENT ID */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Student ID
                                    </label>

                                    <input
                                        type="text"
                                        name="student_id"
                                        value={
                                            form.student_id
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. 2026-ABRA-001"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                {/* TYPE */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Voucher Type
                                    </label>

                                    <input
                                        type="text"
                                        name="voucher_type"
                                        value={
                                            form.voucher_type
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Academic Scholarship"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                {/* ASSIGNED */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Assigned Value
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="assigned_value"
                                        value={
                                            form.assigned_value
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="0.00"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                {/* REDEEMED */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Amount Redeemed
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="amount_redeemed"
                                        value={
                                            form.amount_redeemed
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="0.00"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                {/* EXPIRY */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Expiry Date
                                    </label>

                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={
                                            form.expiry_date
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                {/* DESCRIPTION */}

                                <div className="md:col-span-2">

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Description
                                    </label>

                                    <textarea
                                        name="description"
                                        value={
                                            form.description
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        rows="4"
                                        placeholder="Additional voucher details..."
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] resize-none"
                                    />

                                </div>

                            </div>

                            {/* BALANCE */}

                            <div className="bg-[#eef7f8] rounded-xl p-5">

                                <div className="flex items-center justify-between">

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Current Pending Balance
                                        </p>

                                        <p className="text-3xl font-bold text-[#102d55] mt-1">

                                            {formatCurrency(
                                                Math.max(
                                                    Number(
                                                        form.assigned_value ||
                                                            0
                                                    ) -
                                                        Number(
                                                            form.amount_redeemed ||
                                                                0
                                                        ),
                                                    0
                                                )
                                            )}

                                        </p>

                                    </div>

                                    <CreditCard
                                        size={34}
                                        className="text-[#0797a6]"
                                    />

                                </div>

                            </div>

                            {/* BUTTONS */}

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAddModal(
                                            false
                                        )
                                    }
                                    className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="px-6 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold disabled:opacity-50"
                                >

                                    {saving
                                        ? "Saving..."
                                        : "Save Voucher"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {/* =================================================
                VIEW VOUCHER MODAL
            ================================================= */}

            {selectedVoucher && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

                        <div className="flex items-center justify-between p-6 border-b">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Voucher Record
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getVoucherNumber(
                                        selectedVoucher
                                    )}
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedVoucher(
                                        null
                                    )
                                }
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >

                                <X
                                    size={22}
                                />

                            </button>

                        </div>

                        <div className="p-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Student ID
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {getStudentId(
                                            selectedVoucher
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Voucher Type
                                    </p>

                                    <p className="font-semibold text-blue-700 mt-1">
                                        {getVoucherType(
                                            selectedVoucher
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Expiry Date
                                    </p>

                                    <p className="font-semibold mt-1">
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
                                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold mt-1 ${getStatusStyle(
                                            getStatus(
                                                selectedVoucher
                                            )
                                        )}`}
                                    >

                                        {getStatusIcon(
                                            getStatus(
                                                selectedVoucher
                                            )
                                        )}

                                        {getStatus(
                                            selectedVoucher
                                        )}

                                    </span>

                                </div>

                            </div>

                            {/* MONEY */}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <div className="bg-gray-50 rounded-xl p-4">

                                    <p className="text-xs text-gray-500">
                                        Assigned Value
                                    </p>

                                    <p className="text-lg font-bold mt-1">
                                        {formatCurrency(
                                            getAssignedValue(
                                                selectedVoucher
                                            )
                                        )}
                                    </p>

                                </div>

                                <div className="bg-green-50 rounded-xl p-4">

                                    <p className="text-xs text-green-700">
                                        Amount Redeemed
                                    </p>

                                    <p className="text-lg font-bold text-green-700 mt-1">
                                        {formatCurrency(
                                            getAmountRedeemed(
                                                selectedVoucher
                                            )
                                        )}
                                    </p>

                                </div>

                                <div className="bg-red-50 rounded-xl p-4">

                                    <p className="text-xs text-red-700">
                                        Pending Balance
                                    </p>

                                    <p className="text-lg font-bold text-red-700 mt-1">
                                        {formatCurrency(
                                            getRemainingBalance(
                                                selectedVoucher
                                            )
                                        )}
                                    </p>

                                </div>

                            </div>

                            {/* DESCRIPTION */}

                            <div>

                                <p className="text-xs uppercase text-gray-500 mb-2">
                                    Description
                                </p>

                                <div className="bg-gray-50 rounded-xl p-4 text-gray-700">

                                    {selectedVoucher.description ||
                                        "No description provided."}

                                </div>

                            </div>

                            {/* ACTION BUTTONS */}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleReminder(
                                            selectedVoucher
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-4 py-3 rounded-xl font-semibold"
                                >

                                    <Bell
                                        size={17}
                                    />

                                    Send Reminder

                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleFinalNotice(
                                            selectedVoucher
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-semibold"
                                >

                                    <FileText
                                        size={17}
                                    />

                                    Generate Final Notice

                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleRestrictAccess(
                                            selectedVoucher
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-3 rounded-xl font-semibold"
                                >

                                    <Ban
                                        size={17}
                                    />

                                    Restrict Student Access

                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handlePenalty(
                                            selectedVoucher
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-4 py-3 rounded-xl font-semibold"
                                >

                                    <AlertCircle
                                        size={17}
                                    />

                                    Apply Late Penalty

                                </button>

                            </div>

                        </div>

                        <div className="flex justify-end p-6 border-t">

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedVoucher(
                                        null
                                    )
                                }
                                className="px-5 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
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