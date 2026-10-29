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
    CheckCircle,
    AlertCircle,
} from "lucide-react";

const API = "https://uniteq-production-zsysbh.laravel.cloud/api";

const inputClass =
    "w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:bg-gray-100";

function getToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM = {
    date: getToday(),
    collection_id: "",
    purpose: "",
    payer_name: "",
    address_department: "",
    description: "",
    amount_due: "",
    cash_received: "",
    payment_method: "Cash",
};

function money(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(Number(value) || 0);
}

function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function displayDate(value) {
    if (!value) return "—";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

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
    let body = response?.data ?? response;

    for (let i = 0; i < 3 && body && !Array.isArray(body); i += 1) {
        if (Array.isArray(body.data)) return body.data;
        if (Array.isArray(body.receipts)) return body.receipts;
        if (Array.isArray(body.collections)) return body.collections;
        if (Array.isArray(body.items)) return body.items;
        if (Array.isArray(body.results)) return body.results;

        if (body.data && typeof body.data === "object") {
            body = body.data;
            continue;
        }

        break;
    }

    return Array.isArray(body) ? body : [];
}

function getErrorMessage(error, fallback = "Something went wrong.") {
    const data = error?.response?.data;

    if (data?.errors && typeof data.errors === "object") {
        return Object.entries(data.errors)
            .map(([field, messages]) => {
                const list = Array.isArray(messages) ? messages : [messages];
                return `${field}: ${list.join(", ")}`;
            })
            .join("\n");
    }

    if (error?.code === "ERR_NETWORK") {
        return "Cannot connect to Laravel. Start MySQL in XAMPP and run php artisan serve in your backend folder.";
    }

    if (error?.response?.status === 401) {
        return "Your session may have expired. Sign in again, then retry.";
    }

    if (error?.response?.status === 403) {
        return "Your account is not authorized to perform this action.";
    }

    return data?.message || error?.message || fallback;
}

function receiptNumber(receipt) {
    return (
        receipt?.receipt_number ||
        receipt?.receipt_no ||
        receipt?.or_number ||
        receipt?.official_receipt_number ||
        `OR-${String(receipt?.id || 0).padStart(4, "0")}`
    );
}

function receiptAmountDue(receipt) {
    return numberValue(
        receipt?.amount_due ??
            receipt?.original_amount ??
            receipt?.amountDue ??
            receipt?.amount_collected ??
            receipt?.amount_paid ??
            receipt?.amount ??
            0
    );
}

/*
 * Read the actual cash received first.
 * Do not automatically use amount_paid as cash received because the
 * backend may store amount_paid as the fee/amount due.
 */
function receiptCashReceived(receipt) {
    const cash =
        receipt?.cash_received ??
        receipt?.cashReceived ??
        receipt?.cash_tendered ??
        receipt?.cashTendered ??
        receipt?.amount_tendered ??
        receipt?.amountTendered ??
        receipt?.amount_received ??
        receipt?.amountReceived;

    if (cash !== undefined && cash !== null && cash !== "") {
        return numberValue(cash);
    }

    return receiptAmountDue(receipt);
}

/*
 * Calculate change from cash received and amount due.
 * Use the saved change only when the cash amount is unavailable.
 */
function receiptChange(receipt) {
    const cash =
        receipt?.cash_received ??
        receipt?.cashReceived ??
        receipt?.cash_tendered ??
        receipt?.cashTendered ??
        receipt?.amount_tendered ??
        receipt?.amountTendered ??
        receipt?.amount_received ??
        receipt?.amountReceived;

    if (cash !== undefined && cash !== null && cash !== "") {
        return Math.max(
            Number(
                (
                    numberValue(cash) - receiptAmountDue(receipt)
                ).toFixed(2)
            ),
            0
        );
    }

    const saved =
        receipt?.change_amount ??
        receipt?.changeAmount ??
        receipt?.amount_change ??
        receipt?.amountChange;

    return numberValue(saved);
}

function collectionId(collection) {
    return String(collection?.id ?? "");
}

function collectionName(collection) {
    return (
        collection?.name ||
        collection?.collection_name ||
        collection?.collection_type ||
        collection?.purpose ||
        collection?.title ||
        "Unnamed collection"
    );
}

function collectionFee(collection) {
    return numberValue(
        collection?.fee ??
            collection?.fixed_fee ??
            collection?.amount_due ??
            collection?.price ??
            collection?.amount ??
            0
    );
}

function receiptCollectionName(receipt) {
    return (
        receipt?.collection?.name ||
        receipt?.collection?.collection_name ||
        receipt?.collection_type ||
        receipt?.collection_name ||
        receipt?.purpose ||
        "Unspecified collection"
    );
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function printReceipt(receipt) {
    const printWindow = window.open("", "_blank", "width=850,height=750");

    if (!printWindow) {
        alert("Allow pop-ups for this site, then try again.");
        return;
    }

    const rows = [
        ["Receipt Number", receiptNumber(receipt)],
        ["Date", displayDate(receipt.date)],
        ["Payer", receipt.payer_name],
        ["Address / Department", receipt.address_department],
        ["Collection", receiptCollectionName(receipt)],
        ["Purpose", receipt.purpose],
        ["Payment Method", "Cash"],
    ];

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Official Receipt</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    font-family: Arial, sans-serif;
                    color: #172033;
                    padding: 24px;
                }
                main {
                    max-width: 700px;
                    margin: auto;
                    padding: 25px;
                    border: 1px solid #ddd;
                }
                header {
                    text-align: center;
                    border-bottom: 2px solid #102d55;
                    padding-bottom: 15px;
                }
                header h1 { color: #102d55; font-size: 23px; }
                header p { margin: 5px; font-size: 12px; }
                .number {
                    text-align: right;
                    margin: 20px 0;
                    font-weight: bold;
                }
                .details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .detail {
                    padding: 8px 0;
                    border-bottom: 1px solid #ddd;
                    overflow-wrap: anywhere;
                }
                .detail span {
                    display: block;
                    color: #667085;
                    font-size: 11px;
                }
                .detail strong {
                    display: block;
                    margin-top: 5px;
                    font-size: 13px;
                }
                .amounts {
                    margin-top: 25px;
                    padding: 15px;
                    border: 1px solid #ddd;
                }
                .amount-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    gap: 15px;
                }
                .total {
                    border-top: 1px solid #ddd;
                    font-weight: bold;
                }
                .description {
                    white-space: pre-wrap;
                    margin-top: 20px;
                }
                .signatures {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    margin-top: 55px;
                    text-align: center;
                    font-size: 11px;
                }
                .signature {
                    border-top: 1px solid #333;
                    padding-top: 8px;
                }
                footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px dashed #ccc;
                    font-size: 11px;
                }
                @media print {
                    body { padding: 0; }
                    main { border: none; }
                    @page { margin: 12mm; }
                }
            </style>
        </head>
        <body>
            <main>
                <header>
                    <h1>UNIVERSITY OF ABRA</h1>
                    <p>Main Campus</p>
                    <p>Cashier's Unit</p>
                    <h2>PAYMENT RECEIPT</h2>
                </header>

                <div class="number">
                    Receipt No.: ${escapeHtml(receiptNumber(receipt))}
                </div>

                <section class="details">
                    ${rows
                        .map(
                            ([label, value]) => `
                                <div class="detail">
                                    <span>${escapeHtml(label)}</span>
                                    <strong>${escapeHtml(value || "—")}</strong>
                                </div>
                            `
                        )
                        .join("")}
                </section>

                <section class="amounts">
                    <div class="amount-row">
                        <span>Amount Due</span>
                        <strong>${escapeHtml(money(receiptAmountDue(receipt)))}</strong>
                    </div>
                    <div class="amount-row">
                        <span>Cash Received</span>
                        <strong>${escapeHtml(money(receiptCashReceived(receipt)))}</strong>
                    </div>
                    <div class="amount-row total">
                        <span>Change</span>
                        <strong>${escapeHtml(money(receiptChange(receipt)))}</strong>
                    </div>
                </section>

                ${
                    receipt.description
                        ? `<p class="description">${escapeHtml(receipt.description)}</p>`
                        : ""
                }

                <div class="signatures">
                    <div class="signature">Cashier / Authorized Personnel</div>
                    <div class="signature">Payer's Signature</div>
                </div>

                <footer>
                    Generated by UniTeq. Please keep this receipt for your records.
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
    `);

    printWindow.document.close();
}

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

function SummaryCard({ title, value, note, icon, color = "navy" }) {
    const colors = {
        green: "bg-green-50 text-green-600",
        blue: "bg-blue-50 text-blue-600",
        navy: "bg-blue-50 text-[#102d55]",
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#102d55]">
                        {value}
                    </h2>
                </div>

                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        colors[color] || colors.navy
                    }`}
                >
                    {icon}
                </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">{note}</p>
        </div>
    );
}

function Detail({ label, value }) {
    return (
        <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 break-words font-semibold text-gray-900">
                {value || "—"}
            </p>
        </div>
    );
}

function readStoredUser() {
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
}

function userCanManage(user) {
    const role = String(user?.role || "")
        .toLowerCase()
        .replaceAll("-", "_")
        .replaceAll(" ", "_");

    return [
        "cashier",
        "system_administrator",
        "admin",
        "administrator",
    ].includes(role);
}

export default function Receipts() {
    const [receipts, setReceipts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [pageError, setPageError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [currentUser, setCurrentUser] = useState(readStoredUser);

    const canManageReceipts = userCanManage(currentUser);

    const activeCollections = useMemo(
        () =>
            collections.filter((item) => {
                const status = String(item.status || "").toLowerCase();

                return (
                    item.is_active !== false &&
                    item.active !== false &&
                    status !== "inactive" &&
                    status !== "disabled"
                );
            }),
        [collections]
    );

    const selectedCollection = useMemo(
        () =>
            activeCollections.find(
                (item) => collectionId(item) === String(form.collection_id)
            ) || null,
        [activeCollections, form.collection_id]
    );

    const amountDue = numberValue(form.amount_due);
    const cashReceived = numberValue(form.cash_received);

    const changeAmount = Math.max(
        Number((cashReceived - amountDue).toFixed(2)),
        0
    );

    const amountShort = Math.max(
        Number((amountDue - cashReceived).toFixed(2)),
        0
    );

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
        setPageError("");

        const results = await Promise.allSettled([
            loadReceipts(),
            loadCollections(),
        ]);

        const errors = [];

        if (results[0].status === "rejected") {
            console.error("Receipts API error:", results[0].reason);
            errors.push(
                getErrorMessage(
                    results[0].reason,
                    "Could not load receipts."
                )
            );
        }

        if (results[1].status === "rejected") {
            console.error("Collections API error:", results[1].reason);
            errors.push(
                `Collections could not be loaded: ${getErrorMessage(
                    results[1].reason,
                    "Check GET /api/collections."
                )}`
            );
        }

        setPageError(errors.join("\n"));
        setLoading(false);
    }, [loadReceipts, loadCollections]);

    useEffect(() => {
        loadPage();
    }, [loadPage]);

    useEffect(() => {
        let mounted = true;

        async function loadUser() {
            try {
                const response = await axios.get(`${API}/me`, {
                    headers: getHeaders(),
                });

                const user =
                    response.data?.user ||
                    response.data?.data ||
                    response.data;

                if (
                    mounted &&
                    user &&
                    typeof user === "object" &&
                    !Array.isArray(user)
                ) {
                    setCurrentUser(user);
                    localStorage.setItem("uniteq_user", JSON.stringify(user));
                }
            } catch {
                // Keep the locally stored user if /api/me is unavailable.
            }
        }

        loadUser();

        return () => {
            mounted = false;
        };
    }, []);

    function resetForm() {
        setForm({ ...EMPTY_FORM, date: getToday() });
        setEditingReceipt(null);
    }

    function openAddForm() {
        resetForm();
        setPageError("");
        setShowForm(true);
    }

    function openEditForm(receipt) {
        const id = receipt.collection_id ?? receipt.collection?.id ?? "";

        const matchingCollection = collections.find(
            (item) => collectionId(item) === String(id)
        );

        setEditingReceipt(receipt);

        setForm({
            date: String(receipt.date || getToday()).slice(0, 10),
            collection_id: id ? String(id) : "",
            purpose: receipt.purpose || "",
            payer_name: receipt.payer_name || "",
            address_department: receipt.address_department || "",
            description: receipt.description || "",
            amount_due: String(
                receiptAmountDue(receipt) ||
                    (matchingCollection
                        ? collectionFee(matchingCollection)
                        : "")
            ),
            cash_received: String(receiptCashReceived(receipt)),
            payment_method: "Cash",
        });

        setShowForm(true);
    }

    function handleFormChange(event) {
        const { name, value } = event.target;

        if (name === "collection_id") {
            const item = activeCollections.find(
                (collection) => collectionId(collection) === value
            );

            setForm((previous) => ({
                ...previous,
                collection_id: value,
                purpose: item ? collectionName(item) : "",
                amount_due: item ? String(collectionFee(item)) : "",
            }));

            return;
        }

        setForm((previous) => ({
            ...previous,
            [name]: name === "payment_method" ? "Cash" : value,
        }));
    }

    function validateForm() {
        if (!form.date) {
            alert("Please select a receipt date.");
            return false;
        }

        if (!form.collection_id || !selectedCollection) {
            alert("Please select a registered collection.");
            return false;
        }

        if (!form.payer_name.trim()) {
            alert("Please enter the payer's name.");
            return false;
        }

        if (amountDue <= 0) {
            alert("The selected collection must have a fee greater than zero.");
            return false;
        }

        if (cashReceived < amountDue) {
            alert(
                `Payment is insufficient. Amount due: ${money(
                    amountDue
                )}. Short by: ${money(amountShort)}.`
            );
            return false;
        }

        return true;
    }

    async function handleSave(event) {
        event.preventDefault();

        if (saving) return;

        if (!canManageReceipts) {
            alert("Your account role does not allow receipt management.");
            return;
        }

        if (!validateForm()) return;

        const fee = Number(amountDue.toFixed(2));
        const received = Number(cashReceived.toFixed(2));
        const change = Number(Math.max(received - fee, 0).toFixed(2));

        /*
         * The backend's amount/original_amount fields represent the fee.
         * cash_received and change_amount are also sent so the controller
         * can save them when the database supports those fields.
         */
        const payload = {
            date: form.date,
            collection_id: Number(form.collection_id),
            purpose: collectionName(selectedCollection),
            payer_name: form.payer_name.trim(),
            address_department: form.address_department.trim() || null,
            description: form.description.trim() || null,
            amount_due: fee,
            original_amount: fee,
            amount: fee,
            amount_paid: fee,
            cash_received: received,
            change_amount: change,
            payment_method: "Cash",
        };

        setSaving(true);
        setPageError("");

        try {
            const response = editingReceipt?.id
                ? await axios.put(
                      `${API}/receipts/${editingReceipt.id}`,
                      payload,
                      { headers: getHeaders() }
                  )
                : await axios.post(`${API}/receipts`, payload, {
                      headers: getHeaders(),
                  });

            /*
             * Update the visible list immediately with the values entered.
             * This makes change visible without waiting for a reload.
             */
            const returnedReceipt =
                response.data?.receipt ||
                response.data?.data ||
                response.data;

            const savedReceipt = {
                ...(editingReceipt || {}),
                ...(returnedReceipt && typeof returnedReceipt === "object"
                    ? returnedReceipt
                    : {}),
                ...payload,
                id: returnedReceipt?.id ?? editingReceipt?.id,
                receipt_number:
                    returnedReceipt?.receipt_number ??
                    editingReceipt?.receipt_number,
                collection: selectedCollection,
                cash_received: received,
                change_amount: change,
                payment_method: "Cash",
            };

            if (editingReceipt?.id) {
                setReceipts((previous) =>
                    previous.map((receipt) =>
                        String(receipt.id) === String(editingReceipt.id)
                            ? savedReceipt
                            : receipt
                    )
                );
            } else if (savedReceipt.id) {
                setReceipts((previous) => [savedReceipt, ...previous]);
            }

            setShowForm(false);
            resetForm();

            /*
             * Refresh records from the server. If the backend does not yet
             * store cash_received/change_amount, the frontend cannot recover
             * those values after a page refresh until the backend is updated.
             */
            await loadPage();

            alert(
                editingReceipt
                    ? "Receipt updated successfully."
                    : "Receipt created successfully."
            );
        } catch (error) {
            console.error(
                "Receipt save failed:",
                error?.response?.data || error
            );

            const message = getErrorMessage(
                error,
                "Could not save the receipt."
            );

            setPageError(message);
            alert(message);
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
                    receiptCollectionName(receipt),
                    receipt.address_department,
                    "Cash",
                    receipt.description,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(query);
            })
            .sort((a, b) => {
                const dateComparison = String(b.date || "").localeCompare(
                    String(a.date || "")
                );

                return dateComparison || numberValue(b.id) - numberValue(a.id);
            });
    }, [receipts, search]);

    const totalCollected = useMemo(
        () =>
            receipts.reduce(
                (total, receipt) => total + receiptAmountDue(receipt),
                0
            ),
        [receipts]
    );

    const todayCollected = useMemo(
        () =>
            receipts
                .filter((receipt) => {
                    return (
                        String(receipt.date || "").slice(0, 10) === getToday()
                    );
                })
                .reduce(
                    (total, receipt) => total + receiptAmountDue(receipt),
                    0
                ),
        [receipts]
    );

    function exportCsv() {
        const headers = [
            "Receipt Number",
            "Date",
            "Payer",
            "Address / Department",
            "Collection",
            "Amount Due",
            "Cash Received",
            "Change",
            "Payment Method",
            "Description",
        ];

        const rows = filteredReceipts.map((receipt) => [
            receiptNumber(receipt),
            String(receipt.date || "").slice(0, 10),
            receipt.payer_name || "",
            receipt.address_department || "",
            receiptCollectionName(receipt),
            receiptAmountDue(receipt),
            receiptCashReceived(receipt),
            receiptChange(receipt),
            "Cash",
            receipt.description || "",
        ]);

        const csvCell = (value) =>
            `"${String(value ?? "").replaceAll('"', '""')}"`;

        const csv = [headers, ...rows]
            .map((row) => row.map(csvCell).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `uniteq-receipts-${getToday()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-6 py-8 md:flex-row md:items-center">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white">
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
                                Record cash payments, calculate change, and
                                print receipts.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={loadPage}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/80 px-4 py-3 font-semibold hover:bg-white hover:text-[#102d55] disabled:opacity-50"
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
                            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/80 px-4 py-3 font-semibold hover:bg-white hover:text-[#102d55]"
                        >
                            <Download size={17} />
                            Export CSV
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-7 px-6 py-8">
                {pageError && (
                    <div className="flex items-start gap-3 whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <AlertCircle size={20} className="shrink-0" />
                        <div className="flex-1">{pageError}</div>
                        <button
                            type="button"
                            onClick={() => setPageError("")}
                            aria-label="Dismiss error"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

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
                    />
                </section>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-[#102d55]">
                                Receipt Records
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Search, view, update, and print payment
                                receipts.
                            </p>
                        </div>

                        {canManageReceipts && (
                            <button
                                type="button"
                                onClick={openAddForm}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white hover:bg-teal-700"
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
                                    {[
                                        "RECEIPT NO.",
                                        "PAYER",
                                        "COLLECTION",
                                        "AMOUNT DUE",
                                        "CASH RECEIVED",
                                        "CHANGE",
                                        "DATE",
                                        "ACTIONS",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className={`whitespace-nowrap px-4 py-4 font-semibold ${
                                                [
                                                    "AMOUNT DUE",
                                                    "CASH RECEIVED",
                                                    "CHANGE",
                                                ].includes(heading)
                                                    ? "text-right"
                                                    : heading === "ACTIONS"
                                                      ? "text-center"
                                                      : "text-left"
                                            }`}
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={8}
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
                                            colSpan={8}
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
                                                    : "Register collection fees before creating receipts."}
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
                                                            {receipt.payer_name ||
                                                                "—"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {receipt.address_department ||
                                                                "No department"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-4 py-5">
                                                <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
                                                    <FileText size={13} />
                                                    {receiptCollectionName(
                                                        receipt
                                                    )}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-5 text-right font-bold text-green-700">
                                                {money(
                                                    receiptAmountDue(receipt)
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-5 text-right">
                                                {money(
                                                    receiptCashReceived(receipt)
                                                )}
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
                                                        onClick={() =>
                                                            setSelectedReceipt(
                                                                receipt
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-900"
                                                    >
                                                        <Eye size={15} />
                                                        View
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            printReceipt(receipt)
                                                        }
                                                        className="inline-flex items-center gap-1 text-green-700 hover:text-green-900"
                                                    >
                                                        <Printer size={15} />
                                                        Print
                                                    </button>

                                                    {canManageReceipts && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditForm(
                                                                    receipt
                                                                )
                                                            }
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
                        Showing {filteredReceipts.length} of {receipts.length}{" "}
                        receipt records
                    </div>
                </section>
            </main>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
                    <div className="my-6 max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
                            <div>
                                <h2 className="text-xl font-bold text-[#102d55]">
                                    {editingReceipt
                                        ? "Edit Receipt"
                                        : "Create Official Receipt"}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Select a registered collection to load its
                                    fee.
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

                        <form
                            onSubmit={handleSave}
                            className="space-y-6 p-6"
                        >
                            {activeCollections.length === 0 && (
                                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                    <AlertCircle
                                        size={20}
                                        className="shrink-0"
                                    />
                                    <div>
                                        <p className="font-semibold">
                                            No registered collections are
                                            available.
                                        </p>
                                        <p className="mt-1">
                                            Register a collection and its fee
                                            on the Collections page, then
                                            refresh.
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
                                        <option value="">
                                            Select a collection
                                        </option>
                                        {activeCollections.map((item) => (
                                            <option
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {collectionName(item)} —{" "}
                                                {money(collectionFee(item))}
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

                                <FormField label="Amount Due (₱)">
                                    <input
                                        type="number"
                                        name="amount_due"
                                        value={form.amount_due}
                                        readOnly
                                        className={`${inputClass} bg-gray-100 font-semibold`}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Loaded from the registered collection.
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
                                        placeholder="Enter cash received"
                                        className={inputClass}
                                    />
                                </FormField>

                                <FormField label="Payment Method">
                                    <input
                                        type="text"
                                        value="Cash"
                                        readOnly
                                        className={`${inputClass} bg-gray-100 font-semibold`}
                                    />
                                </FormField>

                                <FormField label="Purpose">
                                    <input
                                        type="text"
                                        value={
                                            selectedCollection
                                                ? collectionName(
                                                      selectedCollection
                                                  )
                                                : form.purpose
                                        }
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
                                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-[#102d55]">
                                    <p className="text-sm">Amount Due</p>
                                    <p className="mt-2 text-xl font-bold">
                                        {money(amountDue)}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-800">
                                    <p className="text-sm">Cash Received</p>
                                    <p className="mt-2 text-xl font-bold">
                                        {money(cashReceived)}
                                    </p>
                                </div>

                                <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-green-700">
                                    <p className="text-sm">Change to Return</p>
                                    <p className="mt-2 text-xl font-bold">
                                        {money(changeAmount)}
                                    </p>
                                </div>
                            </div>

                            {cashReceived > 0 && cashReceived < amountDue && (
                                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    <AlertCircle
                                        size={18}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <p>
                                        Payment is short by{" "}
                                        {money(amountShort)}. Enter at least{" "}
                                        {money(amountDue)}.
                                    </p>
                                </div>
                            )}

                            {cashReceived >= amountDue && amountDue > 0 && (
                                <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                                    <CheckCircle
                                        size={18}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <p>
                                        Payment covers the fee. Return{" "}
                                        {money(changeAmount)} in change.
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
                                            <RefreshCw
                                                size={17}
                                                className="animate-spin"
                                            />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={17} />
                                            {editingReceipt
                                                ? "Save Changes"
                                                : "Save Receipt"}
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
                                <h2 className="text-xl font-bold">
                                    Receipt Details
                                </h2>
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
                                <Detail
                                    label="Receipt Number"
                                    value={receiptNumber(selectedReceipt)}
                                />
                                <Detail
                                    label="Date"
                                    value={displayDate(selectedReceipt.date)}
                                />
                                <Detail
                                    label="Payer"
                                    value={selectedReceipt.payer_name}
                                />
                                <Detail
                                    label="Collection"
                                    value={receiptCollectionName(
                                        selectedReceipt
                                    )}
                                />
                                <Detail
                                    label="Address / Department"
                                    value={selectedReceipt.address_department}
                                />
                                <Detail label="Payment Method" value="Cash" />
                            </div>

                            <div className="space-y-3 rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-gray-600">
                                        Amount Due
                                    </span>
                                    <span className="font-bold">
                                        {money(
                                            receiptAmountDue(selectedReceipt)
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-gray-600">
                                        Cash Received
                                    </span>
                                    <span className="font-bold">
                                        {money(
                                            receiptCashReceived(selectedReceipt)
                                        )}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-gray-600">
                                        Change
                                    </span>
                                    <span className="font-bold text-green-700">
                                        {money(receiptChange(selectedReceipt))}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">
                                    Description / Notes
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-gray-800">
                                    {selectedReceipt.description ||
                                        "No description provided."}
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