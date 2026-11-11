<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use App\Models\User;
use App\Services\LabAuditSummaryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LabStandbyOverrideTest extends TestCase
{
    use RefreshDatabase;

    public function test_per_lab_standby_override_changes_lab_and_total_estimates(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $defaultLab = LabRoom::query()->create([
            'name' => 'Lab Default',
            'capacity' => 10,
        ]);

        $overrideLab = LabRoom::query()->create([
            'name' => 'Lab Khusus',
            'capacity' => 10,
            'standby_hours_per_day' => 4,
            'standby_days_per_month' => 20,
        ]);

        $spec = MasterPcSpec::query()->create([
            'ram_gb' => 16,
            'storage_gb' => 512,
            'storage_type' => 'SSD',
            'standby_watt' => 100,
            'is_active' => true,
        ]);

        foreach ([$defaultLab, $overrideLab] as $lab) {
            AuditPcLog::query()->create([
                'lab_room_id' => $lab->id,
                'pc_number' => 'PC-01',
                'master_pc_spec_id' => $spec->id,
                'ram_gb_snapshot' => $spec->ram_gb,
                'storage_gb_snapshot' => $spec->storage_gb,
                'storage_type_snapshot' => $spec->storage_type,
                'standby_watt_snapshot' => $spec->standby_watt,
                'is_faulty' => false,
                'audited_by' => $admin->id,
                'audited_at' => now(),
            ]);
        }

        $summary = app(LabAuditSummaryService::class);
        $labs = collect($summary->labs())->keyBy('name');

        $this->assertEqualsWithDelta(8, $labs['Lab Default']['energy']['hours_per_day'], 0.001);
        $this->assertEqualsWithDelta(30, $labs['Lab Default']['energy']['days_per_month'], 0.001);
        $this->assertEqualsWithDelta(24, $labs['Lab Default']['energy']['kwh_per_month'], 0.001);

        $this->assertEqualsWithDelta(4, $labs['Lab Khusus']['energy']['hours_per_day'], 0.001);
        $this->assertEqualsWithDelta(20, $labs['Lab Khusus']['energy']['days_per_month'], 0.001);
        $this->assertEqualsWithDelta(8, $labs['Lab Khusus']['energy']['kwh_per_month'], 0.001);

        $totals = $summary->totals($labs->values()->all());

        $this->assertEqualsWithDelta(32, $totals['kwh_per_month'], 0.001);
    }

    public function test_admin_can_set_and_reset_a_lab_standby_override(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $lab = LabRoom::query()->create([
            'name' => 'Lab Uji',
            'capacity' => 20,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/labs/{$lab->id}", [
            'standby_hours_per_day' => 6,
            'standby_days_per_month' => 22,
        ])
            ->assertOk()
            ->assertJsonPath('data.standby_hours_per_day', 6)
            ->assertJsonPath('data.standby_days_per_month', 22);

        $this->assertDatabaseHas('lab_rooms', [
            'id' => $lab->id,
            'standby_hours_per_day' => 6,
            'standby_days_per_month' => 22,
        ]);

        $this->patchJson("/api/labs/{$lab->id}", [
            'standby_hours_per_day' => null,
            'standby_days_per_month' => null,
        ])
            ->assertOk()
            ->assertJsonPath('data.standby_hours_per_day', null)
            ->assertJsonPath('data.standby_days_per_month', null);

        $this->assertDatabaseHas('lab_rooms', [
            'id' => $lab->id,
            'standby_hours_per_day' => null,
            'standby_days_per_month' => null,
        ]);

        $this->patchJson("/api/labs/{$lab->id}", [
            'standby_hours_per_day' => 25,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('standby_hours_per_day');
    }
}
