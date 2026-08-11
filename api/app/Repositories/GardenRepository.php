<?php

namespace App\Repositories;

use App\Models\Garden;
use Illuminate\Database\Eloquent\Collection;

class GardenRepository
{
    /** Kilometres per degree of latitude. Accurate enough for a pre-filter. */
    private const KM_PER_DEGREE = 111.32;

    /**
     * Gardens within $km of a point.
     *
     * This is the only place in the project where geo SQL may live. MariaDB
     * has no geography type and no ST_DWithin: the bounding box narrows things
     * down over the (lat, lon) index, ST_Distance_Sphere is exact on what is
     * left. At 35 gardens neither matters — the seam exists so that changing
     * the database decision later costs one file instead of twelve scattered
     * queries.
     */
    public function near(float $lat, float $lon, float $km): Collection
    {
        $latDelta = $km / self::KM_PER_DEGREE;

        // Degrees of longitude converge towards the poles. The floor prevents
        // a division near zero — academic for Munich, but free.
        $lonDelta = $km / (self::KM_PER_DEGREE * max(cos(deg2rad($lat)), 0.01));

        return Garden::query()
            ->whereBetween('lat', [$lat - $latDelta, $lat + $latDelta])
            ->whereBetween('lon', [$lon - $lonDelta, $lon + $lonDelta])
            // POINT takes x, y — that is lon, lat. Swapped, it silently
            // returns wrong results instead of an error.
            ->whereRaw(
                'ST_Distance_Sphere(POINT(lon, lat), POINT(?, ?)) <= ?',
                [$lon, $lat, $km * 1000],
            )
            ->get();
    }
}
