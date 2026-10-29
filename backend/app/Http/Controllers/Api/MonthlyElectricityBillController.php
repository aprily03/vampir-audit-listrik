<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBillRequest;
use App\Http\Requests\UpdateBillRequest;
use App\Http\Resources\MonthlyElectricityBillResource;
use App\Models\MonthlyElectricityBill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MonthlyElectricityBillController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MonthlyElectricityBill::query()
            ->with('creator')
            ->orderByDesc('period_year')
            ->orderByDesc('period_month');

        if ($request->filled('year')) {
            $query->where('period_year', $request->integer('year'));
        }

        return MonthlyElectricityBillResource::collection($query->limit(60)->get());
    }

    public function store(StoreBillRequest $request): JsonResponse
    {
        $bill = MonthlyElectricityBill::query()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        $bill->load('creator');

        return response()->json(['data' => new MonthlyElectricityBillResource($bill)], 201);
    }

    public function update(UpdateBillRequest $request, MonthlyElectricityBill $bill): JsonResponse
    {
        $bill->update($request->validated());
        $bill->load('creator');

        return response()->json(['data' => new MonthlyElectricityBillResource($bill->refresh())]);
    }

    public function destroy(MonthlyElectricityBill $bill): JsonResponse
    {
        $bill->delete();

        return response()->json(['message' => 'Data tagihan dihapus.']);
    }
}
