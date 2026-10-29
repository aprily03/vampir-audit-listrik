<?php

namespace Database\Seeders;

use App\Enums\IncidentStatus;
use App\Models\LabRoom;
use App\Models\UrgentIncident;
use App\Models\User;
use Illuminate\Database\Seeder;

class IncidentSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@unklab.ac.id')->firstOrFail();
        $maintenance = User::query()->where('email', 'maintenance@unklab.ac.id')->firstOrFail();

        $incidents = [
            [
                'lab' => 'Lab 3',
                'description' => 'AC ruang utama tidak mendingin sejak pukul 09.00; suhu ruang meningkat.',
                'status' => IncidentStatus::BARU,
                'created_at' => now()->subHours(2),
                'status_note' => null,
            ],
            [
                'lab' => 'Lab 5',
                'description' => 'Beban grup stopkontak meja tengah mendekati batas 10 A.',
                'status' => IncidentStatus::DITINJAU,
                'created_at' => now()->subHours(6),
                'status_note' => 'Menunggu pemeriksaan beban per meja.',
            ],
            [
                'lab' => 'Lab 2',
                'description' => 'Lampu indikator panel berkedip dan tegangan tidak stabil saat semua PC menyala.',
                'status' => IncidentStatus::DALAM_PENANGANAN,
                'created_at' => now()->subDay(),
                'status_note' => 'Teknisi sedang memeriksa koneksi panel.',
            ],
            [
                'lab' => 'Lab 1',
                'description' => 'Saklar stopkontak dinding terasa panas saat jam praktikum.',
                'status' => IncidentStatus::SELESAI,
                'created_at' => now()->subDays(3),
                'status_note' => 'Saklar sudah diganti dan diuji.',
            ],
        ];

        foreach ($incidents as $data) {
            $lab = LabRoom::query()->where('name', $data['lab'])->firstOrFail();

            UrgentIncident::query()->firstOrCreate(
                ['lab_room_id' => $lab->id, 'description' => $data['description']],
                [
                    'reported_by' => $admin->id,
                    'status' => $data['status'],
                    'status_updated_by' => $data['status'] === IncidentStatus::BARU ? null : $maintenance->id,
                    'status_updated_at' => $data['status'] === IncidentStatus::BARU ? null : $data['created_at']->copy()->addMinutes(45),
                    'status_note' => $data['status_note'],
                    'resolved_at' => $data['status'] === IncidentStatus::SELESAI ? $data['created_at']->copy()->addHours(4) : null,
                    'created_at' => $data['created_at'],
                    'updated_at' => $data['status'] === IncidentStatus::BARU ? $data['created_at'] : $data['created_at']->copy()->addMinutes(45),
                ]
            );
        }
    }
}
