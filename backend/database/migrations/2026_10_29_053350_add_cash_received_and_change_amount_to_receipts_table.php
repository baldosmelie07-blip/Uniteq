<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            if (!Schema::hasColumn('receipts', 'cash_received')) {
                $table->decimal('cash_received', 12, 2)
                    ->default(0);
            }

            if (!Schema::hasColumn('receipts', 'change_amount')) {
                $table->decimal('change_amount', 12, 2)
                    ->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('receipts', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('receipts', 'cash_received')) {
                $columns[] = 'cash_received';
            }

            if (Schema::hasColumn('receipts', 'change_amount')) {
                $columns[] = 'change_amount';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};