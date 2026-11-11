<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['ram_gb', 'storage_gb', 'storage_type', 'cpu', 'standby_watt', 'is_active'])]
class MasterPcSpec extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'ram_gb' => 'integer',
            'storage_gb' => 'integer',
            'standby_watt' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    protected function label(): Attribute
    {
        return Attribute::get(
            fn (): string => trim(
                "{$this->ram_gb} GB RAM · {$this->storage_gb} GB {$this->storage_type}"
                .($this->cpu ? " · {$this->cpu}" : '')
            )
        );
    }

    public function audits(): HasMany
    {
        return $this->hasMany(AuditPcLog::class);
    }
}
