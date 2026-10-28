<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * Allow only an authenticated System Administrator.
     *
     * Keep this check even when the API routes also use
     * EnsureSystemAdministrator middleware.
     */
    private function ensureSystemAdministrator(Request $request): void
    {
        $currentUser = $request->user();

        if (
            !$currentUser ||
            $currentUser->role !== 'System Administrator'
        ) {
            abort(response()->json([
                'message' => 'Only the System Administrator can manage user accounts.',
            ], 403));
        }

        if (
            strtolower((string) $currentUser->status) !== 'active'
        ) {
            abort(response()->json([
                'message' => 'Your account is inactive.',
            ], 403));
        }
    }

    /**
     * Roles that can be assigned to users.
     */
    private function allowedRoles(): array
    {
        return [
            'System Administrator',
            'Cashier',
            'Reviewer',
            'Viewer',
        ];
    }

    /**
     * Hide sensitive fields in API responses.
     */
    private function safeUser(User $user): array
    {
        return $user
            ->makeHidden([
                'password',
                'remember_token',
            ])
            ->toArray();
    }

    /**
     * Determine whether another active administrator exists.
     */
    private function hasAnotherActiveAdministrator(
        User $user
    ): bool {
        return User::query()
            ->where('role', 'System Administrator')
            ->where('status', 'Active')
            ->where('id', '!=', $user->id)
            ->exists();
    }

    /**
     * List all users.
     */
    public function index(Request $request)
    {
        $this->ensureSystemAdministrator($request);

        $users = User::query()
            ->latest()
            ->get()
            ->map(fn (User $user) => $this->safeUser($user));

        return response()->json($users);
    }

    /**
     * Create a user account.
     *
     * This endpoint must not be publicly accessible.
     */
    public function store(Request $request)
    {
        $this->ensureSystemAdministrator($request);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],

            'role' => [
                'required',
                Rule::in($this->allowedRoles()),
            ],

            'status' => [
                'required',
                Rule::in([
                    'Active',
                    'Inactive',
                ]),
            ],
        ]);

        $user = DB::transaction(function () use ($validated) {
            return User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
                'status' => $validated['status'],
            ]);
        });

        return response()->json([
            'message' => 'User account created successfully.',
            'user' => $this->safeUser($user),
        ], 201);
    }

    /**
     * Show one user.
     */
    public function show(Request $request, string $id)
    {
        $this->ensureSystemAdministrator($request);

        $user = User::findOrFail($id);

        return response()->json(
            $this->safeUser($user)
        );
    }

    /**
     * Update an account.
     *
     * Supports partial updates. Only supplied, validated
     * fields are changed.
     */
    public function update(Request $request, string $id)
    {
        $this->ensureSystemAdministrator($request);

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'sometimes',
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],

            'role' => [
                'sometimes',
                'required',
                Rule::in($this->allowedRoles()),
            ],

            'status' => [
                'sometimes',
                'required',
                Rule::in([
                    'Active',
                    'Inactive',
                ]),
            ],

            'password' => [
                'sometimes',
                'nullable',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        if (empty($validated)) {
            return response()->json([
                'message' => 'No valid changes were provided.',
            ], 422);
        }

        // Prevent an administrator from removing their own access.
        if ((string) $user->id === (string) $request->user()->id) {
            if (
                isset($validated['role']) &&
                $validated['role'] !== 'System Administrator'
            ) {
                return response()->json([
                    'message' => 'You cannot remove your own System Administrator role.',
                ], 422);
            }

            if (
                isset($validated['status']) &&
                $validated['status'] !== 'Active'
            ) {
                return response()->json([
                    'message' => 'You cannot deactivate your own account.',
                ], 422);
            }
        }

        // Determine the account's status after this update.
        $newRole = $validated['role'] ?? $user->role;
        $newStatus = $validated['status'] ?? $user->status;

        // Do not leave the system without an active administrator.
        $losesAdminAccess =
            $user->role === 'System Administrator' &&
            $user->status === 'Active' &&
            (
                $newRole !== 'System Administrator' ||
                $newStatus !== 'Active'
            );

        if (
            $losesAdminAccess &&
            !$this->hasAnotherActiveAdministrator($user)
        ) {
            return response()->json([
                'message' => 'This change is not allowed because it would leave UniTeq without an active System Administrator.',
            ], 422);
        }

        $passwordWasChanged =
            array_key_exists('password', $validated) &&
            $validated['password'] !== null &&
            $validated['password'] !== '';

        if ($passwordWasChanged) {
            $validated['password'] = Hash::make(
                $validated['password']
            );
        } else {
            unset($validated['password']);
        }

        // Never write fields that were not explicitly validated.
        DB::transaction(function () use (
            $user,
            $validated,
            $newRole,
            $newStatus,
            $passwordWasChanged
        ) {
            $user->fill($validated);
            $user->save();

            $accessChanged =
                $user->role !== $newRole ||
                $user->status !== $newStatus;

            // Revoke existing tokens if access changes or
            // the password is changed.
            if (
                $accessChanged ||
                $passwordWasChanged ||
                $newStatus !== 'Active'
            ) {
                $user->tokens()->delete();
            }
        });

        return response()->json([
            'message' => 'User account updated successfully.',
            'user' => $this->safeUser($user->fresh()),
        ]);
    }

    /**
     * Delete a user account.
     */
    public function destroy(Request $request, string $id)
    {
        $this->ensureSystemAdministrator($request);

        $user = User::findOrFail($id);

        // Prevent the administrator from deleting themselves.
        if ((string) $user->id === (string) $request->user()->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        // Preserve at least one active administrator.
        if (
            $user->role === 'System Administrator' &&
            $user->status === 'Active' &&
            !$this->hasAnotherActiveAdministrator($user)
        ) {
            return response()->json([
                'message' => 'This account cannot be deleted because it is the last active System Administrator.',
            ], 422);
        }

        DB::transaction(function () use ($user) {
            // Revoke Sanctum tokens before deleting the account.
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->json([
            'message' => 'User account deleted successfully.',
        ]);
    }
}
