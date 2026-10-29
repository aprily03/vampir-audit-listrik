<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
