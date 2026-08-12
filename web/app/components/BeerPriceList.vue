<script setup lang="ts">
import type { Garden } from '#core'
import { MASS_ML, REFERENCE_KIND, massPrice } from '#core'

/**
 * A garden's beer prices.
 *
 * The Maß price sits at the top and large, because that is the question people
 * actually ask. Everything else below it in a table — and when nothing has been
 * surveyed, the page says exactly that. An estimated beer price would be worse
 * than none, because nobody reads it as an estimate.
 */
const props = defineProps<{ garden: Garden }>()

const { t } = useI18n()
const { beerKind, beerSize } = useFormats()

const mass = computed(() => massPrice(props.garden))

/** Maß first, then by size descending, then by kind. */
const rows = computed(() =>
  [...props.garden.beerPrices].sort((a, b) =>
    b.sizeMl - a.sizeMl || a.kind.localeCompare(b.kind, 'de'),
  ),
)

const anyVerified = computed(() =>
  props.garden.beerPrices.some((price) => price.verifiedAt !== null),
)
</script>

<template>
  <div>
    <div v-if="mass" class="price-hero">
      <span class="eyebrow">{{ beerKind(REFERENCE_KIND) }}, {{ beerSize(MASS_ML) }}</span>
      <span class="amount">{{ formatEuro(mass.cents) }}</span>
    </div>

    <table v-if="rows.length" class="prices">
      <tbody>
        <tr v-for="price in rows" :key="`${price.kind}-${price.sizeMl}`">
          <td>{{ beerKind(price.kind) }}</td>
          <td class="size">{{ beerSize(price.sizeMl) }}</td>
          <td class="amount">{{ formatEuro(price.cents) }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else class="unverified">{{ t('beer.noPrices') }}</p>

    <p v-if="rows.length && !anyVerified" class="unverified">{{ t('beer.unverified') }}</p>
  </div>
</template>
