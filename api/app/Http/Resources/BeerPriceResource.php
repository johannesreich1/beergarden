<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\BeerPrice */
class BeerPriceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'kind' => $this->kind,
            'size_ml' => $this->size_ml,
            // In cents, not euros. Formatting is the interface's business;
            // the arithmetic stays integral.
            'cents' => $this->cents,
            'source_url' => $this->source_url,
            'verified_at' => $this->verified_at?->toIso8601String(),
        ];
    }
}
