<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Receipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReceiptController extends Controller
{
    /**
     * Display all receipts.
     */
    public function index(Request $request)
    {
        $query = Receipt::query();

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('receipt_number', 'like', "%{$search}%")
                    ->orWhere('payer_name', 'like', "%{$search}%")
                    ->orWhere('purpose', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('date', $request->date);
        }

        if ($request->filled('payment_method')) {
            $query->where(
                'payment_method',
                $request->payment_method
            );
        }

        $receipts = $query
            ->orderByDesc('id')
            ->get();

        return response()->json($receipts);
    }

    /**
     * Store a new receipt.
     */
    public function store(Request $request)
    {
        // Accept field names used by different versions of the frontend.
        $request->merge([
            'original_amount' => $request->input(
                'original_amount',
                $request->input('amount_due')
            ),
            'amount' => $request->input(
                'amount',
                $request->input(
                    'amount_paid',
                    $request->input('amount_collected')
                )
            ),
        ]);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'purpose' => ['required', 'string', 'max:255'],
            'payer_name' => ['required', 'string', 'max:255'],
            'address_department' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'original_amount' => ['required', 'numeric', 'min:0'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'amount_due' => ['nullable', 'numeric', 'min:0'],
            'amount_paid' => ['nullable', 'numeric', 'min:0'],
            'amount_collected' => ['nullable', 'numeric', 'min:0'],
            'cash_received' => ['nullable', 'numeric', 'min:0'],
            'change_amount' => ['nullable', 'numeric', 'min:0'],
            'remaining_balance' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:50'],
        ]);

        $amountDue = round((float) $validated['original_amount'], 2);

        $amountPaid = round(
            (float) ($validated['amount']
                ?? $validated['amount_paid']
                ?? $validated['amount_collected']
                ?? $amountDue),
            2
        );

        // Cash received is the actual money handed over by the payer.
        $cashReceived = round(
            (float) ($validated['cash_received'] ?? $amountPaid),
            2
        );

        if ($cashReceived < $amountPaid) {
            throw ValidationException::withMessages([
                'cash_received' => [
                    'Cash received cannot be less than the amount paid.',
                ],
            ]);
        }

        $changeAmount = round(
            max($cashReceived - $amountPaid, 0),
            2
        );

        $remainingBalance = round(
            max(
                $amountDue - $amountPaid,
                0
            ),
            2
        );

        $receipt = DB::transaction(function () use (
            $validated,
            $amountDue,
            $amountPaid,
            $cashReceived,
            $changeAmount,
            $remainingBalance
        ) {
            // Generate a receipt number if the frontend did not provide one.
            $receiptNumber = request()->input('receipt_number');

            if (empty($receiptNumber)) {
                do {
                    $receiptNumber = 'OR-' . now()->format('YmdHis')
                        . '-' . random_int(100, 999);
                } while (
                    Receipt::where('receipt_number', $receiptNumber)->exists()
                );
            }

            return Receipt::create([
                'receipt_number' => $receiptNumber,
                'date' => $validated['date'],
                'purpose' => $validated['purpose'],
                'payer_name' => $validated['payer_name'],
                'address_department' =>
                    $validated['address_department'] ?? null,
                'description' => $validated['description'] ?? null,
                'original_amount' => $amountDue,
                'amount' => $amountPaid,
                'remaining_balance' => $remainingBalance,
                'payment_method' => 'Cash',
                'cash_received' => $cashReceived,
                'change_amount' => $changeAmount,
            ]);
        });

        return response()->json([
            'message' => 'Receipt created successfully.',
            'receipt' => $receipt,
        ], 201);
    }

    /**
     * Display one receipt.
     */
    public function show($id)
    {
        $receipt = Receipt::findOrFail($id);

        return response()->json($receipt);
    }

    /**
     * Update an existing receipt.
     */
    public function update(Request $request, $id)
    {
        $receipt = Receipt::findOrFail($id);

        // Support both old and new frontend field names.
        if (!$request->has('original_amount') && $request->has('amount_due')) {
            $request->merge([
                'original_amount' => $request->input('amount_due'),
            ]);
        }

        if (!$request->has('amount') && $request->has('amount_paid')) {
            $request->merge([
                'amount' => $request->input('amount_paid'),
            ]);
        }

        if (!$request->has('amount') && $request->has('amount_collected')) {
            $request->merge([
                'amount' => $request->input('amount_collected'),
            ]);
        }

        $validated = $request->validate([
            'date' => ['sometimes', 'required', 'date'],
            'purpose' => ['sometimes', 'required', 'string', 'max:255'],
            'payer_name' => ['sometimes', 'required', 'string', 'max:255'],
            'address_department' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'original_amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'amount_due' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'amount_paid' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'amount_collected' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'cash_received' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'change_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'remaining_balance' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'payment_method' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $amountDue = round(
            (float) ($validated['original_amount']
                ?? $receipt->original_amount
                ?? 0),
            2
        );

        $amountPaid = round(
            (float) ($validated['amount']
                ?? $receipt->amount
                ?? 0),
            2
        );

        $cashReceived = round(
            (float) ($validated['cash_received']
                ?? $receipt->cash_received
                ?? $amountPaid),
            2
        );

        if ($cashReceived < $amountPaid) {
            throw ValidationException::withMessages([
                'cash_received' => [
                    'Cash received cannot be less than the amount paid.',
                ],
            ]);
        }

        $changeAmount = round(
            max($cashReceived - $amountPaid, 0),
            2
        );

        $remainingBalance = round(
            max($amountDue - $amountPaid, 0),
            2
        );

        $receipt->fill([
            'date' => $validated['date'] ?? $receipt->date,
            'purpose' => $validated['purpose'] ?? $receipt->purpose,
            'payer_name' => $validated['payer_name'] ?? $receipt->payer_name,
            'address_department' =>
                $validated['address_department'] ?? $receipt->address_department,
            'description' => $validated['description'] ?? $receipt->description,
            'original_amount' => $amountDue,
            'amount' => $amountPaid,
            'remaining_balance' => $remainingBalance,
            'payment_method' => 'Cash',
            'cash_received' => $cashReceived,
            'change_amount' => $changeAmount,
        ]);

        $receipt->save();

        return response()->json([
            'message' => 'Receipt updated successfully.',
            'receipt' => $receipt->fresh(),
        ]);
    }

    /**
     * Delete a receipt.
     */
    public function destroy($id)
    {
        $receipt = Receipt::findOrFail($id);
        $receipt->delete();

        return response()->json([
            'message' => 'Receipt deleted successfully.',
        ]);
    }
}
