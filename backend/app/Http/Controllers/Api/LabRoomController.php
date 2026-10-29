<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLabRoomRequest;
use App\Http\Requests\UpdateLabRoomRequest;
use App\Http\Resources\LabRoomResource;
use App\Models\LabRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class LabRoomController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = LabRoom::query()->withCount('audits')->orderBy('name');

        $includeInactive = $request->boolean('include_inactive') && $request->user()->isAdmin();

        if (! $includeInactive) {
            $query->where('is_active', true);
        }

        return LabRoomResource::collection($query->get());
    }

    public function store(StoreLabRoomRequest $request): JsonResponse
    {
        $labRoom = LabRoom::query()->create([
            ...$request->validated(),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return response()->json(['data' => new LabRoomResource($labRoom)], 201);
    }

    public function update(UpdateLabRoomRequest $request, LabRoom $labRoom): JsonResponse
    {
        $labRoom->update($request->validated());

        return response()->json(['data' => new LabRoomResource($labRoom->refresh())]);
    }

    public function destroy(LabRoom $labRoom): JsonResponse
    {
        if ($labRoom->audits()->exists()) {
            throw ValidationException::withMessages([
                'lab_room' => 'Lab sudah memiliki data audit. Nonaktifkan lab alih-alih menghapusnya.',
            ]);
        }

        $labRoom->delete();

        return response()->json(['message' => 'Lab dihapus.']);
    }
}
