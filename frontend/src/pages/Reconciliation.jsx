import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    RefreshCw,
    Search,
    Wallet,
    ShieldAlert,
    Clock,
    Filter,
    Save,
    History,
    X,
} from "lucide-react";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api";

const REVIEW_STATUSES = [
    "Pending",
    "Reviewed",
    "Correction Required",
];

const INVALID_RECORD_STATUSES = [
    "cancelled",
    "canceled",
    "void",
    "voided",
    "rejected",
    "deleted",
];

const DATA_ISSUES = [
    "Missing reference number",
    "Missing date",
    "Invalid date",
    "Missing or invalid amount",
    "Negative amount",
];

function getHeaders() {
    const token =
        localStorage.getItem("uniteq_token") ||
        sessionStorage.getItem("uniteq_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    return {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Supports common Laravel response structures:
 * - [...]
 * - { data: [...] }
 * - { data: { data: [...] } }
 * - { receipts: [...] }
 * - { reviews: [...] }
 */
function getArray(response) {
    let data = response?.data ?? response;

    for (let depth = 0; depth < 5; depth += 1) {
        if (Array.isArray(data)) {
            return data;
        }

        if (!data || typeof data !== "object") {
            return [];
        }

        const arrayKeys = [
            "receipts",
            "collections",
            "vouchers",
            "reviews",
            "accounting_reviews",
            "history",
            "data",
        ];

        const key = arrayKeys.find((item) => Array.isArray(data[item]));

        if (key) {
            return data[key];
        }

        const nestedKeys = [
            "data",
            "result",
            "results",
            "receipt",
            "collection",
            "voucher",
            "review",
        ];

        const nestedKey = nestedKeys.find(
            (item) =>
                data[item] &&
                typeof data[item] === "object" &&
                !Array.isArray(data[item])
        );

        if (!nestedKey) {
            return [];
        }

        data = data[nestedKey];
    }

    return [];
}

function getSingleRecord(response) {
    let data = response?.data ?? response;

    for (let depth = 0; depth < 4; depth += 1) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return null;
        }

        if (
            data.record_type !== undefined ||
            data.review_status !== undefined
        ) {
            return data;
        }

        const nestedKey = [
            "review",
            "accounting_review",
            "data",
            "result",
        ].find(
            (key) =>
                data[key] &&
                typeof data[key] === "object" &&
                !Array.isArray(data[key])
        );

        if (!nestedKey) {
            return null;
        }

        data = data[nestedKey];
    }

    return null;
}

function getAmountValue(record) {
    return (
        record?.amount ??
        record?.total_amount ??
        record?.total ??
        record?.collection_amount ??
        record?.amount_paid
    );
}

function getAmount(record) {
    const value = getAmountValue(record);
    const amount = Number(value);

    return value !== null &&
        value !== undefined &&
        String(value).trim() !== "" &&
        Number.isFinite(amount)
        ? amount
        : 0;
}

function hasValidAmount(record) {
    const value = getAmountValue(record);

    return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== "" &&
        Number.isFinite(Number(value))
    );
}

function getRecordDate(record) {
    const value =
        record?.date ||
        record?.collection_date ||
        record?.payment_date ||
        record?.voucher_date ||
        record?.created_at ||
        "";

    return String(value).slice(0, 10);
}

function getRecordNumber(record, type) {
    const value =
        type === "Receipt"
            ? record?.receipt_number ??
              record?.receipt_no ??
              record?.or_number ??
              record?.collection_number ??
              record?.reference_number
            : record?.voucher_number ??
              record?.voucherNumber ??
              record?.reference_number;

    return value == null || String(value).trim() === ""
        ? ""
        : String(value).trim();
}

function getRecordName(record, type) {
    if (type === "Receipt") {
        return (
            record?.payer_name ||
            record?.payer ||
            record?.student_name ||
            record?.customer_name ||
            record?.received_from ||
            record?.name ||
            "Unidentified payer"
        );
    }

    return (
        record?.payee ||
        record?.supplier ||
        record?.creditor ||
        record?.employee_name ||
        record?.recipient ||
        "Unidentified payee"
    );
}

function getRecordOffice(record, type) {
    if (type === "Receipt") {
        return (
            record?.address_department ||
            record?.department ||
            record?.office ||
            "Not specified"
        );
    }

    return (
        record?.office ||
        record?.department ||
        record?.requesting_office ||
        "Not specified"
    );
}

function getStatus(record) {
    return String(record?.status || "Recorded").trim();
}

function isPaidVoucher(record) {
    return ["paid", "completed", "released", "disbursed"].includes(
        getStatus(record).toLowerCase()
    );
}

function isCollectionRecorded(record) {
    return !INVALID_RECORD_STATUSES.includes(
        getStatus(record).toLowerCase()
    );
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(Number(value) || 0);
}

function formatDate(value) {
    if (!value) return "Missing date";

    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "Not recorded";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Unknown date";

    return date.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function isDateInRange(date, startDate, endDate) {
    if (!date) return !startDate && !endDate;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;

    return true;
}

function normalizeType(type) {
    const value = String(type || "").trim().toLowerCase();

    if (
        ["receipt", "receipts", "collection", "collections"].includes(value)
    ) {
        return "Receipt";
    }

    if (["voucher", "vouchers", "disbursement", "disbursements"].includes(value)) {
        return "Voucher";
    }

    return String(type || "").trim();
}

function getReviewLabel(review) {
    const status = String(review?.review_status || "Pending").trim();

    return REVIEW_STATUSES.includes(status) ? status : "Pending";
}

function getReviewStyle(status) {
    switch (status) {
        case "Reviewed":
            return "bg-green-100 text-green-800";
        case "Correction Required":
            return "bg-red-100 text-red-800";
        default:
            return "bg-amber-100 text-amber-800";
    }
}

function StatCard({ title, value, icon, color, subtitle }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">
                        {title}
                    </p>

                    <p className="mt-2 break-words text-2xl font-bold text-[#102d55]">
                        {value}
                    </p>

                    {subtitle && (
                        <p className="mt-2 text-xs text-gray-500">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function buildDuplicateMap(records) {
    const groups = new Map();

    for (const record of records) {
        if (!record.number) continue;

        const key = `${record.type}:${record.number
            .trim()
            .toLowerCase()}`;

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(record.id);
    }

    const duplicateIds = new Set();

    for (const ids of groups.values()) {
        if (ids.length > 1) {
            ids.forEach((id) => duplicateIds.add(id));
        }
    }

    return duplicateIds;
}

function ReviewHistoryTimeline({ history, loading, error }) {
    if (loading) {
        return (
            <div className="flex items-center gap-2 py-5 text-sm text-gray-500">
                <RefreshCw size={17} className="animate-spin" />
                Loading review history...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center">
                <History
                    size={28}
                    className="mx-auto text-gray-400"
                />

                <p className="mt-2 font-semibold text-gray-700">
                    No review history yet
                </p>

                <p className="mt-1 text-sm text-gray-500">
                    Previous review decisions will appear here if the
                    Laravel API records and returns review history.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {history.map((entry, index) => (
                <div
                    key={entry.id ?? `${entry.created_at}-${index}`}
                    className="relative border-l-2 border-blue-200 pb-2 pl-5 last:border-l-transparent"
                >
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0797a6] ring-1 ring-blue-200" />

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                                <p className="font-semibold text-gray-900">
                                    {entry.reviewer?.name ||
                                        entry.actor?.name ||
                                        entry.user?.name ||
                                        entry.user_name ||
                                        "Unknown user"}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    {formatDateTime(
                                        entry.action_at ||
                                            entry.created_at ||
                                            entry.updated_at
                                    )}
                                </p>
                            </div>

                            <span
                                className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getReviewStyle(
                                    entry.new_status
                                )}`}
                            >
                                {entry.new_status || "Unknown status"}
                            </span>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Previous status
                                </p>

                                <p className="mt-1 text-sm text-gray-800">
                                    {entry.previous_status ||
                                        "No previous status"}
                                </p>
                            </div>

                            <div className="rounded-lg bg-blue-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                    New status
                                </p>

                                <p className="mt-1 text-sm font-semibold text-blue-950">
                                    {entry.new_status || "Unknown status"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 space-y-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Previous notes
                                </p>

                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                                    {entry.previous_notes ||
                                        "No previous notes"}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    New notes
                                </p>

                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-700">
                                    {entry.new_notes || "No notes entered"}
                                </p>
                            </div>
                        </div>

                        {entry.reference_number && (
                            <p className="mt-3 text-xs text-gray-500">
                                Reference: {entry.reference_number}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Reconciliation() {
    const [collections, setCollections] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [reviews, setReviews] = useState([]);

    const [loading, setLoading] = useState(true);
    const [savingReview, setSavingReview] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [recordType, setRecordType] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [reviewFilter, setReviewFilter] = useState("all");

    const [selectedRecord, setSelectedRecord] = useState(null);
    const [reviewStatus, setReviewStatus] = useState("Pending");
    const [reviewNotes, setReviewNotes] = useState("");

    const [reviewHistory, setReviewHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyError, setHistoryError] = useState("");

    const loadRecords = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const headers = getHeaders();

            const results = await Promise.allSettled([
                axios.get(`${API_BASE_URL}/receipts`, { headers }),
                axios.get(`${API_BASE_URL}/vouchers`, { headers }),
                axios.get(`${API_BASE_URL}/accounting-reviews`, {
                    headers,
                }),
            ]);

            const [receiptResult, voucherResult, reviewResult] = results;
            const errors = [];

            if (receiptResult.status === "fulfilled") {
                setCollections(getArray(receiptResult.value));
            } else {
                setCollections([]);
                errors.push("receipts");
            }

            if (voucherResult.status === "fulfilled") {
                setVouchers(getArray(voucherResult.value));
            } else {
                setVouchers([]);
                errors.push("vouchers");
            }

            if (reviewResult.status === "fulfilled") {
                setReviews(getArray(reviewResult.value));
            } else {
                setReviews([]);
                errors.push("accounting reviews");
            }

            if (errors.length > 0) {
                setErrorMessage(
                    `Unable to load ${errors.join(
                        ", "
                    )}. Confirm that Laravel is running, the API routes exist, and your account has access.`
                );
            }
        } catch (error) {
            console.error("Reconciliation loading error:", error);

            setErrorMessage(
                error.response?.data?.message ||
                    "Unable to load accounting records. Check your Laravel API."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const loadReviewHistory = useCallback(async (reviewId) => {
        if (!reviewId) {
            setReviewHistory([]);
            setLoadingHistory(false);
            setHistoryError(
                "This record does not have a saved accounting review yet. Save its first review to create a history entry."
            );
            return;
        }

        setLoadingHistory(true);
        setHistoryError("");

        try {
            const response = await axios.get(
                `${API_BASE_URL}/accounting-reviews/${reviewId}/history`,
                { headers: getHeaders() }
            );

            setReviewHistory(getArray(response));
        } catch (error) {
            console.error("Review history loading failed:", error);
            setReviewHistory([]);

            if (error.response?.status === 401) {
                setHistoryError(
                    "Your session has expired. Sign in again to view review history."
                );
            } else if (error.response?.status === 403) {
                setHistoryError(
                    "Your account is not authorized to view this review history."
                );
            } else if (error.response?.status === 404) {
                setHistoryError(
                    "Review history was not found. Confirm that the Laravel history route and controller method exist."
                );
            } else {
                setHistoryError(
                    error.response?.data?.message ||
                        "Unable to load review history. Check the Laravel API."
                );
            }
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    useEffect(() => {
        if (!selectedRecord) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !savingReview) {
                setSelectedRecord(null);
                setErrorMessage("");
                setSuccessMessage("");
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedRecord, savingReview]);

    const collectionRecords = useMemo(
        () =>
            collections.filter(isCollectionRecorded).map((record) => ({
                id: `receipt-${record.id ?? getRecordNumber(record, "Receipt") ?? "unknown"}`,
                sourceId: record.id,
                type: "Receipt",
                number: getRecordNumber(record, "Receipt"),
                name: getRecordName(record, "Receipt"),
                office: getRecordOffice(record, "Receipt"),
                date: getRecordDate(record),
                amount: getAmount(record),
                amountValid: hasValidAmount(record),
                status: getStatus(record),
                purpose:
                    record?.purpose ||
                    record?.description ||
                    record?.particulars ||
                    "—",
                original: record,
            })),
        [collections]
    );

    const voucherRecords = useMemo(
        () =>
            vouchers.map((record) => ({
                id: `voucher-${record.id ?? getRecordNumber(record, "Voucher") ?? "unknown"}`,
                sourceId: record.id,
                type: "Voucher",
                number: getRecordNumber(record, "Voucher"),
                name: getRecordName(record, "Voucher"),
                office: getRecordOffice(record, "Voucher"),
                date: getRecordDate(record),
                amount: getAmount(record),
                amountValid: hasValidAmount(record),
                status: getStatus(record),
                purpose:
                    record?.purpose ||
                    record?.description ||
                    record?.particulars ||
                    "—",
                original: record,
                paid: isPaidVoucher(record),
            })),
        [vouchers]
    );

    const allRecords = useMemo(
        () => [...collectionRecords, ...voucherRecords],
        [collectionRecords, voucherRecords]
    );

    const duplicateIds = useMemo(
        () => buildDuplicateMap(allRecords),
        [allRecords]
    );

    const reviewMap = useMemo(() => {
        const map = new Map();

        for (const review of reviews) {
            const type = normalizeType(review.record_type);

            if (review.record_id == null || !type) continue;

            const key = `${type}:${String(review.record_id)}`;
            map.set(key, review);
        }

        return map;
    }, [reviews]);

    const enrichedRecords = useMemo(
        () =>
            allRecords.map((record) => {
                const issues = [];

                const review = record.sourceId == null
                    ? null
                    : reviewMap.get(
                          `${record.type}:${String(record.sourceId)}`
                      ) || null;

                if (!record.number) {
                    issues.push("Missing reference number");
                }

                if (!record.date) {
                    issues.push("Missing date");
                } else if (
                    Number.isNaN(
                        new Date(`${record.date}T00:00:00`).getTime()
                    )
                ) {
                    issues.push("Invalid date");
                }

                if (!record.amountValid) {
                    issues.push("Missing or invalid amount");
                } else if (record.amount < 0) {
                    issues.push("Negative amount");
                }

                if (duplicateIds.has(record.id)) {
                    issues.push("Duplicate reference number");
                }

                if (record.type === "Voucher" && !record.paid) {
                    issues.push("Voucher not marked paid");
                }

                const currentReviewStatus = getReviewLabel(review);

                if (currentReviewStatus === "Correction Required") {
                    issues.push("Accounting correction required");
                }

                return {
                    ...record,
                    reviewType: record.type,
                    review: review || null,
                    reviewId: review?.id ?? null,
                    reviewStatus: currentReviewStatus,
                    reviewerName:
                        review?.reviewer?.name ||
                        review?.user?.name ||
                        review?.reviewer_name ||
                        "Not yet reviewed",
                    reviewedAt: review?.reviewed_at || null,
                    reviewNotes: review?.review_notes || "",
                    issues,
                };
            }),
        [allRecords, duplicateIds, reviewMap]
    );

    const filteredRecords = useMemo(
        () =>
            enrichedRecords.filter((record) =>
                isDateInRange(record.date, startDate, endDate)
            ),
        [enrichedRecords, startDate, endDate]
    );

    const filteredCollections = filteredRecords.filter(
        (record) => record.type === "Receipt"
    );

    const filteredVouchers = filteredRecords.filter(
        (record) => record.type === "Voucher"
    );

    const totalCollections = filteredCollections.reduce(
        (total, record) => total + record.amount,
        0
    );

    const totalVoucherPayments = filteredVouchers
        .filter((record) => record.paid)
        .reduce((total, record) => total + record.amount, 0);

    const pendingVoucherAmount = filteredVouchers
        .filter((record) => !record.paid)
        .reduce((total, record) => total + record.amount, 0);

    const visibleRecords = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return filteredRecords
            .filter((record) => {
                if (
                    recordType === "collections" &&
                    record.type !== "Receipt"
                ) {
                    return false;
                }

                if (
                    recordType === "vouchers" &&
                    record.type !== "Voucher"
                ) {
                    return false;
                }

                if (
                    statusFilter === "paid" &&
                    !(record.type === "Voucher" && record.paid)
                ) {
                    return false;
                }

                if (
                    statusFilter === "pending" &&
                    !(record.type === "Voucher" && !record.paid)
                ) {
                    return false;
                }

                if (
                    statusFilter === "collections" &&
                    record.type !== "Receipt"
                ) {
                    return false;
                }

                if (
                    reviewFilter === "duplicates" &&
                    !record.issues.includes(
                        "Duplicate reference number"
                    )
                ) {
                    return false;
                }

                if (
                    reviewFilter === "data" &&
                    !record.issues.some((issue) =>
                        DATA_ISSUES.includes(issue)
                    )
                ) {
                    return false;
                }

                if (
                    reviewFilter === "unpaid" &&
                    !(record.type === "Voucher" && !record.paid)
                ) {
                    return false;
                }

                if (
                    reviewFilter === "issues" &&
                    record.issues.length === 0
                ) {
                    return false;
                }

                if (
                    reviewFilter === "corrections" &&
                    record.reviewStatus !== "Correction Required"
                ) {
                    return false;
                }

                if (
                    reviewFilter === "reviewed" &&
                    record.reviewStatus !== "Reviewed"
                ) {
                    return false;
                }

                if (
                    query &&
                    ![
                        record.number,
                        record.name,
                        record.office,
                        record.purpose,
                        record.status,
                        record.type,
                        record.date,
                        record.issues.join(" "),
                        record.reviewStatus,
                        record.reviewNotes,
                        record.reviewerName,
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(query)
                ) {
                    return false;
                }

                return true;
            })
            .sort((a, b) =>
                (b.date || "").localeCompare(a.date || "")
            );
    }, [
        filteredRecords,
        recordType,
        statusFilter,
        reviewFilter,
        searchTerm,
    ]);

    const duplicateCount = enrichedRecords.filter((record) =>
        record.issues.includes("Duplicate reference number")
    ).length;

    const dataIssueCount = enrichedRecords.filter((record) =>
        record.issues.some((issue) => DATA_ISSUES.includes(issue))
    ).length;

    const unpaidCount = voucherRecords.filter(
        (record) => !record.paid
    ).length;

    const issueCount = enrichedRecords.filter(
        (record) => record.issues.length > 0
    ).length;

    const correctionCount = enrichedRecords.filter(
        (record) => record.reviewStatus === "Correction Required"
    ).length;

    const closeReview = () => {
        if (savingReview) return;

        setSelectedRecord(null);
        setErrorMessage("");
        setSuccessMessage("");
        setReviewHistory([]);
        setHistoryError("");
    };

    const openReview = (record) => {
        setSelectedRecord(record);
        setReviewStatus(record.reviewStatus || "Pending");
        setReviewNotes(record.reviewNotes || "");
        setReviewHistory([]);
        setHistoryError("");
        setErrorMessage("");
        setSuccessMessage("");

        if (record.reviewId) {
            loadReviewHistory(record.reviewId);
        } else {
            setLoadingHistory(false);
            setHistoryError(
                "This record does not have a saved accounting review yet. Save its first review to create history."
            );
        }
    };

    const saveReview = async () => {
        if (savingReview) return;

        if (
            selectedRecord?.sourceId === null ||
            selectedRecord?.sourceId === undefined
        ) {
            setErrorMessage(
                "This record has no database ID and cannot be reviewed."
            );
            return;
        }

        if (!REVIEW_STATUSES.includes(reviewStatus)) {
            setErrorMessage("Please select a valid review status.");
            return;
        }

        if (!getHeaders().Authorization) {
            setErrorMessage(
                "You are not signed in. Sign in again before saving a review."
            );
            return;
        }

        setSavingReview(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const response = await axios.post(
                `${API_BASE_URL}/accounting-reviews`,
                {
                    record_type: selectedRecord.reviewType,
                    record_id: selectedRecord.sourceId,
                    reference_number: selectedRecord.number || null,
                    review_status: reviewStatus,
                    review_notes: reviewNotes.trim() || null,
                },
                {
                    headers: {
                        ...getHeaders(),
                        "Content-Type": "application/json",
                    },
                }
            );

            const savedReview = getSingleRecord(response);

            if (
                !savedReview ||
                savedReview.id == null ||
                savedReview.record_id == null
            ) {
                throw new Error(
                    "The API response did not contain a saved review with its database ID and record ID. Check the Laravel controller response."
                );
            }

            setReviews((current) => {
                const remaining = current.filter(
                    (review) =>
                        !(
                            normalizeType(review.record_type) ===
                                normalizeType(savedReview.record_type) &&
                            String(review.record_id) ===
                                String(savedReview.record_id)
                        )
                );

                return [...remaining, savedReview];
            });

            const updatedRecord = {
                ...selectedRecord,
                reviewId: savedReview.id,
                reviewStatus: getReviewLabel(savedReview),
                reviewNotes: savedReview.review_notes || "",
                reviewerName:
                    savedReview.reviewer?.name ||
                    savedReview.user?.name ||
                    savedReview.reviewer_name ||
                    "Current reviewer",
                reviewedAt: savedReview.reviewed_at || null,
            };

            setSelectedRecord(updatedRecord);
            setSuccessMessage("Accounting review saved successfully.");

            await loadReviewHistory(savedReview.id);
        } catch (error) {
            console.error("Saving accounting review failed:", error);

            if (error.response?.status === 422) {
                const errors = error.response?.data?.errors || {};
                const firstError = Object.values(errors).flat()[0];

                setErrorMessage(
                    firstError ||
                        error.response?.data?.message ||
                        "Some review information is invalid."
                );
            } else if (error.response?.status === 401) {
                setErrorMessage(
                    "Your session has expired. Sign in again before saving a review."
                );
            } else if (error.response?.status === 403) {
                setErrorMessage(
                    "Your account is not authorized to save this review."
                );
            } else {
                setErrorMessage(
                    error.response?.data?.message ||
                        error.message ||
                        "Unable to save the review. Check your Laravel API and try again."
                );
            }
        } finally {
            setSavingReview(false);
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setRecordType("all");
        setStatusFilter("all");
        setReviewFilter("all");
        setStartDate("");
        setEndDate("");
    };

    return (
        <div className="min-h-screen bg-[#f5f7fa]">
            <header className="bg-[#102d55] text-white">
                <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-6 py-7 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#102d55]">
                            <ClipboardCheck size={30} />
                        </div>

                        <div>
                            <p className="text-sm text-blue-100">
                                University of Abra · Main Campus
                            </p>

                            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                                Accounting Reconciliation
                            </h1>

                            <p className="mt-2 text-sm text-blue-100">
                                Identify discrepancies and document
                                accounting reviews.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={loadRecords}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/70 px-5 py-3 font-semibold transition hover:bg-white hover:text-[#102d55] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw
                            size={17}
                            className={loading ? "animate-spin" : ""}
                        />
                        Refresh records
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 sm:px-6 sm:py-8">
                {errorMessage && !selectedRecord && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"
                    >
                        <AlertCircle
                            className="mt-0.5 shrink-0"
                            size={20}
                        />

                        <div className="min-w-0">
                            <p className="font-semibold">Notice</p>
                            <p className="mt-1 break-words text-sm">
                                {errorMessage}
                            </p>

                            <button
                                type="button"
                                onClick={loadRecords}
                                disabled={loading}
                                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold hover:bg-amber-100 disabled:opacity-50"
                            >
                                <RefreshCw
                                    size={15}
                                    className={loading ? "animate-spin" : ""}
                                />
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {successMessage && !selectedRecord && (
                    <div
                        role="status"
                        className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                    >
                        {successMessage}
                    </div>
                )}

                <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Recorded Collections"
                        value={formatCurrency(totalCollections)}
                        icon={<Wallet size={23} />}
                        color="bg-blue-50 text-blue-700"
                        subtitle={`${filteredCollections.length} receipt records`}
                    />

                    <StatCard
                        title="Paid Voucher Payments"
                        value={formatCurrency(totalVoucherPayments)}
                        icon={<CheckCircle2 size={23} />}
                        color="bg-green-50 text-green-700"
                        subtitle="Vouchers currently marked as paid"
                    />

                    <StatCard
                        title="Pending Voucher Amount"
                        value={formatCurrency(pendingVoucherAmount)}
                        icon={<Clock size={23} />}
                        color="bg-amber-50 text-amber-700"
                        subtitle={`${filteredVouchers.filter((record) => !record.paid).length} unpaid vouchers in the selected date range`}
                    />

                    <StatCard
                        title="Records Requiring Review"
                        value={issueCount}
                        icon={<ShieldAlert size={23} />}
                        color="bg-red-50 text-red-700"
                        subtitle={`${duplicateCount} duplicate records · ${dataIssueCount} data issues`}
                    />
                </section>

                <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">
                            Correction requests
                        </p>

                        <p className="mt-2 text-2xl font-bold text-red-700">
                            {correctionCount}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                            Records marked Correction Required
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-gray-500">
                            Saved accounting reviews
                        </p>

                        <p className="mt-2 text-2xl font-bold text-[#102d55]">
                            {reviews.length}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                            Review records returned by Laravel
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <div className="flex items-start gap-3">
                        <AlertCircle
                            className="mt-0.5 shrink-0 text-blue-700"
                            size={22}
                        />

                        <div>
                            <h2 className="font-bold text-blue-950">
                                Important reconciliation note
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-blue-900">
                                Duplicate references and data issues are
                                alerts for manual review, not proof of fraud
                                or incorrect transactions. A voucher marked
                                Paid is not independently verified by this
                                page. Verify original documents, deposits,
                                ledgers, and payment references before making
                                accounting decisions. Review statuses document
                                the review decision but do not change the
                                original financial record.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 p-5 sm:p-6">
                        <div className="flex flex-col gap-5">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Reconciliation Register
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Search records, identify alerts, and
                                    record review decisions.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="relative xl:col-span-2">
                                    <Search
                                        size={18}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    />

                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(event) =>
                                            setSearchTerm(event.target.value)
                                        }
                                        placeholder="Search reference, payer, payee, office, issue..."
                                        aria-label="Search reconciliation records"
                                        className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none focus:border-[#0797a6] focus:ring-2 focus:ring-[#0797a6]/20"
                                    />
                                </div>

                                <select
                                    value={recordType}
                                    onChange={(event) =>
                                        setRecordType(event.target.value)
                                    }
                                    aria-label="Filter by record type"
                                    className="rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-[#0797a6]"
                                >
                                    <option value="all">
                                        All record types
                                    </option>
                                    <option value="collections">
                                        Receipts / collections
                                    </option>
                                    <option value="vouchers">
                                        Vouchers
                                    </option>
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value)
                                    }
                                    aria-label="Filter by financial status"
                                    className="rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-[#0797a6]"
                                >
                                    <option value="all">
                                        All financial statuses
                                    </option>
                                    <option value="paid">
                                        Paid vouchers
                                    </option>
                                    <option value="pending">
                                        Unpaid vouchers
                                    </option>
                                    <option value="collections">
                                        Receipts only
                                    </option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="text-sm text-gray-600">
                                    Review filter

                                    <select
                                        value={reviewFilter}
                                        onChange={(event) =>
                                            setReviewFilter(event.target.value)
                                        }
                                        className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-[#0797a6]"
                                    >
                                        <option value="all">
                                            All records
                                        </option>
                                        <option value="issues">
                                            All records requiring review
                                        </option>
                                        <option value="duplicates">
                                            Duplicate references
                                        </option>
                                        <option value="data">
                                            Missing / invalid information
                                        </option>
                                        <option value="unpaid">
                                            Unpaid vouchers
                                        </option>
                                        <option value="reviewed">
                                            Reviewed records
                                        </option>
                                        <option value="corrections">
                                            Correction required
                                        </option>
                                    </select>
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="text-sm text-gray-600">
                                        From date

                                        <input
                                            type="date"
                                            value={startDate}
                                            max={endDate || undefined}
                                            onChange={(event) =>
                                                setStartDate(event.target.value)
                                            }
                                            className="mt-1 block w-full min-w-0 rounded-xl border border-gray-300 px-2 py-3 outline-none focus:border-[#0797a6] sm:px-3"
                                        />
                                    </label>

                                    <label className="text-sm text-gray-600">
                                        To date

                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate || undefined}
                                            onChange={(event) =>
                                                setEndDate(event.target.value)
                                            }
                                            className="mt-1 block w-full min-w-0 rounded-xl border border-gray-300 px-2 py-3 outline-none focus:border-[#0797a6] sm:px-3"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-gray-500">
                                    <Filter
                                        size={15}
                                        className="mr-1 inline"
                                    />
                                    {visibleRecords.length} matching records
                                </p>

                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Clear filters
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1350px]">
                            <thead className="bg-[#eef4f8]">
                                <tr>
                                    {[
                                        "Type",
                                        "Reference number",
                                        "Date",
                                        "Payer / payee",
                                        "Office",
                                        "Amount",
                                        "Status",
                                        "Accounting review",
                                        "Review alerts",
                                        "Action",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-gray-600"
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
                                            colSpan={10}
                                            className="py-16 text-center text-gray-500"
                                        >
                                            <RefreshCw
                                                size={26}
                                                className="mx-auto mb-3 animate-spin"
                                            />
                                            Loading accounting records...
                                        </td>
                                    </tr>
                                ) : visibleRecords.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={10}
                                            className="py-16 text-center text-gray-500"
                                        >
                                            <FileText
                                                size={32}
                                                className="mx-auto mb-3 text-gray-300"
                                            />

                                            <p className="font-semibold">
                                                No matching records found.
                                            </p>

                                            <p className="mt-1 text-sm">
                                                Try changing your filters or
                                                refresh the records.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    visibleRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="transition hover:bg-blue-50/40"
                                        >
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                                        record.type === "Receipt"
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "bg-purple-50 text-purple-700"
                                                    }`}
                                                >
                                                    {record.type}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 font-semibold text-[#102d55]">
                                                {record.number || (
                                                    <span className="text-red-700">
                                                        Missing reference
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                {formatDate(record.date)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-900">
                                                    {record.name}
                                                </p>

                                                <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                                                    {record.purpose}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                {record.office}
                                            </td>

                                            <td className="px-5 py-4 font-bold text-gray-900">
                                                {formatCurrency(record.amount)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span className="rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">
                                                    {record.status}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`rounded-full px-3 py-2 text-xs font-semibold ${getReviewStyle(
                                                        record.reviewStatus
                                                    )}`}
                                                >
                                                    {record.reviewStatus}
                                                </span>

                                                <p className="mt-2 text-xs text-gray-500">
                                                    {record.reviewerName}
                                                </p>
                                            </td>

                                            <td className="max-w-xs px-5 py-4">
                                                {record.issues.length === 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-sm text-green-700">
                                                        <CheckCircle2 size={16} />
                                                        No automatic alerts
                                                    </span>
                                                ) : (
                                                    <div className="space-y-1">
                                                        {record.issues.map(
                                                            (issue) => (
                                                                <p
                                                                    key={issue}
                                                                    className="flex items-start gap-1 text-xs font-medium text-amber-800"
                                                                >
                                                                    <AlertCircle
                                                                        size={14}
                                                                        className="mt-0.5 shrink-0"
                                                                    />
                                                                    {issue}
                                                                </p>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openReview(record)
                                                    }
                                                    className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-[#102d55] hover:bg-gray-50"
                                                >
                                                    Review details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col justify-between gap-2 border-t border-gray-200 px-6 py-4 text-sm text-gray-500 sm:flex-row">
                        <span>
                            Showing {visibleRecords.length} matching records
                        </span>

                        <span>
                            {filteredCollections.length} receipts ·{" "}
                            {filteredVouchers.length} vouchers
                        </span>
                    </div>
                </section>
            </main>

            {selectedRecord && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeReview();
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reconciliation-dialog-title"
                        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-white p-5 sm:p-6">
                            <div className="min-w-0">
                                <p className="text-sm text-gray-500">
                                    {selectedRecord.type} accounting review
                                </p>

                                <h2
                                    id="reconciliation-dialog-title"
                                    className="mt-1 break-words text-xl font-bold text-[#102d55] sm:text-2xl"
                                >
                                    {selectedRecord.number ||
                                        "Missing reference number"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeReview}
                                disabled={savingReview}
                                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50"
                                aria-label="Close details"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6 p-5 sm:p-6">
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Record type
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {selectedRecord.type}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Reference number
                                    </p>
                                    <p className="mt-1 break-words font-semibold">
                                        {selectedRecord.number || "Missing"}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Date
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {formatDate(selectedRecord.date)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Payer / payee
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {selectedRecord.name}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Office / department
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {selectedRecord.office}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs uppercase text-gray-500">
                                        Financial status
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {selectedRecord.status}
                                    </p>
                                </div>

                                <div className="sm:col-span-2">
                                    <p className="text-xs uppercase text-gray-500">
                                        Amount
                                    </p>

                                    <p className="mt-1 text-xl font-bold text-[#102d55]">
                                        {formatCurrency(selectedRecord.amount)}
                                    </p>
                                </div>

                                <div className="sm:col-span-2">
                                    <p className="text-xs uppercase text-gray-500">
                                        Purpose / particulars
                                    </p>

                                    <div className="mt-2 break-words rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                                        {selectedRecord.purpose}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <h3 className="font-bold text-amber-950">
                                    Automatic alerts
                                </h3>

                                {selectedRecord.issues.length === 0 ? (
                                    <p className="mt-2 flex items-center gap-2 text-sm text-green-800">
                                        <CheckCircle2 size={17} />
                                        No automatic alerts detected.
                                    </p>
                                ) : (
                                    <ul className="mt-3 space-y-2">
                                        {selectedRecord.issues.map(
                                            (issue) => (
                                                <li
                                                    key={issue}
                                                    className="flex items-start gap-2 text-sm text-amber-900"
                                                >
                                                    <AlertCircle
                                                        size={17}
                                                        className="mt-0.5 shrink-0"
                                                    />
                                                    {issue}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                )}
                            </div>

                            <div className="rounded-2xl border border-gray-200 p-4 sm:p-5">
                                <div className="mb-5">
                                    <h3 className="text-lg font-bold text-[#102d55]">
                                        Accounting review decision
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Record your review separately from
                                        the financial transaction.
                                    </p>
                                </div>

                                <label className="block text-sm font-semibold text-gray-700">
                                    Review status

                                    <select
                                        value={reviewStatus}
                                        onChange={(event) =>
                                            setReviewStatus(event.target.value)
                                        }
                                        disabled={savingReview}
                                        className="mt-2 block w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-[#0797a6] disabled:bg-gray-100"
                                    >
                                        {REVIEW_STATUSES.map((status) => (
                                            <option
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="mt-5 block text-sm font-semibold text-gray-700">
                                    Review notes

                                    <textarea
                                        value={reviewNotes}
                                        onChange={(event) =>
                                            setReviewNotes(event.target.value)
                                        }
                                        rows={4}
                                        maxLength={5000}
                                        disabled={savingReview}
                                        placeholder="Explain what was checked, what is missing, or what needs correction..."
                                        className="mt-2 block w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-[#0797a6] disabled:bg-gray-100"
                                    />

                                    <span className="mt-1 block text-right text-xs font-normal text-gray-500">
                                        {reviewNotes.length}/5000 characters
                                    </span>
                                </label>

                                <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                                    <p>
                                        <strong>Last reviewer:</strong>{" "}
                                        {selectedRecord.reviewerName ||
                                            "Not yet reviewed"}
                                    </p>

                                    <p className="mt-1">
                                        <strong>Review date:</strong>{" "}
                                        {formatDateTime(
                                            selectedRecord.reviewedAt
                                        )}
                                    </p>
                                </div>

                                {errorMessage && (
                                    <div
                                        role="alert"
                                        className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                                    >
                                        <AlertCircle
                                            size={18}
                                            className="mt-0.5 shrink-0"
                                        />
                                        <p className="break-words">
                                            {errorMessage}
                                        </p>
                                    </div>
                                )}

                                {successMessage && (
                                    <div
                                        role="status"
                                        className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                                    >
                                        {successMessage}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={saveReview}
                                    disabled={savingReview || loading}
                                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#102d55] px-5 py-3 font-semibold text-white hover:bg-[#183d70] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {savingReview ? (
                                        <RefreshCw
                                            size={18}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <Save size={18} />
                                    )}

                                    {savingReview
                                        ? "Saving review..."
                                        : "Save accounting review"}
                                </button>
                            </div>

                            <section className="rounded-2xl border border-gray-200 p-4 sm:p-5">
                                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-lg font-bold text-[#102d55]">
                                            <History size={21} />
                                            Accounting Review History
                                        </h3>

                                        <p className="mt-1 text-sm text-gray-500">
                                            Previous review decisions and
                                            notes for this record.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            loadReviewHistory(
                                                selectedRecord.reviewId
                                            )
                                        }
                                        disabled={
                                            loadingHistory ||
                                            !selectedRecord.reviewId
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <RefreshCw
                                            size={15}
                                            className={
                                                loadingHistory
                                                    ? "animate-spin"
                                                    : ""
                                            }
                                        />
                                        Refresh history
                                    </button>
                                </div>

                                <ReviewHistoryTimeline
                                    history={reviewHistory}
                                    loading={loadingHistory}
                                    error={historyError}
                                />
                            </section>
                        </div>

                        <div className="flex justify-end border-t bg-gray-50 p-5 sm:p-6">
                            <button
                                type="button"
                                onClick={closeReview}
                                disabled={savingReview}
                                className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-white disabled:opacity-50"
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