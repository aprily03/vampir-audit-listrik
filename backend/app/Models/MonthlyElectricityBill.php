<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['period_year', 'period_month', 'total_amount', 'carbon_emission_kg', 'notes', 'created_by'])]
class MonthlyElectricityBill extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'period_year' => 'integer',
            'period_month' => 'integer',
            'total_amount' => 'decimal:2',
            'carbon_emission_kg' => 'decimal:2',
        ];
    }

    protected function periodLabel(): Attribute
    {
        return Attribute::get(
            fn (): string => sprintf('%02d/%d', $this->period_month, $this->period_year)
        );
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
