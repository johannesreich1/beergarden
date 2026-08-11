#!/usr/bin/env bash
#
# Munich basemap tiles for the maps on the planner and the detail pages.
#
# The extract is ~32 MB and derived from somebody else's daily build, so it is
# not in git. Run this once after cloning, and again whenever the basemap should
# be refreshed. Everything the maps need is then served by us — no tile server,
# no API key, no request leaving the page.
#
#   tools/fetch-tiles.sh
#
set -euo pipefail

# The Protomaps daily build to cut from. Pinned rather than "latest": a map that
# silently changes under the site is a map nobody can reproduce a bug on.
BUILD="20260810"

# Every garden and every start point, with a margin. Recompute with
#   python3 -c "…min/max over data/*.json…"  when the data grows beyond Munich.
BBOX="11.373,48.007,11.700,48.257"

# Zoom 15 is where the Protomaps basemap ends; asking for more only stores
# overzoomed copies of the same tiles.
MAXZOOM=15

VERSION="1.31.2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/web/public/tiles/munich.pmtiles"
CACHE="${TMPDIR:-/tmp}/pmtiles-$VERSION"

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64)  ASSET="Darwin_arm64" ;;
  Darwin-x86_64) ASSET="Darwin_x86_64" ;;
  Linux-aarch64) ASSET="Linux_arm64" ;;
  Linux-x86_64)  ASSET="Linux_x86_64" ;;
  *) echo "No pmtiles build for $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

if [ ! -x "$CACHE/pmtiles" ]; then
  echo "Fetching the pmtiles tool ($ASSET)…"
  mkdir -p "$CACHE"
  curl -sSL -o "$CACHE/pmtiles.zip" \
    "https://github.com/protomaps/go-pmtiles/releases/download/v$VERSION/go-pmtiles-${VERSION}_${ASSET}.zip"
  unzip -oq "$CACHE/pmtiles.zip" -d "$CACHE"
  chmod +x "$CACHE/pmtiles"
fi

mkdir -p "$(dirname "$OUT")"

echo "Cutting $BBOX out of build $BUILD…"
"$CACHE/pmtiles" extract "https://build.protomaps.com/$BUILD.pmtiles" "$OUT" \
  --bbox="$BBOX" --maxzoom="$MAXZOOM" --quiet

echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
