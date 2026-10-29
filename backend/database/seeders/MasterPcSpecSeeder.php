<?php

namespace Database\Seeders;

use App\Models\MasterPcSpec;
use Illuminate\Database\Seeder;

class MasterPcSpecSeeder extends Seeder
{
    public function run(): void
    {
        $specs = [
            ['ram_gb' => 4, 'storage_gb' => 256, 'storage_type' => 'SSD', 'standby_watt' => 4.5],
            ['ram_gb' => 8, 'storage_gb' => 256, 'storage_type' => 'SSD', 'standby_watt' => 5.0],
            ['ram_gb' => 8, 'storage_gb' => 512, 'storage_type' => 'SSD', 'standby_watt' => 5.0],
            ['ram_gb' => 16, 'storage_gb' => 256, 'storage_type' => 'SSD', 'standby_watt' => 5.2],
            ['ram_gb' => 16, 'storage_gb' => 512, 'storage_type' => 'SSD', 'standby_watt' => 5.5],
            ['ram_gb' => 16, 'storage_gb' => 512, 'storage_type' => 'NVME', 'standby_watt' => 5.0],
            ['ram_gb' => 32, 'storage_gb' => 512, 'storage_type' => 'SSD', 'standby_watt' => 6.0],
            ['ram_gb' => 32, 'storage_gb' => 1024, 'storage_type' => 'NVME', 'standby_watt' => 6.5],
        ];

        foreach ($specs as $spec) {
            MasterPcSpec::query()->updateOrCreate(
                [
                    'ram_gb' => $spec['ram_gb'],
                    'storage_gb' => $spec['storage_gb'],
                    'storage_type' => $spec['storage_type'],
                ],
                [...$spec, 'is_active' => true]
            );
        }
    }
}
