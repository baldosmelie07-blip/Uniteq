import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    RefreshCw,
    Wallet,
    TrendingUp,
    TrendingDown,
    Scale,
    CalendarDays,
    AlertCircle,
    CheckCircle,
    Printer,
    Receipt,
    FileText,
    Download,
    Search,
    X,
    Clock,
    CircleDollarSign,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000/api";

function getHeaders() {
    const token =
        localStorage.getItem("uniteq_token") ||
        sessionStorage.getItem("uniteq_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDate(value) {
    if (!value) return "";

    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function firstValue(...values) {
    return values.find(
        (value) =>
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
    );
}

function getReceiptNumber(receipt) {
    return (
        firstValue(
            receipt.receipt_number,
            receipt.receipt_no,
            receipt.or_number,
            receipt.or_no
        ) || `OR-${String(receipt.id || 0).padStart(4, "0")}`
    );
}

function getReceiptDate(receipt) {
    return getDate(
        firstValue(
            receipt.date,
            receipt.collection_date,
            receipt.payment_date,
            receipt.created_at
        )
    );
}

function getReceiptPayer(receipt) {
    return (
        firstValue(
            receipt.payer_name,
            receipt.payer,
            receipt.student_name,
            receipt.name
        ) || "—"
    );
}

function getReceiptAmount(receipt) {
    return Number(
        firstValue(
            receipt.amount,
            receipt.amount_paid,
            receipt.amount_collected
        ) || 0
    );
}

function getVoucherNumber(voucher) {
    return (
        firstValue(
            voucher.voucher_number,
            voucher.voucherNumber,
            voucher.voucher_no
        ) || `DV-${String(voucher.id || 0).padStart(4, "0")}`
    );
}

function getVoucherDate(voucher) {
    return getDate(
        firstValue(voucher.date, voucher.payment_date, voucher.created_at)
    );
}

function getVoucherPayee(voucher) {
    return (
        firstValue(
            voucher.payee,
            voucher.payee_name,
            voucher.supplier,
            voucher.creditor
        ) || "—"
    );
}

function getVoucherOffice(voucher) {
    return firstValue(voucher.office, voucher.department) || "—";
}

function getVoucherAmount(voucher) {
    return Number(firstValue(voucher.amount, voucher.amount_paid) || 0);
}

function getVoucherStatus(voucher) {
    return String(
        firstValue(voucher.status, voucher.workflow_status) || "Pending"
    ).trim();
}

function isPaid(voucher) {
    return ["paid", "completed", "disbursed"].includes(
        getVoucherStatus(voucher).toLowerCase()
    );
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
          });
}

function unwrapRecords(response) {
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.data)) return response.data.data;
    if (Array.isArray(response.data?.receipts)) return response.data.receipts;
    if (Array.isArray(response.data?.vouchers)) return response.data.vouchers;
    return [];
}

function escapeCsv(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(rows) {
    const headers = [
        "Date",
        "Record Number",
        "Transaction Type",
        "Payee / Payer",
        "Office",
        "Status",
        "Amount (PHP)",
        "Direction",
    ];

    const lines = [
        headers.map(escapeCsv).join(","),
        ...rows.map((row) =>
            [
                row.date,
                row.number,
                row.type,
                row.description,
                row.office,
                row.status,
                row.amount.toFixed(2),
                row.direction === "in"
                    ? "Collection"
                    : row.direction === "out"
                      ? "Paid disbursement"
                      : "Unpaid disbursement",
            ]
                .map(escapeCsv)
                .join(",")
        ),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uniteq-reconciliation-${getToday()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function SummaryCard({ title, value, description, icon: Icon, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-emerald-50 text-emerald-700",
        red: "bg-red-50 text-red-700",
        cyan: "bg-cyan-50 text-cyan-700",
        amber: "bg-amber-50 text-amber-700",
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <p className="mt-3 break-words text-xl font-bold text-[#102d55] sm:text-2xl">
                        {formatCurrency(value)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{description}</p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        colors[color] || colors.blue
                    }`}
                >
                    <Icon size={21} />
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status, direction }) {
    let styles = "bg-slate-100 text-slate-700";

    if (direction === "in") {
        styles = "bg-emerald-50 text-emerald-700";
    } else if (direction === "out") {
        styles = "bg-blue-50 text-blue-700";
    } else if (direction === "pending") {
        styles = "bg-amber-50 text-amber-800";
    } else {
        const normalized = String(status).toLowerCase();

        if (normalized.includes("reject")) {
            styles = "bg-red-50 text-red-700";
        } else if (normalized.includes("approv")) {
            styles = "bg-emerald-50 text-emerald-700";
        } else if (
            normalized.includes("review") ||
            normalized.includes("pending")
        ) {
            styles = "bg-amber-50 text-amber-800";
        }
    }

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
            {status}
        </span>
    );
}

export default function AccountingReconciliation() {
    const today = getToday();
    const firstDayOfMonth = `${today.slice(0, 7)}-01`;

    const [receipts, setReceipts] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [fromDate, setFromDate] = useState(firstDayOfMonth);
    const [toDate, setToDate] = useState(today);
    const [loading, setLoading] = useState(true);
    const [receiptError, setReceiptError] = useState("");
    const [voucherError, setVoucherError] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [search, setSearch] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        setReceiptError("");
        setVoucherError("");

        const [receiptResult, voucherResult] = await Promise.allSettled([
            axios.get(`${API_BASE_URL}/receipts`, {
                headers: getHeaders(),
            }),
            axios.get(`${API_BASE_URL}/vouchers`, {
                headers: getHeaders(),
            }),
        ]);

        if (receiptResult.status === "fulfilled") {
            setReceipts(unwrapRecords(receiptResult.value));
        } else {
            console.error("Could not load receipts:", receiptResult.reason);
            setReceiptError(
                receiptResult.reason?.response?.data?.message ||
                    "Collections could not be loaded."
            );
            setReceipts([]);
        }

        if (voucherResult.status === "fulfilled") {
            setVouchers(unwrapRecords(voucherResult.value));
        } else {
            console.error("Could not load vouchers:", voucherResult.reason);
            setVoucherError(
                voucherResult.reason?.response?.data?.message ||
                    "Disbursement vouchers could not be loaded."
            );
            setVouchers([]);
        }

        setLastUpdated(new Date());
        setLoading(false);
    }, []);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    const dateRangeValid =
        !fromDate || !toDate || fromDate <= toDate;

    const filteredReceipts = useMemo(() => {
        if (!dateRangeValid) return [];

        return receipts.filter((receipt) => {
            const date = getReceiptDate(receipt);
            if (!date) return false;
            if (fromDate && date < fromDate) return false;
            if (toDate && date > toDate) return false;
            return true;
        });
    }, [receipts, fromDate, toDate, dateRangeValid]);

    const filteredVouchers = useMemo(() => {
        if (!dateRangeValid) return [];

        return vouchers.filter((voucher) => {
            const date = getVoucherDate(voucher);
            if (!date) return false;
            if (fromDate && date < fromDate) return false;
            if (toDate && date > toDate) return false;
            return true;
        });
    }, [vouchers, fromDate, toDate, dateRangeValid]);

    const totals = useMemo(() => {
        const collections = filteredReceipts.reduce(
            (sum, receipt) => sum + getReceiptAmount(receipt),
            0
        );

        const paidVouchers = filteredVouchers.filter(isPaid);
        const pendingVouchers = filteredVouchers.filter(
            (voucher) => !isPaid(voucher)
        );

        const paidOut = paidVouchers.reduce(
            (sum, voucher) => sum + getVoucherAmount(voucher),
            0
        );

        const pendingAmount = pendingVouchers.reduce(
            (sum, voucher) => sum + getVoucherAmount(voucher),
            0
        );

        return {
            collections,
            paidOut,
            pendingAmount,
            pendingCount: pendingVouchers.length,
            paidCount: paidVouchers.length,
            difference: collections - paidOut,
            receiptCount: filteredReceipts.length,
            voucherCount: filteredVouchers.length,
        };
    }, [filteredReceipts, filteredVouchers]);

    const transactions = useMemo(() => {
        const collectionRows = filteredReceipts.map((receipt) => ({
            id: `receipt-${receipt.id}`,
            date: getReceiptDate(receipt),
            number: getReceiptNumber(receipt),
            type: "Collection",
            description: getReceiptPayer(receipt),
            office:
                firstValue(receipt.address_department, receipt.department) ||
                "—",
            amount: getReceiptAmount(receipt),
            status: "Collected",
            direction: "in",
        }));

        const voucherRows = filteredVouchers.map((voucher) => ({
            id: `voucher-${voucher.id}`,
            date: getVoucherDate(voucher),
            number: getVoucherNumber(voucher),
            type: "Disbursement",
            description: getVoucherPayee(voucher),
            office: getVoucherOffice(voucher),
            amount: getVoucherAmount(voucher),
            status: getVoucherStatus(voucher),
            direction: isPaid(voucher) ? "out" : "pending",
        }));

        const allRows = [...collectionRows, ...voucherRows]
            .filter((row) => {
                if (activeTab === "collections") {
                    return row.type === "Collection";
                }
                if (activeTab === "paid") {
                    return row.type === "Disbursement" && row.direction === "out";
                }
                if (activeTab === "pending") {
                    return row.type === "Disbursement" && row.direction === "pending";
                }
                return true;
            })
            .filter((row) => {
                const query = search.trim().toLowerCase();
                if (!query) return true;

                return [
                    row.number,
                    row.type,
                    row.description,
                    row.office,
                    row.status,
                    row.date,
                ].some((value) =>
                    String(value ?? "").toLowerCase().includes(query)
                );
            })
            .sort((a, b) => b.date.localeCompare(a.date));

        return allRows;
    }, [filteredReceipts, filteredVouchers, activeTab, search]);

    const differenceStatus =
        totals.difference < 0
            ? "Paid disbursements exceed recorded collections"
            : totals.difference === 0
              ? "Collections equal paid disbursements"
              : "Recorded collections exceed paid disbursements";

    function resetDates() {
        setFromDate(firstDayOfMonth);
        setToDate(today);
    }

    function printReport() {
        window.print();
    }

    return (
        <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#102d55] text-white">
                            <Scale size={25} />
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#0797a6]">
                                University of Abra · Main Campus
                            </p>
                            <h1 className="mt-1 text-2xl font-bold text-[#102d55] sm:text-3xl">
                                Accounting Reconciliation
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Review collections and disbursement records in one place.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 print:hidden">
                        <button
                            type="button"
                            onClick={loadRecords}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() => downloadCsv(transactions)}
                            disabled={loading || transactions.length === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>

                        <button
                            type="button"
                            onClick={printReport}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#102d55] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173d70]"
                        >
                            <Printer size={16} />
                            Print Report
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
                    <div className="mb-4 flex items-center gap-2">
                        <CalendarDays size={19} className="text-[#0797a6]" />
                        <h2 className="font-bold text-[#102d55]">
                            Report Filters
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                        <div>
                            <label
                                htmlFor="fromDate"
                                className="mb-2 block text-sm font-medium text-slate-600"
                            >
                                From date
                            </label>
                            <input
                                id="fromDate"
                                type="date"
                                value={fromDate}
                                max={toDate || undefined}
                                onChange={(event) => setFromDate(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="toDate"
                                className="mb-2 block text-sm font-medium text-slate-600"
                            >
                                To date
                            </label>
                            <input
                                id="toDate"
                                type="date"
                                value={toDate}
                                min={fromDate || undefined}
                                onChange={(event) => setToDate(event.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={resetDates}
                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            This Month
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setFromDate("");
                                setToDate("");
                            }}
                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            All Dates
                        </button>
                    </div>

                    {!dateRangeValid && (
                        <p className="mt-3 text-sm font-medium text-red-600">
                            The start date must not be later than the end date.
                        </p>
                    )}

                    {lastUpdated && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={14} />
                            Last refreshed: {lastUpdated.toLocaleString("en-PH")}
                        </p>
                    )}
                </section>

                {(receiptError || voucherError) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold">
                                    Some reconciliation data could not be loaded.
                                </p>
                                {receiptError && (
                                    <p className="mt-1">
                                        Collections: {receiptError}
                                    </p>
                                )}
                                {voucherError && (
                                    <p className="mt-1">
                                        Vouchers: {voucherError}
                                    </p>
                                )}
                                <p className="mt-2 text-amber-800">
                                    The totals may be incomplete. Refresh or check the Laravel API
                                    connection before relying on this report.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="rounded-xl border border-slate-200 bg-white py-20 text-center text-slate-500">
                        <RefreshCw
                            size={30}
                            className="mx-auto mb-3 animate-spin text-[#0797a6]"
                        />
                        Loading collections and disbursement vouchers...
                    </div>
                ) : (
                    <>
                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <SummaryCard
                                title="Total Collections"
                                value={totals.collections}
                                description={`${totals.receiptCount} receipt records`}
                                icon={TrendingUp}
                                color="green"
                            />

                            <SummaryCard
                                title="Paid Disbursements"
                                value={totals.paidOut}
                                description={`${totals.paidCount} paid vouchers`}
                                icon={TrendingDown}
                                color="blue"
                            />

                            <SummaryCard
                                title="Unsettled Vouchers"
                                value={totals.pendingAmount}
                                description={`${totals.pendingCount} unpaid or uncompleted vouchers`}
                                icon={Wallet}
                                color="amber"
                            />

                            <SummaryCard
                                title="Collection Less Paid Out"
                                value={totals.difference}
                                description="Recorded collections minus paid disbursements"
                                icon={CircleDollarSign}
                                color={totals.difference < 0 ? "red" : "cyan"}
                            />
                        </section>

                        <section
                            className={`rounded-xl border p-5 ${
                                receiptError || voucherError
                                    ? "border-amber-200 bg-amber-50"
                                    : totals.difference < 0
                                      ? "border-red-200 bg-red-50"
                                      : "border-emerald-200 bg-emerald-50"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {receiptError || voucherError || totals.difference < 0 ? (
                                    <AlertCircle
                                        className="mt-0.5 shrink-0 text-amber-700"
                                        size={22}
                                    />
                                ) : (
                                    <CheckCircle
                                        className="mt-0.5 shrink-0 text-emerald-700"
                                        size={22}
                                    />
                                )}

                                <div>
                                    <h2 className="font-bold text-[#102d55]">
                                        Reconciliation Overview
                                    </h2>
                                    <p className="mt-1 text-sm font-medium text-slate-800">
                                        {receiptError || voucherError
                                            ? "Review the loading errors before relying on this comparison."
                                            : differenceStatus}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        This figure compares recorded collections with paid
                                        disbursements only. It is not proof of bank balance,
                                        available funds, or deposit status. Verify against official
                                        deposit slips, bank records, and approved accounting documents.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-[#102d55]">
                                            Transaction Records
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Search and review receipts and voucher payment statuses.
                                        </p>
                                    </div>

                                    <div className="relative w-full lg:max-w-sm print:hidden">
                                        <Search
                                            size={18}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search record, payer, payee, office..."
                                            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-cyan-100"
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={() => setSearch("")}
                                                aria-label="Clear search"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                                    {[
                                        ["all", "All Records"],
                                        ["collections", "Collections"],
                                        ["paid", "Paid Vouchers"],
                                        ["pending", "Unsettled Vouchers"],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setActiveTab(value)}
                                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                                activeTab === value
                                                    ? "bg-[#102d55] text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[950px]">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {[
                                                "Date",
                                                "Record Number",
                                                "Type",
                                                "Payee / Payer",
                                                "Office",
                                                "Status",
                                                "Amount (PHP)",
                                            ].map((heading) => (
                                                <th
                                                    key={heading}
                                                    className={`border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
                                                        heading === "Amount (PHP)"
                                                            ? "text-right"
                                                            : "text-left"
                                                    }`}
                                                >
                                                    {heading}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={7}
                                                    className="px-4 py-16 text-center text-slate-500"
                                                >
                                                    <FileText
                                                        size={30}
                                                        className="mx-auto mb-3 text-slate-300"
                                                    />
                                                    <p className="font-semibold">
                                                        No matching transactions
                                                    </p>
                                                    <p className="mt-1 text-sm">
                                                        Try another date range or search term.
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            transactions.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="transition hover:bg-slate-50"
                                                >
                                                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                                                        {formatDate(row.date)}
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-[#102d55]">
                                                        {row.number}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                                            {row.type === "Collection" ? (
                                                                <Receipt
                                                                    size={16}
                                                                    className="text-emerald-600"
                                                                />
                                                            ) : (
                                                                <FileText
                                                                    size={16}
                                                                    className="text-blue-600"
                                                                />
                                                            )}
                                                            {row.type}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-sm font-medium text-slate-800">
                                                        {row.description}
                                                    </td>

                                                    <td className="px-4 py-4 text-sm text-slate-600">
                                                        {row.office}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <StatusBadge
                                                            status={row.status}
                                                            direction={row.direction}
                                                        />
                                                    </td>

                                                    <td
                                                        className={`whitespace-nowrap px-4 py-4 text-right text-sm font-bold ${
                                                            row.direction === "out"
                                                                ? "text-blue-700"
                                                                : row.direction === "pending"
                                                                  ? "text-amber-700"
                                                                  : "text-emerald-700"
                                                        }`}
                                                    >
                                                        {row.direction === "out"
                                                            ? "− "
                                                            : row.direction === "in"
                                                              ? "+ "
                                                              : ""}
                                                        {formatCurrency(row.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    Showing {transactions.length} transaction
                                    {transactions.length === 1 ? "" : "s"}.
                                </span>
                                <span>
                                    {totals.receiptCount} receipts · {totals.voucherCount} vouchers
                                </span>
                            </div>
                        </section>
                    </>
                )}
            </main>

            <style>{`
                @media print {
                    body {
                        background: white !important;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .print\\:hidden,
                    button {
                        display: none !important;
                    }

                    main {
                        max-width: none !important;
                        padding: 0 !important;
                    }

                    table {
                        font-size: 10px !important;
                    }

                    th, td {
                        padding: 6px !important;
                    }

                    header {
                        border: 0 !important;
                    }

                    section, table {
                        break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}