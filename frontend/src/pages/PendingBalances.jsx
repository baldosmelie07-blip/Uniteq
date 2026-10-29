
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

function getToday() {
    return new Date().toISOString().split("T")[0];
}

export default function PendingBalances() {
    const navigate = useNavigate();

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    // ---------------------------------------------------------
    // LOAD PENDING BALANCES
    // ---------------------------------------------------------

    const loadPendingBalances = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            // Uses the shared API instance and its auth interceptor.
            const response = await api.get("/receipts");

            const data = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.data)
                    ? response.data.data
                    : [];

            const pending = data.filter((record) => {
                const due = Number(
                    record.original_amount ??
                    record.amount_due ??
                    record.total_amount ??
                    record.amount ??
                    0
                );

                // Do not treat the full receipt amount as a partial
                // payment unless the backend explicitly supplies it
                // as amount_paid.
                const paid = Number(record.amount_paid ?? 0);

                const storedBalance = record.remaining_balance;

                const balance =
                    storedBalance !== null &&
                    storedBalance !== undefined
                        ? Number(storedBalance)
                        : Math.max(due - paid, 0);

                return Number.isFinite(balance) && balance > 0;
            });

            setRecords(pending);
        } catch (error) {
            console.error("Pending balances loading error:", error);
            console.error("API response:", error.response?.data);

            setRecords([]);

            if (error.response?.status === 401) {
                setErrorMessage(
                    "Your session is invalid or has expired. Please log in again."
                );
            } else if (error.response?.status === 403) {
                setErrorMessage(
                    "You are not authorized to view pending balances."
                );
            } else if (!error.response) {
                setErrorMessage(
                    "Cannot connect to the UniTeq server. Make sure Laravel is running."
                );
            } else {
                setErrorMessage(
                    error.response?.data?.message ||
                    "Unable to load pending balances."
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPendingBalances();
    }, [loadPendingBalances]);

    // ---------------------------------------------------------
    // HELPERS
    // ---------------------------------------------------------

    function getReceiptNumber(record) {
        return (
            record.receipt_number ||
            record.receipt_no ||
            `OR-${String(record.id || 0).padStart(4, "0")}`
        );
    }

    function getPayer(record) {
        return (
            record.payer_name ||
            record.payer ||
            record.student_name ||
            "Unknown Payer"
        );
    }

    function getStudentId(record) {
        return (
            record.student_id ||
            record.student_number ||
            "—"
        );
    }

    function getProgram(record) {
        return (
            record.program ||
            record.program_name ||
            record.address_department ||
            record.department ||
            "—"
        );
    }

    function getPurpose(record) {
        return record.purpose || record.description || "—";
    }

    function getAmountDue(record) {
        return Number(
            record.original_amount ??
            record.amount_due ??
            record.total_amount ??
            record.amount ??
            0
        ) || 0;
    }

    function getAmountPaid(record) {
        return Number(record.amount_paid ?? 0) || 0;
    }

    function getBalance(record) {
        const storedBalance = record.remaining_balance;

        if (
            storedBalance !== null &&
            storedBalance !== undefined
        ) {
            return Math.max(Number(storedBalance) || 0, 0);
        }

        return Math.max(
            getAmountDue(record) - getAmountPaid(record),
            0
        );
    }

    function getStatus(record) {
        const paid = getAmountPaid(record);
        const balance = getBalance(record);

        if (balance <= 0) return "Paid";
        if (paid > 0) return "Partially Paid";

        return "Unpaid";
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(Number(amount) || 0);
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function getStatusStyle(status) {
        if (status === "Paid") {
            return "bg-green-100 text-green-700";
        }

        if (status === "Partially Paid") {
            return "bg-yellow-100 text-yellow-700";
        }

        return "bg-red-100 text-red-700";
    }

    function getStatusIcon(status) {
        if (status === "Paid") return <CheckCircle size={15} />;
        if (status === "Partially Paid") return <Clock size={15} />;

        return <AlertCircle size={15} />;
    }

    // ---------------------------------------------------------
    // SEARCH AND SUMMARY
    // ---------------------------------------------------------

    const filteredRecords = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...records]
            .sort((a, b) => getBalance(b) - getBalance(a))
            .filter((record) => {
                if (!query) return true;

                const searchable = [
                    getReceiptNumber(record),
                    getPayer(record),
                    getStudentId(record),
                    getProgram(record),
                    getPurpose(record),
                    getStatus(record),
                ].join(" ").toLowerCase();

                return searchable.includes(query);
            });
    }, [records, search]);

    const totalUncollected = records.reduce(
        (total, record) => total + getBalance(record),
        0
    );

    const totalAssigned = records.reduce(
        (total, record) => total + getAmountDue(record),
        0
    );

    const totalPaid = records.reduce(
        (total, record) => total + getAmountPaid(record),
        0
    );

    const partiallyPaidCount = records.filter(
        (record) => getStatus(record) === "Partially Paid"
    ).length;

    const unpaidCount = records.filter(
        (record) => getStatus(record) === "Unpaid"
    ).length;

    // ---------------------------------------------------------
    // ACTIONS
    // ---------------------------------------------------------

    function handleProcessPayment(record) {
        try {
            localStorage.setItem(
                "uniteq_payment_record",
                JSON.stringify(record)
            );

            navigate("/collections");
        } catch (error) {
            console.error("Unable to save selected record:", error);
            alert("Unable to prepare this record for payment.");
        }
    }

    function handleSendReminder(record) {
        alert(
            `Payment reminder prepared for ${getPayer(record)}.\n\n` +
            `Receipt: ${getReceiptNumber(record)}\n` +
            `Outstanding balance: ${formatCurrency(getBalance(record))}\n\n` +
            "This is a preview only. No message has been sent."
        );
    }

    function handleApplyPenalty(record) {
        alert(
            `Late penalty action selected for ${getPayer(record)}.\n\n` +
            `Current outstanding balance: ${formatCurrency(getBalance(record))}\n\n` +
            "No penalty has been added. Penalties should only be applied after authorization."
        );
    }

    // ---------------------------------------------------------
    // PAGE
    // ---------------------------------------------------------

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-6 py-7 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
                            <CreditCard size={32} className="text-[#102d55]" />
                        </div>

                        <div>
                            <p className="text-sm text-blue-100">
                                University of Abra | Main Campus • Cashier's Unit
                            </p>
                            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                                Pending Balances
                            </h1>
                            <p className="mt-2 text-blue-100">
                                Monitor outstanding balances and collection follow-ups.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={loadPendingBalances}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/80 px-5 py-3 font-semibold transition hover:bg-white hover:text-[#102d55] disabled:opacity-60"
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
                {errorMessage && (
                    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 shrink-0" size={20} />
                            <div>
                                <p className="font-semibold">
                                    Unable to load pending balances
                                </p>
                                <p className="mt-1 text-sm">{errorMessage}</p>
                            </div>
                        </div>

                        {errorMessage.toLowerCase().includes("session") && (
                            <button
                                type="button"
                                onClick={() => navigate("/")}
                                className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800"
                            >
                                Go to Login
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={loadPendingBalances}
                            className="rounded-lg border border-red-300 px-4 py-2 font-semibold hover:bg-red-100"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Total Uncollected Balances"
                        value={formatCurrency(totalUncollected)}
                        note="Outstanding amount"
                        icon={<PhilippinePeso size={24} className="text-red-600" />}
                        iconBg="bg-red-50"
                    />

                    <SummaryCard
                        label="Total Fees Assigned"
                        value={formatCurrency(totalAssigned)}
                        note="For pending records"
                        icon={<FileText size={24} className="text-[#102d55]" />}
                        iconBg="bg-blue-50"
                    />

                    <SummaryCard
                        label="Amount Already Paid"
                        value={formatCurrency(totalPaid)}
                        note="Payments recorded"
                        icon={<Wallet size={24} className="text-green-600" />}
                        iconBg="bg-green-50"
                    />

                    <SummaryCard
                        label="Pending Accounts"
                        value={String(records.length)}
                        note={`${partiallyPaidCount} partially paid • ${unpaidCount} unpaid`}
                        icon={<User size={24} className="text-[#0797a6]" />}
                        iconBg="bg-cyan-50"
                    />
                </div>

                {/* REGISTRY */}
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                                    <CreditCard size={25} className="text-[#102d55]" />
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                                        Detailed Pending Balances Registry
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Current outstanding collection records
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => navigate("/collections")}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-5 py-3 font-semibold text-white transition hover:bg-[#067f8b]"
                            >
                                <Wallet size={18} />
                                Collections
                            </button>
                        </div>

                        <div className="relative mt-6 max-w-3xl">
                            <Search
                                size={19}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search payer, student ID, program, receipt number..."
                                className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-[#0797a6]"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1250px]">
                            <thead className="bg-[#eef4f8]">
                                <tr>
                                    {[
                                        ["Payer Name", "left"],
                                        ["Student ID", "left"],
                                        ["Program / Department", "left"],
                                        ["Total Fees", "right"],
                                        ["Amount Paid", "right"],
                                        ["Pending Balance", "right"],
                                        ["Status", "center"],
                                        ["Date", "left"],
                                        ["Actions", "center"],
                                    ].map(([heading, alignment]) => (
                                        <th
                                            key={heading}
                                            className={`px-5 py-4 text-${alignment} text-xs font-bold uppercase text-gray-600`}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center text-gray-500">
                                            <RefreshCw size={30} className="mx-auto mb-3 animate-spin" />
                                            <p className="font-semibold">Loading pending balances...</p>
                                        </td>
                                    </tr>
                                ) : filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-16 text-center text-gray-500">
                                            <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
                                            <p className="font-semibold text-gray-700">
                                                {errorMessage
                                                    ? "Records could not be loaded."
                                                    : "No pending balances found."}
                                            </p>
                                            <p className="mt-1 text-sm">
                                                {errorMessage
                                                    ? "Resolve the error above and try again."
                                                    : "No records match your search, or there are no outstanding balances."}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((record) => {
                                        const status = getStatus(record);

                                        return (
                                            <tr key={record.id} className="transition hover:bg-blue-50/40">
                                                <td className="px-5 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50">
                                                            <User size={18} className="text-cyan-600" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">
                                                                {getPayer(record)}
                                                            </p>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {getReceiptNumber(record)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-5 font-semibold text-gray-700">
                                                    {getStudentId(record)}
                                                </td>

                                                <td className="px-5 py-5">
                                                    <p className="font-semibold text-gray-800">
                                                        {getProgram(record)}
                                                    </p>
                                                    <p className="mt-1 text-xs text-blue-600">
                                                        {getPurpose(record)}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-5 text-right font-semibold text-gray-800">
                                                    {formatCurrency(getAmountDue(record))}
                                                </td>

                                                <td className="px-5 py-5 text-right font-bold text-green-700">
                                                    {formatCurrency(getAmountPaid(record))}
                                                </td>

                                                <td className="px-5 py-5 text-right font-bold text-red-600">
                                                    {formatCurrency(getBalance(record))}
                                                </td>

                                                <td className="px-5 py-5 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${getStatusStyle(status)}`}>
                                                        {getStatusIcon(status)}
                                                        {status}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-5 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays size={16} className="text-gray-400" />
                                                        {formatDate(record.date || record.created_at)}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-5">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <ActionButton
                                                            title="View Balance"
                                                            className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                            onClick={() => setSelectedRecord(record)}
                                                        >
                                                            <Eye size={17} />
                                                        </ActionButton>

                                                        <ActionButton
                                                            title="Process Payment"
                                                            className="bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                                                            onClick={() => handleProcessPayment(record)}
                                                        >
                                                            <Wallet size={17} />
                                                        </ActionButton>

                                                        <ActionButton
                                                            title="Prepare Reminder"
                                                            className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                                            onClick={() => handleSendReminder(record)}
                                                        >
                                                            <Bell size={17} />
                                                        </ActionButton>

                                                        <ActionButton
                                                            title="Penalty Information"
                                                            className="bg-red-50 text-red-700 hover:bg-red-100"
                                                            onClick={() => handleApplyPenalty(record)}
                                                        >
                                                            <Gavel size={17} />
                                                        </ActionButton>
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
            </main>

            {/* VIEW BALANCE MODAL */}
            {selectedRecord && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedRecord(null);
                        }
                    }}
                >
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b p-6">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Pending Balance Record
                                </p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getPayer(selectedRecord)}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {getReceiptNumber(selectedRecord)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedRecord(null)}
                                className="rounded-lg p-2 hover:bg-gray-100"
                                aria-label="Close details"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="space-y-6 p-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <Detail label="Payer Name" value={getPayer(selectedRecord)} />
                                <Detail label="Student ID" value={getStudentId(selectedRecord)} />
                                <Detail label="Program / Department" value={getProgram(selectedRecord)} />
                                <Detail label="Fee Type" value={getPurpose(selectedRecord)} />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <MoneyCard
                                    label="Total Fees"
                                    value={formatCurrency(getAmountDue(selectedRecord))}
                                    className="bg-blue-50 text-[#102d55]"
                                />
                                <MoneyCard
                                    label="Amount Paid"
                                    value={formatCurrency(getAmountPaid(selectedRecord))}
                                    className="bg-green-50 text-green-700"
                                />
                                <MoneyCard
                                    label="Pending Balance"
                                    value={formatCurrency(getBalance(selectedRecord))}
                                    className="bg-red-50 text-red-700"
                                />
                            </div>

                            <div>
                                <p className="mb-2 text-xs uppercase text-gray-500">
                                    Payment Status
                                </p>
                                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${getStatusStyle(getStatus(selectedRecord))}`}>
                                    {getStatusIcon(getStatus(selectedRecord))}
                                    {getStatus(selectedRecord)}
                                </span>
                            </div>

                            <div className="rounded-xl bg-gray-50 p-4">
                                <div className="flex items-center gap-3">
                                    <CalendarDays size={20} className="text-gray-500" />
                                    <div>
                                        <p className="text-xs text-gray-500">Collection Date</p>
                                        <p className="font-semibold">
                                            {formatDate(selectedRecord.date || selectedRecord.created_at)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs uppercase text-gray-500">
                                    Description
                                </p>
                                <div className="rounded-xl bg-gray-50 p-4 text-gray-700">
                                    {selectedRecord.description || "No description provided."}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => handleProcessPayment(selectedRecord)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-4 py-3 font-semibold text-white transition hover:bg-[#067f8b]"
                                >
                                    <Wallet size={17} />
                                    Process Payment
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSendReminder(selectedRecord)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-50 px-4 py-3 font-semibold text-yellow-700 hover:bg-yellow-100"
                                >
                                    <Bell size={17} />
                                    Reminder
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleApplyPenalty(selectedRecord)}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700 hover:bg-red-100"
                                >
                                    <Gavel size={17} />
                                    Late Penalty
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end border-t p-6">
                            <button
                                type="button"
                                onClick={() => setSelectedRecord(null)}
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

// ---------------------------------------------------------
// SMALL REUSABLE COMPONENTS
// ---------------------------------------------------------

function SummaryCard({ label, value, note, icon, iconBg }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-gray-500">{label}</p>
                    <h2 className="mt-2 break-words text-2xl font-bold text-[#102d55]">
                        {value}
                    </h2>
                    <p className="mt-2 text-xs text-gray-500">{note}</p>
                </div>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function ActionButton({ title, className, onClick, children }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className={`rounded-lg p-2 transition ${className}`}
        >
            {children}
        </button>
    );
}

function Detail({ label, value }) {
    return (
        <div>
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="mt-1 font-semibold">{value}</p>
        </div>
    );
}

function MoneyCard({ label, value, className }) {
    return (
        <div className={`rounded-xl p-4 ${className}`}>
            <p className="text-xs">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
        </div>
    );
}
