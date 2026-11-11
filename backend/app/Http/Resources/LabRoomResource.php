<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LabRoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'capacity' => $this->capacity,
            'standby_hours_per_day' => $this->standby_hours_per_day !== null ? (float) $this->standby_hours_per_day : null,
            'standby_days_per_month' => $this->standby_days_per_month !== null ? (float) $this->standby_days_per_month : null,
            'is_active' => $this->is_active,
            'audited_count' => $this->whenCounted('audits'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
