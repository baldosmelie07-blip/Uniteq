<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Receipt extends Model
{
    use HasFactory;

    protected $table = 'receipts';

    protected $fillable = [
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
    ];

    protected $casts = [
        'date' => 'date',
        'original_amount' => 'decimal:2',
        'amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
    ];
}