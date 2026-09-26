<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PendingBalance;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PendingBalanceController extends Controller
{
    /**
     * Display all pending balances.
     */
    public function index()
    {
        $balances = PendingBalance::orderBy(
            'remaining_balance',
            'desc'
        )->get();

        return response()->json($balances);
    }

    /**
     * Create a new pending balance.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'payer_name' => [
                'required',
                'string',
                'max:255',
            ],

            'original_amount' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            'due_date' => [
                'nullable',
                'date',
            ],

            'description' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $balance = PendingBalance::create([
            'payer_name' =>
                $validated['payer_name'],

            'original_amount' =>
                $validated['original_amount'],

            'amount_paid' =>
                0,

            'remaining_balance' =>
                $validated['original_amount'],

            'due_date' =>
                $validated['due_date'] ?? null,

            'description' =>
                $validated['description'] ?? null,

            'status' =>
                'Pending',
        ]);

        return response()->json([
            'message' =>
                'Pending balance created successfully.',

            'balance' =>
                $balance,
        ], 201);
    }

    /**
     * Show one pending balance.
     */
    public function show(PendingBalance $pendingBalance)
    {
        return response()->json(
            $pendingBalance
        );
    }

    /**
     * Record a payment.
     *
     * This creates an official receipt
     * and automatically updates the balance.
     */
    public function recordPayment(
        Request $request,
        PendingBalance $pendingBalance
    ) {
        $validated = $request->validate([
            'amount' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            'payment_method' => [
                'required',
                'string',
                'max:100',
            ],

            'date' => [
                'required',
                'date',
            ],

            'description' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $paymentAmount =
            (float) $validated['amount'];

        $remaining =
            (float) $pendingBalance->remaining_balance;

        /*
         * Prevent overpayment.
         */
        if ($paymentAmount > $remaining) {
            return response()->json([
                'message' =>
                    'Payment cannot be greater than the remaining balance.',

                'remaining_balance' =>
                    $remaining,
            ], 422);
        }

        $result = DB::transaction(function () use (
            $pendingBalance,
            $validated,
            $paymentAmount
        ) {

            /*
             * Generate next official receipt number.
             */
            $year = now()->year;

            $lastReceipt =
                Receipt::orderByDesc('id')->first();

            $nextNumber = 1;

            if ($lastReceipt) {

                preg_match(
                    '/(\d+)$/',
                    $lastReceipt->receipt_number,
                    $matches
                );

                if (!empty($matches[1])) {
                    $nextNumber =
                        ((int) $matches[1]) + 1;
                }
            }

            $receiptNumber =
                'OR-' .
                $year .
                '-' .
                str_pad(
                    $nextNumber,
                    4,
                    '0',
                    STR_PAD_LEFT
                );

            /*
             * Create official receipt.
             */
            $receipt = Receipt::create([
                'receipt_number' =>
                    $receiptNumber,

                'date' =>
                    $validated['date'],

                'payer_name' =>
                    $pendingBalance->payer_name,

                'amount' =>
                    $paymentAmount,

                'payment_method' =>
                    $validated['payment_method'],

                'description' =>
                    $validated['description']
                    ??
                    $pendingBalance->description,
            ]);

            /*
             * Calculate new balance.
             */
            $newAmountPaid =
                (float) $pendingBalance->amount_paid
                +
                $paymentAmount;

            $newRemaining =
                (float) $pendingBalance->original_amount
                -
                $newAmountPaid;

            /*
             * Avoid tiny decimal precision issues.
             */
            $newAmountPaid =
                round($newAmountPaid, 2);

            $newRemaining =
                round(
                    max($newRemaining, 0),
                    2
                );

            /*
             * Determine status.
             */
            if ($newRemaining <= 0) {

                $status = 'Paid';

            } elseif ($newAmountPaid > 0) {

                $status = 'Partial';

            } else {

                $status = 'Pending';
            }

            /*
             * Update balance.
             */
            $pendingBalance->update([
                'amount_paid' =>
                    $newAmountPaid,

                'remaining_balance' =>
                    $newRemaining,

                'status' =>
                    $status,
            ]);

            return [
                'balance' =>
                    $pendingBalance->fresh(),

                'receipt' =>
                    $receipt,
            ];
        });

        return response()->json([
            'message' =>
                'Payment recorded successfully.',

            'balance' =>
                $result['balance'],

            'receipt' =>
                $result['receipt'],
        ], 201);
    }

    /**
     * Delete a pending balance.
     */
    public function destroy(
        PendingBalance $pendingBalance
    ) {
        $pendingBalance->delete();

        return response()->json([
            'message' =>
                'Pending balance deleted successfully.',
        ]);
    }
}