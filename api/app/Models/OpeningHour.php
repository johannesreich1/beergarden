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

    // Bewusst kein Cast auf opens_at/closes_at: MariaDB-TIME kann 24:30 für
    // "halb eins nachts" halten. Ein datetime-Cast würde daraus den nächsten
    // Tag machen und die Zeit über den Tageswechsel kaputtrechnen.

    public function garden(): BelongsTo
    {
        return $this->belongsTo(Garden::class);
    }
}
