
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Search,
    Plus,
    Eye,
    Edit,
    X,
    RefreshCw,
    Receipt as ReceiptIcon,
    Wallet,
    CalendarDays,
    Printer,
    Download,
    User,
    FileText,
    CreditCard,
    Hash,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

const EMPTY_FORM = {
    date: new Date().toLocaleDateString("en-CA"),
    collection_id: "",
    collection_type: "",
    purpose: "",
    payer_name: "",
    address_department: "",
    description: "",
    amount_due: "",
    cash_received: "",
    payment_method: "Cash",
};

function getHeaders() {
    const token =
        localStorage.getItem("uniteq_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("uniteq_token") ||
        sessionStorage.getItem("token");

    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

function getResponseData(response) {
    const data = response?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.receipts)) return data.receipts;
    if (Array.isArray(data?.collections)) return data.collections;

    return [];
}

function money(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(Number(value) || 0);
}

function numberValue(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

function dateToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function displayDate(value) {
    if (!value) return "—";

    const date = new Date(`${String(value).substring(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function receiptNumber(receipt) {
    return (
        receipt?.receipt_number ||
        receipt?.receipt_no ||
        `OR-${String(receipt?.id || 0).padStart(4, "0")}`
    );
}

function receiptAmountDue(receipt) {
    return numberValue(
        receipt?.amount_due ??
            receipt?.original_amount ??
            receipt?.amountDue ??
            receipt?.amount ??
            0
    );
}

function receiptCashReceived(receipt) {
    return numberValue(
        receipt?.cash_received ??
            receipt?.cashReceived ??
            receipt?.amount_paid ??
            receipt?.amountPaid ??
            receipt?.amount ??
            0
    );
}

function receiptChange(receipt) {
    const savedChange = receipt?.change_amount ?? receipt?.changeAmount;

    if (savedChange !== undefined && savedChange !== null) {
        return numberValue(savedChange);
    }

    return Math.max(receiptCashReceived(receipt) - receiptAmountDue(receipt), 0);
}

function getCollectionId(collection) {
    return String(collection?.id ?? "");
}

function getCollectionName(collection) {
    return (
        collection?.name ||
        collection?.collection_name ||
        collection?.collection_type ||
        collection?.purpose ||
        collection?.title ||
        ""
    );
}

function getCollectionFee(collection) {
    return numberValue(
        collection?.fee ??
            collection?.fixed_fee ??
            collection?.amount_due ??
            collection?.price ??
            collection?.amount ??
            0
    );
}

function getCollectionNameFromReceipt(receipt) {
    return (
        receipt?.collection?.name ||
        receipt?.collection?.collection_name ||
        receipt?.collection_type ||
        receipt?.collection_name ||
        receipt?.purpose ||
        "Unspecified collection"
    );
}

function getErrorMessage(error, fallback) {
    const data = error?.response?.data;

    if (data?.errors) {
        return Object.values(data.errors).flat().join("\n");
    }

    return data?.message || error?.message || fallback;
}

function printableReceipt(receipt) {
    const due = receiptAmountDue(receipt);
    const received = receiptCashReceived(receipt);
    const change = receiptChange(receipt);

    const escapeHtml = (value) =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    const rows = [
        ["Receipt Number", receiptNumber(receipt)],
        ["Date", displayDate(receipt.date)],
        ["Payer", receipt.payer_name || "—"],
        ["Address / Department", receipt.address_department || "—"],
        ["Collection", getCollectionNameFromReceipt(receipt)],
        ["Purpose", receipt.purpose || "—"],
        ["Payment Method", receipt.payment_method || "Cash"],
    ];

    const details = rows
        .map(
            ([label, value]) => `
                <div class="detail">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                </div>
            `
        )
        .join("");

    const description = receipt.description
        ? `<p class="description">${escapeHtml(receipt.description)}</p>`
        : "";

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Official Receipt ${escapeHtml(receiptNumber(receipt))}</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    font-family: Arial, Helvetica, sans-serif;
                    color: #172033;
                    margin: 0;
                    padding: 28px;
                    background: #fff;
                }
                .receipt {
                    max-width: 720px;
                    margin: 0 auto;
                    border: 1px solid #d7dee8;
                    padding: 30px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #102d55;
                    padding-bottom: 20px;
                    margin-bottom: 22px;
                }
                .header h1 {
                    color: #102d55;
                    font-size: 22px;
                    margin: 0 0 7px;
                }
                .header p {
                    font-size: 12px;
                    margin: 4px 0;
                    color: #526071;
                }
                .header h2 {
                    font-size: 17px;
                    margin: 18px 0 0;
                    letter-spacing: 2px;
                }
                .receipt-number {
                    text-align: right;
                    color: #102d55;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
                .details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px 25px;
                }
                .detail {
                    border-bottom: 1px solid #e5e7eb;
                    padding: 8px 0;
                    min-width: 0;
                }
                .detail span {
                    display: block;
                    font-size: 11px;
                    color: #667085;
                    margin-bottom: 5px;
                }
                .detail strong {
                    display: block;
                    font-size: 13px;
                    overflow-wrap: anywhere;
                }
                .amounts {
                    margin-top: 25px;
                    border: 1px solid #d7dee8;
                    padding: 18px;
                }
                .amount-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 15px;
                    padding: 7px 0;
                    font-size: 13px;
                }
                .amount-row.total {
                    border-top: 1px solid #d7dee8;
                    margin-top: 8px;
                    padding-top: 14px;
                    font-size: 16px;
                    font-weight: bold;
                    color: #102d55;
                }
                .description {
                    white-space: pre-wrap;
                    overflow-wrap: anywhere;
                    font-size: 12px;
                    margin-top: 20px;
                }
                .footer {
                    text-align: center;
                    color: #667085;
                    font-size: 11px;
                    margin-top: 32px;
                    border-top: 1px dashed #cbd5e1;
                    padding-top: 16px;
                }
                .signatures {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    margin-top: 45px;
                    text-align: center;
                    font-size: 11px;
                }
                .signature-line {
                    border-top: 1px solid #344054;
                    padding-top: 8px;
                }
                @media print {
                    body { padding: 0; }
                    .receipt {
                        border: none;
                        max-width: none;
                        padding: 10px;
                    }
                    @page { margin: 12mm; }
                }
            </style>
        </head>
        <body>
            <main class="receipt">
                <header class="header">
                    <h1>UNIVERSITY OF ABRA</h1>
                    <p>Main Campus</p>
                    <p>Cashier's Unit</p>
                    <h2>PAYMENT RECEIPT</h2>
                </header>

                <div class="receipt-number">
                    Receipt No.: ${escapeHtml(receiptNumber(receipt))}
                </div>

                <section class="details">${details}</section>

                <section class="amounts">
                    <div class="amount-row">
                        <span>Amount Due</span>
                        <strong>${escapeHtml(money(due))}</strong>
                    </div>
                    <div class="amount-row">
                        <span>Cash Received</span>
                        <strong>${escapeHtml(money(received))}</strong>
                    </div>
                    <div class="amount-row total">
                        <span>Change</span>
                        <strong>${escapeHtml(money(change))}</strong>
                    </div>
                </section>

                ${description}

                <div class="signatures">
                    <div class="signature-line">Cashier / Authorized Personnel</div>
                    <div class="signature-line">Payer's Signature</div>
                </div>

                <footer class="footer">
                    This receipt was generated by UniTeq.
                    Please keep it for your records.
                </footer>
            </main>
            <script>
                window.onload = function () {
                    window.focus();
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
}

function printReceipt(receipt) {
    const printWindow = window.open("", "_blank", "width=850,height=750");

    if (!printWindow) {
        alert("The print window was blocked. Allow pop-ups for this site and try again.");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(printableReceipt(receipt));
    printWindow.document.close();
}

export default function Receipts() {
    const [receipts, setReceipts] = useState([]);
    const [collections, setCollections] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    const [form, setForm] = useState({ ...EMPTY_FORM });

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("uniteq_user") ||
                    localStorage.getItem("user") ||
                    localStorage.getItem("auth_user") ||
                    localStorage.getItem("currentUser") ||
                    "null"
            );
        } catch {
            return null;
        }
    });

    const role = String(currentUser?.role || "").toLowerCase();

    const canManageReceipts =
        role === "cashier" ||
        role === "system administrator" ||
        role === "system_administrator" ||
        role === "admin" ||
        role === "administrator";

    const activeCollections = useMemo(
        () =>
            collections.filter(
                (collection) =>
                    collection.is_active !== false &&
                    collection.active !== false &&
                    collection.status !== "inactive"
            ),
        [collections]
    );

    const selectedFormCollection = useMemo(
        () =>
            activeCollections.find(
                (collection) =>
                    getCollectionId(collection) === String(form.collection_id)
            ) || null,
        [activeCollections, form.collection_id]
    );

    const amountDue = numberValue(form.amount_due);
    const cashReceived = numberValue(form.cash_received);
    const changeAmount = Math.max(cashReceived - amountDue, 0);
    const amountShort = Math.max(amountDue - cashReceived, 0);

    const loadReceipts = useCallback(async () => {
        const response = await axios.get(`${API}/receipts`, {
            headers: getHeaders(),
        });

        setReceipts(getResponseData(response));
    }, []);

    const loadCollections = useCallback(async () => {
        const response = await axios.get(`${API}/collections`, {
            headers: getHeaders(),
        });

        setCollections(getResponseData(response));
    }, []);

    const loadPage = useCallback(async () => {
        setLoading(true);

        try {
            const results = await Promise.allSettled([
                loadReceipts(),
                loadCollections(),
            ]);

            const receiptResult = results[0];
            const collectionResult = results[1];

            if (receiptResult.status === "rejected") {
                throw receiptResult.reason;
            }

            if (collectionResult.status === "rejected") {
                console.error(
                    "Could not load registered collections:",
                    collectionResult.reason?.response?.data ||
                        collectionResult.reason
                );

                alert(
                    "Receipts loaded, but registered collections could not be loaded. Check that GET /api/collections is configured in Laravel."
                );
            }
        } catch (error) {
            console.error(
                "Unable to load receipts:",
                error?.response?.data || error
            );

            if (error?.response?.status === 401) {
                alert("Your session has expired. Please log in again.");
            } else if (error?.response?.status === 403) {
                alert("Your account is not authorized to view receipts.");
            } else {
                alert(
                    getErrorMessage(
                        error,
                        "Unable to load receipts. Check whether Laravel is running."
                    )
                );
            }
        } finally {
            setLoading(false);
        }
    }, [loadReceipts, loadCollections]);

    useEffect(() => {
        loadPage();
    }, [loadPage]);

    useEffect(() => {
        async function loadAuthenticatedUser() {
            try {
                const response = await axios.get(`${API}/me`, {
                    headers: getHeaders(),
                });

                const user = response.data?.user || response.data;

                if (user && typeof user === "object") {
                    setCurrentUser(user);
                    localStorage.setItem("uniteq_user", JSON.stringify(user));
                }
            } catch {
                // Keep the locally stored user if /me is not available.
            }
        }

        loadAuthenticatedUser();
    }, []);

    function resetForm() {
        setForm({
            ...EMPTY_FORM,
            date: dateToday(),
        });
        setEditingReceipt(null);
    }

    function openAddForm() {
        resetForm();
        setShowForm(true);
    }

    function openEditForm(receipt) {
        const linkedCollectionId =
            receipt.collection_id ??
            receipt.collection?.id ??
            "";

        const linkedCollection =
            collections.find(
                (collection) =>
                    getCollectionId(collection) === String(linkedCollectionId)
            ) || null;

        setEditingReceipt(receipt);
        setForm({
            date: String(receipt.date || dateToday()).substring(0, 10),
            collection_id: linkedCollectionId ? String(linkedCollectionId) : "",
            collection_type:
                receipt.collection_type ||
                getCollectionNameFromReceipt(receipt),
            purpose: receipt.purpose || "",
            payer_name: receipt.payer_name || "",
            address_department: receipt.address_department || "",
            description: receipt.description || "",
            amount_due: String(
                receiptAmountDue(receipt) ||
                    (linkedCollection ? getCollectionFee(linkedCollection) : "")
            ),
            cash_received: String(receiptCashReceived(receipt)),
            payment_method: receipt.payment_method || "Cash",
        });

        setShowForm(true);
    }

    function handleFormChange(event) {
        const { name, value } = event.target;

        if (name === "collection_id") {
            const collection = activeCollections.find(
                (item) => getCollectionId(item) === String(value)
            );

            setForm((previous) => ({
                ...previous,
                collection_id: value,
                collection_type: collection ? getCollectionName(collection) : "",
                purpose: collection ? getCollectionName(collection) : "",
                amount_due: collection
                    ? String(getCollectionFee(collection))
                    : "",
            }));

            return;
        }

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function validateForm() {
        if (!form.date) {
            alert("Please select the receipt date.");
            return false;
        }

        if (!form.collection_id) {
            alert("Please select a registered collection.");
            return false;
        }

        if (!selectedFormCollection) {
            alert("The selected collection is no longer available. Refresh the page and try again.");
            return false;
        }

        if (!form.payer_name.trim()) {
            alert("Please enter the payer's name.");
            return false;
        }

        if (amountDue <= 0) {
            alert("The registered collection must have a fee greater than zero.");
            return false;
        }

        if (cashReceived < amountDue) {
            alert(
                `The amount received is not enough. The fee is ${money(amountDue)}. The payer still owes ${money(amountShort)}.`
            );
            return false;
        }

        if (!form.payment_method) {
            alert("Please select a payment method.");
            return false;
        }

        return true;
    }

    async function handleSave(event) {
        event.preventDefault();

        if (!canManageReceipts) {
            alert("Your account does not have permission to create or edit receipts.");
            return;
        }

        if (!validateForm()) return;

        const selectedCollection = selectedFormCollection;
        const fee = getCollectionFee(selectedCollection);
        const received = numberValue(form.cash_received);
        const change = Math.max(received - fee, 0);

        /*
         * amount_paid is the amount applied to the fee, not the cash handed
         * over by the payer. cash_received and change_amount are separate.
         *
         * The Laravel ReceiptController and database migration must support
         * cash_received, change_amount, and collection_id.
         */
        const payload = {
            date: form.date,
            collection_id: Number(form.collection_id),
            collection_type: getCollectionName(selectedCollection),
            purpose: getCollectionName(selectedCollection),
            payer_name: form.payer_name.trim(),
            address_department: form.address_department.trim() || null,
            description: form.description.trim() || null,

            amount_due: fee,
            original_amount: fee,

            // Amount applied to the fee.
            amount_paid: fee,
            amount: fee,
            amount_collected: fee,

            // Actual money handed over and returned as change.
            cash_received: received,
            change_amount: change,

            payment_method: form.payment_method,
        };

        try {
            setSaving(true);

            if (editingReceipt?.id) {
                await axios.put(
                    `${API}/receipts/${editingReceipt.id}`,
                    payload,
                    { headers: getHeaders() }
                );
            } else {
                await axios.post(`${API}/receipts`, payload, {
                    headers: getHeaders(),
                });
            }

            alert(
                editingReceipt
                    ? "Receipt updated successfully."
                    : "Receipt saved successfully."
            );

            setShowForm(false);
            resetForm();

            await loadReceipts();
        } catch (error) {
            console.error(
                "Receipt save error:",
                error?.response?.data || error
            );

            if (error?.response?.status === 422) {
                alert(
                    getErrorMessage(
                        error,
                        "Please check the receipt details."
                    )
                );
            } else if (error?.response?.status === 401) {
                alert("Your session has expired. Please log in again.");
            } else if (error?.response?.status === 403) {
                alert("You are not authorized to save receipts.");
            } else if (error?.response?.status === 404) {
                alert(
                    "The receipt or selected collection could not be found."
                );
            } else {
                alert(
                    getErrorMessage(
                        error,
                        "Could not save the receipt. Check the Laravel backend and database migration."
                    )
                );
            }
        } finally {
            setSaving(false);
        }
    }

    const filteredReceipts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return [...receipts]
            .filter((receipt) => {
                const searchableText = [
                    receiptNumber(receipt),
                    receipt.payer_name,
                    receipt.purpose,
                    receipt.collection_type,
                    receipt.collection_name,
                    getCollectionNameFromReceipt(receipt),
                    receipt.address_department,
                    receipt.payment_method,
                    receipt.description,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(query);
            })
            .sort((a, b) => {
                const dateA = String(a.date || "");
                const dateB = String(b.date || "");

                if (dateA !== dateB) {
                    return dateB.localeCompare(dateA);
                }

                return numberValue(b.id) - numberValue(a.id);
            });
    }, [receipts, search]);

    const totalCollected = receipts.reduce(
        (total, receipt) => total + receiptAmountDue(receipt),
        0
    );

    const todayCollected = receipts.reduce((total, receipt) => {
        if (String(receipt.date || "").substring(0, 10) === dateToday()) {
            return total + receiptAmountDue(receipt);
        }

        return total;
    }, 0);

    function exportCsv() {
        if (!filteredReceipts.length) {
            alert("There are no receipts to export.");
            return;
        }

        const headers = [
            "Receipt Number",
            "Date",
            "Payer Name",
            "Collection",
            "Purpose",
            "Amount Due",
            "Cash Received",
            "Change",
            "Payment Method",
        ];

        const rows = filteredReceipts.map((receipt) => [
            receiptNumber(receipt),
            String(receipt.date || "").substring(0, 10),
            receipt.payer_name || "",
            getCollectionNameFromReceipt(receipt),
            receipt.purpose || "",
            receiptAmountDue(receipt).toFixed(2),
            receiptCashReceived(receipt).toFixed(2),
            receiptChange(receipt).toFixed(2),
            receipt.payment_method || "",
        ]);

        const csvCell = (value) =>
            `"${String(value ?? "").replaceAll('"', '""')}"`;

        const csv = [headers, ...rows]
            .map((row) => row.map(csvCell).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `uniteq-receipts-${dateToday()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-6 py-7 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg">
                            <ReceiptIcon size={32} className="text-[#102d55]" />
                        </div>

                        <div>
                            <p className="text-sm text-blue-100">
                                University of Abra | Main Campus · Cashier's Unit
                            </p>
                            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                                Official Receipts
                            </h1>
                            <p className="mt-2 text-blue-100">
                                Record payments, calculate change, and print receipts.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={loadPage}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/80 px-4 py-3 font-semibold transition hover:bg-white hover:text-[#102d55] disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={exportCsv}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/80 px-4 py-3 font-semibold transition hover:bg-white hover:text-[#102d55]"
                        >
                            <Download size={17} />
                            Export CSV
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-7 px-6 py-8">
                <section className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    <SummaryCard
                        title="Total Payments Recorded"
                        value={money(totalCollected)}
                        note="Total fees applied to receipts"
                        icon={<Wallet size={24} />}
                        color="green"
                    />

                    <SummaryCard
                        title="Today's Payments"
                        value={money(todayCollected)}
                        note="Fees recorded today"
                        icon={<CalendarDays size={24} />}
                        color="blue"
                    />

                    <SummaryCard
                        title="Receipt Records"
                        value={String(receipts.length)}
                        note="Total saved receipts"
                        icon={<ReceiptIcon size={24} />}
                        color="navy"
                    />
                </section>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-[#102d55]">
                                Receipt Records
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Search, view, update, and print payment receipts.
                            </p>
                        </div>

                        {canManageReceipts && (
                            <button
                                type="button"
                                onClick={openAddForm}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white transition hover:bg-teal-700"
                            >
                                <Plus size={18} />
                                Create Receipt
                            </button>
                        )}
                    </div>

                    <div className="border-b border-gray-100 px-6 py-5">
                        <div className="relative max-w-xl">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search receipt number, payer, or collection..."
                                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#edf3f8] text-[#102d55]">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">
                                        RECEIPT NO.
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">
                                        PAYER
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">
                                        COLLECTION
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">
                                        AMOUNT DUE
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-4 text-right font-semibold">
                                        CHANGE
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-4 text-left font-semibold">
                                        DATE
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-4 text-center font-semibold">
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            <span className="inline-flex items-center gap-3">
                                                <RefreshCw
                                                    size={18}
                                                    className="animate-spin"
                                                />
                                                Loading receipts...
                                            </span>
                                        </td>
                                    </tr>
                                ) : filteredReceipts.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-12 text-center text-gray-500"
                                        >
                                            <ReceiptIcon
                                                size={36}
                                                className="mx-auto mb-3 text-gray-300"
                                            />
                                            <p className="font-semibold">
                                                No receipts found
                                            </p>
                                            <p className="mt-1 text-sm">
                                                {search
                                                    ? "Try a different search."
                                                    : "Create a receipt after registering collection fees."}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReceipts.map((receipt) => (
                                        <tr
                                            key={receipt.id}
                                            className="transition hover:bg-gray-50"
                                        >
                                            <td className="whitespace-nowrap px-4 py-5 font-semibold text-[#102d55]">
                                                {receiptNumber(receipt)}
                                            </td>

                                            <td className="px-4 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-50">
                                                        <User
                                                            size={16}
                                                            className="text-cyan-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {receipt.payer_name || "—"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {receipt.address_department || "No department"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-5">
                                                <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
                                                    <FileText size={13} />
                                                    {getCollectionNameFromReceipt(receipt)}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-5 text-right font-bold text-green-700">
                                                {money(receiptAmountDue(receipt))}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-5 text-right font-semibold text-[#102d55]">
                                                {money(receiptChange(receipt))}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-5 text-gray-600">
                                                {displayDate(receipt.date)}
                                            </td>

                                            <td className="px-4 py-5">
                                                <div className="flex items-center justify-center gap-3 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedReceipt(receipt)}
                                                        className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900"
                                                    >
                                                        <Eye size={15} />
                                                        View
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => printReceipt(receipt)}
                                                        className="inline-flex items-center gap-1 text-green-700 hover:text-green-900"
                                                    >
                                                        <Printer size={15} />
                                                        Print
                                                    </button>

                                                    {canManageReceipts && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditForm(receipt)}
                                                            className="inline-flex items-center gap-1 text-[#102d55] hover:text-blue-700"
                                                        >
                                                            <Edit size={15} />
                                                            Edit
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-200 px-6 py-4 text-sm text-gray-500">
                        Showing {filteredReceipts.length} of {receipts.length} receipt records
                    </div>
                </section>
            </main>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                    <div className="my-6 max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
                            <div>
                                <h2 className="text-xl font-bold text-[#102d55]">
                                    {editingReceipt ? "Edit Receipt" : "Create Official Receipt"}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Choose a registered collection to load its fixed fee.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    resetForm();
                                }}
                                disabled={saving}
                                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                                aria-label="Close form"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6 p-6">
                            {activeCollections.length === 0 && (
                                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <div>
                                        <p className="font-semibold">
                                            No registered collections are available.
                                        </p>
                                        <p className="mt-1">
                                            Open the Collections page and register a collection name and fixed fee first. Then refresh this page.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <FormField label="Receipt Date *">
                                    <input
                                        type="date"
                                        name="date"
                                        value={form.date}
                                        onChange={handleFormChange}
                                        required
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Registered Collection / Fee *">
                                    <select
                                        name="collection_id"
                                        value={form.collection_id}
                                        onChange={handleFormChange}
                                        required
                                        disabled={activeCollections.length === 0}
                                        className={inputClass}
                                    >
                                        <option value="">Select a collection</option>
                                        {activeCollections.map((collection) => (
                                            <option
                                                key={collection.id}
                                                value={collection.id}
                                            >
                                                {getCollectionName(collection)} — {money(getCollectionFee(collection))}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>

                                <FormField label="Payer / Student Name *">
                                    <input
                                        type="text"
                                        name="payer_name"
                                        value={form.payer_name}
                                        onChange={handleFormChange}
                                        required
                                        maxLength={255}
                                        placeholder="Enter the payer's full name"
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Address / Department">
                                    <input
                                        type="text"
                                        name="address_department"
                                        value={form.address_department}
                                        onChange={handleFormChange}
                                        maxLength={255}
                                        placeholder="Enter department or address"
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Fixed Amount Due (₱)">
                                    <input
                                        type="number"
                                        value={form.amount_due}
                                        readOnly
                                        className={`${inputClass} bg-gray-100 font-semibold text-gray-700`}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        This amount comes from the registered collection fee.
                                    </p>
                                </FormField>

                                <FormField label="Cash Received (₱) *">
                                    <input
                                        type="number"
                                        name="cash_received"
                                        value={form.cash_received}
                                        onChange={handleFormChange}
                                        min={form.amount_due || "0.01"}
                                        step="0.01"
                                        required
                                        placeholder="Enter amount handed over"
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Payment Method *">
                                    <select
                                        name="payment_method"
                                        value={form.payment_method}
                                        onChange={handleFormChange}
                                        required
                                        className={inputClass}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Online Payment">Online Payment</option>
                                        <option value="Check">Check</option>
                                    </select>
                                </FormField>

                                <FormField label="Purpose">
                                    <input
                                        type="text"
                                        value={selectedFormCollection ? getCollectionName(selectedFormCollection) : form.purpose}
                                        readOnly
                                        className={`${inputClass} bg-gray-100`}
                                    />
                                </FormField>

                                <div className="md:col-span-2">
                                    <FormField label="Description / Notes">
                                        <textarea
                                            name="description"
                                            value={form.description}
                                            onChange={handleFormChange}
                                            rows={3}
                                            maxLength={2000}
                                            placeholder="Optional notes about this payment"
                                            className={`${inputClass} resize-y`}
                                        />
                                    </FormField>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <AmountPanel
                                    title="Amount Due"
                                    value={money(amountDue)}
                                    tone="blue"
                                />
                                <AmountPanel
                                    title="Cash Received"
                                    value={money(cashReceived)}
                                    tone="gray"
                                />
                                <AmountPanel
                                    title="Change to Return"
                                    value={money(changeAmount)}
                                    tone="green"
                                />
                            </div>

                            {cashReceived > 0 && cashReceived < amountDue && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                    <p>
                                        Payment is short by {money(amountShort)}. Enter at least {money(amountDue)} to complete this receipt.
                                    </p>
                                </div>
                            )}

                            {cashReceived >= amountDue && amountDue > 0 && (
                                <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                                    <CheckCircle size={18} className="mt-0.5 shrink-0" />
                                    <p>
                                        The payment covers the fee. Return {money(changeAmount)} in change to the payer.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        resetForm();
                                    }}
                                    disabled={saving}
                                    className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        activeCollections.length === 0 ||
                                        !form.collection_id
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw size={17} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={17} />
                                            {editingReceipt ? "Save Changes" : "Save Receipt"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                    <div className="my-6 max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between rounded-t-2xl bg-[#102d55] px-6 py-5 text-white">
                            <div>
                                <h2 className="text-xl font-bold">Receipt Details</h2>
                                <p className="mt-1 text-sm text-blue-100">
                                    {receiptNumber(selectedReceipt)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedReceipt(null)}
                                className="rounded-lg p-2 hover:bg-white/10"
                                aria-label="Close receipt details"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Detail label="Receipt Number" value={receiptNumber(selectedReceipt)} />
                                <Detail label="Date" value={displayDate(selectedReceipt.date)} />
                                <Detail label="Payer" value={selectedReceipt.payer_name || "—"} />
                                <Detail label="Collection" value={getCollectionNameFromReceipt(selectedReceipt)} />
                                <Detail label="Address / Department" value={selectedReceipt.address_department || "—"} />
                                <Detail label="Payment Method" value={selectedReceipt.payment_method || "Cash"} />
                            </div>

                            <div className="space-y-3 rounded-xl border border-gray-200 p-5">
                                <MoneyDetail label="Amount Due" value={money(receiptAmountDue(selectedReceipt))} />
                                <MoneyDetail label="Cash Received" value={money(receiptCashReceived(selectedReceipt))} />
                                <MoneyDetail label="Change" value={money(receiptChange(selectedReceipt))} highlight />
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Description / Notes</p>
                                <p className="mt-2 whitespace-pre-wrap text-gray-800">
                                    {selectedReceipt.description || "No description provided."}
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5">
                                {canManageReceipts && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const receipt = selectedReceipt;
                                            setSelectedReceipt(null);
                                            openEditForm(receipt);
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#102d55] px-5 py-3 font-semibold text-white hover:bg-blue-900"
                                    >
                                        <Edit size={17} />
                                        Edit
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => printReceipt(selectedReceipt)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"
                                >
                                    <Printer size={17} />
                                    Print Receipt
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedReceipt(null)}
                                    className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputClass =
    "w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-gray-100";

function FormField({ label, children }) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">
                {label}
            </span>
            {children}
        </label>
    );
}

function SummaryCard({ title, value, note, icon, color }) {
    const colors = {
        green: {
            icon: "bg-green-50 text-green-600",
            value: "text-green-600",
        },
        blue: {
            icon: "bg-blue-50 text-blue-600",
            value: "text-blue-600",
        },
        navy: {
            icon: "bg-blue-50 text-[#102d55]",
            value: "text-[#102d55]",
        },
    };

    const selected = colors[color] || colors.navy;

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <h2 className={`mt-2 text-2xl font-bold ${selected.value}`}>
                        {value}
                    </h2>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${selected.icon}`}>
                    {icon}
                </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">{note}</p>
        </div>
    );
}

function AmountPanel({ title, value, tone }) {
    const tones = {
        blue: "border-blue-100 bg-blue-50 text-[#102d55]",
        gray: "border-gray-200 bg-gray-50 text-gray-800",
        green: "border-green-100 bg-green-50 text-green-700",
    };

    return (
        <div className={`rounded-xl border p-4 ${tones[tone] || tones.gray}`}>
            <p className="text-sm opacity-80">{title}</p>
            <p className="mt-2 text-xl font-bold">{value}</p>
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 break-words font-semibold text-gray-900">
                {value}
            </p>
        </div>
    );
}

function MoneyDetail({ label, value, highlight = false }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">{label}</span>
            <span className={`font-bold ${highlight ? "text-green-700" : "text-gray-900"}`}>
                {value}
            </span>
        </div>
    );
}
