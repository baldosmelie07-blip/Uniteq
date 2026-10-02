import { useEffect, useState, useMemo } from "react";
import {
    ShieldCheck,
    Search,
    RefreshCw,
    Filter,
    Calendar,
    Download,
    Printer,
    CheckCircle2,
    AlertCircle,
    User,
    Clock,
    FileText,
    Receipt,
    Wallet,
    Info,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import api from "../api/api";

export default function AuditTrail() {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        total_logs: 0,
        today_logs: 0,
        receipt_logs: 0,
        voucher_logs: 0,
        auth_logs: 0,
    });
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [selectedModule, setSelectedModule] = useState("All");
    const [selectedAction, setSelectedAction] = useState("All");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Selected log for detail modal
    const [activeLog, setActiveLog] = useState(null);

    useEffect(() => {
        loadLogs(currentPage);
    }, [currentPage, selectedModule, selectedAction, dateFrom, dateTo]);

    async function loadLogs(page = 1) {
        try {
            setLoading(true);

            const params = {
                page,
                per_page: 25,
            };

            if (selectedModule !== "All") params.module = selectedModule;
            if (selectedAction !== "All") params.action = selectedAction;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;
            if (search.trim()) params.search = search.trim();

            const response = await api.get("/activity-logs", { params });

            if (response.data) {
                setLogs(response.data.logs || []);
                setTotalPages(response.data.last_page || 1);
                setCurrentPage(response.data.current_page || 1);
                setTotalItems(response.data.total || 0);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
            }
        } catch (error) {
            console.error("Failed to load activity logs:", error);
        } finally {
            setLoading(false);
        }
    }

    function handleSearchSubmit(e) {
        e.preventDefault();
        setCurrentPage(1);
        loadLogs(1);
    }

    function clearFilters() {
        setSearch("");
        setSelectedModule("All");
        setSelectedAction("All");
        setDateFrom("");
        setDateTo("");
        setCurrentPage(1);
    }

    function formatDateTime(dateString) {
        if (!dateString) return "—";
        const date = new Date(dateString);
        return date.toLocaleString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });
    }

    function getActionBadge(action) {
        switch (action) {
            case "CREATED":
                return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "UPDATED":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "DELETED":
                return "bg-red-100 text-red-800 border-red-200";
            case "PAYMENT":
                return "bg-amber-100 text-amber-800 border-amber-200";
            case "LOGIN":
                return "bg-purple-100 text-purple-800 border-purple-200";
            case "LOGOUT":
                return "bg-gray-100 text-gray-800 border-gray-200";
            default:
                return "bg-slate-100 text-slate-800 border-slate-200";
        }
    }

    function getModuleIcon(module) {
        switch (module) {
            case "Receipts":
            case "Collections":
                return <Receipt className="w-4 h-4 text-emerald-600" />;
            case "Vouchers":
                return <Wallet className="w-4 h-4 text-blue-600" />;
            case "Users":
                return <User className="w-4 h-4 text-purple-600" />;
            case "Authentication":
                return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
            default:
                return <FileText className="w-4 h-4 text-gray-600" />;
        }
    }

    function exportCSV() {
        if (logs.length === 0) {
            alert("No activity logs to export.");
            return;
        }

        const headers = ["Timestamp", "User", "Role", "Module", "Action", "Reference No", "Description", "IP Address"];
        const rows = logs.map((log) => [
            `"${formatDateTime(log.created_at)}"`,
            `"${log.user_name || "System"}"`,
            `"${log.user_role || "—"}"`,
            `"${log.module}"`,
            `"${log.action}"`,
            `"${log.reference_no || ""}"`,
            `"${(log.description || "").replace(/"/g, '""')}"`,
            `"${log.ip_address || ""}"`,
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `UniTeq_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function printAuditTrail() {
        if (logs.length === 0) {
            alert("No logs to print.");
            return;
        }

        const tableRows = logs
            .map(
                (log) => `
                <tr>
                    <td style="white-space: nowrap; font-size: 11px;">${formatDateTime(log.created_at)}</td>
                    <td><strong>${log.user_name || "System"}</strong><br><span style="font-size: 10px; color: #666;">${log.user_role || ""}</span></td>
                    <td>${log.module}</td>
                    <td><span style="display:inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; background: #eee;">${log.action}</span></td>
                    <td>${log.reference_no || "—"}</td>
                    <td style="font-size: 11px;">${log.description}</td>
                    <td style="font-family: monospace; font-size: 10px;">${log.ip_address || "—"}</td>
                </tr>
            `
            )
            .join("");

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>UniTeq Audit Trail Report</title>
                <style>
                    @page { size: landscape; margin: 12mm; }
                    body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 10px; }
                    .header { text-align: center; border-bottom: 2px solid #003366; padding-bottom: 10px; margin-bottom: 15px; }
                    .header h1 { margin: 0; font-size: 18px; color: #003366; }
                    .header h2 { margin: 3px 0; font-size: 13px; color: #555; }
                    .header p { margin: 2px 0; font-size: 11px; color: #777; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
                    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
                    th { background-color: #f2f5f9; font-weight: bold; color: #003366; }
                    tr:nth-child(even) { background-color: #fafafa; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>UNIVERSITY OF ABRA — MAIN CAMPUS</h1>
                    <h2>Cashier's Unit & Financial Management System (UniTeq)</h2>
                    <p>OFFICIAL SYSTEM AUDIT TRAIL & TRANSACTION LOG</p>
                    <p style="font-size: 10px;">Generated on: ${new Date().toLocaleString("en-PH")}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Officer</th>
                            <th>Module</th>
                            <th>Action</th>
                            <th>Reference No.</th>
                            <th>Event Description</th>
                            <th>IP Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-r from-[#102d55] to-[#1c4b82] text-white rounded-2xl p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-semibold mb-2">
                            <ShieldCheck size={14} />
                            Government Accountability & ISO/IEC 25010 Security
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold">Transaction Tracking & Audit Trail</h1>
                        <p className="text-blue-100 text-sm mt-1">
                            Immutable, chronological activity log recording every cashier action, receipt issuance, and disbursement verification.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => loadLogs(currentPage)}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button
                            onClick={exportCSV}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition"
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                        <button
                            onClick={printAuditTrail}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#102d55] hover:bg-blue-50 font-semibold text-sm transition shadow-sm"
                        >
                            <Printer size={16} />
                            Print Log
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Total Events Recorded</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_logs.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Today's Transactions</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.today_logs.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Receipt & Collections</p>
                            <p className="text-2xl font-bold text-[#102d55] mt-1">{stats.receipt_logs.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#102d55] flex items-center justify-center">
                            <Receipt size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">Disbursement Vouchers</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.voucher_logs.toLocaleString()}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Wallet size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by description, OR #, Voucher #, cashier name, or IP..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Module Selector */}
                        <select
                            value={selectedModule}
                            onChange={(e) => {
                                setSelectedModule(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                            <option value="All">All Modules</option>
                            <option value="Receipts">Receipts</option>
                            <option value="Vouchers">Vouchers</option>
                            <option value="Users">Users</option>
                            <option value="Authentication">Authentication</option>
                        </select>

                        {/* Action Selector */}
                        <select
                            value={selectedAction}
                            onChange={(e) => {
                                setSelectedAction(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                            <option value="All">All Actions</option>
                            <option value="CREATED">Created</option>
                            <option value="UPDATED">Updated</option>
                            <option value="PAYMENT">Payment</option>
                            <option value="DELETED">Deleted</option>
                            <option value="LOGIN">Login</option>
                            <option value="LOGOUT">Logout</option>
                        </select>

                        {/* Date From */}
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            title="From Date"
                        />

                        {/* Date To */}
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                            title="To Date"
                        />

                        <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm transition"
                        >
                            Filter
                        </button>

                        {(search || selectedModule !== "All" || selectedAction !== "All" || dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-3 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-600 text-sm transition"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Officer / User</th>
                                <th className="px-6 py-4">Module</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Event Description</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin mx-auto mb-3"></div>
                                        Loading audit trail records...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        <Info size={28} className="mx-auto text-gray-300 mb-2" />
                                        No activity logs found matching the filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-blue-50/40 transition">
                                        <td className="px-6 py-3.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                                            {formatDateTime(log.created_at)}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{log.user_name || "System"}</div>
                                            <div className="text-xs text-gray-500">{log.user_role || "Authorized User"}</div>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 font-medium text-gray-700">
                                                {getModuleIcon(log.module)}
                                                <span>{log.module}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionBadge(
                                                    log.action
                                                )}`}
                                            >
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            {log.reference_no ? (
                                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                                                    {log.reference_no}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-800 max-w-md truncate" title={log.description}>
                                            {log.description}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-xs text-gray-500 font-mono">
                                            {log.ip_address || "127.0.0.1"}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => setActiveLog(log)}
                                                className="text-blue-600 hover:text-blue-900 font-medium text-xs hover:underline"
                                            >
                                                Inspect
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-gray-100 gap-3 text-sm text-gray-600">
                    <div>
                        Showing <span className="font-semibold">{logs.length}</span> of{" "}
                        <span className="font-semibold">{totalItems}</span> recorded events
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1 || loading}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                            title="Previous Page"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-xs font-medium px-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages || loading}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition"
                            title="Next Page"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Audit Inspector Modal */}
            {activeLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                    <ShieldCheck size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Audit Record Details</h3>
                                    <p className="text-xs text-gray-500">Record ID #{activeLog.id} • UniTeq Security Log</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setActiveLog(null)}
                                className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs text-gray-500 block">Timestamp</span>
                                    <span className="font-semibold text-gray-900 text-sm">
                                        {formatDateTime(activeLog.created_at)}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs text-gray-500 block">Authorized Officer</span>
                                    <span className="font-semibold text-gray-900 text-sm">
                                        {activeLog.user_name || "System"} ({activeLog.user_role || "User"})
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs text-gray-500 block">Module / Action</span>
                                    <span className="font-semibold text-gray-900 text-sm">
                                        {activeLog.module} • {activeLog.action}
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs text-gray-500 block">Reference Identifier</span>
                                    <span className="font-semibold text-gray-900 text-sm font-mono">
                                        {activeLog.reference_no || "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                <span className="text-xs font-semibold text-blue-900 block mb-1">Event Description</span>
                                <p className="text-sm text-gray-800">{activeLog.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <span className="text-xs text-gray-500 block">Client IP Address</span>
                                    <span className="font-mono text-xs text-gray-800">{activeLog.ip_address || "127.0.0.1"}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 truncate">
                                    <span className="text-xs text-gray-500 block">User Agent</span>
                                    <span className="font-mono text-xs text-gray-800 truncate block" title={activeLog.user_agent}>
                                        {activeLog.user_agent || "UniTeq Web App"}
                                    </span>
                                </div>
                            </div>

                            {activeLog.properties && Object.keys(activeLog.properties).length > 0 && (
                                <div>
                                    <span className="text-xs font-semibold text-gray-700 block mb-1.5">
                                        Transaction Payload / Diff
                                    </span>
                                    <pre className="p-3 bg-gray-900 text-green-400 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
                                        {JSON.stringify(activeLog.properties, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
                            <button
                                onClick={() => setActiveLog(null)}
                                className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-medium text-sm transition"
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
