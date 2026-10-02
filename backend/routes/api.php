<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\VoucherController;
use App\Http\Controllers\Api\ActivityLogController;

// Authentication

Route::post('/login', [AuthController::class, 'login']);


// Protected API

Route::middleware('auth:sanctum')->group(function () {

    // Authentication

    Route::get('/me', [AuthController::class, 'me']);

    Route::post('/logout', [AuthController::class, 'logout']);


    // Users

    Route::apiResource('users', UserController::class);


    // Receipts

    Route::apiResource('receipts', ReceiptController::class);


    // Pending balances

    Route::get(
        '/pending-balances',
        [ReceiptController::class, 'pendingBalances']
    );


    // Record payment

    Route::post(
        '/receipts/{receipt}/payment',
        [ReceiptController::class, 'recordPayment']
    );


   // Vouchers

    Route::apiResource('vouchers', VoucherController::class);


    // Audit Trail / Activity Logs

    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/activity-logs/summary', [ActivityLogController::class, 'summary']);

});