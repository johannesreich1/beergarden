<?php

namespace App\Support;

use RuntimeException;

/**
 * Reads the JSON exports from data/.
 *
 * The folder sits in different places depending on context: mounted as
 * /app/data inside the container, next to api/ in a local checkout. Trying
 * both candidates is more honest than an env variable nobody sets, whose
 * absence would show up as a silently empty seeder.
 */
final class DataFile
{
    /** @return array<int, array<string, mixed>> */
    public static function read(string $name): array
    {
        foreach ([base_path('data/'.$name), base_path('../data/'.$name)] as $candidate) {
            if (is_file($candidate)) {
                return json_decode(
                    file_get_contents($candidate),
                    associative: true,
                    flags: JSON_THROW_ON_ERROR,
                );
            }
        }

        throw new RuntimeException("Data file {$name} not found.");
    }
}
