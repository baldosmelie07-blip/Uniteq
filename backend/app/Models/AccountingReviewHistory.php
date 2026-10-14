<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountingReviewHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'accounting_review_id',
        'record_type',
        'record_id',
        'reference_number',
        'previous_status',
        'new_status',
        'previous_notes',
        'new_notes',
        'action_by',
        'action_at',
    ];

    protected function casts(): array
    {
        return [
            'action_at' => 'datetime',
        ];
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'action_by');
    }
}
