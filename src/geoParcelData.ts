/**
 * Geographic parcel coordinate mapping for Leaflet + OpenStreetMap integration.
 *
 * Maps the fictional pixel-coordinate parcels from the SVG map onto real
 * Mumbai lat/lng positions so they render as polygon overlays on OpenStreetMap.
 *
 * IMPORTANT: These are fictional demo boundaries overlaid on real geography.
 * They are NOT official property, revenue, or cadastral boundaries.
 */

export type LatLng = { lat: number; lng: number }

/**
 * The SVG coordinate system uses a 900×520 viewBox.
 * We map that onto a region of Mumbai centered around Bandra-Kurla Complex.
 *
 * Anchor: top-left of SVG (0,0) → (19.0780, 72.8450)
 * Scale: 900px → ~0.012° lng, 520px → ~0.007° lat
 */
const ORIGIN_LAT = 19.0780
const ORIGIN_LNG = 72.8450
const LNG_SCALE = 0.012 / 900 // degrees per SVG pixel (x-axis)
const LAT_SCALE = 0.007 / 520 // degrees per SVG pixel (y-axis, inverted)

/** Convert a single SVG pixel coordinate to geographic lat/lng. */
export function svgToLatLng(svgX: number, svgY: number): LatLng {
  return {
    lat: ORIGIN_LAT - svgY * LAT_SCALE, // SVG Y goes down, lat goes up
    lng: ORIGIN_LNG + svgX * LNG_SCALE,
  }
}

/** Convert an array of SVG points to lat/lng pairs. */
export function svgPointsToLatLngs(
  points: { x: number; y: number }[],
): LatLng[] {
  return points.map((p) => svgToLatLng(p.x, p.y))
}

/** Mumbai center point (Bandra-Kurla Complex area) for map initialization. */
export const MUMBAI_CENTER: LatLng = { lat: 19.0740, lng: 72.8520 }

/** Default zoom level to show the parcel region. */
export const DEFAULT_ZOOM = 16

/**
 * Status-to-color mapping for parcel polygon strokes.
 * All use red-family tones to match the GeoVault brand.
 */
export function getParcelStrokeColor(status: string): string {
  switch (status.toLowerCase()) {
    case "verified":
      return "#22c55e"
    case "surveyed":
      return "#e63946"
    case "review":
      return "#f59e0b"
    case "conflict review":
      return "#ef4444"
    case "simulated revision":
      return "#a855f7"
    default:
      return "#e63946"
  }
}

export function getParcelFillColor(status: string): string {
  switch (status.toLowerCase()) {
    case "verified":
      return "rgba(34, 197, 94, 0.12)"
    case "surveyed":
      return "rgba(230, 57, 70, 0.10)"
    case "review":
      return "rgba(245, 158, 11, 0.12)"
    case "conflict review":
      return "rgba(239, 68, 68, 0.15)"
    case "simulated revision":
      return "rgba(168, 85, 247, 0.12)"
    default:
      return "rgba(230, 57, 70, 0.08)"
  }
}
