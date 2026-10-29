<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $password = 'Vampir#2026';

        $users = [
            ['name' => 'Yudi Kristiawan', 'email' => 'admin@unklab.ac.id', 'role' => UserRole::ADMIN],
            ['name' => 'Grace Worang', 'email' => 'admin2@unklab.ac.id', 'role' => UserRole::ADMIN],
            ['name' => 'Maya Lumenta', 'email' => 'auditor@unklab.ac.id', 'role' => UserRole::AUDITOR],
            ['name' => 'Rendi Tumewu', 'email' => 'auditor2@unklab.ac.id', 'role' => UserRole::AUDITOR],
            ['name' => 'Riko Mamentu', 'email' => 'maintenance@unklab.ac.id', 'role' => UserRole::MAINTENANCE],
            ['name' => 'Nadia Sondakh', 'email' => 'pimpinan@unklab.ac.id', 'role' => UserRole::PIMPINAN],
        ];

        foreach ($users as $user) {
            User::query()->updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => $password,
                    'role' => $user['role'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
