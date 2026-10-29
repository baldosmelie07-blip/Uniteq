<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('receipts', 'collection_type')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->string('collection_type')
                    ->after('receipt_number');
            });
        }

        if (! Schema::hasColumn('receipts', 'original_amount')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->decimal('original_amount', 12, 2)
                    ->default(0)
                    ->after('amount');
            });
        }

        if (! Schema::hasColumn('receipts', 'address_department')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->string('address_department')
                    ->nullable()
                    ->after('payer_name');
            });
        }

        if (! Schema::hasColumn('receipts', 'remaining_balance')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->decimal('remaining_balance', 12, 2)
                    ->default(0)
                    ->after('original_amount');
            });
        }

        if (! Schema::hasColumn('receipts', 'issued_by')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->string('issued_by')
                    ->nullable()
                    ->after('remaining_balance');
            });
        }
    }

    public function down(): void
    {
        // Intentionally preserve these columns.
        // Some may have existed before this migration ran.
        // Removing them safely requires a separate, reviewed migration.
    }
};