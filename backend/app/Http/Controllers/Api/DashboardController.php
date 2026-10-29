<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\IncidentStatus;
use App\Enums\UserRole;
use App\Http\Resources\AuditPcLogResource;
use App\Http\Resources\UrgentIncidentResource;
use App\Models\AuditPcLog;
use App\Models\UrgentIncident;
use App\Services\EnergyCalculator;
use App\Services\ExecutiveReportService;
use App\Services\LabAuditSummaryService;
use App\Services\PanelOverviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly EnergyCalculator $energy,
        private readonly LabAuditSummaryService $labSummary,
        private readonly PanelOverviewService $panelOverview,
        private readonly ExecutiveReportService $executive,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return match ($request->user()->role) {
            UserRole::ADMIN => $this->adminDashboard(),
            UserRole::AUDITOR => $this->auditorDashboard($request),
            UserRole::MAINTENANCE => $this->maintenanceDashboard(),
            UserRole::PIMPINAN => $this->executiveDashboard(),
        };
    }

    private function adminDashboard(): JsonResponse
    {
        $labs = $this->labSummary->labs();
        $totals = $this->labSummary->totals($labs);
        $panels = $this->panelOverview->overview();
        $incidentCounts = $this->incidentCounts();

        $incidents = UrgentIncident::query()
            ->with(['labRoom', 'reporter', 'statusUpdatedBy'])
            ->latest('created_at')
            ->latest('id')
            ->limit(8)
            ->get();

        $recentAudits = AuditPcLog::query()
            ->with(['labRoom', 'auditor'])
            ->latest('audited_at')
            ->latest('id')
            ->limit(8)
            ->get();

        return response()->json([
            'role' => UserRole::ADMIN->value,
            'generated_at' => now()->toIso8601String(),
            'parameters' => $this->energy->parameters(),
            'totals' => [
                ...$totals,
                'pending_incidents' => $this->pendingIncidentCount($incidentCounts),
                'panel_warnings' => $panels['summary']['warnings'],
            ],
            'labs' => $labs,
            'panels' => [
                'summary' => $panels['summary'],
                'warnings' => array_slice($panels['warnings'], 0, 6),
                'data_note' => $panels['data_note'],
            ],
            'incident_counts' => $incidentCounts,
            'incidents' => UrgentIncidentResource::collection($incidents)->resolve(),
            'recent_audits' => AuditPcLogResource::collection($recentAudits)->resolve(),
            'data_note' => 'Energi dan emisi adalah estimasi dari data audit. Beban panel adalah input manual/estimasi, bukan telemetri real-time.',
        ]);
    }

    private function auditorDashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $labs = $this->labSummary->labs();

        $myAudits = AuditPcLog::query()->where('audited_by', $user->id);
        $todayCount = (clone $myAudits)->whereDate('audited_at', today())->count();
        $myTotal = (clone $myAudits)->count();
        $myFaulty = (clone $myAudits)->where('is_faulty', true)->count();

        $recentAudits = (clone $myAudits)
            ->with(['labRoom', 'auditor'])
            ->latest('audited_at')
            ->latest('id')
            ->limit(8)
            ->get();

        return response()->json([
            'role' => UserRole::AUDITOR->value,
            'generated_at' => now()->toIso8601String(),
            'parameters' => $this->energy->parameters(),
            'labs' => $labs,
            'my_stats' => [
                'today' => $todayCount,
                'total' => $myTotal,
                'faulty' => $myFaulty,
            ],
            'recent_audits' => AuditPcLogResource::collection($recentAudits)->resolve(),
            'data_note' => 'Progres dihitung terhadap kapasitas PC target yang dikonfigurasi Admin.',
        ]);
    }

    private function maintenanceDashboard(): JsonResponse
    {
        $panels = $this->panelOverview->overview();
        $incidentCounts = $this->incidentCounts();

        $incidents = UrgentIncident::query()
            ->with(['labRoom', 'reporter', 'statusUpdatedBy'])
            ->latest('created_at')
            ->latest('id')
            ->limit(50)
            ->get();

        return response()->json([
            'role' => UserRole::MAINTENANCE->value,
            'generated_at' => now()->toIso8601String(),
            'parameters' => $this->energy->parameters(),
            'panels' => $panels,
            'incident_counts' => $incidentCounts,
            'incidents' => UrgentIncidentResource::collection($incidents)->resolve(),
            'data_note' => $panels['data_note'],
        ]);
    }

    private function executiveDashboard(): JsonResponse
    {
        return response()->json([
            'role' => UserRole::PIMPINAN->value,
            ...$this->executive->payload(),
        ]);
    }

    /**
     * @return array<string, int>
     */
    private function incidentCounts(): array
    {
        $counts = UrgentIncident::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return collect(IncidentStatus::cases())
            ->mapWithKeys(fn (IncidentStatus $status) => [
                $status->value => (int) ($counts[$status->value] ?? 0),
            ])
            ->all();
    }

    /**
     * @param  array<string, int>  $counts
     */
    private function pendingIncidentCount(array $counts): int
    {
        return ($counts[IncidentStatus::BARU->value] ?? 0)
            + ($counts[IncidentStatus::DITINJAU->value] ?? 0)
            + ($counts[IncidentStatus::DALAM_PENANGANAN->value] ?? 0);
    }
}
