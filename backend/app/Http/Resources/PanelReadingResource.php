<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PanelReadingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lab_room_id' => $this->lab_room_id,
            'lab_name' => $this->whenLoaded('labRoom', fn () => $this->labRoom->name),
            'group_type' => $this->group_type->value,
            'group_label' => $this->group_type->label(),
            'load_watt' => (float) $this->load_watt,
            'source' => $this->source,
            'recorded_at' => $this->recorded_at?->toIso8601String(),
            'notes' => $this->notes,
            'recorder' => $this->whenLoaded('recorder', fn () => [
                'id' => $this->recorder->id,
                'name' => $this->recorder->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
