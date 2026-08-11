<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Verweildauer pro Garten, beides optional.
     *
     * Der Generator verteilt die Sitzzeit bisher gleichmäßig auf alle Stationen
     * und deckelt sie global auf 45 bis 150 Minuten. Das stimmt für die meisten
     * und für manche gar nicht: in einem 250-Plätze-Bräustüberl sitzt niemand
     * zweieinhalb Stunden, im Hirschgarten schon.
     *
     * Bewusst keine dritte Spalte für eine "Standard-Verweildauer": die ergibt
     * sich aus dem Zeitfenster geteilt durch die Stationszahl, in diese Grenzen
     * geklemmt. Ein zusätzlicher Vorgabewert wäre eine zweite Quelle für
     * dieselbe Zahl — und damit genau die Doppelung, die wir vermeiden.
     *
     * null heißt: es gilt die globale Grenze. Nicht raten.
     */
    public function up(): void
    {
        Schema::table('gardens', function (Blueprint $table) {
            $table->unsignedSmallInteger('min_stay_minutes')->nullable()->after('charm');
            $table->unsignedSmallInteger('max_stay_minutes')->nullable()->after('min_stay_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('gardens', function (Blueprint $table) {
            $table->dropColumn(['min_stay_minutes', 'max_stay_minutes']);
        });
    }
};
