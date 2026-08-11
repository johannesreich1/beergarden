<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StartPointResource;
use App\Models\StartPoint;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StartPointController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        // Reihenfolge wie im Prototyp-Export: die Liste ist redaktionell
        // sortiert, nicht alphabetisch — Innenstadt zuerst.
        return StartPointResource::collection(StartPoint::query()->orderBy('id')->get());
    }
}
