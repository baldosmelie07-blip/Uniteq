
<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\CollectionController;

use App\Http\Middleware\EnsureSystemAdministrator;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Login
Route::post('/login', [AuthController::class, 'login']);


/*
|--------------------------------------------------------------------------
| Authenticated Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    // Authentication
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);


    /*
    |--------------------------------------------------------------------------
    | User Management
    |--------------------------------------------------------------------------
    | System Administrator only
    |--------------------------------------------------------------------------
    */

    Route::middleware(EnsureSystemAdministrator::class)->group(function () {
        Route::apiResource('users', UserController::class);
    });


    /*
    |--------------------------------------------------------------------------
    | Registered Collections
    |--------------------------------------------------------------------------
    | Used by Receipts.jsx to select a collection and load its fixed fee.
    |--------------------------------------------------------------------------
    */

    Route::apiResource('collections', CollectionController::class);


    /*
    |--------------------------------------------------------------------------
    | Receipts and Payments
    |--------------------------------------------------------------------------
    */

    Route::apiResource('receipts', ReceiptController::class);

    // Outstanding balances
    Route::get(
        '/pending-balances',
        [ReceiptController::class, 'pendingBalances']
    );

    // Record an additional payment against a receipt
    Route::post(
        '/receipts/{receipt}/payment',
        [ReceiptController::class, 'recordPayment']
    );


    /*
    |--------------------------------------------------------------------------
    | Vouchers
    |--------------------------------------------------------------------------
    */

    Route::apiResource('vouchers', VoucherController::class);


    /*
    |--------------------------------------------------------------------------
    | Activity Logs
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/activity-logs',
        [ActivityLogController::class, 'index']
    );

    Route::get(
        '/activity-logs/summary',
        [ActivityLogController::class, 'summary']
    );
});
