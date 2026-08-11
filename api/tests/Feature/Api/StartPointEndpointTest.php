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

        // Die Liste ist redaktionell sortiert, nicht alphabetisch. Candidplatz
        // steht vorn, weil dort die ganze Sache angefangen hat.
        $this->assertSame('Candidplatz', $response->json('data.0.name'));
    }
}
