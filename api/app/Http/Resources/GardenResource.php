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

            // null means "not reliably verified". That is a statement, so it
            // ships rather than being filtered out.
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

            // Both null until somebody has surveyed them. The generator then
            // falls back to its global bounds.
            'min_stay_minutes' => $this->min_stay_minutes,
            'max_stay_minutes' => $this->max_stay_minutes,
            'lat' => $this->lat,
            'lon' => $this->lon,
            'zone' => $this->zone,
            'caveat' => $this->caveat,
            'description' => $this->description,

            // Image plus its required attribution. No credit, no image —
            // naming the author is a licence condition at Places and Commons.
            'image_url' => $this->image_url,
            'image_credit' => $this->image_credit,
            'image_source_url' => $this->image_source_url,
            'opening_hours' => OpeningHourResource::collection($this->whenLoaded('openingHours')),
            'beer_prices' => BeerPriceResource::collection($this->whenLoaded('beerPrices')),
            'source_url' => $this->source_url,
            'verified_at' => $this->verified_at?->toIso8601String(),
        ];
    }
}
