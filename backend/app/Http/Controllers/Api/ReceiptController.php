<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiptController extends Controller
{
    /**
     * GET /api/receipts
     *
     * Display all receipts.
     */
    public function index()
    {
        $receipts = Receipt::orderBy('id', 'asc')->get();

        return response()->json($receipts);
    }


    /**
     * GET /api/receipts/pending-balances
     *
     * Display receipts with remaining balances.
     */
    public function pendingBalances()
    {
        $receipts = Receipt::where(
            'remaining_balance',
            '>',
            0
        )
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'data' => $receipts,
        ]);
    }


    /**
     * POST /api/receipts
     *
     * Create a new receipt.
     *
     * Supports:
     * amount_due + amount_paid
     * amount / amount_collected
     *
     * If only amount is provided,
     * it is treated as both amount due
     * and amount paid.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => [
                'required',
                'date',
            ],

            'purpose' => [
                'required',
                'string',
                'max:255',
            ],

            'payer_name' => [
                'required',
                'string',
                'max:255',
            ],

            'address_department' => [
                'nullable',
                'string',
                'max:255',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'amount_due' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'amount_paid' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'amount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'amount_collected' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'payment_method' => [
                'required',
                'string',
                'max:50',
            ],
        ]);


        /*
         * ----------------------------------------------------
         * DETERMINE AMOUNT DUE
         * ----------------------------------------------------
         */

        if (
            isset($validated['amount_due']) &&
            $validated['amount_due'] !== null
        ) {
            $amountDue = (float) $validated['amount_due'];
        } elseif (
            isset($validated['amount_collected']) &&
            $validated['amount_collected'] !== null
        ) {
            $amountDue = (float) $validated['amount_collected'];
        } elseif (
            isset($validated['amount']) &&
            $validated['amount'] !== null
        ) {
            $amountDue = (float) $validated['amount'];
        } else {
            $amountDue = 0;
        }


        /*
         * ----------------------------------------------------
         * DETERMINE AMOUNT PAID
         * ----------------------------------------------------
         */

        if (
            isset($validated['amount_paid']) &&
            $validated['amount_paid'] !== null
        ) {
            $amountPaid = (float) $validated['amount_paid'];
        } elseif (
            isset($validated['amount_collected']) &&
            $validated['amount_collected'] !== null
        ) {
            $amountPaid = (float) $validated['amount_collected'];
        } elseif (
            isset($validated['amount']) &&
            $validated['amount'] !== null
        ) {
            $amountPaid = (float) $validated['amount'];
        } else {
            $amountPaid = 0;
        }


        /*
         * ----------------------------------------------------
         * PREVENT OVERPAYMENT
         * ----------------------------------------------------
         */

        if ($amountPaid > $amountDue) {
            return response()->json([
                'message' =>
                    'Amount paid cannot be greater than the amount due.',
            ], 422);
        }


        /*
         * ----------------------------------------------------
         * CALCULATE REMAINING BALANCE
         * ----------------------------------------------------
         */

        $remainingBalance = max(
            $amountDue - $amountPaid,
            0
        );


        /*
         * ----------------------------------------------------
         * GENERATE RECEIPT NUMBER
         * ----------------------------------------------------
         */

        $receipt = DB::transaction(
            function () use (
                $validated,
                $amountDue,
                $amountPaid,
                $remainingBalance
            ) {

                /*
                 * Find the latest receipt.
                 */

                $lastReceipt = Receipt::whereNotNull(
                    'receipt_number'
                )
                    ->orderByDesc('id')
                    ->first();


                /*
                 * Start with OR-0001.
                 */

                $nextNumber = 1;


                /*
                 * If a receipt already exists,
                 * get the next number.
                 */

                if ($lastReceipt) {

                    preg_match(
                        '/^OR-(\d+)$/',
                        $lastReceipt->receipt_number,
                        $matches
                    );

                    if (isset($matches[1])) {

                        $nextNumber =
                            ((int) $matches[1]) + 1;
                    }
                }


                /*
                 * Make sure the receipt number
                 * is unique.
                 */

                do {

                    $receiptNumber =
                        'OR-' .
                        str_pad(
                            $nextNumber,
                            4,
                            '0',
                            STR_PAD_LEFT
                        );


                    $exists =
                        Receipt::where(
                            'receipt_number',
                            $receiptNumber
                        )->exists();


                    if ($exists) {
                        $nextNumber++;
                    }

                } while ($exists);


                /*
                 * ------------------------------------------------
                 * CREATE RECEIPT
                 * ------------------------------------------------
                 *
                 * original_amount = Amount Due
                 * amount          = Amount Paid
                 * remaining_balance = Amount Due - Amount Paid
                 */

                return Receipt::create([

                    'receipt_number' =>
                        $receiptNumber,

                    'date' =>
                        $validated['date'],

                    'purpose' =>
                        $validated['purpose'],

                    'payer_name' =>
                        $validated['payer_name'],

                    'address_department' =>
                        $validated['address_department']
                        ?? null,

                    'description' =>
                        $validated['description']
                        ?? null,

                    'original_amount' =>
                        $amountDue,

                    'amount' =>
                        $amountPaid,

                    'remaining_balance' =>
                        $remainingBalance,

                    'payment_method' =>
                        $validated['payment_method'],

                ]);
            }
        );


        /*
         * ----------------------------------------------------
         * RECORD IN AUDIT TRAIL / ACTIVITY LOG
         * ----------------------------------------------------
         */

        ActivityLog::record(
            'CREATED',
            'Receipts',

            "Issued Official Receipt {$receipt->receipt_number} " .
            "to {$receipt->payer_name} for PHP " .
            number_format($receipt->amount, 2) .
            " (" .
            ($receipt->purpose ?? 'General Collection') .
            ")",

            $receipt->receipt_number,

            $receipt->id,

            [
                'payer_name' =>
                    $receipt->payer_name,

                'amount_paid' =>
                    $receipt->amount,

                'amount_due' =>
                    $receipt->original_amount,

                'remaining_balance' =>
                    $receipt->remaining_balance,

                'payment_method' =>
                    $receipt->payment_method,

                'purpose' =>
                    $receipt->purpose,
            ]
        );


        /*
         * ----------------------------------------------------
         * RETURN CREATED RECEIPT
         * ----------------------------------------------------
         */

        return response()->json([

            'message' =>
                'Receipt created successfully.',

            'receipt' =>
                $receipt,

            'status' =>
                $this->calculateStatus($receipt),

        ], 201);
    }


    /**
     * GET /api/receipts/{id}
     *
     * Display one receipt.
     */
    public function show(string $id)
    {
        $receipt =
            Receipt::findOrFail($id);

        return response()->json([

            'receipt' =>
                $receipt,

            'status' =>
                $this->calculateStatus($receipt),

        ]);
    }


    /**
     * POST /api/receipts/{id}/payment
     *
     * Record an additional payment.
     */
    public function recordPayment(
        Request $request,
        string $id
    ) {

        $validated = $request->validate([
            'amount' => [
                'required',
                'numeric',
                'gt:0',
            ],
        ]);


        $receipt =
            Receipt::findOrFail($id);


        $paymentAmount =
            (float) $validated['amount'];


        $currentPaid =
            (float) ($receipt->amount ?? 0);


        $currentDue =
            (float) ($receipt->original_amount ?? 0);


        $currentBalance =
            max(
                $currentDue - $currentPaid,
                0
            );


        /*
         * Already fully paid.
         */

        if ($currentBalance <= 0) {

            return response()->json([
                'message' =>
                    'This receipt is already fully paid.',
            ], 422);
        }


        /*
         * Payment cannot be greater
         * than remaining balance.
         */

        if ($paymentAmount > $currentBalance) {

            return response()->json([
                'message' =>
                    'Payment cannot be greater than the remaining balance.',
            ], 422);
        }


        /*
         * Add new payment.
         */

        $newAmountPaid =
            $currentPaid +
            $paymentAmount;


        /*
         * Calculate new balance.
         */

        $newBalance =
            max(
                $currentDue -
                $newAmountPaid,
                0
            );


        /*
         * Update receipt.
         */

        $receipt->update([

            'amount' =>
                $newAmountPaid,

            'remaining_balance' =>
                $newBalance,

        ]);


        $receipt =
            $receipt->fresh();


        /*
         * Record in Audit Trail / Activity Log
         */

        ActivityLog::record(
            'PAYMENT',
            'Receipts',

            "Recorded partial/full payment of PHP " .
            number_format($paymentAmount, 2) .
            " for {$receipt->receipt_number} " .
            "(Payer: {$receipt->payer_name}). " .
            "Remaining balance: PHP " .
            number_format($newBalance, 2),

            $receipt->receipt_number,

            $receipt->id,

            [
                'payment_amount' =>
                    $paymentAmount,

                'previous_paid' =>
                    $currentPaid,

                'total_paid' =>
                    $newAmountPaid,

                'remaining_balance' =>
                    $newBalance,
            ]
        );


        return response()->json([

            'message' =>
                $newBalance <= 0
                    ? 'Payment recorded successfully. Receipt is now fully paid.'
                    : 'Payment recorded successfully.',

            'receipt' =>
                $receipt,

            'status' =>
                $this->calculateStatus($receipt),

            'remaining_balance' =>
                $newBalance,

        ]);
    }


    /**
     * PUT /api/receipts/{id}
     *
     * Update a receipt.
     */
    public function update(
        Request $request,
        string $id
    ) {

        $receipt =
            Receipt::findOrFail($id);


        $validated = $request->validate([

            'date' => [
                'required',
                'date',
            ],

            'purpose' => [
                'required',
                'string',
                'max:255',
            ],

            'payer_name' => [
                'required',
                'string',
                'max:255',
            ],

            'address_department' => [
                'nullable',
                'string',
                'max:255',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'amount_due' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'amount_paid' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'amount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'amount_collected' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'payment_method' => [
                'required',
                'string',
                'max:50',
            ],

        ]);


        /*
         * Determine amount due.
         */

        if (
            isset($validated['amount_due']) &&
            $validated['amount_due'] !== null
        ) {

            $amountDue =
                (float) $validated['amount_due'];

        } elseif (
            isset($validated['amount_collected']) &&
            $validated['amount_collected'] !== null
        ) {

            $amountDue =
                (float) $validated['amount_collected'];

        } elseif (
            isset($validated['amount']) &&
            $validated['amount'] !== null
        ) {

            $amountDue =
                (float) $validated['amount'];

        } else {

            $amountDue =
                (float) (
                    $receipt->original_amount ?? 0
                );
        }


        /*
         * Determine amount paid.
         */

        if (
            isset($validated['amount_paid']) &&
            $validated['amount_paid'] !== null
        ) {

            $amountPaid =
                (float) $validated['amount_paid'];

        } elseif (
            isset($validated['amount_collected']) &&
            $validated['amount_collected'] !== null
        ) {

            $amountPaid =
                (float) $validated['amount_collected'];

        } elseif (
            isset($validated['amount']) &&
            $validated['amount'] !== null
        ) {

            $amountPaid =
                (float) $validated['amount'];

        } else {

            $amountPaid =
                (float) (
                    $receipt->amount ?? 0
                );
        }


        /*
         * Prevent overpayment.
         */

        if ($amountPaid > $amountDue) {

            return response()->json([
                'message' =>
                    'Amount paid cannot be greater than the amount due.',
            ], 422);
        }


        /*
         * Calculate remaining balance.
         */

        $remainingBalance =
            max(
                $amountDue -
                $amountPaid,
                0
            );


        /*
         * Update receipt.
         *
         * Receipt number stays the same.
         */

        $receipt->update([

            'date' =>
                $validated['date'],

            'purpose' =>
                $validated['purpose'],

            'payer_name' =>
                $validated['payer_name'],

            'address_department' =>
                $validated['address_department']
                ?? null,

            'description' =>
                $validated['description']
                ?? null,

            'original_amount' =>
                $amountDue,

            'amount' =>
                $amountPaid,

            'remaining_balance' =>
                $remainingBalance,

            'payment_method' =>
                $validated['payment_method'],

        ]);


        $receipt =
            $receipt->fresh();


        /*
         * Record in Audit Trail / Activity Log
         */

        ActivityLog::record(
            'UPDATED',
            'Receipts',

            "Updated Official Receipt " .
            "{$receipt->receipt_number} " .
            "(Payer: {$receipt->payer_name}, " .
            "Amount: PHP " .
            number_format($receipt->amount, 2) .
            ")",

            $receipt->receipt_number,

            $receipt->id,

            [
                'payer_name' =>
                    $receipt->payer_name,

                'amount_paid' =>
                    $receipt->amount,

                'amount_due' =>
                    $receipt->original_amount,

                'remaining_balance' =>
                    $receipt->remaining_balance,

                'payment_method' =>
                    $receipt->payment_method,

                'purpose' =>
                    $receipt->purpose,
            ]
        );


        return response()->json([

            'message' =>
                'Receipt updated successfully.',

            'receipt' =>
                $receipt,

            'status' =>
                $this->calculateStatus($receipt),

        ]);
    }


    /**
     * DELETE /api/receipts/{id}
     *
     * Delete a receipt.
     */
    public function destroy(string $id)
    {
        $receipt =
            Receipt::findOrFail($id);


        /*
         * Record in Audit Trail / Activity Log
         * before deletion.
         */

        ActivityLog::record(
            'DELETED',
            'Receipts',

            "Deleted/Voided Official Receipt " .
            "{$receipt->receipt_number} " .
            "(Payer: {$receipt->payer_name}, " .
            "Amount: PHP " .
            number_format($receipt->amount, 2) .
            ")",

            $receipt->receipt_number,

            $receipt->id,

            [
                'payer_name' =>
                    $receipt->payer_name,

                'amount_paid' =>
                    $receipt->amount,

                'purpose' =>
                    $receipt->purpose,
            ]
        );


        $receipt->delete();


        return response()->json([
            'message' =>
                'Receipt deleted successfully.',
        ]);
    }


    /**
     * Calculate receipt payment status.
     *
     * Paid:
     * amount paid >= amount due
     *
     * Partially Paid:
     * amount paid > 0 but less than amount due
     *
     * Unpaid:
     * amount paid = 0
     */
    private function calculateStatus(
        Receipt $receipt
    ) {

        $amountDue =
            (float) (
                $receipt->original_amount ?? 0
            );


        $amountPaid =
            (float) (
                $receipt->amount ?? 0
            );


        if (
            $amountDue > 0 &&
            $amountPaid >= $amountDue
        ) {

            return 'Paid';
        }


        if (
            $amountPaid > 0 &&
            $amountPaid < $amountDue
        ) {

            return 'Partially Paid';
        }


        return 'Unpaid';
    }
}