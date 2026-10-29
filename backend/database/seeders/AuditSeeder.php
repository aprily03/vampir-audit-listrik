<?php

namespace Database\Seeders;

use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use App\Models\User;
use Illuminate\Database\Seeder;

class AuditSeeder extends Seeder
{
    public function run(): void
    {
        $specs = MasterPcSpec::query()->orderBy('id')->get();
        $auditors = User::query()->whereIn('email', ['auditor@unklab.ac.id', 'auditor2@unklab.ac.id'])->get();

        $targets = [
            'Lab 1' => 18,
            'Lab 2' => 26,
            'Lab 3' => 12,
        ];

        foreach ($targets as $labName => $unitCount) {
            $lab = LabRoom::query()->where('name', $labName)->firstOrFail();

            for ($i = 1; $i <= $unitCount; $i++) {
                $spec = $specs[($i - 1) % $specs->count()];
                $isFaulty = in_array($i, [4, 9, 17], true);
                $auditor = $auditors[($i - 1) % $auditors->count()];
                $auditedAt = now()->subDays(($i % 6) + 1)->setTime(8 + ($i % 7), ($i * 7) % 60);

                AuditPcLog::query()->updateOrCreate(
                    ['lab_room_id' => $lab->id, 'pc_number' => sprintf('PC-%02d', $i)],
                    [
                        'master_pc_spec_id' => $spec->id,
                        'ram_gb_snapshot' => $spec->ram_gb,
                        'storage_gb_snapshot' => $spec->storage_gb,
                        'storage_type_snapshot' => $spec->storage_type,
                        'standby_watt_snapshot' => $spec->standby_watt,
                        'is_faulty' => $isFaulty,
                        'fault_note' => $isFaulty
                            ? 'Unit tidak menyala stabil; perlu pemeriksaan daya.'
                            : null,
                        'audited_by' => $auditor->id,
                        'audited_at' => $auditedAt,
                    ]
                );
            }
        }
    }
}
