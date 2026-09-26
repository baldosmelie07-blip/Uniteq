<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {

            $table->id();

            $table->string('receipt_number')->unique();

            $table->date('date');

            $table->string('collection_type');

            $table->string('purpose');

            $table->string('payer_name');

            $table->string('address_department')->nullable();

            $table->text('description')->nullable();

            $table->decimal('original_amount', 12, 2);

            $table->decimal('amount', 12, 2);

            $table->decimal(
                'remaining_balance',
                12,
                2
            )->default(0);

            $table->string('payment_method');

            $table->timestamps();

        });
    }


    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};