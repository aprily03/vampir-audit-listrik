<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_pc_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_room_id')->constrained()->cascadeOnDelete();
            $table->string('pc_number', 50);
            $table->foreignId('master_pc_spec_id')->constrained('master_pc_specs')->restrictOnDelete();
            $table->unsignedSmallInteger('ram_gb_snapshot');
            $table->unsignedInteger('storage_gb_snapshot');
            $table->string('storage_type_snapshot', 20);
            $table->decimal('standby_watt_snapshot', 8, 2);
            $table->boolean('is_faulty')->default(false);
            $table->text('fault_note')->nullable();
            $table->foreignId('audited_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('audited_at');
            $table->timestamps();

            $table->unique(['lab_room_id', 'pc_number']);
            $table->index(['lab_room_id', 'audited_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_pc_logs');
    }
};
