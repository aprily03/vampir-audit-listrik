<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\IncidentStatus;
use App\Http\Requests\StoreIncidentRequest;
use App\Http\Requests\UpdateIncidentStatusRequest;
use App\Http\Resources\UrgentIncidentResource;
use App\Models\UrgentIncident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class UrgentIncidentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = UrgentIncident::query()
            ->with(['labRoom', 'reporter', 'statusUpdatedBy'])
            ->latest('created_at')
            ->latest('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('lab_room_id')) {
            $query->where('lab_room_id', $request->integer('lab_room_id'));
        }

        if ($request->filled('updated_after')) {
            $query->where('updated_at', '>', Carbon::parse($request->string('updated_after')->toString()));
        }

        $perPage = min(max($request->integer('per_page', 30), 5), 100);

        return UrgentIncidentResource::collection($query->paginate($perPage))
            ->additional(['server_time' => now()->toIso8601String()]);
    }

    public function store(StoreIncidentRequest $request): JsonResponse
    {
        $incident = UrgentIncident::query()->create([
            'lab_room_id' => $request->integer('lab_room_id'),
            'reported_by' => $request->user()->id,
            'description' => $request->string('description')->trim()->toString(),
            'status' => IncidentStatus::BARU,
        ]);

        $incident->load(['labRoom', 'reporter', 'statusUpdatedBy']);

        return response()->json(['data' => new UrgentIncidentResource($incident)], 201);
    }

    public function updateStatus(UpdateIncidentStatusRequest $request, UrgentIncident $incident): JsonResponse
    {
        $target = IncidentStatus::from($request->string('status')->toString());
        $current = $incident->status;
        $order = [IncidentStatus::BARU, IncidentStatus::DITINJAU, IncidentStatus::DALAM_PENANGANAN, IncidentStatus::SELESAI];
        $currentIndex = array_search($current, $order, true);
        $targetIndex = array_search($target, $order, true);

        if ($targetIndex !== $currentIndex && $targetIndex !== $currentIndex + 1) {
            throw ValidationException::withMessages([
                'status' => 'Status insiden harus mengikuti alur: Baru → Ditinjau → Dalam Penanganan → Selesai.',
            ]);
        }

        if ($targetIndex !== $currentIndex) {
            $incident->update([
                'status' => $target,
                'status_updated_by' => $request->user()->id,
                'status_updated_at' => now(),
                'status_note' => $request->input('note'),
                'resolved_at' => $target->isResolved() ? now() : null,
            ]);
            $incident->load(['labRoom', 'reporter', 'statusUpdatedBy']);
        }

        return response()->json(['data' => new UrgentIncidentResource($incident)]);
    }
}
