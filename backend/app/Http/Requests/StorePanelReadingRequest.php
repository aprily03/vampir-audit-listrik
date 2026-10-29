<?php

namespace App\Http\Requests;

use App\Enums\PanelGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePanelReadingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lab_room_id' => ['required', 'integer', 'exists:lab_rooms,id'],
            'group_type' => ['required', Rule::enum(PanelGroup::class)],
            'load_watt' => ['required', 'numeric', 'min:0', 'max:100000'],
            'source' => ['sometimes', 'string', Rule::in(['MANUAL_ESTIMATE', 'MANUAL_MEASUREMENT'])],
            'recorded_at' => ['nullable', 'date', 'before_or_equal:now'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
