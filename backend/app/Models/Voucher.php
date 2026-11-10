<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'voucher_number',
        'date',
        'payee',
        'address',
        'office',
        'purpose',
        'amount',
        'amount_words',
        'prepared_by',
        'checked_by',
        'approved_by',
        'received_by',
        'date_received',
        'date_released',
        'payment_method',
        'reference_number',
        'remarks',
        'status',
    ];

    protected $casts = [
        'date' => 'date',
        'date_received' => 'date',
        'date_released' => 'date',
        'amount' => 'decimal:2',
    ];
}