import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    Eye,
    Edit,
    X,
    RefreshCw,
    Receipt,
    Wallet,
    CalendarDays,
    User,
    FileText,
    CreditCard,
    Hash,
    Save,
} from "lucide-react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/receipts";

/* =========================================================
   DATE
========================================================= */

function getToday() {
    return new Date().toISOString().split("T")[0];
}

/* =========================================================
   HEADERS
========================================================= */

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

/* =========================================================
   COMPONENT
========================================================= */

export default function Collections() {
    const [collections, setCollections] = useState([]);

    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [selectedCollection, setSelectedCollection] =
        useState(null);

    const [editingCollection, setEditingCollection] =
        useState(null);

    const [showAddModal, setShowAddModal] =
        useState(false);

    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        date: getToday(),
        purpose: "",
        payer_name: "",
        address_department: "",
        original_amount: "",
        amount: "",
        payment_method: "Cash",
        description: "",
    });

    /* =========================================================
       LOAD COLLECTIONS
    ========================================================= */

    useEffect(() => {
        loadCollections();
    }, []);

    async function loadCollections() {
        try {
            setLoading(true);

            const response = await axios.get(
                API_URL,
                {
                    headers: getHeaders(),
                }
            );

            console.log(
                "Collections response:",
                response.data
            );

            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.data || [];

            setCollections(data);
        } catch (error) {
            console.error(
                "Collection loading error:",
                error
            );

            console.error(
                "Server response:",
                error.response?.data
            );

            setCollections([]);

            if (error.response?.status === 401) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (
                error.response?.status === 403
            ) {
                alert(
                    "You are not authorized to view collection records."
                );
            } else {
                alert(
                    error.response?.data?.message ||
                        "Unable to load collection records."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    /* =========================================================
       HELPERS
    ========================================================= */

    function getReceiptNumber(collection) {
        return (
            collection.receipt_number ||
            collection.receipt_no ||
            `OR-${String(
                collection.id || 0
            ).padStart(4, "0")}`
        );
    }

    function getPayer(collection) {
        return collection.payer_name || "—";
    }

    function getPurpose(collection) {
        return collection.purpose || "—";
    }

    function getAmountCollected(collection) {
        return Number(
            collection.amount_paid ??
                collection.amount ??
                0
        );
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat(
            "en-PH",
            {
                style: "currency",
                currency: "PHP",
            }
        ).format(
            Number(amount) || 0
        );
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        const date = new Date(value);

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
                year: "numeric",
                month: "short",
                day: "numeric",
            }
        );
    }

    /* =========================================================
       SORT
    ========================================================= */

    const sortedCollections =
        useMemo(() => {
            return [
                ...collections,
            ].sort((a, b) => {
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
                    numberA -
                    numberB
                );
            });
        }, [collections]);

    /* =========================================================
       SEARCH
    ========================================================= */

    const filteredCollections =
        sortedCollections.filter(
            (collection) => {
                const text = `
                    ${getReceiptNumber(
                        collection
                    )}
                    ${getPayer(
                        collection
                    )}
                    ${getPurpose(
                        collection
                    )}
                    ${
                        collection.description ||
                        ""
                    }
                    ${
                        collection.payment_method ||
                        ""
                    }
                    ${
                        collection.address_department ||
                        ""
                    }
                `.toLowerCase();

                return text.includes(
                    search.toLowerCase()
                );
            }
        );

    /* =========================================================
       RESET FORM
    ========================================================= */

    function resetForm() {
        setForm({
            date: getToday(),
            purpose: "",
            payer_name: "",
            address_department: "",
            original_amount: "",
            amount: "",
            payment_method: "Cash",
            description: "",
        });
    }

    /* =========================================================
       OPEN ADD MODAL
    ========================================================= */

    function openAddModal() {
        resetForm();
        setShowAddModal(true);
    }

    /* =========================================================
       OPEN UPDATE MODAL
    ========================================================= */

    function openEditModal(collection) {
        setEditingCollection(collection);

        setForm({
            date:
                String(
                    collection.date ||
                        getToday()
                ).substring(
                    0,
                    10
                ),

            purpose:
                collection.purpose ||
                "",

            payer_name:
                collection.payer_name ||
                "",

            address_department:
                collection.address_department ||
                "",

            original_amount:
                collection.original_amount ??
                collection.amount ??
                "",

            amount:
                collection.amount ??
                collection.amount_paid ??
                "",

            payment_method:
                collection.payment_method ||
                "Cash",

            description:
                collection.description ||
                "",
        });
    }

    /* =========================================================
       FORM CHANGE
    ========================================================= */

    function handleChange(e) {
        const {
            name,
            value,
        } = e.target;

        setForm(
            (previous) => ({
                ...previous,
                [name]: value,
            })
        );
    }

    /* =========================================================
       VALIDATE FORM
    ========================================================= */

    function validateForm() {
        if (!form.date) {
            alert(
                "Please select the collection date."
            );
            return false;
        }

        if (!form.purpose.trim()) {
            alert(
                "Please enter the purpose of collection."
            );
            return false;
        }

        if (!form.payer_name.trim()) {
            alert(
                "Please enter the payer name."
            );
            return false;
        }

        if (
            form.amount === "" ||
            Number(form.amount) <= 0
        ) {
            alert(
                "Please enter a valid amount collected."
            );
            return false;
        }

        return true;
    }

    /* =========================================================
       ADD COLLECTION
    ========================================================= */

    async function handleSubmit(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const amountCollected =
            Number(form.amount);

        try {
            setSaving(true);

            /*
             * The current Laravel ReceiptController
             * uses original_amount and amount.
             *
             * Since this page records an actual
             * collection, we treat the collected
             * amount as the transaction amount.
             */

            const payload = {
                date: form.date,

                purpose:
                    form.purpose.trim(),

                payer_name:
                    form.payer_name.trim(),

                address_department:
                    form.address_department.trim(),

                original_amount:
                    amountCollected,

                amount:
                    amountCollected,

                payment_method:
                    form.payment_method,

                description:
                    form.description.trim(),
            };

            console.log(
                "Collection payload:",
                payload
            );

            const response =
                await axios.post(
                    API_URL,
                    payload,
                    {
                        headers:
                            getHeaders(),
                    }
                );

            console.log(
                "Collection saved:",
                response.data
            );

            alert(
                "Collection recorded successfully."
            );

            setShowAddModal(false);

            resetForm();

            await loadCollections();
        } catch (error) {
            console.error(
                "Collection save error:",
                error
            );

            console.error(
                "Server response:",
                error.response?.data
            );

            const status =
                error.response?.status;

            const data =
                error.response?.data;

            if (status === 422) {
                if (data?.errors) {
                    const messages =
                        Object.values(
                            data.errors
                        )
                            .flat()
                            .join(
                                "\n"
                            );

                    alert(
                        messages
                    );
                } else {
                    alert(
                        data?.message ||
                            "Please check the information entered."
                    );
                }
            } else if (
                status === 401
            ) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (
                status === 403
            ) {
                alert(
                    "You are not authorized to record collections."
                );
            } else {
                alert(
                    data?.message ||
                        "Something went wrong while saving the collection."
                );
            }
        } finally {
            setSaving(false);
        }
    }

    /* =========================================================
       UPDATE COLLECTION
    ========================================================= */

    async function handleUpdate(e) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        if (!editingCollection?.id) {
            alert(
                "Unable to identify the collection record."
            );
            return;
        }

        const amountCollected =
            Number(form.amount);

        try {
            setSaving(true);

            const payload = {
                date: form.date,

                purpose:
                    form.purpose.trim(),

                payer_name:
                    form.payer_name.trim(),

                address_department:
                    form.address_department.trim(),

                original_amount:
                    amountCollected,

                amount:
                    amountCollected,

                payment_method:
                    form.payment_method,

                description:
                    form.description.trim(),
            };

            console.log(
                "Updating collection:",
                editingCollection.id
            );

            console.log(
                "Update payload:",
                payload
            );

            const response =
                await axios.put(
                    `${API_URL}/${editingCollection.id}`,
                    payload,
                    {
                        headers:
                            getHeaders(),
                    }
                );

            console.log(
                "Collection updated:",
                response.data
            );

            alert(
                "Collection updated successfully."
            );

            setEditingCollection(null);

            resetForm();

            await loadCollections();
        } catch (error) {
            console.error(
                "Collection update error:",
                error
            );

            console.error(
                "Server response:",
                error.response?.data
            );

            const status =
                error.response?.status;

            const data =
                error.response?.data;

            if (status === 422) {
                if (data?.errors) {
                    const messages =
                        Object.values(
                            data.errors
                        )
                            .flat()
                            .join(
                                "\n"
                            );

                    alert(
                        messages
                    );
                } else {
                    alert(
                        data?.message ||
                            "Please check the information entered."
                    );
                }
            } else if (
                status === 401
            ) {
                alert(
                    "Your session has expired. Please log in again."
                );
            } else if (
                status === 403
            ) {
                alert(
                    "You are not authorized to update collections."
                );
            } else if (
                status === 404
            ) {
                alert(
                    "Collection record was not found."
                );
            } else {
                alert(
                    data?.message ||
                        "Something went wrong while updating the collection."
                );
            }
        } finally {
            setSaving(false);
        }
    }

    /* =========================================================
       SUMMARY
    ========================================================= */

    const totalCollection =
        collections.reduce(
            (
                total,
                collection
            ) =>
                total +
                getAmountCollected(
                    collection
                ),
            0
        );

    const todaysCollection =
        collections.reduce(
            (
                total,
                collection
            ) => {
                const collectionDate =
                    String(
                        collection.date ||
                            ""
                    ).substring(
                        0,
                        10
                    );

                if (
                    collectionDate ===
                    getToday()
                ) {
                    return (
                        total +
                        getAmountCollected(
                            collection
                        )
                    );
                }

                return total;
            },
            0
        );

    const totalRecords =
        collections.length;

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div className="min-h-screen bg-[#f5f7fa]">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="bg-[#102d55] text-white">

                <div className="max-w-[1500px] mx-auto px-6 py-7">

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                        <div className="flex items-center gap-5">

                            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">

                                <Wallet
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
                                    Collections
                                </h1>

                                <p className="text-blue-100 mt-2">
                                    Record and monitor payments collected by the Cashier's Unit.
                                </p>

                            </div>

                        </div>

                        <button
                            type="button"
                            onClick={
                                loadCollections
                            }
                            disabled={
                                loading
                            }
                            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-white/80 hover:bg-white hover:text-[#102d55] transition font-semibold"
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

                    </div>

                </div>

            </div>

            {/* =================================================
                MAIN
            ================================================= */}

            <main className="max-w-[1500px] mx-auto px-6 py-8 space-y-7">

                {/* =================================================
                    SUMMARY
                ================================================= */}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Total Collections
                                </p>

                                <h2 className="text-2xl font-bold text-green-600 mt-2">
                                    {formatCurrency(
                                        totalCollection
                                    )}
                                </h2>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">

                                <Wallet
                                    size={24}
                                    className="text-green-600"
                                />

                            </div>

                        </div>

                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Today's Collections
                                </p>

                                <h2 className="text-2xl font-bold text-[#0797a6] mt-2">
                                    {formatCurrency(
                                        todaysCollection
                                    )}
                                </h2>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">

                                <CalendarDays
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
                                    Collection Records
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55] mt-2">
                                    {totalRecords}
                                </h2>

                            </div>

                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                <Receipt
                                    size={24}
                                    className="text-[#102d55]"
                                />

                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    COLLECTION PORTAL
                ================================================= */}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 border-b border-gray-200">

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                            <div className="flex items-center gap-4">

                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">

                                    <Receipt
                                        size={25}
                                        className="text-[#102d55]"
                                    />

                                </div>

                                <div>

                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Collection Records
                                    </h2>

                                    <p className="text-sm text-gray-500 mt-1">
                                        Payments received by the Cashier's Unit
                                    </p>

                                </div>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    openAddModal
                                }
                                className="inline-flex items-center justify-center gap-2 bg-[#0797a6] hover:bg-[#067f8b] text-white px-5 py-3 rounded-xl font-semibold shadow-sm transition"
                            >

                                <Plus
                                    size={19}
                                />

                                Record Collection

                            </button>

                        </div>

                        {/* SEARCH */}

                        <div className="relative mt-6 max-w-2xl">

                            <Search
                                size={19}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            />

                            <input
                                type="text"
                                value={
                                    search
                                }
                                onChange={(
                                    e
                                ) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                placeholder="Search receipt number, payer, fee type..."
                                className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] focus:border-[#0797a6]"
                            />

                        </div>

                    </div>

                    {/* =================================================
                        TABLE
                    ================================================= */}

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[1050px]">

                            <thead className="bg-[#eef4f8]">

                                <tr>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Receipt No.
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Payer
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Purpose
                                    </th>

                                    <th className="text-right px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Amount Collected
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Payment Method
                                    </th>

                                    <th className="text-left px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Date
                                    </th>

                                    <th className="text-center px-5 py-4 text-xs font-bold uppercase text-gray-600">
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-100">

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <RefreshCw
                                                size={28}
                                                className="animate-spin mx-auto mb-3"
                                            />

                                            Loading collection records...

                                        </td>

                                    </tr>

                                ) : filteredCollections.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="py-16 text-center text-gray-500"
                                        >

                                            <Receipt
                                                size={35}
                                                className="mx-auto mb-3 text-gray-300"
                                            />

                                            <p className="font-semibold">
                                                No collection records found.
                                            </p>

                                            <p className="text-sm mt-1">
                                                Try another search or record a new collection.
                                            </p>

                                        </td>

                                    </tr>

                                ) : (

                                    filteredCollections.map(
                                        (
                                            collection
                                        ) => (

                                            <tr
                                                key={
                                                    collection.id
                                                }
                                                className="hover:bg-blue-50/40 transition"
                                            >

                                                {/* RECEIPT */}

                                                <td className="px-5 py-5">

                                                    <span className="font-bold text-[#102d55]">

                                                        {getReceiptNumber(
                                                            collection
                                                        )}

                                                    </span>

                                                </td>

                                                {/* PAYER */}

                                                <td className="px-5 py-5">

                                                    <div className="flex items-center gap-3">

                                                        <div className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">

                                                            <User
                                                                size={17}
                                                                className="text-cyan-600"
                                                            />

                                                        </div>

                                                        <div>

                                                            <p className="font-semibold text-gray-900">
                                                                {getPayer(
                                                                    collection
                                                                )}
                                                            </p>

                                                            {collection.address_department && (

                                                                <p className="text-xs text-gray-500">
                                                                    {
                                                                        collection.address_department
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
                                                            size={14}
                                                        />

                                                        {getPurpose(
                                                            collection
                                                        )}

                                                    </span>

                                                </td>

                                                {/* AMOUNT */}

                                                <td className="px-5 py-5 text-right">

                                                    <span className="font-bold text-green-700">

                                                        {formatCurrency(
                                                            getAmountCollected(
                                                                collection
                                                            )
                                                        )}

                                                    </span>

                                                </td>

                                                {/* PAYMENT METHOD */}

                                                <td className="px-5 py-5">

                                                    <span className="inline-flex items-center gap-2 text-sm text-gray-700">

                                                        <CreditCard
                                                            size={16}
                                                            className="text-gray-400"
                                                        />

                                                        {
                                                            collection.payment_method ||
                                                            "Cash"
                                                        }

                                                    </span>

                                                </td>

                                                {/* DATE */}

                                                <td className="px-5 py-5 text-sm text-gray-600">

                                                    <div className="flex items-center gap-2">

                                                        <CalendarDays
                                                            size={16}
                                                            className="text-gray-400"
                                                        />

                                                        {formatDate(
                                                            collection.date
                                                        )}

                                                    </div>

                                                </td>

                                                {/* ACTION */}

                                                <td className="px-5 py-5">

                                                    <div className="flex items-center justify-center gap-4">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedCollection(
                                                                    collection
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-2 text-[#007c8b] hover:text-[#005b66] font-semibold"
                                                        >

                                                            <Eye
                                                                size={17}
                                                            />

                                                            View

                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    collection
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-2 text-[#102d55] hover:text-[#0797a6] font-semibold"
                                                        >

                                                            <Edit
                                                                size={17}
                                                            />

                                                            Update

                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        )
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </main>

            {/* =================================================
                ADD COLLECTION MODAL
            ================================================= */}

            {showAddModal && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

                        <div className="sticky top-0 z-10 bg-white border-b px-6 py-5 flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Cashier's Unit
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    Record Collection
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowAddModal(
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
                                        Collection Date
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

                                {/* PURPOSE */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Purpose / Fee Type
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
                                        placeholder="e.g. Tuition Fee"
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

                                {/* AMOUNT */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Amount Collected
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        name="amount"
                                        value={
                                            form.amount
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="0.00"
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

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

                                        <option value="Bank Transfer">
                                            Bank Transfer
                                        </option>

                                        <option value="Online Payment">
                                            Online Payment
                                        </option>

                                        <option value="Check">
                                            Check
                                        </option>

                                    </select>

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
                                        placeholder="Additional details..."
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] resize-none"
                                    />

                                </div>

                            </div>

                            {/* AMOUNT PREVIEW */}

                            <div className="bg-[#eef7f8] rounded-xl p-5">

                                <div className="flex items-center justify-between">

                                    <div>

                                        <p className="text-sm text-gray-500">
                                            Amount to be Recorded
                                        </p>

                                        <p className="text-3xl font-bold text-[#102d55] mt-1">

                                            {formatCurrency(
                                                Number(
                                                    form.amount ||
                                                        0
                                                )
                                            )}

                                        </p>

                                    </div>

                                    <Wallet
                                        size={34}
                                        className="text-[#0797a6]"
                                    />

                                </div>

                            </div>

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowAddModal(
                                            false
                                        )
                                    }
                                    className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="px-6 py-3 rounded-xl bg-[#0797a6] hover:bg-[#067f8b] text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                >

                                    <Save
                                        size={18}
                                    />

                                    {saving
                                        ? "Saving..."
                                        : "Save Collection"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {/* =================================================
                UPDATE COLLECTION MODAL
            ================================================= */}

            {editingCollection && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

                        <div className="sticky top-0 z-10 bg-white border-b px-6 py-5 flex items-center justify-between">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Update Collection Record
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getReceiptNumber(
                                        editingCollection
                                    )}
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setEditingCollection(
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

                        <form
                            onSubmit={
                                handleUpdate
                            }
                            className="p-6 space-y-6"
                        >

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">

                                <Hash
                                    size={20}
                                    className="text-[#102d55] mt-0.5"
                                />

                                <div>

                                    <p className="text-sm font-semibold text-[#102d55]">
                                        Receipt Number
                                    </p>

                                    <p className="text-sm text-gray-600 mt-1">
                                        {
                                            getReceiptNumber(
                                                editingCollection
                                            )
                                        }
                                    </p>

                                </div>

                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* DATE */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Collection Date
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

                                {/* PURPOSE */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Purpose / Fee Type
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
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

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
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

                                </div>

                                {/* AMOUNT */}

                                <div>

                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Amount Collected
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        name="amount"
                                        value={
                                            form.amount
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6]"
                                    />

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
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0797a6] resize-none"
                                    />

                                </div>

                            </div>

                            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditingCollection(
                                            null
                                        )
                                    }
                                    className="px-5 py-3 rounded-xl border border-gray-300 font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="px-6 py-3 rounded-xl bg-[#102d55] hover:bg-[#0b2241] text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                >

                                    <Edit
                                        size={18}
                                    />

                                    {saving
                                        ? "Updating..."
                                        : "Update Collection"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {/* =================================================
                VIEW COLLECTION MODAL
            ================================================= */}

            {selectedCollection && (

                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">

                        <div className="flex items-center justify-between p-6 border-b">

                            <div>

                                <p className="text-sm text-gray-500">
                                    Collection Record
                                </p>

                                <h2 className="text-2xl font-bold text-[#102d55]">
                                    {getReceiptNumber(
                                        selectedCollection
                                    )}
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedCollection(
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

                        <div className="p-6 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Receipt Number
                                    </p>

                                    <p className="font-semibold mt-1 text-[#102d55]">
                                        {getReceiptNumber(
                                            selectedCollection
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Date
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {formatDate(
                                            selectedCollection.date
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Payer
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {getPayer(
                                            selectedCollection
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Purpose
                                    </p>

                                    <p className="font-semibold text-blue-700 mt-1">
                                        {getPurpose(
                                            selectedCollection
                                        )}
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Payment Method
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {
                                            selectedCollection.payment_method ||
                                            "Cash"
                                        }
                                    </p>

                                </div>

                                <div>

                                    <p className="text-xs uppercase text-gray-500">
                                        Address / Department
                                    </p>

                                    <p className="font-semibold mt-1">
                                        {
                                            selectedCollection.address_department ||
                                            "—"
                                        }
                                    </p>

                                </div>

                            </div>

                            {/* AMOUNT */}

                            <div className="bg-green-50 rounded-xl p-6">

                                <p className="text-sm text-green-700">
                                    Amount Collected
                                </p>

                                <p className="text-3xl font-bold text-green-700 mt-1">

                                    {formatCurrency(
                                        getAmountCollected(
                                            selectedCollection
                                        )
                                    )}

                                </p>

                            </div>

                            {/* DESCRIPTION */}

                            <div>

                                <p className="text-xs uppercase text-gray-500 mb-2">
                                    Description
                                </p>

                                <div className="bg-gray-50 rounded-xl p-4 text-gray-700">

                                    {selectedCollection.description ||
                                        "No description provided."}

                                </div>

                            </div>

                        </div>

                        <div className="flex justify-between p-6 border-t">

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCollection(
                                        null
                                    );

                                    openEditModal(
                                        selectedCollection
                                    );
                                }}
                                className="px-5 py-3 rounded-xl bg-[#102d55] text-white font-semibold hover:bg-[#0b2241] inline-flex items-center gap-2"
                            >

                                <Edit
                                    size={17}
                                />

                                Update

                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedCollection(
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