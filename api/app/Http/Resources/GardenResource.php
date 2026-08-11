<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Garden */
class GardenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->name,
            'district' => $this->district,

            // null heißt "nicht sicher verifiziert". Das ist eine Aussage und
            // wird deshalb ausgeliefert, nicht weggefiltert.
            'brewery' => $this->whenLoaded('brewery', fn () => [
                'slug' => $this->brewery->slug,
                'label' => $this->brewery->label,
            ]),

            'seats' => $this->seats,
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('slug')->all()),
            'self_service' => $this->self_service,
            'own_food_allowed' => $this->own_food_allowed,
            'station_walk_min' => $this->station_walk_min,
            'charm' => $this->charm,

            // Beide null, solange niemand sie erhoben hat. Der Generator
            // faellt dann auf seine globalen Grenzen zurueck.
            'min_stay_minutes' => $this->min_stay_minutes,
            'max_stay_minutes' => $this->max_stay_minutes,
            'lat' => $this->lat,
            'lon' => $this->lon,
            'zone' => $this->zone,
            'caveat' => $this->caveat,
            'description' => $this->description,
            'opening_hours' => OpeningHourResource::collection($this->whenLoaded('openingHours')),
            'beer_prices' => BeerPriceResource::collection($this->whenLoaded('beerPrices')),
            'source_url' => $this->source_url,
            'verified_at' => $this->verified_at?->toIso8601String(),
        ];
    }
}
