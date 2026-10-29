<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PanelLimitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lab_room_id' => $this->lab_room_id,
            'lab_name' => $this->whenLoaded('labRoom', fn () => $this->labRoom->name),
            'group_type' => $this->group_type->value,
            'group_label' => $this->group_type->label(),
            'limit_ampere' => (float) $this->limit_ampere,
            'voltage' => (float) $this->voltage,
            'limit_watt' => $this->limit_watt,
            'warning_percent' => $this->warning_percent,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
