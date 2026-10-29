<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UrgentIncidentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lab_room_id' => $this->lab_room_id,
            'lab_name' => $this->whenLoaded('labRoom', fn () => $this->labRoom->name),
            'description' => $this->description,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'reporter' => $this->whenLoaded('reporter', fn () => [
                'id' => $this->reporter->id,
                'name' => $this->reporter->name,
            ]),
            'status_updated_by' => $this->whenLoaded('statusUpdatedBy', fn () => $this->statusUpdatedBy ? [
                'id' => $this->statusUpdatedBy->id,
                'name' => $this->statusUpdatedBy->name,
            ] : null),
            'status_note' => $this->status_note,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
