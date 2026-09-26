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
        // Only add purpose if it does not already exist.
        if (!Schema::hasColumn('receipts', 'purpose')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->string('purpose')->nullable()->after('collection_type');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only remove purpose if it exists.
        if (Schema::hasColumn('receipts', 'purpose')) {
            Schema::table('receipts', function (Blueprint $table) {
                $table->dropColumn('purpose');
            });
        }
    }
};