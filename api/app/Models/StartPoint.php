<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StartPoint extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lon' => 'float',
        ];
    }
}
