<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('panel_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_room_id')->constrained()->cascadeOnDelete();
            $table->enum('group_type', ['SOCKET', 'AC']);
            $table->decimal('limit_ampere', 8, 2);
            $table->decimal('voltage', 8, 2)->default(220);
            $table->unsignedTinyInteger('warning_percent')->default(80);
            $table->timestamps();

            $table->unique(['lab_room_id', 'group_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('panel_limits');
    }
};
