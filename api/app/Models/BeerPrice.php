<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BeerPrice extends Model
{
    protected $guarded = [];

    /**
     * The curated list of kinds.
     *
     * Kept here rather than as a database enum on purpose: a new kind should be
     * a line in this list, not a migration. Whatever unknown kind the crawler
     * finds still lands in the table — this list only drives ordering and
     * labelling in the UI.
     */
    public const KINDS = ['hell', 'weizen', 'alkoholfrei', 'radler', 'dunkel'];

    /** Serving sizes in millilitres. Halbe and Maß; anything else on demand. */
    public const SIZES_ML = [500, 1000];

    protected function casts(): array
    {
        return [
            'size_ml' => 'integer',
            'cents' => 'integer',
            'verified_at' => 'datetime',
        ];
    }

    public function garden(): BelongsTo
    {
        return $this->belongsTo(Garden::class);
    }
}
