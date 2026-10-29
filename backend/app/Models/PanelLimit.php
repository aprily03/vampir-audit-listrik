<?php

namespace App\Models;

use App\Enums\PanelGroup;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['lab_room_id', 'group_type', 'limit_ampere', 'voltage', 'warning_percent'])]
class PanelLimit extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'group_type' => PanelGroup::class,
            'limit_ampere' => 'decimal:2',
            'voltage' => 'decimal:2',
            'warning_percent' => 'integer',
        ];
    }

    protected function limitWatt(): Attribute
    {
        return Attribute::get(
            fn (): float => round((float) $this->limit_ampere * (float) $this->voltage, 2)
        );
    }

    public function labRoom(): BelongsTo
    {
        return $this->belongsTo(LabRoom::class);
    }
}
