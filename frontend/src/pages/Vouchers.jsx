
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Plus,
    Eye,
    X,
    RefreshCw,
    Ticket,
    Wallet,
    CalendarDays,
    User,
    FileText,
    CheckCircle,
    Clock,
    AlertCircle,
    CreditCard,
    Printer,
} from "lucide-react";
import api from "../api/api";

const API_URL = "/vouchers";

function getToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const initialForm = {
    voucherNumber: "",
    date: getToday(),
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
    status: "Pending",
};

function normalizeVoucher(voucher) {
    return {
        ...voucher,
        voucher_number: voucher?.voucher_number ?? voucher?.voucherNumber ?? "",
        amount_words: voucher?.amount_words ?? voucher?.amountWords ?? "",
        prepared_by: voucher?.prepared_by ?? voucher?.preparedBy ?? "",
        checked_by: voucher?.checked_by ?? voucher?.checkedBy ?? "",
        approved_by: voucher?.approved_by ?? voucher?.approvedBy ?? "",
        received_by: voucher?.received_by ?? voucher?.receivedBy ?? "",
    };
}

function extractVoucherList(data) {
    if (Array.isArray(data)) return data.map(normalizeVoucher);
    if (Array.isArray(data?.data)) return data.data.map(normalizeVoucher);
    if (Array.isArray(data?.vouchers)) return data.vouchers.map(normalizeVoucher);
    if (Array.isArray(data?.data?.data)) return data.data.data.map(normalizeVoucher);
    return [];
}

function getErrorMessage(error, fallback) {
    if (!error.response) {
        return "Cannot connect to the UniTeq server. Check that Laravel is running and the API URL is correct.";
    }

    const status = error.response.status;
    const data = error.response.data;

    if (status === 401) return "Your session has expired. Please log in again.";
    if (status === 403) return "You are not authorized to perform this action.";
    if (status === 404) {
        return "The voucher API endpoint was not found. Check the Laravel API routes.";
    }
    if (status === 422) {
        return data?.errors
            ? Object.values(data.errors).flat().join("\n")
            : data?.message || "Please check the information you entered.";
    }
    if (status >= 500) {
        return data?.message ||
            "The UniTeq server encountered an error. Check the Laravel logs.";
    }

    return data?.message || fallback;
}

export default function Vouchers() {
    const location = useLocation();
    const globalSearch =
        new URLSearchParams(location.search).get("search")?.trim() || "";

    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [form, setForm] = useState({ ...initialForm });
    const [refreshKey, setRefreshKey] = useState(0);

    const loadVouchers = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError("");

            const response = await api.get(API_URL);
            setVouchers(extractVoucherList(response.data));
        } catch (error) {
            console.error("Voucher loading error:", error);
            console.error("Backend response:", error.response?.data);

            setVouchers([]);
            setLoadError(
                getErrorMessage(error, "Unable to load voucher records.")
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadVouchers();
    }, [loadVouchers, refreshKey]);

    function voucherNumber(voucher) {
        return voucher?.voucher_number || voucher?.voucherNumber || "—";
    }

    function voucherDate(voucher) {
        return voucher?.date || voucher?.created_at || "";
    }

    function money(value) {
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

    function statusStyle(status) {
        switch (String(status || "Pending").toLowerCase()) {
            case "paid":
                return "bg-green-100 text-green-700";
            case "approved":
                return "bg-blue-100 text-blue-700";
            case "rejected":
                return "bg-red-100 text-red-700";
            case "under review":
                return "bg-purple-100 text-purple-700";
            default:
                return "bg-amber-100 text-amber-700";
        }
    }

    function statusIcon(status) {
        switch (String(status || "Pending").toLowerCase()) {
            case "paid":
            case "approved":
                return <CheckCircle size={14} />;
            case "rejected":
                return <AlertCircle size={14} />;
            default:
                return <Clock size={14} />;
        }
    }

    const sortedVouchers = useMemo(
        () =>
            [...vouchers].sort((a, b) =>
                String(voucherDate(b)).localeCompare(String(voucherDate(a)))
            ),
        [vouchers]
    );

    const filteredVouchers = useMemo(() => {
        const query = globalSearch.toLowerCase();
        if (!query) return sortedVouchers;

        return sortedVouchers.filter((voucher) => {
            const searchable = [
                voucherNumber(voucher),
                voucher.payee,
                voucher.address,
                voucher.office,
                voucher.purpose,
                voucher.amount,
                voucher.amount_words,
                voucher.prepared_by,
                voucher.checked_by,
                voucher.approved_by,
                voucher.received_by,
                voucher.status,
                voucherDate(voucher),
            ]
                .filter((value) => value !== null && value !== undefined)
                .join(" ")
                .toLowerCase();

            return searchable.includes(query);
        });
    }, [sortedVouchers, globalSearch]);

    function resetForm() {
        setForm({ ...initialForm, date: getToday() });
        setEditingVoucher(null);
    }

    function closeFormModal() {
        setShowAddModal(false);
        resetForm();
    }

    function openAddModal() {
        resetForm();
        setShowAddModal(true);
    }

    function openEditModal(rawVoucher) {
        const voucher = normalizeVoucher(rawVoucher);

        setEditingVoucher(voucher);
        setForm({
            voucherNumber: voucher.voucher_number || "",
            date: String(voucher.date || "").slice(0, 10) || getToday(),
            payee: voucher.payee || "",
            address: voucher.address || "",
            office: voucher.office || "",
            purpose: voucher.purpose || "",
            amount: String(voucher.amount ?? ""),
            amountWords: voucher.amount_words || "",
            preparedBy: voucher.prepared_by || "",
            checkedBy: voucher.checked_by || "",
            approvedBy: voucher.approved_by || "",
            receivedBy: voucher.received_by || "",
            status: voucher.status || "Pending",
        });

        setSelectedVoucher(null);
        setShowAddModal(true);
    }

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!form.voucherNumber.trim()) {
            alert("Please enter the Voucher Number.");
            return;
        }

        if (!form.date) {
            alert("Please select the Voucher Date.");
            return;
        }

        if (!form.payee.trim()) {
            alert("Please enter the Payee or Creditor.");
            return;
        }

        if (!form.purpose.trim()) {
            alert("Please enter the Purpose of Payment.");
            return;
        }

        if (
            form.amount === "" ||
            !Number.isFinite(Number(form.amount)) ||
            Number(form.amount) < 0
        ) {
            alert("Please enter a valid payment amount.");
            return;
        }

        const payload = {
            voucherNumber: form.voucherNumber.trim(),
            date: form.date,
            payee: form.payee.trim(),
            address: form.address.trim() || null,
            office: form.office.trim() || null,
            purpose: form.purpose.trim(),
            amount: Number(form.amount),
            amountWords: form.amountWords.trim() || null,
            preparedBy: form.preparedBy.trim() || null,
            checkedBy: form.checkedBy.trim() || null,
            approvedBy: form.approvedBy.trim() || null,
            receivedBy: form.receivedBy.trim() || null,
            status: form.status || "Pending",
        };

        try {
            setSaving(true);

            if (editingVoucher) {
                await api.put(`${API_URL}/${editingVoucher.id}`, payload);
                alert("Disbursement voucher updated successfully.");
            } else {
                await api.post(API_URL, payload);
                alert("Disbursement voucher saved successfully.");
            }

            closeFormModal();
            setRefreshKey((key) => key + 1);
        } catch (error) {
            console.error("Voucher save error:", error);
            console.error("Backend response:", error.response?.data);

            alert(
                getErrorMessage(
                    error,
                    "Unable to save the voucher. Check the backend response."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    function printVoucher(rawVoucher) {
        const voucher = normalizeVoucher(rawVoucher);
        const printWindow = window.open("", "_blank", "width=900,height=750");

        if (!printWindow) {
            alert("Please allow pop-ups to print the voucher.");
            return;
        }

        const escapeHtml = (value) =>
            String(value ?? "—").replace(/[&<>"']/g, (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;",
            })[character]);

        printWindow.document.write(`
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Disbursement Voucher ${escapeHtml(voucherNumber(voucher))}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 32px; color: #222; }
                    h1, h2, p { margin: 5px 0; }
                    h1 { text-align: center; font-size: 20px; }
                    h2 { text-align: center; font-size: 16px; }
                    .line { border-bottom: 1px solid #333; margin: 20px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                    td, th { border: 1px solid #999; padding: 10px; text-align: left; }
                    .amount { text-align: right; font-weight: bold; }
                    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 55px; }
                    .signature { border-top: 1px solid #333; padding-top: 8px; min-height: 35px; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <h1>UNIVERSITY OF ABRA</h1>
                <h2>DISBURSEMENT VOUCHER</h2>
                <p style="text-align:center">Main Campus</p>
                <div class="line"></div>
                <p><strong>Voucher Number:</strong> ${escapeHtml(voucherNumber(voucher))}</p>
                <p><strong>Date:</strong> ${escapeHtml(formatDate(voucher.date))}</p>
                <p><strong>Requesting Office:</strong> ${escapeHtml(voucher.office)}</p>
                <p><strong>Payee / Creditor:</strong> ${escapeHtml(voucher.payee)}</p>
                <p><strong>Address:</strong> ${escapeHtml(voucher.address)}</p>
                <table>
                    <tr><th>Purpose / Particulars</th><th>Amount (PHP)</th></tr>
                    <tr>
                        <td>${escapeHtml(voucher.purpose)}</td>
                        <td class="amount">${escapeHtml(money(voucher.amount))}</td>
                    </tr>
                    <tr>
                        <td><strong>Amount in Words</strong><br>${escapeHtml(voucher.amount_words)}</td>
                        <td></td>
                    </tr>
                </table>
                <p style="margin-top:18px"><strong>Payment Status:</strong> ${escapeHtml(voucher.status || "Pending")}</p>
                <div class="signatures">
                    <div class="signature"><strong>Prepared by:</strong><br>${escapeHtml(voucher.prepared_by)}</div>
                    <div class="signature"><strong>Checked by:</strong><br>${escapeHtml(voucher.checked_by)}</div>
                    <div class="signature"><strong>Approved by:</strong><br>${escapeHtml(voucher.approved_by)}</div>
                    <div class="signature"><strong>Received by:</strong><br>${escapeHtml(voucher.received_by)}</div>
                </div>
                <script>window.onload = () => window.print();</script>
            </body>
            </html>
        `);

        printWindow.document.close();
    }

    const totalAmount = vouchers.reduce(
        (sum, voucher) => sum + (Number(voucher.amount) || 0),
        0
    );

    const paidAmount = vouchers.reduce(
        (sum, voucher) =>
            String(voucher.status || "").toLowerCase() === "paid"
                ? sum + (Number(voucher.amount) || 0)
                : sum,
        0
    );

    const unsettledAmount = vouchers.reduce(
        (sum, voucher) =>
            String(voucher.status || "").toLowerCase() !== "paid"
                ? sum + (Number(voucher.amount) || 0)
                : sum,
        0
    );

    const paidToday = vouchers.reduce((sum, voucher) => {
        const isPaid = String(voucher.status || "").toLowerCase() === "paid";
        const isToday = String(voucher.date || "").slice(0, 10) === getToday();

        return isPaid && isToday
            ? sum + (Number(voucher.amount) || 0)
            : sum;
    }, 0);

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto max-w-[1500px] px-6 py-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
                            <Ticket size={34} className="text-[#102d55]" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-100">
                                University of Abra | Main Campus · Cashier&apos;s Unit
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-bold mt-1">
                                Disbursement Vouchers
                            </h1>
                            <p className="text-blue-100 mt-2">
                                Record and track office requests for payment to suppliers, employees, and creditors.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setRefreshKey((key) => key + 1)}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-white/80 hover:bg-white hover:text-[#102d55] disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] px-6 py-8 space-y-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <SummaryCard title="Total Voucher Amount" value={money(totalAmount)} icon={<FileText size={24} />} />
                    <SummaryCard title="Paid Vouchers" value={money(paidAmount)} icon={<CheckCircle size={24} />} color="text-green-600" />
                    <SummaryCard title="Paid Today" value={money(paidToday)} icon={<CalendarDays size={24} />} color="text-cyan-600" />
                    <SummaryCard title="Unsettled Amount" value={money(unsettledAmount)} icon={<CreditCard size={24} />} color="text-orange-700" />
                </div>

                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Ticket size={25} className="text-[#102d55]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Voucher Registry</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {filteredVouchers.length} voucher record{filteredVouchers.length === 1 ? "" : "s"}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={openAddModal}
                            className="inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-5 py-3 rounded-xl font-semibold"
                        >
                            <Plus size={19} /> New Disbursement Voucher
                        </button>
                    </div>

                    {globalSearch && (
                        <div className="mx-6 my-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
                            Global search: <strong>{globalSearch}</strong> · {filteredVouchers.length} result(s)
                        </div>
                    )}

                    {loadError && (
                        <div className="mx-6 my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="font-semibold">Unable to load voucher records</p>
                                    <p className="mt-1 whitespace-pre-line">{loadError}</p>
                                    <button
                                        type="button"
                                        onClick={() => setRefreshKey((key) => key + 1)}
                                        className="mt-3 font-semibold underline"
                                    >
                                        Try again
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px]">
                            <thead className="bg-[#eef4f8]">
                                <tr>
                                    {["Voucher Number", "Date", "Requesting Office", "Payee / Creditor", "Purpose", "Status", "Actions"].map((heading) => (
                                        <th key={heading} className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-16 text-center text-gray-500">
                                            <RefreshCw size={28} className="animate-spin mx-auto mb-3" />
                                            Loading voucher records...
                                        </td>
                                    </tr>
                                ) : filteredVouchers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-16 text-center text-gray-500">
                                            <Ticket size={35} className="mx-auto mb-3 text-gray-300" />
                                            <p className="font-semibold">
                                                {loadError ? "Voucher records could not be loaded." : "No voucher records found."}
                                            </p>
                                            <p className="text-sm mt-1">
                                                {loadError
                                                    ? "Check the error above and try again."
                                                    : globalSearch
                                                        ? "Try a different term in the global search."
                                                        : "Create a disbursement voucher to get started."}
                                            </p>
                                        </td>
                                    </tr>
                                ) : filteredVouchers.map((voucher) => (
                                    <tr key={voucher.id} className="hover:bg-blue-50/40">
                                        <td className="px-5 py-5 font-bold text-[#102d55]">{voucherNumber(voucher)}</td>
                                        <td className="px-5 py-5 text-sm">{formatDate(voucherDate(voucher))}</td>
                                        <td className="px-5 py-5">{voucher.office || "—"}</td>
                                        <td className="px-5 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">
                                                    <User size={17} className="text-cyan-600" />
                                                </div>
                                                <span className="font-semibold">{voucher.payee || "—"}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-5 max-w-[260px] truncate" title={voucher.purpose}>
                                            {voucher.purpose || "—"}
                                        </td>
                                        <td className="px-5 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold ${statusStyle(voucher.status)}`}>
                                                {statusIcon(voucher.status)} {voucher.status || "Pending"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setSelectedVoucher(normalizeVoucher(voucher))} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
                                                    <Eye size={15} /> View
                                                </button>
                                                <button type="button" onClick={() => openEditModal(voucher)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
                                                    Edit
                                                </button>
                                                <button type="button" onClick={() => printVoucher(voucher)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#102d55] text-white text-sm hover:bg-[#193f70]">
                                                    <Printer size={15} /> Print
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="bg-white rounded-2xl border p-6">
                        <p className="font-bold text-gray-800">Total Voucher Amount</p>
                        <p className="text-3xl font-bold text-[#102d55] mt-4">{money(totalAmount)}</p>
                    </div>
                    <div className="bg-white rounded-2xl border p-6">
                        <p className="font-bold text-gray-800">Unsettled Vouchers</p>
                        <p className="text-3xl font-bold text-orange-700 mt-4">{money(unsettledAmount)}</p>
                        <p className="text-sm text-gray-500 mt-2">Amounts not marked as Paid.</p>
                    </div>
                    <div className="bg-white rounded-2xl border p-6">
                        <p className="font-bold text-gray-800">Payment Tracking</p>
                        <p className="text-sm text-gray-600 mt-3">
                            Use the voucher status to record the current payment stage. Saving a status does not itself authorize a payment.
                        </p>
                    </div>
                </section>
            </main>

            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
                        <div className="sticky top-0 z-10 bg-white border-b px-6 py-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Cashier&apos;s Unit</p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {editingVoucher ? "Edit Disbursement Voucher" : "New Disbursement Voucher"}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Record the office, payee, payment purpose, and amount.
                                </p>
                            </div>
                            <button type="button" onClick={closeFormModal} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close voucher form">
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Voucher Number *">
                                    <input name="voucherNumber" value={form.voucherNumber} onChange={handleChange} required placeholder="e.g. DV-0002" className={inputClass} />
                                </Field>
                                <Field label="Voucher Date *">
                                    <input type="date" name="date" value={form.date} onChange={handleChange} required className={inputClass} />
                                </Field>
                                <Field label="Requesting Office / Department">
                                    <input name="office" value={form.office} onChange={handleChange} placeholder="e.g. Procurement Office" className={inputClass} />
                                </Field>
                                <Field label="Payee / Supplier / Employee / Creditor *">
                                    <input name="payee" value={form.payee} onChange={handleChange} required placeholder="Name of the person or business to be paid" className={inputClass} />
                                </Field>
                                <Field label="Payee Address">
                                    <input name="address" value={form.address} onChange={handleChange} placeholder="Address (optional)" className={inputClass} />
                                </Field>
                                <Field label="Amount (PHP) *">
                                    <input type="number" min="0" step="0.01" name="amount" value={form.amount} onChange={handleChange} required placeholder="0.00" className={inputClass} />
                                </Field>
                                <Field label="Prepared By">
                                    <input name="preparedBy" value={form.preparedBy} onChange={handleChange} className={inputClass} />
                                </Field>
                                <Field label="Checked By">
                                    <input name="checkedBy" value={form.checkedBy} onChange={handleChange} className={inputClass} />
                                </Field>
                                <Field label="Approved By">
                                    <input name="approvedBy" value={form.approvedBy} onChange={handleChange} className={inputClass} />
                                </Field>
                                <Field label="Received By">
                                    <input name="receivedBy" value={form.receivedBy} onChange={handleChange} className={inputClass} />
                                </Field>
                                <Field label="Payment / Workflow Status">
                                    <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                                        <option>Pending</option>
                                        <option>Under Review</option>
                                        <option>Approved</option>
                                        <option>Paid</option>
                                        <option>Rejected</option>
                                    </select>
                                </Field>
                                <Field label="Amount in Words">
                                    <input name="amountWords" value={form.amountWords} onChange={handleChange} placeholder="Optional amount in words" className={inputClass} />
                                </Field>
                                <div className="md:col-span-2">
                                    <Field label="Purpose / Particulars of Payment *">
                                        <textarea name="purpose" value={form.purpose} onChange={handleChange} required rows="3" placeholder="Explain what the payment is for..." className={`${inputClass} resize-y`} />
                                    </Field>
                                </div>
                            </div>

                            <div className="bg-[#eef7f8] rounded-xl p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Requested Payment Amount</p>
                                    <p className="text-3xl font-bold text-[#102d55] mt-1">{money(form.amount)}</p>
                                </div>
                                <Wallet size={34} className="text-[#0797a6]" />
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                                <button type="button" onClick={closeFormModal} className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-6 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold disabled:opacity-50">
                                    {saving ? "Saving..." : editingVoucher ? "Update Voucher" : "Save Voucher"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedVoucher && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <div>
                                <p className="text-sm text-gray-500">Disbursement Voucher</p>
                                <h2 className="text-2xl font-bold text-[#102d55]">{voucherNumber(selectedVoucher)}</h2>
                            </div>
                            <button type="button" onClick={() => setSelectedVoucher(null)} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close voucher details">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Detail label="Voucher Date" value={formatDate(selectedVoucher.date)} />
                                <Detail label="Requesting Office" value={selectedVoucher.office} />
                                <Detail label="Payee / Creditor" value={selectedVoucher.payee} />
                                <Detail label="Payee Address" value={selectedVoucher.address} />
                                <Detail label="Status" value={selectedVoucher.status || "Pending"} />
                                <Detail label="Amount in Words" value={selectedVoucher.amount_words} />
                                <div className="md:col-span-2">
                                    <p className="text-xs uppercase text-gray-500 mb-2">Purpose / Particulars</p>
                                    <div className="bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">{selectedVoucher.purpose || "—"}</div>
                                </div>
                            </div>

                            <div className="bg-[#eef7f8] rounded-xl p-5">
                                <p className="text-sm text-gray-500">Payment Amount</p>
                                <p className="text-3xl font-bold text-[#102d55] mt-1">{money(selectedVoucher.amount)}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Detail label="Prepared By" value={selectedVoucher.prepared_by} />
                                <Detail label="Checked By" value={selectedVoucher.checked_by} />
                                <Detail label="Approved By" value={selectedVoucher.approved_by} />
                                <Detail label="Received By" value={selectedVoucher.received_by} />
                            </div>

                            <div className="flex flex-wrap justify-end gap-3">
                                <button type="button" onClick={() => printVoucher(selectedVoucher)} className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#102d55] text-white font-semibold">
                                    <Printer size={17} /> Print Voucher
                                </button>
                                <button type="button" onClick={() => openEditModal(selectedVoucher)} className="px-4 py-3 rounded-xl bg-[#0797a6] text-white font-semibold">
                                    Edit Voucher
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end p-6 border-t">
                            <button type="button" onClick={() => setSelectedVoucher(null)} className="px-5 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputClass =
    "w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]";

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
            {children}
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <div>
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="font-semibold mt-1 whitespace-pre-wrap">{value || "—"}</p>
        </div>
    );
}

function SummaryCard({ title, value, icon, color = "text-[#102d55]" }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <h2 className={`text-2xl font-bold mt-2 ${color}`}>{value}</h2>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center ${color}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
