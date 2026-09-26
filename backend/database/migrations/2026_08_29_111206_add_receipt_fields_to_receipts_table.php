<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('receipts', function (Blueprint $table) {

            $table->string('collection_type')->after('receipt_number');

            $table->decimal('original_amount', 12, 2)
                ->default(0)
                ->after('amount');

            $table->string('address_department')
                ->nullable()
                ->after('payer_name');

            $table->decimal('remaining_balance', 12, 2)
                ->default(0)
                ->after('original_amount');

            $table->string('issued_by')
                ->nullable()
                ->after('remaining_balance');
        });
    }

    public function down(): void
    {
        Schema::table('receipts', function (Blueprint $table) {

            $table->dropColumn([
                'collection_type',
                'original_amount',
                'address_department',
                'remaining_balance',
                'issued_by',
            ]);

        });
    }
};