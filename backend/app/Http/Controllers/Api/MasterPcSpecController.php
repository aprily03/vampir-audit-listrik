<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMasterPcSpecRequest;
use App\Http\Requests\UpdateMasterPcSpecRequest;
use App\Http\Resources\MasterPcSpecResource;
use App\Models\MasterPcSpec;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class MasterPcSpecController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MasterPcSpec::query()->orderBy('ram_gb')->orderBy('storage_gb');

        if (! ($request->boolean('include_inactive') && $request->user()->isAdmin())) {
            $query->where('is_active', true);
        }

        return MasterPcSpecResource::collection($query->get());
    }

    public function store(StoreMasterPcSpecRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['storage_type'] = strtoupper($data['storage_type']);
        $data['is_active'] = $data['is_active'] ?? true;

        $spec = MasterPcSpec::query()->create($data);

        return response()->json(['data' => new MasterPcSpecResource($spec)], 201);
    }

    public function update(UpdateMasterPcSpecRequest $request, MasterPcSpec $masterPcSpec): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['storage_type'])) {
            $data['storage_type'] = strtoupper($data['storage_type']);
        }

        $masterPcSpec->update($data);

        return response()->json(['data' => new MasterPcSpecResource($masterPcSpec->refresh())]);
    }

    public function destroy(MasterPcSpec $masterPcSpec): JsonResponse
    {
        if ($masterPcSpec->audits()->exists()) {
            throw ValidationException::withMessages([
                'master_pc_spec' => 'Spesifikasi sudah dipakai pada catatan audit. Nonaktifkan alih-alih menghapus.',
            ]);
        }

        $masterPcSpec->delete();

        return response()->json(['message' => 'Spesifikasi dihapus.']);
    }
}
