<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('pending_balances', function (Blueprint $table) {
            $table->id();
            $table->string('payer_name');
            $table->decimal('original_amount', 12, 2)->default(0);
            $table->decimal('remaining_balance', 12, 2);
            $table->date('due_date')->nullable();
            $table->string('description')->nullable();
            $table->string('status')->defualt('Pending');
            $table->timestamps();
        });
    }

    public function down():
    void
    {
        Schema::dropIfExists('pending_balances');
    }
};
?>