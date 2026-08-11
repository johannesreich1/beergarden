<?php

namespace Database\Seeders;

use App\Models\StartPoint;
use App\Support\DataFile;
use Illuminate\Database\Seeder;

class StartPointSeeder extends Seeder
{
    public function run(): void
    {
        foreach (DataFile::read('start_points.json') as $row) {
            StartPoint::create([
                'name' => $row['name'],
                'lat' => $row['lat'],
                'lon' => $row['lon'],
            ]);
        }
    }
}
