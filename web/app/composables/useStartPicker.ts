import type { StartPoint } from '#core'
import { distanceKm } from '#core'

/**
 * What the picker has to report about the last attempt — or null when there
 * is nothing to say. A typed union, not loose strings: two of the old German
 * codes were rendered nowhere, and no compiler could tell.
 */
export type StartPickerNote = 'unknown-place' | 'locating' | 'denied' | 'unsupported' | null

/**
 * Picking the start point.
 *
 * Only the rail's Ort panel asks this today, but the matching rules and the
 * geolocation behaviour are policy, not presentation — they stay out of the
 * component so the next surface that asks (the app, a widget) cannot drift.
 */
export function useStartPicker(startPoints: Ref<StartPoint[]>) {
  const planner = usePlanner()
  const { state } = planner

  const startQuery = ref('')
  const startNote = ref<StartPickerNote>(null)

  watch(
    () => state.value.startPoint.name,
    (name) => {
      startQuery.value = name
      // A changed start point IS the success feedback — the chip now carries
      // the new name. That is why there is no 'located' state to render.
      startNote.value = null
    },
    { immediate: true },
  )

  function applyStartQuery(): void {
    const query = startQuery.value.trim().toLowerCase()

    const hit =
      startPoints.value.find((point) => point.name.toLowerCase() === query) ??
      startPoints.value.find((point) => point.name.toLowerCase().includes(query))

    if (!hit) {
      startNote.value = 'unknown-place'
      return
    }

    state.value.startPoint = hit
    planner.persist()
  }

  function locateMe(): void {
    if (!navigator.geolocation) {
      startNote.value = 'unsupported'
      return
    }

    startNote.value = 'locating'

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = { lat: position.coords.latitude, lon: position.coords.longitude }

        const nearest = [...startPoints.value]
          .map((point) => ({ point, distance: distanceKm(here, point) }))
          .sort((a, b) => a.distance - b.distance)[0]

        // Under 1.2 km, adopt the stop's name — it says more than "my location"
        // and is recognisable on the timeline.
        const near = nearest && nearest.distance < 1.2

        state.value.startPoint = near
          ? nearest.point
          : { name: 'Mein Standort', lat: here.lat, lon: here.lon }

        planner.persist()
      },
      () => {
        startNote.value = 'denied'
      },
      { timeout: 8000 },
    )
  }

  return { startQuery, startNote, applyStartQuery, locateMe }
}
