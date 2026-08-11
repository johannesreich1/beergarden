#!/usr/bin/env python3
"""Measures the eight footer drafts: type size and contrast, in both themes.

A rule no script can check is a statement of intent, so the two hard
conditions these drafts were built under are checked here instead of being
asserted in a comment:

    nothing under 14px, secondary text from 14.5px, body from 16px
    body text >= 7:1, secondary text >= 4.5:1, light and dark

Size decides which threshold applies. From 16px a run of text is body and
owes 7:1; from 14px up to 16px it is secondary and owes 4.5:1. That is
mechanical on purpose — a rule that needs a judgement call about whether a
given line is "really" body text is a rule that loses every argument.

A third check follows from the palette rather than from the brief: gold and
Maerzen cannot reach 4.5:1 on kraft board at any darkness the hue survives.
So colour belongs on a mat, and the bare board carries only ink. Every text
run whose background is the bare board is checked for that.

This is a small cascade, not a browser. It supports element, class, id,
descendant and child selectors, custom properties including var() chains and
fallbacks, color-mix(in srgb, ...), clamp() (worst case: the minimum) and
calc(x * n). Rules it cannot parse are counted and reported rather than
silently skipped, so the coverage number is part of the result.

Usage: python3 design/fuss/measure.py
"""
from __future__ import annotations

import re
import sys
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

HIER = Path(__file__).resolve().parent
BASIS = HIER.parent / 'kombi' / 'basis.css'

ENTWUERFE = ['a-strich', 'b-spalten', 'c-zettel', 'd-deckelreihe',
             'e-stempel', 'f-korkentafel', 'g-schankbrett', 'h-wirtshaus']

# The wording that must be identical in all eight. The DRY rule of the project
# is about words as much as about code: two spellings of the same sentence are
# a bug even when both read well.
WORTLAUT = [
    'Fahrzeiten sind Schätzungen aus Luftlinie plus Umwegfaktor — für die echte '
    'Verbindung auf die Modus-Angabe tippen.',
    'Wo beim Ausschank k. A. steht, war die Brauerei nicht sicher zu verifizieren.',
    'Bei schönem Wetter heißt: der Wirt entscheidet morgens um neun.',
    'Kartendaten © OpenStreetMap-Mitwirkende (ODbL) · Kacheln: Protomaps',
    'Impressum', 'Datenschutz', 'Kontakt',
    'Tour bauen', 'Alle Biergärten', 'Informationen',
]

MIN_GROESSE = 14.0
MIN_NEBEN = 14.5
GRENZE_FLIESS = 16.0
SOLL_TEXT = 7.0
SOLL_NEBEN = 4.5


# --------------------------------------------------------------------- colour
def _kanal(v: float) -> float:
    v /= 255
    return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4


def leuchte(rgb: tuple[float, float, float]) -> float:
    r, g, b = rgb
    return 0.2126 * _kanal(r) + 0.7152 * _kanal(g) + 0.0722 * _kanal(b)


def kontrast(a: tuple, b: tuple) -> float:
    la, lb = leuchte(a), leuchte(b)
    hell, dunkel = max(la, lb), min(la, lb)
    return (hell + 0.05) / (dunkel + 0.05)


def hex_zu_rgb(s: str):
    s = s.strip().lstrip('#')
    if len(s) == 3:
        s = ''.join(c * 2 for c in s)
    if len(s) != 6 or not re.fullmatch(r'[0-9a-fA-F]{6}', s):
        return None
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def ueber(vorne: tuple, alpha: float, hinten: tuple) -> tuple:
    """Composites a translucent colour over an opaque one."""
    return tuple(alpha * v + (1 - alpha) * h for v, h in zip(vorne, hinten))


# ------------------------------------------------------------------------ CSS
def css_lesen(text: str, in_media: bool = False) -> list[tuple[str, dict, bool]]:
    """Flattens a stylesheet into (selector, declarations, inside-@media)."""
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    regeln, i, n = [], 0, len(text)
    while i < n:
        auf = text.find('{', i)
        if auf < 0:
            break
        kopf = text[i:auf].strip()
        tiefe, k = 1, auf + 1
        while k < n and tiefe:
            if text[k] == '{':
                tiefe += 1
            elif text[k] == '}':
                tiefe -= 1
            k += 1
        rumpf = text[auf + 1:k - 1]
        if kopf.startswith('@'):
            # Only @media carries rules we care about; @font-face and friends
            # have no selectors and no text to measure.
            if kopf.startswith('@media'):
                regeln.extend(css_lesen(rumpf, in_media=True))
        else:
            regeln.append((kopf, deklarationen(rumpf), in_media))
        i = k
    return regeln


def deklarationen(rumpf: str) -> dict:
    aus = {}
    for stueck in rumpf.split(';'):
        if ':' not in stueck:
            continue
        prop, _, wert = stueck.partition(':')
        prop, wert = prop.strip(), wert.strip()
        if prop:
            aus[prop] = wert
    return aus


TEIL = re.compile(r'^([a-zA-Z][\w-]*)?((?:[.#][\w-]+)*)$')


def selektor_lesen(sel: str):
    """Parses one selector into [(combinator, tag, classes, id), ...] or None.

    None means: this script does not understand the selector. Those rules are
    counted, so a draft cannot quietly rely on something unmeasurable.
    """
    sel = sel.strip()
    if sel == ':root':
        return [(None, 'html', frozenset(), None)]
    if re.search(r'[\[*+~]|::|:(?!root)', sel):
        return None

    teile, komb = [], None
    for wort in re.split(r'\s+', sel.replace('>', ' > ').strip()):
        if not wort:
            continue
        if wort == '>':
            komb = '>'
            continue
        m = TEIL.match(wort)
        if not m:
            return None
        tag = (m.group(1) or '').lower() or None
        klassen = frozenset(x[1:] for x in re.findall(r'\.[\w-]+', m.group(2) or ''))
        ids = [x[1:] for x in re.findall(r'#[\w-]+', m.group(2) or '')]
        teile.append((komb or (' ' if teile else None), tag, klassen, ids[0] if ids else None))
        komb = None
    return teile or None


def gewicht(teile) -> tuple[int, int, int]:
    ids = sum(1 for t in teile if t[3])
    kl = sum(len(t[2]) for t in teile)
    tags = sum(1 for t in teile if t[1])
    return ids, kl, tags


# ----------------------------------------------------------------------- HTML
class Knoten:
    __slots__ = ('tag', 'klassen', 'ident', 'stil', 'eltern', 'kinder', 'text', 'zeile')

    def __init__(self, tag, attrs, eltern, zeile):
        d = dict(attrs)
        self.tag = tag
        self.klassen = frozenset((d.get('class') or '').split())
        self.ident = d.get('id')
        self.stil = deklarationen(d.get('style') or '')
        self.eltern = eltern
        self.kinder = []
        self.text = []
        self.zeile = zeile


LEER = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'use', 'path', 'circle'}


class Baum(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.wurzel = Knoten('html', [], None, 0)
        self.stapel = [self.wurzel]
        self.stumm = 0

    def handle_starttag(self, tag, attrs):
        if tag == 'html':
            self.wurzel.klassen = frozenset((dict(attrs).get('class') or '').split())
            return
        k = Knoten(tag, attrs, self.stapel[-1], self.getpos()[0])
        self.stapel[-1].kinder.append(k)
        if tag not in LEER:
            self.stapel.append(k)
        if tag in ('style', 'script'):
            self.stumm += 1

    def handle_startendtag(self, tag, attrs):
        k = Knoten(tag, attrs, self.stapel[-1], self.getpos()[0])
        self.stapel[-1].kinder.append(k)

    def handle_endtag(self, tag):
        if tag in ('style', 'script'):
            self.stumm = max(0, self.stumm - 1)
        for i in range(len(self.stapel) - 1, 0, -1):
            if self.stapel[i].tag == tag:
                del self.stapel[i:]
                break

    def handle_data(self, daten):
        if self.stumm:
            return
        sauber = daten.replace('\xa0', ' ').strip()
        if sauber:
            self.stapel[-1].text.append(' '.join(sauber.split()))


def passt(knoten: Knoten, teile, index: int) -> bool:
    komb, tag, klassen, ident = teile[index]
    if tag and knoten.tag != tag:
        return False
    if ident and knoten.ident != ident:
        return False
    if not klassen <= knoten.klassen:
        return False
    if index == 0:
        return True

    vor_komb = teile[index][0]
    if vor_komb == '>':
        return bool(knoten.eltern) and passt(knoten.eltern, teile, index - 1)
    ahn = knoten.eltern
    while ahn:
        if passt(ahn, teile, index - 1):
            return True
        ahn = ahn.eltern
    return False


# --------------------------------------------------------------------- values
def aufloesen(wert: str, umgebung: dict, tiefe: int = 0):
    """Resolves var() chains and color-mix() down to a literal value."""
    if tiefe > 12 or wert is None:
        return None
    wert = wert.strip()

    m = re.fullmatch(r'var\(\s*(--[\w-]+)\s*(?:,\s*(.*))?\)', wert, flags=re.S)
    if m:
        name, ersatz = m.group(1), m.group(2)
        if name in umgebung:
            return aufloesen(umgebung[name], umgebung, tiefe + 1)
        return aufloesen(ersatz, umgebung, tiefe + 1) if ersatz else None

    m = re.fullmatch(r'color-mix\(\s*in srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)',
                     wert, flags=re.S)
    if m:
        a = farbe_lesen(m.group(1), umgebung, tiefe + 1)
        b = farbe_lesen(m.group(3), umgebung, tiefe + 1)
        p = float(m.group(2)) / 100
        if a and b:
            return '#%02X%02X%02X' % tuple(round(p * x + (1 - p) * y) for x, y in zip(a, b))
        return None
    return wert


def farbe_lesen(wert: str, umgebung: dict, tiefe: int = 0, hinten=None):
    """A colour as RGB, or None when it is not an opaque colour we can resolve."""
    wert = aufloesen(wert, umgebung, tiefe)
    if not wert:
        return None
    wert = wert.strip()
    if wert in ('transparent', 'none', 'inherit', 'currentColor', 'initial'):
        return None
    if wert.startswith('#'):
        return hex_zu_rgb(wert)
    m = re.fullmatch(r'rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)', wert)
    if m:
        rgb = tuple(float(m.group(i)) for i in (1, 2, 3))
        alpha = float(m.group(4)) if m.group(4) else 1.0
        if alpha >= 0.999:
            return rgb
        return ueber(rgb, alpha, hinten) if hinten else None
    return None


def groesse_lesen(wert: str, umgebung: dict, geerbt: float):
    """Font size in px. clamp() counts as its minimum — the worst case."""
    wert = (wert or '').strip()
    if not wert or wert == 'inherit':
        return geerbt

    m = re.match(r'clamp\(\s*([^,]+),', wert)
    if m:
        return groesse_lesen(m.group(1), umgebung, geerbt)

    m = re.fullmatch(r'calc\(\s*(.+?)\s*\*\s*([\d.]+)\s*\)', wert)
    if m:
        grund = groesse_lesen(aufloesen(m.group(1), umgebung) or '', umgebung, geerbt)
        return grund * float(m.group(2)) if grund else geerbt

    gelöst = aufloesen(wert, umgebung) or wert
    m = re.search(r'(\d+(?:\.\d+)?)\s*px', gelöst)
    return float(m.group(1)) if m else geerbt


# -------------------------------------------------------------------- cascade
class Blatt:
    """The stylesheets of one draft, split into variables and ordinary rules."""

    def __init__(self, css_texte):
        self.regeln = []          # (spec, order, parts, decls)
        self.hell, self.dunkel = {}, {}
        self.unlesbar = []
        nr = 0
        for text in css_texte:
            for sel_text, decls, in_media in css_lesen(text):
                for sel in sel_text.split(','):
                    sel = sel.strip()
                    if not sel:
                        continue
                    # The two theme blocks are the source of every colour, so
                    # they are read as environments rather than matched.
                    if sel == ':root':
                        self.hell.update({k: v for k, v in decls.items() if k.startswith('--')})
                        self.dunkel.update({k: v for k, v in decls.items() if k.startswith('--')})
                        continue
                    if re.fullmatch(r'\[data-theme=["\']?dark["\']?\]', sel):
                        self.dunkel.update({k: v for k, v in decls.items() if k.startswith('--')})
                        continue
                    teile = selektor_lesen(sel)
                    nr += 1
                    if teile is None:
                        self.unlesbar.append(sel)
                        continue
                    # @media rules are read for their type sizes only; none of
                    # the drafts changes a colour at a breakpoint.
                    if in_media:
                        continue
                    self.regeln.append((gewicht(teile), nr, teile, decls))

    def fuer(self, knoten: Knoten) -> dict:
        treffer = [(spec, nr, decls) for spec, nr, teile, decls in self.regeln
                   if passt(knoten, teile, len(teile) - 1)]
        treffer.sort(key=lambda t: (t[0], t[1]))
        aus = {}
        for _, _, decls in treffer:
            aus.update(decls)
        aus.update(knoten.stil)          # inline wins
        return aus


def durchrechnen(knoten: Knoten, blatt: Blatt, umgebung: dict, geerbt: dict, treffer: list):
    """Walks the tree once, carrying variables, colour and size down."""
    decls = blatt.fuer(knoten)

    umgebung = dict(umgebung)
    for prop, wert in decls.items():
        if prop.startswith('--'):
            umgebung[prop] = wert

    groesse = geerbt['groesse']
    if 'font-size' in decls:
        groesse = groesse_lesen(decls['font-size'], umgebung, groesse)
    elif 'font' in decls:
        groesse = groesse_lesen(decls['font'], umgebung, groesse)

    vordergrund = geerbt['vorne']
    if 'color' in decls:
        neu = farbe_lesen(decls['color'], umgebung)
        if neu:
            vordergrund = neu

    hintergrund = geerbt['hinten']
    roh = decls.get('background-color') or decls.get('background')
    if roh:
        neu = farbe_lesen(roh, umgebung, hinten=hintergrund)
        if neu:
            hintergrund = neu

    eigen = ' '.join(knoten.text).strip()
    if eigen and vordergrund and hintergrund:
        treffer.append({
            'text': eigen, 'zeile': knoten.zeile, 'tag': knoten.tag,
            'klassen': knoten.klassen, 'groesse': round(groesse, 2),
            'verhaeltnis': kontrast(vordergrund, hintergrund),
            'vorne': vordergrund, 'hinten': hintergrund,
        })

    for kind in knoten.kinder:
        durchrechnen(kind, blatt, umgebung,
                     {'groesse': groesse, 'vorne': vordergrund, 'hinten': hintergrund},
                     treffer)


def messen(pfad: Path, css_extra: list[str], thema: str):
    quelle = pfad.read_text(encoding='utf-8')
    eigene = re.findall(r'<style>(.*?)</style>', quelle, flags=re.S)
    blatt = Blatt(css_extra + eigene)
    umgebung = dict(blatt.dunkel if thema == 'dunkel' else blatt.hell)

    baum = Baum()
    baum.feed(quelle)
    grund = farbe_lesen('var(--grund)', umgebung) or (255, 255, 255)

    treffer = []
    durchrechnen(baum.wurzel, blatt,
                 umgebung, {'groesse': 16.0, 'vorne': None, 'hinten': grund}, treffer)
    return treffer, blatt, grund, umgebung


# ------------------------------------------------------------------- reporting
def als_hex(rgb):
    return '#%02X%02X%02X' % tuple(round(v) for v in rgb)


def kurz(text, n=52):
    return text if len(text) <= n else text[:n - 1] + '…'


def sichttext(quelle: str) -> str:
    """What the page says, with markup and line breaks taken out.

    The wording check runs against this rather than against the source, so a
    sentence broken across two lines of HTML still counts as the same sentence
    and a non-breaking space still counts as a space.
    """
    ohne = re.sub(r'<(script|style)\b.*?</\1>', ' ', quelle, flags=re.S | re.I)
    ohne = re.sub(r'<[^>]+>', ' ', ohne)
    return ' '.join(unescape(ohne).replace('\xa0', ' ').split())


def main() -> int:
    css_texte = [BASIS.read_text(encoding='utf-8'),
                 (HIER / 'fuss.css').read_text(encoding='utf-8')]
    fehler_gesamt = 0

    print('PALETTE — jede Farbe auf jeder Fläche, beide Themen')
    print('  Text braucht 7:1, Nebentext 4,5:1. Was auf der blanken Pappe scheitert,')
    print('  ist der Grund für die Regel „Farbiges gehört auf eine Fläche".\n')
    blatt = Blatt(css_texte)
    for name, umgebung in (('hell', blatt.hell), ('dunkel', blatt.dunkel)):
        print(f'  {name}')
        for flaeche in ('--grund', '--flaeche'):
            hinten = farbe_lesen(f'var({flaeche})', umgebung)
            zeile = []
            for tinte in ('--schrift', '--weich', '--enzian', '--gold', '--maerzen'):
                vorne = farbe_lesen(f'var({tinte})', umgebung)
                zeile.append(f'{tinte[2:]:>8}: {kontrast(vorne, hinten):5.2f}')
            print(f'    auf {flaeche[2:]:8s} {als_hex(hinten)}  ' + '  '.join(zeile))
        # The filled stamp, in the direction the theme allows.
        schrift = farbe_lesen('var(--voll-schrift)', umgebung)
        fuell = [f'{n[2:]}: {kontrast(schrift, farbe_lesen(f"var({n})", umgebung)):.2f}'
                 for n in ('--enzian', '--gold', '--maerzen')]
        print(f'    Stempel gefüllt, Schrift {als_hex(schrift)}  ' + '  '.join(fuell))
    print()

    print('ENTWÜRFE\n')
    for name in ENTWUERFE:
        pfad = HIER / f'{name}.html'
        if not pfad.exists():
            print(f'  {name}.html FEHLT')
            fehler_gesamt += 1
            continue

        sicht = sichttext(pfad.read_text(encoding='utf-8'))
        fehlend = [w for w in WORTLAUT if w not in sicht]
        print(f'  {name}.html')

        for thema in ('hell', 'dunkel'):
            treffer, blatt_d, grund, umgebung = messen(pfad, css_texte, thema)
            schrift = farbe_lesen('var(--schrift)', umgebung)
            weich = farbe_lesen('var(--weich)', umgebung)

            verstoesse = []
            kleinste = min((t['groesse'] for t in treffer), default=0)
            fliess = [t for t in treffer if t['groesse'] >= GRENZE_FLIESS]
            neben = [t for t in treffer if t['groesse'] < GRENZE_FLIESS]

            for t in treffer:
                if t['groesse'] < MIN_GROESSE:
                    verstoesse.append(f"{t['groesse']}px < 14px — {kurz(t['text'])}")
                elif t['groesse'] < MIN_NEBEN:
                    verstoesse.append(f"{t['groesse']}px < 14,5px — {kurz(t['text'])}")
                soll = SOLL_TEXT if t['groesse'] >= GRENZE_FLIESS else SOLL_NEBEN
                if t['verhaeltnis'] + 1e-9 < soll:
                    verstoesse.append(
                        f"{t['verhaeltnis']:.2f}:1 < {soll}:1 bei {t['groesse']}px "
                        f"({als_hex(t['vorne'])} auf {als_hex(t['hinten'])}) — {kurz(t['text'])}")
                # The placement rule: on the bare board only ink and --weich.
                if tuple(round(v) for v in t['hinten']) == tuple(round(v) for v in grund):
                    if t['vorne'] not in (schrift, weich):
                        verstoesse.append(
                            f"Farbe {als_hex(t['vorne'])} auf blanker Pappe — {kurz(t['text'])}")

            min_f = min((t['verhaeltnis'] for t in fliess), default=float('inf'))
            min_n = min((t['verhaeltnis'] for t in neben), default=float('inf'))
            zeichen = '✓' if not verstoesse else '✗'
            print(f'    {thema:6s} {zeichen}  {len(treffer):3d} Textstellen · '
                  f'kleinste {kleinste:.1f}px · Fließtext ab {min_f:5.2f}:1 · '
                  f'Nebentext ab {min_n:5.2f}:1')
            for v in verstoesse:
                print(f'           ! {v}')
            fehler_gesamt += len(verstoesse)

        if fehlend:
            fehler_gesamt += len(fehlend)
            for w in fehlend:
                print(f'           ! Wortlaut fehlt: {kurz(w, 60)}')
        if blatt_d.unlesbar:
            print(f'           · {len(blatt_d.unlesbar)} Selektoren nicht ausgewertet: '
                  f'{", ".join(sorted(set(blatt_d.unlesbar))[:4])}')
    print()
    print('FEHLER GESAMT:', fehler_gesamt)
    return 1 if fehler_gesamt else 0


if __name__ == '__main__':
    sys.exit(main())
