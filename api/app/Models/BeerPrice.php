<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BeerPrice extends Model
{
    protected $guarded = [];

    /**
     * Die gepflegten Sorten.
     *
     * Bewusst hier und nicht als enum in der Datenbank: eine neue Sorte soll
     * eine Zeile in dieser Liste sein, keine Migration. Was der Crawler an
     * Unbekanntem findet, landet trotzdem in der Tabelle — die Liste steuert
     * nur Reihenfolge und Beschriftung im UI.
     */
    public const KINDS = ['hell', 'weizen', 'alkoholfrei', 'radler', 'dunkel'];

    /** Ausschankgrößen in Millilitern. Halbe und Maß, alles weitere bei Bedarf. */
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
