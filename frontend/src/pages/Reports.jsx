import { useEffect, useMemo, useState } from "react";
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
    CheckCircle,
    Clock,
    AlertCircle,
} from "lucide-react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_BASE_URL = "http://127.0.0.1:8000/api";
const LOGO_URL = "/university-of-abra-logo.png";

function getToday() {
    return new Date().toISOString().split("T")[0];
}

function getHeaders() {
    const token = localStorage.getItem("uniteq_token");

    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token
            ? {
                  Authorization: `Bearer ${token}`,
              }
            : {}),
    };
}

function firstValue(...values) {
    return values.find(
        (value) =>
            value !== undefined &&
            value !== null &&
            value !== ""
    );
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

export default function Reports() {
    const [receipts, setReceipts] = useState([]);
    const [vouchers, setVouchers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [voucherLoading, setVoucherLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [appliedFrom, setAppliedFrom] = useState("");
    const [appliedTo, setAppliedTo] = useState("");

    const [lastUpdated, setLastUpdated] = useState(null);

    // =========================================================
    // LOAD FINANCIAL RECORDS
    // =========================================================

    useEffect(() => {
        loadReports();
    }, []);

    async function loadReports() {
        try {
            setLoading(true);

            const receiptRequest = axios.get(
                `${API_BASE_URL}/receipts`,
                {
                    headers: getHeaders(),
                }
            );

            setVoucherLoading(true);

            const voucherRequest = axios.get(
                `${API_BASE_URL}/vouchers`,
                {
                    headers: getHeaders(),
                }
            );

            const [receiptResult, voucherResult] =
                await Promise.allSettled([
                    receiptRequest,
                    voucherRequest,
                ]);

            if (receiptResult.status === "fulfilled") {
                const response = receiptResult.value;

                const data = Array.isArray(response.data)
                    ? response.data
                    : response.data?.data || [];

                setReceipts(data);
            } else {
                console.error(
                    "Receipt loading error:",
                    receiptResult.reason
                );

                setReceipts([]);
            }

            if (voucherResult.status === "fulfilled") {
                const response = voucherResult.value;

                const data = Array.isArray(response.data)
                    ? response.data
                    : response.data?.data || [];

                setVouchers(data);
            } else {
                console.warn(
                    "Voucher endpoint could not be loaded. The report will continue using available collection records.",
                    voucherResult.reason
                );

                setVouchers([]);
            }

            setLastUpdated(new Date());
        } catch (error) {
            console.error(
                "Report loading error:",
                error
            );

            alert(
                error.response?.data?.message ||
                    "Unable to load financial records for the report."
            );
        } finally {
            setLoading(false);
            setVoucherLoading(false);
        }
    }

    // =========================================================
    // RECEIPT HELPERS
    // =========================================================

    function getReceiptNumber(receipt) {
        return (
            firstValue(
                receipt.receipt_number,
                receipt.receipt_no,
                receipt.or_number,
                receipt.or_no
            ) || `OR-${String(receipt.id || 0).padStart(4, "0")}`
        );
    }

    function getReceiptDate(receipt) {
        return firstValue(
            receipt.date,
            receipt.collection_date,
            receipt.payment_date,
            receipt.created_at
        );
    }

    function getReceiptPayer(receipt) {
        return (
            firstValue(
                receipt.payer_name,
                receipt.payer,
                receipt.student_name,
                receipt.name
            ) || "—"
        );
    }

    function getReceiptStudentId(receipt) {
        return (
            firstValue(
                receipt.student_id,
                receipt.studentId,
                receipt.student_number
            ) || "—"
        );
    }

    function getReceiptPurpose(receipt) {
        return (
            firstValue(
                receipt.purpose,
                receipt.fee_type,
                receipt.transaction_type
            ) || "Collection"
        );
    }

    function getReceiptAmount(receipt) {
        return toNumber(
            firstValue(
                receipt.amount,
                receipt.amount_paid,
                receipt.collection_amount,
                receipt.total_amount
            )
        );
    }

    // =========================================================
    // VOUCHER HELPERS
    // =========================================================

    function getVoucherNumber(voucher) {
        return (
            firstValue(
                voucher.voucher_number,
                voucher.voucher_no,
                voucher.number,
                voucher.reference_number
            ) || `V-${String(voucher.id || 0).padStart(4, "0")}`
        );
    }

    function getVoucherDate(voucher) {
        return firstValue(
            voucher.date,
            voucher.voucher_date,
            voucher.created_at
        );
    }

    function getVoucherPayer(voucher) {
        return (
            firstValue(
                voucher.payer_name,
                voucher.student_name,
                voucher.beneficiary_name,
                voucher.payer,
                voucher.name
            ) || "—"
        );
    }

    function getVoucherStudentId(voucher) {
        return (
            firstValue(
                voucher.student_id,
                voucher.studentId,
                voucher.student_number
            ) || "—"
        );
    }

    function getVoucherType(voucher) {
        return (
            firstValue(
                voucher.voucher_type,
                voucher.type,
                voucher.purpose
            ) || "Voucher"
        );
    }

    function getVoucherAssignedValue(voucher) {
        return toNumber(
            firstValue(
                voucher.assigned_value,
                voucher.assigned_amount,
                voucher.amount_due,
                voucher.total_amount,
                voucher.amount
            )
        );
    }

    function getVoucherRedeemedValue(voucher) {
        return toNumber(
            firstValue(
                voucher.amount_redeemed,
                voucher.redeemed_amount,
                voucher.amount_paid,
                voucher.redemption_amount
            )
        );
    }

    function getVoucherBalance(voucher) {
        const stored = firstValue(
            voucher.pending_balance,
            voucher.remaining_balance,
            voucher.balance,
            voucher.current_balance
        );

        if (stored !== undefined) {
            return Math.max(toNumber(stored), 0);
        }

        return Math.max(
            getVoucherAssignedValue(voucher) -
                getVoucherRedeemedValue(voucher),
            0
        );
    }

    function getVoucherExpiry(voucher) {
        return firstValue(
            voucher.expiry_date,
            voucher.expiryDate,
            voucher.expires_at
        );
    }

    // =========================================================
    // GENERAL HELPERS
    // =========================================================

    function formatCurrency(amount) {
        return new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }).format(toNumber(amount));
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function getDateOnly(value) {
        if (!value) {
            return "";
        }

        const text = String(value);

        if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
            return text.substring(0, 10);
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toISOString().substring(0, 10);
    }

    function getNumericSuffix(value) {
        const match = String(value || "").match(/(\d+)$/);

        return match ? Number(match[1]) : 0;
    }

    // =========================================================
    // DATE FILTER
    // =========================================================

    function isWithinAppliedDateRange(value) {
        const date = getDateOnly(value);

        if (!date) {
            return true;
        }

        if (appliedFrom && date < appliedFrom) {
            return false;
        }

        if (appliedTo && date > appliedTo) {
            return false;
        }

        return true;
    }

    // =========================================================
    // FILTERED COLLECTIONS
    // =========================================================

    const filteredReceipts = useMemo(() => {
        const searchText = search
            .trim()
            .toLowerCase();

        return [...receipts]
            .filter((receipt) => {
                if (
                    !isWithinAppliedDateRange(
                        getReceiptDate(receipt)
                    )
                ) {
                    return false;
                }

                const text = `
                    ${getReceiptNumber(receipt)}
                    ${getReceiptPayer(receipt)}
                    ${getReceiptStudentId(receipt)}
                    ${getReceiptPurpose(receipt)}
                    ${receipt.payment_method || ""}
                    ${receipt.description || ""}
                `.toLowerCase();

                return text.includes(searchText);
            })
            .sort(
                (a, b) =>
                    getNumericSuffix(
                        getReceiptNumber(a)
                    ) -
                    getNumericSuffix(
                        getReceiptNumber(b)
                    )
            );
    }, [
        receipts,
        search,
        appliedFrom,
        appliedTo,
    ]);

    // =========================================================
    // FILTERED VOUCHERS
    // =========================================================

    const filteredVouchers = useMemo(() => {
        const searchText = search
            .trim()
            .toLowerCase();

        return [...vouchers]
            .filter((voucher) => {
                if (
                    !isWithinAppliedDateRange(
                        getVoucherDate(voucher)
                    )
                ) {
                    return false;
                }

                const text = `
                    ${getVoucherNumber(voucher)}
                    ${getVoucherPayer(voucher)}
                    ${getVoucherStudentId(voucher)}
                    ${getVoucherType(voucher)}
                    ${voucher.description || ""}
                `.toLowerCase();

                return text.includes(searchText);
            })
            .sort(
                (a, b) =>
                    getNumericSuffix(
                        getVoucherNumber(a)
                    ) -
                    getNumericSuffix(
                        getVoucherNumber(b)
                    )
            );
    }, [
        vouchers,
        search,
        appliedFrom,
        appliedTo,
    ]);

    // =========================================================
    // SUMMARY VALUES
    // =========================================================

    const totalCollections = filteredReceipts.reduce(
        (total, receipt) =>
            total + getReceiptAmount(receipt),
        0
    );

    const totalVoucherValue = filteredVouchers.reduce(
        (total, voucher) =>
            total +
            getVoucherAssignedValue(voucher),
        0
    );

    const totalVoucherRedemption =
        filteredVouchers.reduce(
            (total, voucher) =>
                total +
                getVoucherRedeemedValue(voucher),
            0
        );

    const totalVoucherBalance =
        filteredVouchers.reduce(
            (total, voucher) =>
                total +
                getVoucherBalance(voucher),
            0
        );

    const voucherCount = filteredVouchers.length;

    const totalFinancialActivity =
        totalCollections +
        totalVoucherRedemption;

    const collectionCount =
        filteredReceipts.length;

    // =========================================================
    // SIMPLE COLLECTION CATEGORY ANALYSIS
    // =========================================================

    const categoryAnalysis = useMemo(() => {
        const totals = {};

        filteredReceipts.forEach((receipt) => {
            const category =
                getReceiptPurpose(receipt);

            totals[category] =
                (totals[category] || 0) +
                getReceiptAmount(receipt);
        });

        const entries = Object.entries(totals)
            .sort((a, b) => b[1] - a[1]);

        const total = entries.reduce(
            (sum, [, amount]) => sum + amount,
            0
        );

        return entries
            .slice(0, 4)
            .map(([name, amount]) => ({
                name,
                amount,
                percentage:
                    total > 0
                        ? (amount / total) * 100
                        : 0,
            }));
    }, [filteredReceipts]);

    const largestCategory =
        categoryAnalysis[0]?.name || "No data";

    const largestCategoryPercentage =
        categoryAnalysis[0]?.percentage || 0;

    // =========================================================
    // RECENT ACTIVITY
    // =========================================================

    const recentActivity = useMemo(() => {
        const receiptActivities =
            filteredReceipts.map((receipt) => ({
                id: `receipt-${receipt.id}`,
                date:
                    getReceiptDate(receipt) ||
                    receipt.created_at,
                text: `Collection recorded: ${getReceiptNumber(
                    receipt
                )}`,
                detail: getReceiptPayer(receipt),
                type: "collection",
            }));

        const voucherActivities =
            filteredVouchers.map((voucher) => ({
                id: `voucher-${voucher.id}`,
                date:
                    getVoucherDate(voucher) ||
                    voucher.created_at,
                text: `Voucher recorded: ${getVoucherNumber(
                    voucher
                )}`,
                detail: getVoucherPayer(voucher),
                type: "voucher",
            }));

        return [
            ...receiptActivities,
            ...voucherActivities,
        ]
            .sort(
                (a, b) =>
                    new Date(b.date || 0) -
                    new Date(a.date || 0)
            )
            .slice(0, 5);
    }, [
        filteredReceipts,
        filteredVouchers,
    ]);

    // =========================================================
    // APPLY FILTERS
    // =========================================================

    function applyFilters() {
        if (
            dateFrom &&
            dateTo &&
            dateFrom > dateTo
        ) {
            alert(
                "Date From cannot be later than Date To."
            );
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

    // =========================================================
    // REPORT PERIOD
    // =========================================================

    function getPeriodText() {
        if (appliedFrom && appliedTo) {
            return `${formatDate(
                appliedFrom
            )} - ${formatDate(appliedTo)}`;
        }

        if (appliedFrom) {
            return `From ${formatDate(
                appliedFrom
            )}`;
        }

        if (appliedTo) {
            return `Until ${formatDate(
                appliedTo
            )}`;
        }

        return "All Dates";
    }

    // =========================================================
    // LOGO FOR PDF
    // =========================================================

    function loadLogoAsDataURL() {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.crossOrigin = "Anonymous";

            img.onload = () => {
                try {
                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    canvas.width =
                        img.naturalWidth;

                    canvas.height =
                        img.naturalHeight;

                    const context =
                        canvas.getContext("2d");

                    context.drawImage(
                        img,
                        0,
                        0
                    );

                    resolve(
                        canvas.toDataURL(
                            "image/png"
                        )
                    );
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () =>
                reject(
                    new Error(
                        "Logo could not be loaded."
                    )
                );

            img.src =
                `${LOGO_URL}?v=${Date.now()}`;
        });
    }

    // =========================================================
    // PDF REPORT
    // =========================================================

    async function exportPDF() {
        if (
            filteredReceipts.length === 0 &&
            filteredVouchers.length === 0
        ) {
            alert(
                "There are no records to export."
            );
            return;
        }

        try {
            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
            });

            try {
                const logo =
                    await loadLogoAsDataURL();

                doc.addImage(
                    logo,
                    "PNG",
                    137,
                    7,
                    22,
                    22
                );
            } catch (error) {
                console.warn(
                    "Logo could not be added:",
                    error
                );
            }

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(16);

            doc.text(
                "UNIVERSITY OF ABRA",
                148,
                35,
                { align: "center" }
            );

            doc.setFontSize(12);

            doc.text(
                "Main Campus Cashier's Unit",
                148,
                42,
                { align: "center" }
            );

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.setFontSize(9);

            doc.text(
                "UniTeq Financial Management System",
                148,
                48,
                { align: "center" }
            );

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(14);

            doc.text(
                "CONSOLIDATED COLLECTION & VOUCHER REPORT",
                148,
                59,
                { align: "center" }
            );

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.setFontSize(9);

            doc.text(
                `Report Period: ${getPeriodText()}`,
                148,
                66,
                { align: "center" }
            );

            const tableRows = [
                ...filteredVouchers.map(
                    (voucher) => [
                        getVoucherPayer(voucher),
                        getVoucherStudentId(
                            voucher
                        ),
                        getVoucherNumber(voucher),
                        getVoucherType(voucher),
                        formatCurrency(
                            getVoucherAssignedValue(
                                voucher
                            )
                        ),
                        formatCurrency(
                            getVoucherRedeemedValue(
                                voucher
                            )
                        ),
                        formatCurrency(
                            getVoucherBalance(
                                voucher
                            )
                        ),
                    ]
                ),
                ...filteredReceipts.map(
                    (receipt) => [
                        getReceiptPayer(receipt),
                        getReceiptStudentId(
                            receipt
                        ),
                        getReceiptNumber(receipt),
                        getReceiptPurpose(receipt),
                        "Collection",
                        formatCurrency(
                            getReceiptAmount(
                                receipt
                            )
                        ),
                        "—",
                    ]
                ),
            ];

            autoTable(doc, {
                startY: 74,
                head: [[
                    "Payer Name",
                    "Student ID",
                    "Transaction / Voucher ID",
                    "Type",
                    "Assigned / Amount",
                    "Collected / Redeemed",
                    "Pending Balance",
                ]],
                body: tableRows,
                theme: "grid",
                styles: {
                    fontSize: 7,
                    cellPadding: 2.5,
                    valign: "middle",
                },
                headStyles: {
                    fontStyle: "bold",
                },
            });

            const finalY =
                doc.lastAutoTable.finalY +
                8;

            doc.setFont(
                "helvetica",
                "bold"
            );

            doc.setFontSize(10);

            doc.text(
                `TOTAL COLLECTIONS: ${formatCurrency(
                    totalCollections
                )}`,
                14,
                finalY
            );

            doc.text(
                `VOUCHER BALANCES: ${formatCurrency(
                    totalVoucherBalance
                )}`,
                148,
                finalY,
                { align: "center" }
            );

            doc.text(
                `TOTAL VOUCHER VALUE: ${formatCurrency(
                    totalVoucherValue
                )}`,
                283,
                finalY,
                { align: "right" }
            );

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.setFontSize(8);

            doc.text(
                `Generated: ${new Date().toLocaleString(
                    "en-PH"
                )}`,
                14,
                202
            );

            doc.text(
                "Property of University of Abra - Internal Financial System",
                283,
                202,
                { align: "right" }
            );

            doc.save(
                `University-of-Abra-Consolidated-Report-${getToday()}.pdf`
            );
        } catch (error) {
            console.error(
                "PDF generation error:",
                error
            );

            alert(
                "Unable to generate the PDF report."
            );
        }
    }

    // =========================================================
    // PRINT REPORT
    // =========================================================

    function printReport() {
        if (
            filteredReceipts.length === 0 &&
            filteredVouchers.length === 0
        ) {
            alert(
                "There are no records to print."
            );
            return;
        }

        const rows = [
            ...filteredVouchers.map(
                (voucher) => `
                    <tr>
                        <td>${getVoucherPayer(voucher)}</td>
                        <td>${getVoucherStudentId(voucher)}</td>
                        <td>${getVoucherNumber(voucher)}</td>
                        <td>${getVoucherType(voucher)}</td>
                        <td>${formatCurrency(
                            getVoucherAssignedValue(
                                voucher
                            )
                        )}</td>
                        <td>${formatCurrency(
                            getVoucherRedeemedValue(
                                voucher
                            )
                        )}</td>
                        <td>${formatCurrency(
                            getVoucherBalance(
                                voucher
                            )
                        )}</td>
                    </tr>
                `
            ),
            ...filteredReceipts.map(
                (receipt) => `
                    <tr>
                        <td>${getReceiptPayer(receipt)}</td>
                        <td>${getReceiptStudentId(receipt)}</td>
                        <td>${getReceiptNumber(receipt)}</td>
                        <td>${getReceiptPurpose(receipt)}</td>
                        <td>Collection</td>
                        <td>${formatCurrency(
                            getReceiptAmount(
                                receipt
                            )
                        )}</td>
                        <td>—</td>
                    </tr>
                `
            ),
        ].join("");

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>University of Abra Financial Report</title>

                <style>
                    @page {
                        size: landscape;
                        margin: 10mm;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        font-family: Arial, Helvetica, sans-serif;
                        color: #111827;
                        margin: 0;
                        padding: 15px;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 18px;
                    }

                    .logo {
                        width: 70px;
                        height: 70px;
                        object-fit: contain;
                    }

                    .university {
                        font-size: 22px;
                        font-weight: 800;
                        margin: 4px 0;
                    }

                    .unit {
                        font-size: 15px;
                        font-weight: 700;
                        margin: 3px 0;
                    }

                    .system {
                        font-size: 11px;
                        color: #64748b;
                        margin: 3px 0;
                    }

                    .title {
                        font-size: 18px;
                        font-weight: 800;
                        margin: 14px 0 4px;
                    }

                    .period {
                        font-size: 11px;
                        color: #64748b;
                    }

                    .summary {
                        display: flex;
                        gap: 12px;
                        margin: 15px 0;
                    }

                    .summary-card {
                        flex: 1;
                        border: 1px solid #dbe3ea;
                        border-radius: 8px;
                        padding: 10px;
                    }

                    .summary-label {
                        font-size: 10px;
                        color: #64748b;
                    }

                    .summary-value {
                        font-size: 15px;
                        font-weight: 800;
                        margin-top: 4px;
                    }

                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 12px;
                    }

                    th,
                    td {
                        border: 1px solid #cbd5e1;
                        padding: 6px;
                        font-size: 9px;
                    }

                    th {
                        background: #eef4f8;
                        font-weight: 800;
                    }

                    .footer {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 20px;
                        font-size: 9px;
                        color: #64748b;
                    }
                </style>
            </head>

            <body>
                <div class="header">
                    <img
                        src="${LOGO_URL}"
                        class="logo"
                        alt="University of Abra"
                    />

                    <div class="university">
                        UNIVERSITY OF ABRA
                    </div>

                    <div class="unit">
                        Main Campus Cashier's Unit
                    </div>

                    <div class="system">
                        UniTeq Financial Management System
                    </div>

                    <div class="title">
                        CONSOLIDATED COLLECTION & VOUCHER REPORT
                    </div>

                    <div class="period">
                        Report Period: ${getPeriodText()}
                    </div>
                </div>

                <div class="summary">
                    <div class="summary-card">
                        <div class="summary-label">
                            Total Collections
                        </div>
                        <div class="summary-value">
                            ${formatCurrency(
                                totalCollections
                            )}
                        </div>
                    </div>

                    <div class="summary-card">
                        <div class="summary-label">
                            Total Voucher Value
                        </div>
                        <div class="summary-value">
                            ${formatCurrency(
                                totalVoucherValue
                            )}
                        </div>
                    </div>

                    <div class="summary-card">
                        <div class="summary-label">
                            Voucher Pending Balance
                        </div>
                        <div class="summary-value">
                            ${formatCurrency(
                                totalVoucherBalance
                            )}
                        </div>
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
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <div class="footer">
                    <span>
                        Generated:
                        ${new Date().toLocaleString(
                            "en-PH"
                        )}
                    </span>

                    <span>
                        Property of University of Abra - Internal Financial System
                    </span>
                </div>
            </body>
            </html>
        `;

        const iframe =
            document.createElement("iframe");

        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";

        document.body.appendChild(iframe);

        const iframeDocument =
            iframe.contentWindow.document;

        iframeDocument.open();
        iframeDocument.write(printContent);
        iframeDocument.close();

        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();

                setTimeout(() => {
                    if (
                        document.body.contains(
                            iframe
                        )
                    ) {
                        document.body.removeChild(
                            iframe
                        );
                    }
                }, 1000);
            }, 500);
        };
    }

    // =========================================================
    // STATUS / ACTIVITY ICON
    // =========================================================

    function getActivityIcon(type) {
        if (type === "voucher") {
            return (
                <WalletCards
                    size={15}
                />
            );
        }

        return (
            <Receipt size={15} />
        );
    }

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <div className="min-h-screen bg-[#f5f7fa]">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="bg-[#102d55] text-white">

                <div className="max-w-[1500px] mx-auto px-6 py-7">

                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                        <div className="flex items-center gap-5">

                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">

                                <FileText
                                    size={32}
                                    className="text-[#102d55]"
                                />

                            </div>

                            <div>

                                <p className="text-sm text-blue-100">
                                    University of Abra | Main Campus
                                    <span className="mx-2">
                                        •
                                    </span>
                                    Cashier's Unit
                                </p>

                                <h1 className="text-3xl sm:text-4xl font-bold mt-1">
                                    Financial Reports Page
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
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-white/80 hover:bg-white hover:text-[#102d55] transition font-semibold disabled:opacity-50"
                            >

                                <RefreshCw
                                    size={18}
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                Refresh

                            </button>

                            <button
                                type="button"
                                onClick={printReport}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-[#102d55] hover:bg-blue-50 transition font-semibold disabled:opacity-50"
                            >

                                <Printer
                                    size={18}
                                />

                                Print Report

                            </button>

                            <button
                                type="button"
                                onClick={exportPDF}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white transition font-semibold disabled:opacity-50"
                            >

                                <Download
                                    size={18}
                                />

                                Export PDF

                            </button>

                        </div>

                    </div>

                </div>

            </div>

            {/* =================================================
                MAIN
            ================================================= */}

            <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-7">

                {/* =================================================
                    REPORT TITLE
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                        <div>

                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                Consolidated Collection & Voucher Report
                            </h2>

                            <p className="text-sm text-gray-500 mt-2">
                                University of Abra — Cashier's Unit
                            </p>

                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#102d55] text-white text-sm font-semibold">

                            <CalendarDays
                                size={17}
                            />

                            {getToday()}

                        </div>

                    </div>

                </div>

                {/* =================================================
                    FILTERS
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                    <div className="flex items-center gap-3 mb-5">

                        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">

                            <Search
                                size={21}
                                className="text-[#102d55]"
                            />

                        </div>

                        <div>

                            <h3 className="text-lg font-bold text-gray-900">
                                Report Filters
                            </h3>

                            <p className="text-sm text-gray-500">
                                Select a date range and search the report records.
                            </p>

                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">

                        <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Date From
                            </label>

                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) =>
                                    setDateFrom(
                                        e.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] focus:border-[#0797a6]"
                            />

                        </div>

                        <div>

                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Date To
                            </label>

                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) =>
                                    setDateTo(
                                        e.target.value
                                    )
                                }
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] focus:border-[#0797a6]"
                            />

                        </div>

                        <div className="md:col-span-2 xl:col-span-2">

                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Search
                            </label>

                            <div className="relative">

                                <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Search payer, student ID, receipt, voucher, or type..."
                                    className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] focus:border-[#0797a6]"
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
                            Clear
                        </button>

                        <button
                            type="button"
                            onClick={applyFilters}
                            className="px-6 py-3 rounded-xl bg-[#0797a6] text-white font-semibold hover:bg-[#067f8b]"
                        >
                            Apply
                        </button>

                    </div>

                </div>

                {/* =================================================
                    SUMMARY CARDS
                ================================================= */}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Collections
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55] mt-2">
                                    {formatCurrency(
                                        totalCollections
                                    )}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    {collectionCount} collection record
                                    {collectionCount === 1
                                        ? ""
                                        : "s"}
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                <Receipt
                                    size={24}
                                    className="text-[#102d55]"
                                />

                            </div>

                        </div>

                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Voucher Value
                                </p>

                                <h2 className="text-2xl font-bold text-[#0797a6] mt-2">
                                    {formatCurrency(
                                        totalVoucherValue
                                    )}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    {voucherCount} voucher record
                                    {voucherCount === 1
                                        ? ""
                                        : "s"}
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">

                                <WalletCards
                                    size={24}
                                    className="text-[#0797a6]"
                                />

                            </div>

                        </div>

                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Voucher Pending Balance
                                </p>

                                <h2 className="text-2xl font-bold text-red-600 mt-2">
                                    {formatCurrency(
                                        totalVoucherBalance
                                    )}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    Amount still available for redemption
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">

                                <AlertCircle
                                    size={24}
                                    className="text-red-600"
                                />

                            </div>

                        </div>

                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Financial Activity
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55] mt-2">
                                    {formatCurrency(
                                        totalFinancialActivity
                                    )}
                                </h2>

                                <p className="text-xs text-gray-500 mt-2">
                                    Collections + voucher redemptions
                                </p>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                <Activity
                                    size={24}
                                    className="text-[#102d55]"
                                />

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    ANALYSIS + ACTIVITY + TOOLS
                ================================================= */}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                    {/* COLLECTION ANALYSIS */}

                    <div className="xl:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <h3 className="text-xl font-bold text-gray-900">
                            Total Collection Analysis
                        </h3>

                        <p className="text-sm text-gray-500 mt-1">
                            Collection distribution by fee type.
                        </p>

                        <div className="flex items-center gap-6 mt-6">

                            <div
                                className="w-36 h-36 rounded-full flex-shrink-0"
                                style={{
                                    background:
                                        categoryAnalysis.length
                                            ? `conic-gradient(
                                                #102d55 0% ${categoryAnalysis[0]?.percentage || 0}%,
                                                #0797a6 ${categoryAnalysis[0]?.percentage || 0}% ${(categoryAnalysis[0]?.percentage || 0) + (categoryAnalysis[1]?.percentage || 0)}%,
                                                #7aa7a8 ${(categoryAnalysis[0]?.percentage || 0) + (categoryAnalysis[1]?.percentage || 0)}% ${(categoryAnalysis[0]?.percentage || 0) + (categoryAnalysis[1]?.percentage || 0) + (categoryAnalysis[2]?.percentage || 0)}%,
                                                #cbd5e1 ${(categoryAnalysis[0]?.percentage || 0) + (categoryAnalysis[1]?.percentage || 0) + (categoryAnalysis[2]?.percentage || 0)}% 100%
                                            )`
                                            : "#e5e7eb",
                                }}
                            />

                            <div className="space-y-3 min-w-0">

                                {categoryAnalysis.length === 0 ? (

                                    <p className="text-sm text-gray-500">
                                        No collection data available.
                                    </p>

                                ) : (

                                    categoryAnalysis.map(
                                        (
                                            category,
                                            index
                                        ) => (

                                            <div
                                                key={
                                                    category.name
                                                }
                                                className="flex items-start gap-2"
                                            >

                                                <span
                                                    className={`w-3 h-3 rounded-sm mt-1 flex-shrink-0 ${
                                                        index ===
                                                        0
                                                            ? "bg-[#102d55]"
                                                            : index ===
                                                              1
                                                            ? "bg-[#0797a6]"
                                                            : index ===
                                                              2
                                                            ? "bg-[#7aa7a8]"
                                                            : "bg-gray-300"
                                                    }`}
                                                />

                                                <div className="min-w-0">

                                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                                        {category.name}
                                                    </p>

                                                    <p className="text-xs text-gray-500">
                                                        {category.percentage.toFixed(
                                                            0
                                                        )}
                                                        %
                                                    </p>

                                                </div>

                                            </div>

                                        )
                                    )

                                )}

                            </div>

                        </div>

                        <div className="mt-6">

                            <p className="text-sm text-gray-500">
                                Total Collections
                            </p>

                            <p className="text-3xl font-bold text-[#102d55] mt-1">
                                {formatCurrency(
                                    totalCollections
                                )}
                            </p>

                            <p className="text-sm text-gray-500 mt-2">
                                Largest category:{" "}
                                <span className="font-semibold text-gray-800">
                                    {largestCategory}
                                </span>{" "}
                                ({largestCategoryPercentage.toFixed(
                                    0
                                )}
                                %)
                            </p>

                        </div>

                    </div>

                    {/* VOUCHER SUMMARY */}

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center gap-3">

                            <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center">

                                <WalletCards
                                    size={22}
                                    className="text-[#0797a6]"
                                />

                            </div>

                            <div>

                                <h3 className="text-xl font-bold text-gray-900">
                                    Total Voucher Balances & Expiry
                                </h3>

                                <p className="text-sm text-gray-500">
                                    Current voucher allocation and redemption.
                                </p>

                            </div>

                        </div>

                        <div className="space-y-5 mt-6">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Active Voucher Records
                                </p>

                                <p className="text-3xl font-bold text-[#102d55] mt-1">
                                    {voucherCount}
                                </p>

                            </div>

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Voucher Value
                                </p>

                                <p className="text-2xl font-bold text-[#102d55] mt-1">
                                    {formatCurrency(
                                        totalVoucherValue
                                    )}
                                </p>

                            </div>

                            <div>

                                <p className="text-sm text-gray-500">
                                    Vouchers with Pending Balances
                                </p>

                                <p className="text-2xl font-bold text-red-600 mt-1">
                                    {formatCurrency(
                                        totalVoucherBalance
                                    )}
                                </p>

                            </div>

                            <div className="pt-4 border-t border-gray-100">

                                <p className="text-sm text-gray-500">
                                    Total Redeemed
                                </p>

                                <p className="text-2xl font-bold text-green-600 mt-1">
                                    {formatCurrency(
                                        totalVoucherRedemption
                                    )}
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* RECENT ACTIVITY + TOOLS */}

                    <div className="space-y-5">

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                            <div className="flex items-center gap-3">

                                <Activity
                                    size={21}
                                    className="text-[#102d55]"
                                />

                                <div>

                                    <h3 className="text-xl font-bold text-gray-900">
                                        Recent Activity
                                    </h3>

                                    <p className="text-sm text-gray-500">
                                        Latest report-related records.
                                    </p>

                                </div>

                            </div>

                            <div className="mt-5 space-y-3">

                                {recentActivity.length === 0 ? (

                                    <p className="text-sm text-gray-500">
                                        No recent activity available.
                                    </p>

                                ) : (

                                    recentActivity.map(
                                        (
                                            activity
                                        ) => (

                                            <div
                                                key={
                                                    activity.id
                                                }
                                                className="flex items-start gap-3"
                                            >

                                                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#102d55] flex items-center justify-center flex-shrink-0">
                                                    {getActivityIcon(
                                                        activity.type
                                                    )}
                                                </div>

                                                <div className="min-w-0">

                                                    <p className="text-sm font-semibold text-gray-800">
                                                        {activity.text}
                                                    </p>

                                                    <p className="text-xs text-gray-500 truncate">
                                                        {activity.detail}
                                                    </p>

                                                </div>

                                            </div>

                                        )
                                    )

                                )}

                            </div>

                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                            <h3 className="text-xl font-bold text-gray-900">
                                Report Tools
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3 mt-5">

                                <button
                                    type="button"
                                    onClick={printReport}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0797a6] text-white font-semibold hover:bg-[#067f8b] disabled:opacity-50"
                                >
                                    <Printer size={17} />
                                    Print Report
                                </button>

                                <button
                                    type="button"
                                    onClick={exportPDF}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <Download size={17} />
                                    Export to PDF
                                </button>

                                <button
                                    type="button"
                                    onClick={loadReports}
                                    disabled={loading}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <RefreshCw
                                        size={17}
                                        className={
                                            loading
                                                ? "animate-spin"
                                                : ""
                                        }
                                    />
                                    Refresh Data
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    REPORT REGISTRY
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 border-b border-gray-200">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                            <div>

                                <h3 className="text-2xl font-bold text-gray-900">
                                    Financial Transaction Registry
                                </h3>

                                <p className="text-sm text-gray-500 mt-1">
                                    Collections and voucher records included in this report.
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

                    </div>

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[1250px]">

                            <thead className="bg-[#eef4f8]">

                                <tr>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600">
                                        Payer Name
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600">
                                        Student ID
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600">
                                        Transaction / Voucher ID
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600">
                                        Type
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-bold uppercase text-gray-600">
                                        Assigned / Amount
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-bold uppercase text-gray-600">
                                        Collection / Redemption
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-bold uppercase text-gray-600">
                                        Pending Balance
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-gray-600">
                                        Date
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-100">

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan="8"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <RefreshCw
                                                size={28}
                                                className="animate-spin mx-auto mb-3"
                                            />

                                            Loading financial records...

                                        </td>

                                    </tr>

                                ) : (
                                    filteredVouchers.length === 0 &&
                                    filteredReceipts.length === 0
                                ) ? (

                                    <tr>

                                        <td
                                            colSpan="8"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <FileText
                                                size={35}
                                                className="mx-auto mb-3 text-gray-300"
                                            />

                                            <p className="font-semibold">
                                                No records found.
                                            </p>

                                            <p className="text-sm mt-1">
                                                Try another date range or search term.
                                            </p>

                                        </td>

                                    </tr>

                                ) : (

                                    <>

                                        {filteredVouchers.map(
                                            (
                                                voucher
                                            ) => {

                                                const balance =
                                                    getVoucherBalance(
                                                        voucher
                                                    );

                                                return (

                                                    <tr
                                                        key={`voucher-${voucher.id}`}
                                                        className="hover:bg-blue-50/30 transition"
                                                    >

                                                        <td className="px-5 py-4 font-semibold text-gray-900">
                                                            {getVoucherPayer(
                                                                voucher
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-sm text-gray-600">
                                                            {getVoucherStudentId(
                                                                voucher
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 font-bold text-[#102d55]">
                                                            {getVoucherNumber(
                                                                voucher
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4">

                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 text-xs font-semibold">

                                                                <WalletCards
                                                                    size={14}
                                                                />

                                                                {getVoucherType(
                                                                    voucher
                                                                )}

                                                            </span>

                                                        </td>

                                                        <td className="px-5 py-4 text-right font-semibold">
                                                            {formatCurrency(
                                                                getVoucherAssignedValue(
                                                                    voucher
                                                                )
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-right font-bold text-green-700">
                                                            {formatCurrency(
                                                                getVoucherRedeemedValue(
                                                                    voucher
                                                                )
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-right font-bold text-red-600">
                                                            {formatCurrency(
                                                                balance
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-sm text-gray-600">
                                                            {formatDate(
                                                                getVoucherDate(
                                                                    voucher
                                                                )
                                                            )}
                                                        </td>

                                                    </tr>

                                                );
                                            }
                                        )}

                                        {filteredReceipts.map(
                                            (
                                                receipt
                                            ) => {

                                                return (

                                                    <tr
                                                        key={`receipt-${receipt.id}`}
                                                        className="hover:bg-blue-50/30 transition"
                                                    >

                                                        <td className="px-5 py-4 font-semibold text-gray-900">
                                                            {getReceiptPayer(
                                                                receipt
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-sm text-gray-600">
                                                            {getReceiptStudentId(
                                                                receipt
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 font-bold text-[#102d55]">
                                                            {getReceiptNumber(
                                                                receipt
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4">

                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">

                                                                <Receipt
                                                                    size={14}
                                                                />

                                                                {getReceiptPurpose(
                                                                    receipt
                                                                )}

                                                            </span>

                                                        </td>

                                                        <td className="px-5 py-4 text-right font-semibold">
                                                            {formatCurrency(
                                                                getReceiptAmount(
                                                                    receipt
                                                                )
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-right font-bold text-green-700">
                                                            {formatCurrency(
                                                                getReceiptAmount(
                                                                    receipt
                                                                )
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-right text-gray-400">
                                                            —
                                                        </td>

                                                        <td className="px-5 py-4 text-sm text-gray-600">
                                                            {formatDate(
                                                                getReceiptDate(
                                                                    receipt
                                                                )
                                                            )}
                                                        </td>

                                                    </tr>

                                                );
                                            }
                                        )}

                                    </>

                                )}

                            </tbody>

                        </table>

                    </div>

                    {/* =================================================
                        FOOTER SUMMARY
                    ================================================= */}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-t bg-gray-50">

                        <div>

                            <p className="text-sm text-gray-500">
                                Total Collections
                            </p>

                            <p className="text-xl font-bold text-[#102d55] mt-1">
                                {formatCurrency(
                                    totalCollections
                                )}
                            </p>

                        </div>

                        <div>

                            <p className="text-sm text-gray-500">
                                Total Voucher Value
                            </p>

                            <p className="text-xl font-bold text-[#0797a6] mt-1">
                                {formatCurrency(
                                    totalVoucherValue
                                )}
                            </p>

                        </div>

                        <div>

                            <p className="text-sm text-gray-500">
                                Pending Voucher Balance
                            </p>

                            <p className="text-xl font-bold text-red-600 mt-1">
                                {formatCurrency(
                                    totalVoucherBalance
                                )}
                            </p>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    REPORT STATUS
                ================================================= */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">

                    <div className="flex items-center gap-2">

                        <CheckCircle
                            size={16}
                            className="text-green-600"
                        />

                        Report data loaded from the UniTeq financial records.

                    </div>

                    <div>

                        {lastUpdated
                            ? `Last updated: ${lastUpdated.toLocaleString(
                                  "en-PH"
                              )}`
                            : "Waiting for data..."}

                        {voucherLoading && (
                            <span className="ml-2">
                                Loading voucher records...
                            </span>
                        )}

                    </div>

                </div>

            </main>

        </div>
    );
}
