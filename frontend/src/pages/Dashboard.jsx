
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api";
import {
    Wallet,
    TrendingUp,
    Clock,
    AlertCircle,
    Receipt,
    RefreshCw,
    ArrowUpRight,
    CalendarDays,
    BarChart3,
    FileText,
    CheckCircle,
} from "lucide-react";

const peso = (value) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(value) || 0);

function getArray(response) {
    const data = response?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.receipts)) return data.receipts;
    if (Array.isArray(data?.vouchers)) return data.vouchers;
    if (Array.isArray(data?.collections)) return data.collections;
    if (Array.isArray(data?.data?.data)) return data.data.data;

    return [];
}

function getErrorMessage(error, fallback) {
    if (!error) return fallback;

    const status = error?.response?.status;
    const data = error?.response?.data;
    const serverMessage =
        typeof data?.message === "string" ? data.message : "";

    if (status === 401) {
        return "Authentication failed. Please log in again.";
    }

    if (status === 403) {
        return serverMessage || "You do not have permission to access this information.";
    }

    if (status === 404) {
        return "The API endpoint was not found. Check your Laravel API routes.";
    }

    if (status >= 500) {
        return serverMessage
            ? `Laravel error: ${serverMessage}`
            : "Laravel returned a server error. Check the backend terminal and Laravel log.";
    }

    if (error.code === "ECONNABORTED") {
        return "The request timed out. Check Laravel and try again.";
    }

    if (error.request && !error.response) {
        return "No response from Laravel. Check that the backend is running at http://127.0.0.1:8000.";
    }

    return serverMessage || error.message || fallback;
}

function getAmount(item) {
    return Number(
        item?.amount ??
        item?.cash_received ??
        item?.amount_paid ??
        item?.amount_collected ??
        item?.original_amount ??
        item?.fixed_fee ??
        0
    ) || 0;
}

function getReceiptDate(item) {
    const value = item?.date ?? item?.created_at ?? item?.updated_at;

    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(date, other) {
    return Boolean(
        date &&
        date.getFullYear() === other.getFullYear() &&
        date.getMonth() === other.getMonth() &&
        date.getDate() === other.getDate()
    );
}

function isSameMonth(date, other) {
    return Boolean(
        date &&
        date.getFullYear() === other.getFullYear() &&
        date.getMonth() === other.getMonth()
    );
}

function isPending(voucher) {
    const status = String(
        voucher?.status ??
        voucher?.approval_status ??
        voucher?.voucher_status ??
        ""
    ).toLowerCase().trim();

    return [
        "pending",
        "for approval",
        "for_review",
        "for review",
        "submitted",
        "under review",
        "under_review",
    ].includes(status);
}

function StatCard({ title, value, description, icon: Icon, color }) {
    const colors = {
        cyan: "bg-cyan-50 text-cyan-700",
        blue: "bg-blue-50 text-blue-700",
        orange: "bg-orange-50 text-orange-600",
        red: "bg-red-50 text-red-600",
    };

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {title}
                </p>
                <div className={`rounded-lg p-2 ${colors[color] || colors.blue}`}>
                    <Icon size={19} />
                </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-2 text-xs text-gray-500">{description}</p>
        </div>
    );
}

export default function Dashboard() {
    const [receipts, setReceipts] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [voucherError, setVoucherError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");
        setVoucherError("");

        const [receiptResult, voucherResult] = await Promise.allSettled([
            api.get("/receipts"),
            api.get("/vouchers"),
        ]);

        if (receiptResult.status === "fulfilled") {
            setReceipts(getArray(receiptResult.value));
        } else {
            console.error("Receipts API failure:", {
                status: receiptResult.reason?.response?.status,
                data: receiptResult.reason?.response?.data,
                message: receiptResult.reason?.message,
            });

            setReceipts([]);
            setErrorMessage(
                getErrorMessage(
                    receiptResult.reason,
                    "Unable to load receipts."
                )
            );
        }

        if (voucherResult.status === "fulfilled") {
            setVouchers(getArray(voucherResult.value));
        } else {
            console.error("Vouchers API failure:", {
                status: voucherResult.reason?.response?.status,
                data: voucherResult.reason?.response?.data,
                message: voucherResult.reason?.message,
            });

            setVouchers([]);
            setVoucherError(
                getErrorMessage(
                    voucherResult.reason,
                    "Unable to load voucher information."
                )
            );
        }

        if (
            receiptResult.status === "fulfilled" ||
            voucherResult.status === "fulfilled"
        ) {
            setLastUpdated(new Date());
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const now = new Date();

    const statistics = useMemo(() => {
        const todaysReceipts = receipts.filter((item) =>
            isSameDay(getReceiptDate(item), now)
        );

        const monthlyReceipts = receipts.filter((item) =>
            isSameMonth(getReceiptDate(item), now)
        );

        return {
            todayTotal: todaysReceipts.reduce((sum, item) => sum + getAmount(item), 0),
            monthlyTotal: monthlyReceipts.reduce((sum, item) => sum + getAmount(item), 0),
            pendingApprovals: vouchers.filter(isPending).length,
            outstandingTotal: receipts.reduce((sum, item) => {
                const remaining = Number(
                    item?.remaining_balance ?? item?.balance ?? 0
                );
                return sum + Math.max(0, remaining || 0);
            }, 0),
            todayCount: todaysReceipts.length,
        };
    }, [receipts, vouchers]);

    const weeklyData = useMemo(() => {
        const today = new Date();
        const days = [];

        for (let offset = 6; offset >= 0; offset--) {
            const day = new Date(today);
            day.setDate(today.getDate() - offset);
            day.setHours(0, 0, 0, 0);

            const total = receipts
                .filter((item) => isSameDay(getReceiptDate(item), day))
                .reduce((sum, item) => sum + getAmount(item), 0);

            days.push({
                label: day.toLocaleDateString("en-PH", { weekday: "short" }),
                date: day.toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                }),
                total,
            });
        }

        return days;
    }, [receipts]);

    const maxWeeklyAmount = Math.max(...weeklyData.map((day) => day.total), 1);

    const recentReceipts = useMemo(
        () =>
            [...receipts]
                .sort((a, b) => {
                    const dateA = getReceiptDate(a)?.getTime() || 0;
                    const dateB = getReceiptDate(b)?.getTime() || 0;

                    if (dateA !== dateB) return dateB - dateA;
                    return (Number(b.id) || 0) - (Number(a.id) || 0);
                })
                .slice(0, 5),
        [receipts]
    );

    const todayLabel = now.toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const monthLabel = now.toLocaleDateString("en-PH", {
        month: "long",
        year: "numeric",
    });

    return (
        <div className="min-h-screen space-y-6 bg-gray-50 p-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">
                        University of Abra · Main Campus
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Overview of collections and financial activities.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadDashboard}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-60"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 to-blue-900 p-6 text-white shadow-md md:p-8">
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                            University of Abra
                        </p>
                        <p className="mt-1 text-sm text-blue-100">
                            Main Campus Cashier's Unit
                        </p>
                        <h2 className="mt-4 text-2xl font-bold md:text-3xl">
                            Financial Management System
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100">
                            Monitor collections, financial transactions, disbursement
                            requests, and cashier activities in one secure workspace.
                        </p>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/10 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                            <CalendarDays size={15} /> TODAY
                        </div>
                        <p className="mt-2 text-sm font-medium">{todayLabel}</p>
                    </div>
                </div>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-cyan-100 bg-cyan-50 p-5">
                <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-cyan-100 p-3 text-cyan-700">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                            Feature Suggestion
                        </p>
                        <h3 className="mt-1 font-semibold text-gray-900">
                            Online Payment Portal Integration
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-600">
                            Future development may integrate a secure student payment
                            portal for tuition and other online fees.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => (window.location.href = "/reports")}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
                >
                    View Reports <ArrowUpRight size={16} />
                </button>
            </section>

            {(errorMessage || voucherError) && (
                <div className="space-y-2">
                    {errorMessage && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={18} />
                                <span>{errorMessage}</span>
                            </div>
                            <button
                                type="button"
                                onClick={loadDashboard}
                                className="font-semibold underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                    {voucherError && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                            Voucher information: {voucherError}
                        </div>
                    )}
                </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Today's Cash Collected"
                    value={loading ? "Loading..." : peso(statistics.todayTotal)}
                    description={`${statistics.todayCount} transaction(s) today`}
                    icon={Wallet}
                    color="cyan"
                />
                <StatCard
                    title="Monthly Collection"
                    value={loading ? "Loading..." : peso(statistics.monthlyTotal)}
                    description={monthLabel}
                    icon={TrendingUp}
                    color="blue"
                />
                <StatCard
                    title="Pending Staff Approvals"
                    value={loading ? "..." : statistics.pendingApprovals}
                    description="Awaiting approval"
                    icon={Clock}
                    color="orange"
                />
                <StatCard
                    title="Outstanding Balances"
                    value={loading ? "Loading..." : peso(statistics.outstandingTotal)}
                    description="Remaining amounts due"
                    icon={AlertCircle}
                    color="red"
                />
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Transaction Volume
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                Cash collections for the last 7 days
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <p className="py-12 text-center text-sm text-gray-500">
                            Loading collections...
                        </p>
                    ) : receipts.length === 0 ? (
                        <div className="py-12 text-center">
                            <Receipt size={32} className="mx-auto text-gray-300" />
                            <p className="mt-3 font-medium text-gray-700">
                                No collection records found
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                Create a receipt or check the receipts API.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-8 flex h-48 items-end justify-around gap-3 border-b border-gray-200 pb-2">
                            {weeklyData.map((day) => {
                                const height = day.total > 0
                                    ? Math.max(8, (day.total / maxWeeklyAmount) * 100)
                                    : 3;

                                return (
                                    <div
                                        key={day.date}
                                        className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                                        title={`${day.date}: ${peso(day.total)}`}
                                    >
                                        <span className="max-w-full truncate text-center text-[10px] text-gray-500">
                                            {day.total > 0 ? peso(day.total) : ""}
                                        </span>
                                        <div
                                            className={`w-full max-w-12 rounded-t-md ${
                                                day.total > 0 ? "bg-cyan-500" : "bg-gray-100"
                                            }`}
                                            style={{ height: `${height}%`, minHeight: "4px" }}
                                        />
                                        <span className="text-xs text-gray-500">{day.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Frequently used operations
                    </p>
                    <div className="mt-5 space-y-3">
                        {[
                            {
                                title: "Manage Receipts",
                                description: "Record and view collections",
                                icon: Receipt,
                                color: "bg-blue-50 text-blue-700",
                                path: "/receipts",
                            },
                            {
                                title: "Collections",
                                description: "Manage collection types",
                                icon: Wallet,
                                color: "bg-cyan-50 text-cyan-700",
                                path: "/collections",
                            },
                            {
                                title: "Generate Reports",
                                description: "View financial reports",
                                icon: FileText,
                                color: "bg-green-50 text-green-700",
                                path: "/reports",
                            },
                        ].map((action) => {
                            const Icon = action.icon;

                            return (
                                <button
                                    key={action.title}
                                    type="button"
                                    onClick={() => (window.location.href = action.path)}
                                    className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
                                >
                                    <div className={`rounded-lg p-2 ${action.color}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {action.title}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {action.description}
                                        </p>
                                    </div>
                                    <ArrowUpRight size={16} className="text-gray-400" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
                    <div>
                        <h3 className="font-semibold text-gray-900">Recent Collections</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Latest recorded receipts and payments
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => (window.location.href = "/receipts")}
                        className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
                    >
                        View all receipts →
                    </button>
                </div>

                {loading ? (
                    <p className="p-8 text-center text-sm text-gray-500">
                        Loading recent collections...
                    </p>
                ) : recentReceipts.length === 0 ? (
                    <div className="p-10 text-center">
                        <Receipt size={34} className="mx-auto text-gray-300" />
                        <p className="mt-3 font-medium text-gray-700">
                            No collections to display
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            Once receipts are recorded, they will appear here.
                        </p>
                        <button
                            type="button"
                            onClick={() => (window.location.href = "/receipts")}
                            className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                        >
                            Open Receipts
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[650px] text-left text-sm">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Receipt No.</th>
                                    <th className="px-5 py-3 font-medium">Payer</th>
                                    <th className="px-5 py-3 font-medium">Purpose</th>
                                    <th className="px-5 py-3 font-medium">Date</th>
                                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentReceipts.map((receipt, index) => {
                                    const date = getReceiptDate(receipt);

                                    return (
                                        <tr
                                            key={receipt.id ?? receipt.receipt_number ?? index}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-blue-700">
                                                {receipt.receipt_number ||
                                                    `OR-${String(receipt.id ?? index + 1).padStart(4, "0")}`}
                                            </td>
                                            <td className="px-5 py-4 text-gray-800">
                                                {receipt.payer_name ||
                                                    receipt.student_name ||
                                                    receipt.name ||
                                                    "—"}
                                            </td>
                                            <td className="max-w-56 truncate px-5 py-4 text-gray-600">
                                                {receipt.purpose ||
                                                    receipt.description ||
                                                    receipt.collection_type ||
                                                    "—"}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                                                {date ? date.toLocaleDateString("en-PH") : "—"}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-gray-900">
                                                {peso(getAmount(receipt))}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                    <span>{receipts.length} receipt record(s) loaded</span>
                    <span>
                        {lastUpdated
                            ? `Last refreshed: ${lastUpdated.toLocaleTimeString("en-PH")}`
                            : "Not refreshed yet"}
                    </span>
                </div>
            </section>

            <div className="flex items-center gap-2 pb-4 text-xs text-gray-500">
                <CheckCircle size={14} className="text-green-600" />
                Dashboard connected to the UniTeq financial workspace.
            </div>
        </div>
    );
}
