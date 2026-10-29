<?php

namespace Database\Seeders;

use App\Enums\PanelGroup;
use App\Models\LabRoom;
use App\Models\PanelLimit;
use App\Models\PanelReading;
use App\Models\User;
use Illuminate\Database\Seeder;

class PanelSeeder extends Seeder
{
    public function run(): void
    {
        $maintenance = User::query()->where('email', 'maintenance@unklab.ac.id')->firstOrFail();

        foreach (LabRoom::query()->orderBy('name')->get() as $lab) {
            foreach ([[PanelGroup::SOCKET, 10], [PanelGroup::AC, 40]] as [$group, $ampere]) {
                PanelLimit::query()->updateOrCreate(
                    ['lab_room_id' => $lab->id, 'group_type' => $group],
                    [
                        'limit_ampere' => $ampere,
                        'voltage' => 220,
                        'warning_percent' => 80,
                    ]
                );
            }
        }

        $readings = [
            ['Lab 1', PanelGroup::SOCKET, 1900, 'Estimasi dari pemakaian grup meja depan.'],
            ['Lab 2', PanelGroup::AC, 8900, 'Pengukuran manual saat jam kuliah.'],
            ['Lab 3', PanelGroup::SOCKET, 2020, 'Beban puncak sore, mendekati batas.'],
            ['Lab 3', PanelGroup::AC, 5000, 'Pengukuran manual pagi.'],
            ['Lab 5', PanelGroup::SOCKET, 1600, 'Estimasi pemakaian normal.'],
        ];

        $recordedAt = now()->subDay()->setTime(9, 0);

        foreach ($readings as [$labName, $group, $watt, $notes]) {
            $lab = LabRoom::query()->where('name', $labName)->firstOrFail();

            PanelReading::query()->firstOrCreate(
                [
                    'lab_room_id' => $lab->id,
                    'group_type' => $group,
                    'recorded_at' => $recordedAt,
                ],
                [
                    'load_watt' => $watt,
                    'source' => str_contains($notes, 'Pengukuran') ? 'MANUAL_MEASUREMENT' : 'MANUAL_ESTIMATE',
                    'recorded_by' => $maintenance->id,
                    'notes' => $notes,
                ]
            );
        }
    }
}
