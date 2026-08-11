# Arbeitsplan

Stand: 10.08.2026

`PROJECT.md` begründet, dieser Plan führt aus. Wenn beide sich widersprechen, gewinnt
`PROJECT.md` — dann ist dieser Plan veraltet und wird nachgezogen.

Die Reihenfolge ist bindend. Jeder Schritt endet mit etwas, das läuft.

## Stack — Stand geprüft am 10.08.2026

| | Version | Anmerkung |
|---|---|---|
| PHP | 8.5.9 | Laravel 13 verlangt `^8.3` |
| Laravel | 13.24 | reine JSON-API, Queue, später Crawler |
| Webserver | FrankenPHP | ein Service statt nginx + php-fpm, keine Config-Datei |
| DB | MariaDB 12.3 | ist gleichzeitig `lts` und `latest`; 13.0 ist RC |
| Cache/Queue | Redis | |
| Frontend (v2) | Nuxt 4.5 auf Node 24 LTS | Hybrid-Rendering, siehe `PROJECT.md` |
| PWA (v2) | `@vite-pwa/nuxt` 1.1 | |
| Store (offen) | Capacitor 8 | nicht entschieden, nicht eingeplant |

**FrankenPHP ist reversibel.** Der Wechsel zu nginx + php-fpm ist eine Änderung an
`compose.yaml`, nicht an der Anwendung. Falls Xdebug oder irgendeine Caddy-Eigenheit
stört: tauschen, nicht diskutieren.

## Repo-Layout — Ziel

```
beergarden/
├── api/              Laravel 13
├── web/              Nuxt 4        (erst in v2)
├── data/             JSON-Export, Quelle für den Seeder
├── docs/
├── prototype/        index.html, bleibt bis v2 lauffähig
├── compose.yaml
└── .env              nur Compose-Variablen; Laravel hat sein eigenes api/.env
```

`api/` und `web/` getrennt, weil zwei Runtimes zwei Build-Kontexte brauchen. Kein
Monorepo-Werkzeug, kein Workspace — zwei Ordner reichen, bis es weh tut.

---

## Schritt 0 — Repo-Hygiene

- `.DS_Store` aus dem Index nehmen und in `.gitignore`. Liegt aktuell **staged** im
  Repo.
- `.gitignore` anlegen: `.DS_Store`, `/api/vendor`, `/api/.env`, `/web/node_modules`,
  `/web/.nuxt`, `/web/.output`, `.idea/workspace.xml`
- `public/index.html` → `prototype/index.html`. `public/` gehört sonst Laravel, das
  wird sonst dauerhaft verwirrend.

## Schritt 1 — compose.yaml

Drei Services, sonst nichts:

| Service | Image | Port |
|---|---|---|
| `app` | `dunglas/frankenphp` (PHP 8.5), Build aus `api/Dockerfile` | 8080 |
| `db` | `mariadb:12.3` | 3306 |
| `cache` | `redis:8-alpine` | 6379 |

- Named Volume für die DB, kein Bind-Mount — sonst ist der erste `migrate:fresh`
  nach einem Rechnerwechsel ein Rätsel.
- Healthcheck auf `db`, `app` mit `depends_on: condition: service_healthy`. Ohne das
  crasht der erste Start reproduzierbar und man sucht an der falschen Stelle.
- `api/` als Bind-Mount ins `app`-Image, damit Änderungen ohne Rebuild greifen.

**Fertig, wenn:** `docker compose up -d` läuft und `docker compose ps` drei gesunde
Container zeigt.

## Schritt 2 — Laravel

```
composer create-project laravel/laravel api
```

`api/.env` auf `db`/`cache` zeigen lassen (Hostnamen aus dem Compose-Netz, nicht
`127.0.0.1`). `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis`. Kein Horizon in v1 —
es gibt noch keine Jobs.

**Fertig, wenn:** `http://localhost:8080` zeigt die Laravel-Startseite und
`php artisan migrate` legt die Standard-Tabellen an.

## Schritt 3 — Schema

Migrations sind die Wahrheit über das Schema. Sechs Tabellen:

**`breweries`** — `id`, `key` (unique), `label`

**`tags`** — `id`, `key` (unique), `label`
Sieben Werte: `wasser`, `wald`, `stadt`, `aussicht`, `keller`, `spielplatz`, `musik`.

**`gardens`**

| Spalte | Typ | |
|---|---|---|
| `slug` | string, unique | |
| `name`, `district` | string | |
| `brewery_id` | FK nullable | 9 von 35 bleiben `null` |
| `seats` | unsigned int nullable | |
| `self_service`, `own_food_allowed` | bool nullable | `null` = unbekannt, nicht `false` |
| `station_walk_min` | unsigned tinyint nullable | im Prototyp `acc` |
| `charm` | unsigned tinyint nullable | redaktionell, skaliert nicht |
| `lat`, `lon` | decimal(9,6) | |
| `zone` | enum `city`/`umland` | |
| `caveat`, `description` | text nullable | 11 Gärten haben ein `caveat` |
| `source_url`, `verified_at` | string / timestamp, nullable | |

Index auf `(lat, lon)` — das ist der Bounding-Box-Vorfilter aus `PROJECT.md`.

**`garden_tag`** — `garden_id`, `tag_id`, zusammengesetzter Primärschlüssel

**`opening_hours`** — die Tabelle, um die es in den Regeln geht

| Spalte | Typ | |
|---|---|---|
| `garden_id` | FK, cascade | |
| `area` | string(32) | `garden`, `restaurant`, `self_service` |
| `weekday` | tinyint | ISO 1 = Montag … 7 = Sonntag, passt zu Carbon |
| `is_closed` | bool, default false | Ruhetag: `true`, Zeiten `null` |
| `opens_at`, `closes_at` | time nullable | |
| `weather_dependent` | bool, default false | |
| `source_url`, `verified_at` | nullable | pro Zeile, nicht pro Garten |

Unique auf `(garden_id, area, weekday)`.

MariaDB-`TIME` fasst bis 838:59:59 — Sperrstunde nach Mitternacht wird als `24:30`
gespeichert, nicht als `00:30`. Sonst rechnet jede Abfrage falsch.

**`start_points`** — `id`, `name`, `lat`, `lon`. 63 Zeilen.

**Nicht in v1:** `legs` (kommt mit Valhalla) und die Vektor-Spalte. Zur Vektor-Spalte
siehe unten.

**Fertig, wenn:** `php artisan migrate:fresh` läuft durch.

## Schritt 4 — Models

`Garden`, `Brewery`, `Tag`, `OpeningHour`, `StartPoint`. Relations, Casts für
`verified_at` und die Booleans. Kein Repository, keine Services — dafür gibt es noch
nichts zu kapseln.

Ausnahme, die es doch gibt: **`GardenRepository::near($lat, $lon, $km)`**. Das ist
die einzige Stelle im ganzen Projekt, an der Geo-SQL stehen darf. Bounding-Box auf
`(lat, lon)` grob, `ST_Distance_Sphere` exakt auf dem Rest. Wird in v1 noch von
niemandem gebraucht — trotzdem jetzt anlegen, damit die Regel von Anfang an gilt und
nicht später zwölf Stellen zu suchen sind.

## Schritt 5 — Seeder

Quelle sind `data/gardens.json` und `data/start_points.json`, unverändert.

Drei Regeln, die beim Seeden nicht verhandelbar sind:

1. **`brewery: null` bleibt `null`.** Neun Gärten. Nicht raten, nicht „wechselnd"
   hineinschreiben, wo nichts steht.
2. **Alles bekommt `verified_at = null`.** Die Prototyp-Daten sind recherchiert, aber
   nicht gegen eine Quelle verifiziert. `null` ist die ehrliche Angabe und genau der
   Mechanismus, den die Regeln vorsehen.
3. **`open_tuesday` wird nicht übernommen.** Stattdessen: pro Garten sieben Zeilen
   `area = 'garden'`, `weekday` 1–7, mit `opens_at`/`closes_at` aus dem Prototyp.
   Für `hirschau` und `bergson` bekommt `weekday = 2` stattdessen `is_closed = true`.
   Das erfindet nichts — es überträgt das vorhandene Wissen in die richtige Form und
   markiert es als unverifiziert.

Die Mehrhäuser-Fälle aus `PROJECT.md` (Hinterbrühl, Nockherberg) werden in v1 **nicht**
aufgelöst. Dafür fehlen die Daten. Die Tabelle kann es, der Seeder liefert es noch
nicht — das ist der Unterschied zwischen Schema und Datenstand.

**Fertig, wenn:** `php artisan migrate:fresh --seed` erzeugt 35 Gärten, 63
Startpunkte, 9 Brauereien, 7 Tags und 245 Zeilen in `opening_hours`.

## Schritt 6 — API

Zwei Endpunkte, beide über API-Resources, beide ohne Auth.

```
GET /api/gardens
GET /api/start-points
```

Antwortform für `gardens`:

```json
{ "data": [{
  "slug": "augustinerkeller",
  "name": "Augustiner-Keller",
  "district": "Maxvorstadt",
  "brewery": { "key": "augustiner", "label": "Augustiner" },
  "seats": 5000,
  "tags": ["stadt", "keller", "spielplatz"],
  "self_service": true,
  "own_food_allowed": true,
  "station_walk_min": 4,
  "charm": 5,
  "lat": 48.1436, "lon": 11.5527,
  "zone": "city",
  "caveat": null,
  "description": "…",
  "opening_hours": [
    { "area": "garden", "weekday": 1, "is_closed": false,
      "opens_at": "10:00", "closes_at": "23:30", "weather_dependent": false }
  ],
  "source_url": null,
  "verified_at": null
}] }
```

Keine Paginierung. 35 Datensätze, später ein paar tausend — das ist ein Payload, kein
Suchproblem. Eager Loading auf `brewery`, `tags`, `openingHours`, sonst sind es 141
Queries.

Feature-Tests pro Endpunkt: Status 200, Anzahl stimmt, `brewery: null` bleibt `null`,
nichts behauptet `verified_at`, ein Ruhetag trägt keine Zeiten.

## Schritt 7 — Prototyp an die API

Der Prototyp bleibt inhaltlich unverändert. Zwei Eingriffe:

1. `const G = [...]` und `const PLACES = [...]` werden durch ein `fetch` plus eine
   Adapterfunktion ersetzt, die auf die Kurznamen des Prototyps abbildet
   (`slug → k`, `name → n`, `district → hood`, `brewery.key → brew`,
   `station_walk_min → acc`, `charm → q`, `description → p`, `self_service → sb`,
   `own_food_allowed → bz`). `from`/`to`/`di` kommen aus der `opening_hours`-Zeile für
   `weekday = 2`.
2. `window.storage` → `localStorage`. Die Artifact-API gibt es außerhalb des
   Artifacts nicht.

Der Adapter ist Wegwerfcode und darf hässlich sein — er stirbt mit v2.

**Fertig, wenn:** der Prototyp unter `http://localhost:8080/` läuft, Touren generiert
wie vorher, und eine Änderung an `gardens` sichtbar durchschlägt. Das ist der
eigentliche Beweis: Daten pflegbar, ohne HTML zu editieren.

---

## Definition of Done — v1 · erledigt am 10.08.2026

- [x] `docker compose up -d` startet drei gesunde Container
- [x] `php artisan migrate:fresh --seed` ist reproduzierbar
- [x] `GET /api/gardens` liefert 35 Einträge mit je 7 Öffnungszeiten
- [x] `GET /api/start-points` liefert 63 Einträge
- [x] Testsuite grün — 7 Tests, 13 Assertions
- [x] Prototyp läuft gegen die API, Generator unverändert

Datenstand nach dem Seeden: 35 Gärten, 9 Brauereien, 7 Tags, 74 Tag-Zuordnungen,
245 Öffnungszeiten, 63 Startpunkte.

Gegenprobe: `UPDATE gardens SET name = …` schlägt ohne Neustart bis ins gerenderte
Verzeichnis durch.

### Abweichungen vom Plan, bewusst

| | |
|---|---|
| Tests unter PHPUnit statt Pest | Das Laravel-13-Skelett bringt PHPUnit 12 mit. Pest wäre eine Abhängigkeit für nichts. |
| Prototyp liegt auf `/`, nicht nur `/prototype/` | In v1 **ist** der Prototyp die Seite. `/prototype/` funktioniert weiter. |
| Drei `rewrite`-Zeilen in `compose.yaml` | Caddy löst für ein Verzeichnis kein `index.html` auf und fällt auf `index.php` zurück — `/` und `/prototype/` wären sonst 404 aus Laravels Router. Ging über `CADDY_SERVER_EXTRA_DIRECTIVES`, also ohne eigene Caddyfile. |
| Tests laufen gegen `beergarden_test` in MariaDB | Nicht gegen SQLite in-memory. Sonst testet man ein anderes Schema, als in Produktion läuft — `enum`, `TIME` über 24 h und `ST_Distance_Sphere` verhalten sich unterschiedlich. Angelegt von `docker/mariadb-init.sql`. |

## Bewusst nicht in v1

| | warum |
|---|---|
| Vektor-Spalte | Die DB-Wahl sichert die Möglichkeit. Die Spalte kommt mit ihrem ersten Nutzer — semantische Suche im Verzeichnis. Eine leere Spalte, die niemand liest, ist totes Schema. Mit Laravel 13 ist das Nachrüsten `$table->vector('embedding', 768)` plus `vectorIndex()`, also eine Migration. |
| `legs` + Valhalla | Backlog 2. Braucht erst Daten in der DB. |
| Crawler | Backlog 6. Braucht erst `source_url`-Felder mit Inhalt. |
| Nuxt | v2. Der Prototyp beweist die Datenstrecke billiger. |
| Wochentagswahl im UI | Backlog 7. Das Schema kann es ab jetzt — das UI ist die kleinere Hälfte. |
| Horizon | Erst wenn es Jobs gibt. |

---

## v2 — Nuxt-Frontend · erledigt am 10.08.2026

`web/` mit Nuxt 4.5 auf Node 24, als vierter Compose-Service auf Port 3000.

**Der Kern liegt in `web/core/`, außerhalb von `app/`.** Elf Module, reine
Funktionen, kein Vue, kein Nuxt, kein DOM, kein Netzzugriff: `types`, `time`,
`geo`, `travel`, `hours`, `garden`, `scoring`, `generator`, `schedule`, `sun`.
Die Regel aus `CLAUDE.md` ist damit nicht mehr nur eine Absicht, sondern
nachprüfbar — ein `grep` auf Framework-Importe im Kern muss leer bleiben.

**Rendering pro Route, wie im Frontend-Kapitel entschieden:**

| Route | Modus | |
|---|---|---|
| `/` | `ssr: false` | Der Planer rechnet im Client und liest `localStorage`. |
| `/verzeichnis` | vorgerendert | Einstiegsseite, verlinkt alle 35 Detailseiten. |
| `/biergarten/[slug]` | vorgerendert | 35 statische Seiten mit Titel und Description. |

`npm run generate` erzeugt 75 Routen in 1,3 Sekunden. Gegenprobe am statischen
HTML ohne JavaScript: Name, Stadtteil, Öffnungszeiten und Meta-Description sind
enthalten. **In Produktion läuft dafür kein Node** — nur im Build.

**Drei Dinge sind unterwegs ehrlicher geworden:**

1. **Sonnenuntergang wird gerechnet, nicht behauptet.** Die Konstante 20:34 ist
   weg, `core/sun.ts` rechnet pro Tag und Ort. Nebenbei kam heraus, dass die
   dokumentierte Konstante zwei Minuten zu früh war.
2. **Wochentag ist wählbar** — Backlog 7, praktisch geschenkt durch die eigene
   `opening_hours`-Tabelle.
3. **„31° · Sonne" ist raus.** Für das Wetter im Kopfbereich gab es nie eine
   Quelle, und eine erfundene Wetterlage widerspricht den eigenen Regeln.

**Tests:** 33 Vitest-Fälle gegen den Kern, hermetisch — Fixture aus sieben echten
Gärten im Code, kein Dateizugriff, kein Netz.

### Abweichungen und offene Punkte

| | |
|---|---|
| `vue` und `vue-router` nicht in `package.json` | Ein Pin auf `vue@^3.6` schlug fehl, weil 3.6 noch RC ist. Nuxt bringt beide selbst mit — die richtige Lösung ist, sie gar nicht zu deklarieren. |
| `node_modules` als benanntes Volume | Rollup und esbuild bringen native Binaries mit; die eines macOS-Hosts laufen im Linux-Container nicht. |
| Detailseiten holen die ganze Collection | Und das ist in Ordnung. Nachgemessen am SELECT-Zähler der Datenbank: ein Aufruf von `/api/gardens` kostet 4 SELECTs, der komplette Build über 75 Routen kostet 6 — Nitro hält den Fetch über alle vorgerenderten Routen hinweg fest. Ein `GET /api/gardens/{slug}` ist also nicht nötig. Falls die Payload deutschlandweit unhandlich wird, ist die Antwort eine schlankere Listendarstellung, nicht ein Endpunkt pro Garten. |
| Aussehen unverändert | Das CSS ist der Prototyp, Zeichen für Zeichen. Redesign ist Backlog 10. |
| `prototype/` lebt noch | Läuft weiter unter Port 8080. Stirbt, wenn v2 sich bewährt hat. |
