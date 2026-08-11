<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\OpeningHour */
class OpeningHourResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'area' => $this->area,
            'weekday' => $this->weekday,
            'is_closed' => $this->is_closed,
            'opens_at' => self::hhmm($this->opens_at),
            'closes_at' => self::hhmm($this->closes_at),
            'weather_dependent' => $this->weather_dependent,
            'source_url' => $this->source_url,
            'verified_at' => $this->verified_at?->toIso8601String(),
        ];
    }

    /** MariaDB returns TIME as 10:00:00. Nobody records seconds here. */
    private static function hhmm(?string $time): ?string
    {
        return $time === null ? null : substr($time, 0, 5);
    }
}
