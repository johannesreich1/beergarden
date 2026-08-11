<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GardenEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_every_garden_with_a_full_week_of_opening_hours(): void
    {
        $this->seed();

        $response = $this->getJson('/api/gardens');

        $response->assertOk();
        $this->assertCount(35, $response->json('data'));
        $this->assertCount(7, $response->json('data.0.opening_hours'));
    }

    public function test_an_unverified_brewery_stays_null(): void
    {
        $this->seed();

        $gardens = collect($this->getJson('/api/gardens')->json('data'));

        // Nine entries without a verified brewery. If that number moves, either
        // somebody guessed or the data set changed — you want to see both.
        $this->assertSame(9, $gardens->whereNull('brewery')->count());
    }

    public function test_a_verified_garden_names_its_source(): void
    {
        $this->seed();

        $gardens = collect($this->getJson('/api/gardens')->json('data'));

        // The rule, not the count: a date without a source is a claim nobody can
        // check, and a source without a date says nothing about when. They only
        // ever appear together. Twenty-six gardens are placed from OpenStreetMap,
        // the remaining nine could not be matched and stay unverified.
        foreach ($gardens as $garden) {
            $this->assertSame(
                $garden['verified_at'] === null,
                $garden['source_url'] === null,
                "{$garden['slug']} carries only half its provenance",
            );
        }

        $this->assertSame(9, $gardens->whereNull('verified_at')->count());
    }

    public function test_no_opening_hours_claim_to_be_verified_yet(): void
    {
        $this->seed();

        $hours = collect($this->getJson('/api/gardens')->json('data'))
            ->flatMap(fn (array $garden) => $garden['opening_hours']);

        // The detail page prints its "checked against nothing" notice off this,
        // and the notice has to disappear by itself once a crawler fills the
        // dates in — not because somebody remembered to delete it.
        $this->assertSame($hours->count(), $hours->whereNull('verified_at')->count());
    }

    public function test_a_closed_weekday_carries_no_times(): void
    {
        $this->seed();

        $gardens = collect($this->getJson('/api/gardens')->json('data'));
        $hirschau = $gardens->firstWhere('slug', 'hirschau');

        $tuesday = collect($hirschau['opening_hours'])->firstWhere('weekday', 2);

        $this->assertTrue($tuesday['is_closed']);
        $this->assertNull($tuesday['opens_at']);
        $this->assertNull($tuesday['closes_at']);
    }
}
