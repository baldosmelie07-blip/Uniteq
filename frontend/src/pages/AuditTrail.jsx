import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/api";
import {
    Activity,
    Search,
    RefreshCw,
    Download,
    Printer,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    Clock,
    User,
    ShieldCheck,
    FileText,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    History,
    AlertCircle,
    Filter,
    ClipboardList,
} from "lucide-react";

const PAGE_SIZE = 10;

function getProperties(log) {
    let value = log?.properties;

    if (typeof value === "string") {
        try {
            value = JSON.parse(value);
        } catch {
            return {};
        }
    }

    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}

function displayValue(value) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }

    return String(value);
}

function fieldLabel(field) {
    return String(field)
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
          });
}

function getChanges(log) {
    const properties = getProperties(log);

    if (
        properties.changes &&
        typeof properties.changes === "object" &&
        !Array.isArray(properties.changes)
    ) {
        return Object.entries(properties.changes).map(([field, change]) => ({
            field,
            before: change?.before,
            after: change?.after,
        }));
    }

    if (
        properties.before &&
        properties.after &&
        typeof properties.before === "object" &&
        typeof properties.after === "object"
    ) {
        const ignored = ["updated_at", "created_at"];

        return Object.keys(properties.after)
            .filter((field) => {
                if (ignored.includes(field)) return false;

                return (
                    displayValue(properties.before[field]) !==
                    displayValue(properties.after[field])
                );
            })
            .map((field) => ({
                field,
                before: properties.before[field],
                after: properties.after[field],
            }));
    }

    return [];
}

function actionStyle(action) {
    const value = String(action || "").toUpperCase();

    if (value.includes("DELETE") || value.includes("REJECT")) {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    if (
        value.includes("UPDATE") ||
        value.includes("EDIT") ||
        value.includes("PAYMENT")
    ) {
        return "bg-amber-50 text-amber-800 ring-amber-200";
    }

    if (value.includes("CREATE") || value.includes("ADD")) {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (
        value.includes("APPROV") ||
        value.includes("LOGIN") ||
        value.includes("VERIFY")
    ) {
        return "bg-blue-50 text-blue-700 ring-blue-200";
    }

    return "bg-slate-100 text-slate-700 ring-slate-200";
}

function ActionBadge({ action }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${actionStyle(action)}`}
        >
            {action || "UNKNOWN"}
        </span>
    );
}

function StatCard({ label, value, icon: Icon, color, description }) {
    const colors = {
        blue: "bg-blue-50 text-blue-700",
        green: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        red: "bg-red-50 text-red-700",
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                        {label}
                    </p>
                    <p className="mt-2 break-words text-3xl font-bold tracking-tight text-[#102d55]">
                        {value ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {description}
                    </p>
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

function Detail({ label, value }) {
    return (
        <div className="min-w-0 border-b border-slate-100 py-3 last:border-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </p>
            <p className="break-words whitespace-pre-wrap text-sm text-slate-800">
                {displayValue(value)}
            </p>
        </div>
    );
}

function RecordSection({ title, data, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        Object.keys(data).length === 0
    ) {
        return null;
    }

    return (
        <section className="overflow-hidden rounded-xl border border-slate-200">
            <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
            >
                <span className="text-sm font-semibold text-slate-800">
                    {title}
                </span>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {open && (
                <div className="grid grid-cols-1 gap-x-6 px-4 sm:grid-cols-2">
                    {Object.entries(data).map(([field, value]) => (
                        <Detail
                            key={field}
                            label={fieldLabel(field)}
                            value={value}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function downloadCsv(logs) {
    if (!logs.length) {
        window.alert("There are no audit records on this page to export.");
        return;
    }

    const headers = [
        "Date and Time",
        "User",
        "Role",
        "Action",
        "Module",
        "Reference Number",
        "Description",
        "IP Address",
    ];

    const rows = logs.map((log) => [
        formatDate(log.created_at),
        log.user_name || "System",
        log.user_role || "",
        log.action || "",
        log.module || "",
        log.reference_no || "",
        log.description || "",
        log.ip_address || "",
    ]);

    const csvCell = (value) => {
        let text = String(value ?? "");

        // Reduce the risk of spreadsheet formula injection.
        if (/^[=+\-@\t\r]/.test(text)) {
            text = "'" + text;
        }

        return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `uniteq-audit-trail-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character];
    });
}

function printLogs(logs) {
    if (!logs.length) {
        window.alert("There are no audit records to print.");
        return;
    }

    const rows = logs
        .map(
            (log) => `
                <tr>
                    <td>${escapeHtml(formatDate(log.created_at))}</td>
                    <td>${escapeHtml(log.user_name || "System")}</td>
                    <td>${escapeHtml(log.user_role || "—")}</td>
                    <td>${escapeHtml(log.action || "—")}</td>
                    <td>${escapeHtml(log.module || "—")}</td>
                    <td>${escapeHtml(log.reference_no || "—")}</td>
                    <td>${escapeHtml(log.description || "—")}</td>
                </tr>`
        )
        .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
        window.alert("Please allow pop-ups to print the audit trail.");
        return;
    }

    printWindow.document.write(`
        <!doctype html>
        <html>
        <head>
            <title>UniTeq Audit Trail</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
                h1 { margin-bottom: 5px; }
                p { color: #64748b; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
                th { background: #f1f5f9; }
                tr { page-break-inside: avoid; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <h1>UniTeq — Audit Trail</h1>
            <p>Generated: ${escapeHtml(new Date().toLocaleString("en-PH"))}</p>
            <table>
                <thead>
                    <tr>
                        <th>Date and Time</th><th>User</th><th>Role</th>
                        <th>Action</th><th>Module</th><th>Reference</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function getRecords(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.logs?.data)) return data.logs.data;
    if (Array.isArray(data?.logs)) return data.logs;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.activity_logs?.data)) return data.activity_logs.data;
    if (Array.isArray(data?.activity_logs)) return data.activity_logs;

    return [];
}

function errorMessage(error) {
    if (!error.response) {
        return "Cannot connect to the Laravel server. Check that the backend is running and that the API URL is configured correctly.";
    }

    if (error.response.status === 401) {
        return "Your session may have expired. Please sign in again.";
    }

    if (error.response.status === 403) {
        return "Your account does not have permission to view the audit trail.";
    }

    return (
        error.response.data?.message ||
        "Unable to load audit records. Please try again."
    );
}

export default function AuditTrail() {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchInput, setSearchInput] = useState("");
    const [filters, setFilters] = useState({
        search: "",
        module: "",
        action: "",
        date_from: "",
        date_to: "",
    });

    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [activeLog, setActiveLog] = useState(null);

    const loadLogs = useCallback(
        async (requestedPage = 1, selectedFilters = filters) => {
            setLoading(true);
            setError("");

            try {
                const params = {
                    page: requestedPage,
                    per_page: PAGE_SIZE,
                    ...Object.fromEntries(
                        Object.entries(selectedFilters).filter(
                            ([, value]) => value !== ""
                        )
                    ),
                };

                // The shared Axios client handles the base URL and auth token.
                const response = await api.get("/activity-logs", { params });

                const data = response.data || {};
                const records = getRecords(data);

                setLogs(records);
                setTotal(
                    data.total ??
                        data.logs?.total ??
                        data.activity_logs?.total ??
                        data.pagination?.total ??
                        records.length
                );
                setLastPage(
                    Math.max(
                        1,
                        Number(
                            data.last_page ??
                                data.logs?.last_page ??
                                data.activity_logs?.last_page ??
                                data.pagination?.last_page ??
                                1
                        )
                    )
                );
                setPage(
                    Number(
                        data.current_page ??
                            data.logs?.current_page ??
                            data.activity_logs?.current_page ??
                            data.pagination?.current_page ??
                            requestedPage
                    )
                );
                setStats(data.stats || {});
            } catch (requestError) {
                console.error("Failed to load audit trail:", requestError);
                setLogs([]);
                setTotal(0);
                setLastPage(1);
                setError(errorMessage(requestError));
            } finally {
                setLoading(false);
            }
        },
        [filters]
    );

    useEffect(() => {
        loadLogs(1, filters);
    }, [loadLogs, filters]);

    const applyFilters = (event) => {
        event.preventDefault();

        const nextFilters = {
            ...filters,
            search: searchInput.trim(),
        };

        setPage(1);
        setFilters(nextFilters);
    };

    const clearFilters = () => {
        const emptyFilters = {
            search: "",
            module: "",
            action: "",
            date_from: "",
            date_to: "",
        };

        setSearchInput("");
        setPage(1);
        setFilters(emptyFilters);
    };

    const goToPage = (nextPage) => {
        if (loading || nextPage < 1 || nextPage > lastPage) return;
        loadLogs(nextPage, filters);
    };

    const changeFilter = (name, value) => {
        setFilters((previous) => ({ ...previous, [name]: value }));
    };

    const visibleRange = useMemo(() => {
        if (total === 0) return { start: 0, end: 0 };

        return {
            start: (page - 1) * PAGE_SIZE + 1,
            end: Math.min(page * PAGE_SIZE, total),
        };
    }, [page, total]);

    const summary = [
        {
            label: "Total Records",
            value: stats.total ?? total,
            description: "Records matching current results",
            icon: Activity,
            color: "blue",
        },
        {
            label: "Created",
            value: stats.created ?? stats.creates ?? "—",
            description: "Creation activity",
            icon: FileText,
            color: "green",
        },
        {
            label: "Updated",
            value: stats.updated ?? stats.updates ?? "—",
            description: "Modification activity",
            icon: RefreshCw,
            color: "amber",
        },
        {
            label: "Deleted",
            value: stats.deleted ?? stats.deletes ?? "—",
            description: "Deletion activity",
            icon: AlertCircle,
            color: "red",
        },
    ];

    const properties = activeLog ? getProperties(activeLog) : {};
    const changes = activeLog ? getChanges(activeLog) : [];
    const beforeRecord = properties.before ?? properties.deleted_record ?? null;
    const afterRecord = properties.after ?? null;
    const changedFields = Array.isArray(properties.changed_fields)
        ? properties.changed_fields
        : [];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:px-8">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-teal-700">
                            <ShieldCheck size={18} />
                            UniTeq · Financial Accountability
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-[#102d55] sm:text-3xl">
                            Audit Trail
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Track recorded activities, identify responsible users,
                            and inspect available changes to financial records.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => loadLogs(page, filters)}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={() => downloadCsv(logs)}
                            disabled={!logs.length}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#102d55] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173f73] disabled:opacity-50"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                        <button
                            type="button"
                            onClick={() => printLogs(logs)}
                            disabled={!logs.length}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <Printer size={16} />
                            Print
                        </button>
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summary.map((item) => (
                        <StatCard key={item.label} {...item} />
                    ))}
                </section>

                <form
                    onSubmit={applyFilters}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex items-center gap-2">
                                <Filter size={19} className="text-teal-700" />
                                <h2 className="font-bold text-slate-900">
                                    Find Activity Records
                                </h2>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Narrow the records by keyword, module, action, or date.
                            </p>
                        </div>
                        <span className="text-xs text-slate-500">
                            {total} matching record(s)
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <div className="xl:col-span-2">
                            <label
                                htmlFor="audit-search"
                                className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                                Search
                            </label>
                            <div className="relative">
                                <Search
                                    size={17}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                                <input
                                    id="audit-search"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    placeholder="User, reference, description..."
                                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="audit-module"
                                className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                                Module
                            </label>
                            <select
                                id="audit-module"
                                value={filters.module}
                                onChange={(event) => changeFilter("module", event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
                            >
                                <option value="">All Modules</option>
                                <option value="Receipt">Receipt</option>
                                <option value="Receipts">Receipts</option>
                                <option value="Collection">Collection</option>
                                <option value="Collections">Collections</option>
                                <option value="Voucher">Voucher</option>
                                <option value="Vouchers">Vouchers</option>
                                <option value="Reconciliation">Reconciliation</option>
                                <option value="Users">Users</option>
                                <option value="Authentication">Authentication</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="audit-action"
                                className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                                Action
                            </label>
                            <select
                                id="audit-action"
                                value={filters.action}
                                onChange={(event) => changeFilter("action", event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600"
                            >
                                <option value="">All Actions</option>
                                <option value="CREATED">Created</option>
                                <option value="UPDATED">Updated</option>
                                <option value="PAYMENT">Payment</option>
                                <option value="DELETED">Deleted</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="audit-date-from"
                                className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                                From Date
                            </label>
                            <input
                                id="audit-date-from"
                                type="date"
                                value={filters.date_from}
                                max={filters.date_to || undefined}
                                onChange={(event) => changeFilter("date_from", event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-teal-600"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="audit-date-to"
                                className="mb-1.5 block text-xs font-semibold text-slate-600"
                            >
                                To Date
                            </label>
                            <input
                                id="audit-date-to"
                                type="date"
                                value={filters.date_to}
                                min={filters.date_from || undefined}
                                onChange={(event) => changeFilter("date_to", event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-teal-600"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={
                                loading ||
                                Boolean(
                                    filters.date_from &&
                                    filters.date_to &&
                                    filters.date_from > filters.date_to
                                )
                            }
                            className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                        >
                            Apply Filters
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Clear Filters
                        </button>
                    </div>
                </form>

                {error && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                    >
                        <AlertCircle size={19} className="mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-bold">Unable to load audit trail</p>
                            <p className="mt-1">{error}</p>
                            <button
                                type="button"
                                onClick={() => loadLogs(page, filters)}
                                className="mt-2 font-semibold underline"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="flex items-center gap-2 font-bold text-slate-900">
                                <ClipboardList size={19} className="text-teal-700" />
                                Activity Records
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {visibleRange.start}–{visibleRange.end} of {total} record(s)
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={15} />
                            Timestamps are supplied by the backend.
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-slate-500">
                            <RefreshCw size={28} className="mx-auto mb-3 animate-spin" />
                            Loading audit records...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <History size={34} className="mx-auto mb-3 text-slate-300" />
                            <h3 className="font-semibold text-slate-800">
                                No audit records found
                            </h3>
                            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                                Try adjusting your search filters, or refresh after a transaction has been recorded.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1100px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Date &amp; Time</th>
                                        <th className="px-5 py-4 font-semibold">User</th>
                                        <th className="px-5 py-4 font-semibold">Module</th>
                                        <th className="px-5 py-4 font-semibold">Action</th>
                                        <th className="px-5 py-4 font-semibold">Reference</th>
                                        <th className="px-5 py-4 font-semibold">Description</th>
                                        <th className="px-5 py-4 text-right font-semibold">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.map((log, index) => (
                                        <tr
                                            key={log.id ?? `${log.created_at}-${index}`}
                                            className="transition hover:bg-teal-50/40"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                                                        {(log.user_name || "S").trim().charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">
                                                            {log.user_name || "System"}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-500">
                                                            {log.user_role || "—"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                    {log.module || "—"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <ActionBadge action={log.action} />
                                            </td>
                                            <td className="px-5 py-4 font-mono text-xs text-slate-600">
                                                {log.reference_no || "—"}
                                            </td>
                                            <td className="max-w-sm px-5 py-4 text-slate-600">
                                                <p className="line-clamp-2">
                                                    {log.description || "No description provided."}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveLog(log)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50"
                                                >
                                                    <Eye size={15} />
                                                    Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && logs.length > 0 && (
                        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                            <p className="text-sm text-slate-500">
                                Page <strong className="text-slate-800">{page}</strong> of{" "}
                                <strong className="text-slate-800">{lastPage}</strong>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page <= 1 || loading}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page >= lastPage || loading}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                    <ShieldCheck size={20} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold">Audit trail reminder</p>
                        <p className="mt-1 leading-6">
                            This screen displays the activity information returned by Laravel.
                            It does not itself make logs immutable or guarantee that every action
                            is logged. Protect the API with server-side authorization and record
                            transaction changes in the backend.
                        </p>
                    </div>
                </div>
            </main>

            {activeLog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setActiveLog(null);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="audit-modal-title"
                        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
                            <div>
                                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-700">
                                    <ShieldCheck size={16} />
                                    Audit Record Inspector
                                </div>
                                <h2
                                    id="audit-modal-title"
                                    className="text-xl font-bold text-[#102d55]"
                                >
                                    Transaction History
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Record ID: {activeLog.id ?? "—"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveLog(null)}
                                aria-label="Close audit details"
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <section className="rounded-xl border border-slate-200 p-4">
                                    <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                                        <Clock size={17} className="text-teal-700" />
                                        Activity Information
                                    </h3>
                                    <Detail label="Date and Time" value={formatDate(activeLog.created_at)} />
                                    <Detail label="Action" value={activeLog.action} />
                                    <Detail label="Module" value={activeLog.module} />
                                    <Detail label="Reference Number" value={activeLog.reference_no} />
                                    <Detail label="Reference ID" value={activeLog.reference_id} />
                                    <Detail label="Description" value={activeLog.description} />
                                </section>

                                <section className="rounded-xl border border-slate-200 p-4">
                                    <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                                        <User size={17} className="text-teal-700" />
                                        User Information
                                    </h3>
                                    <Detail label="Name" value={activeLog.user_name} />
                                    <Detail label="Role" value={activeLog.user_role} />
                                    <Detail label="User ID" value={activeLog.user_id} />
                                    <Detail label="IP Address" value={activeLog.ip_address} />
                                    <Detail label="Device / Browser" value={activeLog.user_agent} />
                                </section>

                                <section className="rounded-xl border border-slate-200 p-4">
                                    <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                                        <History size={17} className="text-teal-700" />
                                        Change Summary
                                    </h3>
                                    <Detail label="Event" value={properties.event} />
                                    <Detail
                                        label="Changed Fields"
                                        value={
                                            changedFields.length
                                                ? changedFields.map(fieldLabel).join(", ")
                                                : changes.length
                                                  ? changes.map((change) => fieldLabel(change.field)).join(", ")
                                                  : "No field-level changes recorded"
                                        }
                                    />
                                    <Detail
                                        label="Transaction"
                                        value={
                                            activeLog.reference_no ||
                                            activeLog.reference_id ||
                                            "Not specified"
                                        }
                                    />
                                </section>
                            </div>

                            <section>
                                <div className="mb-3">
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Changes Made
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Previous values are compared with the new values saved in the audit record.
                                    </p>
                                </div>

                                {changes.length > 0 ? (
                                    <div className="overflow-hidden rounded-xl border border-slate-200">
                                        <div className="hidden grid-cols-[1fr_1fr_36px_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500 sm:grid">
                                            <span>Field</span>
                                            <span>Previous Value</span>
                                            <span />
                                            <span>New Value</span>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {changes.map((change) => (
                                                <div
                                                    key={change.field}
                                                    className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[1fr_1fr_36px_1fr] sm:items-center"
                                                >
                                                    <p className="font-semibold text-slate-800">
                                                        {fieldLabel(change.field)}
                                                    </p>
                                                    <div className="rounded-lg bg-red-50 p-3">
                                                        <p className="mb-1 text-xs font-semibold text-red-700 sm:hidden">
                                                            Previous
                                                        </p>
                                                        <p className="break-words whitespace-pre-wrap text-sm text-red-900">
                                                            {displayValue(change.before)}
                                                        </p>
                                                    </div>
                                                    <div className="hidden justify-center text-slate-400 sm:flex">
                                                        <ArrowRight size={18} />
                                                    </div>
                                                    <div className="rounded-lg bg-emerald-50 p-3">
                                                        <p className="mb-1 text-xs font-semibold text-emerald-700 sm:hidden">
                                                            New Value
                                                        </p>
                                                        <p className="break-words whitespace-pre-wrap text-sm text-emerald-900">
                                                            {displayValue(change.after)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-sm font-semibold text-slate-700">
                                            {changedFields.length
                                                ? "The field names were saved, but before-and-after values are not available."
                                                : "No field-level comparison is available for this record."}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Older records may not include snapshots. New comparisons will appear only when the backend saves before-and-after values.
                                        </p>
                                    </div>
                                )}
                            </section>

                            <div className="space-y-3">
                                <RecordSection
                                    title={
                                        properties.deleted_record
                                            ? "Deleted Record Details"
                                            : "Original Record Details"
                                    }
                                    data={beforeRecord}
                                />
                                <RecordSection
                                    title="Updated Record Details"
                                    data={afterRecord}
                                />
                                <RecordSection
                                    title="Advanced Audit Data (JSON)"
                                    data={properties}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
                            <p className="text-xs text-slate-500">
                                <CalendarDays size={14} className="mr-1 inline" />
                                Recorded: {formatDate(activeLog.created_at)}
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveLog(null)}
                                className="rounded-xl bg-[#102d55] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173f73]"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
