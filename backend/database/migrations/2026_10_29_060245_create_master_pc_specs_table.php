<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_pc_specs', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('ram_gb');
            $table->unsignedInteger('storage_gb');
            $table->string('storage_type', 20)->default('SSD');
            $table->decimal('standby_watt', 8, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['ram_gb', 'storage_gb', 'storage_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_pc_specs');
    }
};
