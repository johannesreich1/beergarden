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
                // Ohne Eager Loading sind das bei 35 Gärten über 140 Queries statt 5.
                ->with(['brewery', 'tags', 'openingHours', 'beerPrices'])
                ->orderBy('name')
                ->get(),
        );

        // Keine Paginierung. 35 Datensätze, später ein paar tausend — das ist
        // ein Payload, kein Suchproblem. Das Frontend hält den Bestand ohnehin
        // komplett im Speicher, weil der Generator ihn komplett braucht.
    }
}
