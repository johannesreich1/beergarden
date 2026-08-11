<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bierpreise, erweiterbar ohne Migration.
     *
     * Eine Zeile ist ein Preis für eine Sorte in einer Größe. Neue Sorten
     * (Radler, Dunkles, Bock) und neue Größen (0,3 l im Restaurantbereich)
     * brauchen deshalb nur neue Zeilen — keine Spalte, keine Migration, kein
     * Deployment. Das ist der ganze Grund für diesen Zuschnitt.
     *
     * Der Crawler füllt diese Tabelle. Bis dahin bleibt sie leer: ein
     * geschätzter Bierpreis wäre schlimmer als keiner, weil ihn niemand als
     * Schätzung liest.
     */
    public function up(): void
    {
        Schema::create('beer_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('garden_id')->constrained()->cascadeOnDelete();

            /**
             * Sorte. Freier String mit gepflegter Liste in App\Models\BeerPrice:
             * hell, weizen, alkoholfrei, radler, dunkel. Kein enum — eine neue
             * Sorte wäre sonst eine Migration, und genau das soll sie nicht sein.
             */
            $table->string('kind', 32);

            /** Ausschankgröße in Millilitern: 500 für die Halbe, 1000 für die Maß. */
            $table->unsignedSmallInteger('size_ml');

            /**
             * Preis in Cent. Geld gehört nicht in eine Gleitkommazahl — 4,90 €
             * ist als float nicht 4.90, und beim Summieren sieht man das.
             */
            $table->unsignedInteger('cents');

            /** Herkunft pro Zeile. Ein Preis ohne Quelle ist ein Gerücht. */
            $table->string('source_url')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();

            $table->unique(['garden_id', 'kind', 'size_ml']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beer_prices');
    }
};
