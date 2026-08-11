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

        // Neun Einträge ohne verifizierte Brauerei. Wenn diese Zahl kippt, ist
        // entweder geraten worden oder der Datenstand hat sich geändert —
        // beides will man sehen.
        $this->assertSame(9, $gardens->whereNull('brewery')->count());
    }

    public function test_nothing_claims_to_be_verified_yet(): void
    {
        $this->seed();

        $gardens = collect($this->getJson('/api/gardens')->json('data'));

        $this->assertSame(35, $gardens->whereNull('verified_at')->count());
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
