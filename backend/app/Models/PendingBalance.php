<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class PendingBalance extends Model {
    protected $fillable = [
        'payer_name',
        'original_amount',
        'amount_paid',
        'remaining_balance',
        'due_date',
        'description',
        'status',
    ];

    protected $casts = [
        'original_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'due_date' => 'date',
    ];
}
?>