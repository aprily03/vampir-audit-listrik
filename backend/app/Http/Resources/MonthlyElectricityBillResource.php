<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MonthlyElectricityBillResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'period_year' => $this->period_year,
            'period_month' => $this->period_month,
            'period_label' => $this->period_label,
            'total_amount' => (float) $this->total_amount,
            'carbon_emission_kg' => $this->carbon_emission_kg !== null ? (float) $this->carbon_emission_kg : null,
            'notes' => $this->notes,
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
