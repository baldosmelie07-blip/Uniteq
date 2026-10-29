
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    FileText,
    Download,
    Printer,
    Search,
    RefreshCw,
    CalendarDays,
    Receipt,
    WalletCards,
    Activity,
    AlertCircle,
    CheckCircle,
    XCircle,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const LOGO_URL = "/university-of-abra-logo.png";

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
    },
});

// ============================================================
// AUTHENTICATION
// ============================================================

function getAuthToken() {
    const keys = [
        "uniteq_token",
        "access_token",
        "auth_token",
        "token",
    ];

    for (const storage of [localStorage, sessionStorage]) {
        for (const key of keys) {
            const value = storage.getItem(key);

            if (value && value.trim()) {
                return value.replace(/^Bearer\s+/i, "").trim();
            }
        }
    }

    return null;
}

api.interceptors.request.use((config) => {
    const token = getAuthToken();

    config.headers = config.headers || {};
    config.headers.Accept = "application/json";
    config.headers["X-Requested-With"] = "XMLHttpRequest";

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// ============================================================
// GENERAL HELPERS
// ============================================================

function firstValue(...values) {
    return values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
    );
}

function toNumber(value) {
    if (typeof value === "string") {
        value = value.replace(/[₱,\s]/g, "");
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function extractRecords(response) {
    let data = response?.data ?? response;

    // Handle arrays, Laravel pagination, and API wrappers.
    for (let i = 0; i < 8; i++) {
        if (Array.isArray(data)) {
            return data;
        }

        if (!data || typeof data !== "object") {
            return [];
        }

        const candidates = [
            data.data,
            data.records,
            data.receipts,
            data.vouchers,
            data.results,
            data.items,
        ];

        const next = candidates.find(
            (candidate) =>
                Array.isArray(candidate) ||
                (candidate && typeof candidate === "object")
        );

        if (next === undefined) {
            break;
        }

        data = next;
    }

    console.warn("Unexpected API response format:", response);
    return [];
}

function getToday() {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getDateOnly(value) {
    if (!value) return "";

    const text = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
        return text.slice(0, 10);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 10);
}

function getNumericSuffix(value) {
    const match = String(value || "").match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
}

// ============================================================
// REPORTS COMPONENT
// ============================================================

export default function Reports() {
    const [receipts, setReceipts] = useState([]);
    const [vouchers, setVouchers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [receiptError, setReceiptError] = useState("");
    const [voucherError, setVoucherError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [appliedFrom, setAppliedFrom] = useState("");
    const [appliedTo, setAppliedTo] = useState("");

    // --------------------------------------------------------
    // LOAD DATA FROM LARAVEL
    // --------------------------------------------------------

    const loadReports = useCallback(async () => {
        setLoading(true);
        setReceiptError("");
        setVoucherError("");

        try {
            const [receiptResult, voucherResult] =
                await Promise.allSettled([
                    api.get("/receipts"),
                    api.get("/vouchers"),
                ]);

            if (receiptResult.status === "fulfilled") {
                const records = extractRecords(
                    receiptResult.value
                );

                setReceipts(records);

                console.log(
                    "UniTeq report receipts:",
                    records
                );
            } else {
                const error = receiptResult.reason;

                setReceipts([]);

                const message =
                    error.response?.data?.message ||
                    error.message ||
                    "Unable to load receipts.";

                setReceiptError(
                    error.response?.status === 401
                        ? "Your session may have expired. Please log in again."
                        : message
                );

                console.error(
                    "Receipt API error:",
                    error.response?.data || error
                );
            }

            if (voucherResult.status === "fulfilled") {
                const records = extractRecords(
                    voucherResult.value
                );

                setVouchers(records);

                console.log(
                    "UniTeq report vouchers:",
                    records
                );
            } else {
                const error = voucherResult.reason;

                setVouchers([]);

                const message =
                    error.response?.data?.message ||
                    error.message ||
                    "Unable to load vouchers.";

                setVoucherError(
                    error.response?.status === 401
                        ? "Your session may have expired. Please log in again."
                        : message
                );

                console.error(
                    "Voucher API error:",
                    error.response?.data || error
                );
            }

            setLastUpdated(new Date());
        } catch (error) {
            console.error("Report loading failed:", error);

            setReceiptError(
                error.message || "Unable to load financial records."
            );

            setVoucherError(
                error.message || "Unable to load financial records."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    // --------------------------------------------------------
    // RECEIPT FIELD HELPERS
    // --------------------------------------------------------

    function getReceiptNumber(record) {
        return firstValue(
            record.receipt_number,
            record.receipt_no,
            record.or_number,
            record.or_no,
            record.reference_number
        ) || `OR-${String(record.id || 0).padStart(4, "0")}`;
    }

    function getReceiptDate(record) {
        return firstValue(
            record.date,
            record.receipt_date,
            record.collection_date,
            record.payment_date,
            record.created_at
        );
    }

    function getReceiptPayer(record) {
        return firstValue(
            record.payer_name,
            record.payer,
            record.student_name,
            record.customer_name,
            record.name,
            record.payor
        ) || "—";
    }

    function getReceiptStudentId(record) {
        return firstValue(
            record.student_id,
            record.studentId,
            record.student_number,
            record.student_no
        ) || "—";
    }

    function getReceiptPurpose(record) {
        return firstValue(
            record.purpose,
            record.fee_type,
            record.transaction_type,
            record.description,
            record.particulars
        ) || "Collection";
    }

    function getReceiptAmount(record) {
        return toNumber(
            firstValue(
                record.amount,
                record.amount_paid,
                record.collection_amount,
                record.total_amount,
                record.total,
                record.total_payment
            )
        );
    }

    // --------------------------------------------------------
    // VOUCHER FIELD HELPERS
    // --------------------------------------------------------

    function getVoucherNumber(record) {
        return firstValue(
            record.voucher_number,
            record.voucher_no,
            record.number,
            record.reference_number
        ) || `V-${String(record.id || 0).padStart(4, "0")}`;
    }

    function getVoucherDate(record) {
        return firstValue(
            record.date,
            record.voucher_date,
            record.created_at
        );
    }

    function getVoucherPayer(record) {
        return firstValue(
            record.payer_name,
            record.student_name,
            record.beneficiary_name,
            record.beneficiary,
            record.payer,
            record.name
        ) || "—";
    }

    function getVoucherStudentId(record) {
        return firstValue(
            record.student_id,
            record.studentId,
            record.student_number,
            record.student_no
        ) || "—";
    }

    function getVoucherType(record) {
        return firstValue(
            record.voucher_type,
            record.type,
            record.purpose
        ) || "Voucher";
    }

    function getVoucherAssignedValue(record) {
        return toNumber(
            firstValue(
                record.assigned_value,
                record.assigned_amount,
                record.amount_due,
                record.total_amount,
                record.amount
            )
        );
    }

    function getVoucherRedeemedValue(record) {
        return toNumber(
            firstValue(
                record.amount_redeemed,
                record.redeemed_amount,
                record.amount_paid,
                record.redemption_amount
            )
        );
    }

    function getVoucherBalance(record) {
        const storedBalance = firstValue(
            record.pending_balance,
            record.remaining_balance,
            record.balance,
            record.current_balance
        );

        if (storedBalance !== undefined) {
            return Math.max(toNumber(storedBalance), 0);
        }

        return Math.max(
            getVoucherAssignedValue(record) -
                getVoucherRedeemedValue(record),
            0
        );
    }

    // --------------------------------------------------------
    // FORMATTING
    // --------------------------------------------------------

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(toNumber(value));
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function getPeriodText() {
        if (appliedFrom && appliedTo) {
            return `${formatDate(appliedFrom)} - ${formatDate(appliedTo)}`;
        }

        if (appliedFrom) {
            return `From ${formatDate(appliedFrom)}`;
        }

        if (appliedTo) {
            return `Until ${formatDate(appliedTo)}`;
        }

        return "All Dates";
    }

    // --------------------------------------------------------
    // FILTERING
    // --------------------------------------------------------

    function isWithinDateRange(value) {
        const date = getDateOnly(value);

        // Keep records whose date is missing rather than
        // accidentally hiding them because of an unknown date.
        if (!date) return true;

        if (appliedFrom && date < appliedFrom) return false;
        if (appliedTo && date > appliedTo) return false;

        return true;
    }

    const filteredReceipts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return receipts
            .filter((record) => {
                const date = getDateOnly(
                    firstValue(
                        record.date,
                        record.receipt_date,
                        record.collection_date,
                        record.payment_date,
                        record.created_at
                    )
                );

                if (date && appliedFrom && date < appliedFrom) {
                    return false;
                }

                if (date && appliedTo && date > appliedTo) {
                    return false;
                }

                const text = [
                    record.receipt_number,
                    record.receipt_no,
                    record.or_number,
                    record.or_no,
                    record.reference_number,
                    record.payer_name,
                    record.payer,
                    record.student_name,
                    record.student_id,
                    record.student_number,
                    record.purpose,
                    record.fee_type,
                    record.transaction_type,
                    record.description,
                    record.payment_method,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return text.includes(query);
            })
            .sort(
                (a, b) =>
                    getNumericSuffix(getReceiptNumber(b)) -
                    getNumericSuffix(getReceiptNumber(a))
            );
    }, [receipts, search, appliedFrom, appliedTo]);

    const filteredVouchers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return vouchers
            .filter((record) => {
                const date = getDateOnly(
                    firstValue(
                        record.date,
                        record.voucher_date,
                        record.created_at
                    )
                );

                if (date && appliedFrom && date < appliedFrom) {
                    return false;
                }

                if (date && appliedTo && date > appliedTo) {
                    return false;
                }

                const text = [
                    record.voucher_number,
                    record.voucher_no,
                    record.number,
                    record.reference_number,
                    record.payer_name,
                    record.student_name,
                    record.beneficiary_name,
                    record.student_id,
                    record.student_number,
                    record.voucher_type,
                    record.type,
                    record.purpose,
                    record.description,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return text.includes(query);
            })
            .sort(
                (a, b) =>
                    getNumericSuffix(getVoucherNumber(b)) -
                    getNumericSuffix(getVoucherNumber(a))
            );
    }, [vouchers, search, appliedFrom, appliedTo]);

    // --------------------------------------------------------
    // SUMMARY CALCULATIONS
    // --------------------------------------------------------

    const totalCollections = filteredReceipts.reduce(
        (sum, record) => sum + getReceiptAmount(record),
        0
    );

    const totalVoucherValue = filteredVouchers.reduce(
        (sum, record) => sum + getVoucherAssignedValue(record),
        0
    );

    const totalVoucherRedemption = filteredVouchers.reduce(
        (sum, record) => sum + getVoucherRedeemedValue(record),
        0
    );

    const totalVoucherBalance = filteredVouchers.reduce(
        (sum, record) => sum + getVoucherBalance(record),
        0
    );

    const totalFinancialActivity =
        totalCollections + totalVoucherRedemption;

    const collectionCount = filteredReceipts.length;
    const voucherCount = filteredVouchers.length;
    const totalRecordCount = collectionCount + voucherCount;

    const categoryAnalysis = useMemo(() => {
        const totals = {};

        filteredReceipts.forEach((record) => {
            const category = firstValue(
                record.purpose,
                record.fee_type,
                record.transaction_type,
                record.description,
                record.particulars
            ) || "Collection";

            totals[category] =
                (totals[category] || 0) +
                toNumber(
                    firstValue(
                        record.amount,
                        record.amount_paid,
                        record.collection_amount,
                        record.total_amount,
                        record.total
                    )
                );
        });

        const entries = Object.entries(totals).sort(
            (a, b) => b[1] - a[1]
        );

        const grandTotal = entries.reduce(
            (sum, [, amount]) => sum + amount,
            0
        );

        return entries.slice(0, 4).map(([name, amount]) => ({
            name,
            amount,
            percentage:
                grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
        }));
    }, [filteredReceipts]);

    const recentActivity = useMemo(() => {
        const collectionItems = filteredReceipts.map((record) => ({
            id: `receipt-${record.id ?? getReceiptNumber(record)}`,
            date: getReceiptDate(record),
            number: getReceiptNumber(record),
            name: getReceiptPayer(record),
            type: "Collection",
        }));

        const voucherItems = filteredVouchers.map((record) => ({
            id: `voucher-${record.id ?? getVoucherNumber(record)}`,
            date: getVoucherDate(record),
            number: getVoucherNumber(record),
            name: getVoucherPayer(record),
            type: "Voucher",
        }));

        return [...collectionItems, ...voucherItems]
            .sort(
                (a, b) =>
                    new Date(b.date || 0) - new Date(a.date || 0)
            )
            .slice(0, 5);
    }, [filteredReceipts, filteredVouchers]);

    // --------------------------------------------------------
    // APPLY AND CLEAR FILTERS
    // --------------------------------------------------------

    function applyFilters() {
        if (dateFrom && dateTo && dateFrom > dateTo) {
            alert("Date From cannot be later than Date To.");
            return;
        }

        setAppliedFrom(dateFrom);
        setAppliedTo(dateTo);
    }

    function clearFilters() {
        setSearch("");
        setDateFrom("");
        setDateTo("");
        setAppliedFrom("");
        setAppliedTo("");
    }

    // --------------------------------------------------------
    // SHARED REPORT ROWS
    // --------------------------------------------------------

    function getReportRows() {
        const voucherRows = filteredVouchers.map((record) => [
            getVoucherPayer(record),
            getVoucherStudentId(record),
            getVoucherNumber(record),
            getVoucherType(record),
            formatCurrency(getVoucherAssignedValue(record)),
            formatCurrency(getVoucherRedeemedValue(record)),
            formatCurrency(getVoucherBalance(record)),
            formatDate(getVoucherDate(record)),
        ]);

        const receiptRows = filteredReceipts.map((record) => [
            getReceiptPayer(record),
            getReceiptStudentId(record),
            getReceiptNumber(record),
            getReceiptPurpose(record),
            formatCurrency(getReceiptAmount(record)),
            formatCurrency(getReceiptAmount(record)),
            "—",
            formatDate(getReceiptDate(record)),
        ]);

        return [...voucherRows, ...receiptRows];
    }

    function hasRecords() {
        return filteredReceipts.length > 0 || filteredVouchers.length > 0;
    }

    // --------------------------------------------------------
    // EXPORT PDF
    // --------------------------------------------------------

    async function exportPDF() {
        if (!hasRecords()) {
            alert(
                "There are no records to export. Refresh the page and check whether receipts and vouchers have loaded."
            );
            return;
        }

        try {
            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
            });

            // The report still works if the logo is unavailable.
            try {
                const logoResponse = await fetch(LOGO_URL);

                if (logoResponse.ok) {
                    const blob = await logoResponse.blob();

                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();

                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });

                    doc.addImage(dataUrl, "PNG", 137, 7, 22, 22);
                }
            } catch (error) {
                console.warn("Logo was not added to the PDF:", error);
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text("UNIVERSITY OF ABRA", 148.5, 35, {
                align: "center",
            });

            doc.setFontSize(12);
            doc.text("Main Campus Cashier's Unit", 148.5, 42, {
                align: "center",
            });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text("UniTeq Financial Management System", 148.5, 48, {
                align: "center",
            });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text(
                "CONSOLIDATED COLLECTION & VOUCHER REPORT",
                148.5,
                58,
                { align: "center" }
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Report Period: ${getPeriodText()}`, 148.5, 65, {
                align: "center",
            });

            autoTable(doc, {
                startY: 72,
                head: [[
                    "Payer Name",
                    "Student ID",
                    "Transaction / Voucher ID",
                    "Type",
                    "Assigned / Amount",
                    "Collected / Redeemed",
                    "Pending Balance",
                    "Date",
                ]],
                body: getReportRows(),
                theme: "grid",
                styles: {
                    fontSize: 7,
                    cellPadding: 2.2,
                    valign: "middle",
                },
                headStyles: {
                    fontStyle: "bold",
                    fillColor: [16, 45, 85],
                },
                margin: { left: 10, right: 10 },
            });

            let finalY = (doc.lastAutoTable?.finalY || 80) + 8;

            if (finalY > 185) {
                doc.addPage();
                finalY = 20;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);

            doc.text(
                `Total Collections: ${formatCurrency(totalCollections)}`,
                14,
                finalY
            );

            doc.text(
                `Total Voucher Value: ${formatCurrency(totalVoucherValue)}`,
                110,
                finalY
            );

            doc.text(
                `Pending Voucher Balance: ${formatCurrency(totalVoucherBalance)}`,
                220,
                finalY
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);

            doc.text(
                `Generated: ${new Date().toLocaleString("en-PH")}`,
                14,
                202
            );

            doc.text(
                "University of Abra - Internal Financial System",
                283,
                202,
                { align: "right" }
            );

            doc.save(
                `University-of-Abra-Financial-Report-${getToday()}.pdf`
            );
        } catch (error) {
            console.error("PDF generation failed:", error);

            alert(
                "Unable to generate the PDF. Check the browser console for details."
            );
        }
    }

    // --------------------------------------------------------
    // PRINT REPORT
    // --------------------------------------------------------

    function printReport() {
        if (!hasRecords()) {
            alert(
                "There are no records to print. Click Refresh. If the table is empty, check the API errors displayed on this page."
            );
            return;
        }

        const rows = getReportRows()
            .map(
                (row) => `
                    <tr>
                        ${row
                            .map(
                                (cell) =>
                                    `<td>${escapeHTML(cell)}</td>`
                            )
                            .join("")}
                    </tr>
                `
            )
            .join("");

        const printWindow = window.open(
            "",
            "_blank",
            "width=1200,height=800"
        );

        if (!printWindow) {
            alert(
                "Your browser blocked the print window. Allow pop-ups for the UniTeq website and try again."
            );
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8" />
                <title>University of Abra Financial Report</title>
                <style>
                    @page {
                        size: landscape;
                        margin: 12mm;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #111827;
                        margin: 0;
                        padding: 12px;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }

                    .logo {
                        width: 65px;
                        height: 65px;
                        object-fit: contain;
                    }

                    h1 {
                        font-size: 22px;
                        margin: 5px 0;
                    }

                    h2 {
                        font-size: 15px;
                        margin: 4px 0;
                    }

                    .system,
                    .period {
                        font-size: 11px;
                        color: #475569;
                        margin: 5px 0;
                    }

                    .report-title {
                        font-size: 17px;
                        font-weight: bold;
                        margin-top: 15px;
                    }

                    .summary {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 12px;
                        margin: 18px 0;
                    }

                    .summary-card {
                        border: 1px solid #cbd5e1;
                        padding: 10px;
                    }

                    .summary-label {
                        color: #64748b;
                        font-size: 10px;
                    }

                    .summary-value {
                        font-size: 15px;
                        font-weight: bold;
                        margin-top: 5px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 12px;
                    }

                    th, td {
                        border: 1px solid #cbd5e1;
                        padding: 6px;
                        font-size: 9px;
                        text-align: left;
                        overflow-wrap: anywhere;
                    }

                    th {
                        background: #eef4f8;
                    }

                    .footer {
                        display: flex;
                        justify-content: space-between;
                        gap: 20px;
                        margin-top: 20px;
                        font-size: 9px;
                        color: #64748b;
                    }

                    @media print {
                        body {
                            padding: 0;
                        }

                        thead {
                            display: table-header-group;
                        }

                        tr {
                            break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img
                        src="${LOGO_URL}"
                        class="logo"
                        alt="University of Abra logo"
                        onerror="this.style.display='none'"
                    />

                    <h1>UNIVERSITY OF ABRA</h1>
                    <h2>Main Campus Cashier's Unit</h2>
                    <div class="system">UniTeq Financial Management System</div>
                    <div class="report-title">
                        CONSOLIDATED COLLECTION & VOUCHER REPORT
                    </div>
                    <div class="period">
                        Report Period: ${escapeHTML(getPeriodText())}
                    </div>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <div class="summary-label">Total Collections</div>
                        <div class="summary-value">${escapeHTML(formatCurrency(totalCollections))}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Total Voucher Value</div>
                        <div class="summary-value">${escapeHTML(formatCurrency(totalVoucherValue))}</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-label">Pending Voucher Balance</div>
                        <div class="summary-value">${escapeHTML(formatCurrency(totalVoucherBalance))}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Payer Name</th>
                            <th>Student ID</th>
                            <th>Transaction / Voucher ID</th>
                            <th>Type</th>
                            <th>Assigned / Amount</th>
                            <th>Collected / Redeemed</th>
                            <th>Pending Balance</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>

                <div class="footer">
                    <span>Generated: ${escapeHTML(new Date().toLocaleString("en-PH"))}</span>
                    <span>University of Abra - Internal Financial System</span>
                </div>

                <script>
                    window.onload = function () {
                        setTimeout(function () {
                            window.focus();
                            window.print();
                        }, 400);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    }

    // --------------------------------------------------------
    // REUSABLE UI COMPONENTS
    // --------------------------------------------------------

    function SummaryCard({ title, value, detail, icon, color = "blue" }) {
        const colorClasses = {
            blue: "bg-blue-50 text-[#102d55]",
            cyan: "bg-cyan-50 text-[#0797a6]",
            red: "bg-red-50 text-red-600",
            green: "bg-green-50 text-green-700",
        };

        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">{title}</p>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2 break-words">
                            {value}
                        </h2>
                        <p className="text-xs text-gray-500 mt-2">{detail}</p>
                    </div>

                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
                        {icon}
                    </div>
                </div>
            </div>
        );
    }

    // --------------------------------------------------------
    // MAIN RENDER
    // --------------------------------------------------------

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            <header className="bg-[#102d55] text-white">
                <div className="max-w-[1500px] mx-auto px-6 py-7">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shrink-0">
                                <FileText size={32} className="text-[#102d55]" />
                            </div>

                            <div>
                                <p className="text-sm text-blue-100">
                                    University of Abra | Main Campus | Cashier's Unit
                                </p>
                                <h1 className="text-3xl sm:text-4xl font-bold mt-1">
                                    Financial Reports
                                </h1>
                                <p className="text-blue-100 mt-2">
                                    Consolidated collection and voucher monitoring.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={loadReports}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-white/80 hover:bg-white hover:text-[#102d55] font-semibold disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                                Refresh
                            </button>

                            <button
                                type="button"
                                onClick={printReport}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#102d55] hover:bg-blue-50 font-semibold disabled:opacity-50"
                            >
                                <Printer size={18} />
                                Print Report
                            </button>

                            <button
                                type="button"
                                onClick={exportPDF}
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold disabled:opacity-50"
                            >
                                <Download size={18} />
                                Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-7">
                {(receiptError || voucherError) && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-red-800">
                            <XCircle size={20} />
                            Some report records could not be loaded
                        </div>

                        {receiptError && (
                            <p className="text-sm text-red-700">
                                <strong>Receipts:</strong> {receiptError}
                            </p>
                        )}

                        {voucherError && (
                            <p className="text-sm text-red-700">
                                <strong>Vouchers:</strong> {voucherError}
                            </p>
                        )}

                        <p className="text-sm text-red-700">
                            Check your login session, Laravel server, and API response.
                            Records from a failed request cannot appear in the report.
                        </p>
                    </div>
                )}

                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Consolidated Collection & Voucher Report
                            </h2>
                            <p className="text-sm text-gray-500 mt-2">
                                University of Abra — Cashier's Unit
                            </p>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#102d55] text-white text-sm font-semibold">
                            <CalendarDays size={17} />
                            {getToday()}
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <Search size={22} className="text-[#102d55]" />
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Report Filters
                            </h3>
                            <p className="text-sm text-gray-500">
                                Search records and select a date range.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Date From
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(event) => setDateFrom(event.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Date To
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(event) => setDateTo(event.target.value)}
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Search Records
                            </label>
                            <div className="relative">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Payer, student ID, receipt, voucher..."
                                    className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 mt-5">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                        >
                            Clear Filters
                        </button>

                        <button
                            type="button"
                            onClick={applyFilters}
                            className="px-6 py-3 rounded-xl bg-[#0797a6] text-white font-semibold hover:bg-[#067f8b]"
                        >
                            Apply Date Range
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                        Active period: {getPeriodText()}
                    </p>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                    <SummaryCard
                        title="Total Collections"
                        value={formatCurrency(totalCollections)}
                        detail={`${collectionCount} collection record${collectionCount === 1 ? "" : "s"}`}
                        icon={<Receipt size={24} />}
                        color="blue"
                    />

                    <SummaryCard
                        title="Total Voucher Value"
                        value={formatCurrency(totalVoucherValue)}
                        detail={`${voucherCount} voucher record${voucherCount === 1 ? "" : "s"}`}
                        icon={<WalletCards size={24} />}
                        color="cyan"
                    />

                    <SummaryCard
                        title="Voucher Pending Balance"
                        value={formatCurrency(totalVoucherBalance)}
                        detail="Remaining voucher allocation"
                        icon={<AlertCircle size={24} />}
                        color="red"
                    />

                    <SummaryCard
                        title="Total Financial Activity"
                        value={formatCurrency(totalFinancialActivity)}
                        detail="Collections plus voucher redemptions"
                        icon={<Activity size={24} />}
                        color="green"
                    />
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-xl font-bold text-gray-900">
                            Collection Analysis
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Collection distribution by fee type.
                        </p>

                        <div className="space-y-4 mt-6">
                            {categoryAnalysis.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No collection category data available.
                                </p>
                            ) : (
                                categoryAnalysis.map((category, index) => (
                                    <div key={category.name}>
                                        <div className="flex justify-between gap-3 text-sm mb-2">
                                            <span className="font-semibold text-gray-800">
                                                {category.name}
                                            </span>
                                            <span className="text-gray-500">
                                                {category.percentage.toFixed(1)}%
                                            </span>
                                        </div>

                                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    index === 0
                                                        ? "bg-[#102d55]"
                                                        : index === 1
                                                        ? "bg-[#0797a6]"
                                                        : index === 2
                                                        ? "bg-teal-400"
                                                        : "bg-gray-400"
                                                }`}
                                                style={{
                                                    width: `${Math.min(category.percentage, 100)}%`,
                                                }}
                                            />
                                        </div>

                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatCurrency(category.amount)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-xl font-bold text-gray-900">
                            Voucher Summary
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Allocation and redemption totals.
                        </p>

                        <div className="space-y-5 mt-6">
                            <div>
                                <p className="text-sm text-gray-500">Voucher Records</p>
                                <p className="text-3xl font-bold text-[#102d55]">
                                    {voucherCount}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Total Redeemed</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {formatCurrency(totalVoucherRedemption)}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-gray-500">Pending Balance</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(totalVoucherBalance)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-xl font-bold text-gray-900">
                            Recent Activity
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Latest records in the current report.
                        </p>

                        <div className="space-y-4 mt-6">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No recent activity available.
                                </p>
                            ) : (
                                recentActivity.map((item) => (
                                    <div key={item.id} className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-full bg-blue-50 text-[#102d55] flex items-center justify-center shrink-0">
                                            {item.type === "Voucher" ? (
                                                <WalletCards size={17} />
                                            ) : (
                                                <Receipt size={17} />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {item.type}: {item.number}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDate(item.date)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">
                                Financial Transaction Registry
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Records included in printing and PDF export.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-blue-50 text-blue-700">
                                <Receipt size={14} />
                                {collectionCount} Collections
                            </span>

                            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-cyan-50 text-cyan-700">
                                <WalletCards size={14} />
                                {voucherCount} Vouchers
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px]">
                            <thead className="bg-[#eef4f8]">
                                <tr>
                                    {[
                                        "Payer Name",
                                        "Student ID",
                                        "Transaction / Voucher ID",
                                        "Type",
                                        "Assigned / Amount",
                                        "Collected / Redeemed",
                                        "Pending Balance",
                                        "Date",
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
                                        <td colSpan={8} className="py-16 text-center text-gray-500">
                                            <RefreshCw size={28} className="animate-spin mx-auto mb-3" />
                                            Loading financial records...
                                        </td>
                                    </tr>
                                ) : totalRecordCount === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-gray-500">
                                            <FileText size={35} className="mx-auto mb-3 text-gray-300" />
                                            <p className="font-semibold">No records found.</p>
                                            <p className="text-sm mt-1">
                                                Try clearing the filters or refreshing the records.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {filteredVouchers.map((record) => (
                                            <tr
                                                key={`voucher-${record.id ?? getVoucherNumber(record)}`}
                                                className="hover:bg-blue-50/30"
                                            >
                                                <td className="px-5 py-4 font-semibold text-gray-900">
                                                    {getVoucherPayer(record)}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {getVoucherStudentId(record)}
                                                </td>
                                                <td className="px-5 py-4 font-bold text-[#102d55]">
                                                    {getVoucherNumber(record)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold">
                                                        <WalletCards size={14} />
                                                        {getVoucherType(record)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold">
                                                    {formatCurrency(getVoucherAssignedValue(record))}
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold text-green-700">
                                                    {formatCurrency(getVoucherRedeemedValue(record))}
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold text-red-600">
                                                    {formatCurrency(getVoucherBalance(record))}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {formatDate(getVoucherDate(record))}
                                                </td>
                                            </tr>
                                        ))}

                                        {filteredReceipts.map((record) => (
                                            <tr
                                                key={`receipt-${record.id ?? getReceiptNumber(record)}`}
                                                className="hover:bg-blue-50/30"
                                            >
                                                <td className="px-5 py-4 font-semibold text-gray-900">
                                                    {getReceiptPayer(record)}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {getReceiptStudentId(record)}
                                                </td>
                                                <td className="px-5 py-4 font-bold text-[#102d55]">
                                                    {getReceiptNumber(record)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                                                        <Receipt size={14} />
                                                        {getReceiptPurpose(record)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold">
                                                    {formatCurrency(getReceiptAmount(record))}
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold text-green-700">
                                                    {formatCurrency(getReceiptAmount(record))}
                                                </td>
                                                <td className="px-5 py-4 text-right text-gray-400">
                                                    —
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-600">
                                                    {formatDate(getReceiptDate(record))}
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-t bg-gray-50">
                        <div>
                            <p className="text-sm text-gray-500">Total Collections</p>
                            <p className="text-xl font-bold text-[#102d55] mt-1">
                                {formatCurrency(totalCollections)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Total Voucher Value</p>
                            <p className="text-xl font-bold text-[#0797a6] mt-1">
                                {formatCurrency(totalVoucherValue)}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500">Pending Voucher Balance</p>
                            <p className="text-xl font-bold text-red-600 mt-1">
                                {formatCurrency(totalVoucherBalance)}
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        {loading ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : receiptError && voucherError ? (
                            <XCircle size={16} className="text-red-600" />
                        ) : (
                            <CheckCircle size={16} className="text-green-600" />
                        )}

                        {loading
                            ? "Loading financial records..."
                            : `${totalRecordCount} report record${totalRecordCount === 1 ? "" : "s"} loaded`}
                    </div>

                    <div>
                        {lastUpdated
                            ? `Last updated: ${lastUpdated.toLocaleString("en-PH")}`
                            : "Waiting for data..."}
                    </div>
                </footer>
            </main>
        </div>
    );
}
