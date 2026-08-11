<?php

use App\Http\Controllers\Api\GardenController;
use App\Http\Controllers\Api\StartPointController;
use Illuminate\Support\Facades\Route;

// Kein Login, keine Auth-Middleware. Beides steht so in docs/PROJECT.md.
Route::get('/gardens', GardenController::class);
Route::get('/start-points', StartPointController::class);
