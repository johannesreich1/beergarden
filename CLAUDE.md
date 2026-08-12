# beergarden

Tourenplaner für Biergärten. München zuerst, Deutschland später. Kein Login.

Lies `docs/PROJECT.md` — dort stehen Datenmodell, Generator-Algorithmus,
Routing-Entscheidung, Frontend-Entscheidung und Backlog. Hier nur die Kurzfassung
plus die Regeln fürs Arbeiten im Repo.

## Stand

**v1 und v2 laufen.** `docker compose up -d`, dann:

| | |
|---|---|
| `http://localhost:3000` | Nuxt-Frontend — Planer, Verzeichnis, Detailseiten |
| `http://localhost:8080` | Laravel-API, dazu der alte Prototyp unter `/` |

`api/` ist die Laravel-Anwendung: Schema, Seeder aus `data/*.json`,
`GET /api/gardens` und `GET /api/start-points`. Sonst nichts.

`web/core/` ist der framework-freie Kern — Fahrzeitmodell, Generator, Scoring,
Ablauf, Sonnenuntergang. Reine Funktionen mit Vitest-Abdeckung (`npm test`),
Typprüfung über `npm run typecheck`. `web/app/` ist Nuxt.

**Alle UI-Texte liegen in `web/i18n/locales/de.json`** (@nuxtjs/i18n, Strategie
`no_prefix` — die deutschen URLs bleiben). Im Code stehen Schlüssel, nie Sätze;
der Kern liefert strukturierte Daten (z. B. `GenerateReason`), die Wörter macht
die App-Schicht daraus. Gleiche Aussage = gleicher Schlüssel; verlinkte
Schlüssel (`@:nav.plan`) statt kopierter Werte.

**Karten laufen mit eigenen Kacheln.** `tools/fetch-tiles.sh` schneidet einmalig
rund 32 MB Protomaps-Basiskarte für den Großraum München nach
`web/public/tiles/`. Die Datei liegt nicht im Git — ohne sie bleiben die Karten
leer, sonst passiert nichts. Der Stil steht in `web/app/utils/mapStyle.ts` und
liest seine Farben aus `main.css`; bewusst ohne Beschriftung, weil jede
Label-Schrift eine Datei von einem fremden Server wäre.

`prototype/index.html` läuft weiter, holt seine Daten per `fetch` und stirbt, sobald
sich v2 bewährt hat.

`data/gardens.json` und `data/start_points.json` bleiben die Quelle des Seeders.

**Das Aussehen ist unverändert der Prototyp.** Ein Redesign steht aus — nicht in
Styling investieren, ohne dass es angefragt ist.

## Zielstack

- PHP 8.5, Laravel 13, MariaDB 12.3, Redis, Docker Compose
- FrankenPHP statt nginx + php-fpm — ein Service, keine Config-Datei
- Queue statt Cron-Skripte, Horizon für Observability
- Nuxt 4 + TypeScript, PWA zuerst, Store über Capacitor offen
- MapLibre + Protomaps für Karten
- Valhalla im Container für Fuß-/Rad-Routing
- Python nur, falls Scrapy wirklich gebraucht wird — sonst alles in PHP

## v1 — bewusst klein

Daten raus aus dem JS, rein in MariaDB. Compose, Migration, Seeder,
`GET /api/gardens`. Das Frontend bleibt der Prototyp, holt `G` nur noch von der API.
Kein Crawler, kein Routing-Service, kein Framework-Umbau.

Schritt für Schritt: `docs/PLAN.md`.

## Prinzipien

Diese drei stehen über allen Einzelregeln. Wenn eine Regel weiter unten mit ihnen
kollidiert, gewinnen sie.

**KISS — die einfachste Lösung, die das Problem wirklich löst.** Nicht die
einfachste, die es zu lösen *scheint*. Kein Muster, das erst ab einer Größe trägt,
die dieses Projekt nicht hat: kein Repository pro Tabelle, keine Schnittstelle mit
einer Implementierung, keine Abstraktion auf Vorrat. Umgekehrt aber auch keine
Abkürzung, die man später zweimal baut — die eigene `opening_hours`-Tabelle ist
teurer als ein Zeitpaar am Garten und trotzdem richtig.

**DRY — dieselbe Aussage nur an einer Stelle.** Das gilt für Code, für Konstanten
und für Wörter im UI. Wenn „warst du" die Beschriftung für einen besuchten Garten
ist, heißt sie überall so und nicht an einer Stelle „war". Zwei Schreibweisen für
dieselbe Sache sind ein Fehler, auch wenn beide gut aussehen. Farben, Fahrzeiten
und Bezeichnungen haben je eine Quelle: `main.css`, `web/core/`,
`web/i18n/locales/de.json`.

Die Grenze: DRY heißt nicht, zwei Dinge zusammenzulegen, die heute zufällig gleich
aussehen. Gleicher Code ist kein Grund, gleiche Bedeutung schon.

**Best Practice heißt hier: die Regel des Werkzeugs, nicht die eigene.** Migrations
statt SQL, Eloquent-Relationen statt Joins von Hand, `useState` statt globaler
Variablen, CSS-Variablen statt fester Farbwerte. Wo wir bewusst abweichen, steht der
Grund als Kommentar an der Stelle — nicht in einem Dokument, das niemand aufmacht.

**Prüfbar statt behauptet.** Eine Regel, die kein Test und kein `grep` nachweisen
kann, ist eine Absichtserklärung. Der framework-freie Kern ist eine Regel, weil ein
`grep` sie prüft. Die Öffnungszeiten-Prüfung ist eine, weil Tests sie prüfen.

## Regeln

**Öffnungszeiten gehören in eine eigene Tabelle**, mit `weekday` und `area`.
Restaurant und Selbstbedienungs-Biergarten haben im selben Haus unterschiedliche
Zeiten. `open_tuesday` in `gardens.json` ist Prototyp-Schrott und wird nicht
übernommen.

**Datenherkunft ist Teil der Daten.** Jeder Fakt bekommt `source_url` und
`verified_at`. Nicht sicher Verifizierbares bleibt `null` — nicht raten. Gilt für
Brauerei und Öffnungszeiten gleichermaßen.

**Geschätzte Zeiten werden gekennzeichnet.** Solange die Heuristik läuft, steht im UI
ein `≈` und ein Link auf die echte Verbindung. Keine erfundene Präzision.

**Fuß und Rad selbst routen, ÖPNV zukaufen.** Valhalla für alles Statische, weil
kostenlos, unbegrenzt wiederholbar und mit Steigungsmodell. Google nur für ÖPNV, und
nur wenn es genau sein muss. Google-Antworten nicht dauerhaft in eigene Tabellen
schreiben.

**Beim Crawlen höflich sein.** robots.txt respektieren, ETag/If-Modified-Since,
User-Agent mit Kontaktadresse, Throttle pro Domain.

**Hash-Gate vor jeder LLM-Extraktion.** Gehasht wird der normalisierte Text, nicht das
Roh-HTML — sonst feuert das Gate nie.

**Extraktion als Kaskade.** JSON-LD → Places → OSM → Regex → LLM. Das LLM ist die
letzte Stufe, nicht die erste.

**Generator, Fahrzeitmodell und Scoring bleiben reine Funktionen.** Kein DOM, kein
Framework, keine Laravel-Abhängigkeit. Eigene TS-Module, damit Web und App sie teilen.
Das ist keine Hygiene, sondern die Versicherung gegen die Framework-Wahl: solange die
Regel hält, ist ein Wechsel ein UI-Rewrite und kein Neuanfang.

**Geo-SQL nur in `GardenRepository::near()`.** Bounding-Box auf `(lat, lon)` grob,
`ST_Distance_Sphere` exakt. Nirgends sonst. MariaDB hat kein `geography` und kein
`ST_DWithin` — für den Umkreis-Vorfilter dieses Projekts ist das folgenlos, aber die
Naht muss existieren, falls die DB-Entscheidung je kippt.

**Offline-first schließt serverseitig gerenderte Seiten für den Planer aus.** Deshalb
kein Inertia, kein Livewire — nicht wegen Interaktivität, sondern weil eine
Inertia-Seite eine Server-Antwort ist. Verzeichnisseiten dürfen vorgerendert sein, der
Planer läuft im Client.

## Konventionen

- Deutsch im UI und in den Daten, Englisch im Code und in Commits
- Migrations sind die Wahrheit über das Schema, kein manuelles SQL
- Ein Job pro externer Quelle, kein Sammel-Command der alles macht
- `SourceFetcher`-Interface, damit Crawler-Implementierungen austauschbar bleiben

## Erster sinnvoller Schritt

v1 nach `docs/PLAN.md`. Danach Backlog Punkt 1 und 2: Overpass-Import als erste
`SourceFetcher`-Implementierung, dann der Valhalla-Container.
