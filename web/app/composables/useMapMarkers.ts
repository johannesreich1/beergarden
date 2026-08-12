import type { Marker } from 'maplibre-gl'

/**
 * Bookkeeping for a map's DOM markers.
 *
 * Every map that redraws does the same three things: keep the list, empty it
 * before the redraw, and empty it again when the component goes — a marker
 * left behind keeps its element and its listeners alive. Three maps had this
 * inlined; the pattern lives here so a fourth cannot forget the unmount.
 */
export function useMapMarkers() {
  const markers: Marker[] = []

  function clear(): void {
    for (const marker of markers.splice(0)) marker.remove()
  }

  onBeforeUnmount(clear)

  return { markers, clear }
}
