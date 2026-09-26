<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();

            $table->string('voucher_number')->unique();

            $table->date('date');

            $table->string('payee');

            $table->string('address')->nullable();

            $table->string('office')->nullable();

            $table->text('purpose');

            $table->decimal('amount', 12, 2);

            $table->string('amount_words')->nullable();

            $table->string('prepared_by')->nullable();

            $table->string('checked_by')->nullable();

            $table->string('approved_by')->nullable();

            $table->string('received_by')->nullable();

            $table->string('status')->default('Pending');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
    }
};