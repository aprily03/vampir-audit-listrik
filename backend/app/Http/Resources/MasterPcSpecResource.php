<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MasterPcSpecResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ram_gb' => $this->ram_gb,
            'storage_gb' => $this->storage_gb,
            'storage_type' => $this->storage_type,
            'label' => $this->label,
            'standby_watt' => (float) $this->standby_watt,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
