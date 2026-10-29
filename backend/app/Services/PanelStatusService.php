<?php

namespace App\Services;

use App\Models\PanelLimit;
use App\Models\PanelReading;

class PanelStatusService
{
    public function evaluate(PanelLimit $limit, ?PanelReading $reading): array
    {
        $limitWatt = round((float) $limit->limit_ampere * (float) $limit->voltage, 2);
        $base = [
            'panel_limit_id' => $limit->id,
            'lab_room_id' => $limit->lab_room_id,
            'group_type' => $limit->group_type->value,
            'group_label' => $limit->group_type->label(),
            'limit_ampere' => (float) $limit->limit_ampere,
            'voltage' => (float) $limit->voltage,
            'limit_watt' => $limitWatt,
            'warning_percent' => $limit->warning_percent,
            'data_label' => 'ESTIMASI',
        ];

        if ($reading === null) {
            return $base + [
                'load_watt' => null,
                'percent' => null,
                'status' => 'UNAVAILABLE',
                'status_label' => 'Belum ada data beban',
                'source' => null,
                'recorded_at' => null,
                'notes' => null,
            ];
        }

        $loadWatt = (float) $reading->load_watt;
        $percent = $limitWatt > 0 ? round(($loadWatt / $limitWatt) * 100, 1) : null;
        $status = match (true) {
            $percent === null => 'UNAVAILABLE',
            $percent > 100 => 'OVER',
            $percent >= $limit->warning_percent => 'WARNING',
            default => 'NORMAL',
        };

        return $base + [
            'load_watt' => $loadWatt,
            'percent' => $percent,
            'status' => $status,
            'status_label' => match ($status) {
                'OVER' => 'Melampaui batas',
                'WARNING' => 'Mendekati batas',
                'NORMAL' => 'Normal',
                default => 'Belum tersedia',
            },
            'source' => $reading->source,
            'source_label' => $reading->source === 'MANUAL_MEASUREMENT'
                ? 'Pengukuran manual'
                : 'Estimasi manual',
            'recorded_at' => $reading->recorded_at?->toIso8601String(),
            'notes' => $reading->notes,
        ];
    }
}
