<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gardens', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('district')->nullable();

            // null means "not reliably verified", not "no brewery".
            // Currently affects 9 of 35 entries.
            $table->foreignId('brewery_id')->nullable()->constrained()->nullOnDelete();

            $table->unsignedInteger('seats')->nullable();

            // Three-valued as well: null = unknown, not false.
            $table->boolean('self_service')->nullable();
            $table->boolean('own_food_allowed')->nullable();

            $table->unsignedTinyInteger('station_walk_min')->nullable();

            // Editorial judgement, 1–5. Drives the ranking, but does not scale
            // to all of Germany — see docs/PROJECT.md, Datenqualität.
            $table->unsignedTinyInteger('charm')->nullable();

            $table->decimal('lat', 9, 6);
            $table->decimal('lon', 9, 6);
            $table->enum('zone', ['city', 'umland']);

            $table->text('caveat')->nullable();
            $table->text('description')->nullable();

            // Provenance is part of the data. Both null as long as nothing has
            // been verified against a source.
            $table->string('source_url')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();

            // Carries the bounding-box pre-filter in GardenRepository::near().
            $table->index(['lat', 'lon']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gardens');
    }
};
