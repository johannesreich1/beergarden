<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpeningHour extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'weekday' => 'integer',
            'is_closed' => 'boolean',
            'weather_dependent' => 'boolean',
            'verified_at' => 'datetime',
        ];
    }

    // Deliberately no cast on opens_at/closes_at: MariaDB TIME can hold 24:30
    // for "half past midnight". A datetime cast would turn that into the next
    // day and break every calculation that crosses midnight.

    public function garden(): BelongsTo
    {
        return $this->belongsTo(Garden::class);
    }
}
