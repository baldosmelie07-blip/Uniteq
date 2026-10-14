<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccountingReview;
use App\Models\AccountingReviewHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AccountingReviewController extends Controller
{
    public function index(Request $request)
    {
        $query = AccountingReview::with('reviewer')
            ->orderByDesc('updated_at');

        if ($request->filled('record_type')) {
            $query->where('record_type', $request->input('record_type'));
        }

        if ($request->filled('review_status')) {
            $query->where('review_status', $request->input('review_status'));
        }

        if ($request->filled('record_id')) {
            $query->where('record_id', $request->input('record_id'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'record_type' => [
                'required',
                'string',
                Rule::in(['Receipt', 'Voucher']),
            ],
            'record_id' => ['required', 'integer', 'min:1'],
            'reference_number' => ['nullable', 'string', 'max:255'],
            'review_status' => [
                'required',
                'string',
                Rule::in(['Pending', 'Reviewed', 'Correction Required']),
            ],
            'review_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $table = $validated['record_type'] === 'Receipt'
            ? 'receipts'
            : 'vouchers';

        $recordExists = DB::table($table)
            ->where('id', $validated['record_id'])
            ->exists();

        if (! $recordExists) {
            return response()->json([
                'message' => 'The selected receipt or voucher was not found.',
            ], 404);
        }

        $result = DB::transaction(function () use ($validated, $request) {
            $review = AccountingReview::where(
                'record_type',
                $validated['record_type']
            )
                ->where('record_id', $validated['record_id'])
                ->lockForUpdate()
                ->first();

            $previousStatus = $review?->review_status;
            $previousNotes = $review?->review_notes;

            if (! $review) {
                $review = new AccountingReview();
                $review->record_type = $validated['record_type'];
                $review->record_id = $validated['record_id'];
            }

            $review->reference_number =
                $validated['reference_number'] ?? null;

            $review->review_status = $validated['review_status'];
            $review->review_notes = $validated['review_notes'] ?? null;

            if ($validated['review_status'] === 'Pending') {
                $review->reviewed_by = null;
                $review->reviewed_at = null;
            } else {
                $review->reviewed_by = $request->user()->id;
                $review->reviewed_at = now();
            }

            $review->save();

            // Record every save, including the first review.
            AccountingReviewHistory::create([
                'accounting_review_id' => $review->id,
                'record_type' => $review->record_type,
                'record_id' => $review->record_id,
                'reference_number' => $review->reference_number,
                'previous_status' => $previousStatus,
                'new_status' => $review->review_status,
                'previous_notes' => $previousNotes,
                'new_notes' => $review->review_notes,
                'action_by' => $request->user()->id,
                'action_at' => now(),
            ]);

            return $review->load('reviewer');
        });

        return response()->json([
            'message' => 'Accounting review saved successfully.',
            'review' => $result,
        ]);
    }

    public function show(AccountingReview $accountingReview)
    {
        return response()->json(
            $accountingReview->load('reviewer')
        );
    }

    public function history(AccountingReview $accountingReview)
    {
        $history = AccountingReviewHistory::with('reviewer')
            ->where('accounting_review_id', $accountingReview->id)
            ->orderByDesc('action_at')
            ->get();

        return response()->json($history);
    }
}
