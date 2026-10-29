<?php

namespace App\Services;

use App\Models\LabRoom;
use App\Models\PanelLimit;
use App\Models\PanelReading;

class PanelOverviewService
{
    public function __construct(private readonly PanelStatusService $panelStatus) {}

    public function overview(): array
    {
        $labs = LabRoom::query()
            ->where('is_active', true)
            ->with('panelLimits')
            ->orderBy('name')
            ->get();

        $latestReadings = PanelReading::query()
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->get()
            ->unique(fn (PanelReading $reading) => $reading->lab_room_id.'-'.$reading->group_type->value)
            ->keyBy(fn (PanelReading $reading) => $reading->lab_room_id.'-'.$reading->group_type->value);

        $labsPayload = [];
        $warnings = [];

        foreach ($labs as $lab) {
            $panels = $lab->panelLimits
                ->sortBy('group_type')
                ->map(function (PanelLimit $limit) use ($latestReadings, $lab, &$warnings) {
                    $reading = $latestReadings->get($lab->id.'-'.$limit->group_type->value);
                    $status = $this->panelStatus->evaluate($limit, $reading);
                    $status['lab_name'] = $lab->name;

                    if (in_array($status['status'], ['WARNING', 'OVER'], true)) {
                        $warnings[] = $status;
                    }

                    return $status;
                })
                ->values()
                ->all();

            $labsPayload[] = [
                'id' => $lab->id,
                'name' => $lab->name,
                'location' => $lab->location,
                'panels' => $panels,
            ];
        }

        $allPanels = collect($labsPayload)->flatMap(fn (array $lab) => $lab['panels']);

        return [
            'labs' => $labsPayload,
            'summary' => [
                'labs' => count($labsPayload),
                'panel_groups' => $allPanels->count(),
                'warnings' => count($warnings),
                'unavailable' => $allPanels->where('status', 'UNAVAILABLE')->count(),
            ],
            'warnings' => $warnings,
            'generated_at' => now()->toIso8601String(),
            'data_note' => 'Beban panel adalah data manual/estimasi, bukan pembacaan sensor real-time.',
        ];
    }
}
