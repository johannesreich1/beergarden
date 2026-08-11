<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garden_tag', function (Blueprint $table) {
            $table->foreignId('garden_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();

            $table->primary(['garden_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garden_tag');
    }
};
