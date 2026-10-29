<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'standby_hours_per_day' => ['sometimes', 'required', 'numeric', 'min:0', 'max:24'],
            'standby_days_per_month' => ['sometimes', 'required', 'numeric', 'min:1', 'max:31'],
            'tariff_per_kwh' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:1000000'],
            'emission_factor_kg_per_kwh' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
            'default_warning_percent' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
            'incident_poll_seconds' => ['sometimes', 'required', 'integer', 'min:3', 'max:60'],
            'active_pc_watt' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:10000'],
        ];
    }
}
