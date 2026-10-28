<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Collection extends Model
{
    use HasFactory;

    protected $table = 'collections';

    protected $fillable = [
        'name',
        'fixed_fee',
        'description',
        'status',
    ];

    protected $casts = [
        'fixed_fee' => 'decimal:2',
    ];
}
