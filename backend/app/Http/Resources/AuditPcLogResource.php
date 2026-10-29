<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditPcLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lab_room_id' => $this->lab_room_id,
            'lab_name' => $this->whenLoaded('labRoom', fn () => $this->labRoom->name),
            'pc_number' => $this->pc_number,
            'master_pc_spec_id' => $this->master_pc_spec_id,
            'spec' => [
                'ram_gb' => $this->ram_gb_snapshot,
                'storage_gb' => $this->storage_gb_snapshot,
                'storage_type' => $this->storage_type_snapshot,
                'standby_watt' => (float) $this->standby_watt_snapshot,
                'label' => "{$this->ram_gb_snapshot} GB RAM · {$this->storage_gb_snapshot} GB {$this->storage_type_snapshot}",
            ],
            'is_faulty' => $this->is_faulty,
            'fault_note' => $this->fault_note,
            'auditor' => $this->whenLoaded('auditor', fn () => [
                'id' => $this->auditor->id,
                'name' => $this->auditor->name,
            ]),
            'audited_at' => $this->audited_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
