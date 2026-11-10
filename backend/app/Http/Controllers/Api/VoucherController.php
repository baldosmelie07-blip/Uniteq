<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VoucherController extends Controller
{
    public function index()
    {
        return response()->json(
            Voucher::orderBy('created_at', 'desc')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'voucherNumber' => 'required|string|max:255|unique:vouchers,voucher_number',
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
            'dateReceived' => 'nullable|date',
            'dateReleased' => 'nullable|date',
            'paymentMethod' => 'nullable|string|max:100',
            'referenceNumber' => 'nullable|string|max:255',
            'remarks' => 'nullable|string',
            'status' => [
                'required',
                Rule::in([
                    'Received from Accounting',
                    'For Payment',
                    'Released',
                    'Cancelled',
                ]),
            ],
        ]);

        $voucher = Voucher::create($this->mapVoucherData($validated));

        return response()->json([
            'message' => 'Disbursement record created successfully.',
            'voucher' => $voucher,
        ], 201);
    }

    public function show(Voucher $voucher)
    {
        return response()->json($voucher);
    }

    public function update(Request $request, Voucher $voucher)
    {
        $validated = $request->validate([
            'voucherNumber' => [
                'required',
                'string',
                'max:255',
                Rule::unique('vouchers', 'voucher_number')->ignore($voucher->id),
            ],
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
            'dateReceived' => 'nullable|date',
            'dateReleased' => 'nullable|date',
            'paymentMethod' => 'nullable|string|max:100',
            'referenceNumber' => 'nullable|string|max:255',
            'remarks' => 'nullable|string',
            'status' => [
                'required',
                Rule::in([
                    'Received from Accounting',
                    'For Payment',
                    'Released',
                    'Cancelled',
                ]),
            ],
        ]);

        $voucher->update($this->mapVoucherData($validated));

        return response()->json([
            'message' => 'Disbursement record updated successfully.',
            'voucher' => $voucher->fresh(),
        ]);
    }

    public function destroy(Voucher $voucher)
    {
        $voucher->delete();

        return response()->json([
            'message' => 'Disbursement record deleted successfully.',
        ]);
    }

    private function mapVoucherData(array $data): array
    {
        return [
            'voucher_number' => $data['voucherNumber'],
            'date' => $data['date'],
            'payee' => $data['payee'],
            'address' => $data['address'] ?? null,
            'office' => $data['office'] ?? null,
            'purpose' => $data['purpose'],
            'amount' => $data['amount'],
            'amount_words' => $data['amountWords'] ?? null,
            'prepared_by' => $data['preparedBy'] ?? null,
            'checked_by' => $data['checkedBy'] ?? null,
            'approved_by' => $data['approvedBy'] ?? null,
            'received_by' => $data['receivedBy'] ?? null,
            'date_received' => $data['dateReceived'] ?? null,
            'date_released' => $data['dateReleased'] ?? null,
            'payment_method' => $data['paymentMethod'] ?? null,
            'reference_number' => $data['referenceNumber'] ?? null,
            'remarks' => $data['remarks'] ?? null,
            'status' => $data['status'],
        ];
    }
}