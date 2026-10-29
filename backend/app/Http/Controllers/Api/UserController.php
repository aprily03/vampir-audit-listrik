<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\UserRole;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::query()->orderBy('name');

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->trim()->toString().'%';
            $query->where(fn ($builder) => $builder->where('name', 'like', $search)->orWhere('email', 'like', $search));
        }

        if ($request->filled('role')) {
            $query->where('role', $request->string('role')->toString());
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return UserResource::collection($query->paginate(50));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['email'] = strtolower($data['email']);
        $data['is_active'] = $data['is_active'] ?? true;

        $user = User::query()->create($data);

        return response()->json(['data' => new UserResource($user)], 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('email', $data)) {
            $data['email'] = strtolower($data['email']);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($user->isAdmin() && isset($data['role']) && $data['role'] !== UserRole::ADMIN->value) {
            $this->ensureAnotherActiveAdminExists($user);
        }

        if ($user->isAdmin() && array_key_exists('is_active', $data) && ! $data['is_active']) {
            $this->ensureAnotherActiveAdminExists($user);
        }

        $user->update($data);

        return response()->json(['data' => new UserResource($user->refresh())]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages([
                'user' => 'Anda tidak dapat menonaktifkan akun sendiri.',
            ]);
        }

        if ($user->isAdmin()) {
            $this->ensureAnotherActiveAdminExists($user);
        }

        $user->update(['is_active' => false]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Akun dinonaktifkan.']);
    }

    private function ensureAnotherActiveAdminExists(User $user): void
    {
        $activeAdmins = User::query()
            ->where('role', UserRole::ADMIN->value)
            ->where('is_active', true)
            ->whereKeyNot($user->getKey())
            ->count();

        if ($activeAdmins === 0) {
            throw ValidationException::withMessages([
                'role' => 'Minimal satu akun Admin aktif harus tersedia.',
            ]);
        }
    }
}
