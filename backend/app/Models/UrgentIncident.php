<?php

namespace App\Models;

use App\Enums\IncidentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'lab_room_id',
    'reported_by',
    'description',
    'status',
    'status_updated_by',
    'status_updated_at',
    'status_note',
    'resolved_at',
])]
class UrgentIncident extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => IncidentStatus::class,
            'status_updated_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function labRoom(): BelongsTo
    {
        return $this->belongsTo(LabRoom::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function statusUpdatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'status_updated_by');
    }
}
