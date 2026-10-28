<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\Collection;

class CollectionController extends Controller
{
    /**
     * Display all registered collections.
     */
    public function index()
    {
        return response()->json(
            Collection::orderBy('name')->get()
        );
    }

    /**
     * Store a new collection.
     */
    
public function store(Request $request)
{
    // Accept common fee field names from the frontend.
    $request->merge([
        'fixed_fee' => $request->input('fixed_fee')
            ?? $request->input('fee')
            ?? $request->input('amount'),
    ]);

    $validated = $request->validate([
        'name' => 'required|string|max:255|unique:collections,name',
        'fixed_fee' => 'required|numeric|min:0',
        'description' => 'nullable|string',
        'status' => 'nullable|in:active,inactive',
    ]);

    $collection = \App\Models\Collection::create([
        'name' => $validated['name'],
        'fixed_fee' => $validated['fixed_fee'],
        'description' => $validated['description'] ?? null,
        'status' => $validated['status'] ?? 'active',
    ]);

    return response()->json([
        'message' => 'Collection registered successfully.',
        'data' => $collection,
    ], 201);
}

    /**
     * Display one registered collection.
     */
    public function show(Collection $collection)
    {
        return response()->json($collection);
    }

    /**
     * Update a registered collection.
     */
    public function update(Request $request, Collection $collection)
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('collections', 'name')->ignore($collection->id),
            ],
            'fixed_fee' => 'sometimes|required|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $collection->update($validated);

        return response()->json([
            'message' => 'Collection updated successfully.',
            'data' => $collection->fresh(),
        ]);
    }

    /**
     * Delete a registered collection.
     */
    public function destroy(Collection $collection)
    {
        $collection->delete();

        return response()->json([
            'message' => 'Collection deleted successfully.',
        ]);
    }
}
