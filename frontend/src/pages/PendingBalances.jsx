import { useEffect, useMemo, useState } from "react";
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
    ArrowRight,
    PhilippinePeso,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000/api/receipts";

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

export default function PendingBalances() {
    const navigate = useNavigate();

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [selectedRecord, setSelectedRecord] =
        useState(null);

    /* =========================================================
       LOAD PENDING BALANCES
    ========================================================= */

    useEffect(() => {
        loadPendingBalances();
    }, []);

    async function loadPendingBalances() {
        try {
            setLoading(true);

            const response = await axios.get(
                API_URL,
                {
                    headers: getHeaders(),
                }
            );

            console.log(
                "Pending balances response:",
                response.data
            );

            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];

            /*
             * Only show records that still have
             * an outstanding balance.
             */

            const pending = data.filter(
                (record) => {
                    const due = Number(
                        record.original_amount ??
                            record.amount_due ??
                            0
                    );

                    const paid = Number(
                        record.amount ??
                            record.amount_paid ??
                            0
                    );

                    const storedBalance =
                        record.remaining_balance;

                    const balance =
                        storedBalance !== null &&
                        storedBalance !== undefined
                            ? Number(storedBalance)
                            : Math.max(
                                  due - paid,
                                  0
                              );

                    return balance > 0;
                }
            );

            setRecords(pending);
        } catch (error) {
            console.error(
                "Pending balances loading error:",
                error
            );

            console.error(
                "Server response:",
                error.response?.data
            );

            setRecords([]);

            if (
                error.response?.status === 401
            ) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (
                error.response?.status === 403
            ) {
                alert(
                    "You are not authorized to view pending balances."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                        "Unable to load pending balances."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    /* =========================================================
       HELPERS
    ========================================================= */

    function getReceiptNumber(record) {
        return (
            record.receipt_number ||
            record.receipt_no ||
            `OR-${String(
                record.id || 0
            ).padStart(4, "0")}`
        );
    }

    function getPayer(record) {
        return record.payer_name || "Unknown Payer";
    }

    function getStudentId(record) {
        /*
         * Your current receipts table does not have
         * a student_id field yet.
         *
         * If you add student_id later, this will
         * automatically display it.
         */

        return (
            record.student_id ||
            record.student_number ||
            "—"
        );
    }

    function getProgram(record) {
        /*
         * For now, address_department is the closest
         * existing field to a department/program.
         */

        return (
            record.program ||
            record.program_name ||
            record.address_department ||
            "—"
        );
    }

    function getPurpose(record) {
        return record.purpose || "—";
    }

    function getAmountDue(record) {
        return Number(
            record.original_amount ??
                record.amount_due ??
                record.amount ??
                0
        );
    }

    function getAmountPaid(record) {
        return Number(
            record.amount ??
                record.amount_paid ??
                0
        );
    }

    function getBalance(record) {
        const storedBalance =
            record.remaining_balance;

        if (
            storedBalance !== null &&
            storedBalance !== undefined
        ) {
            return Math.max(
                Number(storedBalance),
                0
            );
        }

        return Math.max(
            getAmountDue(record) -
                getAmountPaid(record),
            0
        );
    }

    function getStatus(record) {
        const paid =
            getAmountPaid(record);

        const balance =
            getBalance(record);

        if (balance <= 0) {
            return "Paid";
        }

        if (paid > 0) {
            return "Partially Paid";
        }

        return "Unpaid";
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: "PHP",
            }
        ).format(Number(amount) || 0);
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
        if (status === "Paid") {
            return "bg-green-100 text-green-700";
        }

        if (
            status ===
            "Partially Paid"
        ) {
            return "bg-yellow-100 text-yellow-700";
        }

        return "bg-red-100 text-red-700";
    }

    function getStatusIcon(status) {
        if (status === "Paid") {
            return (
                <CheckCircle
                    size={15}
                />
            );
        }

        if (
            status ===
            "Partially Paid"
        ) {
            return (
                <Clock
                    size={15}
                />
            );
        }

        return (
            <AlertCircle
                size={15}
            />
        );
    }

    /* =========================================================
       SORT
    ========================================================= */

    const sortedRecords = useMemo(() => {
        return [...records].sort(
            (a, b) =>
                getBalance(b) -
                getBalance(a)
        );
    }, [records]);

    /* =========================================================
       SEARCH
    ========================================================= */

    const filteredRecords =
        sortedRecords.filter(
            (record) => {
                const searchText = `
                    ${getReceiptNumber(record)}
                    ${getPayer(record)}
                    ${getStudentId(record)}
                    ${getProgram(record)}
                    ${getPurpose(record)}
                    ${record.description || ""}
                    ${getStatus(record)}
                `.toLowerCase();

                return searchText.includes(
                    search.toLowerCase()
                );
            }
        );

    /* =========================================================
       SUMMARY
    ========================================================= */

    const totalUncollected =
        records.reduce(
            (total, record) =>
                total +
                getBalance(record),
            0
        );

    const totalAssigned =
        records.reduce(
            (total, record) =>
                total +
                getAmountDue(record),
            0
        );

    const totalPaid =
        records.reduce(
            (total, record) =>
                total +
                getAmountPaid(record),
            0
        );

    const partiallyPaidCount =
        records.filter(
            (record) =>
                getStatus(record) ===
                "Partially Paid"
        ).length;

    const unpaidCount =
        records.filter(
            (record) =>
                getStatus(record) ===
                "Unpaid"
        ).length;

    /* =========================================================
       ACTIONS
    ========================================================= */

    function handleProcessPayment(record) {
        /*
         * Save selected receipt so the Collections page
         * can later use it if you want to connect the
         * payment form.
         */

        localStorage.setItem(
            "uniteq_payment_record",
            JSON.stringify(record)
        );

        setSelectedRecord(null);

        navigate("/collections");
    }

    function handleSendReminder(record) {
        alert(
            `Payment reminder prepared for ${getPayer(
                record
            )}.\n\nOutstanding Balance: ${formatCurrency(
                getBalance(record)
            )}`
        );
    }

    function handleApplyPenalty(record) {
        alert(
            `Late penalty action selected for ${getPayer(
                record
            )}.\n\nCurrent outstanding balance: ${formatCurrency(
                getBalance(record)
            )}\n\nNo penalty has been added yet.`
        );
    }

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="min-h-screen bg-[#f5f7fa]">

            {/* =================================================
                BLUE HEADER
            ================================================= */}

            <div className="bg-[#102d55] text-white">

                <div className="max-w-[1500px] mx-auto px-6 py-7">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        <div className="flex items-center gap-5">

                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">

                                <CreditCard
                                    size={32}
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
                                    Pending Balances Page
                                </h1>

                                <p className="text-blue-100 mt-2">
                                    Monitor outstanding student fees,
                                    unpaid balances, and collection
                                    follow-ups.
                                </p>

                            </div>

                        </div>

                        <button
                            type="button"
                            onClick={
                                loadPendingBalances
                            }
                            disabled={
                                loading
                            }
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

                    {/* TOTAL UNCOLLECTED */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Uncollected Balances
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55] mt-2">
                                    {formatCurrency(
                                        totalUncollected
                                    )}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    Current pending records
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">

                                <PhilippinePeso
                                    size={24}
                                    className="text-red-600"
                                />

                            </div>

                        </div>

                    </div>

                    {/* TOTAL FEES */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Fees Assigned
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55] mt-2">
                                    {formatCurrency(
                                        totalAssigned
                                    )}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    From pending records
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                <FileText
                                    size={24}
                                    className="text-[#102d55]"
                                />

                            </div>

                        </div>

                    </div>

                    {/* TOTAL PAID */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Amount Already Paid
                                </p>

                                <h2 className="text-2xl font-bold text-green-600 mt-2">
                                    {formatCurrency(
                                        totalPaid
                                    )}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    Payments received
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">

                                <Wallet
                                    size={24}
                                    className="text-green-600"
                                />

                            </div>

                        </div>

                    </div>

                    {/* PENDING COUNT */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Pending Accounts
                                </p>

                                <h2 className="text-2xl font-bold text-[#0797a6] mt-2">
                                    {records.length}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    {partiallyPaidCount} partially paid
                                    {" • "}
                                    {unpaidCount} unpaid
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">

                                <User
                                    size={24}
                                    className="text-[#0797a6]"
                                />

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    REGISTRY
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* HEADER */}

                    <div className="p-6 border-b border-gray-200">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                            <div className="flex items-center gap-4">

                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                    <CreditCard
                                        size={25}
                                        className="text-[#102d55]"
                                    />

                                </div>

                                <div>

                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Detailed Pending Balances Registry
                                    </h2>

                                    <p className="text-sm text-gray-500 mt-1">
                                        University of Abra — Current
                                        outstanding balances
                                    </p>

                                </div>

                            </div>

                            <div className="flex gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            "/collections"
                                        )
                                    }
                                    className="inline-flex items-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-5 py-3 rounded-xl font-semibold transition"
                                >

                                    <Wallet
                                        size={18}
                                    />

                                    Collections

                                </button>

                            </div>

                        </div>

                        {/* SEARCH */}

                        <div className="relative mt-6 max-w-3xl">

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
                                placeholder="Search payer, student ID, program, receipt number..."
                                className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] focus:border-[#0797a6]"
                            />

                        </div>

                    </div>

                    {/* =================================================
                        TABLE
                    ================================================= */}

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[1350px]">

                            <thead className="bg-[#eef4f8]">

                                <tr>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Payer Name
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Student ID
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Program / Department
                                    </th>

                                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Total Fees
                                    </th>

                                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Amount Paid
                                    </th>

                                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Pending Balance
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Status
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Date
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Actions
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-100">

                                {/* LOADING */}

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan="9"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <RefreshCw
                                                size={30}
                                                className="animate-spin mx-auto mb-3"
                                            />

                                            <p className="font-semibold">
                                                Loading pending balances...
                                            </p>

                                        </td>

                                    </tr>

                                ) : filteredRecords.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="9"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <CheckCircle
                                                size={40}
                                                className="mx-auto mb-3 text-green-400"
                                            />

                                            <p className="font-semibold text-gray-700">
                                                No pending balances found.
                                            </p>

                                            <p className="text-sm mt-1">
                                                All current collection
                                                records have been paid
                                                or no records match
                                                your search.
                                            </p>

                                        </td>

                                    </tr>

                                ) : (

                                    filteredRecords.map(
                                        (record) => {

                                            const status =
                                                getStatus(
                                                    record
                                                );

                                            return (

                                                <tr
                                                    key={
                                                        record.id
                                                    }
                                                    className="hover:bg-blue-50/40 transition"
                                                >

                                                    {/* PAYER */}

                                                    <td className="px-5 py-5">

                                                        <div className="flex items-center gap-3">

                                                            <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">

                                                                <User
                                                                    size={18}
                                                                    className="text-cyan-600"
                                                                />

                                                            </div>

                                                            <div>

                                                                <p className="font-bold text-gray-900">
                                                                    {getPayer(
                                                                        record
                                                                    )}
                                                                </p>

                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {getReceiptNumber(
                                                                        record
                                                                    )}
                                                                </p>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* STUDENT ID */}

                                                    <td className="px-5 py-5">

                                                        <span className="font-semibold text-gray-700">

                                                            {getStudentId(
                                                                record
                                                            )}

                                                        </span>

                                                    </td>

                                                    {/* PROGRAM */}

                                                    <td className="px-5 py-5">

                                                        <div>

                                                            <p className="font-semibold text-gray-800">
                                                                {getProgram(
                                                                    record
                                                                )}
                                                            </p>

                                                            <p className="text-xs text-blue-600 mt-1">
                                                                {getPurpose(
                                                                    record
                                                                )}
                                                            </p>

                                                        </div>

                                                    </td>

                                                    {/* TOTAL FEES */}

                                                    <td className="px-5 py-5 text-right">

                                                        <span className="font-semibold text-gray-800">

                                                            {formatCurrency(
                                                                getAmountDue(
                                                                    record
                                                                )
                                                            )}

                                                        </span>

                                                    </td>

                                                    {/* PAID */}

                                                    <td className="px-5 py-5 text-right">

                                                        <span className="font-bold text-green-700">

                                                            {formatCurrency(
                                                                getAmountPaid(
                                                                    record
                                                                )
                                                            )}

                                                        </span>

                                                    </td>

                                                    {/* BALANCE */}

                                                    <td className="px-5 py-5 text-right">

                                                        <span className="font-bold text-red-600">

                                                            {formatCurrency(
                                                                getBalance(
                                                                    record
                                                                )
                                                            )}

                                                        </span>

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

                                                    {/* DATE */}

                                                    <td className="px-5 py-5 text-sm text-gray-600">

                                                        <div className="flex items-center gap-2">

                                                            <CalendarDays
                                                                size={16}
                                                                className="text-gray-400"
                                                            />

                                                            {formatDate(
                                                                record.date
                                                            )}

                                                        </div>

                                                    </td>

                                                    {/* ACTIONS */}

                                                    <td className="px-5 py-5">

                                                        <div className="flex items-center justify-center gap-2">

                                                            {/* VIEW */}

                                                            <button
                                                                type="button"
                                                                title="View Balance"
                                                                onClick={() =>
                                                                    setSelectedRecord(
                                                                        record
                                                                    )
                                                                }
                                                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                                                            >

                                                                <Eye
                                                                    size={17}
                                                                />

                                                            </button>

                                                            {/* PAYMENT */}

                                                            <button
                                                                type="button"
                                                                title="Process Payment"
                                                                onClick={() =>
                                                                    handleProcessPayment(
                                                                        record
                                                                    )
                                                                }
                                                                className="p-2 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition"
                                                            >

                                                                <Wallet
                                                                    size={17}
                                                                />

                                                            </button>

                                                            {/* REMINDER */}

                                                            <button
                                                                type="button"
                                                                title="Send Reminder"
                                                                onClick={() =>
                                                                    handleSendReminder(
                                                                        record
                                                                    )
                                                                }
                                                                className="p-2 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition"
                                                            >

                                                                <Bell
                                                                    size={17}
                                                                />

                                                            </button>

                                                            {/* PENALTY */}

                                                            <button
                                                                type="button"
                                                                title="Apply Late Penalty"
                                                                onClick={() =>
                                                                    handleApplyPenalty(
                                                                        record
                                                                    )
                                                                }
                                                                className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
                                                            >

                                                                <Gavel
                                                                    size={17}
                                                                />

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
                VIEW BALANCE MODAL
            ================================================= */}

            {selectedRecord && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

                        {/* MODAL HEADER */}

                        <div className="flex items-center justify-between p-6 border-b">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Pending Balance Record
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getPayer(
                                        selectedRecord
                                    )}
                                </h2>

                                <p className="text-sm text-gray-500 mt-1">
                                    {getReceiptNumber(
                                        selectedRecord
                                    )}
                                </p>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedRecord(
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

                        {/* MODAL CONTENT */}

                        <div className="p-6 space-y-6">

                            {/* PERSON INFO */}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Payer Name
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {getPayer(
                                            selectedRecord
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Student ID
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {getStudentId(
                                            selectedRecord
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Program / Department
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {getProgram(
                                            selectedRecord
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Fee Type
                                    </p>

                                    <p className="font-semibold text-blue-700 mt-1">
                                        {getPurpose(
                                            selectedRecord
                                        )}
                                    </p>

                                </div>

                            </div>

                            {/* MONEY */}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <div className="bg-blue-50 rounded-xl p-4">

                                    <p className="text-xs text-blue-700">
                                        Total Fees
                                    </p>

                                    <p className="text-lg font-bold text-[#102d55] mt-1">
                                        {formatCurrency(
                                            getAmountDue(
                                                selectedRecord
                                            )
                                        )}
                                    </p>

                                </div>

                                <div className="bg-green-50 rounded-xl p-4">

                                    <p className="text-xs text-green-700">
                                        Amount Paid
                                    </p>

                                    <p className="text-lg font-bold text-green-700 mt-1">
                                        {formatCurrency(
                                            getAmountPaid(
                                                selectedRecord
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
                                            getBalance(
                                                selectedRecord
                                            )
                                        )}
                                    </p>

                                </div>

                            </div>

                            {/* STATUS */}

                            <div>

                                <p className="text-xs uppercase text-gray-500 mb-2">
                                    Payment Status
                                </p>

                                <span
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${getStatusStyle(
                                        getStatus(
                                            selectedRecord
                                        )
                                    )}`}
                                >

                                    {getStatusIcon(
                                        getStatus(
                                            selectedRecord
                                        )
                                    )}

                                    {getStatus(
                                        selectedRecord
                                    )}

                                </span>

                            </div>

                            {/* DATE */}

                            <div className="bg-gray-50 rounded-xl p-4">

                                <div className="flex items-center gap-3">

                                    <CalendarDays
                                        size={20}
                                        className="text-gray-500"
                                    />

                                    <div>

                                        <p className="text-xs text-gray-500">
                                            Collection Date
                                        </p>

                                        <p className="font-semibold">
                                            {formatDate(
                                                selectedRecord.date
                                            )}
                                        </p>

                                    </div>

                                </div>

                            </div>

                            {/* DESCRIPTION */}

                            <div>

                                <p className="text-xs uppercase text-gray-500 mb-2">
                                    Description
                                </p>

                                <div className="bg-gray-50 rounded-xl p-4 text-gray-700">

                                    {selectedRecord.description ||
                                        "No description provided."}

                                </div>

                            </div>

                            {/* ACTION BUTTONS */}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleProcessPayment(
                                            selectedRecord
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold transition"
                                >

                                    <Wallet
                                        size={17}
                                    />

                                    Process Payment

                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleSendReminder(
                                            selectedRecord
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-semibold transition"
                                >

                                    <Bell
                                        size={17}
                                    />

                                    Reminder

                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleApplyPenalty(
                                            selectedRecord
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 font-semibold transition"
                                >

                                    <Gavel
                                        size={17}
                                    />

                                    Late Penalty

                                </button>

                            </div>

                        </div>

                        {/* FOOTER */}

                        <div className="flex justify-end p-6 border-t">

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedRecord(
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