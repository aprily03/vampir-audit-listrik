<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateMasterPcSpecRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ram_gb' => ['sometimes', 'required', 'integer', 'min:1', 'max:1024'],
            'storage_gb' => ['sometimes', 'required', 'integer', 'min:1', 'max:100000'],
            'storage_type' => ['sometimes', 'required', 'string', Rule::in(['SSD', 'HDD', 'NVME'])],
            'standby_watt' => ['sometimes', 'required', 'numeric', 'gt:0', 'max:10000'],
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

                $spec = $this->route('master_pc_spec');
                $ram = $this->integer('ram_gb', $spec->ram_gb);
                $storage = $this->integer('storage_gb', $spec->storage_gb);
                $type = strtoupper($this->string('storage_type', $spec->storage_type)->toString());

                $exists = \App\Models\MasterPcSpec::query()
                    ->whereKeyNot($spec->getKey())
                    ->where('ram_gb', $ram)
                    ->where('storage_gb', $storage)
                    ->where('storage_type', $type)
                    ->exists();

                if ($exists) {
                    $validator->errors()->add('ram_gb', 'Kombinasi RAM, kapasitas, dan tipe penyimpanan sudah ada.');
                }
            },
        ];
    }
}
