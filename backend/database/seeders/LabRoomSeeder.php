<?php

namespace Database\Seeders;

use App\Models\LabRoom;
use Illuminate\Database\Seeder;

class LabRoomSeeder extends Seeder
{
    public function run(): void
    {
        $labs = [
            ['name' => 'Lab 1', 'location' => 'Gedung FIK · Lantai 2', 'capacity' => 38],
            ['name' => 'Lab 2', 'location' => 'Gedung FIK · Lantai 2', 'capacity' => 40],
            ['name' => 'Lab 3', 'location' => 'Gedung FIK · Lantai 2', 'capacity' => 36],
            ['name' => 'Lab 4', 'location' => 'Gedung FIK · Lantai 3', 'capacity' => 39],
            ['name' => 'Lab 5', 'location' => 'Gedung FIK · Lantai 3', 'capacity' => 40],
            ['name' => 'Lab 6', 'location' => 'Gedung FIK · Lantai 3', 'capacity' => 37],
        ];

        foreach ($labs as $lab) {
            LabRoom::query()->updateOrCreate(
                ['name' => $lab['name']],
                [...$lab, 'is_active' => true]
            );
        }
    }
}
