<?php

namespace Database\Seeders;

use App\Models\MonthlyElectricityBill;
use App\Models\User;
use Illuminate\Database\Seeder;

class MonthlyBillSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->where('email', 'admin@unklab.ac.id')->firstOrFail();

        $bills = [
            1 => 62400000,
            2 => 64100000,
            3 => 63800000,
            4 => 66500000,
            5 => 65200000,
            6 => 67800000,
            7 => 66900000,
            8 => 69400000,
            9 => 68700000,
            10 => 71200000,
        ];

        foreach ($bills as $month => $amount) {
            MonthlyElectricityBill::query()->updateOrCreate(
                ['period_year' => 2026, 'period_month' => $month],
                [
                    'total_amount' => $amount,
                    'carbon_emission_kg' => $month === 9 ? 52500 : null,
                    'notes' => $month === 9 ? 'Nilai emisi pada tagihan diisi manual oleh admin.' : null,
                    'created_by' => $admin->id,
                ]
            );
        }
    }
}
