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
        // Order as exported from the prototype: the list is sorted
        // editorially, not alphabetically — city centre first.
        return StartPointResource::collection(StartPoint::query()->orderBy('id')->get());
    }
}
