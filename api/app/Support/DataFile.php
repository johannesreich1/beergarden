<?php

namespace App\Support;

use RuntimeException;

/**
 * Liest die JSON-Exporte aus data/.
 *
 * Der Ordner liegt je nach Kontext woanders: im Container hängt er als
 * /app/data, im lokalen Checkout liegt er neben api/. Beide Kandidaten zu
 * probieren ist ehrlicher als eine ENV-Variable, die niemand setzt und deren
 * Fehlen sich als leerer Seeder äußert.
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

        throw new RuntimeException("Datendatei {$name} nicht gefunden.");
    }
}
