/* ============================================================
   KOMBI — the behaviour all ten drafts share

   Three things live here and nowhere else: the mark, the chip
   panels, and the advanced switch. A keyboard bug fixed here is
   fixed ten times.
   ============================================================ */

/** The seal, drawn once. Text on the ring, lozenge in the core, town in the foot. */
const SIEGEL = `
<svg class="siegel" viewBox="0 0 120 120" aria-hidden="true">
  <circle class="ring" cx="60" cy="60" r="55" stroke-width="2.5"/>
  <circle class="ring" cx="60" cy="60" r="48" stroke-width="1.2"/>
  <path id="ringpfad" fill="none" d="M60,18 a42,42 0 1,1 -0.1,0"/>
  <text font-size="10.5"><textPath href="#ringpfad" startOffset="50%" text-anchor="middle">BIERGARTEN · FREUNDE ·</textPath></text>
  <path class="raute" d="M60 44 L74 60 L60 76 L46 60 Z"/>
  <text class="ort" x="60" y="98" font-size="7.5" text-anchor="middle">MÜNCHEN</text>
</svg>`

/**
 * The page head: mark on the left, advanced switch on the right.
 *
 * Injected rather than copied into ten files — the mark is who the site is,
 * and ten hand-kept copies drift apart at the first change.
 */
function kopfBauen() {
  const kopf = document.querySelector('[data-kopf]')
  if (!kopf) return

  kopf.className = 'kopf'
  kopf.innerHTML = `
    <div class="wortmarke">
      ${SIEGEL}
      <h1><span class="z1">Biergarten</span><span class="z2">Freunde</span></h1>
    </div>`

  // The switch belongs next to the thing it opens. A draft that marks a spot
  // with [data-schalter] gets it there — beside its filters — and only the
  // ones that mark no spot fall back to the corner of the head.
  const platz = document.querySelector('[data-schalter]') ?? kopf
  platz.insertAdjacentHTML('beforeend', `
    <button class="profi-schalter" type="button" aria-pressed="false">
      <span class="gleis"><i></i></span>
      <span>Alle Regler</span>
    </button>`)

  const schalter = platz.querySelector('.profi-schalter')
  schalter.addEventListener('click', () => {
    const an = schalter.getAttribute('aria-pressed') === 'true'
    schalter.setAttribute('aria-pressed', String(!an))
    document.body.classList.toggle('profi-an', !an)
    // The dense planner is long. Landing at its top beats hunting for it.
    if (!an) document.querySelector('.profi')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

/**
 * Chips and their panels.
 *
 * A chip owns one question. Choosing writes the answer back into the chip and
 * closes the panel, because a panel that stays open after the decision leaves
 * the reader wondering whether it took. Multi-select panels stay open and are
 * closed with their own button — there the decision is not over yet.
 */
function chipsVerdrahten() {
  for (const chip of document.querySelectorAll('.chip[popovertarget]')) {
    const panel = document.getElementById(chip.getAttribute('popovertarget'))
    if (!panel) continue

    chip.setAttribute('aria-expanded', 'false')
    panel.addEventListener('toggle', (e) => {
      chip.setAttribute('aria-expanded', String(e.newState === 'open'))
      if (e.newState === 'open') panelPlatzieren(chip, panel)
      // Focus back on the chip, not lost at the top of the document.
      if (e.newState === 'closed') chip.focus({ preventScroll: true })
    })

    const mehrfach = panel.dataset.mehrfach === 'ja'

    for (const knopf of panel.querySelectorAll('.liste button')) {
      knopf.addEventListener('click', () => {
        if (mehrfach) {
          knopf.setAttribute('aria-pressed', String(knopf.getAttribute('aria-pressed') !== 'true'))
        }
        else {
          for (const anderer of panel.querySelectorAll('.liste button')) {
            anderer.setAttribute('aria-pressed', String(anderer === knopf))
          }
        }
        chipBeschriften(chip, panel, mehrfach)
        if (!mehrfach) panel.hidePopover()
      })
    }

    panel.querySelector('.fertig')?.addEventListener('click', () => panel.hidePopover())
  }
}

/**
 * Where the panel appears.
 *
 * A popover with no position lands in the corner of the screen, and a panel
 * that opens somewhere else than where you clicked makes you look for it. So
 * it sits under its chip, flipping above when there is no room below, and
 * clamped to the viewport so it never hangs off the edge.
 *
 * Below 640px it becomes a sheet on the bottom edge instead: at that width
 * there is no "next to", and the bottom is where the thumb already is.
 */
function panelPlatzieren(chip, panel) {
  const schmal = matchMedia('(max-width: 640px)').matches
  panel.classList.toggle('als-blatt', schmal)

  if (schmal) {
    panel.style.cssText = ''
    return
  }

  const r = chip.getBoundingClientRect()
  panel.style.inset = 'auto'
  panel.style.margin = '0'

  const breite = panel.offsetWidth
  const hoehe = panel.offsetHeight
  const passtDrunter = r.bottom + hoehe + 10 <= innerHeight

  panel.style.left = `${Math.min(Math.max(8, r.left), innerWidth - breite - 8)}px`
  panel.style.top = passtDrunter ? `${r.bottom + 8}px` : `${Math.max(8, r.top - hoehe - 8)}px`
}

/** What the chip says after a choice — the answer, never just the question. */
function chipBeschriften(chip, panel, mehrfach) {
  const gewaehlt = [...panel.querySelectorAll('.liste button[aria-pressed="true"]')]
  const wert = chip.querySelector('.wert')
  if (!wert) return

  if (!mehrfach) {
    wert.firstChild.textContent = gewaehlt[0]?.textContent.trim() ?? 'egal'
    return
  }

  wert.firstChild.textContent = gewaehlt.length === 0
    ? 'egal'
    : gewaehlt.length === 1
      ? gewaehlt[0].textContent.trim()
      : `${gewaehlt.length} gewählt`
}

/** Themes come from the gallery as ?theme=light|dark. */
function themaSetzen() {
  const t = new URLSearchParams(location.search).get('theme')
  if (t) document.documentElement.dataset.theme = t
}

themaSetzen()
addEventListener('DOMContentLoaded', () => {
  kopfBauen()
  panelsBauen()
  profiBauen()
  chipsVerdrahten()
})

/* ==========================================================================
   The panels and the dense planner, injected

   Their content is identical in all ten drafts — what differs is the surface
   that opens them. Writing them ten times would guarantee that nine of them
   go stale.
   ========================================================================== */
const PANELS = [
  { id: 'p-zeit', titel: 'Wie lange hast du?', hilfe: 'Danach richtet sich, wie viele Stationen hineinpassen.',
    werte: ['2 Stunden', '3 Stunden', '4 Stunden', '6 Stunden', 'bis Sonnenuntergang'], gewaehlt: 2 },
  { id: 'p-ort', titel: 'Wo gehst du los?', hilfe: 'Haltestelle oder Viertel — oder nimm deinen Standort.',
    werte: ['Candidplatz', 'Marienplatz', 'Hauptbahnhof', 'Ostbahnhof', 'Mein Standort'], gewaehlt: 0 },
  { id: 'p-weg', titel: 'Wie bist du unterwegs?', hilfe: 'Fahrzeiten sind Schätzungen aus Luftlinie plus Umwegfaktor.',
    werte: ['Zu Fuß', 'Mit dem Radl', 'Zu Fuß & Radl', 'Mit allem'], gewaehlt: 2 },
  { id: 'p-was', titel: 'Was soll dabei sein?', hilfe: 'Nichts gewählt heißt: alles ist recht.', mehrfach: true,
    werte: ['Am Wasser', 'Wald & Grün', 'Bierkeller', 'Live-Musik', 'Spielplatz', 'Aussicht'], gewaehlt: -1 },
  { id: 'p-extra', titel: 'Was brauchst du?', hilfe: 'Selbstbedienung heißt: eigene Brotzeit ist meist erlaubt.', mehrfach: true,
    werte: ['Selbstbedienung', 'Eigene Brotzeit', 'Nur Stadtgebiet', 'Wo ich noch nicht war'], gewaehlt: -1 },
]

function panelsBauen() {
  const ziel = document.querySelector('[data-panels]')
  if (!ziel) return

  ziel.innerHTML = PANELS.map(p => `
    <div popover id="${p.id}"${p.mehrfach ? ' data-mehrfach="ja"' : ''}>
      <div class="panel">
        <h3>${p.titel}</h3>
        <p>${p.hilfe}</p>
        <div class="liste">
          ${p.werte.map((w, i) =>
            `<button type="button" aria-pressed="${i === p.gewaehlt}">${w}</button>`).join('')}
        </div>
        ${p.mehrfach ? '<button class="fertig" type="button">Passt</button>' : ''}
      </div>
    </div>`).join('')
}

/** The planner exactly as the site has it today — every dial, nothing hidden. */
function profiBauen() {
  const ziel = document.querySelector('[data-profi]')
  if (!ziel) return

  const reihe = (werte, an) => werte
    .map(w => `<button type="button" aria-pressed="${w === an}">${w}</button>`).join('')

  ziel.className = 'profi'
  ziel.innerHTML = `
    <div class="gruppe"><span>Start und Ziel</span>
      <div class="reihe"><input value="Candidplatz" aria-label="Startpunkt">
        <button type="button">Standort</button></div></div>
    <div class="gruppe"><span>Rahmen</span>
      <div class="reihe">${reihe(['Hin und zurück', 'Einfach', 'Rundweg'], 'Hin und zurück')}</div></div>
    <div class="gruppe"><span>Wochentag</span>
      <div class="reihe">${reihe(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], 'Di')}</div></div>
    <div class="gruppe"><span>Zeitfenster</span>
      <div class="reihe">${reihe(['2 Std', '3 Std', '4 Std', '5 Std', '6 Std', '8 Std'], '4 Std')}</div></div>
    <div class="gruppe"><span>Stationen</span>
      <div class="reihe">${reihe(['1', '2', '3', '4', '5'], '3')}</div></div>
    <div class="gruppe"><span>Unterwegs</span>
      <div class="reihe">${reihe(['Zu Fuß', 'Radl', 'ÖPNV', 'Gemischt'], 'Gemischt')}</div></div>
    <div class="gruppe"><span>Längste Etappe</span>
      <div class="reihe">${reihe(['15 min', '25 min', '40 min', 'egal'], '25 min')}</div></div>
    <div class="gruppe"><span>Was du willst</span>
      <div class="reihe">${reihe(['Am Wasser', 'Wald & Grün', 'Stadtfeeling', 'Aussicht', 'Bierkeller', 'Spielplatz', 'Live-Musik'], null)}</div></div>
    <div class="gruppe"><span>Brauerei</span>
      <div class="reihe">${reihe(['Augustiner', 'Paulaner', 'Löwenbräu', 'Hofbräu', 'Spaten', 'Ayinger', 'Giesinger', 'Lammsbräu'], null)}</div></div>
    <div class="gruppe"><span>Weiteres</span>
      <div class="reihe">${reihe(['Nur Selbstbedienung', 'Eigene Brotzeit', 'Nur Stadtgebiet', 'Wo ich schon war: raus'], null)}</div></div>`
}
