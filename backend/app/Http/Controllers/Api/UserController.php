<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Check if the logged-in user is a System Administrator.
     */
    private function ensureSystemAdministrator(Request $request)
    {
        if (
            !$request->user() ||
            $request->user()->role !== 'System Administrator'
        ) {
            abort(
                response()->json([
                    'message' => 'Only the System Administrator can manage users.'
                ], 403)
            );
        }
    }

    /**
     * Display all users.
     */
    public function index(Request $request)
    {
        $this->ensureSystemAdministrator($request);

        return response()->json(
            User::latest()->get()
        );
    }

    /**
     * Create a new user.
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
                Rule::in([
                    'System Administrator',
                    'Cashier',
                ]),
            ],

            'status' => [
                'required',
                Rule::in([
                    'Active',
                    'Inactive',
                ]),
            ],
        ]);

        $validated['password'] = Hash::make(
            $validated['password']
        );

        $user = User::create($validated);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => $user,
        ], 201);
    }

    /**
     * Display a specific user.
     */
    public function show(
        Request $request,
        string $id
    ) {
        $this->ensureSystemAdministrator($request);

        $user = User::findOrFail($id);

        return response()->json($user);
    }

    /**
     * Update a user.
     */
    public function update(
        Request $request,
        string $id
    ) {
        $this->ensureSystemAdministrator($request);

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->ignore($user->id),
            ],

            'role' => [
                'required',
                Rule::in([
                    'System Administrator',
                    'Cashier',
                ]),
            ],

            'status' => [
                'required',
                Rule::in([
                    'Active',
                    'Inactive',
                ]),
            ],

            'password' => [
                'nullable',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        /*
         * Prevent administrator from removing
         * their own administrator privileges.
         */
        if ($user->id === $request->user()->id) {

            if (
                $validated['role'] !==
                'System Administrator'
            ) {
                return response()->json([
                    'message' =>
                        'You cannot remove your own System Administrator role.'
                ], 422);
            }

            if (
                $validated['status'] !== 'Active'
            ) {
                return response()->json([
                    'message' =>
                        'You cannot deactivate your own account.'
                ], 422);
            }
        }

        /*
         * Only change password if a new password
         * was entered.
         */
        if (
            isset($validated['password']) &&
            $validated['password'] !== ''
        ) {
            $validated['password'] =
                Hash::make(
                    $validated['password']
                );
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        /*
         * Revoke tokens if account becomes inactive.
         */
        if ($user->status === 'Inactive') {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' =>
                'User updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Delete a user.
     */
    public function destroy(
        Request $request,
        string $id
    ) {
        $this->ensureSystemAdministrator($request);

        $user = User::findOrFail($id);

        /*
         * Prevent deleting your own account.
         */
        if (
            $user->id ===
            $request->user()->id
        ) {
            return response()->json([
                'message' =>
                    'You cannot delete your own account.'
            ], 422);
        }

        /*
         * Revoke tokens before deletion.
         */
        $user->tokens()->delete();

        $user->delete();

        return response()->json([
            'message' =>
                'User deleted successfully.'
        ]);
    }
}