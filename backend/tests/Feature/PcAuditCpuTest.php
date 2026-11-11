<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\LabRoom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PcAuditCpuTest extends TestCase
{
    use RefreshDatabase;

    public function test_cpu_is_optional_on_master_specs_and_snapshotted_on_audit(): void
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

        $withCpu = $this->postJson('/api/specs', [
            'ram_gb' => 16,
            'storage_gb' => 512,
            'storage_type' => 'SSD',
            'cpu' => 'Intel Core i5-12400',
            'standby_watt' => 6.5,
        ]);

        $withCpu
            ->assertCreated()
            ->assertJsonPath('data.cpu', 'Intel Core i5-12400');

        $this->postJson('/api/specs', [
            'ram_gb' => 8,
            'storage_gb' => 256,
            'storage_type' => 'HDD',
            'cpu' => '   ',
            'standby_watt' => 4,
        ])
            ->assertCreated()
            ->assertJsonPath('data.cpu', null);

        $this->postJson('/api/audits', [
            'lab_room_id' => $lab->id,
            'pc_number' => 'PC-01',
            'master_pc_spec_id' => $withCpu->json('data.id'),
        ])
            ->assertCreated()
            ->assertJsonPath('data.spec.cpu', 'Intel Core i5-12400')
            ->assertJsonPath('data.spec.label', '16 GB RAM · 512 GB SSD · Intel Core i5-12400');

        $this->assertDatabaseHas('audit_pc_logs', [
            'lab_room_id' => $lab->id,
            'pc_number' => 'PC-01',
            'cpu_snapshot' => 'Intel Core i5-12400',
        ]);
    }
}
