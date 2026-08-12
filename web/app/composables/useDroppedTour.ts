import type { Garden } from '#core'
import { checkPlan, formatClock, formatDuration } from '#core'

/**
 * The dropped tour, explained.
 *
 * When settings change and the chosen tour stops working, the planner drops
 * it rather than leaving it silently wrong. This composable owns everything
 * the page then has to say about it: which tour it was, why it no longer
 * works, whether it would work again — and the way back.
 *
 * The reason is recomputed on every change rather than frozen at drop time.
 * Otherwise a number from back then sits next to a setting from now, and the
 * sentence contradicts itself.
 */
export function useDroppedTour(gardens: Ref<Garden[]>) {
  const { t } = useI18n()
  const planner = usePlanner()
  const { state, options, droppedTour } = planner

  const gardenName = (slug: string) =>
    gardens.value.find((garden) => garden.slug === slug)?.name ?? slug

  const chain = computed(() =>
    (droppedTour.value?.plan.slugs ?? []).map((slug) => shortName(gardenName(slug))).join(' → '),
  )

  const problem = computed(() =>
    droppedTour.value
      ? checkPlan(droppedTour.value.plan, gardens.value, options.value, state.value.stayOverrides)
      : null,
  )

  /** Whether the dropped tour would work again under the current settings. */
  const worksAgain = computed(() => !!droppedTour.value && problem.value === null)

  /** Why the tour no longer works — in plain words, not as an error code. */
  const reason = computed(() => {
    const hit = problem.value
    if (!hit) return ''

    const name = gardenName(hit.slug)

    switch (hit.kind) {
      case 'closed':
        return t('dropped.closed', { name, weekday: t(`weekdays.adverb.${state.value.weekday}`) })
      case 'too-early':
        return t('dropped.tooEarly', {
          name,
          arrival: formatClock(hit.arrival),
          opens: formatClock(hit.opensAt!),
        })
      case 'too-late':
        return t('dropped.tooLate', {
          name,
          closes: formatClock(hit.closesAt!),
          arrival: formatClock(hit.arrival),
        })
      case 'over-budget':
        return t('dropped.overBudget', {
          total: formatDuration(hit.totalMinutes!),
          budget: formatDuration(state.value.budgetMinutes),
        })
      case 'missing':
        return t('dropped.missing', { name })
    }
  })

  /**
   * Take it back. If it does not work, it drops out again immediately —
   * with whatever reason applies then. So no separate check is needed here.
   */
  function retake(): void {
    if (droppedTour.value) planner.choosePlan(droppedTour.value.plan)
  }

  return { droppedTour, chain, reason, worksAgain, retake }
}
