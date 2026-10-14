
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_review_histories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('accounting_review_id')
                ->nullable()
                ->constrained('accounting_reviews')
                ->nullOnDelete();

            $table->string('record_type', 20);
            $table->unsignedBigInteger('record_id');
            $table->string('reference_number')->nullable();

            $table->string('previous_status', 30)->nullable();
            $table->string('new_status', 30);

            $table->text('previous_notes')->nullable();
            $table->text('new_notes')->nullable();

            $table->foreignId('action_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('action_at')->useCurrent();
            $table->timestamps();

            $table->index(['record_type', 'record_id']);
            $table->index('action_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_review_histories');
    }
};
