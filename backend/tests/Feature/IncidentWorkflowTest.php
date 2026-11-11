<?php

namespace Tests\Feature;

use App\Enums\IncidentStatus;
use App\Enums\UserRole;
use App\Models\LabRoom;
use App\Models\UrgentIncident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IncidentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_incident_moves_forward_and_cannot_move_backwards(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $lab = LabRoom::query()->create([
            'name' => 'Lab Uji',
            'location' => 'Gedung Uji',
            'capacity' => 20,
        ]);

        $incident = UrgentIncident::query()->create([
            'lab_room_id' => $lab->id,
            'reported_by' => $admin->id,
            'description' => 'AC tidak mendingin.',
            'status' => IncidentStatus::Baru,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/incidents/{$incident->id}/status", [
            'status' => IncidentStatus::Ditangani->value,
            'note' => 'Teknisi sedang memeriksa.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', IncidentStatus::Ditangani->value)
            ->assertJsonPath('data.status_note', 'Teknisi sedang memeriksa.')
            ->assertJsonPath('data.resolved_at', null);

        $this->assertDatabaseHas('urgent_incidents', [
            'id' => $incident->id,
            'status' => IncidentStatus::Ditangani->value,
            'status_updated_by' => $admin->id,
        ]);

        $this->patchJson("/api/incidents/{$incident->id}/status", [
            'status' => IncidentStatus::Selesai->value,
            'note' => 'AC sudah normal.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', IncidentStatus::Selesai->value);

        $this->assertNotNull($incident->refresh()->resolved_at);

        $this->patchJson("/api/incidents/{$incident->id}/status", [
            'status' => IncidentStatus::Ditangani->value,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertSame(IncidentStatus::Selesai, $incident->refresh()->status);
    }

    public function test_incident_cannot_skip_a_step_or_use_a_removed_status(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::ADMIN,
            'is_active' => true,
        ]);

        $lab = LabRoom::query()->create([
            'name' => 'Lab Uji',
            'capacity' => 20,
        ]);

        $incident = UrgentIncident::query()->create([
            'lab_room_id' => $lab->id,
            'reported_by' => $admin->id,
            'description' => 'Panel terasa panas.',
            'status' => IncidentStatus::Baru,
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/incidents/{$incident->id}/status", [
            'status' => IncidentStatus::Selesai->value,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->patchJson("/api/incidents/{$incident->id}/status", [
            'status' => 'DITINJAU',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertSame(IncidentStatus::Baru, $incident->refresh()->status);
    }
}
