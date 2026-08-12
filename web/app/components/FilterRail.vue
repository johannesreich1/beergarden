<script setup lang="ts">
import type { Garden, PlanningMode } from '#core'
import { LEG_UNCAPPED, brewerySlug, formatClock, formatDuration } from '#core'

/**
 * The Schankleiste — the filters as a small menu on a brass rail.
 *
 * The wide controls column is gone from the default view; the page belongs to
 * the results. What remains hangs from the rail like tap handles: one chip per
 * question, each stating its question AND its current answer. A chip whose
 * setting deviates from the default tips slightly — the state is a posture,
 * not a badge.
 *
 * The panels are native popovers: light dismiss, Escape and the top layer come
 * from the browser, not from hand-written listeners. Under 640px a panel
 * becomes a sheet on the bottom edge, where the thumb already is.
 *
 * There is no "advanced" view any more. It held four dials — weekday, stop
 * count, leg cap, breweries — and those now live inside the panels where they
 * belong. Two views of the same settings were one too many: the dense column
 * was the same state wearing a different coat, and every session someone asked
 * which of the two counts.
 */
const props = defineProps<{ gardens: Garden[] }>()

const planner = usePlanner()
const { state, resettable } = planner
const { data: startPoints } = await useStartPoints()
const { startQuery, startNote, applyStartQuery, useGeolocation } = useStartPicker(startPoints)

/* ---------------------------------------------------------- what is set */

const MEHR: Array<{ key: 'selfServiceOnly' | 'ownFoodOnly' | 'cityOnly' | 'unvisitedOnly', label: string }> = [
  { key: 'selfServiceOnly', label: 'Selbstbedienung' },
  { key: 'ownFoodOnly', label: 'Eigene Brotzeit' },
  { key: 'cityOnly', label: 'Nur Stadtgebiet' },
  { key: 'unvisitedOnly', label: 'Wo ich war: raus' },
]

const activeToggles = computed(() => MEHR.filter((entry) => state.value.filters[entry.key]))

const wishCount = computed(() =>
  state.value.filters.tags.length + activeToggles.value.length + state.value.filters.breweries.length)

/** The stamps in the small row: every wish that is set, each removable. */
const stamps = computed(() => [
  ...state.value.filters.tags.map((tag) => ({
    label: TAG_LABELS[tag] ?? tag,
    remove: () => planner.toggle(state.value.filters.tags, tag),
  })),
  ...activeToggles.value.map((entry) => ({
    label: entry.label,
    remove: () => { state.value.filters[entry.key] = false; planner.persist() },
  })),
  // Breweries are wishes too — a chosen one that never shows up small is a
  // filter working invisibly, which is the exact bug this row exists to end.
  ...state.value.filters.breweries.map((slug) => ({
    label: breweryStyle(slug).label,
    remove: () => planner.toggle(state.value.filters.breweries, slug),
  })),
])

function setMode(mode: PlanningMode): void {
  state.value.mode = mode
  planner.persist()
}

function setBudget(minutes: number): void {
  state.value.budgetMinutes = minutes
  planner.persist()
}

/** 50 on the slider is the "egal" stop; everything below is a real cap. */
function setLegCap(value: number): void {
  state.value.maxLegMinutes = value >= 50 ? LEG_UNCAPPED : value
  planner.persist()
}

// Only breweries that occur in the data — a filter with zero hits is a dead end.
const breweries = computed(() => {
  const present = new Set(props.gardens.map((garden) => brewerySlug(garden)))

  return Object.keys(BREWERY_STYLES).filter((slug) => present.has(slug))
})

/* --------------------------------------------------- popover plumbing */

const chips: Record<string, HTMLElement> = {}
const panels: Record<string, HTMLElement> = {}
const expanded = reactive<Record<string, boolean>>({})

const setChip = (id: string) => (el: unknown) => { if (el) chips[id] = el as HTMLElement }
const setPanel = (id: string) => (el: unknown) => { if (el) panels[id] = el as HTMLElement }

/**
 * Where a panel appears: under its chip, flipped above when there is no room,
 * clamped to the viewport. A popover with no position lands in the corner of
 * the screen, and a panel that opens somewhere other than where you pressed
 * makes you look for it.
 */
function place(id: string): void {
  const panel = panels[id]
  const chip = chips[id]
  if (!panel || !chip) return

  const sheet = window.matchMedia('(max-width: 640px)').matches
  panel.classList.toggle('als-blatt', sheet)

  if (sheet) {
    panel.style.cssText = ''
    return
  }

  const r = chip.getBoundingClientRect()
  panel.style.margin = '0'

  const width = panel.offsetWidth
  const height = panel.offsetHeight
  const below = r.bottom + height + 10 <= window.innerHeight

  panel.style.left = `${Math.min(Math.max(8, r.left), window.innerWidth - width - 8)}px`
  panel.style.top = below ? `${r.bottom + 8}px` : `${Math.max(8, r.top - height - 8)}px`
}

function onToggle(id: string, event: Event): void {
  const open = (event as ToggleEvent).newState === 'open'
  expanded[id] = open

  if (open) nextTick(() => place(id))
  // Focus back on the chip, not lost at the top of the document.
  else chips[id]?.focus({ preventScroll: true })
}

/** Single-choice panels close on pick; multi-choice ones have their own button. */
function pickAndClose(id: string, action: () => void): void {
  action()
  panels[id]?.hidePopover()
}
</script>

<template>
  <div class="rail">
    <div class="schiene" aria-hidden="true" />

    <div class="rail-zeile">
      <template v-if="true">
        <button
          :ref="setChip('p-ort')"
          class="rchip"
          popovertarget="p-ort"
          :aria-expanded="expanded['p-ort'] ? 'true' : 'false'"
        >
          <span class="was">Wo los</span>
          <span class="wert">{{ state.startPoint.name }}</span>
        </button>

        <button
          :ref="setChip('p-zeit')"
          class="rchip"
          popovertarget="p-zeit"
          :aria-expanded="expanded['p-zeit'] ? 'true' : 'false'"
        >
          <span class="was">Wann &amp; wie lange</span>
          <span class="wert">{{ formatClock(state.startMinutes) }} · {{ formatDuration(state.budgetMinutes) }}</span>
        </button>

        <button
          :ref="setChip('p-weg')"
          class="rchip"
          popovertarget="p-weg"
          :aria-expanded="expanded['p-weg'] ? 'true' : 'false'"
          :class="{ an: state.mode !== 'mix' }"
        >
          <span class="was">Unterwegs</span>
          <span class="wert">{{ MODE_OPTIONS[state.mode] }}</span>
        </button>

        <button
          :ref="setChip('p-was')"
          class="rchip"
          popovertarget="p-was"
          :aria-expanded="expanded['p-was'] ? 'true' : 'false'"
          :class="{ an: wishCount > 0 }"
        >
          <span class="was">Wünsche</span>
          <span class="wert">{{ wishCount > 0 ? `${wishCount} gewählt` : 'egal' }}</span>
        </button>
      </template>

      <span class="rail-rest">
        <!-- Only when there is something to undo: a reset with nothing to
             reset suggests there IS something set, and sends people hunting. -->
        <button v-if="resettable" class="btn warn rail-reset" @click="planner.resetAll()">
          Alles zurücksetzen
        </button>
      </span>
    </div>

    <!-- The chosen wishes, small. Solid ink on purpose: at this size the break
         eats legibility, and the tilt alone already says stamp. -->
    <div v-if="stamps.length" class="klein">
      <b
        v-for="stamp in stamps"
        :key="stamp.label"
        role="button"
        tabindex="0"
        :title="`${stamp.label} entfernen`"
        @click="stamp.remove()"
        @keydown.enter.prevent="stamp.remove()"
      >{{ stamp.label }} ×</b>
      <button class="aufheben" @click="planner.clearFilters()">alle aufheben</button>
    </div>

    <!-- ------------------------------------------------------ the panels -->
    <div
      :ref="setPanel('p-ort')"
      id="p-ort"
      popover
      class="rpanel"
      @toggle="onToggle('p-ort', $event)"
    >
      <h3>Wo gehst du los?</h3>
      <p>Haltestelle oder Viertel — oder nimm deinen Standort.</p>
      <div class="startrow">
        <input
          v-model="startQuery"
          class="inp"
          list="rail-places"
          placeholder="Haltestelle oder Viertel"
          autocomplete="off"
          @change="applyStartQuery"
        >
        <button class="btn" @click="useGeolocation">Standort</button>
      </div>
      <datalist id="rail-places">
        <option v-for="point in startPoints" :key="point.name" :value="point.name" />
      </datalist>
      <p v-if="startNote === 'kenne-ich-nicht'" class="note">
        Kenne ich nicht — nimm eine Haltestelle aus der Liste.
      </p>
      <p v-else-if="startNote === 'suche'" class="note">Suche Position …</p>
      <p v-else-if="startNote === 'abgelehnt'" class="note">
        Standort nicht freigegeben — Haltestelle eintippen.
      </p>
      <button class="fertig" @click="panels['p-ort']?.hidePopover()">Passt</button>
    </div>

    <div
      :ref="setPanel('p-zeit')"
      id="p-zeit"
      popover
      class="rpanel"
      @toggle="onToggle('p-zeit', $event)"
    >
      <h3>Wann, und wie lange?</h3>
      <div class="stepper">
        <button class="step" @click="planner.shiftStart(-15)">−</button>
        <div class="lbl"><span class="eyebrow">Losgehen</span><strong>{{ formatClock(state.startMinutes) }}</strong></div>
        <button class="step" @click="planner.shiftStart(15)">+</button>
      </div>
      <div class="grid">
        <button
          v-for="budget in BUDGETS"
          :key="budget.value"
          class="chip gold"
          :aria-pressed="state.budgetMinutes === budget.value"
          @click="setBudget(budget.value)"
        >{{ budget.label }}</button>
      </div>
      <p class="sub-frage">Welcher Tag?</p>
      <div class="grid">
        <button
          v-for="day in WEEKDAYS"
          :key="day.value"
          class="chip gold"
          :aria-pressed="state.weekday === day.value"
          @click="state.weekday = day.value; planner.persist()"
        >{{ day.label }}</button>
      </div>
      <p class="sub-frage">Wie viele Stationen?</p>
      <div class="grid">
        <button
          v-for="count in [2, 3, 4]"
          :key="count"
          class="chip gold"
          :aria-pressed="state.stops === count"
          @click="state.stops = count; planner.persist()"
        >{{ count }}</button>
      </div>
      <button class="fertig" @click="panels['p-zeit']?.hidePopover()">Passt</button>
    </div>

    <div
      :ref="setPanel('p-weg')"
      id="p-weg"
      popover
      class="rpanel"
      @toggle="onToggle('p-weg', $event)"
    >
      <h3>Wie bist du unterwegs?</h3>
      <p>Fahrzeiten sind Schätzungen — die echte Verbindung steht an jeder Etappe.</p>
      <div class="grid">
        <button
          v-for="(label, mode) in MODE_OPTIONS"
          :key="mode"
          class="chip gold"
          :aria-pressed="state.mode === mode"
          @click="setMode(mode)"
        >{{ label }}</button>
      </div>
      <p class="sub-frage">
        Längste Etappe:
        <b>{{ state.maxLegMinutes >= LEG_UNCAPPED ? 'egal' : `${state.maxLegMinutes} min` }}</b>
      </p>
      <!-- The rightmost stop means "egal" — a limit is a refinement somebody
           reaches for, not a wall they start against. -->
      <input
        :value="Math.min(state.maxLegMinutes, 50)"
        type="range"
        min="5"
        max="50"
        step="5"
        aria-label="Längste Etappe"
        @input="setLegCap(Number(($event.target as HTMLInputElement).value))"
      >
      <button class="fertig" @click="panels['p-weg']?.hidePopover()">Passt</button>
    </div>

    <div
      :ref="setPanel('p-was')"
      id="p-was"
      popover
      class="rpanel"
      @toggle="onToggle('p-was', $event)"
    >
      <h3>Was soll dabei sein?</h3>
      <p>Nichts gewählt heißt: alles ist recht.</p>
      <div class="grid">
        <button
          v-for="(label, tag) in TAG_LABELS"
          :key="tag"
          class="chip"
          :aria-pressed="state.filters.tags.includes(tag)"
          @click="planner.toggle(state.filters.tags, tag)"
        >{{ label }}</button>
      </div>
      <div class="grid" style="margin-top: 10px">
        <button
          v-for="entry in MEHR"
          :key="entry.key"
          class="chip gold"
          :aria-pressed="state.filters[entry.key]"
          @click="state.filters[entry.key] = !state.filters[entry.key]; planner.persist()"
        >{{ entry.label }}</button>
      </div>
      <p class="sub-frage">Brauerei?</p>
      <div class="grid">
        <button
          v-for="slug in breweries"
          :key="slug"
          class="chip"
          :aria-pressed="state.filters.breweries.includes(slug)"
          @click="planner.toggle(state.filters.breweries, slug)"
        >{{ breweryStyle(slug).label }}</button>
      </div>
      <button class="fertig" @click="panels['p-was']?.hidePopover()">Passt</button>
    </div>
  </div>
</template>
