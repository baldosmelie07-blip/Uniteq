import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Search,
    Plus,
    Eye,
    X,
    RefreshCw,
    FileText,
    Wallet,
    CalendarDays,
    CheckCircle,
    Clock,
    AlertCircle,
    CreditCard,
    Receipt,
    Banknote,
    Building2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

const API_URL = `${API_BASE_URL}/vouchers`;

const api = axios.create({
    timeout: 15000,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

const STATUSES = [
    "Received from Accounting",
    "For Payment",
    "Released",
    "Cancelled",
];

const EMPTY_FORM = {
    voucherNumber: "",
    date: new Date().toISOString().slice(0, 10),
    payee: "",
    address: "",
    office: "",
    purpose: "",
    amount: "",
    amountWords: "",
    preparedBy: "",
    checkedBy: "",
    approvedBy: "",
    receivedBy: "",
    dateReceived: new Date().toISOString().slice(0, 10),
    dateReleased: "",
    paymentMethod: "",
    referenceNumber: "",
    remarks: "",
    status: "Received from Accounting",
};

/* =========================================================
   HELPERS
========================================================= */

function getToken() {
    const keys = [
        "uniteq_token",
        "token",
        "access_token",
        "auth_token",
    ];

    for (const storage of [localStorage, sessionStorage]) {
        for (const key of keys) {
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

    return [];
}

function getToday() {
    const date = new Date();
    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getStatusStyle(status) {
    switch (status) {
        case "Released":
            return "bg-green-100 text-green-700";

        case "For Payment":
            return "bg-blue-100 text-blue-700";

        case "Cancelled":
            return "bg-red-100 text-red-700";

        default:
            return "bg-amber-100 text-amber-700";
    }
}

function getStatusIcon(status) {
    switch (status) {
        case "Released":
            return <CheckCircle size={15} />;

        case "For Payment":
            return <Clock size={15} />;

        case "Cancelled":
            return <AlertCircle size={15} />;

        default:
            return <Receipt size={15} />;
    }
}

/* Convert database voucher fields to the API's expected payload. */
function voucherToPayload(voucher, paymentDetails = {}) {
    return {
        voucherNumber: voucher.voucher_number,
        date: String(voucher.date || "").slice(0, 10),
        payee: voucher.payee || "",
        address: voucher.address || "",
        office: voucher.office || "",
        purpose: voucher.purpose || "",
        amount: Number(voucher.amount || 0),
        amountWords: voucher.amount_words || "",
        preparedBy: voucher.prepared_by || "",
        checkedBy: voucher.checked_by || "",
        approvedBy: voucher.approved_by || "",
        receivedBy: voucher.received_by || "",
        dateReceived:
            paymentDetails.dateReceived ??
            (voucher.date_received
                ? String(voucher.date_received).slice(0, 10)
                : ""),
        dateReleased:
            paymentDetails.dateReleased ??
            (voucher.date_released
                ? String(voucher.date_released).slice(0, 10)
                : ""),
        paymentMethod:
            paymentDetails.paymentMethod ??
            voucher.payment_method ??
            "",
        referenceNumber:
            paymentDetails.referenceNumber ??
            voucher.reference_number ??
            "",
        remarks:
            paymentDetails.remarks ??
            voucher.remarks ??
            "",
        status: paymentDetails.status ?? voucher.status ?? "Received from Accounting",
    };
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Vouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 8;

    const [pageError, setPageError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);

    const [form, setForm] = useState(EMPTY_FORM);

    const [paymentForm, setPaymentForm] = useState({
        status: "",
        dateReceived: "",
        dateReleased: "",
        paymentMethod: "",
        referenceNumber: "",
        remarks: "",
    });

    /* =====================================================
       LOAD RECORDS
    ===================================================== */

    const loadVouchers = useCallback(async () => {
        setLoading(true);
        setPageError("");

        if (!getToken()) {
            setVouchers([]);
            setPageError(
                "No login token was found. Please log out and log in again."
            );
            setLoading(false);
            return;
        }

        try {
            const response = await api.get(API_URL, {
                headers: getHeaders(),
            });

            setVouchers(getResponseList(response));
        } catch (error) {
            console.error("Disbursement loading error:", error);
            console.error("Server response:", error.response?.data);

            setVouchers([]);

            if (error.response?.status === 401) {
                setPageError(
                    "Your login session is invalid. Please log out and log in again."
                );
            } else if (error.response?.status === 403) {
                setPageError(
                    "Your account is not authorized to view disbursement records."
                );
            } else if (error.response?.status === 404) {
                setPageError(
                    "The vouchers API route was not found. Check backend/routes/api.php."
                );
            } else {
                setPageError(
                    getErrorMessage(
                        error,
                        "Unable to load disbursement records."
                    )
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVouchers();
    }, [loadVouchers]);

    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredVouchers = useMemo(() => {
        const query = search.trim().toLowerCase();

        const result = vouchers.filter((voucher) => {
            const searchable = [
                voucher.voucher_number,
                voucher.payee,
                voucher.office,
                voucher.purpose,
                voucher.status,
                voucher.payment_method,
                voucher.reference_number,
            ]
                .join(" ")
                .toLowerCase();

            return searchable.includes(query);
        });

        return result.sort((a, b) => {
            return new Date(b.created_at || b.date) -
                new Date(a.created_at || a.date);
        });
    }, [vouchers, search]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredVouchers.length / itemsPerPage)
    );

    const paginatedVouchers = filteredVouchers.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    useEffect(() => {
        setPage(1);
    }, [search]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    /* =====================================================
       SUMMARY
    ===================================================== */

    const totalDisbursements = vouchers.reduce(
        (total, voucher) => total + Number(voucher.amount || 0),
        0
    );

    const releasedVouchers = vouchers.filter(
        (voucher) => voucher.status === "Released"
    );

    const totalReleased = releasedVouchers.reduce(
        (total, voucher) => total + Number(voucher.amount || 0),
        0
    );

    const pendingVouchers = vouchers.filter(
        (voucher) =>
            voucher.status === "Received from Accounting" ||
            voucher.status === "For Payment"
    );

    const totalPending = pendingVouchers.reduce(
        (total, voucher) => total + Number(voucher.amount || 0),
        0
    );

    const releasedToday = releasedVouchers.filter(
        (voucher) =>
            String(voucher.date_released || "").slice(0, 10) === getToday()
    );

    const releasedTodayAmount = releasedToday.reduce(
        (total, voucher) => total + Number(voucher.amount || 0),
        0
    );

    /* =====================================================
       FORM HANDLING
    ===================================================== */

    function handleFormChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function resetForm() {
        setForm({
            ...EMPTY_FORM,
            date: getToday(),
            dateReceived: getToday(),
        });
    }

    function openAddModal() {
        resetForm();
        setShowAddModal(true);
    }

    function closeAddModal() {
        if (!saving) {
            setShowAddModal(false);
            resetForm();
        }
    }

    /* =====================================================
       CREATE DISBURSEMENT RECORD
    ===================================================== */

    async function handleSubmit(event) {
        event.preventDefault();

        if (!getToken()) {
            alert("Please log out and log in again.");
            return;
        }

        if (!form.voucherNumber.trim()) {
            alert("Please enter the Accounting voucher number.");
            return;
        }

        if (!form.payee.trim()) {
            alert("Please enter the payee or recipient.");
            return;
        }

        if (!form.purpose.trim()) {
            alert("Please enter the purpose or particulars.");
            return;
        }

        if (
            form.amount === "" ||
            !Number.isFinite(Number(form.amount)) ||
            Number(form.amount) < 0
        ) {
            alert("Please enter a valid voucher amount.");
            return;
        }

        const payload = {
            voucherNumber: form.voucherNumber.trim(),
            date: form.date,
            payee: form.payee.trim(),
            address: form.address.trim(),
            office: form.office.trim(),
            purpose: form.purpose.trim(),
            amount: Number(form.amount),
            amountWords: form.amountWords.trim(),
            preparedBy: form.preparedBy.trim(),
            checkedBy: form.checkedBy.trim(),
            approvedBy: form.approvedBy.trim(),
            receivedBy: form.receivedBy.trim(),
            dateReceived: form.dateReceived || null,
            dateReleased: null,
            paymentMethod: "",
            referenceNumber: "",
            remarks: form.remarks.trim(),
            status: "Received from Accounting",
        };

        setSaving(true);
        setPageError("");
        setSuccessMessage("");

        try {
            const response = await api.post(API_URL, payload, {
                headers: getHeaders(),
            });

            setSuccessMessage(
                response.data?.message ||
                    "Disbursement record successfully saved."
            );

            setShowAddModal(false);
            resetForm();

            await loadVouchers();
        } catch (error) {
            console.error("Disbursement save error:", error);
            console.error("Server response:", error.response?.data);

            alert(
                getErrorMessage(
                    error,
                    "Unable to save the disbursement record."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       VIEW RECORD
    ===================================================== */

    function openDetails(voucher) {
        setSelectedVoucher(voucher);

        setPaymentForm({
            status: voucher.status || "Received from Accounting",
            dateReceived: voucher.date_received
                ? String(voucher.date_received).slice(0, 10)
                : "",
            dateReleased: voucher.date_released
                ? String(voucher.date_released).slice(0, 10)
                : "",
            paymentMethod: voucher.payment_method || "",
            referenceNumber: voucher.reference_number || "",
            remarks: voucher.remarks || "",
        });
    }

    function closeDetails() {
        if (!saving) {
            setSelectedVoucher(null);
        }
    }

    function handlePaymentChange(event) {
        const { name, value } = event.target;

        setPaymentForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    /* =====================================================
       UPDATE PAYMENT DETAILS
    ===================================================== */

    async function handleUpdatePayment(event) {
        event.preventDefault();

        if (!selectedVoucher) return;

        if (!getToken()) {
            alert("Please log out and log in again.");
            return;
        }

        if (
            paymentForm.status === "Released" &&
            !paymentForm.dateReleased
        ) {
            alert("Please enter the payment release date.");
            return;
        }

        if (
            paymentForm.status === "Released" &&
            !paymentForm.paymentMethod
        ) {
            alert("Please select a payment method.");
            return;
        }

        const payload = voucherToPayload(
            selectedVoucher,
            paymentForm
        );

        if (payload.status === "Released" && !payload.dateReleased) {
            payload.dateReleased = getToday();
        }

        setSaving(true);
        setPageError("");

        try {
            const response = await api.put(
                `${API_URL}/${selectedVoucher.id}`,
                payload,
                { headers: getHeaders() }
            );

            setSuccessMessage(
                response.data?.message ||
                    "Payment details successfully updated."
            );

            setSelectedVoucher(null);

            await loadVouchers();
        } catch (error) {
            console.error("Payment update error:", error);
            console.error("Server response:", error.response?.data);

            alert(
                getErrorMessage(
                    error,
                    "Unable to update the payment details."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       SUMMARY CARD
    ===================================================== */

    function SummaryCard({ title, amount, icon, color, description }) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm text-gray-500">{title}</p>
                        <h2 className={`mt-2 text-2xl font-bold ${color}`}>
                            {formatCurrency(amount)}
                        </h2>
                        <p className="mt-1 text-xs text-gray-400">
                            {description}
                        </p>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                        {icon}
                    </div>
                </div>
            </div>
        );
    }

    function Field({ label, value }) {
        return (
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                </p>
                <p className="mt-1 break-words font-medium text-gray-800">
                    {value || "—"}
                </p>
            </div>
        );
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            {/* HEADER */}
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-6 py-7 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white">
                            <Receipt size={30} className="text-[#102d55]" />
                        </div>

                        <div>
                            <p className="text-sm text-blue-100">
                                University of Abra · Main Campus · Cashier's Unit
                            </p>
                            <h1 className="mt-1 text-3xl font-bold">
                                Disbursement Records
                            </h1>
                            <p className="mt-1 text-sm text-blue-100">
                                Record and monitor payments based on approved vouchers received from Accounting.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={loadVouchers}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/70 px-5 py-3 font-semibold hover:bg-white hover:text-[#102d55] disabled:opacity-50"
                    >
                        <RefreshCw
                            size={18}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-6 px-6 py-8">
                {/* MESSAGES */}
                {pageError && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle size={20} className="shrink-0" />
                        <div>
                            <p className="font-semibold">
                                Unable to load disbursement records
                            </p>
                            <p className="mt-1">{pageError}</p>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                        <div className="flex items-center gap-2">
                            <CheckCircle size={18} />
                            {successMessage}
                        </div>
                        <button
                            type="button"
                            onClick={() => setSuccessMessage("")}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* SUMMARY CARDS */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Total Disbursements"
                        amount={totalDisbursements}
                        description={`${vouchers.length} recorded vouchers`}
                        color="text-[#102d55]"
                        icon={<FileText size={25} className="text-[#102d55]" />}
                    />

                    <SummaryCard
                        title="Total Released"
                        amount={totalReleased}
                        description={`${releasedVouchers.length} released vouchers`}
                        color="text-green-600"
                        icon={<CheckCircle size={25} className="text-green-600" />}
                    />

                    <SummaryCard
                        title="Pending Payments"
                        amount={totalPending}
                        description={`${pendingVouchers.length} pending vouchers`}
                        color="text-amber-600"
                        icon={<Clock size={25} className="text-amber-600" />}
                    />

                    <SummaryCard
                        title="Released Today"
                        amount={releasedTodayAmount}
                        description={`${releasedToday.length} released today`}
                        color="text-cyan-700"
                        icon={<CalendarDays size={25} className="text-cyan-700" />}
                    />
                </section>

                {/* REGISTRY */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-5">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Disbursement Registry
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Approved vouchers received from the Accounting Unit
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={openAddModal}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0797a6] px-5 py-3 font-semibold text-white hover:bg-[#067f8b]"
                            >
                                <Plus size={19} />
                                Record Disbursement
                            </button>
                        </div>

                        <div className="relative mt-5 max-w-xl">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search voucher number, payee, office, or status..."
                                className="w-full rounded-lg border border-gray-300 py-3 pl-11 pr-4 outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-[#0797a6]/20"
                            />
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px]">
                            <thead className="bg-[#eef4f8]">
                                <tr>
                                    {[
                                        "Voucher Number",
                                        "Date",
                                        "Payee",
                                        "Office",
                                        "Purpose",
                                        "Amount",
                                        "Status",
                                        "Action",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-600"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-gray-500">
                                            <RefreshCw
                                                size={26}
                                                className="mx-auto mb-3 animate-spin"
                                            />
                                            Loading disbursement records...
                                        </td>
                                    </tr>
                                ) : paginatedVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <Receipt
                                                size={36}
                                                className="mx-auto mb-3 text-gray-300"
                                            />
                                            <p className="font-semibold text-gray-700">
                                                No disbursement records found.
                                            </p>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Add a record received from Accounting or try another search.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedVouchers.map((voucher) => (
                                        <tr
                                            key={voucher.id}
                                            className="transition hover:bg-blue-50/40"
                                        >
                                            <td className="px-5 py-4 font-bold text-[#102d55]">
                                                {voucher.voucher_number}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                {formatDate(voucher.date)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-800">
                                                    {voucher.payee}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {voucher.address || "No address"}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                {voucher.office || "—"}
                                            </td>

                                            <td className="max-w-[220px] px-5 py-4 text-sm text-gray-600">
                                                <p className="line-clamp-2">
                                                    {voucher.purpose}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-right font-bold text-gray-900">
                                                {formatCurrency(voucher.amount)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${getStatusStyle(voucher.status)}`}
                                                >
                                                    {getStatusIcon(voucher.status)}
                                                    {voucher.status || "Received from Accounting"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() => openDetails(voucher)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    <div className="flex flex-col justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center">
                        <p className="text-sm text-gray-500">
                            Showing{" "}
                            {filteredVouchers.length === 0
                                ? 0
                                : (page - 1) * itemsPerPage + 1}
                            {" "}to{" "}
                            {Math.min(page * itemsPerPage, filteredVouchers.length)}
                            {" "}of {filteredVouchers.length} records
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((previous) => previous - 1)}
                                className="rounded-lg border border-gray-300 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <span className="px-3 text-sm font-semibold text-gray-700">
                                Page {page} of {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((previous) => previous + 1)}
                                className="rounded-lg border border-gray-300 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* WORKFLOW NOTE */}
                <section className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <div className="flex items-start gap-3">
                        <Building2 size={22} className="mt-0.5 shrink-0 text-[#102d55]" />
                        <div>
                            <h3 className="font-bold text-[#102d55]">
                                Disbursement Workflow
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-gray-700">
                                Accounting prepares, checks, and approves the disbursement voucher.
                                The approved voucher is forwarded to the Cashier's Unit.
                                The Cashier records the voucher, processes the payment, and updates
                                its status when the payment is released.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* =================================================
                ADD DISBURSEMENT MODAL
            ================================================= */}

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Cashier's Unit
                                </p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    Record Disbursement
                                </h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Enter the details from the approved Accounting voucher.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddModal}
                                disabled={saving}
                                className="rounded-lg p-2 hover:bg-gray-100"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 p-6">
                            <div>
                                <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
                                    <FileText size={18} />
                                    Voucher Information
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Voucher Number *
                                        </label>
                                        <input
                                            name="voucherNumber"
                                            value={form.voucherNumber}
                                            onChange={handleFormChange}
                                            required
                                            placeholder="Enter Accounting voucher number"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Voucher Date *
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={form.date}
                                            onChange={handleFormChange}
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Payee / Recipient *
                                        </label>
                                        <input
                                            name="payee"
                                            value={form.payee}
                                            onChange={handleFormChange}
                                            required
                                            placeholder="Name of payee"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Address
                                        </label>
                                        <input
                                            name="address"
                                            value={form.address}
                                            onChange={handleFormChange}
                                            placeholder="Payee address"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Office / Department
                                        </label>
                                        <input
                                            name="office"
                                            value={form.office}
                                            onChange={handleFormChange}
                                            placeholder="Office or department"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Amount (PHP) *
                                        </label>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={form.amount}
                                            onChange={handleFormChange}
                                            min="0"
                                            step="0.01"
                                            required
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Purpose / Particulars *
                                        </label>
                                        <textarea
                                            name="purpose"
                                            value={form.purpose}
                                            onChange={handleFormChange}
                                            rows={3}
                                            required
                                            placeholder="Enter the purpose stated in the voucher"
                                            className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Amount in Words
                                        </label>
                                        <input
                                            name="amountWords"
                                            value={form.amountWords}
                                            onChange={handleFormChange}
                                            placeholder="Amount written in words"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-5">
                                <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
                                    <Building2 size={18} />
                                    Accounting Approval Information
                                </h3>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {[
                                        ["preparedBy", "Prepared By"],
                                        ["checkedBy", "Checked By"],
                                        ["approvedBy", "Approved By"],
                                        ["receivedBy", "Received By (Cashier)"],
                                    ].map(([name, label]) => (
                                        <div key={name}>
                                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                                                {label}
                                            </label>
                                            <input
                                                name={name}
                                                value={form[name]}
                                                onChange={handleFormChange}
                                                placeholder={label}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                            />
                                        </div>
                                    ))}

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Date Received by Cashier
                                        </label>
                                        <input
                                            type="date"
                                            name="dateReceived"
                                            value={form.dateReceived}
                                            onChange={handleFormChange}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Remarks
                                </label>
                                <textarea
                                    name="remarks"
                                    value={form.remarks}
                                    onChange={handleFormChange}
                                    rows={2}
                                    placeholder="Optional notes"
                                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                />
                            </div>

                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                New records will automatically receive the status
                                <strong> Received from Accounting</strong>.
                            </div>

                            <div className="flex flex-col-reverse justify-end gap-3 border-t pt-5 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={closeAddModal}
                                    disabled={saving}
                                    className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-lg bg-[#0797a6] px-6 py-3 font-semibold text-white hover:bg-[#067f8b] disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Disbursement"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================
                VIEW AND UPDATE PAYMENT MODAL
            ================================================= */}

            {selectedVoucher && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Disbursement Record
                                </p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {selectedVoucher.voucher_number}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeDetails}
                                disabled={saving}
                                className="rounded-lg p-2 hover:bg-gray-100"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="space-y-6 p-6">
                            {/* VOUCHER DETAILS */}
                            <div>
                                <h3 className="mb-4 font-bold text-gray-800">
                                    Voucher Information
                                </h3>

                                <div className="grid grid-cols-1 gap-5 rounded-lg bg-gray-50 p-5 sm:grid-cols-2">
                                    <Field
                                        label="Voucher Number"
                                        value={selectedVoucher.voucher_number}
                                    />
                                    <Field
                                        label="Voucher Date"
                                        value={formatDate(selectedVoucher.date)}
                                    />
                                    <Field
                                        label="Payee / Recipient"
                                        value={selectedVoucher.payee}
                                    />
                                    <Field
                                        label="Address"
                                        value={selectedVoucher.address}
                                    />
                                    <Field
                                        label="Office / Department"
                                        value={selectedVoucher.office}
                                    />
                                    <Field
                                        label="Amount"
                                        value={formatCurrency(selectedVoucher.amount)}
                                    />
                                    <div className="sm:col-span-2">
                                        <Field
                                            label="Purpose / Particulars"
                                            value={selectedVoucher.purpose}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Field
                                            label="Amount in Words"
                                            value={selectedVoucher.amount_words}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ACCOUNTING DETAILS */}
                            <div>
                                <h3 className="mb-4 font-bold text-gray-800">
                                    Accounting Approval Information
                                </h3>

                                <div className="grid grid-cols-1 gap-5 rounded-lg bg-gray-50 p-5 sm:grid-cols-2">
                                    <Field
                                        label="Prepared By"
                                        value={selectedVoucher.prepared_by}
                                    />
                                    <Field
                                        label="Checked By"
                                        value={selectedVoucher.checked_by}
                                    />
                                    <Field
                                        label="Approved By"
                                        value={selectedVoucher.approved_by}
                                    />
                                    <Field
                                        label="Received By"
                                        value={selectedVoucher.received_by}
                                    />
                                    <Field
                                        label="Date Received"
                                        value={formatDate(selectedVoucher.date_received)}
                                    />
                                </div>
                            </div>

                            {/* PAYMENT DETAILS */}
                            <form
                                onSubmit={handleUpdatePayment}
                                className="space-y-5 border-t pt-5"
                            >
                                <div>
                                    <h3 className="flex items-center gap-2 font-bold text-gray-800">
                                        <Banknote size={19} />
                                        Cashier Payment Details
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Update the payment information when processing or releasing the payment.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Payment Status *
                                    </label>
                                    <select
                                        name="status"
                                        value={paymentForm.status}
                                        onChange={handlePaymentChange}
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                    >
                                        {STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Date Received
                                        </label>
                                        <input
                                            type="date"
                                            name="dateReceived"
                                            value={paymentForm.dateReceived}
                                            onChange={handlePaymentChange}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Date Released
                                            {paymentForm.status === "Released" && " *"}
                                        </label>
                                        <input
                                            type="date"
                                            name="dateReleased"
                                            value={paymentForm.dateReleased}
                                            onChange={handlePaymentChange}
                                            required={paymentForm.status === "Released"}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Payment Method
                                            {paymentForm.status === "Released" && " *"}
                                        </label>
                                        <select
                                            name="paymentMethod"
                                            value={paymentForm.paymentMethod}
                                            onChange={handlePaymentChange}
                                            required={paymentForm.status === "Released"}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        >
                                            <option value="">Select payment method</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Check">Check</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                                            Reference / Check Number
                                        </label>
                                        <input
                                            name="referenceNumber"
                                            value={paymentForm.referenceNumber}
                                            onChange={handlePaymentChange}
                                            placeholder="Optional reference number"
                                            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                                        Remarks
                                    </label>
                                    <textarea
                                        name="remarks"
                                        value={paymentForm.remarks}
                                        onChange={handlePaymentChange}
                                        rows={3}
                                        placeholder="Enter payment notes or remarks"
                                        className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6]"
                                    />
                                </div>

                                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                    <p className="text-sm text-gray-600">
                                        Voucher Amount
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-[#102d55]">
                                        {formatCurrency(selectedVoucher.amount)}
                                    </p>
                                </div>

                                <div className="flex flex-col-reverse justify-end gap-3 border-t pt-5 sm:flex-row">
                                    <button
                                        type="button"
                                        onClick={closeDetails}
                                        disabled={saving}
                                        className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                                    >
                                        Close
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0797a6] px-6 py-3 font-semibold text-white hover:bg-[#067f8b] disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <>
                                                <RefreshCw size={17} className="animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={17} />
                                                Save Payment Details
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}