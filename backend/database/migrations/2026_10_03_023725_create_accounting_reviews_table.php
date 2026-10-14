
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_reviews', function (Blueprint $table) {
            $table->id();

            // Identifies whether the reviewed record is a receipt or voucher.
            $table->string('record_type', 20);
            $table->unsignedBigInteger('record_id');
            $table->string('reference_number')->nullable();

            // Accounting review decision and notes.
            $table->string('review_status', 30)->default('Pending');
            $table->text('review_notes')->nullable();

            // Reviewer information.
            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();

            // Indexes for faster record lookup.
            $table->index(['record_type', 'record_id']);
            $table->index('review_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_reviews');
    }
};
