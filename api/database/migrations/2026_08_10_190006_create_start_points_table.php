<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('start_points', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('lat', 9, 6);
            $table->decimal('lon', 9, 6);
            $table->timestamps();

            $table->index(['lat', 'lon']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('start_points');
    }
};
