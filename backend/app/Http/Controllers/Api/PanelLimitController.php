<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePanelLimitRequest;
use App\Http\Resources\PanelLimitResource;
use App\Models\PanelLimit;
use App\Services\EnergyCalculator;
use App\Services\PanelOverviewService;
use Illuminate\Http\JsonResponse;

class PanelLimitController extends Controller
{
    public function __construct(
        private readonly PanelOverviewService $panelOverview,
        private readonly EnergyCalculator $energy,
    ) {}

    public function index(): JsonResponse
    {
        return response()->json([
            ...$this->panelOverview->overview(),
            'parameters' => $this->energy->parameters(),
        ]);
    }

    public function update(UpdatePanelLimitRequest $request, PanelLimit $panelLimit): JsonResponse
    {
        $panelLimit->update($request->validated());
        $panelLimit->load('labRoom');

        return response()->json(['data' => new PanelLimitResource($panelLimit->refresh())]);
    }
}
