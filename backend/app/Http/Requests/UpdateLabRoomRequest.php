<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLabRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $labRoom = $this->route('lab_room');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:60', Rule::unique('lab_rooms', 'name')->ignore($labRoom)],
            'location' => ['nullable', 'string', 'max:150'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1', 'max:500'],
            'standby_hours_per_day' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:24'],
            'standby_days_per_month' => ['sometimes', 'nullable', 'numeric', 'min:1', 'max:31'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
