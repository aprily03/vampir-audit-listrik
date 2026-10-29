<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Collection;

class EnergyCalculator
{
    private ?array $parameters = null;

    public function flush(): void
    {
        $this->parameters = null;
    }

    public function parameters(): array
    {
        if ($this->parameters !== null) {
            return $this->parameters;
        }

        $defaults = config('vampir.defaults');
        $stored = Setting::query()->pluck('value', 'key');

        $resolve = function (string $key) use ($defaults, $stored): float {
            $value = $stored->get($key);

            return $value !== null && is_numeric($value) ? (float) $value : (float) $defaults[$key];
        };

        return $this->parameters = [
            'standby_hours_per_day' => $resolve('standby_hours_per_day'),
            'standby_days_per_month' => $resolve('standby_days_per_month'),
            'tariff_per_kwh' => $resolve('tariff_per_kwh'),
            'emission_factor_kg_per_kwh' => $resolve('emission_factor_kg_per_kwh'),
            'default_warning_percent' => (int) $resolve('default_warning_percent'),
            'incident_poll_seconds' => (int) $resolve('incident_poll_seconds'),
            'active_pc_watt' => $resolve('active_pc_watt'),
        ];
    }

    /**
     * Estimasi energi standby bulanan dari total watt standby unit yang diaudit.
     */
    public function monthlyEstimate(float $totalStandbyWatt, ?array $parameters = null): array
    {
        $parameters ??= $this->parameters();
        $hoursPerDay = $parameters['standby_hours_per_day'];
        $daysPerMonth = $parameters['standby_days_per_month'];
        $kwh = ($totalStandbyWatt * $hoursPerDay * $daysPerMonth) / 1000;
        $cost = $kwh * $parameters['tariff_per_kwh'];
        $emission = $kwh * $parameters['emission_factor_kg_per_kwh'];

        return [
            'total_standby_watt' => round($totalStandbyWatt, 2),
            'hours_per_day' => round($hoursPerDay, 2),
            'days_per_month' => round($daysPerMonth, 2),
            'kwh_per_month' => round($kwh, 4),
            'cost_per_month' => round($cost, 2),
            'emission_kg_per_month' => round($emission, 3),
            'tariff_per_kwh' => $parameters['tariff_per_kwh'],
            'emission_factor_kg_per_kwh' => $parameters['emission_factor_kg_per_kwh'],
            'calculated_at' => now()->toIso8601String(),
            'method' => 'Estimasi dari total watt standby unit hasil audit × jam standby × hari per bulan. Bukan pembacaan meter PLN.',
        ];
    }

    /**
     * @param  Collection<int, \App\Models\AuditPcLog>  $audits
     */
    public function estimateForAudits(Collection $audits, ?array $parameters = null): array
    {
        $totalWatt = $audits->sum(fn ($audit) => (float) $audit->standby_watt_snapshot);

        return $this->monthlyEstimate((float) $totalWatt, $parameters);
    }
}
