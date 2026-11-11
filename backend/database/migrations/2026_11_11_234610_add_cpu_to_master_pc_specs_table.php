<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('master_pc_specs', function (Blueprint $table) {
            $table->string('cpu', 100)->nullable()->after('storage_type');
        });
    }

    public function down(): void
    {
        Schema::table('master_pc_specs', function (Blueprint $table) {
            $table->dropColumn('cpu');
        });
    }
};
