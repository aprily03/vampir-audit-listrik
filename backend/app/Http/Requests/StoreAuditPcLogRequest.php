<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAuditPcLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lab_room_id' => ['required', 'integer', 'exists:lab_rooms,id'],
            'pc_number' => ['required', 'string', 'max:50'],
            'master_pc_spec_id' => ['required', 'integer', 'exists:master_pc_specs,id'],
            'is_faulty' => ['sometimes', 'boolean'],
            'fault_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $duplicate = \App\Models\AuditPcLog::query()
                    ->where('lab_room_id', $this->integer('lab_room_id'))
                    ->where('pc_number', $this->string('pc_number')->trim()->toString())
                    ->exists();

                if ($duplicate) {
                    $validator->errors()->add('pc_number', 'Nomor PC ini sudah pernah diaudit pada lab tersebut.');
                }
            },
        ];
    }
}
