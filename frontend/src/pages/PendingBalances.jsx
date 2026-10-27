import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    Eye,
    X,
    RefreshCw,
    Wallet,
    CalendarDays,
    User,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    CreditCard,
    Bell,
    Gavel,
    PhilippinePeso,
    ArrowRight,
    RotateCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

/* =========================================================
   RESPONSE NORMALIZATION
========================================================= */

function extractRecords(responseData) {
    if (Array.isArray(responseData)) {
        return responseData;
    }

    const candidates = [
        responseData?.data,
        responseData?.receipts,
        responseData?.data?.data,
        responseData?.data?.receipts,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }

        if (Array.isArray(candidate?.data)) {
            return candidate.data;
        }
    }

    return [];
}

/* =========================================================
   AMOUNT HELPERS
========================================================= */

function toAmount(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    const amount = Number(value);

    return Number.isFinite(amount) ? amount : 0;
}

function getAmountDue(record) {
    const value =
        record.original_amount ??
        record.amount_due ??
        record.total_amount ??
        record.amount ??
        0;

    return Math.max(toAmount(value), 0);
}

function getAmountPaid(record) {
    const value =
        record.amount_paid ??
        record.paid_amount ??
        record.total_paid ??
        record.amount ??
        0;

    return Math.max(toAmount(value), 0);
}

function getBalance(record) {
    const storedBalance = record.remaining_balance;

    if (
        storedBalance !== null &&
        storedBalance !== undefined &&
        storedBalance !== ""
    ) {
        return Math.max(toAmount(storedBalance), 0);
    }

    return Math.max(
        getAmountDue(record) - getAmountPaid(record),
        0
    );
}

/* =========================================================
   DATE HELPERS
========================================================= */

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/* =========================================================
   CURRENCY
========================================================= */

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(toAmount(amount));
}

/* =========================================================
   RECORD HELPERS
========================================================= */

function getReceiptNumber(record) {
    return (
        record.receipt_number ||
        record.receipt_no ||
        record.or_number ||
        `OR-${String(record.id ?? "N/A").padStart(4, "0")}`
    );
}

function getPayer(record) {
    return (
        record.payer_name ||
        record.student_name ||
        record.customer_name ||
        "Unknown Payer"
    );
}

function getStudentId(record) {
    return (
        record.student_id ||
        record.student_number ||
        record.student_no ||
        "—"
    );
}

function getProgram(record) {
    return (
        record.program ||
        record.program_name ||
        record.department ||
        record.address_department ||
        "—"
    );
}

function getPurpose(record) {
    return record.purpose || record.fee_type || "—";
}

function getPaymentStatus(record) {
    const explicitStatus = String(
        record.payment_status || record.balance_status || ""
    )
        .trim()
        .toLowerCase();

    const balance = getBalance(record);
    const paid = getAmountPaid(record);

    if (balance <= 0) {
        return "Paid";
    }

    if (
        explicitStatus === "partially paid" ||
        explicitStatus === "partial" ||
        paid > 0
    ) {
        return "Partially Paid";
    }

    return "Unpaid";
}

function getStatusStyle(status) {
    switch (status) {
        case "Paid":
            return "bg-emerald-50 text-emerald-700 ring-emerald-200";

        case "Partially Paid":
            return "bg-amber-50 text-amber-700 ring-amber-200";

        default:
            return "bg-red-50 text-red-700 ring-red-200";
    }
}

function StatusIcon({ status, size = 15 }) {
    if (status === "Paid") {
        return <CheckCircle size={size} />;
    }

    if (status === "Partially Paid") {
        return <Clock size={size} />;
    }

    return <AlertCircle size={size} />;
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
    title,
    value,
    description,
    icon: Icon,
    iconClass,
    valueClass = "text-[#102d55]",
}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">
                        {title}
                    </p>

                    <h2
                        className={`mt-2 break-words text-2xl font-bold ${valueClass}`}
                    >
                        {value}
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                        {description}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                >
                    <Icon size={23} />
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   ERROR NOTICE
========================================================= */

function ErrorNotice({ message, onRetry, loading }) {
    if (!message) {
        return null;
    }

    return (
        <div
            role="alert"
            className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div className="flex items-start gap-3">
                <AlertCircle
                    size={21}
                    className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                    <p className="font-semibold text-red-800">
                        Unable to load pending balances
                    </p>

                    <p className="mt-1 text-sm leading-5 text-red-700">
                        {message}
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <RotateCcw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                />
                Try Again
            </button>
        </div>
    );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PendingBalances() {
    const navigate = useNavigate();

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [selectedRecord, setSelectedRecord] = useState(null);

    /* =====================================================
       LOAD RECEIPTS USING THE SHARED API CLIENT
    ===================================================== */

    const loadPendingBalances = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            // The shared client supplies the configured base URL
            // and attaches the authentication token when available.
            const response = await api.get("/receipts", {
                timeout: 15000,
            });

            const allRecords = extractRecords(response.data);

            /*
             * This page calculates balances from receipt data.
             * For multiple payments per receipt, the backend should
             * return cumulative amount_paid and remaining_balance.
             */

            const pendingRecords = allRecords.filter((record) => {
                const balance = getBalance(record);

                const explicitStatus = String(
                    record.payment_status || record.status || ""
                )
                    .trim()
                    .toLowerCase();

                const isCancelled = [
                    "cancelled",
                    "canceled",
                    "void",
                    "voided",
                ].includes(explicitStatus);

                return balance > 0 && !isCancelled;
            });

            setRecords(pendingRecords);
        } catch (err) {
            console.error("Pending balances error:", err);
            console.error("Server response:", err.response?.data);

            setRecords([]);

            if (err.response?.status === 401) {
                setError(
                    "Your session has expired. Please log in again."
                );
            } else if (err.response?.status === 403) {
                setError(
                    "Your account is not authorized to view pending balances."
                );
            } else if (
                err.code === "ECONNABORTED" ||
                err.code === "ETIMEDOUT"
            ) {
                setError(
                    "The server took too long to respond. Please try again."
                );
            } else if (!err.response) {
                setError(
                    "Cannot connect to the backend. Check the API address and make sure the backend service is running."
                );
            } else {
                setError(
                    err.response?.data?.message ||
                    "An unexpected error occurred while loading the records."
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPendingBalances();
    }, [loadPendingBalances]);

    /* =====================================================
       SEARCH AND SORT
    ===================================================== */

    const filteredRecords = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...records]
            .filter((record) => {
                if (!query) {
                    return true;
                }

                const searchableText = [
                    getReceiptNumber(record),
                    getPayer(record),
                    getStudentId(record),
                    getProgram(record),
                    getPurpose(record),
                    record.description,
                    record.reference_no,
                    getPaymentStatus(record),
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(query);
            })
            .sort((a, b) => getBalance(b) - getBalance(a));
    }, [records, search]);

    /* =====================================================
       SUMMARY
    ===================================================== */

    const summary = useMemo(
        () =>
            records.reduce(
                (result, record) => {
                    result.totalBalance += getBalance(record);
                    result.totalPaid += getAmountPaid(record);
                    result.totalFees += getAmountDue(record);

                    const status = getPaymentStatus(record);

                    if (status === "Unpaid") {
                        result.unpaidCount += 1;
                    }

                    if (status === "Partially Paid") {
                        result.partiallyPaidCount += 1;
                    }

                    return result;
                },
                {
                    totalBalance: 0,
                    totalPaid: 0,
                    totalFees: 0,
                    unpaidCount: 0,
                    partiallyPaidCount: 0,
                }
            ),
        [records]
    );

    /* =====================================================
       ACTIONS
    ===================================================== */

    function handleProcessPayment(record) {
        try {
            localStorage.setItem(
                "uniteq_payment_record",
                JSON.stringify(record)
            );
        } catch (err) {
            console.error("Unable to save selected record:", err);

            setError(
                "Unable to prepare this record for payment. Please try again."
            );

            return;
        }

        setSelectedRecord(null);
        navigate("/collections");
    }

    function handleSendReminder(record) {
        // Placeholder only: no message is sent.
        window.alert(
            `Reminder preparation\n\nPayer: ${getPayer(record)}\nReceipt: ${getReceiptNumber(record)}\nOutstanding balance: ${formatCurrency(getBalance(record))}\n\nNo reminder has been sent.`
        );
    }

    function handleApplyPenalty(record) {
        // Placeholder only: no penalty is applied.
        window.alert(
            `Penalty review\n\nPayer: ${getPayer(record)}\nCurrent balance: ${formatCurrency(getBalance(record))}\n\nNo penalty has been added. Review the applicable university policy before making any adjustment.`
        );
    }

    /* =====================================================
       MODAL KEYBOARD SUPPORT
    ===================================================== */

    useEffect(() => {
        if (!selectedRecord) {
            return undefined;
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setSelectedRecord(null);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedRecord]);

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            {/* HEADER */}
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4 sm:items-center sm:gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg sm:h-16 sm:w-16">
                                <CreditCard
                                    size={30}
                                    className="text-[#102d55]"
                                />
                            </div>

                            <div className="min-w-0">
                                <p className="text-sm text-blue-100">
                                    University of Abra · Main Campus
                                </p>

                                <p className="mt-1 text-xs text-blue-200">
                                    Cashier&apos;s Unit
                                </p>

                                <h1 className="mt-2 text-2xl font-bold sm:text-3xl lg:text-4xl">
                                    Pending Balances
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                                    Monitor unpaid fees, outstanding
                                    balances, and collection follow-ups.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={loadPendingBalances}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold transition hover:bg-white hover:text-[#102d55] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                size={18}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh Records
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
                <ErrorNotice
                    message={error}
                    onRetry={loadPendingBalances}
                    loading={loading}
                />

                {/* SUMMARY CARDS */}
                <section
                    aria-label="Pending balance summary"
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <SummaryCard
                        title="Total Outstanding"
                        value={formatCurrency(summary.totalBalance)}
                        description="Remaining balances across pending records"
                        icon={PhilippinePeso}
                        iconClass="bg-red-50 text-red-600"
                        valueClass="text-red-700"
                    />

                    <SummaryCard
                        title="Total Fees"
                        value={formatCurrency(summary.totalFees)}
                        description="Original amounts for pending records"
                        icon={FileText}
                        iconClass="bg-blue-50 text-[#102d55]"
                    />

                    <SummaryCard
                        title="Amount Paid"
                        value={formatCurrency(summary.totalPaid)}
                        description="Recorded payments for pending records"
                        icon={Wallet}
                        iconClass="bg-emerald-50 text-emerald-600"
                        valueClass="text-emerald-700"
                    />

                    <SummaryCard
                        title="Pending Accounts"
                        value={records.length.toLocaleString("en-PH")}
                        description={`${summary.unpaidCount} unpaid · ${summary.partiallyPaidCount} partially paid`}
                        icon={User}
                        iconClass="bg-cyan-50 text-cyan-700"
                        valueClass="text-cyan-700"
                    />
                </section>

                {/* REGISTRY */}
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#102d55]">
                                    <CreditCard size={23} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                                        Pending Balances Registry
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Search and review outstanding
                                        collection records.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/collections")}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#067f8b]"
                            >
                                <Wallet size={18} />
                                Go to Collections
                                <ArrowRight size={17} />
                            </button>
                        </div>

                        {/* SEARCH */}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <div className="relative flex-1">
                                <Search
                                    size={19}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search payer, student ID, department, or receipt..."
                                    aria-label="Search pending balances"
                                    className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0797a6] focus:ring-4 focus:ring-[#0797a6]/10"
                                />
                            </div>

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                                >
                                    <X size={17} />
                                    Clear Search
                                </button>
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                            <span>
                                {loading
                                    ? "Loading records..."
                                    : `${filteredRecords.length} record${filteredRecords.length === 1 ? "" : "s"} shown`}
                            </span>

                            <span>
                                Sorted by highest outstanding balance
                            </span>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px]">
                            <thead className="bg-[#eef4f8]">
                                <tr>
                                    {[
                                        ["Payer", "left"],
                                        ["Student ID", "left"],
                                        ["Program / Department", "left"],
                                        ["Total Fees", "right"],
                                        ["Amount Paid", "right"],
                                        ["Balance", "right"],
                                        ["Status", "center"],
                                        ["Date", "left"],
                                        ["Actions", "center"],
                                    ].map(([heading, align]) => (
                                        <th
                                            key={heading}
                                            className={`px-4 py-4 text-${align} text-xs font-bold uppercase tracking-wide text-gray-600`}
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
                                            className="px-4 py-16 text-center"
                                        >
                                            <RefreshCw
                                                size={30}
                                                className="mx-auto animate-spin text-[#0797a6]"
                                            />

                                            <p className="mt-3 font-semibold text-gray-700">
                                                Loading pending balances
                                            </p>

                                            <p className="mt-1 text-sm text-gray-500">
                                                Please wait while records
                                                are retrieved.
                                            </p>
                                        </td>
                                    </tr>
                                ) : error && records.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-4 py-16 text-center"
                                        >
                                            <AlertCircle
                                                size={36}
                                                className="mx-auto text-red-400"
                                            />

                                            <p className="mt-3 font-semibold text-gray-800">
                                                Records could not be loaded
                                            </p>

                                            <p className="mt-1 text-sm text-gray-500">
                                                Use the Try Again button
                                                above to retry.
                                            </p>
                                        </td>
                                    </tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-4 py-16 text-center"
                                        >
                                            <CheckCircle
                                                size={40}
                                                className="mx-auto text-emerald-500"
                                            />

                                            <p className="mt-3 font-semibold text-gray-800">
                                                {search
                                                    ? "No matching records"
                                                    : "No pending balances"}
                                            </p>

                                            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
                                                {search
                                                    ? "Try another search term or clear your search."
                                                    : "No outstanding balances were found in the records returned by the server."}
                                            </p>

                                            {search && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSearch("")
                                                    }
                                                    className="mt-4 text-sm font-semibold text-[#078b99] hover:underline"
                                                >
                                                    Clear search
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((record) => {
                                        const status =
                                            getPaymentStatus(record);

                                        return (
                                            <tr
                                                key={
                                                    record.id ??
                                                    getReceiptNumber(record)
                                                }
                                                className="transition hover:bg-blue-50/40"
                                            >
                                                {/* PAYER */}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                                                            <User size={18} />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900">
                                                                {getPayer(record)}
                                                            </p>

                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {getReceiptNumber(record)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* STUDENT ID */}
                                                <td className="px-4 py-4 text-sm font-medium text-gray-700">
                                                    {getStudentId(record)}
                                                </td>

                                                {/* PROGRAM */}
                                                <td className="px-4 py-4">
                                                    <p className="font-medium text-gray-800">
                                                        {getProgram(record)}
                                                    </p>

                                                    <p className="mt-1 text-xs text-blue-600">
                                                        {getPurpose(record)}
                                                    </p>
                                                </td>

                                                {/* TOTAL FEES */}
                                                <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-gray-800">
                                                    {formatCurrency(
                                                        getAmountDue(record)
                                                    )}
                                                </td>

                                                {/* PAID */}
                                                <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-emerald-700">
                                                    {formatCurrency(
                                                        getAmountPaid(record)
                                                    )}
                                                </td>

                                                {/* BALANCE */}
                                                <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-red-600">
                                                    {formatCurrency(
                                                        getBalance(record)
                                                    )}
                                                </td>

                                                {/* STATUS */}
                                                <td className="px-4 py-4 text-center">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(status)}`}
                                                    >
                                                        <StatusIcon status={status} />
                                                        {status}
                                                    </span>
                                                </td>

                                                {/* DATE */}
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays
                                                            size={15}
                                                            className="shrink-0 text-gray-400"
                                                        />

                                                        {formatDate(
                                                            record.date ??
                                                            record.created_at
                                                        )}
                                                    </div>
                                                </td>

                                                {/* ACTIONS */}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            title="View balance details"
                                                            aria-label={`View balance for ${getPayer(record)}`}
                                                            onClick={() =>
                                                                setSelectedRecord(record)
                                                            }
                                                            className="rounded-lg bg-blue-50 p-2.5 text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                        >
                                                            <Eye size={17} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Prepare payment"
                                                            aria-label={`Prepare payment for ${getPayer(record)}`}
                                                            onClick={() =>
                                                                handleProcessPayment(record)
                                                            }
                                                            className="rounded-lg bg-cyan-50 p-2.5 text-cyan-700 transition hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                        >
                                                            <Wallet size={17} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Prepare reminder"
                                                            aria-label={`Prepare reminder for ${getPayer(record)}`}
                                                            onClick={() =>
                                                                handleSendReminder(record)
                                                            }
                                                            className="rounded-lg bg-amber-50 p-2.5 text-amber-700 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                                        >
                                                            <Bell size={17} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Review possible penalty"
                                                            aria-label={`Review possible penalty for ${getPayer(record)}`}
                                                            onClick={() =>
                                                                handleApplyPenalty(record)
                                                            }
                                                            className="rounded-lg bg-red-50 p-2.5 text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                                        >
                                                            <Gavel size={17} />
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

                    {/* TABLE FOOTER */}
                    {!loading && !error && (
                        <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Showing {filteredRecords.length} of{" "}
                                {records.length} pending record
                                {records.length === 1 ? "" : "s"}.
                            </p>

                            <p>
                                Outstanding total:{" "}
                                <span className="font-bold text-red-700">
                                    {formatCurrency(summary.totalBalance)}
                                </span>
                            </p>
                        </div>
                    )}
                </section>
            </main>

            {/* RECORD DETAILS MODAL */}
            {selectedRecord && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-5"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedRecord(null);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pending-balance-title"
                        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        {/* MODAL HEADER */}
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white p-5 sm:p-6">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#102d55]">
                                    <FileText size={24} />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Pending Balance Record
                                    </p>

                                    <h2
                                        id="pending-balance-title"
                                        className="mt-1 break-words text-xl font-bold text-[#102d55] sm:text-2xl"
                                    >
                                        {getPayer(selectedRecord)}
                                    </h2>

                                    <p className="mt-1 break-words text-sm text-gray-500">
                                        {getReceiptNumber(selectedRecord)}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedRecord(null)}
                                aria-label="Close balance details"
                                className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* MODAL BODY */}
                        <div className="space-y-6 p-5 sm:p-6">
                            {/* STATUS */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-gray-700">
                                    Payment Status
                                </p>

                                <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ring-1 ring-inset ${getStatusStyle(getPaymentStatus(selectedRecord))}`}
                                >
                                    <StatusIcon
                                        status={getPaymentStatus(selectedRecord)}
                                    />

                                    {getPaymentStatus(selectedRecord)}
                                </span>
                            </div>

                            {/* PAYER DETAILS */}
                            <div>
                                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                                    Payer Information
                                </h3>

                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <DetailItem
                                        label="Payer Name"
                                        value={getPayer(selectedRecord)}
                                    />

                                    <DetailItem
                                        label="Student ID"
                                        value={getStudentId(selectedRecord)}
                                    />

                                    <DetailItem
                                        label="Program / Department"
                                        value={getProgram(selectedRecord)}
                                    />

                                    <DetailItem
                                        label="Fee Type / Purpose"
                                        value={getPurpose(selectedRecord)}
                                    />

                                    <DetailItem
                                        label="Receipt Number"
                                        value={getReceiptNumber(selectedRecord)}
                                    />

                                    <DetailItem
                                        label="Collection Date"
                                        value={formatDate(
                                            selectedRecord.date ??
                                            selectedRecord.created_at
                                        )}
                                    />
                                </div>
                            </div>

                            {/* FINANCIAL SUMMARY */}
                            <div>
                                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-500">
                                    Financial Summary
                                </h3>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <AmountCard
                                        label="Total Fees"
                                        value={formatCurrency(
                                            getAmountDue(selectedRecord)
                                        )}
                                        className="bg-blue-50 text-[#102d55]"
                                    />

                                    <AmountCard
                                        label="Amount Paid"
                                        value={formatCurrency(
                                            getAmountPaid(selectedRecord)
                                        )}
                                        className="bg-emerald-50 text-emerald-700"
                                    />

                                    <AmountCard
                                        label="Balance"
                                        value={formatCurrency(
                                            getBalance(selectedRecord)
                                        )}
                                        className="bg-red-50 text-red-700"
                                    />
                                </div>
                            </div>

                            {/* DESCRIPTION */}
                            <div>
                                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">
                                    Description
                                </h3>

                                <div className="whitespace-pre-wrap break-words rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                                    {selectedRecord.description ||
                                        "No description provided."}
                                </div>
                            </div>

                            {/* ACTIONS */}
                            <div>
                                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                                    Available Actions
                                </h3>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleProcessPayment(selectedRecord)
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#067f8b]"
                                    >
                                        <Wallet size={17} />
                                        Process Payment
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSendReminder(selectedRecord)
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                                    >
                                        <Bell size={17} />
                                        Prepare Reminder
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleApplyPenalty(selectedRecord)
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                                    >
                                        <Gavel size={17} />
                                        Review Penalty
                                    </button>
                                </div>

                                <p className="mt-3 text-xs leading-5 text-gray-500">
                                    Reminder and penalty actions are
                                    placeholders. They do not send
                                    notifications or change financial
                                    records.
                                </p>
                            </div>
                        </div>

                        {/* MODAL FOOTER */}
                        <div className="flex justify-end border-t border-gray-200 bg-gray-50 p-5 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setSelectedRecord(null)}
                                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

/* =========================================================
   REUSABLE DETAIL ITEM
========================================================= */

function DetailItem({ label, value }) {
    return (
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                {value || "—"}
            </p>
        </div>
    );
}

/* =========================================================
   REUSABLE AMOUNT CARD
========================================================= */

function AmountCard({ label, value, className }) {
    return (
        <div className={`rounded-xl p-4 ${className}`}>
            <p className="text-xs font-medium opacity-80">{label}</p>

            <p className="mt-2 break-words text-lg font-bold">
                {value}
            </p>
        </div>
    );
}