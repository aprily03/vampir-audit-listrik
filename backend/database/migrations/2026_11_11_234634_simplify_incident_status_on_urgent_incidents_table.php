<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->changeStatusColumn(['BARU', 'DITINJAU', 'DALAM_PENANGANAN', 'DITANGANI', 'SELESAI']);

        DB::table('urgent_incidents')
            ->whereIn('status', ['DITINJAU', 'DALAM_PENANGANAN'])
            ->update(['status' => 'DITANGANI']);

        $this->changeStatusColumn(['BARU', 'DITANGANI', 'SELESAI']);
    }

    public function down(): void
    {
        $this->changeStatusColumn(['BARU', 'DITINJAU', 'DALAM_PENANGANAN', 'DITANGANI', 'SELESAI']);

        DB::table('urgent_incidents')
            ->where('status', 'DITANGANI')
            ->update(['status' => 'DITINJAU']);

        $this->changeStatusColumn(['BARU', 'DITINJAU', 'DALAM_PENANGANAN', 'SELESAI']);
    }

    /**
     * @param  array<int, string>  $statuses
     */
    private function changeStatusColumn(array $statuses): void
    {
        if (DB::getDriverName() === 'mysql') {
            $values = collect($statuses)
                ->map(fn (string $status): string => "'{$status}'")
                ->implode(', ');

            DB::statement("ALTER TABLE urgent_incidents MODIFY status ENUM({$values}) NOT NULL DEFAULT 'BARU'");

            return;
        }

        Schema::table('urgent_incidents', function (Blueprint $table) use ($statuses) {
            $table->enum('status', $statuses)->default('BARU')->change();
        });
    }
};
