
<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AccountingReviewController;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protected API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    // Authentication
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // User Management
    Route::apiResource('users', UserController::class);

    // Official Receipts and Collections
    Route::apiResource('receipts', ReceiptController::class);

    Route::get(
        '/pending-balances',
        [ReceiptController::class, 'pendingBalances']
    );

    Route::post(
        '/receipts/{receipt}/payment',
        [ReceiptController::class, 'recordPayment']
    );

    // Disbursement Vouchers
    Route::apiResource('vouchers', VoucherController::class);

    // Accounting Reviews
    Route::get(
        '/accounting-reviews',
        [AccountingReviewController::class, 'index']
    );

    Route::post(
        '/accounting-reviews',
        [AccountingReviewController::class, 'store']
    );

    Route::get(
        '/accounting-reviews/{accountingReview}/history',
        [AccountingReviewController::class, 'history']
    );

    Route::get(
        '/accounting-reviews/{accountingReview}',
        [AccountingReviewController::class, 'show']
    );

    // Activity Logs
    Route::get(
        '/activity-logs',
        [ActivityLogController::class, 'index']
    );

    Route::get(
        '/activity-logs/summary',
        [ActivityLogController::class, 'summary']
    );
});
