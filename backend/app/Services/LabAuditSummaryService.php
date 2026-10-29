<?php

namespace App\Services;

use App\Models\AuditPcLog;
use App\Models\LabRoom;

class LabAuditSummaryService
{
    public function __construct(private readonly EnergyCalculator $energy) {}

    public function labs(): array
    {
        $aggregates = AuditPcLog::query()
            ->selectRaw('lab_room_id, COUNT(*) as audited_count')
            ->selectRaw('COALESCE(SUM(standby_watt_snapshot), 0) as total_watt')
            ->selectRaw('SUM(CASE WHEN is_faulty = 1 THEN 1 ELSE 0 END) as faulty_count')
            ->selectRaw('MAX(audited_at) as latest_audit_at')
            ->groupBy('lab_room_id')
            ->get()
            ->keyBy('lab_room_id');

        return LabRoom::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (LabRoom $lab) use ($aggregates) {
                $aggregate = $aggregates->get($lab->id);
                $auditedCount = (int) ($aggregate->audited_count ?? 0);
                $totalWatt = (float) ($aggregate->total_watt ?? 0);
                $estimate = $this->energy->monthlyEstimate($totalWatt);

                return [
                    'id' => $lab->id,
                    'name' => $lab->name,
                    'location' => $lab->location,
                    'capacity' => $lab->capacity,
                    'audited_count' => $auditedCount,
                    'faulty_count' => (int) ($aggregate->faulty_count ?? 0),
                    'progress_percent' => $lab->capacity > 0
                        ? round(($auditedCount / $lab->capacity) * 100, 1)
                        : 0,
                    'not_audited' => $auditedCount === 0,
                    'standby_watt_total' => round($totalWatt, 2),
                    'energy' => $estimate,
                    'latest_audit_at' => $aggregate?->latest_audit_at,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $labs
     */
    public function totals(array $labs): array
    {
        $pcTarget = array_sum(array_column($labs, 'capacity'));
        $audited = array_sum(array_column($labs, 'audited_count'));
        $faulty = array_sum(array_column($labs, 'faulty_count'));
        $kwh = array_sum(array_map(fn (array $lab) => (float) $lab['energy']['kwh_per_month'], $labs));
        $cost = array_sum(array_map(fn (array $lab) => (float) $lab['energy']['cost_per_month'], $labs));
        $emission = array_sum(array_map(fn (array $lab) => (float) $lab['energy']['emission_kg_per_month'], $labs));

        return [
            'labs' => count($labs),
            'pc_target' => $pcTarget,
            'audited' => $audited,
            'faulty' => $faulty,
            'progress_percent' => $pcTarget > 0 ? round(($audited / $pcTarget) * 100, 1) : 0,
            'kwh_per_month' => round($kwh, 4),
            'cost_per_month' => round($cost, 2),
            'emission_kg_per_month' => round($emission, 3),
        ];
    }
}
