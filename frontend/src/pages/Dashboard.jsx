import { useEffect, useMemo, useState } from "react";

import {
    Receipt,
    FileText,
    BarChart3,
    Wallet,
    Clock3,
    AlertCircle,
    ArrowUpRight,
    CalendarDays,
    TrendingUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Users,
    Plus,
    ShieldCheck,
} from "lucide-react";

import { Link } from "react-router-dom";

import api from "../api/api";


export default function Dashboard() {

    /*
    |--------------------------------------------------------------------------
    | STATE
    |--------------------------------------------------------------------------
    */

    const [receipts, setReceipts] = useState([]);
    const [vouchers, setVouchers] = useState([]);

    const [loading, setLoading] = useState(true);

    const [selectedAcademicYear, setSelectedAcademicYear] =
        useState("2024-2025");

    const [recentPage, setRecentPage] =
        useState(0);


    /*
    |--------------------------------------------------------------------------
    | CURRENT DATE
    |--------------------------------------------------------------------------
    */

    const now = new Date();

    const currentMonth =
        now.getMonth();

    const currentYear =
        now.getFullYear();


    /*
    |--------------------------------------------------------------------------
    | CURRENT USER
    |--------------------------------------------------------------------------
    */

    const currentUser = useMemo(() => {

        try {

            return JSON.parse(
                localStorage.getItem("uniteq_user") ||
                sessionStorage.getItem("uniteq_user") ||
                "null"
            );

        } catch {

            return null;

        }

    }, []);


    const isSystemAdministrator =
        currentUser?.role === "System Administrator";


    /*
    |--------------------------------------------------------------------------
    | LOAD DASHBOARD DATA
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        loadDashboardData();

    }, []);


    async function loadDashboardData() {

        try {

            setLoading(true);

            const [
                receiptsResponse,
                vouchersResponse,
            ] = await Promise.all([

                api.get("/receipts"),

                api.get("/vouchers"),

            ]);


            const receiptData =
                Array.isArray(receiptsResponse.data)

                    ? receiptsResponse.data

                    : receiptsResponse.data?.data || [];


            const voucherData =
                Array.isArray(vouchersResponse.data)

                    ? vouchersResponse.data

                    : vouchersResponse.data?.data || [];


            setReceipts(receiptData);

            setVouchers(voucherData);

        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );

            setReceipts([]);

            setVouchers([]);

        } finally {

            setLoading(false);

        }

    }


    /*
    |--------------------------------------------------------------------------
    | SAFE DATE PARSER
    |--------------------------------------------------------------------------
    */

    function parseDate(value) {

        if (!value) {
            return null;
        }


        const valueString =
            String(value);


        const match =
            valueString.match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );


        if (match) {

            return {

                year:
                    Number(match[1]),

                month:
                    Number(match[2]) - 1,

                day:
                    Number(match[3]),

            };

        }


        const parsed =
            new Date(value);


        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {

            return null;

        }


        return {

            year:
                parsed.getFullYear(),

            month:
                parsed.getMonth(),

            day:
                parsed.getDate(),

        };

    }


    /*
    |--------------------------------------------------------------------------
    | RECEIPT DATE
    |--------------------------------------------------------------------------
    */

    function getReceiptDate(receipt) {

        return (

            receipt.date ||

            receipt.collection_date ||

            receipt.created_at

        );

    }


    /*
    |--------------------------------------------------------------------------
    | RECEIPT AMOUNT
    |--------------------------------------------------------------------------
    */

    function getReceiptAmount(receipt) {

        return Number(

            receipt.amount ||

            receipt.total_amount ||

            receipt.collection_amount ||

            0

        );

    }


    /*
    |--------------------------------------------------------------------------
    | FORMAT CURRENCY
    |--------------------------------------------------------------------------
    */

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


    /*
    |--------------------------------------------------------------------------
    | FORMAT DATE
    |--------------------------------------------------------------------------
    */

    function formatDate(value) {

        const parsed =
            parseDate(value);


        if (!parsed) {

            return "—";

        }


        const date =
            new Date(

                parsed.year,

                parsed.month,

                parsed.day

            );


        return date.toLocaleDateString(

            "en-PH",

            {

                year: "numeric",

                month: "short",

                day: "numeric",

            }

        );

    }


    /*
    |--------------------------------------------------------------------------
    | ACADEMIC YEARS
    |--------------------------------------------------------------------------
    |
    | The system will begin with:
    |
    | 2024-2025
    | 2025-2026
    | 2026-2027
    |
    | More years can automatically appear when records contain them.
    |
    */

    const academicYears = useMemo(() => {

        const years = new Set([

            "2024-2025",

            "2025-2026",

            "2026-2027",

        ]);


        receipts.forEach((receipt) => {

            const date =
                parseDate(
                    getReceiptDate(receipt)
                );


            if (!date) {
                return;
            }


            /*
             * Academic year starts around August/September.
             *
             * Example:
             *
             * September 2024 -> AY 2024-2025
             * June 2025       -> AY 2024-2025
             */

            const startYear =
                date.month >= 7
                    ? date.year
                    : date.year - 1;


            years.add(

                `${startYear}-${startYear + 1}`

            );

        });


        return Array.from(years)
            .sort((a, b) => {

                return (
                    Number(b.substring(0, 4)) -
                    Number(a.substring(0, 4))
                );

            });

    }, [receipts]);


    /*
    |--------------------------------------------------------------------------
    | MAKE SURE ACADEMIC YEAR EXISTS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        if (

            academicYears.length > 0 &&

            !academicYears.includes(
                selectedAcademicYear
            )

        ) {

            setSelectedAcademicYear(
                academicYears[academicYears.length - 1]
            );

        }

    }, [
        academicYears,
        selectedAcademicYear,
    ]);


    /*
    |--------------------------------------------------------------------------
    | GET ACADEMIC YEAR RANGE
    |--------------------------------------------------------------------------
    */

    function getAcademicYearRange(academicYear) {

        const startYear =
            Number(
                academicYear.substring(0, 4)
            );


        const endYear =
            startYear + 1;


        return {
            startYear,
            endYear,
        };

    }


    /*
    |--------------------------------------------------------------------------
    | COLLECTION OVERVIEW
    |--------------------------------------------------------------------------
    */

    const academicYearReceipts =
        useMemo(() => {

            const {
                startYear,
                endYear,
            } =
                getAcademicYearRange(
                    selectedAcademicYear
                );


            return receipts.filter(
                (receipt) => {

                    const date =
                        parseDate(
                            getReceiptDate(receipt)
                        );


                    if (!date) {

                        return false;

                    }


                    /*
                     * August 1 onward belongs
                     * to the new academic year.
                     *
                     * January-July belongs
                     * to the previous AY.
                     */

                    if (date.month >= 7) {

                        return (
                            date.year ===
                            startYear
                        );

                    }


                    return (
                        date.year ===
                        endYear
                    );

                }
            );

        }, [
            receipts,
            selectedAcademicYear,
        ]);


    const academicYearCollection =
        academicYearReceipts.reduce(

            (total, receipt) => {

                return (
                    total +
                    getReceiptAmount(receipt)
                );

            },

            0

        );


    /*
    |--------------------------------------------------------------------------
    | ACADEMIC YEAR TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    const academicYearTransactions =
        academicYearReceipts.length;


    /*
    |--------------------------------------------------------------------------
    | MONTHLY COLLECTION
    |--------------------------------------------------------------------------
    */

    const monthNames = [

        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",

    ];


    const monthlyCollectionData =
        useMemo(() => {

            const totals =
                Array(12).fill(0);


            receipts.forEach(
                (receipt) => {

                    const date =
                        parseDate(
                            getReceiptDate(receipt)
                        );


                    if (!date) {
                        return;
                    }


                    totals[date.month] +=
                        getReceiptAmount(
                            receipt
                        );

                }
            );


            return totals.map(
                (amount, index) => ({

                    month:
                        monthNames[index],

                    shortMonth:
                        monthNames[index]
                            .substring(0, 3),

                    amount,

                })
            );

        }, [receipts]);


    /*
    |--------------------------------------------------------------------------
    | LAST 7 DAYS
    |--------------------------------------------------------------------------
    */

    const lastSevenDays =
        useMemo(() => {

            const days = [];


            for (
                let i = 6;
                i >= 0;
                i--
            ) {

                const date =
                    new Date();


                date.setDate(
                    date.getDate() - i
                );


                let amount = 0;


                receipts.forEach(
                    (receipt) => {

                        const parsed =
                            parseDate(
                                getReceiptDate(
                                    receipt
                                )
                            );


                        if (!parsed) {
                            return;
                        }


                        if (

                            parsed.year ===
                                date.getFullYear()

                            &&

                            parsed.month ===
                                date.getMonth()

                            &&

                            parsed.day ===
                                date.getDate()

                        ) {

                            amount +=
                                getReceiptAmount(
                                    receipt
                                );

                        }

                    }
                );


                days.push({

                    label:
                        date.toLocaleDateString(
                            "en-PH",
                            {
                                weekday: "short",
                            }
                        ).substring(0, 3),

                    amount,

                });

            }


            return days;

        }, [receipts]);


    const maximumLastSevenDays =
        Math.max(

            ...lastSevenDays.map(
                (day) => day.amount
            ),

            1

        );


    /*
    |--------------------------------------------------------------------------
    | TODAY'S COLLECTION
    |--------------------------------------------------------------------------
    */

    const todaysCollection =
        receipts.reduce(

            (total, receipt) => {

                const parsed =
                    parseDate(
                        getReceiptDate(receipt)
                    );


                if (!parsed) {

                    return total;

                }


                if (

                    parsed.year ===
                        now.getFullYear()

                    &&

                    parsed.month ===
                        now.getMonth()

                    &&

                    parsed.day ===
                        now.getDate()

                ) {

                    return (
                        total +
                        getReceiptAmount(
                            receipt
                        )
                    );

                }


                return total;

            },

            0

        );


    /*
    |--------------------------------------------------------------------------
    | MONTHLY COLLECTION
    |--------------------------------------------------------------------------
    */

    const monthlyCollection =
        receipts.reduce(

            (total, receipt) => {

                const date =
                    parseDate(
                        getReceiptDate(receipt)
                    );


                if (!date) {

                    return total;

                }


                if (

                    date.month ===
                        currentMonth

                    &&

                    date.year ===
                        currentYear

                ) {

                    return (

                        total +
                        getReceiptAmount(
                            receipt
                        )

                    );

                }


                return total;

            },

            0

        );


    /*
    |--------------------------------------------------------------------------
    | MONTHLY TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    const transactionsThisMonth =
        receipts.filter(
            (receipt) => {

                const date =
                    parseDate(
                        getReceiptDate(receipt)
                    );


                return (

                    date &&

                    date.month ===
                        currentMonth

                    &&

                    date.year ===
                        currentYear

                );

            }
        ).length;


    /*
    |--------------------------------------------------------------------------
    | PENDING REQUESTS
    |--------------------------------------------------------------------------
    */

    const pendingVouchers =
        vouchers.filter(
            (voucher) => {

                const status =
                    String(

                        voucher.status ||
                        "Pending"

                    )
                        .toLowerCase()
                        .trim();


                return (

                    status === "pending" ||

                    status === "for approval" ||

                    status === "for verification" ||

                    status === "pending approval"

                );

            }
        );


    const pendingTransactions =
        pendingVouchers.length;


    /*
    |--------------------------------------------------------------------------
    | OUTSTANDING BALANCES
    |--------------------------------------------------------------------------
    */

    const outstandingBalances =
        receipts.filter(
            (receipt) => {

                const balance =
                    Number(

                        receipt.remaining_balance ||

                        receipt.balance ||

                        0

                    );


                return balance > 0;

            }
        ).length;


    /*
    |--------------------------------------------------------------------------
    | RECENT TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    const sortedTransactions =
        useMemo(() => {

            return [...receipts]
                .sort((a, b) => {

                    const dateA =
                        new Date(
                            getReceiptDate(a) || 0
                        ).getTime();


                    const dateB =
                        new Date(
                            getReceiptDate(b) || 0
                        ).getTime();


                    if (
                        dateA !== dateB
                    ) {

                        return (
                            dateB -
                            dateA
                        );

                    }


                    return (

                        Number(b.id || 0) -
                        Number(a.id || 0)

                    );

                });

        }, [receipts]);


    /*
    |--------------------------------------------------------------------------
    | RECENT TRANSACTION PAGINATION
    |--------------------------------------------------------------------------
    */

    const transactionsPerPage = 5;


    const totalRecentPages =
        Math.max(

            1,

            Math.ceil(

                sortedTransactions.length /
                transactionsPerPage

            )

        );


    const visibleRecentTransactions =
        sortedTransactions.slice(

            recentPage *
                transactionsPerPage,

            (
                recentPage + 1
            ) *
                transactionsPerPage

        );


    useEffect(() => {

        if (
            recentPage >=
            totalRecentPages
        ) {

            setRecentPage(
                Math.max(
                    0,
                    totalRecentPages - 1
                )
            );

        }

    }, [
        recentPage,
        totalRecentPages,
    ]);


    /*
    |--------------------------------------------------------------------------
    | ACADEMIC YEAR CHART
    |--------------------------------------------------------------------------
    */

    const academicYearChart =
        useMemo(() => {

            const {
                startYear,
                endYear,
            } =
                getAcademicYearRange(
                    selectedAcademicYear
                );


            return monthNames.map(
                (month, index) => {

                    let amount = 0;


                    academicYearReceipts.forEach(
                        (receipt) => {

                            const date =
                                parseDate(
                                    getReceiptDate(
                                        receipt
                                    )
                                );


                            if (!date) {
                                return;
                            }


                            if (
                                date.month ===
                                index
                            ) {

                                amount +=
                                    getReceiptAmount(
                                        receipt
                                    );

                            }

                        }
                    );


                    return {

                        month,

                        shortMonth:
                            month.substring(
                                0,
                                3
                            ),

                        amount,

                    };

                }
            );

        }, [
            academicYearReceipts,
            selectedAcademicYear,
        ]);


    const maximumAcademicCollection =
        Math.max(

            ...academicYearChart.map(
                (month) =>
                    month.amount
            ),

            1

        );


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (

        <div className="space-y-6">


            {/* =========================================================
                DASHBOARD HEADER
            ========================================================= */}

            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071d41] via-[#0a2856] to-[#0d3b73] px-6 py-7 md:px-8 shadow-xl">

                <div className="absolute inset-0 opacity-20">

                    <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-cyan-200/30" />

                    <div className="absolute right-20 -bottom-40 h-96 w-96 rounded-full border border-cyan-200/20" />

                </div>


                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                    <div>

                        <div className="flex items-center gap-3">

                            <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">

                                <ShieldCheck
                                    size={25}
                                    className="text-cyan-300"
                                />

                            </div>


                            <div>

                                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200 font-semibold">

                                    University of Abra

                                </p>

                                <p className="text-sm text-blue-100">

                                    Main Campus Cashier's Unit

                                </p>

                            </div>

                        </div>


                        <h1 className="mt-5 text-3xl md:text-4xl font-bold text-white">

                            Financial Management System

                        </h1>


                        <p className="mt-2 max-w-2xl text-sm md:text-base text-blue-100">

                            Monitor collections, financial transactions,
                            disbursement requests, and cashier activities
                            in one secure workspace.

                        </p>

                    </div>


                    <div className="rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm px-5 py-4 min-w-[210px]">

                        <div className="flex items-center gap-2 text-cyan-200">

                            <CalendarDays size={17} />

                            <span className="text-xs font-semibold uppercase tracking-wider">

                                Today

                            </span>

                        </div>


                        <p className="mt-2 text-white font-semibold">

                            {now.toLocaleDateString(
                                "en-PH",
                                {
                                    weekday: "long",
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                }
                            )}

                        </p>

                    </div>

                </div>

            </section>


            {/* =========================================================
                FEATURE SUGGESTION
            ========================================================= */}

            <section className="rounded-2xl border border-cyan-100 bg-gradient-to-r from-white to-cyan-50 shadow-sm overflow-hidden">

                <div className="p-6 md:p-7 flex flex-col lg:flex-row lg:items-center gap-6">

                    <div className="h-16 w-16 shrink-0 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center">

                        <Wallet size={31} />

                    </div>


                    <div className="flex-1">

                        <p className="text-xs uppercase tracking-widest font-bold text-cyan-700">

                            Feature Suggestion

                        </p>


                        <h2 className="mt-1 text-xl md:text-2xl font-bold text-gray-900">

                            Online Payment Portal Integration

                        </h2>


                        <p className="mt-2 text-sm text-gray-600 max-w-3xl">

                            Future development may integrate a secure
                            student-facing payment portal for tuition
                            and other online fees, helping reduce manual
                            entry and improve payment tracking.

                        </p>

                    </div>


                    <Link
                        to="/reports"
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-3 text-sm font-semibold transition"
                    >

                        View Reports

                        <ArrowUpRight size={17} />

                    </Link>

                </div>

            </section>


            {/* =========================================================
                SUMMARY CARDS
            ========================================================= */}

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">


                {/* TODAY */}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

                    <div className="flex items-start justify-between">

                        <div>

                            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">

                                Today's Cash Collected

                            </p>


                            <p className="mt-3 text-2xl font-bold text-gray-900">

                                {loading
                                    ? "Loading..."
                                    : formatCurrency(
                                        todaysCollection
                                    )}

                            </p>


                            <p className="mt-2 text-xs text-gray-500">

                                Current business day

                            </p>

                        </div>


                        <div className="h-11 w-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">

                            <Wallet size={21} />

                        </div>

                    </div>

                </div>


                {/* MONTH */}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

                    <div className="flex items-start justify-between">

                        <div>

                            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">

                                Monthly Collection

                            </p>


                            <p className="mt-3 text-2xl font-bold text-gray-900">

                                {loading
                                    ? "Loading..."
                                    : formatCurrency(
                                        monthlyCollection
                                    )}

                            </p>


                            <p className="mt-2 text-xs text-gray-500">

                                {now.toLocaleDateString(
                                    "en-PH",
                                    {
                                        month: "long",
                                        year: "numeric",
                                    }
                                )}

                            </p>

                        </div>


                        <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">

                            <TrendingUp size={21} />

                        </div>

                    </div>

                </div>


                {/* PENDING */}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

                    <div className="flex items-start justify-between">

                        <div>

                            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">

                                Pending Staff Approvals

                            </p>


                            <p className="mt-3 text-3xl font-bold text-gray-900">

                                {loading
                                    ? "..."
                                    : pendingTransactions}

                            </p>


                            <p className="mt-2 text-xs text-amber-600">

                                Awaiting approval

                            </p>

                        </div>


                        <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">

                            <Clock3 size={21} />

                        </div>

                    </div>

                </div>


                {/* BALANCES */}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

                    <div className="flex items-start justify-between">

                        <div>

                            <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">

                                Outstanding Balances

                            </p>


                            <p className="mt-3 text-3xl font-bold text-gray-900">

                                {loading
                                    ? "..."
                                    : outstandingBalances}

                            </p>


                            <p className="mt-2 text-xs text-red-500">

                                Requiring attention

                            </p>

                        </div>


                        <div className="h-11 w-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">

                            <AlertCircle size={21} />

                        </div>

                    </div>

                </div>

            </section>


            {/* =========================================================
                MAIN ANALYTICS
            ========================================================= */}

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">


                {/* =====================================================
                    TRANSACTION VOLUME
                ====================================================== */}

                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                    <div className="flex items-center justify-between">

                        <div>

                            <div className="flex items-center gap-2">

                                <div className="h-9 w-9 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">

                                    <BarChart3 size={19} />

                                </div>


                                <h2 className="font-bold text-gray-900">

                                    Transaction Volume

                                </h2>

                            </div>


                            <p className="text-xs text-gray-500 mt-2">

                                Cash collections for the last 7 days

                            </p>

                        </div>

                    </div>


                    <div className="mt-7 h-64 flex items-end gap-3 md:gap-5">

                        {lastSevenDays.map(
                            (day, index) => {

                                const height =
                                    day.amount > 0

                                        ? Math.max(

                                            (
                                                day.amount /
                                                maximumLastSevenDays
                                            ) * 100,

                                            5

                                        )

                                        : 4;


                                return (

                                    <div
                                        key={`${day.label}-${index}`}
                                        className="flex-1 h-full flex flex-col justify-end items-center group"
                                    >

                                        <div className="mb-2 text-[10px] font-semibold text-gray-500 opacity-0 group-hover:opacity-100 transition">

                                            {formatCurrency(
                                                day.amount
                                            )}

                                        </div>


                                        <div className="w-full max-w-[45px] h-[82%] flex items-end">

                                            <div
                                                className="w-full rounded-t-xl bg-gradient-to-t from-cyan-700 to-cyan-400 transition-all duration-500 group-hover:from-cyan-800 group-hover:to-cyan-500"
                                                style={{
                                                    height: `${height}%`,
                                                }}
                                            />

                                        </div>


                                        <span className="mt-3 text-xs font-semibold text-gray-500">

                                            {day.label}

                                        </span>

                                    </div>

                                );

                            }
                        )}

                    </div>

                </div>


                {/* =====================================================
                    QUICK ACTIONS
                ====================================================== */}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                    <div>

                        <h2 className="font-bold text-gray-900">

                            Quick Actions

                        </h2>


                        <p className="text-xs text-gray-500 mt-1">

                            Frequently used operations

                        </p>

                    </div>


                    <div className="mt-5 space-y-3">


                        <Link
                            to="/receipts"
                            className="group flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 hover:border-cyan-300 hover:bg-cyan-50 transition"
                        >

                            <div className="flex items-center gap-3">

                                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">

                                    <Receipt size={19} />

                                </div>


                                <div>

                                    <p className="font-semibold text-gray-900 text-sm">

                                        Add New Transaction

                                    </p>

                                    <p className="text-xs text-gray-500">

                                        Record a receipt

                                    </p>

                                </div>

                            </div>


                            <ArrowUpRight
                                size={17}
                                className="text-gray-400 group-hover:text-cyan-700"
                            />

                        </Link>


                        <Link
                            to="/collections"
                            className="group flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 hover:border-cyan-300 hover:bg-cyan-50 transition"
                        >

                            <div className="flex items-center gap-3">

                                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">

                                    <Wallet size={19} />

                                </div>


                                <div>

                                    <p className="font-semibold text-gray-900 text-sm">

                                        Reconcile Register

                                    </p>

                                    <p className="text-xs text-gray-500">

                                        Review collections

                                    </p>

                                </div>

                            </div>


                            <ArrowUpRight
                                size={17}
                                className="text-gray-400 group-hover:text-cyan-700"
                            />

                        </Link>


                        {isSystemAdministrator && (

                            <Link
                                to="/create-account"
                                className="group flex items-center justify-between rounded-xl bg-cyan-600 hover:bg-cyan-700 px-4 py-3 text-white transition"
                            >

                                <div className="flex items-center gap-3">

                                    <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">

                                        <Users size={19} />

                                    </div>


                                    <div>

                                        <p className="font-semibold text-sm">

                                            Create Staff Account

                                        </p>

                                        <p className="text-xs text-cyan-100">

                                            Administrator only

                                        </p>

                                    </div>

                                </div>


                                <Plus size={18} />

                            </Link>

                        )}

                    </div>

                </div>

            </section>


            {/* =========================================================
                COLLECTION OVERVIEW
            ========================================================= */}

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                    <div>

                        <div className="flex items-center gap-2">

                            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">

                                <TrendingUp size={19} />

                            </div>


                            <h2 className="font-bold text-gray-900">

                                Collection Overview

                            </h2>

                        </div>


                        <p className="text-xs text-gray-500 mt-2">

                            Financial collection summary by academic year

                        </p>

                    </div>


                    <div className="relative">

                        <select
                            value={selectedAcademicYear}
                            onChange={(e) => {

                                setSelectedAcademicYear(
                                    e.target.value
                                );

                            }}
                            className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 cursor-pointer"
                        >

                            {academicYears.map(
                                (year) => (

                                    <option
                                        key={year}
                                        value={year}
                                    >

                                        AY {year}

                                    </option>

                                )
                            )}

                        </select>


                        <ChevronDown
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />

                    </div>

                </div>


                {/* TOTALS */}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">

                        <p className="text-xs uppercase tracking-wider font-semibold text-blue-600">

                            Total Collection

                        </p>


                        <p className="mt-2 text-2xl font-bold text-blue-950">

                            {loading
                                ? "Loading..."
                                : formatCurrency(
                                    academicYearCollection
                                )}

                        </p>


                        <p className="mt-1 text-xs text-blue-600">

                            Academic Year {selectedAcademicYear}

                        </p>

                    </div>


                    <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-5">

                        <p className="text-xs uppercase tracking-wider font-semibold text-cyan-600">

                            Transactions

                        </p>


                        <p className="mt-2 text-2xl font-bold text-cyan-950">

                            {loading
                                ? "..."
                                : academicYearTransactions}

                        </p>


                        <p className="mt-1 text-xs text-cyan-600">

                            Recorded receipts for AY {selectedAcademicYear}

                        </p>

                    </div>

                </div>


                {/* ACADEMIC YEAR CHART */}

                <div className="mt-8">

                    <div className="flex items-center justify-between mb-4">

                        <p className="text-sm font-semibold text-gray-700">

                            Monthly Collection

                        </p>

                        <span className="text-xs text-gray-400">

                            AY {selectedAcademicYear}

                        </span>

                    </div>


                    <div className="relative h-64 border-l border-b border-gray-200 px-3 md:px-6">

                        <div className="absolute inset-x-0 top-0 border-t border-gray-100" />

                        <div className="absolute inset-x-0 top-1/4 border-t border-gray-100" />

                        <div className="absolute inset-x-0 top-1/2 border-t border-gray-100" />

                        <div className="absolute inset-x-0 top-3/4 border-t border-gray-100" />


                        <div className="relative z-10 h-full flex items-end justify-around gap-2 md:gap-4">

                            {academicYearChart.map(
                                (month) => {

                                    const height =
                                        month.amount > 0

                                            ? Math.max(

                                                (
                                                    month.amount /
                                                    maximumAcademicCollection
                                                ) * 100,

                                                3

                                            )

                                            : 3;


                                    return (

                                        <div
                                            key={month.month}
                                            className="flex-1 h-full flex flex-col items-center justify-end group"
                                        >

                                            <div className="mb-2 text-[9px] md:text-[10px] font-semibold text-blue-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">

                                                {formatCurrency(
                                                    month.amount
                                                )}

                                            </div>


                                            <div className="w-full max-w-[42px] h-[75%] flex items-end">

                                                <div
                                                    className="w-full rounded-t-lg bg-gradient-to-t from-blue-800 to-blue-500"
                                                    style={{
                                                        height: `${height}%`,
                                                        opacity:
                                                            month.amount > 0
                                                                ? 1
                                                                : 0.2,
                                                    }}
                                                />

                                            </div>


                                            <div className="mt-3 text-[10px] md:text-xs font-medium text-gray-500">

                                                {month.shortMonth}

                                            </div>

                                        </div>

                                    );

                                }
                            )}

                        </div>

                    </div>

                </div>

            </section>


            {/* =========================================================
                RECENT TRANSACTIONS
            ========================================================= */}

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    <div>

                        <h2 className="font-bold text-gray-900">

                            Recent Transactions

                        </h2>


                        <p className="text-xs text-gray-500 mt-1">

                            Latest official receipts

                        </p>

                    </div>


                    <div className="flex items-center gap-3">

                        <span className="text-xs text-gray-400">

                            Page {recentPage + 1} of {totalRecentPages}

                        </span>


                        <button
                            type="button"
                            onClick={() => {

                                setRecentPage(
                                    Math.max(
                                        0,
                                        recentPage - 1
                                    )
                                );

                            }}
                            disabled={recentPage === 0}
                            className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >

                            <ChevronLeft size={17} />

                        </button>


                        <button
                            type="button"
                            onClick={() => {

                                setRecentPage(
                                    Math.min(
                                        totalRecentPages - 1,
                                        recentPage + 1
                                    )
                                );

                            }}
                            disabled={
                                recentPage >=
                                totalRecentPages - 1
                            }
                            className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >

                            <ChevronRight size={17} />

                        </button>

                    </div>

                </div>


                <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-gray-50">

                            <tr>

                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">

                                    Receipt

                                </th>


                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">

                                    Payer

                                </th>


                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">

                                    Purpose

                                </th>


                                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">

                                    Date

                                </th>


                                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">

                                    Amount

                                </th>

                            </tr>

                        </thead>


                        <tbody className="divide-y divide-gray-100">

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        className="px-6 py-10 text-center text-gray-500"
                                    >

                                        Loading transactions...

                                    </td>

                                </tr>

                            ) : visibleRecentTransactions.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="5"
                                        className="px-6 py-10 text-center text-gray-500"
                                    >

                                        No transactions found.

                                    </td>

                                </tr>

                            ) : (

                                visibleRecentTransactions.map(
                                    (receipt) => (

                                        <tr
                                            key={receipt.id}
                                            className="hover:bg-gray-50 transition"
                                        >

                                            <td className="px-6 py-4">

                                                <span className="font-bold text-blue-800">

                                                    {
                                                        receipt.receipt_number ||
                                                        "—"
                                                    }

                                                </span>

                                            </td>


                                            <td className="px-6 py-4">

                                                <span className="font-medium text-gray-900">

                                                    {
                                                        receipt.payer_name ||
                                                        "—"
                                                    }

                                                </span>

                                            </td>


                                            <td className="px-6 py-4">

                                                <span className="text-sm text-gray-600">

                                                    {
                                                        receipt.purpose ||
                                                        receipt.description ||
                                                        "—"
                                                    }

                                                </span>

                                            </td>


                                            <td className="px-6 py-4 text-sm text-gray-600">

                                                {formatDate(
                                                    getReceiptDate(
                                                        receipt
                                                    )
                                                )}

                                            </td>


                                            <td className="px-6 py-4 text-right">

                                                <span className="font-semibold text-gray-900">

                                                    {formatCurrency(
                                                        getReceiptAmount(
                                                            receipt
                                                        )
                                                    )}

                                                </span>

                                            </td>

                                        </tr>

                                    )
                                )

                            )}

                        </tbody>

                    </table>

                </div>


                {/* PAGINATION FOOTER */}

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">

                    <p className="text-xs text-gray-400">

                        Showing{" "}

                        {visibleRecentTransactions.length}

                        {" "}of{" "}

                        {sortedTransactions.length}

                        {" "}transactions

                    </p>


                    <div className="flex items-center gap-2">

                        <button
                            type="button"
                            onClick={() => {

                                setRecentPage(
                                    recentPage - 1
                                );

                            }}
                            disabled={recentPage === 0}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >

                            <ChevronLeft size={15} />

                            Previous

                        </button>


                        <button
                            type="button"
                            onClick={() => {

                                setRecentPage(
                                    recentPage + 1
                                );

                            }}
                            disabled={
                                recentPage >=
                                totalRecentPages - 1
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >

                            Next

                            <ChevronRight size={15} />

                        </button>

                    </div>

                </div>

            </section>


            {/* =========================================================
                SYSTEM STATUS
            ========================================================= */}

            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

                <div className="flex items-center justify-between mb-4">

                    <div>

                        <h2 className="font-bold text-gray-900">

                            System Status

                        </h2>


                        <p className="text-xs text-gray-500 mt-1">

                            UniTeq is connected to the financial database.

                        </p>

                    </div>


                    <span className="inline-flex items-center gap-2 text-xs font-semibold bg-green-100 text-green-700 px-3 py-1.5 rounded-full">

                        <span className="h-2 w-2 rounded-full bg-green-500" />

                        Connected

                    </span>

                </div>


                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                    <div className="bg-blue-50 rounded-xl p-4">

                        <p className="text-xs text-blue-600 uppercase font-semibold">

                            Receipts

                        </p>


                        <p className="text-xl font-bold text-blue-900 mt-1">

                            {receipts.length}

                        </p>

                    </div>


                    <div className="bg-cyan-50 rounded-xl p-4">

                        <p className="text-xs text-cyan-600 uppercase font-semibold">

                            This Month

                        </p>


                        <p className="text-xl font-bold text-cyan-900 mt-1">

                            {transactionsThisMonth}

                        </p>

                    </div>


                    <div className="bg-amber-50 rounded-xl p-4">

                        <p className="text-xs text-amber-600 uppercase font-semibold">

                            Pending

                        </p>


                        <p className="text-xl font-bold text-amber-900 mt-1">

                            {pendingTransactions}

                        </p>

                    </div>


                    <div className="bg-purple-50 rounded-xl p-4">

                        <p className="text-xs text-purple-600 uppercase font-semibold">

                            Vouchers

                        </p>


                        <p className="text-xl font-bold text-purple-900 mt-1">

                            {vouchers.length}

                        </p>

                    </div>

                </div>

            </section>

        </div>

    );

}