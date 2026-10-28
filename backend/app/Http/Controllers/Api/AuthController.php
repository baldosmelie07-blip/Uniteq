<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Log in a user.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => [
                'required',
                'email',
                'max:255',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        // Find the user by email address.
        $user = User::where('email', $validated['email'])
            ->first();

        // Reject incorrect credentials.
        if (
            !$user ||
            !Hash::check($validated['password'], $user->password)
        ) {
            throw ValidationException::withMessages([
                'email' => [
                    'The provided credentials are incorrect.',
                ],
            ]);
        }

        // Only active accounts may log in.
        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Your account is inactive. Please contact the System Administrator.',
            ], 403);
        }

        // Create a new Sanctum API token.
        $token = $user->createToken('uniteq-web')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $this->userData($user),
        ], 200);
    }

    /**
     * Return the currently authenticated user's details.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Prevent inactive accounts from continuing to use the API.
        if (!$user->isActive()) {
            $user->currentAccessToken()?->delete();

            return response()->json([
                'message' => 'Your account is inactive. Please contact the System Administrator.',
            ], 403);
        }

        return response()->json([
            'user' => $this->userData($user),
        ], 200);
    }

    /**
     * Log out the current user by revoking the current token.
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            $user->currentAccessToken()?->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.',
        ], 200);
    }

    /**
     * Return safe user details for the frontend.
     *
     * Never return passwords or authentication tokens here.
     */
    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
        ];
    }
}
