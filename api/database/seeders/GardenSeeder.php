<?php

namespace Database\Seeders;

use App\Models\Brewery;
use App\Models\Garden;
use App\Models\Tag;
use App\Support\DataFile;
use Illuminate\Database\Seeder;

class GardenSeeder extends Seeder
{
    private const TUESDAY = 2;

    /** Taken from the prototype so the labels are not reinvented. */
    private const TAG_LABELS = [
        'wasser' => 'Am Wasser',
        'wald' => 'Wald & Grün',
        'stadt' => 'Stadtfeeling',
        'aussicht' => 'Aussicht',
        'keller' => 'Bierkeller',
        'spielplatz' => 'Spielplatz',
        'musik' => 'Live-Musik',
    ];

    public function run(): void
    {
        $rows = DataFile::read('gardens.json');

        $breweryIds = $this->seedBreweries($rows);
        $tagIds = $this->seedTags();

        foreach ($rows as $row) {
            $garden = Garden::create([
                'slug' => $row['slug'],
                'name' => $row['name'],
                'district' => $row['district'],

                // Nine of 35 have no verified brewery. Stays null — "wechselnd"
                // would be a claim, "k. A." an excuse.
                'brewery_id' => $row['brewery'] === null ? null : $breweryIds[$row['brewery']],

                'seats' => $row['seats'],
                'self_service' => $row['self_service'],
                'own_food_allowed' => $row['own_food_allowed'],
                'station_walk_min' => $row['station_walk_min'],
                'charm' => $row['charm'],
                'lat' => $row['lat'],
                'lon' => $row['lon'],
                'zone' => $row['zone'],
                'caveat' => $row['caveat'],
                'description' => $row['description'],
                'source_url' => $row['source_url'],
                'verified_at' => $row['verified_at'],
            ]);

            $garden->tags()->attach(array_map(
                fn (string $slug) => $tagIds[$slug],
                $row['tags'],
            ));

            $this->seedOpeningHours($garden, $row);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, int>  slug => id
     */
    private function seedBreweries(array $rows): array
    {
        $ids = [];

        foreach ($rows as $row) {
            if ($row['brewery'] === null || isset($ids[$row['brewery']])) {
                continue;
            }

            $ids[$row['brewery']] = Brewery::create([
                'slug' => $row['brewery'],
                'label' => $row['brewery_label'],
            ])->id;
        }

        return $ids;
    }

    /** @return array<string, int>  slug => id */
    private function seedTags(): array
    {
        $ids = [];

        foreach (self::TAG_LABELS as $slug => $label) {
            $ids[$slug] = Tag::create(['slug' => $slug, 'label' => $label])->id;
        }

        return $ids;
    }

    /**
     * The prototype only knows one pair of times plus a Tuesday flag. Both are
     * rolled out across the seven weekdays and marked as unverified without
     * exception. That is the information we have, in the right shape — not
     * invented precision.
     *
     * This seeder does not resolve the multi-venue cases (Hinterbrühl,
     * Nockherberg): the data is missing. The table can express it, the current
     * data set cannot.
     */
    private function seedOpeningHours(Garden $garden, array $row): void
    {
        $closedOnTuesday = $row['open_tuesday'] === false;

        foreach (range(1, 7) as $weekday) {
            $closed = $weekday === self::TUESDAY && $closedOnTuesday;

            $garden->openingHours()->create([
                'area' => 'garden',
                'weekday' => $weekday,
                'is_closed' => $closed,
                'opens_at' => $closed ? null : $row['opens_at'],
                'closes_at' => $closed ? null : $row['closes_at'],

                // Almost every beer garden depends on the weather, but which one
                // how — that is written down nowhere. false means "not surveyed".
                'weather_dependent' => false,

                'source_url' => null,
                'verified_at' => null,
            ]);
        }
    }
}
