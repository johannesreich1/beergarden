<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Garden extends Model
{
    // Es gibt in v1 keinen einzigen schreibenden HTTP-Endpunkt. Alles, was
    // schreibt, ist Seeder oder Artisan-Command — Mass Assignment ist hier
    // kein Angriffsvektor, sondern nur Tipparbeit.
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'seats' => 'integer',
            'station_walk_min' => 'integer',
            'charm' => 'integer',
            // null heisst: es gilt die globale Grenze aus dem Generator.
            'min_stay_minutes' => 'integer',
            'max_stay_minutes' => 'integer',
            // Nullable und dreiwertig: der Cast lässt null in Ruhe.
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
