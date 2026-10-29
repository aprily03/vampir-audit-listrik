<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'key' => $this->key,
            'value' => $this->value,
            'updated_by' => $this->whenLoaded('updater', fn () => $this->updater?->name),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
