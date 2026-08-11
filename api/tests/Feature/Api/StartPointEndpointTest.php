<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StartPointEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_the_start_points_in_editorial_order(): void
    {
        $this->seed();

        $response = $this->getJson('/api/start-points');

        $response->assertOk();
        $this->assertCount(63, $response->json('data'));

        // The list is sorted editorially, not alphabetically. Candidplatz comes
        // first because that is where the whole thing started.
        $this->assertSame('Candidplatz', $response->json('data.0.name'));
    }
}
