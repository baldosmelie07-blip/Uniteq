<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Fields that can be assigned when creating or updating a user.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
    ];

    /**
     * Fields that must never be exposed in JSON responses.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Automatically convert database values to appropriate types.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Check whether this account belongs to the System Administrator.
     */
    public function isSystemAdministrator(): bool
    {
        return $this->role === 'System Administrator';
    }

    /**
     * Check whether this account belongs to a Cashier.
     */
    public function isCashier(): bool
    {
        return $this->role === 'Cashier';
    }

    /**
     * Check whether this account belongs to a Reviewer.
     */
    public function isReviewer(): bool
    {
        return $this->role === 'Reviewer';
    }

    /**
     * Check whether this account belongs to a Viewer.
     */
    public function isViewer(): bool
    {
        return $this->role === 'Viewer';
    }

    /**
     * Check whether the account is active.
     */
    public function isActive(): bool
    {
        return strtolower((string) $this->status) === 'active';
    }

    /**
     * Check whether this user may access the system.
     */
    public function canAccessSystem(): bool
    {
        return $this->isActive();
    }
}
