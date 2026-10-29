<?php

namespace App\Models;

use App\Enums\PanelGroup;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['lab_room_id', 'group_type', 'load_watt', 'source', 'recorded_at', 'recorded_by', 'notes'])]
class PanelReading extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'group_type' => PanelGroup::class,
            'load_watt' => 'decimal:2',
            'recorded_at' => 'datetime',
        ];
    }

    public function labRoom(): BelongsTo
    {
        return $this->belongsTo(LabRoom::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
