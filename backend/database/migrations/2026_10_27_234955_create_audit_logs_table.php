<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('audit_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->nullable()->index();
        $table->string('user_name')->nullable();
        $table->string('action');
        $table->string('module')->index();
        $table->unsignedBigInteger('record_id')->nullable()->index();
        $table->string('record_reference')->nullable();
        $table->text('remarks')->nullable();
        $table->json('before_data')->nullable();
        $table->json('after_data')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
