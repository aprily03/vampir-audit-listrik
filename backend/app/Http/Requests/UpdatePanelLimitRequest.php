<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePanelLimitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'limit_ampere' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:1000'],
            'voltage' => ['sometimes', 'required', 'numeric', 'min:100', 'max:400'],
            'warning_percent' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
