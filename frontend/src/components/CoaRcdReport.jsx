import { useState } from "react";
import {
    Printer,
    Download,
    Building2,
    CalendarDays,
    SlidersHorizontal,
    Landmark,
    FileSpreadsheet,
    ShieldAlert,
    RotateCcw,
    CheckCircle,
} from "lucide-react";

export default function CoaRcdReport({
    filteredReceipts,
    totalCollections,
    getReceiptNumber,
    getReceiptDate,
    getReceiptPayer,
    getReceiptPurpose,
    getReceiptAmount,
    formatCurrency,
    formatDate,
    getPeriodText,
    rcdFundCluster,
    setRcdFundCluster,
    rcdReportNo,
    setRcdReportNo,
    rcdOfficerName,
    setRcdOfficerName,
    rcdOfficerDesignation,
    setRcdOfficerDesignation,
    rcdBankName,
    setRcdBankName,
    rcdBankAccount,
    setRcdBankAccount,
    rcdDepositRef,
    setRcdDepositRef,
    rcdBeginningBalance,
    setRcdBeginningBalance,
    rcdAccountantName,
    setRcdAccountantName,
    rcdAccountantDesignation,
    setRcdAccountantDesignation,
    printCoaRcd,
    exportCoaRcdPDF,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    applyFilters,
    clearFilters,
}) {
    const [showConfig, setShowConfig] = useState(false);

    const firstOr =
        filteredReceipts.length > 0
            ? getReceiptNumber(filteredReceipts[0])
            : "OR-0001";
    const lastOr =
        filteredReceipts.length > 0
            ? getReceiptNumber(filteredReceipts[filteredReceipts.length - 1])
            : "OR-0001";
    const qtyIssued = filteredReceipts.length;

    const numBeginningBalance = Number(rcdBeginningBalance) || 0;
    const totalAccountability = numBeginningBalance + totalCollections;
    const endingBalance = numBeginningBalance;

    return (
        <div className="space-y-6">
            {/* Control & Customization Bar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                Official COA Report of Collections & Deposits (RCD)
                            </h2>
                            <p className="text-xs text-gray-500">
                                Mandated Government Format • Appendix 43, Government Accounting Manual (GAM for SUCs)
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowConfig(!showConfig)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition"
                        >
                            <SlidersHorizontal size={15} />
                            {showConfig ? "Hide RCD Parameters" : "Customize RCD Parameters"}
                        </button>
                        <button
                            type="button"
                            onClick={printCoaRcd}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 font-semibold text-xs transition shadow-sm"
                        >
                            <Printer size={15} />
                            Print COA RCD
                        </button>
                        <button
                            type="button"
                            onClick={exportCoaRcdPDF}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm"
                        >
                            <Download size={15} />
                            Export COA RCD (PDF)
                        </button>
                    </div>
                </div>

                {/* Filter and Date Range */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">Fund Cluster:</span>
                        <select
                            value={rcdFundCluster}
                            onChange={(e) => setRcdFundCluster(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                            <option value="05 - Internally Generated Funds (IGF)">05 - Internally Generated Funds (IGF)</option>
                            <option value="07 - Trust Receipts">07 - Trust Receipts</option>
                            <option value="01 - Regular Agency Fund">01 - Regular Agency Fund</option>
                            <option value="06 - Business Related Funds">06 - Business Related Funds</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-600">Period:</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                            title="Date From"
                        />
                        <span className="text-gray-400 text-xs">to</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                            title="Date To"
                        />
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="px-3 py-1.5 rounded-lg bg-[#102d55] text-white text-xs font-medium hover:bg-blue-900 transition"
                        >
                            Apply
                        </button>
                        {(dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-2 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs transition"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Customizable Parameters Panel */}
                {showConfig && (
                    <div className="p-5 rounded-xl bg-gray-50 border border-gray-200 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Landmark size={15} className="text-blue-600" />
                                Official Government Sign-Off & Banking Parameters
                            </span>
                            <span className="text-xs text-gray-500">Values reflect directly onto the COA report format</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">RCD Report Number</label>
                                <input
                                    type="text"
                                    value={rcdReportNo}
                                    onChange={(e) => setRcdReportNo(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">Accountable Officer Name</label>
                                <input
                                    type="text"
                                    value={rcdOfficerName}
                                    onChange={(e) => setRcdOfficerName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">Officer Official Designation</label>
                                <input
                                    type="text"
                                    value={rcdOfficerDesignation}
                                    onChange={(e) => setRcdOfficerDesignation(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">Depository Bank Name & Branch</label>
                                <input
                                    type="text"
                                    value={rcdBankName}
                                    onChange={(e) => setRcdBankName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">Bank Account Number</label>
                                <input
                                    type="text"
                                    value={rcdBankAccount}
                                    onChange={(e) => setRcdBankAccount(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">Validated Deposit Slip (DS) Ref #</label>
                                <input
                                    type="text"
                                    value={rcdDepositRef}
                                    onChange={(e) => setRcdDepositRef(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">Beginning Undeposited Balance (PHP)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={rcdBeginningBalance}
                                    onChange={(e) => setRcdBeginningBalance(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">University Accountant Name</label>
                                <input
                                    type="text"
                                    value={rcdAccountantName}
                                    onChange={(e) => setRcdAccountantName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-600 font-semibold mb-1">Accountant Designation</label>
                                <input
                                    type="text"
                                    value={rcdAccountantDesignation}
                                    onChange={(e) => setRcdAccountantDesignation(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Official Document Paper Preview */}
            <div className="bg-white rounded-2xl border border-gray-300 shadow-xl max-w-[1100px] mx-auto p-6 sm:p-12 font-serif text-gray-900 overflow-x-auto">
                {/* Appendix Marker */}
                <div className="text-right text-xs italic text-gray-500 mb-2">
                    Appendix 43 (Government Accounting Manual for SUCs)
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                    <img
                        src="/university-of-abra-logo.png"
                        alt="University of Abra Logo"
                        className="w-16 h-16 object-contain mx-auto mb-2"
                        onError={(e) => (e.target.style.display = "none")}
                    />
                    <h1 className="text-base font-bold uppercase tracking-wider text-gray-900">
                        Republic of the Philippines
                    </h1>
                    <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">
                        UNIVERSITY OF ABRA
                    </h2>
                    <p className="text-xs text-gray-600">Main Campus, Bangued, Abra</p>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">
                        Cashier's Unit — UniTeq Financial Management System
                    </p>
                    <h3 className="text-base font-bold uppercase underline tracking-wider mt-4 text-gray-900">
                        REPORT OF COLLECTIONS AND DEPOSITS
                    </h3>
                </div>

                {/* Metadata Table */}
                <div className="border border-gray-900 mb-6 text-xs font-sans">
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-900">
                        <div className="p-2 space-y-1.5">
                            <div className="flex">
                                <span className="w-36 font-bold text-gray-700">Entity Name:</span>
                                <span className="font-semibold text-gray-900">UNIVERSITY OF ABRA</span>
                            </div>
                            <div className="flex">
                                <span className="w-36 font-bold text-gray-700">Fund Cluster:</span>
                                <span className="font-semibold text-gray-900">{rcdFundCluster}</span>
                            </div>
                            <div className="flex">
                                <span className="w-36 font-bold text-gray-700">Report No.:</span>
                                <span className="font-mono font-bold text-blue-900">{rcdReportNo}</span>
                            </div>
                        </div>

                        <div className="p-2 space-y-1.5">
                            <div className="flex">
                                <span className="w-36 font-bold text-gray-700">Date / Period:</span>
                                <span className="font-semibold text-gray-900">{getPeriodText()}</span>
                            </div>
                            <div className="flex">
                                <span className="w-36 font-bold text-gray-700">Accountable Officer:</span>
                                <span className="font-semibold text-gray-900">{rcdOfficerName}</span>
                            </div>
                            <div className="flex">
                                <span className="w-36 font-bold text-gray-700">Official Designation:</span>
                                <span className="font-semibold text-gray-900">{rcdOfficerDesignation}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section A: Collections */}
                <div className="mb-6">
                    <div className="font-bold text-xs uppercase tracking-wide mb-1 text-gray-900">
                        A. COLLECTIONS
                    </div>
                    <table className="w-full border-collapse border border-gray-900 text-xs font-sans">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-900">
                                <th className="border border-gray-900 p-2 text-center w-28">Official Receipt No.</th>
                                <th className="border border-gray-900 p-2 text-center w-24">Date</th>
                                <th className="border border-gray-900 p-2 text-left">Payor Name</th>
                                <th className="border border-gray-900 p-2 text-left">Nature of Collection</th>
                                <th className="border border-gray-900 p-2 text-right w-32">Amount (PHP)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="border border-gray-900 p-4 text-center text-gray-500 italic">
                                        No collection transactions recorded for this period.
                                    </td>
                                </tr>
                            ) : (
                                filteredReceipts.map((r) => (
                                    <tr key={r.id} className="border-b border-gray-300 hover:bg-gray-50">
                                        <td className="border border-gray-900 p-1.5 text-center font-mono font-semibold">
                                            {getReceiptNumber(r)}
                                        </td>
                                        <td className="border border-gray-900 p-1.5 text-center">
                                            {formatDate(getReceiptDate(r))}
                                        </td>
                                        <td className="border border-gray-900 p-1.5 font-medium">
                                            {getReceiptPayer(r)}
                                        </td>
                                        <td className="border border-gray-900 p-1.5 text-gray-700">
                                            {getReceiptPurpose(r)}
                                        </td>
                                        <td className="border border-gray-900 p-1.5 text-right font-mono font-medium">
                                            {formatCurrency(getReceiptAmount(r))}
                                        </td>
                                    </tr>
                                ))
                            )}
                            <tr className="bg-gray-50 font-bold border-t-2 border-gray-900">
                                <td colSpan="4" className="border border-gray-900 p-2 text-right">
                                    SUB-TOTAL COLLECTIONS:
                                </td>
                                <td className="border border-gray-900 p-2 text-right font-mono text-emerald-800">
                                    {formatCurrency(totalCollections)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section B: Remittances / Deposits to AGDB */}
                <div className="mb-6">
                    <div className="font-bold text-xs uppercase tracking-wide mb-1 text-gray-900">
                        B. REMITTANCES / DEPOSITS TO AGDB
                    </div>
                    <table className="w-full border-collapse border border-gray-900 text-xs font-sans">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-900">
                                <th className="border border-gray-900 p-2 text-left w-56">
                                    Reference / Validated Deposit Slip No.
                                </th>
                                <th className="border border-gray-900 p-2 text-left">
                                    Bank & Branch Name / Account No.
                                </th>
                                <th className="border border-gray-900 p-2 text-center w-28">Date</th>
                                <th className="border border-gray-900 p-2 text-right w-32">Amount (PHP)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-900 p-2 font-mono font-semibold">
                                    {rcdDepositRef}
                                </td>
                                <td className="border border-gray-900 p-2">
                                    {rcdBankName} ({rcdBankAccount})
                                </td>
                                <td className="border border-gray-900 p-2 text-center">
                                    {formatDate(new Date())}
                                </td>
                                <td className="border border-gray-900 p-2 text-right font-mono font-medium">
                                    {formatCurrency(totalCollections)}
                                </td>
                            </tr>
                            <tr className="bg-gray-50 font-bold border-t-2 border-gray-900">
                                <td colSpan="3" className="border border-gray-900 p-2 text-right">
                                    SUB-TOTAL REMITTANCES / DEPOSITS:
                                </td>
                                <td className="border border-gray-900 p-2 text-right font-mono text-blue-900">
                                    {formatCurrency(totalCollections)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section C: Accountability for Accountable Forms */}
                <div className="mb-6">
                    <div className="font-bold text-xs uppercase tracking-wide mb-1 text-gray-900">
                        C. ACCOUNTABILITY FOR ACCOUNTABLE FORMS
                    </div>
                    <table className="w-full border-collapse border border-gray-900 text-xs font-sans text-center">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-900">
                                <th rowSpan="2" className="border border-gray-900 p-2 text-left w-60">
                                    Name of Form & No.
                                </th>
                                <th colSpan="2" className="border border-gray-900 p-1.5">
                                    Beginning Balance
                                </th>
                                <th colSpan="2" className="border border-gray-900 p-1.5">
                                    Receipt of Stock
                                </th>
                                <th colSpan="2" className="border border-gray-900 p-1.5">
                                    Issued
                                </th>
                                <th colSpan="2" className="border border-gray-900 p-1.5">
                                    Ending Balance
                                </th>
                            </tr>
                            <tr className="bg-gray-50 border-b border-gray-900 text-[11px]">
                                <th className="border border-gray-900 p-1 w-12">Qty</th>
                                <th className="border border-gray-900 p-1">From - To</th>
                                <th className="border border-gray-900 p-1 w-12">Qty</th>
                                <th className="border border-gray-900 p-1">From - To</th>
                                <th className="border border-gray-900 p-1 w-12">Qty</th>
                                <th className="border border-gray-900 p-1">From - To</th>
                                <th className="border border-gray-900 p-1 w-12">Qty</th>
                                <th className="border border-gray-900 p-1">From - To</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-900 p-2 text-left font-medium">
                                    Official Receipts (General Form No. 25-A)
                                </td>
                                <td className="border border-gray-900 p-2">100</td>
                                <td className="border border-gray-900 p-2 font-mono">OR-0001 - OR-0100</td>
                                <td className="border border-gray-900 p-2">—</td>
                                <td className="border border-gray-900 p-2">—</td>
                                <td className="border border-gray-900 p-2 font-bold">{qtyIssued}</td>
                                <td className="border border-gray-900 p-2 font-mono">{`${firstOr} - ${lastOr}`}</td>
                                <td className="border border-gray-900 p-2 font-bold">{Math.max(100 - qtyIssued, 0)}</td>
                                <td className="border border-gray-900 p-2 font-mono">{`${lastOr} - OR-0100`}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section D: Summary of Accountability & Official Certification */}
                <div className="mb-6 font-sans">
                    <div className="font-bold text-xs uppercase tracking-wide mb-1 text-gray-900">
                        D. SUMMARY OF ACCOUNTABILITY & CERTIFICATION
                    </div>
                    <div className="border border-gray-900 p-3 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                            <span>Beginning Balance, Undeposited / Unremitted Collection:</span>
                            <span className="font-mono">{formatCurrency(numBeginningBalance)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Add: Total Collections (Section A):</span>
                            <span className="font-mono">{formatCurrency(totalCollections)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-b border-gray-300 py-1 text-blue-900">
                            <span>TOTAL ACCOUNTABILITY:</span>
                            <span className="font-mono">{formatCurrency(totalAccountability)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Less: Remittances / Deposits to AGDB (Section B):</span>
                            <span className="font-mono">{formatCurrency(totalCollections)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t-2 border-gray-900 pt-1 text-emerald-900">
                            <span>ENDING BALANCE, UNDEPOSITED / UNREMITTED COLLECTION:</span>
                            <span className="font-mono">{formatCurrency(endingBalance)}</span>
                        </div>
                    </div>
                </div>

                {/* Official Cashier Oath & Signatures */}
                <div className="mt-8 pt-4 border-t border-gray-400">
                    <p className="text-xs italic text-justify leading-relaxed mb-8 indent-8 font-serif">
                        I hereby certify on my official oath that the foregoing is a correct statement of all collections and deposits made by me during the period stated above, and that the accountability for accountable forms is true and correct.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center font-sans text-xs">
                        <div className="space-y-1">
                            <p className="font-bold text-gray-700 uppercase mb-8">CERTIFIED CORRECT BY:</p>
                            <p className="font-bold text-sm uppercase underline decoration-gray-900">{rcdOfficerName}</p>
                            <p className="text-gray-600">{rcdOfficerDesignation}</p>
                            <p className="text-gray-500 text-[11px]">Date: {formatDate(new Date())}</p>
                        </div>

                        <div className="space-y-1">
                            <p className="font-bold text-gray-700 uppercase mb-8">VERIFIED AND ACKNOWLEDGED BY:</p>
                            <p className="font-bold text-sm uppercase underline decoration-gray-900">{rcdAccountantName}</p>
                            <p className="text-gray-600">{rcdAccountantDesignation}</p>
                            <p className="text-gray-500 text-[11px]">Date: {formatDate(new Date())}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
