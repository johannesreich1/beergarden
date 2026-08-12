<script setup lang="ts">
import type { Garden, PlanningMode } from '#core'
import { formatClock, formatDuration } from '#core'

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
 * "Alle Regler" stays and lives at the end of the rail: it opens the dense
 * controls column for whoever wants every dial at once. While that column is
 * open the rail hides its chips — the same answers twice on one screen would
 * ask which one counts.
 */
const props = defineProps<{ gardens: Garden[] }>()

const planner = usePlanner()
const { state } = planner
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

const wishCount = computed(() => state.value.filters.tags.length + activeToggles.value.length)

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
])

function setMode(mode: PlanningMode): void {
  state.value.mode = mode
  planner.persist()
}

function setBudget(minutes: number): void {
  state.value.budgetMinutes = minutes
  planner.persist()
}

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
      <template v-if="!state.allControls">
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
        <button
          class="alle-regler"
          type="button"
          :aria-pressed="state.allControls"
          @click="state.allControls = !state.allControls; planner.persist()"
        >
          <span class="gleis"><i /></span>
          <span>Alle Regler</span>
        </button>
      </span>
    </div>

    <!-- The chosen wishes, small. Solid ink on purpose: at this size the break
         eats legibility, and the tilt alone already says stamp. -->
    <div v-if="!state.allControls && stamps.length" class="klein">
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
          @click="pickAndClose('p-weg', () => setMode(mode))"
        >{{ label }}</button>
      </div>
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
      <button class="fertig" @click="panels['p-was']?.hidePopover()">Passt</button>
    </div>
  </div>
</template>
