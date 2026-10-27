import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    Wallet,
    Receipt,
    FileText,
    Clock3,
    Search,
    RefreshCw,
    Plus,
    ArrowUpRight,
    ArrowDownLeft,
    CalendarDays,
    ShieldCheck,
    Activity,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CheckCircle2,
    Eye,
    Landmark,
    FileCheck,
    TrendingUp,
} from "lucide-react";
import api from "../api/api";

const PAGE_SIZE = 8;

const money = (amount) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(amount) || 0);

function getArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.receipts)) return data.receipts;
    if (Array.isArray(data?.vouchers)) return data.vouchers;
    if (Array.isArray(data?.recent)) return data.recent;
    if (Array.isArray(data?.logs)) return data.logs;
    return [];
}

function getDate(item) {
    return (
        item?.date ||
        item?.collection_date ||
        item?.voucher_date ||
        item?.created_at ||
        null
    );
}

function parseDate(value) {
    if (!value) return null;

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);

        const date = new Date(year, month, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function displayDate(value) {
    const date = parseDate(value);

    if (!date) return "—";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getReceiptAmount(item) {
    return (
        Number(
            item?.amount ??
                item?.total_amount ??
                item?.collection_amount ??
                0
        ) || 0
    );
}

function getVoucherAmount(item) {
    return Number(item?.amount ?? item?.total_amount ?? 0) || 0;
}

function getReceiptNumber(item) {
    return (
        item?.receipt_number ||
        item?.or_number ||
        item?.reference_no ||
        `OR-${item?.id ?? "—"}`
    );
}

function getVoucherNumber(item) {
    return (
        item?.voucher_number ||
        item?.dv_number ||
        item?.voucher_no ||
        item?.reference_no ||
        `DV-${item?.id ?? "—"}`
    );
}

function getReceiptName(item) {
    return (
        item?.payer_name ||
        item?.received_from ||
        item?.payor ||
        item?.student_name ||
        item?.name ||
        item?.purpose ||
        "Collection"
    );
}

function getVoucherName(item) {
    return (
        item?.payee_name ||
        item?.payee ||
        item?.name ||
        item?.purpose ||
        "Disbursement"
    );
}

function normalizeStatus(status) {
    const value = String(status || "Pending").trim().toLowerCase();

    if (value.includes("reject") || value.includes("cancel")) {
        return "Rejected";
    }

    if (value.includes("return") || value.includes("correction")) {
        return "Returned";
    }

    if (
        value.includes("paid") ||
        value.includes("completed") ||
        value.includes("issued")
    ) {
        return "Completed";
    }

    if (value.includes("approv")) return "Approved";

    if (value.includes("review") || value.includes("verification")) {
        return "Under Review";
    }

    if (value.includes("pending")) return "Pending";

    return status || "Recorded";
}

function StatusBadge({ status }) {
    const normalized = normalizeStatus(status);

    const styles = {
        Completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        Approved: "bg-blue-50 text-blue-700 ring-blue-100",
        Pending: "bg-amber-50 text-amber-700 ring-amber-100",
        "Under Review": "bg-violet-50 text-violet-700 ring-violet-100",
        Rejected: "bg-rose-50 text-rose-700 ring-rose-100",
        Returned: "bg-orange-50 text-orange-700 ring-orange-100",
        Recorded: "bg-slate-100 text-slate-600 ring-slate-200",
    };

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${
                styles[normalized] || styles.Recorded
            }`}
        >
            {normalized}
        </span>
    );
}

function SummaryCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    loading,
}) {
    const iconStyles = {
        blue: "bg-blue-50 text-blue-700",
        teal: "bg-teal-50 text-teal-700",
        orange: "bg-orange-50 text-orange-700",
        violet: "bg-violet-50 text-violet-700",
    };

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium leading-5 text-slate-500">
                        {title}
                    </p>

                    <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-[27px]">
                        {loading ? (
                            <span className="text-base text-slate-400">
                                Loading...
                            </span>
                        ) : (
                            value
                        )}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        iconStyles[color] || iconStyles.blue
                    }`}
                >
                    <Icon size={21} strokeWidth={1.8} />
                </div>
            </div>
        </section>
    );
}

function QuickAction({ to, icon: Icon, title, description, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-700 group-hover:bg-blue-100",
        teal: "bg-teal-50 text-teal-700 group-hover:bg-teal-100",
        violet: "bg-violet-50 text-violet-700 group-hover:bg-violet-100",
        orange: "bg-orange-50 text-orange-700 group-hover:bg-orange-100",
    };

    return (
        <Link
            to={to}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-blue-200 hover:bg-slate-50"
        >
            <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                    colors[color] || colors.blue
                }`}
            >
                <Icon size={19} />
            </span>

            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-800">
                    {title}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                    {description}
                </span>
            </span>

            <ArrowUpRight
                size={16}
                className="shrink-0 text-slate-400 transition group-hover:text-blue-700"
            />
        </Link>
    );
}

function EmptyState({ icon: Icon = Receipt, message }) {
    return (
        <div className="px-4 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Icon size={23} />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-700">
                {message}
            </p>

            <p className="mt-1 text-xs text-slate-400">
                Records will appear here when available.
            </p>
        </div>
    );
}

function ActivityItem({ activity }) {
    const action = String(activity?.action || "ACTIVITY")
        .replace(/_/g, " ")
        .toUpperCase();

    const actor =
        activity?.user_name ||
        activity?.user?.name ||
        activity?.actor?.name ||
        (activity?.user_id ? `User #${activity.user_id}` : "System");

    const timestamp = activity?.created_at || activity?.action_at;
    const date = timestamp ? new Date(timestamp) : null;
    const validDate = date && !Number.isNaN(date.getTime());

    const actionColor =
        action.includes("DELETE") || action.includes("REJECT")
            ? "bg-rose-50 text-rose-700"
            : action.includes("CREATE") || action.includes("APPROV")
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700";

    return (
        <div className="flex gap-3 px-5 py-4 transition hover:bg-slate-50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <Activity size={17} />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                        {actor}
                    </span>

                    <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${actionColor}`}
                    >
                        {action}
                    </span>
                </div>

                <p className="mt-1 break-words text-xs leading-5 text-slate-600">
                    {activity?.description || "Activity recorded"}
                </p>

                <p className="mt-1 text-[11px] text-slate-400">
                    {activity?.module || "General"}
                    {validDate
                        ? ` · ${date.toLocaleString("en-PH", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                          })}`
                        : ""}
                </p>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [receipts, setReceipts] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [activities, setActivities] = useState([]);

    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);

    const [error, setError] = useState("");
    const [activityError, setActivityError] = useState("");

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(0);

    const currentUser = useMemo(() => {
        try {
            return JSON.parse(
                localStorage.getItem("uniteq_user") ||
                    sessionStorage.getItem("uniteq_user") ||
                    "null"
            );
        } catch {
            return null;
        }
    }, []);

    const isAdministrator =
        String(currentUser?.role || "").trim().toLowerCase() ===
        "system administrator";

    const today = useMemo(() => new Date(), []);
    const todayKey = `${today.getFullYear()}-${String(
        today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const results = await Promise.allSettled([
                api.get("/receipts"),
                api.get("/vouchers"),
            ]);

            const receiptsResult = results[0];
            const vouchersResult = results[1];

            if (
                receiptsResult.status === "rejected" &&
                vouchersResult.status === "rejected"
            ) {
                throw new Error(
                    "Unable to load financial records. Check your connection and API configuration, then try again."
                );
            }

            const receiptRecords =
                receiptsResult.status === "fulfilled"
                    ? getArray(receiptsResult.value.data)
                    : [];

            const voucherRecords =
                vouchersResult.status === "fulfilled"
                    ? getArray(vouchersResult.value.data)
                    : [];

            setReceipts(receiptRecords);
            setVouchers(voucherRecords);

            if (
                receiptsResult.status === "rejected" ||
                vouchersResult.status === "rejected"
            ) {
                setError(
                    "Some financial records could not be loaded. The summary may be incomplete."
                );
            }
        } catch (err) {
            console.error("Dashboard loading error:", err);
            setReceipts([]);
            setVouchers([]);
            setError(
                err.message ||
                    "Unable to load dashboard data. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const loadActivities = useCallback(async () => {
        setActivityLoading(true);
        setActivityError("");

        try {
            const response = await api.get("/activity-logs/summary");
            setActivities(getArray(response.data));
        } catch (err) {
            console.error("Activity loading error:", err);
            setActivities([]);
            setActivityError(
                "Recent staff activity is currently unavailable."
            );
        } finally {
            setActivityLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
        loadActivities();
    }, [loadDashboardData, loadActivities]);

    const totalCollections = useMemo(
        () => receipts.reduce((sum, item) => sum + getReceiptAmount(item), 0),
        [receipts]
    );

    const totalDisbursements = useMemo(
        () => vouchers.reduce((sum, item) => sum + getVoucherAmount(item), 0),
        [vouchers]
    );

    const todaysCollections = useMemo(
        () =>
            receipts.reduce((sum, item) => {
                const date = parseDate(getDate(item));

                if (!date) return sum;

                const itemDateKey = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

                return itemDateKey === todayKey
                    ? sum + getReceiptAmount(item)
                    : sum;
            }, 0),
        [receipts, todayKey]
    );

    const pendingVouchers = useMemo(
        () =>
            vouchers.filter((item) =>
                ["Pending", "Under Review", "Returned"].includes(
                    normalizeStatus(item.status)
                )
            ).length,
        [vouchers]
    );

    const transactions = useMemo(() => {
        const receiptItems = receipts.map((item) => ({
            id: item.id,
            reference: getReceiptNumber(item),
            party: getReceiptName(item),
            date: getDate(item),
            amount: getReceiptAmount(item),
            status: item.status || "Recorded",
            type: "Collection",
            route: "/receipts",
            searchText: [
                getReceiptNumber(item),
                getReceiptName(item),
                item.purpose,
                item.description,
                item.status,
                "receipt collection",
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
        }));

        const voucherItems = vouchers.map((item) => ({
            id: item.id,
            reference: getVoucherNumber(item),
            party: getVoucherName(item),
            date: getDate(item),
            amount: getVoucherAmount(item),
            status: item.status || "Pending",
            type: "Disbursement",
            route: "/vouchers",
            searchText: [
                getVoucherNumber(item),
                getVoucherName(item),
                item.purpose,
                item.description,
                item.status,
                "voucher disbursement",
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase(),
        }));

        return [...receiptItems, ...voucherItems].sort((a, b) => {
            const dateA = parseDate(a.date)?.getTime() || 0;
            const dateB = parseDate(b.date)?.getTime() || 0;

            if (dateA !== dateB) return dateB - dateA;

            return Number(b.id || 0) - Number(a.id || 0);
        });
    }, [receipts, vouchers]);

    const filteredTransactions = useMemo(() => {
        const query = search.trim().toLowerCase();

        return transactions.filter((item) => {
            const matchesSearch =
                !query || item.searchText.includes(query);

            const matchesType =
                typeFilter === "All" || item.type === typeFilter;

            const matchesStatus =
                statusFilter === "All" ||
                normalizeStatus(item.status) === statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [transactions, search, typeFilter, statusFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredTransactions.length / PAGE_SIZE)
    );

    const visibleTransactions = filteredTransactions.slice(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE
    );

    useEffect(() => {
        setPage(0);
    }, [search, typeFilter, statusFilter]);

    useEffect(() => {
        if (page >= totalPages) {
            setPage(Math.max(0, totalPages - 1));
        }
    }, [page, totalPages]);

    function exportTransactions() {
        const headers = [
            "Date",
            "Reference",
            "Type",
            "Payee or Source",
            "Status",
            "Amount (PHP)",
        ];

        const rows = filteredTransactions.map((item) => [
            displayDate(item.date),
            item.reference,
            item.type,
            item.party,
            normalizeStatus(item.status),
            item.amount.toFixed(2),
        ]);

        const csvValue = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const csv = [headers, ...rows]
            .map((row) => row.map(csvValue).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `uniteq-transactions-${todayKey}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Landmark size={14} />
                        University of Abra
                        <span className="text-slate-300">/</span>
                        Cashier's Unit
                    </div>

                    <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Financial Overview
                    </h1>

                    <p className="mt-1.5 text-sm text-slate-500">
                        Monitor collections, disbursements, and transaction
                        status in one workspace.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            loadDashboardData();
                            loadActivities();
                        }}
                        disabled={loading || activityLoading}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading || activityLoading
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                        Refresh
                    </button>

                    <Link
                        to="/collections"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                    >
                        <Plus size={17} />
                        New Transaction
                    </Link>
                </div>
            </section>

            {error && (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2">
                        <CircleAlert size={18} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>

                    <button
                        type="button"
                        onClick={loadDashboardData}
                        className="self-start rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold hover:bg-amber-100"
                    >
                        Try again
                    </button>
                </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    title="Today's Collections"
                    value={money(todaysCollections)}
                    subtitle="Recorded for today"
                    icon={Wallet}
                    color="teal"
                    loading={loading}
                />

                <SummaryCard
                    title="Total Collections"
                    value={money(totalCollections)}
                    subtitle={`${receipts.length} receipt records`}
                    icon={ArrowDownLeft}
                    color="blue"
                    loading={loading}
                />

                <SummaryCard
                    title="Total Disbursements"
                    value={money(totalDisbursements)}
                    subtitle={`${vouchers.length} voucher records`}
                    icon={ArrowUpRight}
                    color="orange"
                    loading={loading}
                />

                <SummaryCard
                    title="Pending Vouchers"
                    value={pendingVouchers.toLocaleString("en-PH")}
                    subtitle="Awaiting further action"
                    icon={Clock3}
                    color="violet"
                    loading={loading}
                />
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    Recent Transactions
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Collections and disbursement vouchers
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={exportTransactions}
                                disabled={filteredTransactions.length === 0}
                                className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
                            >
                                Export CSV
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_160px_160px]">
                            <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
                                <Search
                                    size={16}
                                    className="shrink-0 text-slate-400"
                                />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search reference or payee..."
                                    aria-label="Search transactions"
                                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
                                />
                            </div>

                            <select
                                value={typeFilter}
                                onChange={(event) =>
                                    setTypeFilter(event.target.value)
                                }
                                aria-label="Filter transaction type"
                                className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400"
                            >
                                <option value="All">All transaction types</option>
                                <option value="Collection">Collections</option>
                                <option value="Disbursement">
                                    Disbursements
                                </option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(event) =>
                                    setStatusFilter(event.target.value)
                                }
                                aria-label="Filter transaction status"
                                className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400"
                            >
                                <option value="All">All statuses</option>
                                <option value="Completed">Completed</option>
                                <option value="Approved">Approved</option>
                                <option value="Pending">Pending</option>
                                <option value="Under Review">Under Review</option>
                                <option value="Returned">Returned</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Date
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Reference
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Payee / Source
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Type
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Status
                                    </th>
                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Amount
                                    </th>
                                    <th className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        View
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-12 text-center text-sm text-slate-500"
                                        >
                                            <RefreshCw
                                                size={19}
                                                className="mx-auto mb-2 animate-spin text-blue-600"
                                            />
                                            Loading transactions...
                                        </td>
                                    </tr>
                                ) : visibleTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <EmptyState
                                                icon={Receipt}
                                                message={
                                                    transactions.length === 0
                                                        ? "No transactions yet"
                                                        : "No matching transactions"
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    visibleTransactions.map((item) => (
                                        <tr
                                            key={`${item.type}-${item.id}`}
                                            className="transition hover:bg-blue-50/30"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                                                {displayDate(item.date)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span className="text-xs font-semibold text-slate-800">
                                                    {item.reference}
                                                </span>
                                            </td>

                                            <td className="max-w-[220px] px-5 py-4">
                                                <p className="truncate text-xs font-medium text-slate-800">
                                                    {item.party}
                                                </p>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 text-xs ${
                                                        item.type === "Collection"
                                                            ? "text-teal-700"
                                                            : "text-orange-700"
                                                    }`}
                                                >
                                                    {item.type === "Collection" ? (
                                                        <ArrowDownLeft size={14} />
                                                    ) : (
                                                        <ArrowUpRight size={14} />
                                                    )}
                                                    {item.type}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge status={item.status} />
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-right text-xs font-semibold text-slate-800">
                                                {money(item.amount)}
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <Link
                                                    to={item.route}
                                                    aria-label={`View ${item.reference}`}
                                                    title="View records"
                                                    className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                            Showing{" "}
                            {filteredTransactions.length === 0
                                ? 0
                                : page * PAGE_SIZE + 1}
                            –
                            {Math.min(
                                (page + 1) * PAGE_SIZE,
                                filteredTransactions.length
                            )}{" "}
                            of {filteredTransactions.length} records
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) => Math.max(0, current - 1))
                                }
                                disabled={page === 0}
                                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={15} />
                                Previous
                            </button>

                            <span className="px-1 text-xs text-slate-500">
                                {page + 1} / {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(totalPages - 1, current + 1)
                                    )
                                }
                                disabled={page >= totalPages - 1}
                                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                </div>

                <aside className="space-y-5">
                    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                        <h2 className="text-base font-bold text-slate-900">
                            Quick Actions
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Common cashier operations
                        </p>

                        <div className="mt-4 space-y-3">
                            <QuickAction
                                to="/collections"
                                icon={Plus}
                                title="New Collection"
                                description="Open collection workspace"
                                color="teal"
                            />
                            <QuickAction
                                to="/receipts"
                                icon={Receipt}
                                title="Official Receipts"
                                description="View receipt records"
                                color="blue"
                            />
                            <QuickAction
                                to="/vouchers"
                                icon={FileText}
                                title="Disbursement Vouchers"
                                description="Review voucher records"
                                color="orange"
                            />
                            <QuickAction
                                to="/reconciliation"
                                icon={FileCheck}
                                title="Reconciliation"
                                description="Review financial records"
                                color="violet"
                            />
                            <QuickAction
                                to="/reports"
                                icon={TrendingUp}
                                title="Financial Reports"
                                description="Open reporting workspace"
                                color="blue"
                            />
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">
                                    Pending Overview
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Current voucher records
                                </p>
                            </div>
                            <Clock3 size={19} className="text-amber-600" />
                        </div>

                        <div className="space-y-4 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                                    Pending / review / returned
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                    {loading ? "—" : pendingVouchers}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    Total receipt records
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                    {loading ? "—" : receipts.length}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                                    Total voucher records
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                    {loading ? "—" : vouchers.length}
                                </span>
                            </div>

                            <Link
                                to="/vouchers"
                                className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                                Open Vouchers
                                <ArrowUpRight size={15} />
                            </Link>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={19} className="text-blue-700" />
                            <h2 className="text-sm font-bold text-slate-900">
                                Responsible Access
                            </h2>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-600">
                            Review financial information only through your
                            authorized account. Verify transaction details
                            before proceeding with official actions.
                        </p>

                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
                            <CheckCircle2 size={14} />
                            Role-aware workspace
                        </div>
                    </section>
                </aside>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <Activity size={20} />
                        </div>

                        <div>
                            <h2 className="text-base font-bold text-slate-900">
                                Recent Staff Activity
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Latest activities returned by the audit API
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-slate-500">
                            {activities.length}{" "}
                            {activities.length === 1 ? "activity" : "activities"}
                        </span>

                        <button
                            type="button"
                            onClick={loadActivities}
                            disabled={activityLoading}
                            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={14}
                                className={activityLoading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <Link
                            to="/audit-trail"
                            className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                        >
                            Full audit trail
                            <ArrowUpRight size={14} />
                        </Link>
                    </div>
                </div>

                {activityError && (
                    <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        {activityError}
                    </div>
                )}

                {activityLoading ? (
                    <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-500">
                        <RefreshCw size={17} className="animate-spin" />
                        Loading recent activity...
                    </div>
                ) : activities.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        message="No recent staff activity available"
                    />
                ) : (
                    <div className="divide-y divide-slate-100">
                        {activities.slice(0, 5).map((activity, index) => (
                            <ActivityItem
                                key={
                                    activity.id ??
                                    `${activity.user_id || "user"}-${index}`
                                }
                                activity={activity}
                            />
                        ))}
                    </div>
                )}
            </section>

            <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <p>UniTeq · Financial Transactions Management</p>

                <p className="flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    {today.toLocaleDateString("en-PH", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                    })}
                    <span className="px-1">·</span>
                    {currentUser?.name || "Authorized User"}
                    {isAdministrator ? " · Administrator" : ""}
                </p>
            </footer>
        </div>
    );
}
