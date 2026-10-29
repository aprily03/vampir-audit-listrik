<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'lab_room_id',
    'pc_number',
    'master_pc_spec_id',
    'ram_gb_snapshot',
    'storage_gb_snapshot',
    'storage_type_snapshot',
    'standby_watt_snapshot',
    'is_faulty',
    'fault_note',
    'audited_by',
    'audited_at',
])]
class AuditPcLog extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'ram_gb_snapshot' => 'integer',
            'storage_gb_snapshot' => 'integer',
            'standby_watt_snapshot' => 'decimal:2',
            'is_faulty' => 'boolean',
            'audited_at' => 'datetime',
        ];
    }

    public function labRoom(): BelongsTo
    {
        return $this->belongsTo(LabRoom::class);
    }

    public function masterSpec(): BelongsTo
    {
        return $this->belongsTo(MasterPcSpec::class, 'master_pc_spec_id');
    }

    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'audited_by');
    }
}
