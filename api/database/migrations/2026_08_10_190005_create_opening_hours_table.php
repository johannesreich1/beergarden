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

            // Restaurant und Selbstbedienungs-Biergarten im selben Haus haben
            // unterschiedliche Zeiten (Hinterbrühl, Nockherberg). Ohne area
            // baut man das später zweimal.
            $table->string('area', 32);

            // ISO-8601: 1 = Montag … 7 = Sonntag. Passt zu Carbon::dayOfWeekIso.
            $table->unsignedTinyInteger('weekday');

            // Ruhetag: is_closed = true, beide Zeiten null. Nicht 00:00–00:00,
            // das wäre von "öffnet um Mitternacht" nicht zu unterscheiden.
            $table->boolean('is_closed')->default(false);

            // MariaDB-TIME fasst bis 838:59:59. Sperrstunde nach Mitternacht
            // wird deshalb als 24:30 gespeichert, nicht als 00:30 — sonst
            // rechnet jede Abfrage über den Tageswechsel falsch.
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();

            // "Bei Biergartenwetter täglich ab 12 Uhr" — der Wirt entscheidet
            // morgens um neun. Steht nirgends, ist aber die halbe Wahrheit.
            $table->boolean('weather_dependent')->default(false);

            // Herkunft pro Zeile, nicht pro Garten: Öffnungszeiten kommen aus
            // einer anderen Quelle als die Stammdaten.
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
