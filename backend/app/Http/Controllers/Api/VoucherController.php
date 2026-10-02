<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    /**
     * Display all vouchers.
     */
    public function index()
    {
        return response()->json(
            Voucher::orderBy('created_at', 'desc')->get()
        );
    }

    /**
     * Store a new voucher.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'voucherNumber' => 'required|string|unique:vouchers,voucher_number',
            'date' => 'required|date',
            'payee' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'office' => 'nullable|string|max:255',
            'purpose' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'amountWords' => 'nullable|string|max:255',
            'preparedBy' => 'nullable|string|max:255',
            'checkedBy' => 'nullable|string|max:255',
            'approvedBy' => 'nullable|string|max:255',
            'receivedBy' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:50',
        ]);

        $voucher = Voucher::create([
            'voucher_number' => $validated['voucherNumber'],
            'date' => $validated['date'],
            'payee' => $validated['payee'],
            'address' => $validated['address'] ?? null,
            'office' => $validated['office'] ?? null,
            'purpose' => $validated['purpose'],
            'amount' => $validated['amount'],
            'amount_words' => $validated['amountWords'] ?? null,
            'prepared_by' => $validated['preparedBy'] ?? null,
            'checked_by' => $validated['checkedBy'] ?? null,
            'approved_by' => $validated['approvedBy'] ?? null,
            'received_by' => $validated['receivedBy'] ?? null,
            'status' => $validated['status'] ?? 'Pending',
        ]);

        ActivityLog::record(
            'CREATED',
            'Vouchers',
            "Created Disbursement Voucher {$voucher->voucher_number} for {$voucher->payee} (Amount: PHP " . number_format($voucher->amount, 2) . ", Status: {$voucher->status})",
            $voucher->voucher_number,
            $voucher->id,
            [
                'payee' => $voucher->payee,
                'amount' => $voucher->amount,
                'status' => $voucher->status,
                'purpose' => $voucher->purpose,
                'office' => $voucher->office,
            ]
        );

        return response()->json([
            'message' => 'Voucher created successfully.',
            'voucher' => $voucher,
        ], 201);
    }

    /**
     * Display one voucher.
     */
    public function show(Voucher $voucher)
    {
        return response()->json($voucher);
    }

    /**
     * Update a voucher.
     */
    public function update(Request $request, Voucher $voucher)
    {
        $validated = $request->validate([
            'voucherNumber' => 'required|string|unique:vouchers,voucher_number,' . $voucher->id,
            'date' => 'required|date',
            'payee' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'office' => 'nullable|string|max:255',
            'purpose' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'amountWords' => 'nullable|string|max:255',
            'preparedBy' => 'nullable|string|max:255',
            'checkedBy' => 'nullable|string|max:255',
            'approvedBy' => 'nullable|string|max:255',
            'receivedBy' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:50',
        ]);

        $voucher->update([
            'voucher_number' => $validated['voucherNumber'],
            'date' => $validated['date'],
            'payee' => $validated['payee'],
            'address' => $validated['address'] ?? null,
            'office' => $validated['office'] ?? null,
            'purpose' => $validated['purpose'],
            'amount' => $validated['amount'],
            'amount_words' => $validated['amountWords'] ?? null,
            'prepared_by' => $validated['preparedBy'] ?? null,
            'checked_by' => $validated['checkedBy'] ?? null,
            'approved_by' => $validated['approvedBy'] ?? null,
            'received_by' => $validated['receivedBy'] ?? null,
            'status' => $validated['status'] ?? 'Pending',
        ]);

        ActivityLog::record(
            'UPDATED',
            'Vouchers',
            "Updated Disbursement Voucher {$voucher->voucher_number} (Payee: {$voucher->payee}, Status: {$voucher->status}, Amount: PHP " . number_format($voucher->amount, 2) . ")",
            $voucher->voucher_number,
            $voucher->id,
            [
                'payee' => $voucher->payee,
                'amount' => $voucher->amount,
                'status' => $voucher->status,
                'purpose' => $voucher->purpose,
                'office' => $voucher->office,
            ]
        );

        return response()->json([
            'message' => 'Voucher updated successfully.',
            'voucher' => $voucher,
        ]);
    }

    /**
     * Delete a voucher.
     */
    public function destroy(Voucher $voucher)
    {
        ActivityLog::record(
            'DELETED',
            'Vouchers',
            "Deleted Disbursement Voucher {$voucher->voucher_number} (Payee: {$voucher->payee}, Amount: PHP " . number_format($voucher->amount, 2) . ")",
            $voucher->voucher_number,
            $voucher->id,
            [
                'payee' => $voucher->payee,
                'amount' => $voucher->amount,
            ]
        );

        $voucher->delete();

        return response()->json([
            'message' => 'Voucher deleted successfully.',
        ]);
    }
}