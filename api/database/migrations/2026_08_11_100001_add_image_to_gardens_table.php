<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One image per garden.
     *
     * Three columns rather than a table on purpose: a lead image is a property
     * of the garden, not a collection. A gallery would be its own table — we
     * build that when somebody actually wants a gallery.
     *
     * `image_credit` is not optional in the sense that it may be left out once
     * an image exists: Google's Places Photo API requires attribution, and so
     * does Wikimedia. An image without a credit is therefore a broken record,
     * not an incomplete one.
     *
     * Explicitly not allowed and not provided for: images taken from Google
     * image search. They belong to their authors and are not free merely
     * because they are findable.
     */
    public function up(): void
    {
        Schema::table('gardens', function (Blueprint $table) {
            $table->string('image_url', 500)->nullable()->after('description');
            /** Required as soon as an image exists: "Photo: … / licence". */
            $table->string('image_credit')->nullable()->after('image_url');
            /** Where it came from — Places reference, Commons page, own photo. */
            $table->string('image_source_url', 500)->nullable()->after('image_credit');
        });
    }

    public function down(): void
    {
        Schema::table('gardens', function (Blueprint $table) {
            $table->dropColumn(['image_url', 'image_credit', 'image_source_url']);
        });
    }
};
