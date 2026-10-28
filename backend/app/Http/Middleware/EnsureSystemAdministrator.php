<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSystemAdministrator
{
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $user = $request->user();

        // The user must be authenticated.
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Reject inactive accounts.
        if (
            strtolower((string) $user->status) !== 'active'
        ) {
            return response()->json([
                'message' => 'Your account is inactive.',
            ], 403);
        }

        // Only the exact administrator role is permitted.
        if ($user->role !== 'System Administrator') {
            return response()->json([
                'message' => 'Forbidden. Only the System Administrator can manage user accounts.',
            ], 403);
        }

        return $next($request);
    }
}
