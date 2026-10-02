<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ActivityLogController extends Controller
{
    /**
     * Display a listing of audit activity logs with filtering.
     */
    public function index(Request $request)
    {
        $query = ActivityLog::query();

        // Filter by Module
        if ($request->filled('module') && $request->module !== 'All') {
            $query->where('module', $request->module);
        }

        // Filter by Action
        if ($request->filled('action') && $request->action !== 'All') {
            $query->where('action', strtoupper($request->action));
        }

        // Filter by Date Range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Text Search
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_no', 'like', "%{$search}%")
                  ->orWhere('user_name', 'like', "%{$search}%")
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $logs = $query->orderBy('id', 'desc')->paginate($request->input('per_page', 50));

        // Quick Summary Counts
        $today = Carbon::today();
        $stats = [
            'total_logs' => ActivityLog::count(),
            'today_logs' => ActivityLog::whereDate('created_at', $today)->count(),
            'receipt_logs' => ActivityLog::where('module', 'Receipts')->count(),
            'voucher_logs' => ActivityLog::where('module', 'Vouchers')->count(),
            'auth_logs' => ActivityLog::where('module', 'Authentication')->count(),
        ];

        return response()->json([
            'logs' => $logs->items(),
            'total' => $logs->total(),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'stats' => $stats,
        ]);
    }

    /**
     * Get summary statistics for the dashboard/audit view.
     */
    public function summary()
    {
        $today = Carbon::today();

        return response()->json([
            'total_logs' => ActivityLog::count(),
            'today_logs' => ActivityLog::whereDate('created_at', $today)->count(),
            'receipt_logs' => ActivityLog::where('module', 'Receipts')->count(),
            'voucher_logs' => ActivityLog::where('module', 'Vouchers')->count(),
            'auth_logs' => ActivityLog::where('module', 'Authentication')->count(),
            'recent' => ActivityLog::orderBy('id', 'desc')->take(10)->get(),
        ]);
    }
}
