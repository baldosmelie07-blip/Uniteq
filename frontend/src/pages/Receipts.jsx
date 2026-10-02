import { useEffect, useState } from "react";

import {
    Receipt as ReceiptIcon,
    Search,
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

import axios from "axios";


const API_URL =
    "http://127.0.0.1:8000/api";


export default function Receipts() {

    const [receipts, setReceipts] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [search, setSearch] =
        useState("");

    const [selectedReceipt, setSelectedReceipt] =
        useState(null);

    const [showModal, setShowModal] =
        useState(false);

    const [editingReceipt, setEditingReceipt] =
        useState(null);


    const [form, setForm] = useState({
        date: "",
        payer_name: "",
        purpose: "",
        amount_due: "",
        amount_paid: "0",
        payment_method: "Cash",
        address_department: "",
        description: "",
    });


    /* =====================================================
       AUTHORIZATION
    ===================================================== */

    function getToken() {

        return localStorage.getItem(
            "uniteq_token"
        );
    }


    function getHeaders() {

        const token =
            getToken();

        return {
            Accept:
                "application/json",

            "Content-Type":
                "application/json",

            ...(token
                ? {
                      Authorization:
                          `Bearer ${token}`,
                  }
                : {}),
        };
    }


    /* =====================================================
       LOAD RECEIPTS
    ===================================================== */

    useEffect(() => {
        loadReceipts();
    }, []);


    async function loadReceipts() {

        try {

            setLoading(true);

            const response =
                await axios.get(
                    `${API_URL}/receipts`,
                    {
                        headers:
                            getHeaders(),
                    }
                );


            const data =
                Array.isArray(
                    response.data
                )
                    ? response.data
                    : response.data?.data ||
                      [];


            setReceipts(data);

        } catch (error) {

            console.error(
                "Error loading receipts:",
                error
            );


            if (
                error.response?.status ===
                401
            ) {

                alert(
                    "Your session has expired. Please log in again."
                );

            } else {

                alert(
                    "Unable to load official receipt records."
                );
            }


            setReceipts([]);

        } finally {

            setLoading(false);
        }
    }


    /* =====================================================
       HELPERS
    ===================================================== */

    function getReceiptNumber(
        receipt
    ) {

        return (
            receipt.receipt_number ||
            receipt.receipt_no ||
            `OR-${String(
                receipt.id
            ).padStart(4, "0")}`
        );
    }


    function getPayer(
        receipt
    ) {

        return (
            receipt.payer_name ||
            "—"
        );
    }


    function getPurpose(
        receipt
    ) {

        return (
            receipt.purpose ||
            "—"
        );
    }


    /*
     * DATABASE:
     *
     * original_amount = Amount Due
     * amount = Amount Paid
     */
    function getAmountDue(
        receipt
    ) {

        return Number(
            receipt.original_amount ??
            receipt.amount_due ??
            0
        );
    }


    function getAmountPaid(
        receipt
    ) {

        return Number(
            receipt.amount ??
            receipt.amount_paid ??
            0
        );
    }


    function getRemainingBalance(
        receipt
    ) {

        const databaseBalance =
            receipt.remaining_balance;


        if (
            databaseBalance !==
            undefined &&
            databaseBalance !== null
        ) {

            return Math.max(
                Number(
                    databaseBalance
                ),
                0
            );
        }


        return Math.max(
            getAmountDue(
                receipt
            ) -
                getAmountPaid(
                    receipt
                ),
            0
        );
    }


    /*
     * STATUS IS AUTOMATIC.
     *
     * We do not trust an old
     * status field in the database.
     */
    function getStatus(
        receipt
    ) {

        const due =
            getAmountDue(
                receipt
            );

        const paid =
            getAmountPaid(
                receipt
            );


        if (
            due > 0 &&
            paid >= due
        ) {

            return "Paid";
        }


        if (
            paid > 0 &&
            paid < due
        ) {

            return "Partially Paid";
        }


        return "Unpaid";
    }


    function formatCurrency(
        amount
    ) {

        return new Intl.NumberFormat(
            "en-PH",
            {
                style:
                    "currency",

                currency:
                    "PHP",
            }
        ).format(
            Number(amount) || 0
        );
    }


    function formatDate(
        value
    ) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";
        }


        return date.toLocaleDateString(
            "en-PH",
            {
                year:
                    "numeric",

                month:
                    "short",

                day:
                    "numeric",
            }
        );
    }


    function getStatusStyle(
        status
    ) {

        if (
            status === "Paid"
        ) {

            return (
                "bg-green-100 text-green-700"
            );
        }


        if (
            status ===
            "Partially Paid"
        ) {

            return (
                "bg-yellow-100 text-yellow-700"
            );
        }


        return (
            "bg-red-100 text-red-700"
        );
    }


    function getStatusIcon(
        status
    ) {

        if (
            status === "Paid"
        ) {

            return (
                <CheckCircle
                    size={15}
                />
            );
        }


        if (
            status ===
            "Partially Paid"
        ) {

            return (
                <Clock
                    size={15}
                />
            );
        }


        return (
            <AlertCircle
                size={15}
            />
        );
    }


    /* =====================================================
       SORT
    ===================================================== */

    const sortedReceipts =
        [...receipts].sort(
            (a, b) => {

                const numberA =
                    Number(
                        String(
                            getReceiptNumber(
                                a
                            )
                        ).match(
                            /\d+$/
                        )?.[0] || 0
                    );


                const numberB =
                    Number(
                        String(
                            getReceiptNumber(
                                b
                            )
                        ).match(
                            /\d+$/
                        )?.[0] || 0
                    );


                return (
                    numberB -
                    numberA
                );
            }
        );


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredReceipts =
        sortedReceipts.filter(
            (receipt) => {

                const searchText = `
                    ${getReceiptNumber(
                        receipt
                    )}

                    ${getPayer(
                        receipt
                    )}

                    ${getPurpose(
                        receipt
                    )}

                    ${
                        receipt.description ||
                        ""
                    }

                    ${
                        receipt.payment_method ||
                        ""
                    }

                    ${getStatus(
                        receipt
                    )}
                `.toLowerCase();


                return searchText.includes(
                    search.toLowerCase()
                );
            }
        );


    /* =====================================================
       ADD RECEIPT
    ===================================================== */

    function openAddModal() {

        setEditingReceipt(
            null
        );


        setForm({
            date:
                new Date()
                    .toISOString()
                    .split("T")[0],

            payer_name:
                "",

            purpose:
                "",

            amount_due:
                "",

            amount_paid:
                "0",

            payment_method:
                "Cash",

            address_department:
                "",

            description:
                "",
        });


        setShowModal(
            true
        );
    }


    /* =====================================================
       EDIT RECEIPT
    ===================================================== */

    function openEditModal(
        receipt
    ) {

        setEditingReceipt(
            receipt
        );


        setForm({
            date:
                receipt.date
                    ? String(
                          receipt.date
                      ).substring(
                          0,
                          10
                      )
                    : new Date()
                          .toISOString()
                          .split(
                              "T"
                          )[0],

            payer_name:
                receipt.payer_name ||
                "",

            purpose:
                receipt.purpose ||
                "",

            amount_due:
                receipt.original_amount ??
                receipt.amount_due ??
                receipt.amount ??
                "",

            amount_paid:
                receipt.amount ??
                receipt.amount_paid ??
                "0",

            payment_method:
                receipt.payment_method ||
                "Cash",

            address_department:
                receipt.address_department ||
                "",

            description:
                receipt.description ||
                "",
        });


        setShowModal(
            true
        );
    }


    /* =====================================================
       FORM CHANGE
    ===================================================== */

    function handleChange(
        e
    ) {

        const {
            name,
            value,
        } = e.target;


        setForm(
            (previous) => ({
                ...previous,
                [name]:
                    value,
            })
        );
    }


    /* =====================================================
       SAVE
    ===================================================== */

    async function handleSubmit(
        e
    ) {

        e.preventDefault();


        const amountDue =
            Number(
                form.amount_due
            );


        const amountPaid =
            Number(
                form.amount_paid || 0
            );


        if (
            !form.payer_name.trim()
        ) {

            alert(
                "Please enter the payer name."
            );

            return;
        }


        if (
            !form.purpose.trim()
        ) {

            alert(
                "Please enter the fee type or purpose."
            );

            return;
        }


        if (
            form.amount_due ===
                "" ||
            Number.isNaN(
                amountDue
            ) ||
            amountDue < 0
        ) {

            alert(
                "Please enter a valid amount due."
            );

            return;
        }


        if (
            Number.isNaN(
                amountPaid
            ) ||
            amountPaid < 0
        ) {

            alert(
                "Please enter a valid amount paid."
            );

            return;
        }


        if (
            amountPaid >
            amountDue
        ) {

            alert(
                "Amount paid cannot be greater than the amount due."
            );

            return;
        }


        try {

            setSaving(
                true
            );


            /*
             * IMPORTANT:
             *
             * Send BOTH frontend-friendly
             * and database-compatible names.
             *
             * Laravel will use:
             *
             * amount_due
             * amount_paid
             */
            const payload = {

                date:
                    form.date,

                payer_name:
                    form.payer_name.trim(),

                purpose:
                    form.purpose.trim(),

                amount_due:
                    amountDue,

                amount_paid:
                    amountPaid,

                payment_method:
                    form.payment_method,

                address_department:
                    form.address_department.trim(),

                description:
                    form.description.trim(),
            };


            if (
                editingReceipt
            ) {

                await axios.put(
                    `${API_URL}/receipts/${editingReceipt.id}`,
                    payload,
                    {
                        headers:
                            getHeaders(),
                    }
                );

                alert(
                    "Receipt updated successfully."
                );

            } else {

                await axios.post(
                    `${API_URL}/receipts`,
                    payload,
                    {
                        headers:
                            getHeaders(),
                    }
                );

                alert(
                    "Receipt created successfully."
                );
            }


            setShowModal(
                false
            );

            setEditingReceipt(
                null
            );


            await loadReceipts();

        } catch (error) {

            console.error(
                "Error saving receipt:",
                error
            );


            console.error(
                "Server response:",
                error.response?.data
            );


            if (
                error.response?.status ===
                422
            ) {

                const errors =
                    error.response
                        ?.data
                        ?.errors;


                if (errors) {

                    const firstError =
                        Object.values(
                            errors
                        )
                            .flat()[0];


                    alert(
                        firstError
                    );

                } else {

                    alert(
                        error.response
                            ?.data
                            ?.message ||
                            "Please check the information entered."
                    );
                }

            } else if (
                error.response?.status ===
                401
            ) {

                alert(
                    "Your session has expired. Please log in again."
                );

            } else if (
                error.response?.status ===
                403
            ) {

                alert(
                    "You are not authorized to manage receipts."
                );

            } else {

                alert(
                    "Unable to save the receipt."
                );
            }

        } finally {

            setSaving(
                false
            );
        }
    }


    /* =====================================================
       MARK AS PAID
    ===================================================== */

    async function markAsPaid(
        receipt
    ) {

        const due =
            getAmountDue(
                receipt
            );


        if (due <= 0) {

            alert(
                "This receipt has no amount due."
            );

            return;
        }


        const currentStatus =
            getStatus(
                receipt
            );


        if (
            currentStatus ===
            "Paid"
        ) {

            alert(
                "This receipt is already paid."
            );

            return;
        }


        const confirmed =
            window.confirm(
                `Mark ${getReceiptNumber(
                    receipt
                )} as fully paid?\n\nAmount Due: ${formatCurrency(
                    due
                )}\nCurrent Paid: ${formatCurrency(
                    getAmountPaid(
                        receipt
                    )
                )}`
            );


        if (!confirmed) {
            return;
        }


        try {

            setSaving(
                true
            );


            /*
             * We use the UPDATE endpoint.
             *
             * This sends the complete receipt,
             * so Laravel always receives
             * amount_due and amount_paid.
             */
            const payload = {

                date:
                    receipt.date
                        ? String(
                              receipt.date
                          ).substring(
                              0,
                              10
                          )
                        : new Date()
                              .toISOString()
                              .split(
                                  "T"
                              )[0],

                payer_name:
                    receipt.payer_name ||
                    "",

                purpose:
                    receipt.purpose ||
                    "",

                amount_due:
                    due,

                amount_paid:
                    due,

                payment_method:
                    receipt.payment_method ||
                    "Cash",

                address_department:
                    receipt.address_department ||
                    "",

                description:
                    receipt.description ||
                    "",
            };


            await axios.put(
                `${API_URL}/receipts/${receipt.id}`,
                payload,
                {
                    headers:
                        getHeaders(),
                }
            );


            alert(
                "Receipt marked as Paid successfully."
            );


            await loadReceipts();


            /*
             * Refresh the selected
             * receipt if it was open.
             */
            setSelectedReceipt(
                null
            );

        } catch (error) {

            console.error(
                "Error marking receipt as paid:",
                error
            );


            const errors =
                error.response
                    ?.data
                    ?.errors;


            if (errors) {

                const firstError =
                    Object.values(
                        errors
                    )
                        .flat()[0];


                alert(
                    firstError
                );

            } else {

                alert(
                    error.response
                        ?.data
                        ?.message ||
                    "Unable to mark receipt as paid."
                );
            }

        } finally {

            setSaving(
                false
            );
        }
    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    const totalReceipts =
        receipts.length;


    const totalDue =
        receipts.reduce(
            (
                total,
                receipt
            ) =>
                total +
                getAmountDue(
                    receipt
                ),
            0
        );


    const totalPaid =
        receipts.reduce(
            (
                total,
                receipt
            ) =>
                total +
                getAmountPaid(
                    receipt
                ),
            0
        );


    const totalBalance =
        receipts.reduce(
            (
                total,
                receipt
            ) =>
                total +
                getRemainingBalance(
                    receipt
                ),
            0
        );


    const paidCount =
        receipts.filter(
            (receipt) =>
                getStatus(
                    receipt
                ) === "Paid"
        ).length;


    const partialCount =
        receipts.filter(
            (receipt) =>
                getStatus(
                    receipt
                ) ===
                "Partially Paid"
        ).length;


    const unpaidCount =
        receipts.filter(
            (receipt) =>
                getStatus(
                    receipt
                ) === "Unpaid"
        ).length;


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="space-y-6">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="bg-[#102d55] rounded-2xl px-7 py-6 text-white shadow-lg relative overflow-hidden">

                <div className="absolute right-0 top-0 w-64 h-64 border border-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />

                <div className="absolute right-24 bottom-[-100px] w-56 h-56 border border-white/10 rounded-full" />

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                    <div className="flex items-center gap-4">

                        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md">

                            <ReceiptIcon
                                size={29}
                                className="text-[#102d55]"
                            />

                        </div>

                        <div>

                            <p className="text-sm text-blue-100">
                                University of Abra | Main Campus
                                <br />
                                Cashier's Unit
                            </p>

                            <h1 className="text-3xl font-bold">
                                Official Receipts
                            </h1>

                        </div>

                    </div>


                    <button
                        onClick={
                            loadReceipts
                        }
                        disabled={
                            loading
                        }
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 border-2 border-white rounded-xl font-semibold hover:bg-white hover:text-[#102d55] transition disabled:opacity-60"
                    >

                        <RefreshCw
                            size={17}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />

                        Refresh

                    </button>

                </div>

            </div>


            {/* =================================================
                SUMMARY
            ================================================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

                    <p className="text-sm text-gray-500">
                        Total Receipts
                    </p>

                    <h2 className="text-3xl font-bold text-[#102d55] mt-2">
                        {totalReceipts}
                    </h2>

                </div>


                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

                    <p className="text-sm text-gray-500">
                        Amount Due
                    </p>

                    <h2 className="text-xl font-bold text-[#102d55] mt-2">
                        {formatCurrency(
                            totalDue
                        )}
                    </h2>

                </div>


                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

                    <p className="text-sm text-gray-500">
                        Amount Paid
                    </p>

                    <h2 className="text-xl font-bold text-green-600 mt-2">
                        {formatCurrency(
                            totalPaid
                        )}
                    </h2>

                </div>


                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

                    <p className="text-sm text-gray-500">
                        Remaining
                    </p>

                    <h2 className="text-xl font-bold text-red-600 mt-2">
                        {formatCurrency(
                            totalBalance
                        )}
                    </h2>

                </div>


                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">

                    <p className="text-sm text-gray-500">
                        Payment Status
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">

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


            {/* =================================================
                RECEIPT PORTAL
            ================================================= */}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                <div className="p-6 border-b border-gray-200">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        <div className="flex items-center gap-3">

                            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">

                                <ReceiptIcon
                                    size={22}
                                    className="text-[#102d55]"
                                />

                            </div>

                            <div>

                                <h2 className="text-xl font-bold text-gray-900">
                                    Receipt Portal
                                </h2>

                                <p className="text-sm text-gray-500">
                                    Create, update, and monitor official receipt transactions.
                                </p>

                            </div>

                        </div>


                        <button
                            onClick={
                                openAddModal
                            }
                            className="inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition"
                        >

                            <Plus
                                size={19}
                            />

                            Add New Receipt

                        </button>

                    </div>


                    {/* SEARCH */}

                    <div className="relative mt-6 max-w-xl">

                        <Search
                            size={19}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            value={
                                search
                            }
                            onChange={(e) =>
                                setSearch(
                                    e.target.value
                                )
                            }
                            placeholder="Search receipt number, payer, purpose..."
                            className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] focus:border-[#0797a6]"
                        />

                    </div>

                </div>


                {/* =================================================
                    TABLE
                ================================================= */}

                <div className="overflow-x-auto">

                    <table className="w-full min-w-[1200px]">

                        <thead className="bg-[#eef4f8]">

                            <tr>

                                <th className="text-left px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Receipt No.
                                </th>

                                <th className="text-left px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Date
                                </th>

                                <th className="text-left px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Payer
                                </th>

                                <th className="text-left px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Fee Type
                                </th>

                                <th className="text-right px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Amount Due
                                </th>

                                <th className="text-right px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Amount Paid
                                </th>

                                <th className="text-center px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Status
                                </th>

                                <th className="text-center px-5 py-4 text-xs font-bold text-gray-600 uppercase">
                                    Action
                                </th>

                            </tr>

                        </thead>


                        <tbody className="divide-y divide-gray-100">

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="8"
                                        className="text-center py-14 text-gray-500"
                                    >

                                        <RefreshCw
                                            size={25}
                                            className="animate-spin mx-auto mb-3"
                                        />

                                        Loading official receipts...

                                    </td>

                                </tr>

                            ) : filteredReceipts.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="8"
                                        className="text-center py-14 text-gray-500"
                                    >

                                        No official receipts found.

                                    </td>

                                </tr>

                            ) : (

                                filteredReceipts.map(
                                    (receipt) => {

                                        const status =
                                            getStatus(
                                                receipt
                                            );

                                        const balance =
                                            getRemainingBalance(
                                                receipt
                                            );

                                        return (

                                            <tr
                                                key={
                                                    receipt.id
                                                }
                                                className="hover:bg-blue-50/40 transition"
                                            >

                                                {/* RECEIPT NUMBER */}

                                                <td className="px-5 py-5">

                                                    <span className="font-bold text-[#102d55]">
                                                        {getReceiptNumber(
                                                            receipt
                                                        )}
                                                    </span>

                                                </td>


                                                {/* DATE */}

                                                <td className="px-5 py-5 text-sm text-gray-600">

                                                    <div className="flex items-center gap-2">

                                                        <CalendarDays
                                                            size={
                                                                16
                                                            }
                                                            className="text-gray-400"
                                                        />

                                                        {formatDate(
                                                            receipt.date ||
                                                            receipt.created_at
                                                        )}

                                                    </div>

                                                </td>


                                                {/* PAYER */}

                                                <td className="px-5 py-5">

                                                    <div className="flex items-center gap-3">

                                                        <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">

                                                            <User
                                                                size={
                                                                    17
                                                                }
                                                                className="text-cyan-600"
                                                            />

                                                        </div>

                                                        <div>

                                                            <p className="font-semibold text-gray-900">
                                                                {getPayer(
                                                                    receipt
                                                                )}
                                                            </p>

                                                            {receipt.address_department && (

                                                                <p className="text-xs text-gray-500">
                                                                    {
                                                                        receipt.address_department
                                                                    }
                                                                </p>

                                                            )}

                                                        </div>

                                                    </div>

                                                </td>


                                                {/* PURPOSE */}

                                                <td className="px-5 py-5">

                                                    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">

                                                        <FileText
                                                            size={
                                                                14
                                                            }
                                                        />

                                                        {getPurpose(
                                                            receipt
                                                        )}

                                                    </span>

                                                </td>


                                                {/* AMOUNT DUE */}

                                                <td className="px-5 py-5 text-right font-semibold text-gray-900">

                                                    {formatCurrency(
                                                        getAmountDue(
                                                            receipt
                                                        )
                                                    )}

                                                </td>


                                                {/* AMOUNT PAID */}

                                                <td className="px-5 py-5 text-right font-bold text-gray-900">

                                                    {formatCurrency(
                                                        getAmountPaid(
                                                            receipt
                                                        )
                                                    )}

                                                </td>


                                                {/* STATUS */}

                                                <td className="px-5 py-5 text-center">

                                                    <span
                                                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold ${getStatusStyle(
                                                            status
                                                        )}`}
                                                    >

                                                        {getStatusIcon(
                                                            status
                                                        )}

                                                        {status}

                                                    </span>

                                                </td>


                                                {/* ACTION */}

                                                <td className="px-5 py-5">

                                                    <div className="flex items-center justify-center gap-2 flex-wrap">

                                                        <button
                                                            onClick={() =>
                                                                setSelectedReceipt(
                                                                    receipt
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 text-[#007c8b] font-semibold hover:text-[#005b66]"
                                                        >

                                                            <Eye
                                                                size={
                                                                    16
                                                                }
                                                            />

                                                            View

                                                        </button>


                                                        <button
                                                            onClick={() =>
                                                                openEditModal(
                                                                    receipt
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 text-blue-700 font-semibold hover:text-blue-900"
                                                        >

                                                            <Pencil
                                                                size={
                                                                    15
                                                                }
                                                            />

                                                            Edit

                                                        </button>


                                                        {status !==
                                                            "Paid" &&
                                                            balance >
                                                                0 && (

                                                                <button
                                                                    onClick={() =>
                                                                        markAsPaid(
                                                                            receipt
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                    className="inline-flex items-center gap-1.5 text-green-700 font-semibold hover:text-green-900 disabled:opacity-50"
                                                                >

                                                                    <CheckCircle
                                                                        size={
                                                                            16
                                                                        }
                                                                    />

                                                                    Paid

                                                                </button>

                                                            )}

                                                    </div>

                                                </td>

                                            </tr>

                                        );
                                    }
                                )

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showModal && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

                        {/* HEADER */}

                        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-5 border-b z-10">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Official Receipt
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">

                                    {editingReceipt
                                        ? "Update Receipt"
                                        : "Add New Receipt"}

                                </h2>

                            </div>


                            <button
                                onClick={() =>
                                    setShowModal(
                                        false
                                    )
                                }
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >

                                <X
                                    size={22}
                                />

                            </button>

                        </div>


                        {/* FORM */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="p-6 space-y-6"
                        >

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* DATE */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Date
                                    </label>

                                    <input
                                        type="date"
                                        name="date"
                                        value={
                                            form.date
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>


                                {/* PAYER */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Payer Name
                                    </label>

                                    <input
                                        type="text"
                                        name="payer_name"
                                        value={
                                            form.payer_name
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter payer name"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>


                                {/* PURPOSE */}

                                <div className="md:col-span-2">

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Fee Type / Purpose
                                    </label>

                                    <input
                                        type="text"
                                        name="purpose"
                                        value={
                                            form.purpose
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Tuition Fee, Certificate of Enrollment, Miscellaneous Fee"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>


                                {/* AMOUNT DUE */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Amount Due
                                    </label>

                                    <div className="relative">

                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                                            ₱
                                        </span>

                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            name="amount_due"
                                            value={
                                                form.amount_due
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="0.00"
                                            required
                                            className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                        />

                                    </div>

                                </div>


                                {/* AMOUNT PAID */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Amount Paid
                                    </label>

                                    <div className="relative">

                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">
                                            ₱
                                        </span>

                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            name="amount_paid"
                                            value={
                                                form.amount_paid
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="0.00"
                                            className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                        />

                                    </div>

                                </div>


                                {/* PAYMENT METHOD */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Payment Method
                                    </label>

                                    <select
                                        name="payment_method"
                                        value={
                                            form.payment_method
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    >

                                        <option value="Cash">
                                            Cash
                                        </option>
                                                                       
                                        <option value="Check">
                                            Check
                                        </option>

                                    </select>

                                </div>


                                {/* ADDRESS */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Address / Department
                                    </label>

                                    <input
                                        type="text"
                                        name="address_department"
                                        value={
                                            form.address_department
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. BSIT Department"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>


                                {/* DESCRIPTION */}

                                <div className="md:col-span-2">

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Description
                                    </label>

                                    <textarea
                                        name="description"
                                        value={
                                            form.description
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        rows="4"
                                        placeholder="Additional details about the transaction..."
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] resize-none"
                                    />

                                </div>

                            </div>


                            {/* =================================================
                                PAYMENT PREVIEW
                            ================================================= */}

                            <div className="bg-[#eef7f8] rounded-xl p-5 border border-[#d7eeee]">

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                                    <div>

                                        <p className="text-xs text-gray-500 uppercase">
                                            Amount Due
                                        </p>

                                        <p className="text-xl font-bold text-[#102d55] mt-1">
                                            {formatCurrency(
                                                Number(
                                                    form.amount_due ||
                                                        0
                                                )
                                            )}
                                        </p>

                                    </div>


                                    <div>

                                        <p className="text-xs text-gray-500 uppercase">
                                            Amount Paid
                                        </p>

                                        <p className="text-xl font-bold text-green-700 mt-1">
                                            {formatCurrency(
                                                Number(
                                                    form.amount_paid ||
                                                        0
                                                )
                                            )}
                                        </p>

                                    </div>


                                    <div>

                                        <p className="text-xs text-gray-500 uppercase">
                                            Remaining Balance
                                        </p>

                                        <p className="text-xl font-bold text-red-600 mt-1">
                                            {formatCurrency(
                                                Math.max(
                                                    Number(
                                                        form.amount_due ||
                                                            0
                                                    ) -
                                                        Number(
                                                            form.amount_paid ||
                                                                0
                                                        ),
                                                    0
                                                )
                                            )}
                                        </p>

                                    </div>

                                </div>


                                <div className="mt-5 pt-4 border-t border-[#d7eeee] flex items-center gap-2">

                                    <CreditCard
                                        size={
                                            18
                                        }
                                        className="text-[#0797a6]"
                                    />

                                    <span className="text-sm font-semibold text-gray-700">

                                        Payment Status:

                                    </span>


                                    {(() => {

                                        const due =
                                            Number(
                                                form.amount_due ||
                                                    0
                                            );

                                        const paid =
                                            Number(
                                                form.amount_paid ||
                                                    0
                                            );

                                        let status =
                                            "Unpaid";

                                        if (
                                            due >
                                                0 &&
                                            paid >=
                                                due
                                        ) {

                                            status =
                                                "Paid";

                                        } else if (
                                            paid >
                                                0 &&
                                            paid <
                                                due
                                        ) {

                                            status =
                                                "Partially Paid";
                                        }


                                        return (

                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(
                                                    status
                                                )}`}
                                            >

                                                {status}

                                            </span>

                                        );

                                    })()}

                                </div>

                            </div>


                            {/* BUTTONS */}

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowModal(
                                            false
                                        )
                                    }
                                    className="px-5 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="px-6 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold disabled:opacity-50"
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

                </div>

            )}


            {/* =================================================
                VIEW RECEIPT MODAL
            ================================================= */}

            {selectedReceipt && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

                        {/* HEADER */}

                        <div className="flex items-center justify-between p-6 border-b">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Official Receipt
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getReceiptNumber(
                                        selectedReceipt
                                    )}
                                </h2>

                            </div>


                            <button
                                onClick={() =>
                                    setSelectedReceipt(
                                        null
                                    )
                                }
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >

                                <X
                                    size={22}
                                />

                            </button>

                        </div>


                        {/* DETAILS */}

                        <div className="p-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Date
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {formatDate(
                                            selectedReceipt.date ||
                                                selectedReceipt.created_at
                                        )}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Payer
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {getPayer(
                                            selectedReceipt
                                        )}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Fee Type / Purpose
                                    </p>

                                    <p className="font-semibold text-blue-700 mt-1">
                                        {getPurpose(
                                            selectedReceipt
                                        )}
                                    </p>

                                </div>


                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Payment Method
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {selectedReceipt.payment_method ||
                                            "Cash"}
                                    </p>

                                </div>

                            </div>


                            {/* FINANCIAL INFORMATION */}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <div className="bg-gray-50 rounded-xl p-4">

                                    <p className="text-xs text-gray-500">
                                        Amount Due
                                    </p>

                                    <p className="text-lg font-bold mt-1">
                                        {formatCurrency(
                                            getAmountDue(
                                                selectedReceipt
                                            )
                                        )}
                                    </p>

                                </div>


                                <div className="bg-green-50 rounded-xl p-4">

                                    <p className="text-xs text-green-700">
                                        Amount Paid
                                    </p>

                                    <p className="text-lg font-bold text-green-700 mt-1">
                                        {formatCurrency(
                                            getAmountPaid(
                                                selectedReceipt
                                            )
                                        )}
                                    </p>

                                </div>


                                <div className="bg-red-50 rounded-xl p-4">

                                    <p className="text-xs text-red-700">
                                        Remaining Balance
                                    </p>

                                    <p className="text-lg font-bold text-red-700 mt-1">
                                        {formatCurrency(
                                            getRemainingBalance(
                                                selectedReceipt
                                            )
                                        )}
                                    </p>

                                </div>

                            </div>


                            {/* STATUS */}

                            <div>

                                <p className="text-xs uppercase text-gray-500 mb-2">
                                    Payment Status
                                </p>

                                <span
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${getStatusStyle(
                                        getStatus(
                                            selectedReceipt
                                        )
                                    )}`}
                                >

                                    {getStatusIcon(
                                        getStatus(
                                            selectedReceipt
                                        )
                                    )}

                                    {getStatus(
                                        selectedReceipt
                                    )}

                                </span>

                            </div>


                            {/* BALANCE */}

                            {getRemainingBalance(
                                selectedReceipt
                            ) > 0 && (

                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">

                                    <Wallet
                                        size={
                                            20
                                        }
                                        className="text-yellow-700 mt-0.5"
                                    />

                                    <div>

                                        <p className="font-bold text-yellow-800">
                                            Outstanding Balance
                                        </p>

                                        <p className="text-sm text-yellow-700 mt-1">
                                            This receipt still has a balance of{" "}
                                            <strong>
                                                {formatCurrency(
                                                    getRemainingBalance(
                                                        selectedReceipt
                                                    )
                                                )}
                                            </strong>
                                            .
                                        </p>

                                    </div>

                                </div>

                            )}


                            {/* ADDRESS */}

                            <div>

                                <p className="text-xs uppercase text-gray-500">
                                    Address / Department
                                </p>

                                <p className="font-semibold mt-1">
                                    {selectedReceipt.address_department ||
                                        "—"}
                                </p>

                            </div>


                            {/* DESCRIPTION */}

                            <div>

                                <p className="text-xs uppercase text-gray-500 mb-2">
                                    Description
                                </p>

                                <div className="bg-gray-50 rounded-xl p-4 text-gray-700">
                                    {selectedReceipt.description ||
                                        "No description provided."}
                                </div>

                            </div>

                        </div>


                        {/* FOOTER */}

                        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 p-6 border-t">

                            {getStatus(
                                selectedReceipt
                            ) !== "Paid" && (

                                <button
                                    onClick={() =>
                                        markAsPaid(
                                            selectedReceipt
                                        )
                                    }
                                    disabled={
                                        saving
                                    }
                                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
                                >

                                    <CheckCircle
                                        size={
                                            17
                                        }
                                    />

                                    Mark as Paid

                                </button>

                            )}


                            <button
                                onClick={() => {

                                    const receipt =
                                        selectedReceipt;

                                    setSelectedReceipt(
                                        null
                                    );

                                    openEditModal(
                                        receipt
                                    );

                                }}
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-800"
                            >

                                <Pencil
                                    size={
                                        17
                                    }
                                />

                                Edit Receipt

                            </button>


                            <button
                                onClick={() =>
                                    setSelectedReceipt(
                                        null
                                    )
                                }
                                className="px-5 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
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