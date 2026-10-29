<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreIncidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lab_room_id' => ['required', 'integer', 'exists:lab_rooms,id'],
            'description' => ['required', 'string', 'max:2000'],
        ];
    }
}
