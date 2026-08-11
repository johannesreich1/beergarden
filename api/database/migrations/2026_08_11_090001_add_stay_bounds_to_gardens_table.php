<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-garden stay bounds, both optional.
     *
     * So far the generator spreads sitting time evenly across all stops and
     * caps it globally at 45 to 150 minutes. That is right for most places and
     * plainly wrong for some: nobody spends two and a half hours in a
     * 250-seat Bräustüberl, but plenty of people do in the Hirschgarten.
     *
     * Deliberately no third column for a "default stay": that follows from the
     * time budget divided by the number of stops, clamped into these bounds. An
     * extra default would be a second source for the same number — exactly the
     * duplication we are trying to avoid.
     *
     * null means the global bound applies. Do not guess.
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
