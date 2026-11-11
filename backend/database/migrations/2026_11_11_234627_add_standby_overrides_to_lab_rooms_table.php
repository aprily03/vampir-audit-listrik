<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lab_rooms', function (Blueprint $table) {
            $table->decimal('standby_hours_per_day', 4, 2)->nullable()->after('capacity');
            $table->decimal('standby_days_per_month', 5, 2)->nullable()->after('standby_hours_per_day');
        });
    }

    public function down(): void
    {
        Schema::table('lab_rooms', function (Blueprint $table) {
            $table->dropColumn(['standby_hours_per_day', 'standby_days_per_month']);
        });
    }
};
