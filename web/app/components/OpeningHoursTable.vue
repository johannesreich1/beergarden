<script setup lang="ts">
import type { Garden } from '#core'
import { formatClock, hoursFor, isVerified } from '#core'

const props = defineProps<{
  garden: Garden
  /** null while prerendering — today is only known in the browser. */
  today: number | null
}>()

const { t } = useI18n()

const rows = computed(() =>
  WEEKDAY_VALUES.map((day) => {
    const hours = hoursFor(props.garden, day)
    const open = hours && !hours.isClosed && hours.opensAt !== null && hours.closesAt !== null

    return {
      value: day,
      name: t(`weekdays.name.${day}`),
      closed: !open,
      label: open ? `${formatClock(hours.opensAt!)}–${formatClock(hours.closesAt!)}` : t('hours.closed'),
    }
  }),
)

/**
 * As long as nothing has been verified against a source, the page says so. The
 * notice disappears by itself once the crawler fills `verified_at` — nobody has
 * to remember to remove it.
 */
const anyVerified = computed(() => WEEKDAY_VALUES.some((day) => isVerified(props.garden, day)))
</script>

<template>
  <div>
    <table class="hours">
      <thead>
        <tr><th>{{ t('hours.day') }}</th><th>{{ t('hours.open') }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.value" :class="{ today: row.value === today }">
          <td>{{ row.name }}</td>
          <td :class="{ closed: row.closed }">{{ row.label }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="!anyVerified" class="unverified">{{ t('hours.unverified') }}</p>
  </div>
</template>
