<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_pc_logs', function (Blueprint $table) {
            $table->string('cpu_snapshot', 100)->nullable()->after('storage_type_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('audit_pc_logs', function (Blueprint $table) {
            $table->dropColumn('cpu_snapshot');
        });
    }
};
