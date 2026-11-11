<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLabRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:60', 'unique:lab_rooms,name'],
            'location' => ['nullable', 'string', 'max:150'],
            'capacity' => ['required', 'integer', 'min:1', 'max:500'],
            'standby_hours_per_day' => ['nullable', 'numeric', 'min:0', 'max:24'],
            'standby_days_per_month' => ['nullable', 'numeric', 'min:1', 'max:31'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
