<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Garden extends Model
{
    // There is not a single writing HTTP endpoint in v1. Everything that
    // writes is a seeder or an artisan command — mass assignment is not an
    // attack surface here, only typing.
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'seats' => 'integer',
            'station_walk_min' => 'integer',
            'charm' => 'integer',
            // null means the generator's global bound applies.
            'min_stay_minutes' => 'integer',
            'max_stay_minutes' => 'integer',
            // Nullable and three-valued: the cast leaves null alone.
            'self_service' => 'boolean',
            'own_food_allowed' => 'boolean',
            'lat' => 'float',
            'lon' => 'float',
            'verified_at' => 'datetime',
        ];
    }

    public function brewery(): BelongsTo
    {
        return $this->belongsTo(Brewery::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function openingHours(): HasMany
    {
        return $this->hasMany(OpeningHour::class);
    }

    public function beerPrices(): HasMany
    {
        return $this->hasMany(BeerPrice::class);
    }
}
