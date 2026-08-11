<?php

use App\Http\Controllers\Api\GardenController;
use App\Http\Controllers\Api\StartPointController;
use Illuminate\Support\Facades\Route;

// No login, no auth middleware. Both are decided that way in docs/PROJECT.md.
Route::get('/gardens', GardenController::class);
Route::get('/start-points', StartPointController::class);
