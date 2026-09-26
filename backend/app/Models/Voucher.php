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
        'status',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:2',
    ];
}