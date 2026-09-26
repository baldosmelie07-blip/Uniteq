<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
        ];
    }

    /**
     * Check whether this user is the System Administrator.
     */
    public function isSystemAdministrator(): bool
    {
        return $this->role === 'System Administrator';
    }

    /**
     * Check whether this user is a Cashier.
     */
    public function isCashier(): bool
    {
        return $this->role === 'Cashier';
    }
}