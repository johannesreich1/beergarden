<script setup lang="ts">
import type { Garden, ScheduleRow, StartPoint } from '#core'

const props = defineProps<{
  start: StartPoint
  /** Every stop of the plan, including the skipped ones. */
  planned: Garden[]
  rows: ScheduleRow[]
}>()

const emit = defineEmits<{ select: [slug: string] }>()

const viewBox = computed(() => viewBoxFor([props.start, ...props.planned]))

const activeSlugs = computed(() => new Set(props.rows.map((row) => row.garden.slug)))

/** The legs actually travelled, in order. */
const arcs = computed(() => {
  let previous: StartPoint | Garden = props.start

  return props.rows.map((row) => {
    const arc = { d: arcBetween(previous, row.garden), mode: row.legMode, key: row.garden.slug }
    previous = row.garden

    return arc
  })
})

const startPoint = computed(() => project(props.start))
</script>

<template>
  <div class="map-shell">
    <svg class="map" :viewBox="viewBox" role="img" aria-label="Karte der Tour">
      <polygon
        v-for="(park, index) in PARKS"
        :key="`park-${index}`"
        :points="polygonPoints(park)"
        :style="{ fill: 'var(--map-park)' }"
      />

      <path
        :d="smoothPath(ISAR)" fill="none" stroke-width="6" stroke-linecap="round"
        :style="{ stroke: 'var(--map-water)', opacity: .28 }"
      />
      <path
        :d="smoothPath(ISAR)" fill="none" stroke-width="1.6" stroke-linecap="round"
        :style="{ stroke: 'var(--map-water)', opacity: .7 }"
      />

      <ellipse
        v-for="(lake, index) in LAKES"
        :key="`lake-${index}`"
        :cx="project(lake)[0].toFixed(1)"
        :cy="project(lake)[1].toFixed(1)"
        :rx="projectRadius(lake)[0].toFixed(1)"
        :ry="projectRadius(lake)[1].toFixed(1)"
        stroke-width="1"
        :style="{ fill: 'var(--map-water)', stroke: 'var(--map-water)', opacity: .4 }"
      />

      <text
        v-for="hood in HOODS"
        :key="hood.label"
        :x="project(hood)[0].toFixed(1)"
        :y="project(hood)[1].toFixed(1)"
        :style="{ fill: 'var(--map-label)' }"
        font-size="7.5"
        letter-spacing="1.4"
        font-family="ui-monospace,monospace"
        text-anchor="middle"
      >{{ hood.label.toUpperCase() }}</text>

      <path
        v-for="arc in arcs"
        :key="arc.key"
        :d="arc.d"
        fill="none"
        :style="{ stroke: LEG_COLOURS[arc.mode] }"
        stroke-width="2.2"
        stroke-linecap="round"
        :stroke-dasharray="LEG_DASHES[arc.mode]"
      />

      <circle
        :cx="startPoint[0].toFixed(1)" :cy="startPoint[1].toFixed(1)" r="5.5"
        fill="none" stroke-width="2" :style="{ stroke: 'var(--foam)' }"
      />
      <circle
        :cx="startPoint[0].toFixed(1)" :cy="startPoint[1].toFixed(1)" r="1.8"
        :style="{ fill: 'var(--foam)' }"
      />
      <text
        :x="startPoint[0].toFixed(1)"
        :y="(startPoint[1] + 16).toFixed(1)"
        :style="{ fill: 'var(--foam)' }"
        font-size="8.5"
        font-family="ui-monospace,monospace"
        text-anchor="middle"
      >{{ start.name.toUpperCase() }}</text>

      <g
        v-for="garden in planned"
        :key="garden.slug"
        style="cursor: pointer"
        @click="emit('select', garden.slug)"
      >
        <rect
          :x="(project(garden)[0] - 6).toFixed(1)"
          :y="(project(garden)[1] - 6).toFixed(1)"
          width="12"
          height="12"
          :transform="`rotate(45 ${project(garden)[0].toFixed(1)} ${project(garden)[1].toFixed(1)})`"
          :style="{
            fill: activeSlugs.has(garden.slug) ? 'var(--gold)' : 'var(--edge)',
            stroke: 'var(--map-ground)',
          }"
          stroke-width="1.5"
        />
        <text
          :x="project(garden)[0].toFixed(1)"
          :y="(project(garden)[1] - 13).toFixed(1)"
          :style="{ fill: activeSlugs.has(garden.slug) ? 'var(--foam)' : 'var(--muted)' }"
          font-size="9"
          font-weight="700"
          font-family="-apple-system,sans-serif"
          text-anchor="middle"
        >{{ shortName(garden.name) }}</text>
      </g>
    </svg>

    <div class="map-legend">
      <div><i style="border-color: var(--leg-walk); border-top-style: dotted" />zu Fuß</div>
      <div><i style="border-color: var(--leg-bike); border-top-style: dashed" />Rad</div>
      <div><i style="border-color: var(--leg-transit); border-top-style: dashed" />ÖPNV</div>
    </div>
  </div>
</template>
