<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GardenResource;
use App\Models\Garden;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GardenController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        return GardenResource::collection(
            Garden::query()
                // Without eager loading this is over 140 queries for 35 gardens instead of 5.
                ->with(['brewery', 'tags', 'openingHours', 'beerPrices'])
                ->orderBy('name')
                ->get(),
        );

        // No pagination. 35 records, a few thousand later — that is a payload,
        // not a search problem. The frontend keeps the whole set in memory
        // anyway, because the generator needs all of it.
    }
}
