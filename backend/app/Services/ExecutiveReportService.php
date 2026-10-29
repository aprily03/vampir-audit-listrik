<?php

namespace App\Services;

use App\Models\MonthlyElectricityBill;

class ExecutiveReportService
{
    public function __construct(
        private readonly EnergyCalculator $energy,
        private readonly LabAuditSummaryService $labSummary,
    ) {}

    public function payload(): array
    {
        $parameters = $this->energy->parameters();
        $labs = $this->labSummary->labs();
        $totals = $this->labSummary->totals($labs);

        $bills = MonthlyElectricityBill::query()
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->limit(12)
            ->get()
            ->sortBy([
                ['period_year', 'asc'],
                ['period_month', 'asc'],
            ])
            ->values();

        $billPayload = $bills->map(fn (MonthlyElectricityBill $bill) => [
            'id' => $bill->id,
            'period_year' => $bill->period_year,
            'period_month' => $bill->period_month,
            'period_label' => $bill->period_label,
            'total_amount' => (float) $bill->total_amount,
            'carbon_emission_kg' => $bill->carbon_emission_kg !== null ? (float) $bill->carbon_emission_kg : null,
            'notes' => $bill->notes,
        ])->all();

        $latestBill = $bills->last();

        return [
            'generated_at' => now()->toIso8601String(),
            'period' => [
                'from' => $bills->first()?->period_label,
                'to' => $latestBill?->period_label,
            ],
            'parameters' => $parameters,
            'labs' => $labs,
            'totals' => $totals,
            'bills' => $billPayload,
            'bill_summary' => [
                'count' => count($billPayload),
                'total_amount' => round(array_sum(array_column($billPayload, 'total_amount')), 2),
                'average_amount' => count($billPayload) > 0
                    ? round(array_sum(array_column($billPayload, 'total_amount')) / count($billPayload), 2)
                    : 0,
                'latest_period' => $latestBill?->period_label,
                'latest_amount' => $latestBill !== null ? (float) $latestBill->total_amount : null,
            ],
            'notes' => [
                'Nilai energi, biaya, dan emisi pada laporan ini adalah estimasi dari data audit dan parameter aktif, bukan tagihan atau pembacaan meter PLN.',
                'Tagihan bulanan merupakan data manual tingkat kampus; tidak diatribusikan per laboratorium.',
                'Emisi hasil estimasi energi dan kolom emisi pada tagihan (bila diisi) adalah dua sumber data yang berbeda.',
            ],
        ];
    }
}
