<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBillRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'period_year' => ['required', 'integer', 'min:2020', 'max:2100'],
            'period_month' => ['required', 'integer', 'min:1', 'max:12'],
            'total_amount' => ['required', 'numeric', 'min:0', 'max:999999999999'],
            'carbon_emission_kg' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $exists = \App\Models\MonthlyElectricityBill::query()
                    ->where('period_year', $this->integer('period_year'))
                    ->where('period_month', $this->integer('period_month'))
                    ->exists();

                if ($exists) {
                    $validator->errors()->add('period_month', 'Tagihan untuk periode ini sudah tercatat.');
                }
            },
        ];
    }
}
