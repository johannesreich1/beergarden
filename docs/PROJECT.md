# Biergarten-Planer München

Stand: 10.08.2026 · Prototyp fertig, Laravel-Anwendung steht aus

Dieses Dokument begründet. Die Arbeitsschritte stehen in `PLAN.md`.

## Was das ist

Ein Tourenplaner für Biergärten. Man gibt Startpunkt, Zeitfenster, Fortbewegungsart
und Wünsche ein, das System schlägt Touren mit 2–4 Stationen vor — inklusive
Alternativen, unter Berücksichtigung von Öffnungszeiten.

Ursprung: die Frage nach einer Biergarten-Tour für einen Dienstagnachmittag ab
Candidplatz. Daraus wurde erst eine feste Route, dann ein Generator, dann ein
Verzeichnis. Der Prototyp liegt in `public/index.html` — eine einzelne HTML-Datei,
kein Build, keine Abhängigkeiten, läuft per Doppelklick.

Ziel: München zuerst, Deutschland später. Kein Login.

## Prototyp — Funktionsumfang

**Tour bauen**

- Startpunkt aus 63 hinterlegten Haltestellen/Vierteln, plus Geolocation-Button
- Startzeit, Zeitfenster 4–7 h, 2–4 Stationen
- Fortbewegung: Gemischt / Zu Fuß / Rad / ÖPNV
- Slider für die maximale Etappenlänge im gewählten Modus
- Wunschfilter: Charakter, Brauerei, Selbstbedienung, eigene Brotzeit,
  „nur neue", „nur Stadtgebiet", „mindestens einer am Wasser"
- Generator liefert bis zu 6 Vorschläge, nach Stopp-Set entdupliziert
- Gewählte Tour: SVG-Karte, Zeitstrahl mit Sonnenuntergangsmarke, Ablauf
- Pro Etappe **alle drei** Modus-Zeiten, jede verlinkt nach Google Maps
- Pro Station: Dauer ±15 min, auslassen, „hier Schluss", „war ich schon"

**Verzeichnis**

35 Einträge, Volltextsuche, gleiche Filter, sortiert nach Fahrzeit ab Startpunkt.

**Persistenz** über `window.storage` (Artifact-API, Key `bg-planer-v4`).
In der echten Anwendung zu ersetzen.

## Daten

`data/gardens.json` — 35 Biergärten, exportiert aus dem Prototyp.
`data/start_points.json` — 63 Startpunkte.

| Feld | Bedeutung |
|---|---|
| `slug` | Identifier |
| `name`, `district` | |
| `brewery` | Key, `null` = nicht sicher verifiziert (9 von 35) |
| `seats` | Sitzplätze |
| `tags` | wasser, wald, stadt, aussicht, keller, spielplatz, musik |
| `self_service`, `own_food_allowed` | |
| `opens_at`, `closes_at` | `HH:MM` |
| `station_walk_min` | Fußweg von der nächsten Haltestelle |
| `charm` | 1–5, redaktionell, treibt das Ranking |
| `lat`, `lon` | |
| `zone` | `city` oder `umland` |
| `open_tuesday` | **Prototyp-Schrott, siehe unten** |
| `caveat` | Einschränkung im Klartext |
| `description` | |
| `source_url`, `verified_at` | leer, für den Crawler vorbereitet |

### Schema-Hinweis: Öffnungszeiten gehören in eine eigene Tabelle

`open_tuesday` und das Paar `opens_at`/`closes_at` sind Abkürzungen für den einen
konkreten Zieltag. Richtig ist `opening_hours(garden_id, weekday, area, opens_at,
closes_at, weather_dependent)`.

`area` ist nicht optional. Bei mehreren Häusern haben Restaurant und
Selbstbedienungs-Biergarten unterschiedliche Zeiten — Hinterbrühl (SB derzeit vor
allem Sa/So, Restaurant täglich ab 11:30) und Nockherberg (SB Mo–Fr erst ab 16:00)
sind die Fälle, die mir bei der Recherche untergekommen sind. Flach modelliert baust
du das später zweimal.

## Routengenerator

1. Kandidaten nach Filtern einschränken
2. Fahrzeitmatrix Start→Garten und Garten→Garten vorberechnen
3. Tiefensuche über Pfade der Länge n, pro Schritt nur die 14 nächsten Nachbarn
4. Pruning auf Zeitbudget; Etappen über dem Modus-Limit fallen raus
5. Sitzzeit = (Budget − Fahrzeit) / n, gedeckelt auf 45–150 min
6. Öffnungszeiten prüfen: Ankunft ≥ `opens_at`, Abfahrt ≤ `closes_at`
7. Bewerten, nach Stopp-Set deduplizieren, Top 6

**Scoring**

```
+ charm * 10    je Station
- Fahrzeit * 0.75
+ Sitzzeit * 0.16
+ 5             je verschiedener Brauerei
+ 10            wenn irgendeine Station am Wasser
+ 14            wenn die letzte Station Wasser/Aussicht hat und nach Sonnenuntergang endet
- 22            je bereits besuchter Station
- 6             wenn die letzte Station eine Einschränkung hat
```

## Fahrzeitmodell im Prototyp — eine Krücke

```
walk    = luftlinie * 1.30 / 4.8 km/h
bike    = luftlinie * 1.25 / 15 km/h + 2 min
transit = 9 + acc(a) + acc(b) + luftlinie * 1.30 / 20 km/h
```

Gegenprobe Seehaus → Waldwirtschaft Großhesselohe: Modell sagt Rad 49, ÖPNV 68.
Real rund 12 km auf dem Isarradweg, also 45–55 min mit dem Rad, und 55–70 min mit
U-Bahn plus S7 im 20-Minuten-Takt. Passt in der Größenordnung.

**Bekannte systematische Fehler**

1. ÖPNV bei durchgehenden U-Bahn-Verbindungen zu schlecht. Hofbräukeller →
   Michaeligarten: Modell 34 min, real ~25. Die pauschalen 9 Minuten Grundzeit
   passen für S-Bahn ins Umland, nicht für eine U-Bahn-Achse.
2. Keine Höhenmeter. Anstiege nach Großhesselohe und zur Menterschwaige fehlen.
3. Radfaktor 1.25 stimmt entlang der Isar, quer über den Mittleren Ring eher 1.4.

Im UI steht deshalb überall `≈` plus ein Link auf die echte Verbindung. Das bleibt
so, bis echtes Routing dahinter liegt.

## Routing — Entscheidung

**Valhalla im Container für Fuß und Rad.** Das ist echtes Routing, keine Schätzung:
Valhalla baut aus OSM einen Graphen aus tatsächlichen Wegen — Isarradweg, Brücken,
Trampelpfade, Treppen, Einbahnstraßen, Oberfläche, Steigung — und sucht darin den
kürzesten Pfad. Für Fuß und Rad in Deutschland ist OSM die stärkere Quelle als
Google; Radinfrastruktur ist hier extrem dicht getaggt, deshalb basieren Komoot und
die meisten Radrouter darauf. `use_hills` gibt es bei Google gar nicht — genau das
behebt Fehler 2.

Geofabrik-Extract: Oberbayern ~500 MB, Deutschland ~4 GB.
`sources_to_targets` liefert ganze Matrizen in Millisekunden, beliebig oft, kostenlos.

**Validierung:** zehn Etappen aus dem Bestand einmal durch Valhalla, einmal durch
Google Maps und Komoot, Abweichung anschauen. Systematische Fehler sieht man an
zehn Werten.

**Warum nicht Google für die Matrix:** die Matrix ist nur statisch, solange der
Bestand statisch ist. Jeder neue Garten heißt neue Zeile *und* neue Spalte,
deutschlandweit wächst das quadratisch, jeder Rebuild kostet wieder. Dazu die
Caching-Beschränkungen in den Google Maps Platform Terms.

**ÖPNV ist der Fall, wo Google wirklich etwas kann,** was man nicht nachbaut: echte
Fahrpläne, Umstiege, Echtzeit. Alternative wäre OTP2 mit DELFI-GTFS — deutlich mehr
Arbeit als ein Valhalla-Container. In v1 nicht nötig.

**Vorfilter:** nur Paare unter 15 km routen. Bei 500 Gärten sind das ~20.000 Paare
statt 250.000. Bounding-Box auf dem Index `(lat, lon)` grob, `ST_Distance_Sphere`
exakt auf dem Rest.

Ursprünglich stand hier PostGIS `ST_DWithin` auf `geography`. Die Datenbank ist
MariaDB geworden — Begründung im Kapitel „Datenbank". Für diesen Vorfilter ist das
folgenlos: er ist eine Bounding-Box-Frage, kein Geometrie-Problem.

**Ablage:** `legs(from_id, to_id, mode, seconds, meters, computed_at)`,
Unique-Index auf die ersten drei.

**Startpunkt→Garten** ist das eigentliche Problem, weil beliebig. Geohash auf
Precision 6 runden (~600 m Raster) als Cache-Key, oder auf die nächste Haltestelle
snappen. Konvergiert nach wenigen Wochen.

## Datenpflege

Kaskade statt Entweder-oder. Jede Stufe fängt ab, was die vorige nicht liefert:

| Stufe | Quelle | Aufwand |
|---|---|---|
| 1 | JSON-LD auf der Wirtsseite (`openingHoursSpecification`) | `json_decode` |
| 2 | Google Places `regularOpeningHours` | schon strukturiert |
| 3 | OSM `opening_hours` | formale Syntax, fertige Parser |
| 4 | Regex für deutsche Standardmuster | ~20 Patterns |
| 5 | LLM-Extraktion | nur der Rest |

Stufe 1 wird unterschätzt: die meisten Wirtsseiten sind WordPress mit SEO-Plugin und
liefern `LocalBusiness`/`Restaurant`-Schema frei Haus.

Stufe 5 braucht es für Prosa mit Bedingungen: „Bei Biergartenwetter täglich ab 12 Uhr",
„SB-Biergarten Sa & So & Feiertag, Restaurant Montag Ruhetag".

**Hash-Gate** vor der Extraktion. Spart Token, CPU und Last beim Wirt — und liefert
ein Änderungslog, das für sich schon wertvoll ist. Fallstrick: **nicht über das
Roh-HTML hashen.** CSRF-Token, Session-IDs, Werbeslots und Zeitstempel ändern sich
bei jedem Abruf, dann feuert das Gate nie. Über den normalisierten Text hashen.
Davor ETag bzw. `If-Modified-Since`; bei 304 wurde gar nicht erst geladen.

## Crawler

Kein Scrapy, kein Roach. Laravels Queue **ist** der Scheduler:

| Scrapy/Roach | Laravel-Äquivalent |
|---|---|
| Downloader-Delay | `Redis::throttle()` als Job-Middleware, pro Domain |
| Retry/Backoff | `$tries`, `backoff()` |
| Dedup | `WithoutOverlapping` + Unique-Constraint |
| Fehlerisolation | `failed_jobs` — ein toter Wirt killt den Lauf nicht |
| Item-Pipeline | Model + Validator |

Ein `FetchSourceJob` pro Garten. Skaliert von 35 auf 5.000 ohne Änderung.

**Roach wäre gerechtfertigt** bei echtem Link-Following. Für die deutschlandweite
Ausweitung ist Crawling aber der falsche Weg zur Discovery: OSM hat
`amenity=biergarten` als eigenen Tag, eine Overpass-Query liefert alle deutschen
Biergärten mit Koordinaten, oft Website und `opening_hours`, in einem Request.
Danach ist es wieder „N bekannte URLs abholen".

Deshalb `SourceFetcher`-Interface bauen. Roach oder ein Scrapy-Container lassen sich
später dahinterhängen.

Beim Crawlen: robots.txt respektieren (`gasthof-hinterbruehl.de` liefert ein
Disallow), User-Agent mit Kontaktadresse, Throttle pro Domain.

## Datenbank — Entscheidung

**MariaDB 12.3.** Nicht PostgreSQL mit PostGIS, wie hier ursprünglich stand.

Der ehrliche Grund zuerst: sie wird betrieben, nicht bewundert, und MariaDB ist die,
mit der hier gearbeitet wird. Das ist bei einem Solo-Projekt ein zulässiges und
schwer wiegendes Argument.

**Was PostGIS gekonnt hätte und hier nicht gebraucht wird.** MariaDB hat kein
`geography`, kein `ST_DWithin`, keinen SRID-bewussten Spatial-Index — die R-Trees
rechnen planar. Nur: der einzige Geo-Anwendungsfall in diesem Projekt ist ein
Umkreis-Vorfilter über 35 Datensätze, deutschlandweit realistisch 3.000–6.000
(`amenity=biergarten` gibt nicht mehr her). Der komplette Bestand passt in den Buffer
Pool. Eine Bounding-Box plus `ST_Distance_Sphere` löst das vollständig. PostGIS würde
hier nichts gewinnen, was messbar wäre.

Weh täte es erst bei echten Polygon-Operationen — Stadtgrenzen, Isartal-Korridor,
Isochronen-Flächen. Isochronen kommen aus Valhalla, nicht aus der Datenbank. Die
anderen beiden sind hypothetisch.

**Die Naht dagegen:** sämtliches Geo-SQL lebt in `GardenRepository::near()` und
nirgends sonst. Falls die Entscheidung je kippt, ist es eine Datei.

**Vektoren.** MariaDB kann `VECTOR` seit 11.7, Laravel 13 unterstützt es first-class
(`$table->vector()`, `$table->vectorIndex()`, eigene MariaDB-Grammar). Das ist der
Grund, warum die Möglichkeit gesichert ist — nicht der Grund für die DB-Wahl.

Nüchtern: bei ein paar tausend Zeilen ist ein HNSW-Index Dekoration, Brute-Force über
5.000 Embeddings dauert Mikrosekunden. Der Nutzen liegt woanders:

1. **Semantische Suche im Verzeichnis** — „ruhig, schattig, gut mit Kindern" gegen
   `description`. Das trägt, und es passt zu einem Verzeichnis mit redaktionellem Text.
2. **Entity-Resolution beim Overpass-Merge** — ist „Waldwirtschaft Großhesselohe"
   derselbe Eintrag wie „Waldwirtschaft"? Hier Vorsicht: Geo-Distanz unter 100 m plus
   normalisierter Name schlägt das Embedding fast immer und ist debuggbar. Vektoren
   sind auch hier die letzte Stufe der Kaskade, nicht die erste.

Die Spalte kommt deshalb mit ihrem ersten Nutzer, nicht auf Vorrat.

## Frontend

**Nuxt 4 mit Vue und TypeScript.** Der Ausschlag: vorhandene Vue-Erfahrung. Bei einem
Projekt ohne Deadline ist das kein weiches Argument, sondern das härteste im
Vergleich — ein theoretisch besserer Native-Pfad für eine App, die es vielleicht nie
gibt, wiegt weniger als Frontend-Code, der am Feierabend flüssig entsteht.

**Was das kostet.** Der Weg in den Store schrumpft auf Capacitor, also die Web-App im
WebView. Kein Expo, und `@maplibre/maplibre-react-native` hat kein Vue-Äquivalent.
Für diese App ist das verkraftbar: kein Login, keine Zahlung, kein
Hintergrund-Standort — genau die Fälle, in denen WebView-Apps unangenehm werden,
kommen nicht vor. Der eine echte Klempner-Job ist `.pmtiles` offline im Bundle,
bedient über einen lokalen Protocol-Handler mit Range-Requests.

**Livewire und Inertia fallen raus, aber nicht aus dem Grund, der hier stand.** Das
Argument „jeder Slider-Zug startet den Generator neu, das darf kein HTTP-Roundtrip
sein" trägt nicht — Inertia macht Roundtrips nur bei Page-Visits, der Generator liefe
problemlos clientseitig in der Komponente. Das richtige Argument ist: **eine
Inertia-Seite ist eine Server-Antwort.** Eine App, die in den Isarauen mit einem
Balken Empfang funktionieren soll, kann das nicht. Offline-first schließt Inertia aus,
nicht die Interaktivität. Mit Vue auf dem Tisch ist Inertia sonst der naheliegende
Laravel-Weg — deshalb muss dieser Punkt festgehalten sein, sonst kippt die
Entscheidung beim nächsten Nachdenken.

**Rendering pro Route, kein Node in Produktion.** Nuxt kann das über `routeRules`:

```ts
'/biergarten/**': { prerender: true },   // Detailseiten, SEO, statisch ausgeliefert
'/verzeichnis':   { swr: 3600 },
'/planer':        { ssr: false },        // reine SPA, Generator im Client
```

Ein deutschlandweites Verzeichnis lebt von organischem Traffic — deshalb SSR. Die
Struktur ändert sich etwa zweimal im Jahr, deshalb reicht Vorrendern zur Build-Zeit
und Node läuft nur im Build. Öffnungszeiten holt die Seite clientseitig nach, die
brauchen keinen SEO-Wert.

**Wichtiger als die Framework-Wahl:** Generator, Fahrzeitmodell und Scoring sind
reine Funktionen. Kein DOM, kein Framework, keine Laravel-Abhängigkeit. Als nacktes
TypeScript in eigene Dateien — `travel.ts`, `generator.ts`, `scoring.ts`, `types.ts`.
Noch kein Monorepo mit `packages/core`, das ist bei 35 Datensätzen Overhead. Saubere
Trennung reicht.

Diese Regel ist ab jetzt nicht mehr Hygiene, sondern die Versicherungspolice: solange
sie hält, ist ein Wechsel zu React Native ein UI-Rewrite von etwa zwei Wochen und
kein Neuanfang. Damit ist die Vue-Entscheidung reversibel und muss nicht länger
verteidigt werden.

**PWA zuerst, Store offen.** Ohne Login, ohne Bezahlung, mit ein paar hundert KB
Daten deckt eine PWA fast alles ab. Offline ist hier kein Nice-to-have — man steht in
den Isarauen mit einem Balken Empfang. Vorgeladener Datensatz plus Service Worker
über `@vite-pwa/nuxt`. Store-Auffindbarkeit ist der einzige Grund für Capacitor, und
ob es den je braucht, ist nicht entschieden.

**Karte:** MapLibre GL JS, im Web wie im WebView dieselbe Bibliothek. Tiles über
Protomaps — eine `.pmtiles`-Datei für Bayern, statisch ausgeliefert, offline nutzbar,
nichts pro Abruf. Damit bei Karten genauso unabhängig wie beim Routing.

Die selbstgezeichnete SVG-Karte nicht wegwerfen. Als Übersicht in der
Vorschlagsliste ist sie charmanter als eine echte Karte und rendert sofort.

## Datenqualität

- 9 von 35 Einträgen ohne verifizierte Brauerei. Bewusst offen gelassen statt geraten.
- Öffnungszeiten von Biergärten sind Wetterangaben. „Bei schönem Wetter" heißt: der
  Wirt entscheidet morgens um neun. Steht nirgends, mit keinem Crawler zu holen.
  Begrenzt, wie viel Technik sich lohnt.
- Struktur ändert sich etwa zweimal im Jahr, zur Saison.
- `charm` ist redaktionelle Einschätzung. Skaliert nicht auf Deutschland — dort
  braucht es ein anderes Qualitätssignal.

## v1 — bewusst klein

Daten raus aus dem JS, rein in die Datenbank. Sonst nichts.

- `compose.yaml`: FrankenPHP, MariaDB, Redis — drei Services
- Migration und Seeder aus `data/gardens.json`, Öffnungszeiten als eigene Tabelle
- `GET /api/gardens`, `GET /api/start-points`
- Der Prototyp bleibt wie er ist, nur dass `G` gefetcht statt hartkodiert wird
- Generator bleibt im Frontend, Nuxt kommt erst in v2

Bringt genau eine Sache: Daten pflegbar ohne HTML zu editieren.

Schritt für Schritt in `PLAN.md`.

## Backlog

1. Overpass-Import als erste `SourceFetcher`-Implementierung
2. Valhalla-Container plus Artisan-Command zum Befüllen von `legs`
3. Validierung Valhalla gegen Google/Komoot an zehn Etappen
4. ~~Frontend nach Nuxt/TS, Logik in eigene framework-freie Module~~ — **erledigt**
5. PWA: Service Worker, Offline-Datensatz, Manifest
6. Crawler-Job mit Hash-Gate und Extraktions-Kaskade
7. ~~Wochentag wählbar statt auf Dienstag verdrahtet~~ — **erledigt.** Fiel mit der
   eigenen `opening_hours`-Tabelle praktisch von selbst an: der Kern nimmt den
   Wochentag als Parameter, das UI hat sieben Knöpfe dazubekommen.
8. Echte Umstiegszahlen statt „Umstiege nicht gerechnet"
9. Deutschlandweite Ausweitung
10. Redesign der Oberfläche — das aktuelle Aussehen ist unverändert der Prototyp

## Quellen

- muenchen.de, in-muenchen.de, Websites der Wirte
- OpenStreetMap `amenity=biergarten`
- ~~Sonnenuntergang München 11.08.2026: 20:34~~ — **korrigiert: 20:36.** Die 20:34
  standen als Konstante im Prototyp und sind zwei Minuten zu früh. Nachgerechnet
  über das NOAA-Tabellenverfahren (20:36) und über die Implementierung in
  `web/core/sun.ts` (20:37); an beiden Sonnenwenden decken sich beide Verfahren
  auf die Minute. Die Konstante ist ersatzlos weg — der Sonnenuntergang wird
  jetzt pro Tag und Ort gerechnet.
