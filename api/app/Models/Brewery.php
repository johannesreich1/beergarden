<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Brewery extends Model
{
    protected $guarded = [];

    public function gardens(): HasMany
    {
        return $this->hasMany(Garden::class);
    }
}
