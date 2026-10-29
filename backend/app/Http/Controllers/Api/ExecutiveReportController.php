<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExecutiveReportService;
use Barryvdh\DomPDF\Facade\Pdf;

class ExecutiveReportController extends Controller
{
    public function summary(ExecutiveReportService $reportService): \Illuminate\Http\JsonResponse
    {
        return response()->json($reportService->payload());
    }

    public function download(ExecutiveReportService $reportService)
    {
        $report = $reportService->payload();

        $pdf = Pdf::loadView('reports.executive', ['report' => $report])
            ->setPaper('a4', 'portrait')
            ->setOption(['isRemoteEnabled' => false]);

        return $pdf->download('laporan-eksekutif-vampir-'.now()->format('Ymd-His').'.pdf');
    }
}
