<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
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
                'required',
                'numeric',
                'min:0',
            ],

            'amount_paid' => [
                'required',
                'numeric',
                'min:0',
            ],

            'payment_method' => [
                'required',
                'string',
                'max:50',
            ],
        ]);


        $amountDue =
            (float) $validated['amount_due'];

        $amountPaid =
            (float) $validated['amount_paid'];


        /*
         * Amount paid cannot be greater
         * than amount due.
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
                $amountDue - $amountPaid,
                0
            );


        /*
         * Generate OR number and create
         * the receipt inside a transaction.
         */
        $receipt = DB::transaction(
            function () use (
                $validated,
                $amountDue,
                $amountPaid,
                $remainingBalance
            ) {

                /*
                 * Find the latest OR number.
                 */
                $lastReceipt =
                    Receipt::whereNotNull(
                        'receipt_number'
                    )
                    ->orderByDesc('id')
                    ->first();


                $nextNumber = 1;


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
                 * Make sure OR number is unique.
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
                 * Create receipt.
                 *
                 * IMPORTANT:
                 *
                 * original_amount = Amount Due
                 * amount = Amount Paid
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
         * Already paid.
         */
        if ($currentBalance <= 0) {

            return response()->json([
                'message' =>
                    'This receipt is already fully paid.',
            ], 422);
        }


        /*
         * Payment cannot exceed
         * remaining balance.
         */
        if ($paymentAmount > $currentBalance) {

            return response()->json([
                'message' =>
                    'Payment cannot be greater than the remaining balance.',
            ], 422);
        }


        /*
         * Add the new payment.
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


        $receipt->update([
            'amount' =>
                $newAmountPaid,

            'remaining_balance' =>
                $newBalance,
        ]);


        $receipt =
            $receipt->fresh();


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
                'required',
                'numeric',
                'min:0',
            ],

            'amount_paid' => [
                'required',
                'numeric',
                'min:0',
            ],

            'payment_method' => [
                'required',
                'string',
                'max:50',
            ],
        ]);


        $amountDue =
            (float) $validated['amount_due'];

        $amountPaid =
            (float) $validated['amount_paid'];


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
         * Update the receipt.
         *
         * The OR number is NOT changed.
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
            (float) ($receipt->original_amount ?? 0);

        $amountPaid =
            (float) ($receipt->amount ?? 0);


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