<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null) {
            abort(401, 'Sesi tidak valid. Silakan masuk kembali.');
        }

        if (! $user->is_active) {
            abort(403, 'Akun Anda tidak aktif. Hubungi administrator.');
        }

        if ($roles !== [] && ! in_array($user->role->value, $roles, true)) {
            abort(403, 'Anda tidak memiliki akses ke aksi ini.');
        }

        return $next($request);
    }
}
