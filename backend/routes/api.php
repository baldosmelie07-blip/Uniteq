
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Api\CollectionController;

/*
|--------------------------------------------------------------------------
| UniTeq API Routes
|--------------------------------------------------------------------------
*/

// API status check
Route::get('/status', function () {
    return response()->json([
        'success' => true,
        'message' => 'UniTeq API is running.',
    ]);
});

// Authentication
Route::post('/login', [AuthController::class, 'login']);

// Protected routes: require an authenticated user
Route::middleware('auth:sanctum')->group(function () {

    // Account
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // User management
    Route::apiResource('users', UserController::class);

    // Official receipts
    Route::apiResource('receipts', ReceiptController::class);

    // Disbursement vouchers
    Route::apiResource('vouchers', VoucherController::class);

    // Collections
    Route::apiResource('collections', CollectionController::class);
});
