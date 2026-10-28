<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiptController extends Controller
{
    /**
     * Check whether the authenticated user has an allowed role.
     */
    private function requireRoles(array $allowedRoles): void
    {
        $user = request()->user();

        abort_unless($user, 401, 'Unauthenticated.');

        $role = strtolower(trim((string) $user->role));

        $allowedRoles = array_map(
            fn ($allowedRole) => strtolower(trim($allowedRole)),
            $allowedRoles
        );

        abort_unless(
            in_array($role, $allowedRoles, true),
            403,
            'You are not authorized to perform this action.'
        );
    }

    /**
     * Record an action in the audit trail.
     */
    private function writeAudit(
        string $action,
        string $module,
        ?int $recordId,
        ?string $reference,
        ?string $remarks = null,
        ?array $before = null,
        ?array $after = null
    ): void {
        $user = request()->user();

        AuditLog::create([
            'user_id' => $user?->id,
            'user_name' => $user?->name,
            'action' => $action,
            'module' => $module,
            'record_id' => $recordId,
            'record_reference' => $reference,
            'remarks' => $remarks,
            'before_data' => $before,
            'after_data' => $after,
        ]);
    }

    /**
     * Fields to keep in the audit log.
     */
    private function auditFields(Receipt $receipt): array
    {
        return $receipt->only([
            'id',
            'receipt_number',
            'date',
            'purpose',
            'payer_name',
            'address_department',
            'description',
            'original_amount',
            'amount',
            'remaining_balance',
            'payment_method',
        ]);
    }

    /**
     * GET /api/receipts
     * All authorized roles can view receipts.
     */
    public function index()
    {
        $this->requireRoles([
            'System Administrator',
            'Cashier',
            'Reviewer',
            'Viewer',
        ]);

        return response()->json(
            Receipt::orderBy('id', 'asc')->get()
        );
    }

    /**
     * GET /api/receipts/pending-balances
     */
    public function pendingBalances()
    {
        $this->requireRoles([
            'System Administrator',
            'Cashier',
            'Reviewer',
            'Viewer',
        ]);

        $receipts = Receipt::where('remaining_balance', '>', 0)
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'data' => $receipts,
        ]);
    }

    /**
     * Normalize amount field names from different frontend forms.
     */
    private function normalizeAmounts(
        Request $request,
        ?Receipt $receipt = null
    ): void {
        $amountDue = $request->input(
            'amount_due',
            $request->input('amountDue')
        );

        $amountPaid = $request->input(
            'amount_paid',
            $request->input('amountPaid')
        );

        $collectedAmount = $request->input(
            'amount_collected',
            $request->input(
                'amountCollected',
                $request->input('amount')
            )
        );

        if ($amountDue === null) {
            $amountDue = $receipt
                ? $receipt->original_amount
                : $collectedAmount;
        }

        if ($amountPaid === null) {
            $amountPaid = $collectedAmount;

            if ($amountPaid === null && $receipt) {
                $amountPaid = $receipt->amount;
            }
        }

        $request->merge([
            'amount_due' => $amountDue,
            'amount_paid' => $amountPaid,
        ]);
    }

    /**
     * POST /api/receipts
     * System Administrator and Cashier can create receipts.
     */
    public function store(Request $request)
    {
        $this->requireRoles([
            'System Administrator',
            'Cashier',
        ]);

        $this->normalizeAmounts($request);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'purpose' => ['required', 'string', 'max:255'],
            'payer_name' => ['required', 'string', 'max:255'],
            'address_department' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'amount_due' => ['required', 'numeric', 'min:0.01'],
            'amount_paid' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'max:50'],
        ]);

        $amountDue = (float) $validated['amount_due'];
        $amountPaid = (float) $validated['amount_paid'];

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

        $this->writeAudit(
            'CREATED',
            'Receipt',
            (int) $receipt->id,
            $receipt->receipt_number,
            'Receipt created',
            null,
            $this->auditFields($receipt)
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
        $this->requireRoles([
            'System Administrator',
            'Cashier',
            'Reviewer',
            'Viewer',
        ]);

        $receipt = Receipt::findOrFail($id);

        return response()->json([
            'receipt' => $receipt,
            'status' => $this->calculateStatus($receipt),
        ]);
    }

    /**
     * POST /api/receipts/{id}/payment
     * System Administrator and Cashier can record payments.
     */
    public function recordPayment(Request $request, string $id)
    {
        $this->requireRoles([
            'System Administrator',
            'Cashier',
        ]);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
        ]);

        $receipt = Receipt::findOrFail($id);
        $before = $this->auditFields($receipt);

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

        $this->writeAudit(
            'PAYMENT_RECORDED',
            'Receipt',
            (int) $receipt->id,
            $receipt->receipt_number,
            'Payment recorded: ' . number_format($paymentAmount, 2),
            $before,
            $this->auditFields($receipt)
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
     * System Administrator and Cashier can update receipts.
     */
    public function update(Request $request, string $id)
    {
        $this->requireRoles([
            'System Administrator',
            'Cashier',
        ]);

        $receipt = Receipt::findOrFail($id);
        $before = $this->auditFields($receipt);

        $this->normalizeAmounts($request, $receipt);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'purpose' => ['required', 'string', 'max:255'],
            'payer_name' => ['required', 'string', 'max:255'],
            'address_department' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'amount_due' => ['required', 'numeric', 'min:0.01'],
            'amount_paid' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'max:50'],
        ]);

        $amountDue = (float) $validated['amount_due'];
        $amountPaid = (float) $validated['amount_paid'];

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

        $this->writeAudit(
            'UPDATED',
            'Receipt',
            (int) $receipt->id,
            $receipt->receipt_number,
            'Receipt updated',
            $before,
            $this->auditFields($receipt)
        );

        return response()->json([
            'message' => 'Receipt updated successfully.',
            'receipt' => $receipt,
            'status' => $this->calculateStatus($receipt),
        ]);
    }

    /**
     * DELETE /api/receipts/{id}
     * Only System Administrator can delete receipts.
     */
    public function destroy(string $id)
    {
        $this->requireRoles([
            'System Administrator',
        ]);

        $receipt = Receipt::findOrFail($id);
        $before = $this->auditFields($receipt);

        // Record the deletion before deleting the receipt.
        $this->writeAudit(
            'DELETED',
            'Receipt',
            (int) $receipt->id,
            $receipt->receipt_number,
            'Receipt deleted',
            $before,
            null
        );

        $receipt->delete();

        return response()->json([
            'message' => 'Receipt deleted successfully.',
        ]);
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
