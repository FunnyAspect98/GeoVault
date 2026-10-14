export type Point = { x: number y: number }

export const MAP_METERS_PER_UNIT = 0.5

export function polygonArea(points: Point[]) {
  if (points.length < 3) return 0
  const signed =
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length]
      return sum + point.x * next.y - next.x * point.y
    }, 0) / 2
  return Math.abs(signed) * MAP_METERS_PER_UNIT ** 2
}

export function polygonPerimeter(points: Point[]) {
  if (points.length < 2) return 0
  return (
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length]
      return sum + Math.hypot(next.x - point.x, next.y - point.y)
    }, 0) * MAP_METERS_PER_UNIT
  )
}

export function lineLength(points: Point[]) {
  if (points.length < 2) return 0
  return points.slice(1).reduce((sum, point, index) => {
      const previous = points[index]
      return sum + Math.hypot(point.x - previous.x, point.y - previous.y)
    }, 0) * MAP_METERS_PER_UNIT
}

function orientation(a: Point, b: Point, c: Point) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point) {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  return o1 * o2 < 0 && o3 * o4 < 0
}

export function polygonValidationError(points: Point[]) {
  if (
    points.some(
      (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y),
    )
  )
    return "Polygon contains invalid coordinates."
  if (points.length < 3) return "Add at least 3 vertices."
  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length
      if (first === second || firstNext === second || secondNext === first)
        continue
      if (
        segmentsIntersect(
          points[first],
          points[firstNext],
          points[second],
          points[secondNext],
        )
      ) {
        return `Edges ${first + 1} and ${second + 1} intersect.`
      }
    }
  }
  if (polygonArea(points) <= 0.01) return "Polygon area is too small."
  return null
}

export function isValidPolygon(points: Point[]) {
  return polygonValidationError(points) === null
}

function signedArea(points: Point[]) {
  return (
    points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length]
      return sum + point.x * next.y - next.x * point.y
    }, 0) / 2
  )
}

function inside(
  point: Point,
  edgeStart: Point,
  edgeEnd: Point,
  orientation: number,
) {
  const cross =
    (edgeEnd.x - edgeStart.x) * (point.y - edgeStart.y) -
    (edgeEnd.y - edgeStart.y) * (point.x - edgeStart.x)
  return orientation >= 0 ? cross >= -1e-9 : cross <= 1e-9
}

function lineIntersection(
  start: Point,
  end: Point,
  clipStart: Point,
  clipEnd: Point,
): Point {
  const dc = { x: clipStart.x - clipEnd.x, y: clipStart.y - clipEnd.y }
  const dp = { x: start.x - end.x, y: start.y - end.y }
  const n1 = clipStart.x * clipEnd.y - clipStart.y * clipEnd.x
  const n2 = start.x * end.y - start.y * end.x
  const denominator = dc.x * dp.y - dc.y * dp.x
  if (Math.abs(denominator) < 1e-9) return end
  return {
    x: (n1 * dp.x - n2 * dc.x) / denominator,
    y: (n1 * dp.y - n2 * dc.y) / denominator,
  }
}

// Sutherland–Hodgman clipping. The fictional cadastral parcels are convex polygons.
export function intersectPolygons(subject: Point[], clip: Point[]) {
  if (!isValidPolygon(subject) || !isValidPolygon(clip)) {
    return {
      valid: false,
      points: [] as Point[],
      error: "One or both parcel geometries are invalid.",
    }
  }

  let output = [...subject]
  const orientation = signedArea(clip)

  for (let index = 0; index < clip.length; index += 1) {
    const clipStart = clip[index]
    const clipEnd = clip[(index + 1) % clip.length]
    const input = output
    output = []
    if (!input.length) break

    let start = input[input.length - 1]
    for (const end of input) {
      if (inside(end, clipStart, clipEnd, orientation)) {
        if (!inside(start, clipStart, clipEnd, orientation)) {
          output.push(lineIntersection(start, end, clipStart, clipEnd))
        }
        output.push(end)
      } else if (inside(start, clipStart, clipEnd, orientation)) {
        output.push(lineIntersection(start, end, clipStart, clipEnd))
      }
      start = end
    }
  }

  const cleaned = output.filter((point, index) => {
    const previous = output[(index - 1 + output.length) % output.length]
    return (
      !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 1e-7
    )
  })

  return { valid: true, points: cleaned, error: null }
}

export function formatArea(area: number) {
  return `${area.toLocaleString("en-US", { maximumFractionDigits: 1 })} m²`
}

export function formatDistance(distance: number) {
  return `${distance.toLocaleString("en-US", { maximumFractionDigits: 1 })} m`
}
