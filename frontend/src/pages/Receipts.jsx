
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Receipt as ReceiptIcon,
    Eye,
    X,
    RefreshCw,
    Plus,
    Pencil,
    CheckCircle,
    Clock,
    AlertCircle,
    CreditCard,
    User,
    CalendarDays,
    FileText,
    Wallet,
} from "lucide-react";
import api from "../api/api";

const EMPTY_FORM = {
    date: "",
    payer_name: "",
    purpose: "",
    amount_due: "",
    amount_paid: "0",
    payment_method: "Cash",
    address_department: "",
    description: "",
};

function unwrapCollection(data) {
    if (Array.isArray(data)) return data;

    const candidates = [
        data?.data,
        data?.receipts,
        data?.results,
        data?.data?.data,
        data?.receipts?.data,
        data?.results?.data,
    ];

    return candidates.find(Array.isArray) || [];
}

function getReceiptNumber(receipt) {
    return (
        receipt?.receipt_number ||
        receipt?.receipt_no ||
        receipt?.or_number ||
        (receipt?.id != null
            ? `OR-${String(receipt.id).padStart(4, "0")}`
            : "OR-PENDING")
    );
}

function getPayer(receipt) {
    return receipt?.payer_name || receipt?.payer?.name || "—";
}

function getPurpose(receipt) {
    return receipt?.purpose || receipt?.fee_type || "—";
}

function getAmountDue(receipt) {
    const value =
        receipt?.original_amount ??
        receipt?.amount_due ??
        receipt?.total_amount ??
        receipt?.amount ??
        0;

    return Math.max(Number(value) || 0, 0);
}

function getAmountPaid(receipt) {
    const value =
        receipt?.amount_paid ??
        receipt?.paid_amount ??
        receipt?.total_paid ??
        receipt?.payments_total ??
        ((receipt?.amount_due != null ||
            receipt?.original_amount != null ||
            receipt?.total_amount != null)
            ? receipt?.amount
            : 0) ??
        0;

    return Math.max(Number(value) || 0, 0);
}

function getRemainingBalance(receipt) {
    const value =
        receipt?.remaining_balance ??
        receipt?.balance_due ??
        receipt?.outstanding_balance;

    if (value !== undefined && value !== null) {
        return Math.max(Number(value) || 0, 0);
    }

    return Math.max(getAmountDue(receipt) - getAmountPaid(receipt), 0);
}

function getStatus(receipt) {
    const due = getAmountDue(receipt);
    const paid = getAmountPaid(receipt);
    const balance = getRemainingBalance(receipt);

    if (balance <= 0 && (due > 0 || paid > 0)) return "Paid";
    if (paid > 0 || (due > 0 && balance < due)) return "Partially Paid";

    return "Unpaid";
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
}

function formatDate(value) {
    if (!value) return "—";

    const dateOnly = String(value).substring(0, 10);
    const date = new Date(`${dateOnly}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function getStatusStyle(status) {
    if (status === "Paid") return "bg-green-100 text-green-700";
    if (status === "Partially Paid") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-700";
}

function getStatusIcon(status) {
    if (status === "Paid") return <CheckCircle size={15} />;
    if (status === "Partially Paid") return <Clock size={15} />;
    return <AlertCircle size={15} />;
}

function getErrorMessage(error, fallback) {
    const status = error?.response?.status;

    if (status === 401) {
        return "Your session has expired or you are not logged in. Please log in again.";
    }

    if (status === 403) {
        return "You do not have permission to perform this action.";
    }

    const validationErrors = error?.response?.data?.errors;

    if (validationErrors) {
        return Object.values(validationErrors)
            .flat()
            .filter(Boolean)
            .join(" ");
    }

    return error?.response?.data?.message || fallback;
}

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export default function Receipts() {
    const location = useLocation();

    const search = useMemo(
        () =>
            new URLSearchParams(location.search)
                .get("search")
                ?.trim() || "",
        [location.search]
    );

    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState(null);

    const [paymentReceipt, setPaymentReceipt] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");

    const [form, setForm] = useState({
        ...EMPTY_FORM,
        date: getToday(),
    });

    const loadReceipts = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const response = await api.get("/receipts");

            setReceipts(unwrapCollection(response.data));
        } catch (error) {
            console.error(
                "Unable to load receipts:",
                error.response?.data || error.message
            );

            setReceipts([]);
            setErrorMessage(
                getErrorMessage(
                    error,
                    "Unable to load official receipt records. Check that Laravel is running and the API route is available."
                )
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReceipts();
    }, [loadReceipts]);

    useEffect(() => {
        if (!successMessage) return undefined;

        const timeout = window.setTimeout(() => {
            setSuccessMessage("");
        }, 4000);

        return () => window.clearTimeout(timeout);
    }, [successMessage]);

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key !== "Escape" || saving) return;

            if (paymentReceipt) {
                setPaymentReceipt(null);
                return;
            }

            if (showModal) {
                setShowModal(false);
                return;
            }

            if (selectedReceipt) {
                setSelectedReceipt(null);
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [paymentReceipt, saving, selectedReceipt, showModal]);

    function openAddModal() {
        setEditingReceipt(null);
        setForm({
            ...EMPTY_FORM,
            date: getToday(),
        });
        setErrorMessage("");
        setShowModal(true);
    }

    function openEditModal(receipt) {
        setEditingReceipt(receipt);

        setForm({
            date: receipt.date
                ? String(receipt.date).substring(0, 10)
                : getToday(),
            payer_name: receipt.payer_name || "",
            purpose: receipt.purpose || receipt.fee_type || "",
            amount_due: String(getAmountDue(receipt)),
            amount_paid: String(getAmountPaid(receipt)),
            payment_method: receipt.payment_method || "Cash",
            address_department: receipt.address_department || "",
            description: receipt.description || "",
        });

        setErrorMessage("");
        setShowModal(true);
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        const amountDue = Number(form.amount_due);
        const amountPaid = Number(form.amount_paid || 0);

        if (!form.payer_name.trim()) {
            setErrorMessage("Please enter the payer name.");
            return;
        }

        if (!form.purpose.trim()) {
            setErrorMessage("Please enter the fee type or purpose.");
            return;
        }

        if (
            form.amount_due === "" ||
            !Number.isFinite(amountDue) ||
            amountDue <= 0
        ) {
            setErrorMessage("Enter an amount due greater than zero.");
            return;
        }

        if (!Number.isFinite(amountPaid) || amountPaid < 0) {
            setErrorMessage("Enter a valid amount paid.");
            return;
        }

        if (amountPaid > amountDue) {
            setErrorMessage("Amount paid cannot exceed amount due.");
            return;
        }

        const payload = {
            date: form.date,
            payer_name: form.payer_name.trim(),
            purpose: form.purpose.trim(),
            amount_due: amountDue,
            amount_paid: amountPaid,
            payment_method: form.payment_method,
            address_department: form.address_department.trim(),
            description: form.description.trim(),
        };

        try {
            setSaving(true);

            if (editingReceipt) {
                await api.put(
                    `/receipts/${editingReceipt.id}`,
                    payload
                );

                setSuccessMessage("Receipt updated successfully.");
            } else {
                await api.post("/receipts", payload);

                setSuccessMessage("Receipt created successfully.");
            }

            setShowModal(false);
            setEditingReceipt(null);

            await loadReceipts();
        } catch (error) {
            console.error(
                "Unable to save receipt:",
                error.response?.data || error.message
            );

            setErrorMessage(
                getErrorMessage(
                    error,
                    "Unable to save the receipt. Please check the information and try again."
                )
            );
        } finally {
            setSaving(false);
        }
    }

    function openPaymentDialog(receipt) {
        const balance = getRemainingBalance(receipt);

        if (balance <= 0) {
            setErrorMessage("This receipt is already fully paid.");
            return;
        }

        setErrorMessage("");
        setPaymentReceipt(receipt);
        setPaymentAmount(String(balance));
    }

    async function recordPayment(event) {
        event.preventDefault();

        if (!paymentReceipt) return;

        setErrorMessage("");
        setSuccessMessage("");

        const amount = Number(paymentAmount);
        const balance = getRemainingBalance(paymentReceipt);

        if (!Number.isFinite(amount) || amount <= 0) {
            setErrorMessage("Enter a payment amount greater than zero.");
            return;
        }

        if (amount > balance) {
            setErrorMessage(
                `Payment cannot exceed the remaining balance of ${formatCurrency(balance)}.`
            );
            return;
        }

        const confirmed = window.confirm(
            `Record a payment of ${formatCurrency(amount)} for ${getReceiptNumber(paymentReceipt)}?\n\nContinue only if the payment has actually been received.`
        );

        if (!confirmed) return;

        const receiptBeingPaid = paymentReceipt;

        try {
            setSaving(true);

            await api.post(
                `/receipts/${receiptBeingPaid.id}/payment`,
                { amount }
            );

            setPaymentReceipt(null);
            setPaymentAmount("");
            setSuccessMessage("Payment recorded successfully.");

            await loadReceipts();

            if (selectedReceipt?.id === receiptBeingPaid.id) {
                try {
                    const updatedResponse = await api.get(
                        `/receipts/${receiptBeingPaid.id}`
                    );

                    const updated =
                        updatedResponse.data?.receipt ||
                        updatedResponse.data?.data ||
                        updatedResponse.data;

                    setSelectedReceipt(updated);
                } catch {
                    // The receipt list has already been refreshed.
                    setSelectedReceipt((previous) => {
                        if (!previous || previous.id !== receiptBeingPaid.id) {
                            return previous;
                        }

                        return (
                            receipts.find(
                                (item) => item.id === receiptBeingPaid.id
                            ) || previous
                        );
                    });
                }
            }
        } catch (error) {
            console.error(
                "Unable to record payment:",
                error.response?.data || error.message
            );

            setErrorMessage(
                getErrorMessage(error, "Unable to record the payment.")
            );
        } finally {
            setSaving(false);
        }
    }

    async function markAsPaid(receipt) {
        const balance = getRemainingBalance(receipt);

        if (balance <= 0) {
            setErrorMessage("This receipt is already fully paid.");
            return;
        }

        const confirmed = window.confirm(
            `Record the remaining balance of ${formatCurrency(balance)} as paid for ${getReceiptNumber(receipt)}?\n\nOnly continue if the payment has actually been received.`
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            await api.post(
                `/receipts/${receipt.id}/payment`,
                { amount: balance }
            );

            setSelectedReceipt(null);
            setSuccessMessage("Remaining payment recorded successfully.");

            await loadReceipts();
        } catch (error) {
            console.error(
                "Unable to record final payment:",
                error.response?.data || error.message
            );

            setErrorMessage(
                getErrorMessage(error, "Unable to record the payment.")
            );
        } finally {
            setSaving(false);
        }
    }

    const sortedReceipts = useMemo(() => {
        return [...receipts].sort((a, b) => {
            const numberA = Number(
                String(getReceiptNumber(a)).match(/\d+$/)?.[0] || 0
            );
            const numberB = Number(
                String(getReceiptNumber(b)).match(/\d+$/)?.[0] || 0
            );

            if (numberA !== numberB) return numberB - numberA;

            return (
                new Date(b.created_at || b.date || 0).getTime() -
                new Date(a.created_at || a.date || 0).getTime()
            );
        });
    }, [receipts]);

    const filteredReceipts = useMemo(() => {
        const query = search.toLowerCase();

        return sortedReceipts.filter((receipt) => {
            const searchableText = [
                getReceiptNumber(receipt),
                getPayer(receipt),
                getPurpose(receipt),
                receipt.description || "",
                receipt.payment_method || "",
                receipt.address_department || "",
                receipt.date || "",
                formatDate(receipt.date || receipt.created_at),
                getStatus(receipt),
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(query);
        });
    }, [search, sortedReceipts]);

    const totalReceipts = receipts.length;

    const totalDue = receipts.reduce(
        (total, receipt) => total + getAmountDue(receipt),
        0
    );

    const totalPaid = receipts.reduce(
        (total, receipt) => total + getAmountPaid(receipt),
        0
    );

    const totalBalance = receipts.reduce(
        (total, receipt) => total + getRemainingBalance(receipt),
        0
    );

    const paidCount = receipts.filter(
        (receipt) => getStatus(receipt) === "Paid"
    ).length;

    const partialCount = receipts.filter(
        (receipt) => getStatus(receipt) === "Partially Paid"
    ).length;

    const unpaidCount = receipts.filter(
        (receipt) => getStatus(receipt) === "Unpaid"
    ).length;

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-[#102d55] px-7 py-6 text-white shadow-lg">
                <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full border border-white/10" />
                <div className="absolute bottom-[-100px] right-24 h-56 w-56 rounded-full border border-white/10" />

                <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-md">
                            <ReceiptIcon size={29} className="text-[#102d55]" />
                        </div>

                        <div>
                            <p className="text-sm text-blue-100">
                                University of Abra | Main Campus
                                <br />
                                Cashier&apos;s Unit
                            </p>
                            <h1 className="text-3xl font-bold">
                                Official Receipts
                            </h1>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={loadReceipts}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white px-5 py-3 font-semibold transition hover:bg-white hover:text-[#102d55] disabled:opacity-60"
                    >
                        <RefreshCw
                            size={17}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh
                    </button>
                </div>
            </div>

            {errorMessage && (
                <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 sm:flex-row sm:items-start sm:justify-between"
                >
                    <div className="flex items-start gap-2">
                        <AlertCircle size={20} className="mt-0.5 shrink-0" />
                        <p className="text-sm">{errorMessage}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setErrorMessage("")}
                        aria-label="Dismiss error"
                        className="self-end rounded-lg p-1 hover:bg-red-100 sm:self-start"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {successMessage && (
                <div
                    role="status"
                    className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"
                >
                    <CheckCircle size={19} />
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard title="Total Receipts" value={totalReceipts} />
                <SummaryCard title="Amount Due" value={formatCurrency(totalDue)} />
                <SummaryCard
                    title="Amount Paid"
                    value={formatCurrency(totalPaid)}
                    valueClass="text-green-600"
                />
                <SummaryCard
                    title="Remaining"
                    value={formatCurrency(totalBalance)}
                    valueClass="text-red-600"
                />

                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs font-bold text-green-700">
                            {paidCount} Paid
                        </span>
                        <span className="text-xs font-bold text-yellow-700">
                            {partialCount} Partial
                        </span>
                        <span className="text-xs font-bold text-red-700">
                            {unpaidCount} Unpaid
                        </span>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                                <ReceiptIcon size={22} className="text-[#102d55]" />
                            </div>

                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Receipt Portal
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Create, update, and monitor official receipt transactions.
                                </p>

                                {search && (
                                    <p className="mt-1 text-sm text-[#007c8b]">
                                        Global search: &quot;{search}&quot; —{" "}
                                        {filteredReceipts.length} result(s)
                                    </p>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={openAddModal}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0797a6] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#067f8b]"
                        >
                            <Plus size={19} />
                            Add New Receipt
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead className="bg-[#eef4f8]">
                            <tr>
                                {[
                                    "Receipt No.",
                                    "Date",
                                    "Payer",
                                    "Fee Type",
                                    "Status",
                                    "Action",
                                ].map((heading) => (
                                    <th
                                        key={heading}
                                        className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600"
                                    >
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center text-gray-500">
                                        <RefreshCw
                                            size={25}
                                            className="mx-auto mb-3 animate-spin"
                                        />
                                        Loading official receipts...
                                    </td>
                                </tr>
                            ) : filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-14 text-center text-gray-500">
                                        {search
                                            ? `No receipts match "${search}".`
                                            : "No official receipts found."}
                                    </td>
                                </tr>
                            ) : (
                                filteredReceipts.map((receipt) => {
                                    const status = getStatus(receipt);

                                    return (
                                        <tr
                                            key={receipt.id}
                                            className="transition hover:bg-blue-50/40"
                                        >
                                            <td className="px-5 py-5 font-bold text-[#102d55]">
                                                {getReceiptNumber(receipt)}
                                            </td>

                                            <td className="px-5 py-5 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays size={16} className="text-gray-400" />
                                                    {formatDate(receipt.date || receipt.created_at)}
                                                </div>
                                            </td>

                                            <td className="px-5 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50">
                                                        <User size={17} className="text-cyan-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            {getPayer(receipt)}
                                                        </p>
                                                        {receipt.address_department && (
                                                            <p className="text-xs text-gray-500">
                                                                {receipt.address_department}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-5">
                                                <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                                    <FileText size={14} />
                                                    {getPurpose(receipt)}
                                                </span>
                                            </td>

                                            <td className="px-5 py-5 text-center">
                                                <span
                                                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${getStatusStyle(status)}`}
                                                >
                                                    {getStatusIcon(status)}
                                                    {status}
                                                </span>
                                            </td>

                                            <td className="px-5 py-5">
                                                <div className="flex flex-wrap items-center justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedReceipt(receipt)}
                                                        className="inline-flex items-center gap-1.5 font-semibold text-[#007c8b] hover:text-[#005b66]"
                                                    >
                                                        <Eye size={16} />
                                                        View
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(receipt)}
                                                        className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-900"
                                                    >
                                                        <Pencil size={15} />
                                                        Edit
                                                    </button>

                                                    {status !== "Paid" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openPaymentDialog(receipt)}
                                                            disabled={saving}
                                                            className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:text-green-900 disabled:opacity-50"
                                                        >
                                                            <CreditCard size={16} />
                                                            Record Payment
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && (
                    <div className="border-t border-gray-100 px-6 py-3 text-sm text-gray-500">
                        Showing {filteredReceipts.length} of {receipts.length} receipt(s)
                    </div>
                )}
            </div>

            {showModal && (
                <ModalShell onClose={() => !saving && setShowModal(false)}>
                    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
                            <div>
                                <p className="text-sm text-gray-500">Official Receipt</p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {editingReceipt ? "Update Receipt" : "Add New Receipt"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                disabled={saving}
                                aria-label="Close receipt form"
                                className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6 p-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <FormField label="Date">
                                    <input
                                        type="date"
                                        name="date"
                                        value={form.date}
                                        onChange={handleChange}
                                        required
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Payer Name">
                                    <input
                                        type="text"
                                        name="payer_name"
                                        value={form.payer_name}
                                        onChange={handleChange}
                                        placeholder="Enter payer name"
                                        required
                                        maxLength={255}
                                        className={inputClass}
                                    />
                                </FormField>

                                <div className="md:col-span-2">
                                    <FormField label="Fee Type / Purpose">
                                        <input
                                            type="text"
                                            name="purpose"
                                            value={form.purpose}
                                            onChange={handleChange}
                                            placeholder="e.g. Tuition Fee, Certificate of Enrollment"
                                            required
                                            maxLength={255}
                                            className={inputClass}
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Amount Due">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        name="amount_due"
                                        value={form.amount_due}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Amount Paid">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={form.amount_due || undefined}
                                        name="amount_paid"
                                        value={form.amount_paid}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Payment Method">
                                    <select
                                        name="payment_method"
                                        value={form.payment_method}
                                        onChange={handleChange}
                                        className={inputClass}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Check">Check</option>
                                    </select>
                                </FormField>

                                <FormField label="Address / Department">
                                    <input
                                        type="text"
                                        name="address_department"
                                        value={form.address_department}
                                        onChange={handleChange}
                                        placeholder="e.g. BSIT Department"
                                        maxLength={255}
                                        className={inputClass}
                                    />
                                </FormField>

                                <div className="md:col-span-2">
                                    <FormField label="Description">
                                        <textarea
                                            name="description"
                                            value={form.description}
                                            onChange={handleChange}
                                            rows={4}
                                            placeholder="Additional details about the transaction..."
                                            className={`${inputClass} resize-none`}
                                        />
                                    </FormField>
                                </div>
                            </div>

                            <div className="rounded-xl border border-[#d7eeee] bg-[#eef7f8] p-5">
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <PreviewAmount
                                        label="Amount Due"
                                        value={formatCurrency(Number(form.amount_due || 0))}
                                    />
                                    <PreviewAmount
                                        label="Amount Paid"
                                        value={formatCurrency(Number(form.amount_paid || 0))}
                                    />
                                    <PreviewAmount
                                        label="Remaining Balance"
                                        value={formatCurrency(
                                            Math.max(
                                                Number(form.amount_due || 0) -
                                                    Number(form.amount_paid || 0),
                                                0
                                            )
                                        )}
                                    />
                                </div>

                                <div className="mt-5 flex items-center gap-2 border-t border-[#d7eeee] pt-4">
                                    <CreditCard size={18} className="text-[#0797a6]" />
                                    <span className="text-sm font-semibold text-gray-700">
                                        Payment Status:
                                    </span>
                                    {(() => {
                                        const due = Number(form.amount_due || 0);
                                        const paid = Number(form.amount_paid || 0);
                                        const status =
                                            due > 0 && paid >= due
                                                ? "Paid"
                                                : paid > 0
                                                ? "Partially Paid"
                                                : "Unpaid";

                                        return (
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(status)}`}
                                            >
                                                {status}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={saving}
                                    className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-[#0797a6] px-6 py-3 font-semibold text-white hover:bg-[#067f8b] disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingReceipt
                                        ? "Update Receipt"
                                        : "Save Receipt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalShell>
            )}

            {selectedReceipt && (
                <ModalShell onClose={() => setSelectedReceipt(null)}>
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b p-6">
                            <div>
                                <p className="text-sm text-gray-500">Official Receipt</p>
                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getReceiptNumber(selectedReceipt)}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedReceipt(null)}
                                aria-label="Close receipt details"
                                className="rounded-lg p-2 hover:bg-gray-100"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="space-y-6 p-6">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <Detail
                                    label="Date"
                                    value={formatDate(selectedReceipt.date || selectedReceipt.created_at)}
                                />
                                <Detail label="Payer" value={getPayer(selectedReceipt)} />
                                <Detail
                                    label="Fee Type / Purpose"
                                    value={getPurpose(selectedReceipt)}
                                />
                                <Detail
                                    label="Payment Method"
                                    value={selectedReceipt.payment_method || "Cash"}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <DetailAmount
                                    label="Amount Due"
                                    value={formatCurrency(getAmountDue(selectedReceipt))}
                                />
                                <DetailAmount
                                    label="Amount Paid"
                                    value={formatCurrency(getAmountPaid(selectedReceipt))}
                                    green
                                />
                                <DetailAmount
                                    label="Remaining Balance"
                                    value={formatCurrency(getRemainingBalance(selectedReceipt))}
                                    red
                                />
                            </div>

                            <div>
                                <p className="mb-2 text-xs uppercase text-gray-500">
                                    Payment Status
                                </p>
                                <span
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${getStatusStyle(getStatus(selectedReceipt))}`}
                                >
                                    {getStatusIcon(getStatus(selectedReceipt))}
                                    {getStatus(selectedReceipt)}
                                </span>
                            </div>

                            {getRemainingBalance(selectedReceipt) > 0 && (
                                <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                                    <Wallet size={20} className="mt-0.5 text-yellow-700" />
                                    <div>
                                        <p className="font-bold text-yellow-800">
                                            Outstanding Balance
                                        </p>
                                        <p className="mt-1 text-sm text-yellow-700">
                                            This receipt has a remaining balance of{" "}
                                            <strong>
                                                {formatCurrency(getRemainingBalance(selectedReceipt))}
                                            </strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <Detail
                                label="Address / Department"
                                value={selectedReceipt.address_department || "—"}
                            />

                            <div>
                                <p className="mb-2 text-xs uppercase text-gray-500">
                                    Description
                                </p>
                                <div className="rounded-xl bg-gray-50 p-4 text-gray-700">
                                    {selectedReceipt.description || "No description provided."}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 border-t p-6 sm:flex-row sm:justify-end">
                            {getStatus(selectedReceipt) !== "Paid" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const receipt = selectedReceipt;
                                        setSelectedReceipt(null);
                                        openPaymentDialog(receipt);
                                    }}
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    <CreditCard size={17} />
                                    Record Payment
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    const receipt = selectedReceipt;
                                    setSelectedReceipt(null);
                                    openEditModal(receipt);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                            >
                                <Pencil size={17} />
                                Edit Receipt
                            </button>

                            {getRemainingBalance(selectedReceipt) > 0 && (
                                <button
                                    type="button"
                                    onClick={() => markAsPaid(selectedReceipt)}
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-600 px-5 py-3 font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
                                >
                                    <CheckCircle size={17} />
                                    {saving ? "Recording..." : "Settle Remaining"}
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setSelectedReceipt(null)}
                                className="rounded-xl border border-gray-300 px-5 py-3 font-semibold hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </ModalShell>
            )}

            {paymentReceipt && (
                <ModalShell
                    onClose={() => !saving && setPaymentReceipt(null)}
                    overlayClass="bg-black/60"
                    zIndex="z-[60]"
                >
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b p-6">
                            <div>
                                <p className="text-sm text-gray-500">Official Receipt</p>
                                <h2 className="text-xl font-bold text-[#102d55]">
                                    Record Payment
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {getReceiptNumber(paymentReceipt)} — {getPayer(paymentReceipt)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPaymentReceipt(null)}
                                disabled={saving}
                                aria-label="Close payment dialog"
                                className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={recordPayment} className="space-y-5 p-6">
                            <div className="grid grid-cols-2 gap-3">
                                <DetailAmount
                                    label="Amount Due"
                                    value={formatCurrency(getAmountDue(paymentReceipt))}
                                />
                                <DetailAmount
                                    label="Remaining Balance"
                                    value={formatCurrency(getRemainingBalance(paymentReceipt))}
                                    red
                                />
                            </div>

                            <FormField label="Payment Received Now">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={getRemainingBalance(paymentReceipt)}
                                    value={paymentAmount}
                                    onChange={(event) => setPaymentAmount(event.target.value)}
                                    required
                                    className={inputClass}
                                />
                            </FormField>

                            <p className="text-sm text-gray-500">
                                This amount will be added to the previously paid total.
                                Only confirm after the payment has actually been received.
                            </p>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentReceipt(null)}
                                    disabled={saving}
                                    className="rounded-xl border border-gray-300 px-5 py-3 font-semibold disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {saving ? "Recording..." : "Confirm Payment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalShell>
            )}
        </div>
    );
}

const inputClass =
    "w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-[#0797a6]";

function ModalShell({
    children,
    onClose,
    overlayClass = "bg-black/50",
    zIndex = "z-50",
}) {
    return (
        <div
            className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 ${overlayClass}`}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            {children}
        </div>
    );
}

function SummaryCard({
    title,
    value,
    valueClass = "text-[#102d55]",
}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{title}</p>
            <h2 className={`mt-2 text-xl font-bold ${valueClass}`}>
                {value}
            </h2>
        </div>
    );
}

function FormField({ label, children }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
                {label}
            </label>
            {children}
        </div>
    );
}

function PreviewAmount({ label, value }) {
    return (
        <div>
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="mt-1 text-xl font-bold text-[#102d55]">{value}</p>
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <div>
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="mt-1 break-words font-semibold">{value}</p>
        </div>
    );
}

function DetailAmount({
    label,
    value,
    green = false,
    red = false,
}) {
    const color = green
        ? "text-green-700"
        : red
        ? "text-red-700"
        : "text-[#102d55]";

    const background = green
        ? "bg-green-50"
        : red
        ? "bg-red-50"
        : "bg-gray-50";

    return (
        <div className={`${background} rounded-xl p-4`}>
            <p className={`text-xs ${color}`}>{label}</p>
            <p className={`mt-1 break-words text-lg font-bold ${color}`}>
                {value}
            </p>
        </div>
    );
}
