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
     */
    public function index()
    {
        return response()->json(
            Receipt::orderBy('id', 'asc')->get()
        );
    }

    /**
     * GET /api/receipts/pending-balances
     */
    public function pendingBalances()
    {
        return response()->json([
            'data' => Receipt::where('remaining_balance', '>', 0)
                ->orderBy('id', 'asc')
                ->get(),
        ]);
    }

    /**
     * POST /api/receipts
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'purpose' => ['required', 'string', 'max:255'],
            'payer_name' => ['required', 'string', 'max:255'],
            'address_department' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'amount_due' => ['nullable', 'numeric', 'min:0'],
            'amount_paid' => ['nullable', 'numeric', 'min:0'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'amount_collected' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'max:50'],
        ]);

        $amountDue = isset($validated['amount_due'])
            ? (float) $validated['amount_due']
            : (isset($validated['amount_collected'])
                ? (float) $validated['amount_collected']
                : (isset($validated['amount'])
                    ? (float) $validated['amount']
                    : 0));

        $amountPaid = isset($validated['amount_paid'])
            ? (float) $validated['amount_paid']
            : (isset($validated['amount_collected'])
                ? (float) $validated['amount_collected']
                : (isset($validated['amount'])
                    ? (float) $validated['amount']
                    : 0));

        if ($amountPaid > $amountDue) {
            return response()->json([
                'message' => 'Amount paid cannot be greater than the amount due.',
            ], 422);
        }

        $remainingBalance = max($amountDue - $amountPaid, 0);

        $receipt = DB::transaction(function () use (
            $validated,
            $amountDue,
            $amountPaid,
            $remainingBalance
        ) {
            $lastReceipt = Receipt::whereNotNull('receipt_number')
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
                    $nextNumber = ((int) $matches[1]) + 1;
                }
            }

            do {
                $receiptNumber = 'OR-' . str_pad(
                    $nextNumber,
                    4,
                    '0',
                    STR_PAD_LEFT
                );

                $exists = Receipt::where(
                    'receipt_number',
                    $receiptNumber
                )->exists();

                if ($exists) {
                    $nextNumber++;
                }
            } while ($exists);

            return Receipt::create([
                'receipt_number' => $receiptNumber,
                'date' => $validated['date'],
                'purpose' => $validated['purpose'],
                'payer_name' => $validated['payer_name'],
                'address_department' => $validated['address_department'] ?? null,
                'description' => $validated['description'] ?? null,
                'original_amount' => $amountDue,
                'amount' => $amountPaid,
                'remaining_balance' => $remainingBalance,
                'payment_method' => $validated['payment_method'],
            ]);
        });

        ActivityLog::record(
            'CREATED',
            'Receipts',
            "Issued Official Receipt {$receipt->receipt_number} to {$receipt->payer_name} for PHP " .
                number_format((float) $receipt->amount, 2),
            $receipt->receipt_number,
            $receipt->id,
            [
                'event' => 'receipt_created',
                'after' => $this->receiptSnapshot($receipt),
                'payer_name' => $receipt->payer_name,
                'amount_paid' => $receipt->amount,
                'amount_due' => $receipt->original_amount,
                'remaining_balance' => $receipt->remaining_balance,
                'payment_method' => $receipt->payment_method,
                'purpose' => $receipt->purpose,
            ]
        );

        return response()->json([
            'message' => 'Receipt created successfully.',
            'receipt' => $receipt,
            'status' => $this->calculateStatus($receipt),
        ], 201);
    }

    /**
     * GET /api/receipts/{id}
     */
    public function show(string $id)
    {
        $receipt = Receipt::findOrFail($id);

        return response()->json([
            'receipt' => $receipt,
            'status' => $this->calculateStatus($receipt),
        ]);
    }

    /**
     * POST /api/receipts/{id}/payment
     */
    public function recordPayment(Request $request, string $id)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
        ]);

        $receipt = Receipt::findOrFail($id);

        $before = $this->receiptSnapshot($receipt);

        $paymentAmount = (float) $validated['amount'];
        $currentPaid = (float) ($receipt->amount ?? 0);
        $currentDue = (float) ($receipt->original_amount ?? 0);
        $currentBalance = max($currentDue - $currentPaid, 0);

        if ($currentBalance <= 0) {
            return response()->json([
                'message' => 'This receipt is already fully paid.',
            ], 422);
        }

        if ($paymentAmount > $currentBalance) {
            return response()->json([
                'message' => 'Payment cannot be greater than the remaining balance.',
            ], 422);
        }

        $newAmountPaid = $currentPaid + $paymentAmount;
        $newBalance = max($currentDue - $newAmountPaid, 0);

        $receipt->update([
            'amount' => $newAmountPaid,
            'remaining_balance' => $newBalance,
        ]);

        $receipt = $receipt->fresh();

        ActivityLog::record(
            'PAYMENT',
            'Receipts',
            "Recorded payment of PHP " . number_format($paymentAmount, 2) .
                " for {$receipt->receipt_number}. Remaining balance: PHP " .
                number_format($newBalance, 2),
            $receipt->receipt_number,
            $receipt->id,
            [
                'event' => 'receipt_payment',
                'payment_amount' => $paymentAmount,
                'before' => $before,
                'after' => $this->receiptSnapshot($receipt),
                'changes' => [
                    'amount' => [
                        'before' => $before['amount'],
                        'after' => (float) $receipt->amount,
                    ],
                    'remaining_balance' => [
                        'before' => $before['remaining_balance'],
                        'after' => (float) $receipt->remaining_balance,
                    ],
                ],
            ]
        );

        return response()->json([
            'message' => $newBalance <= 0
                ? 'Payment recorded successfully. Receipt is now fully paid.'
                : 'Payment recorded successfully.',
            'receipt' => $receipt,
            'status' => $this->calculateStatus($receipt),
            'remaining_balance' => $newBalance,
        ]);
    }

    /**
     * PUT /api/receipts/{id}
     */
    public function update(Request $request, string $id)
    {
        $receipt = Receipt::findOrFail($id);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'purpose' => ['required', 'string', 'max:255'],
            'payer_name' => ['required', 'string', 'max:255'],
            'address_department' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'amount_due' => ['nullable', 'numeric', 'min:0'],
            'amount_paid' => ['nullable', 'numeric', 'min:0'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'amount_collected' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'max:50'],
        ]);

        // Capture the original values before making any changes.
        $before = $this->receiptSnapshot($receipt);

        $amountDue = isset($validated['amount_due'])
            ? (float) $validated['amount_due']
            : (isset($validated['amount_collected'])
                ? (float) $validated['amount_collected']
                : (isset($validated['amount'])
                    ? (float) $validated['amount']
                    : (float) ($receipt->original_amount ?? 0)));

        $amountPaid = isset($validated['amount_paid'])
            ? (float) $validated['amount_paid']
            : (isset($validated['amount_collected'])
                ? (float) $validated['amount_collected']
                : (isset($validated['amount'])
                    ? (float) $validated['amount']
                    : (float) ($receipt->amount ?? 0)));

        if ($amountPaid > $amountDue) {
            return response()->json([
                'message' => 'Amount paid cannot be greater than the amount due.',
            ], 422);
        }

        $remainingBalance = max($amountDue - $amountPaid, 0);

        $receipt->update([
            'date' => $validated['date'],
            'purpose' => $validated['purpose'],
            'payer_name' => $validated['payer_name'],
            'address_department' => $validated['address_department'] ?? null,
            'description' => $validated['description'] ?? null,
            'original_amount' => $amountDue,
            'amount' => $amountPaid,
            'remaining_balance' => $remainingBalance,
            'payment_method' => $validated['payment_method'],
        ]);

        $receipt = $receipt->fresh();

        $after = $this->receiptSnapshot($receipt);
        $changes = [];

        foreach ($after as $field => $newValue) {
            $oldValue = $before[$field] ?? null;

            // Compare numbers numerically to avoid false changes like 100 vs 100.00.
            if (in_array($field, [
                'original_amount',
                'amount',
                'remaining_balance',
            ], true)) {
                $hasChanged = (float) ($oldValue ?? 0)
                    !== (float) ($newValue ?? 0);
            } else {
                $hasChanged = $oldValue !== $newValue;
            }

            if ($hasChanged) {
                $changes[$field] = [
                    'before' => $oldValue,
                    'after' => $newValue,
                ];
            }
        }

        ActivityLog::record(
            'UPDATED',
            'Receipts',
            "Updated Official Receipt {$receipt->receipt_number}. " .
                count($changes) . " field(s) changed.",
            $receipt->receipt_number,
            $receipt->id,
            [
                'event' => 'receipt_updated',
                'before' => $before,
                'after' => $after,
                'changes' => $changes,
                'changed_fields' => array_keys($changes),
            ]
        );

        return response()->json([
            'message' => 'Receipt updated successfully.',
            'receipt' => $receipt,
            'status' => $this->calculateStatus($receipt),
        ]);
    }

    /**
     * DELETE /api/receipts/{id}
     */
    public function destroy(string $id)
    {
        $receipt = Receipt::findOrFail($id);

        // Preserve the full record in the audit log before deletion.
        $before = $this->receiptSnapshot($receipt);

        ActivityLog::record(
            'DELETED',
            'Receipts',
            "Deleted/Voided Official Receipt {$receipt->receipt_number} " .
                "(Payer: {$receipt->payer_name}, Amount: PHP " .
                number_format((float) $receipt->amount, 2) . ")",
            $receipt->receipt_number,
            $receipt->id,
            [
                'event' => 'receipt_deleted',
                'before' => $before,
                'deleted_record' => $before,
            ]
        );

        $receipt->delete();

        return response()->json([
            'message' => 'Receipt deleted successfully.',
        ]);
    }

    /**
     * Make a consistent snapshot of the receipt for the audit trail.
     */
    private function receiptSnapshot(Receipt $receipt): array
    {
        return [
            'id' => $receipt->id,
            'receipt_number' => $receipt->receipt_number,
            'date' => $receipt->date,
            'purpose' => $receipt->purpose,
            'payer_name' => $receipt->payer_name,
            'address_department' => $receipt->address_department,
            'description' => $receipt->description,
            'original_amount' => (float) ($receipt->original_amount ?? 0),
            'amount' => (float) ($receipt->amount ?? 0),
            'remaining_balance' => (float) ($receipt->remaining_balance ?? 0),
            'payment_method' => $receipt->payment_method,
        ];
    }

    /**
     * Calculate receipt payment status.
     */
    private function calculateStatus(Receipt $receipt): string
    {
        $amountDue = (float) ($receipt->original_amount ?? 0);
        $amountPaid = (float) ($receipt->amount ?? 0);

        if ($amountDue > 0 && $amountPaid >= $amountDue) {
            return 'Paid';
        }

        if ($amountPaid > 0 && $amountPaid < $amountDue) {
            return 'Partially Paid';
        }

        return 'Unpaid';
    }
}
