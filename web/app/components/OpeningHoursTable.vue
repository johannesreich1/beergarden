<script setup lang="ts">
import type { Garden } from '#core'
import { formatClock, hoursFor, isVerified } from '#core'

const props = defineProps<{
  garden: Garden
  /** null while prerendering — today is only known in the browser. */
  today: number | null
}>()

const rows = computed(() =>
  WEEKDAYS.map((day) => {
    const hours = hoursFor(props.garden, day.value)
    const open = hours && !hours.isClosed && hours.opensAt !== null && hours.closesAt !== null

    return {
      value: day.value,
      name: day.name,
      closed: !open,
      label: open ? `${formatClock(hours.opensAt!)}–${formatClock(hours.closesAt!)}` : 'geschlossen',
    }
  }),
)

/**
 * As long as nothing has been verified against a source, the page says so. The
 * notice disappears by itself once the crawler fills `verified_at` — nobody has
 * to remember to remove it.
 */
const anyVerified = computed(() => WEEKDAYS.some((day) => isVerified(props.garden, day.value)))
</script>

<template>
  <div>
    <table class="hours">
      <thead>
        <tr><th>Tag</th><th>Geöffnet</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.value" :class="{ today: row.value === today }">
          <td>{{ row.name }}</td>
          <td :class="{ closed: row.closed }">{{ row.label }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="!anyVerified" class="unverified">
      Diese Zeiten stammen aus der ersten Recherche und sind gegen keine Quelle
      verifiziert. Biergarten-Öffnungszeiten sind ohnehin Wetterangaben — bei
      zweifelhaftem Wetter entscheidet der Wirt morgens um neun.
    </p>
  </div>
</template>
