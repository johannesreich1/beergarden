<?php

namespace App\Repositories;

use App\Models\Garden;
use Illuminate\Database\Eloquent\Collection;

class GardenRepository
{
    /** Kilometer pro Breitengrad. Für einen Vorfilter genau genug. */
    private const KM_PER_DEGREE = 111.32;

    /**
     * Gärten im Umkreis von $km um einen Punkt.
     *
     * Das ist die einzige Stelle im Projekt, an der Geo-SQL stehen darf.
     * MariaDB hat kein geography und kein ST_DWithin: die Bounding-Box grenzt
     * über den Index (lat, lon) grob ein, ST_Distance_Sphere rechnet auf dem
     * verbliebenen Rest exakt. Bei 35 Gärten ist beides egal — die Naht
     * existiert, damit die DB-Entscheidung später eine Datei kostet und nicht
     * zwölf verstreute Queries.
     */
    public function near(float $lat, float $lon, float $km): Collection
    {
        $latDelta = $km / self::KM_PER_DEGREE;

        // Längengrade rücken zu den Polen hin zusammen. Der Deckel verhindert
        // eine Division nahe null — für München akademisch, aber gratis.
        $lonDelta = $km / (self::KM_PER_DEGREE * max(cos(deg2rad($lat)), 0.01));

        return Garden::query()
            ->whereBetween('lat', [$lat - $latDelta, $lat + $latDelta])
            ->whereBetween('lon', [$lon - $lonDelta, $lon + $lonDelta])
            // POINT nimmt x, y — also lon, lat. Vertauscht liefert es still
            // falsche Ergebnisse statt eines Fehlers.
            ->whereRaw(
                'ST_Distance_Sphere(POINT(lon, lat), POINT(?, ?)) <= ?',
                [$lon, $lat, $km * 1000],
            )
            ->get();
    }
}
