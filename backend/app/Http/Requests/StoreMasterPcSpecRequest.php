<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreMasterPcSpecRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ram_gb' => ['required', 'integer', 'min:1', 'max:1024'],
            'storage_gb' => ['required', 'integer', 'min:1', 'max:100000'],
            'storage_type' => ['required', 'string', Rule::in(['SSD', 'HDD', 'NVME'])],
            'standby_watt' => ['required', 'numeric', 'gt:0', 'max:10000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $exists = \App\Models\MasterPcSpec::query()
                    ->where('ram_gb', $this->integer('ram_gb'))
                    ->where('storage_gb', $this->integer('storage_gb'))
                    ->where('storage_type', strtoupper($this->string('storage_type')->toString()))
                    ->exists();

                if ($exists) {
                    $validator->errors()->add('ram_gb', 'Kombinasi RAM, kapasitas, dan tipe penyimpanan sudah ada.');
                }
            },
        ];
    }
}
