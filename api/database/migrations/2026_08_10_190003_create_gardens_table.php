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

            // null heißt "nicht sicher verifiziert", nicht "keine Brauerei".
            // Betrifft aktuell 9 von 35 Einträgen.
            $table->foreignId('brewery_id')->nullable()->constrained()->nullOnDelete();

            $table->unsignedInteger('seats')->nullable();

            // Ebenfalls dreiwertig: null = unbekannt, nicht false.
            $table->boolean('self_service')->nullable();
            $table->boolean('own_food_allowed')->nullable();

            $table->unsignedTinyInteger('station_walk_min')->nullable();

            // Redaktionelle Einschätzung 1–5. Treibt das Ranking, skaliert aber
            // nicht auf Deutschland — siehe docs/PROJECT.md, Datenqualität.
            $table->unsignedTinyInteger('charm')->nullable();

            $table->decimal('lat', 9, 6);
            $table->decimal('lon', 9, 6);
            $table->enum('zone', ['city', 'umland']);

            $table->text('caveat')->nullable();
            $table->text('description')->nullable();

            // Datenherkunft gehört zu den Daten. Beides null, solange nichts
            // gegen eine Quelle verifiziert wurde.
            $table->string('source_url')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();

            // Trägt den Bounding-Box-Vorfilter in GardenRepository::near().
            $table->index(['lat', 'lon']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gardens');
    }
};
