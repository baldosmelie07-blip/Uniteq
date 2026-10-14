<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Voucher;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VoucherController extends Controller
{
    private const ALLOWED_STATUSES = [
        'Pending',
        'Under Review',
        'Approved',
        'Paid',
        'Rejected',
    ];

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
            'voucherNumber' => 'required|string|max:255|unique:vouchers,voucher_number',
            'date' => 'required|date',
            'payee' => 'required|string|max:255',
            'address' => 'nullable|string|max:255',
            'office' => 'nullable|string|max:255',
            'purpose' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'amountWords' => 'nullable|string',
            'preparedBy' => 'nullable|string|max:255',
            'checkedBy' => 'nullable|string|max:255',
            'approvedBy' => 'nullable|string|max:255',
            'receivedBy' => 'nullable|string|max:255',
            'status' => [
                'nullable',
                'string',
                Rule::in(self::ALLOWED_STATUSES),
            ],
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

        $this->logVoucherActivity(
            'CREATED',
            $voucher,
            'Created disbursement voucher',
            [
                'event' => 'voucher_created',
                'after' => $this->voucherSnapshot($voucher),
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
     * Update an existing voucher and record exact changes.
     */
    public function update(Request $request, Voucher $voucher)
    {
        $validated = $request->validate([
            'voucherNumber' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('vouchers', 'voucher_number')
                    ->ignore($voucher->id),
            ],
            'date' => 'sometimes|required|date',
            'payee' => 'sometimes|required|string|max:255',
            'address' => 'sometimes|nullable|string|max:255',
            'office' => 'sometimes|nullable|string|max:255',
            'purpose' => 'sometimes|required|string',
            'amount' => 'sometimes|required|numeric|min:0',
            'amountWords' => 'sometimes|nullable|string',
            'preparedBy' => 'sometimes|nullable|string|max:255',
            'checkedBy' => 'sometimes|nullable|string|max:255',
            'approvedBy' => 'sometimes|nullable|string|max:255',
            'receivedBy' => 'sometimes|nullable|string|max:255',
            'status' => [
                'sometimes',
                'nullable',
                'string',
                Rule::in(self::ALLOWED_STATUSES),
            ],
        ]);

        // Capture the original voucher before updating it.
        $before = $this->voucherSnapshot($voucher);

        $fieldMap = [
            'voucherNumber' => 'voucher_number',
            'date' => 'date',
            'payee' => 'payee',
            'address' => 'address',
            'office' => 'office',
            'purpose' => 'purpose',
            'amount' => 'amount',
            'amountWords' => 'amount_words',
            'preparedBy' => 'prepared_by',
            'checkedBy' => 'checked_by',
            'approvedBy' => 'approved_by',
            'receivedBy' => 'received_by',
            'status' => 'status',
        ];

        $updates = [];

        foreach ($fieldMap as $inputField => $databaseField) {
            if (array_key_exists($inputField, $validated)) {
                $updates[$databaseField] = $validated[$inputField];
            }
        }

        $voucher->update($updates);
        $voucher->refresh();

        $after = $this->voucherSnapshot($voucher);
        $changes = [];

        foreach ($after as $field => $newValue) {
            $oldValue = $before[$field] ?? null;

            if ($field === 'amount') {
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

        $this->logVoucherActivity(
            'UPDATED',
            $voucher,
            'Updated disbursement voucher ' .
                $voucher->voucher_number . '. ' .
                count($changes) . ' field(s) changed.',
            [
                'event' => 'voucher_updated',
                'before' => $before,
                'after' => $after,
                'changes' => $changes,
                'changed_fields' => array_keys($changes),
            ]
        );

        return response()->json([
            'message' => 'Voucher updated successfully.',
            'voucher' => $voucher,
            'changed_fields' => array_keys($changes),
        ]);
    }

    /**
     * Delete a voucher while preserving its details in the audit log.
     */
    public function destroy(Voucher $voucher)
    {
        $before = $this->voucherSnapshot($voucher);

        $this->logVoucherActivity(
            'DELETED',
            $voucher,
            'Deleted disbursement voucher ' .
                $voucher->voucher_number,
            [
                'event' => 'voucher_deleted',
                'before' => $before,
                'deleted_record' => $before,
            ]
        );

        $voucher->delete();

        return response()->json([
            'message' => 'Voucher deleted successfully.',
            'deleted_voucher' => $before,
        ]);
    }

    /**
     * Create a consistent snapshot of the voucher.
     */
    private function voucherSnapshot(Voucher $voucher): array
    {
        return [
            'id' => $voucher->id,
            'voucher_number' => $voucher->voucher_number,
            'date' => $voucher->date,
            'payee' => $voucher->payee,
            'address' => $voucher->address,
            'office' => $voucher->office,
            'purpose' => $voucher->purpose,
            'amount' => (float) ($voucher->amount ?? 0),
            'amount_words' => $voucher->amount_words,
            'prepared_by' => $voucher->prepared_by,
            'checked_by' => $voucher->checked_by,
            'approved_by' => $voucher->approved_by,
            'received_by' => $voucher->received_by,
            'status' => $voucher->status,
        ];
    }

    /**
     * Record voucher activity using the existing ActivityLog helper.
     */
    private function logVoucherActivity(
        string $action,
        Voucher $voucher,
        string $description,
        array $properties
    ): void {
        ActivityLog::record(
            $action,
            'Vouchers',
            $description,
            $voucher->voucher_number,
            (int) $voucher->id,
            $properties
        );
    }
}
