<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

class ActivityLog extends Model
{
    use HasFactory;

    protected $table = 'activity_logs';

    protected $fillable = [
        'user_id',
        'user_name',
        'user_role',
        'action',
        'module',
        'description',
        'reference_no',
        'reference_id',
        'ip_address',
        'user_agent',
        'properties',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Relationship to the user who performed the action.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Helper to quickly record an audit log entry.
     *
     * @param string $action CREATED | UPDATED | DELETED | PAYMENT | LOGIN | LOGOUT | STATUS_CHANGE
     * @param string $module Receipts | Collections | Vouchers | Users | Authentication
     * @param string $description Human-readable event description
     * @param string|null $referenceNo e.g. "OR-0001", "V-0001"
     * @param int|null $referenceId Model ID
     * @param array|null $properties Additional payload or before/after diff
     * @return ActivityLog|null
     */
    public static function record(
        string $action,
        string $module,
        string $description,
        ?string $referenceNo = null,
        ?int $referenceId = null,
        ?array $properties = null
    ): ?self {
        try {
            $user = auth('sanctum')->user() ?? auth()->user() ?? request()->user();

            return self::create([
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'System',
                'user_role' => $user?->role ?? 'System',
                'action' => strtoupper($action),
                'module' => $module,
                'description' => $description,
                'reference_no' => $referenceNo,
                'reference_id' => $referenceId,
                'ip_address' => Request::ip() ?? '127.0.0.1',
                'user_agent' => substr((string) Request::userAgent(), 0, 500),
                'properties' => $properties,
            ]);
        } catch (\Throwable $e) {
            // Audit logging should fail gracefully without blocking the financial operation
            \Illuminate\Support\Facades\Log::warning('Failed to write activity log: ' . $e->getMessage());
            return null;
        }
    }
}
