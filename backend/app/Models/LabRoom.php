<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'location', 'capacity', 'is_active'])]
class LabRoom extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function audits(): HasMany
    {
        return $this->hasMany(AuditPcLog::class);
    }

    public function panelLimits(): HasMany
    {
        return $this->hasMany(PanelLimit::class);
    }

    public function panelReadings(): HasMany
    {
        return $this->hasMany(PanelReading::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(UrgentIncident::class);
    }
}
