<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('panel_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_room_id')->constrained()->cascadeOnDelete();
            $table->enum('group_type', ['SOCKET', 'AC']);
            $table->decimal('load_watt', 10, 2);
            $table->string('source', 50)->default('MANUAL_ESTIMATE');
            $table->timestamp('recorded_at');
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['lab_room_id', 'group_type', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('panel_readings');
    }
};
