# Design-Entwürfe

Stand: 10.08.2026 · zehn Richtungen zur Auswahl, noch nichts davon gebaut

Alle Entwürfe zeigen **denselben Inhalt mit echten Daten** — dieselbe Tour ab
Candidplatz, dieselben sechs Verzeichniseinträge, dieselben Fahrzeiten aus der
laufenden Anwendung. Nur so lassen sie sich vergleichen: was sich unterscheidet,
ist die Gestaltung, nicht der Inhalt.

**Ansehen:** `http://localhost:8080/design/` — die Galerie zeigt jede Richtung
gleichzeitig als Mobil (390 px), Tablet (834 px) und Desktop (1440 px).

## Woran ich mich gehalten habe

Keine abgerundeten Ecken als Grundhaltung, keine farbigen Balken links an Karten,
keine weichen Schatten unter allem. Diese drei Muster sind der Grund, warum
Oberflächen „nach KI" aussehen — sie tauchen unabhängig vom Thema auf.

Wo Rundungen vorkommen, haben sie einen Grund aus der Sache selbst: ein Bierdeckel
ist rund, ein Krugdeckel ist rund. Sonst nirgends.

Keine Web-Schriften. Alles nutzt Schriften, die auf deinem Rechner liegen —
Futura, Optima, Didot, Copperplate, American Typewriter, Menlo, Helvetica Neue.
Das ist eine Einschränkung, aber eine produktive: sie zwingt zu Entscheidungen
über Größe, Laufweite und Gewicht statt über Schriftauswahl. Beim späteren Bau
lassen sich einzelne davon durch echte Lizenzschriften ersetzen.

## Die zehn Richtungen

| | Richtung | Woher sie kommt | Signatur |
|---|---|---|---|
| 01 | **Bierdeckel** | Pappe, Zweifarbendruck, Passerversatz | Der Ringabdruck des Glases als einziges rundes Element |
| 02 | **Fahrplan** | MVV-Aushang, Liniendiagramm | Die Tour als Linie mit Stationspunkten und Linienfarben |
| 03 | **Emailleschild** | Alte Brauereischilder an Hauswänden | Dicke Keillinie, abgeplatzte Kanten |
| 04 | **Kastanienschatten** | Das, was einen Biergarten ausmacht | Lichtflecken, die über die Seite wandern |
| 05 | **Zinn** | Krugdeckel, Gravur | Gravierte Lettern, ein einziges Metall |
| 06 | **Isar-Topografie** | Höhenlinien, Vermessung | Die Tour als Vermessungslinie mit Peilungen |
| 07 | **Abfahrtstafel** | Fallblattanzeige am Bahnhof | Die Blattfuge quer durch jede Zeile |
| 08 | **Raute** | Bayerische Raute, streng geometrisch | Diagonale Schnitte als echtes Layoutmittel |
| 09 | **Wirtshaustafel** | Kreidetafel am Eingang | Handgezogene Linien, echte Kreidetextur |
| 10 | **Sachlichkeit** | Strenges Raster, kein Ornament | Brauereifarben als Ordnungssystem statt Dekor |

## Entschieden

**Stempel auf Kraftpappe** (`01e-stempel.html`), ausgebaut und auf der Palette aus
`palette.html`. Der Name ist **Biergarten Freunde**.

Drei Dinge kamen beim Ausbauen dazu:

1. **Das Logo ist ein Siegel** — Schrift auf dem Ring, bayerische Raute im Kern,
   Ortsangabe im Fuß, schief aufgesetzt. Ein Gummistempel sitzt nie gerade.
2. **Die Schalter sind Abdrücke**, keine Rechtecke. Ungewählt nur der Rand, gewählt
   voll durchgefärbt — und jeder sitzt anders schief. Zehn Alternativen dazu stehen
   in `buttons.html`.
3. **Die Seite ist eine Stempelkarte.** Wo du warst, ist abgestempelt. Das ist der
   Punkt, an dem der Stil aufhört, Dekoration zu sein: „War ich schon" ist ohnehin
   ein Zustand im Datenmodell, und ein Stempel ist die naheliegendste Darstellung
   dafür, die es gibt.

Die anderen sechs Ausprägungen liegen weiter daneben und sind **nicht** auf die neue
Palette umgefärbt. Sie sind Vergleichsmaterial, kein Pflegegegenstand.

## Wie das weitergeht

Such dir aus jeder Richtung heraus, was funktioniert. Erfahrungsgemäß gewinnt
selten eine ganze Richtung — es gewinnen einzelne Entscheidungen: die Typografie
aus der einen, das Raster aus der anderen, ein Detail aus der dritten. Sag mir,
welche Elemente du behalten willst, dann baue ich daraus eine Richtung und
setze sie in `web/app/` um.

Bis dahin bleibt `web/app/assets/css/main.css` unverändert der Prototyp.
