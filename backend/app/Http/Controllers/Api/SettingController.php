<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSettingsRequest;
use App\Http\Resources\SettingResource;
use App\Models\Setting;
use App\Models\SettingHistory;
use App\Services\EnergyCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    public function __construct(private readonly EnergyCalculator $energy) {}

    public function index(): JsonResponse
    {
        $entries = Setting::query()->with('updater')->orderBy('key')->get();

        return response()->json([
            'data' => SettingResource::collection($entries),
            'parameters' => $this->energy->parameters(),
        ]);
    }

    public function history(): JsonResponse
    {
        $entries = SettingHistory::query()
            ->with('changer')
            ->latest('id')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $entries->map(fn (SettingHistory $entry): array => [
                'id' => $entry->id,
                'key' => $entry->key,
                'old_value' => $entry->old_value,
                'new_value' => $entry->new_value,
                'changed_by' => $entry->changer?->name,
                'changed_at' => $entry->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        DB::transaction(function () use ($request): void {
            foreach ($request->validated() as $key => $value) {
                $setting = Setting::query()->firstOrNew(['key' => $key]);
                $oldValue = $setting->exists ? $setting->value : null;
                $newValue = (string) $value;

                $unchanged = $oldValue !== null
                    && is_numeric($oldValue)
                    && is_numeric($newValue)
                    && (float) $oldValue === (float) $newValue;

                if ($unchanged || $oldValue === $newValue) {
                    continue;
                }

                SettingHistory::query()->create([
                    'key' => $key,
                    'old_value' => $oldValue,
                    'new_value' => $newValue,
                    'changed_by' => $request->user()->id,
                ]);

                $setting->fill([
                    'value' => $newValue,
                    'updated_by' => $request->user()->id,
                ])->save();
            }
        });

        $this->energy->flush();

        return response()->json([
            'message' => 'Parameter berhasil diperbarui.',
            'parameters' => $this->energy->parameters(),
        ]);
    }
}
