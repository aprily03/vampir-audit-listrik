<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePanelReadingRequest;
use App\Http\Resources\PanelReadingResource;
use App\Models\PanelLimit;
use App\Models\PanelReading;
use App\Services\PanelStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class PanelReadingController extends Controller
{
    public function __construct(private readonly PanelStatusService $panelStatus) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PanelReading::query()
            ->with(['labRoom', 'recorder'])
            ->latest('recorded_at')
            ->latest('id');

        if ($request->filled('lab_room_id')) {
            $query->where('lab_room_id', $request->integer('lab_room_id'));
        }

        if ($request->filled('group_type')) {
            $query->where('group_type', $request->string('group_type')->toString());
        }

        return PanelReadingResource::collection($query->paginate(50));
    }

    public function store(StorePanelReadingRequest $request): JsonResponse
    {
        $data = $request->validated();

        $limit = PanelLimit::query()
            ->where('lab_room_id', $data['lab_room_id'])
            ->where('group_type', $data['group_type'])
            ->first();

        if ($limit === null) {
            throw ValidationException::withMessages([
                'group_type' => 'Batas panel untuk grup ini belum dikonfigurasi.',
            ]);
        }

        $reading = PanelReading::query()->create([
            'lab_room_id' => $data['lab_room_id'],
            'group_type' => $data['group_type'],
            'load_watt' => $data['load_watt'],
            'source' => $data['source'] ?? 'MANUAL_ESTIMATE',
            'recorded_at' => $data['recorded_at'] ?? now(),
            'recorded_by' => $request->user()->id,
            'notes' => $data['notes'] ?? null,
        ]);

        $reading->load(['labRoom', 'recorder']);

        return response()->json([
            'data' => new PanelReadingResource($reading),
            'status' => $this->panelStatus->evaluate($limit, $reading),
        ], 201);
    }
}
