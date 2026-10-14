import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Receipt,
    Plus,
    Eye,
    Pencil,
    X,
    RefreshCw,
    CalendarDays,
    User,
    FileText,
    CreditCard,
    Save,
    Wallet,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    Filter,
    CheckCircle2,
    Clock3,
    PhilippinePeso,
    Printer,
    Building2,
    CircleAlert,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000/api/receipts";

const getToday = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getToken = () =>
    localStorage.getItem("uniteq_token") ||
    sessionStorage.getItem("uniteq_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

const getHeaders = () => {
    const token = getToken();

    return {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(amount) || 0);

const formatDate = (value) => {
    if (!value) return "—";

    const parts = String(value).substring(0, 10).split("-");

    if (parts.length !== 3) return String(value);

    const [year, month, day] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });
};

const getReceiptNumber = (receipt) =>
    receipt.receipt_number ||
    receipt.or_number ||
    `OR-${receipt.id}`;

const getPayer = (receipt) =>
    receipt.payer_name ||
    receipt.received_from ||
    receipt.payor ||
    "Unnamed payer";

const getPurpose = (receipt) =>
    receipt.purpose || "No purpose specified";

const getAmount = (receipt) =>
    Number(receipt.amount_paid ?? receipt.amount ?? 0) || 0;

const getStatus = (receipt) => {
    const value = String(receipt.status || "Recorded").toLowerCase();

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

    return receipt.status || "Recorded";
};

const emptyForm = () => ({
    date: getToday(),
    purpose: "",
    payer_name: "",
    address_department: "",
    original_amount: "",
    amount: "",
    payment_method: "Cash",
    description: "",
});

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

function Field({ label, icon: Icon, children }) {
    return (
        <div className="min-w-0">
            <label className={labelClass}>{label}</label>
            <div className="relative">
                {Icon && (
                    <Icon
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                )}
                {children}
            </div>
        </div>
    );
}

function Modal({ title, subtitle, onClose, children, footer }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900">
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close dialog"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="overflow-y-auto px-5 py-5 sm:px-6">
                    {children}
                </div>

                {footer && (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ title, value, subtitle, icon: Icon, tone }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700",
        teal: "bg-teal-50 text-teal-700",
        violet: "bg-violet-50 text-violet-700",
        amber: "bg-amber-50 text-amber-700",
    };

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                        {title}
                    </p>
                    <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                        {subtitle}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        tones[tone] || tones.blue
                    }`}
                >
                    <Icon size={21} />
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const normalized = getStatus({ status });

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

function EmptyState({ message, description }) {
    return (
        <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Receipt size={23} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
                {message}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
                {description}
            </p>
        </div>
    );
}

export default function Collections() {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [showAdd, setShowAdd] = useState(false);
    const [showView, setShowView] = useState(false);
    const [showEdit, setShowEdit] = useState(false);

    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [form, setForm] = useState(emptyForm());

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [methodFilter, setMethodFilter] = useState("All");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(0);

    const pageSize = 8;

    const buttonPrimary =
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";

    const buttonSecondary =
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

    const loadReceipts = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get(API_URL, {
                headers: getHeaders(),
            });

            const data = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data?.data)
                  ? response.data.data
                  : Array.isArray(response.data?.receipts)
                    ? response.data.receipts
                    : [];

            setReceipts(data);
        } catch (err) {
            console.error("Unable to load collections:", err);
            setError(
                err.response?.data?.message ||
                    "Unable to load collections. Check that Laravel is running and your login session is valid."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);

    const todayCount = useMemo(
        () => receipts.filter((receipt) => String(receipt.date || "").slice(0, 10) === getToday()).length,
        [receipts]
    );

    const totalAmount = useMemo(
        () => receipts.reduce((sum, receipt) => sum + getAmount(receipt), 0),
        [receipts]
    );

    const todaysAmount = useMemo(
        () =>
            receipts.reduce((sum, receipt) => {
                return String(receipt.date || "").slice(0, 10) === getToday()
                    ? sum + getAmount(receipt)
                    : sum;
            }, 0),
        [receipts]
    );

    const pendingCount = useMemo(
        () =>
            receipts.filter((receipt) =>
                ["Pending", "Under Review", "Returned"].includes(
                    getStatus(receipt)
                )
            ).length,
        [receipts]
    );

    const filteredReceipts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...receipts]
            .filter((receipt) => {
                const searchable = [
                    getReceiptNumber(receipt),
                    getPayer(receipt),
                    getPurpose(receipt),
                    receipt.address_department,
                    receipt.payment_method,
                    receipt.description,
                    receipt.status,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                const date = String(receipt.date || "").slice(0, 10);
                const matchesSearch = !query || searchable.includes(query);
                const matchesStatus =
                    statusFilter === "All" ||
                    getStatus(receipt) === statusFilter;
                const matchesMethod =
                    methodFilter === "All" ||
                    (receipt.payment_method || "Not specified") === methodFilter;
                const matchesFrom = !dateFrom || date >= dateFrom;
                const matchesTo = !dateTo || date <= dateTo;

                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesMethod &&
                    matchesFrom &&
                    matchesTo
                );
            })
            .sort((a, b) => {
                const dateA = String(a.date || "");
                const dateB = String(b.date || "");

                if (dateA !== dateB) return dateB.localeCompare(dateA);

                return Number(b.id || 0) - Number(a.id || 0);
            });
    }, [receipts, search, statusFilter, methodFilter, dateFrom, dateTo]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredReceipts.length / pageSize)
    );

    const visibleReceipts = filteredReceipts.slice(
        page * pageSize,
        (page + 1) * pageSize
    );

    useEffect(() => {
        setPage(0);
    }, [search, statusFilter, methodFilter, dateFrom, dateTo]);

    useEffect(() => {
        if (page >= totalPages) {
            setPage(Math.max(0, totalPages - 1));
        }
    }, [page, totalPages]);

    const updateForm = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const openAdd = () => {
        setForm(emptyForm());
        setError("");
        setNotice("");
        setShowAdd(true);
    };

    const openEdit = (receipt) => {
        setSelectedReceipt(receipt);

        setForm({
            date: String(receipt.date || "").slice(0, 10) || getToday(),
            purpose: receipt.purpose || "",
            payer_name: receipt.payer_name || "",
            address_department: receipt.address_department || "",
            original_amount: receipt.original_amount ?? receipt.amount ?? "",
            amount: receipt.amount_paid ?? receipt.amount ?? "",
            payment_method: receipt.payment_method || "Cash",
            description: receipt.description || "",
        });

        setError("");
        setNotice("");
        setShowEdit(true);
    };

    const validateForm = () => {
        if (!form.date || !form.purpose.trim() || !form.payer_name.trim()) {
            setError("Please complete the date, payer name, and purpose.");
            return false;
        }

        const amount = Number(form.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Enter a collection amount greater than zero.");
            return false;
        }

        if (dateFrom && dateTo && dateFrom > dateTo) {
            setError("The start date cannot be later than the end date.");
            return false;
        }

        setError("");
        return true;
    };

    const makePayload = () => {
        const amount = Number(form.amount);

        return {
            date: form.date,
            purpose: form.purpose.trim(),
            payer_name: form.payer_name.trim(),
            address_department: form.address_department.trim() || null,
            original_amount: Number(form.original_amount) || amount,
            amount,
            payment_method: form.payment_method,
            description: form.description.trim() || null,
        };
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!validateForm()) return;

        setSaving(true);

        try {
            await axios.post(API_URL, makePayload(), {
                headers: getHeaders(),
            });

            setShowAdd(false);
            setNotice("Collection recorded successfully.");
            await loadReceipts();
        } catch (err) {
            console.error("Unable to record collection:", err);

            setError(
                err.response?.data?.message ||
                    "Unable to record collection. Please check the information and try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async (event) => {
        event.preventDefault();
        setError("");

        if (!selectedReceipt || !validateForm()) return;

        setSaving(true);

        try {
            await axios.put(
                `${API_URL}/${selectedReceipt.id}`,
                makePayload(),
                { headers: getHeaders() }
            );

            setShowEdit(false);
            setSelectedReceipt(null);
            setNotice("Collection updated successfully.");
            await loadReceipts();
        } catch (err) {
            console.error("Unable to update collection:", err);

            setError(
                err.response?.data?.message ||
                    "Unable to update collection. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const closeEdit = () => {
        if (saving) return;

        setShowEdit(false);
        setSelectedReceipt(null);
        setError("");
    };

    const closeAdd = () => {
        if (saving) return;

        setShowAdd(false);
        setError("");
    };

    const exportCSV = () => {
        const headers = [
            "Receipt Number",
            "Date",
            "Payer",
            "Purpose",
            "Department",
            "Payment Method",
            "Status",
            "Amount PHP",
        ];

        const rows = filteredReceipts.map((receipt) => [
            getReceiptNumber(receipt),
            String(receipt.date || "").slice(0, 10),
            getPayer(receipt),
            getPurpose(receipt),
            receipt.address_department || "",
            receipt.payment_method || "",
            getStatus(receipt),
            getAmount(receipt).toFixed(2),
        ]);

        const quote = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const csv = [headers, ...rows]
            .map((row) => row.map(quote).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `uniteq-collections-${getToday()}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const printReceipt = (receipt) => {
        if (!receipt) return;

        const escapeHtml = (value) =>
            String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

        const fields = [
            ["Receipt Number", getReceiptNumber(receipt)],
            ["Date", formatDate(receipt.date)],
            ["Payer", getPayer(receipt)],
            ["Purpose", getPurpose(receipt)],
            ["Address / Department", receipt.address_department || "—"],
            ["Payment Method", receipt.payment_method || "—"],
            ["Amount", formatCurrency(getAmount(receipt))],
            ["Status", getStatus(receipt)],
            ["Description", receipt.description || "—"],
        ];

        const rows = fields
            .map(
                ([label, value]) =>
                    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
            )
            .join("");

        const printWindow = window.open("", "_blank", "width=800,height=700");

        if (!printWindow) {
            setError("Your browser blocked the print window. Allow pop-ups and try again.");
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <title>Collection ${escapeHtml(getReceiptNumber(receipt))}</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; margin: 36px; color: #172033; }
                    h1 { font-size: 22px; margin-bottom: 6px; }
                    p { color: #64748b; font-size: 12px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 24px; }
                    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                    th { width: 35%; color: #475569; background: #f8fafc; }
                    .notice { margin-top: 28px; font-size: 11px; color: #64748b; }
                    @media print { button { display: none; } body { margin: 16px; } }
                </style>
            </head>
            <body>
                <h1>University of Abra</h1>
                <p>Cashier's Unit · Collection Record</p>
                <table>${rows}</table>
                <p class="notice">Internal collection record preview. Use the institution's approved official receipt procedure for an official receipt.</p>
                <button onclick="window.print()">Print this record</button>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
    };

    const renderFormFields = () => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Collection date *" icon={CalendarDays}>
                <input
                    className={`${inputClass} pl-9`}
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={updateForm}
                    required
                />
            </Field>

            <Field label="Payer name *" icon={User}>
                <input
                    className={`${inputClass} pl-9`}
                    type="text"
                    name="payer_name"
                    value={form.payer_name}
                    onChange={updateForm}
                    placeholder="Enter payer name"
                    required
                />
            </Field>

            <Field label="Purpose *" icon={FileText}>
                <input
                    className={`${inputClass} pl-9`}
                    type="text"
                    name="purpose"
                    value={form.purpose}
                    onChange={updateForm}
                    placeholder="Tuition, fees, payment, etc."
                    required
                />
            </Field>

            <Field label="Amount collected (₱) *" icon={Wallet}>
                <input
                    className={`${inputClass} pl-9`}
                    type="number"
                    name="amount"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={updateForm}
                    placeholder="0.00"
                    required
                />
            </Field>

            <Field label="Address / Department" icon={Building2}>
                <input
                    className={`${inputClass} pl-9`}
                    type="text"
                    name="address_department"
                    value={form.address_department}
                    onChange={updateForm}
                    placeholder="Enter department or address"
                />
            </Field>

            <Field label="Payment method" icon={CreditCard}>
                <select
                    className={`${inputClass} pl-9`}
                    name="payment_method"
                    value={form.payment_method}
                    onChange={updateForm}
                >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Other">Other</option>
                </select>
            </Field>

            <div className="sm:col-span-2">
                <label className={labelClass}>Description / Notes</label>
                <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    name="description"
                    value={form.description}
                    onChange={updateForm}
                    placeholder="Optional details about this collection"
                    rows={3}
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-full w-full bg-[#f6f8fc] p-4 text-slate-800 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-[1600px] space-y-6">
                {/* HEADER */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Building2 size={14} />
                            Finance
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-700">Collections</span>
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Collections
                        </h1>

                        <p className="mt-1.5 text-sm text-slate-500">
                            Record, search, and review financial collections in one workspace.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={loadReceipts}
                            disabled={loading}
                            className={buttonSecondary}
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={exportCSV}
                            disabled={filteredReceipts.length === 0}
                            className={buttonSecondary}
                        >
                            <Download size={16} />
                            Export CSV
                        </button>

                        <button
                            type="button"
                            onClick={openAdd}
                            className={buttonPrimary}
                        >
                            <Plus size={17} />
                            Record collection
                        </button>
                    </div>
                </header>

                {/* FEEDBACK */}
                {notice && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        <span className="flex items-center gap-2">
                            <CheckCircle2 size={17} />
                            {notice}
                        </span>

                        <button
                            type="button"
                            onClick={() => setNotice("")}
                            aria-label="Dismiss notice"
                            className="rounded-lg p-1 hover:bg-emerald-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                        <CircleAlert size={18} className="mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p>{error}</p>
                            {!showAdd && !showEdit && (
                                <button
                                    type="button"
                                    onClick={loadReceipts}
                                    className="mt-2 font-semibold underline"
                                >
                                    Try again
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setError("")}
                            aria-label="Dismiss error"
                            className="rounded p-1 hover:bg-rose-100"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* SUMMARY CARDS */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Total Collections"
                        value={loading ? "Loading..." : formatCurrency(totalAmount)}
                        subtitle={`${receipts.length} recorded collection records`}
                        icon={Wallet}
                        tone="blue"
                    />

                    <SummaryCard
                        title="Collected Today"
                        value={loading ? "Loading..." : formatCurrency(todaysAmount)}
                        subtitle={`${todayCount} records dated today`}
                        icon={PhilippinePeso}
                        tone="teal"
                    />

                    <SummaryCard
                        title="Collection Records"
                        value={loading ? "—" : receipts.length.toLocaleString("en-PH")}
                        subtitle="All loaded receipt records"
                        icon={Receipt}
                        tone="violet"
                    />

                    <SummaryCard
                        title="Pending / Review"
                        value={loading ? "—" : pendingCount.toLocaleString("en-PH")}
                        subtitle="Records requiring follow-up"
                        icon={Clock3}
                        tone="amber"
                    />
                </section>

                {/* COLLECTION TABLE */}
                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-5 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">
                                    All Collection Records
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Search receipts, check payment details, and review collection status.
                                </p>
                            </div>

                            <span className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                                <Receipt size={14} />
                                {filteredReceipts.length} records
                            </span>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
                                <Search size={16} className="shrink-0 text-slate-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search receipt, payer, purpose..."
                                    className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
                                />
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                                <Filter size={15} className="shrink-0 text-slate-400" />
                                <select
                                    aria-label="Filter by status"
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                    className="min-h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
                                >
                                    <option value="All">All statuses</option>
                                    <option value="Recorded">Recorded</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Returned">Returned</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                                <CreditCard size={15} className="shrink-0 text-slate-400" />
                                <select
                                    aria-label="Filter by payment method"
                                    value={methodFilter}
                                    onChange={(event) => setMethodFilter(event.target.value)}
                                    className="min-h-10 w-full bg-transparent text-xs text-slate-700 outline-none"
                                >
                                    <option value="All">All payment methods</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Check">Check</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("All");
                                    setMethodFilter("All");
                                    setDateFrom("");
                                    setDateTo("");
                                }}
                                className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                Clear filters
                            </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="shrink-0">From</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(event) => setDateFrom(event.target.value)}
                                    className="min-h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                                />
                            </label>

                            <label className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="shrink-0">To</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(event) => setDateTo(event.target.value)}
                                    className="min-h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/80">
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Receipt No.
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Payer / Department
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Purpose
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Date
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Payment
                                    </th>
                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Amount
                                    </th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Status
                                    </th>
                                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {loading && receipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-16 text-center">
                                            <RefreshCw size={21} className="mx-auto mb-3 animate-spin text-blue-600" />
                                            <p className="text-sm text-slate-500">Loading collection records...</p>
                                        </td>
                                    </tr>
                                ) : visibleReceipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8}>
                                            <EmptyState
                                                message={receipts.length === 0 ? "No collection records yet" : "No matching records"}
                                                description={receipts.length === 0 ? "Use Record collection to add a transaction." : "Try changing your search or filters."}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    visibleReceipts.map((receipt) => (
                                        <tr
                                            key={receipt.id}
                                            className="transition hover:bg-blue-50/40"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                                        <Receipt size={17} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-800">
                                                        {getReceiptNumber(receipt)}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="max-w-[210px] px-5 py-4">
                                                <p className="truncate text-xs font-semibold text-slate-800">
                                                    {getPayer(receipt)}
                                                </p>
                                                <p className="mt-1 truncate text-[11px] text-slate-400">
                                                    {receipt.address_department || "No department provided"}
                                                </p>
                                            </td>

                                            <td className="max-w-[220px] px-5 py-4">
                                                <span className="block truncate text-xs text-slate-600">
                                                    {getPurpose(receipt)}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                                                {formatDate(receipt.date)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                                    {receipt.payment_method || "Not specified"}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-right text-xs font-bold text-slate-800">
                                                {formatCurrency(getAmount(receipt))}
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge status={receipt.status} />
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        title="View collection"
                                                        aria-label={`View ${getReceiptNumber(receipt)}`}
                                                        onClick={() => {
                                                            setSelectedReceipt(receipt);
                                                            setShowView(true);
                                                            setError("");
                                                        }}
                                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Update collection"
                                                        aria-label={`Update ${getReceiptNumber(receipt)}`}
                                                        onClick={() => openEdit(receipt)}
                                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        title="Print collection record"
                                                        aria-label={`Print ${getReceiptNumber(receipt)}`}
                                                        onClick={() => printReceipt(receipt)}
                                                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                            Showing {filteredReceipts.length === 0 ? 0 : page * pageSize + 1}
                            {"–"}
                            {Math.min((page + 1) * pageSize, filteredReceipts.length)}
                            {" "}of {filteredReceipts.length} records
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.max(0, current - 1))}
                                disabled={page === 0}
                                className={buttonSecondary}
                            >
                                <ChevronLeft size={15} />
                                Previous
                            </button>

                            <span className="px-1 text-xs text-slate-500">
                                {page + 1} / {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                                disabled={page >= totalPages - 1}
                                className={buttonSecondary}
                            >
                                Next
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                </section>

                <footer className="flex flex-col gap-2 border-t border-slate-200 pt-4 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <span>UniTeq · Financial Transactions Management</span>
                    <span>{new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
                </footer>
            </div>

            {/* ADD COLLECTION */}
            {showAdd && (
                <Modal
                    title="Record collection"
                    subtitle="Enter the collection details and verify the amount before saving."
                    onClose={closeAdd}
                    footer={
                        <>
                            <button type="button" onClick={closeAdd} disabled={saving} className={buttonSecondary}>
                                Cancel
                            </button>
                            <button type="submit" form="add-collection-form" disabled={saving} className={buttonPrimary}>
                                <Save size={16} />
                                {saving ? "Saving..." : "Save collection"}
                            </button>
                        </>
                    }
                >
                    <form id="add-collection-form" onSubmit={handleSubmit} className="space-y-5">
                        {renderFormFields()}
                        <p className="text-xs leading-5 text-slate-500">
                            Confirm the payer, purpose, date, payment method, and amount before recording this transaction.
                        </p>
                    </form>
                </Modal>
            )}

            {/* EDIT COLLECTION */}
            {showEdit && selectedReceipt && (
                <Modal
                    title="Update collection"
                    subtitle={`Editing ${getReceiptNumber(selectedReceipt)}`}
                    onClose={closeEdit}
                    footer={
                        <>
                            <button type="button" onClick={closeEdit} disabled={saving} className={buttonSecondary}>
                                Cancel
                            </button>
                            <button type="submit" form="edit-collection-form" disabled={saving} className={buttonPrimary}>
                                <Save size={16} />
                                {saving ? "Saving..." : "Save changes"}
                            </button>
                        </>
                    }
                >
                    <form id="edit-collection-form" onSubmit={handleUpdate} className="space-y-5">
                        {renderFormFields()}
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                            Verify any changed information carefully. Changes to financial records should follow your office's authorization and audit procedures.
                        </div>
                    </form>
                </Modal>
            )}

            {/* VIEW COLLECTION */}
            {showView && selectedReceipt && (
                <Modal
                    title="Collection details"
                    subtitle={`Receipt ${getReceiptNumber(selectedReceipt)}`}
                    onClose={() => {
                        setShowView(false);
                        setSelectedReceipt(null);
                    }}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => printReceipt(selectedReceipt)}
                                className={buttonSecondary}
                            >
                                <Printer size={16} />
                                Print record
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowView(false);
                                    setSelectedReceipt(null);
                                }}
                                className={buttonPrimary}
                            >
                                Close
                            </button>
                        </>
                    }
                >
                    <div className="mb-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
                        <p className="text-xs font-medium text-slate-500">Amount recorded</p>
                        <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-900">
                            {formatCurrency(getAmount(selectedReceipt))}
                        </p>
                        <div className="mt-3">
                            <StatusBadge status={selectedReceipt.status} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                            ["Receipt number", getReceiptNumber(selectedReceipt)],
                            ["Collection date", formatDate(selectedReceipt.date)],
                            ["Payer name", getPayer(selectedReceipt)],
                            ["Purpose", getPurpose(selectedReceipt)],
                            ["Payment method", selectedReceipt.payment_method || "Not specified"],
                            ["Address / Department", selectedReceipt.address_department || "Not provided"],
                            ["Original amount", formatCurrency(selectedReceipt.original_amount ?? selectedReceipt.amount ?? 0)],
                            ["Description / Notes", selectedReceipt.description || "No additional notes"],
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-0 rounded-xl border border-slate-100 p-3.5">
                                <p className="text-[11px] font-medium text-slate-500">{label}</p>
                                <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}
