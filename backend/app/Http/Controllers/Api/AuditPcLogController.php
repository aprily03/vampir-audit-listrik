<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAuditPcLogRequest;
use App\Http\Requests\UpdateAuditPcLogRequest;
use App\Http\Resources\AuditPcLogResource;
use App\Models\AuditPcLog;
use App\Models\LabRoom;
use App\Models\MasterPcSpec;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class AuditPcLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = AuditPcLog::query()
            ->with(['labRoom', 'auditor'])
            ->latest('audited_at')
            ->latest('id');

        if ($request->filled('lab_room_id')) {
            $query->where('lab_room_id', $request->integer('lab_room_id'));
        }

        if ($request->has('is_faulty')) {
            $query->where('is_faulty', $request->boolean('is_faulty'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->trim()->toString().'%';
            $query->where('pc_number', 'like', $search);
        }

        $perPage = min(max($request->integer('per_page', 25), 5), 100);

        return AuditPcLogResource::collection($query->paginate($perPage));
    }

    public function store(StoreAuditPcLogRequest $request): JsonResponse
    {
        $data = $request->validated();

        $labRoom = LabRoom::query()->findOrFail($data['lab_room_id']);

        if (! $labRoom->is_active) {
            throw ValidationException::withMessages([
                'lab_room_id' => 'Lab sedang tidak aktif.',
            ]);
        }

        $spec = MasterPcSpec::query()->findOrFail($data['master_pc_spec_id']);

        if (! $spec->is_active) {
            throw ValidationException::withMessages([
                'master_pc_spec_id' => 'Spesifikasi tidak aktif dan tidak dapat dipakai untuk audit baru.',
            ]);
        }

        $audit = AuditPcLog::query()->create([
            'lab_room_id' => $labRoom->id,
            'pc_number' => trim($data['pc_number']),
            'master_pc_spec_id' => $spec->id,
            'ram_gb_snapshot' => $spec->ram_gb,
            'storage_gb_snapshot' => $spec->storage_gb,
            'storage_type_snapshot' => $spec->storage_type,
            'standby_watt_snapshot' => $spec->standby_watt,
            'is_faulty' => (bool) ($data['is_faulty'] ?? false),
            'fault_note' => $data['fault_note'] ?? null,
            'audited_by' => $request->user()->id,
            'audited_at' => now(),
        ]);

        $audit->load(['labRoom', 'auditor']);

        return response()->json(['data' => new AuditPcLogResource($audit)], 201);
    }

    public function update(UpdateAuditPcLogRequest $request, AuditPcLog $auditPcLog): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['pc_number'])) {
            $data['pc_number'] = trim($data['pc_number']);
        }

        if (isset($data['master_pc_spec_id'])) {
            $spec = MasterPcSpec::query()->findOrFail($data['master_pc_spec_id']);
            $data['master_pc_spec_id'] = $spec->id;
            $data['ram_gb_snapshot'] = $spec->ram_gb;
            $data['storage_gb_snapshot'] = $spec->storage_gb;
            $data['storage_type_snapshot'] = $spec->storage_type;
            $data['standby_watt_snapshot'] = $spec->standby_watt;
        }

        if (array_key_exists('is_faulty', $data) && ! $data['is_faulty'] && ! array_key_exists('fault_note', $data)) {
            $data['fault_note'] = null;
        }

        $auditPcLog->update($data);
        $auditPcLog->load(['labRoom', 'auditor']);

        return response()->json(['data' => new AuditPcLogResource($auditPcLog->refresh())]);
    }

    public function destroy(AuditPcLog $auditPcLog): JsonResponse
    {
        $auditPcLog->delete();

        return response()->json(['message' => 'Catatan audit dihapus.']);
    }

    public function progress(): JsonResponse
    {
        $labs = LabRoom::query()
            ->where('is_active', true)
            ->withCount([
                'audits',
                'audits as faulty_count' => fn ($query) => $query->where('is_faulty', true),
            ])
            ->withMax('audits', 'audited_at')
            ->orderBy('name')
            ->get()
            ->map(fn (LabRoom $lab) => [
                'id' => $lab->id,
                'name' => $lab->name,
                'location' => $lab->location,
                'capacity' => $lab->capacity,
                'audited_count' => $lab->audits_count,
                'faulty_count' => $lab->faulty_count,
                'progress_percent' => $lab->capacity > 0
                    ? round(($lab->audits_count / $lab->capacity) * 100, 1)
                    : 0,
                'not_audited' => $lab->audits_count === 0,
                'latest_audit_at' => $lab->audits_max_audited_at,
            ]);

        return response()->json(['data' => $labs]);
    }
}
