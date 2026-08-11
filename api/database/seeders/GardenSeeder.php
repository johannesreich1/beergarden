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

    /** Aus dem Prototyp übernommen, damit die Labels nicht neu erfunden werden. */
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

                // Neun von 35 haben keine verifizierte Brauerei. Bleibt null —
                // "wechselnd" wäre eine Behauptung, "k. A." eine Ausrede.
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
     * Der Prototyp kennt nur ein Zeitpaar plus ein Dienstags-Flag. Beides wird
     * auf die sieben Wochentage ausgerollt und ausnahmslos als unverifiziert
     * markiert. Das ist die vorhandene Information in der richtigen Form —
     * keine erfundene Präzision.
     *
     * Die Mehrhäuser-Fälle (Hinterbrühl, Nockherberg) löst dieser Seeder nicht
     * auf: dafür fehlen die Daten. Die Tabelle kann es, der Datenstand nicht.
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

                // Fast jeder Biergarten ist wetterabhängig, aber welcher wie —
                // das steht nirgends. false heißt hier "nicht erhoben".
                'weather_dependent' => false,

                'source_url' => null,
                'verified_at' => null,
            ]);
        }
    }
}
