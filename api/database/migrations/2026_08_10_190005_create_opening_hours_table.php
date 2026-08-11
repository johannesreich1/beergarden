<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('garden_id')->constrained()->cascadeOnDelete();

            // A restaurant and a self-service beer garden on the same premises
            // keep different hours (Hinterbrühl, Nockherberg). Without `area`
            // you end up building this twice later.
            $table->string('area', 32);

            // ISO-8601: 1 = Monday … 7 = Sunday. Matches Carbon::dayOfWeekIso.
            $table->unsignedTinyInteger('weekday');

            // Closing day: is_closed = true, both times null. Not 00:00–00:00,
            // which would be indistinguishable from "opens at midnight".
            $table->boolean('is_closed')->default(false);

            // MariaDB TIME holds up to 838:59:59. Closing time after midnight
            // is therefore stored as 24:30, not 00:30 — otherwise every query
            // that crosses midnight computes the wrong answer.
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();

            // "Daily from noon in beer garden weather" — the landlord decides
            // at nine in the morning. Written down nowhere, yet half the truth.
            $table->boolean('weather_dependent')->default(false);

            // Provenance per row, not per garden: opening hours come from a
            // different source than the master data.
            $table->string('source_url')->nullable();
            $table->timestamp('verified_at')->nullable();

            $table->timestamps();

            $table->unique(['garden_id', 'area', 'weekday']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opening_hours');
    }
};
