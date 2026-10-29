<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateAuditPcLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'pc_number' => ['sometimes', 'required', 'string', 'max:50'],
            'master_pc_spec_id' => ['sometimes', 'required', 'integer', 'exists:master_pc_specs,id'],
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

                $audit = $this->route('audit_pc_log');
                $pcNumber = $this->string('pc_number', $audit->pc_number)->trim()->toString();

                $duplicate = \App\Models\AuditPcLog::query()
                    ->whereKeyNot($audit->getKey())
                    ->where('lab_room_id', $audit->lab_room_id)
                    ->where('pc_number', $pcNumber)
                    ->exists();

                if ($duplicate) {
                    $validator->errors()->add('pc_number', 'Nomor PC ini sudah pernah diaudit pada lab tersebut.');
                }
            },
        ];
    }
}
