<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Beer prices, extensible without a migration.
     *
     * One row is one price for one kind in one size. New kinds (Radler, dark
     * lager, Bock) and new sizes (0.3 l in the restaurant area) therefore only
     * need new rows — no column, no migration, no deployment. That is the
     * entire reason for this shape.
     *
     * The crawler fills this table. Until then it stays empty: an estimated
     * beer price would be worse than none, because nobody reads it as an
     * estimate.
     */
    public function up(): void
    {
        Schema::create('beer_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('garden_id')->constrained()->cascadeOnDelete();

            /**
             * Kind. A free string with a curated list in App\Models\BeerPrice:
             * hell, weizen, alkoholfrei, radler, dunkel. No enum — otherwise a
             * new kind would be a migration, which is exactly what it must not be.
             */
            $table->string('kind', 32);

            /** Serving size in millilitres: 500 for a Halbe, 1000 for a Maß. */
            $table->unsignedSmallInteger('size_ml');

            /**
             * Price in cents. Money does not belong in a floating point number —
             * €4.90 is not 4.90 as a float, and it shows once you start summing.
             */
            $table->unsignedInteger('cents');

            /** Provenance per row. A price without a source is a rumour. */
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
