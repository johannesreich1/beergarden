<script setup lang="ts">
import type { Garden } from '#core'
import { LEG_UNCAPPED, formatClock, formatDuration } from '#core'

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

const { t } = useI18n()
const { tagLabel } = useFormats()

const planner = usePlanner()
const { state, resettable } = planner
const { data: startPoints } = await useStartPoints()
const { startQuery, startNote, applyStartQuery, locateMe } = useStartPicker(startPoints)

/* ---------------------------------------------------------- what is set */

/**
 * Every boolean wish, from the shared list. `waterRequired` used to be
 * settable only in the directory — a filter the planner obeyed but never
 * showed, which is the exact bug the stamp row exists to end.
 */
const activeToggles = computed(() => EXTRA_FILTERS.filter((key) => state.value.filters[key]))

const wishCount = computed(() =>
  state.value.filters.tags.length + activeToggles.value.length + state.value.filters.breweries.length)

/** The stamps in the small row: every wish that is set, each removable. */
const stamps = computed(() => [
  ...state.value.filters.tags.map((tag) => ({
    label: tagLabel(tag),
    remove: () => planner.toggle(state.value.filters.tags, tag),
  })),
  ...activeToggles.value.map((key) => ({
    label: t(`extras.${key}`),
    remove: () => { state.value.filters[key] = false; planner.persist() },
  })),
  // Breweries are wishes too — a chosen one that never shows up small is a
  // filter working invisibly, which is the exact bug this row exists to end.
  ...state.value.filters.breweries.map((slug) => ({
    label: breweryStyle(slug).label,
    remove: () => planner.toggle(state.value.filters.breweries, slug),
  })),
])

function setBudget(minutes: number): void {
  state.value.budgetMinutes = minutes
  planner.persist()
}

/** 50 on the slider is the "egal" stop; everything below is a real cap. */
function setLegCap(value: number): void {
  state.value.maxLegMinutes = value >= 50 ? LEG_UNCAPPED : value
  planner.persist()
}

const breweries = computed(() => presentBreweries(props.gardens))

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

  if (open) {
    nextTick(() => {
      place(id)
      // Into the panel, not left on the trigger: the panel sits at the end of
      // the DOM, and a keyboard would otherwise walk every chip to reach it.
      panels[id]?.querySelector<HTMLElement>('button, input, [href]')?.focus()
    })
  }
  // Focus back on the chip, not lost at the top of the document.
  else chips[id]?.focus({ preventScroll: true })
}

</script>

<template>
  <div class="rail">
    <div class="schiene" aria-hidden="true" />

    <div class="rail-zeile">
      <button
        :ref="setChip('p-ort')"
        class="rchip"
        popovertarget="p-ort"
        :aria-expanded="expanded['p-ort'] ? 'true' : 'false'"
      >
        <span class="was">{{ t('rail.whereQuestion') }}</span>
        <span class="wert">{{ state.startPoint.name }}</span>
      </button>

      <button
        :ref="setChip('p-zeit')"
        class="rchip"
        popovertarget="p-zeit"
        :aria-expanded="expanded['p-zeit'] ? 'true' : 'false'"
      >
        <span class="was">{{ t('rail.whenQuestion') }}</span>
        <span class="wert">{{ formatClock(state.startMinutes) }} · {{ formatDuration(state.budgetMinutes) }}</span>
      </button>

      <button
        :ref="setChip('p-weg')"
        class="rchip"
        popovertarget="p-weg"
        :aria-expanded="expanded['p-weg'] ? 'true' : 'false'"
        :class="{ an: state.mode !== 'mix' }"
      >
        <span class="was">{{ t('rail.howQuestion') }}</span>
        <span class="wert">{{ t(`planningModes.${state.mode}`) }}</span>
      </button>

      <button
        :ref="setChip('p-was')"
        class="rchip"
        popovertarget="p-was"
        :aria-expanded="expanded['p-was'] ? 'true' : 'false'"
        :class="{ an: wishCount > 0 }"
      >
        <span class="was">{{ t('rail.wishesQuestion') }}</span>
        <span class="wert">{{ wishCount > 0 ? t('rail.wishesCount', { n: wishCount }) : t('rail.none') }}</span>
      </button>

      <span class="rail-tail">
        <!-- Only when there is something to undo: a reset with nothing to
             reset suggests there IS something set, and sends people hunting. -->
        <button v-if="resettable" class="btn warn rail-reset" @click="planner.resetAll()">
          {{ t('rail.reset') }}
        </button>
      </span>
    </div>

    <!-- The chosen wishes, small. Solid ink on purpose: at this size the break
         eats legibility, and the tilt alone already says stamp. -->
    <div v-if="stamps.length" class="klein">
      <button
        v-for="stamp in stamps"
        :key="stamp.label"
        type="button"
        class="wunsch"
        :aria-label="t('rail.removeStamp', { label: stamp.label })"
        :title="t('rail.removeStamp', { label: stamp.label })"
        @click="stamp.remove()"
      >{{ stamp.label }} ×</button>
      <button class="aufheben" @click="planner.clearFilters()">{{ t('rail.clearAll') }}</button>
    </div>

    <!-- ------------------------------------------------------ the panels -->
    <div
      :ref="setPanel('p-ort')"
      id="p-ort"
      popover
      class="rpanel"
      @toggle="onToggle('p-ort', $event)"
    >
      <h2>{{ t('rail.where.title') }}</h2>
      <p>{{ t('rail.where.hint') }}</p>
      <div class="startrow">
        <input
          v-model="startQuery"
          class="inp"
          list="rail-places"
          :aria-label="t('rail.where.inputLabel')"
          :placeholder="t('rail.where.inputLabel')"
          autocomplete="off"
          @change="applyStartQuery"
        >
        <button class="btn" @click="locateMe">{{ t('rail.where.locate') }}</button>
      </div>
      <datalist id="rail-places">
        <option v-for="point in startPoints" :key="point.name" :value="point.name" />
      </datalist>
      <!-- Every note the picker can raise renders — a state without a sentence
           is a button that appears to do nothing. -->
      <p v-if="startNote" class="note" role="status">{{ t(`rail.where.note.${startNote}`) }}</p>
      <button class="fertig" @click="panels['p-ort']?.hidePopover()">{{ t('rail.done') }}</button>
    </div>

    <div
      :ref="setPanel('p-zeit')"
      id="p-zeit"
      popover
      class="rpanel"
      @toggle="onToggle('p-zeit', $event)"
    >
      <h2>{{ t('rail.when.title') }}</h2>
      <div class="stepper">
        <button class="step" :aria-label="t('rail.when.earlier')" @click="planner.shiftStart(-15)">−</button>
        <div class="lbl"><span class="eyebrow">{{ t('rail.when.leave') }}</span><strong>{{ formatClock(state.startMinutes) }}</strong></div>
        <button class="step" :aria-label="t('rail.when.later')" @click="planner.shiftStart(15)">+</button>
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
      <p class="sub-frage">{{ t('rail.when.dayQuestion') }}</p>
      <div class="grid">
      <button
          v-for="day in WEEKDAY_VALUES"
          :key="day"
          class="chip gold"
          :aria-pressed="state.weekday === day"
          :aria-label="t(`weekdays.name.${day}`)"
          @click="state.weekday = day; planner.persist()"
        >{{ t(`weekdays.short.${day}`) }}</button>
      </div>
      <p class="sub-frage">{{ t('rail.when.stopsQuestion') }}</p>
      <div class="grid">
      <button
          v-for="count in [2, 3, 4]"
          :key="count"
          class="chip gold"
          :aria-pressed="state.stops === count"
          @click="state.stops = count; planner.persist()"
        >{{ count }}</button>
      </div>
      <button class="fertig" @click="panels['p-zeit']?.hidePopover()">{{ t('rail.done') }}</button>
    </div>

    <div
      :ref="setPanel('p-weg')"
      id="p-weg"
      popover
      class="rpanel"
      @toggle="onToggle('p-weg', $event)"
    >
      <h2>{{ t('rail.how.title') }}</h2>
      <p>{{ t('rail.how.hint') }}</p>
      <div class="grid">
      <button
          v-for="mode in PLANNING_MODES"
          :key="mode"
          class="chip gold"
          :aria-pressed="state.mode === mode"
          @click="planner.setMode(mode)"
        >{{ t(`planningModes.${mode}`) }}</button>
      </div>
      <p class="sub-frage">
        {{ t('rail.how.legCap') }}
        <b>{{ state.maxLegMinutes >= LEG_UNCAPPED ? t('rail.none') : t('common.minutes', { min: state.maxLegMinutes }) }}</b>
      </p>
      <!-- The rightmost stop means "egal" — a limit is a refinement somebody
           reaches for, not a wall they start against. -->
      <input
        :value="Math.min(state.maxLegMinutes, 50)"
        type="range"
        min="5"
        max="50"
        step="5"
        :aria-label="t('rail.how.legCapLabel')"
        :aria-valuetext="state.maxLegMinutes >= LEG_UNCAPPED ? t('rail.none') : t('rail.how.legCapMinutes', { min: state.maxLegMinutes })"
        @input="setLegCap(Number(($event.target as HTMLInputElement).value))"
      >
      <button class="fertig" @click="panels['p-weg']?.hidePopover()">{{ t('rail.done') }}</button>
    </div>

    <div
      :ref="setPanel('p-was')"
      id="p-was"
      popover
      class="rpanel"
      @toggle="onToggle('p-was', $event)"
    >
      <h2>{{ t('rail.wishes.title') }}</h2>
      <p>{{ t('rail.wishes.hint') }}</p>
      <div class="grid">
      <button
          v-for="tag in TAG_KEYS"
          :key="tag"
          class="chip"
          :aria-pressed="state.filters.tags.includes(tag)"
          @click="planner.toggle(state.filters.tags, tag)"
        >{{ tagLabel(tag) }}</button>
      </div>
      <div class="grid" style="margin-top: 10px">
      <button
          v-for="key in EXTRA_FILTERS"
          :key="key"
          class="chip gold"
          :aria-pressed="state.filters[key]"
          @click="state.filters[key] = !state.filters[key]; planner.persist()"
        >{{ t(`extras.${key}`) }}</button>
      </div>
      <p class="sub-frage">{{ t('rail.wishes.breweryQuestion') }}</p>
      <div class="grid">
      <button
          v-for="slug in breweries"
          :key="slug"
          class="chip"
          :aria-pressed="state.filters.breweries.includes(slug)"
          @click="planner.toggle(state.filters.breweries, slug)"
        >{{ breweryStyle(slug).label }}</button>
      </div>
      <button class="fertig" @click="panels['p-was']?.hidePopover()">{{ t('rail.done') }}</button>
    </div>
  </div>
</template>
