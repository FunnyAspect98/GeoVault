/**
 * Fallback cadastral parcel fixtures.
 *
 * Used when the FastAPI backend is starting up or temporarily unreachable.
 * Reuses the exact fictional coordinates and properties from Sector 08.
 */

import { polygonArea, polygonPerimeter, type Point } from "./geometry"
import type { Parcel } from "./api"

export function createParcel(
  id: string,
  points: Point[],
  x: number,
  y: number,
  status: string,
  landClass: string,
  confidence: number,
): Parcel {
  return {
    id,
    points,
    x,
    y,
    area: polygonArea(points),
    perimeter: polygonPerimeter(points),
    status,
    landClass,
    confidence,
  }
}

export const FALLBACK_PARCELS: Parcel[] = [
  createParcel(
    "GV-041",
    [
      { x: 71, y: 62 },
      { x: 246, y: 37 },
      { x: 270, y: 174 },
      { x: 90, y: 194 },
    ],
    143,
    121,
    "Surveyed",
    "Agricultural",
    96,
  ),
  createParcel(
    "GV-042",
    [
      { x: 246, y: 37 },
      { x: 426, y: 59 },
      { x: 413, y: 180 },
      { x: 270, y: 174 },
    ],
    327,
    111,
    "Surveyed",
    "Agricultural",
    94,
  ),
  createParcel(
    "GV-043",
    [
      { x: 426, y: 59 },
      { x: 607, y: 77 },
      { x: 581, y: 206 },
      { x: 413, y: 180 },
    ],
    490,
    132,
    "Verified",
    "Mixed use",
    98,
  ),
  createParcel(
    "GV-044",
    [
      { x: 607, y: 77 },
      { x: 817, y: 70 },
      { x: 838, y: 207 },
      { x: 581, y: 206 },
    ],
    684,
    137,
    "Review",
    "Agricultural",
    86,
  ),
  createParcel(
    "GV-052",
    [
      { x: 90, y: 194 },
      { x: 270, y: 174 },
      { x: 285, y: 316 },
      { x: 81, y: 319 },
    ],
    159,
    260,
    "Surveyed",
    "Agricultural",
    95,
  ),
  createParcel(
    "GV-053",
    [
      { x: 270, y: 174 },
      { x: 413, y: 180 },
      { x: 443, y: 302 },
      { x: 285, y: 316 },
    ],
    334,
    249,
    "Verified",
    "Mixed use",
    97,
  ),
  createParcel(
    "GV-054",
    [
      { x: 413, y: 180 },
      { x: 581, y: 206 },
      { x: 575, y: 332 },
      { x: 443, y: 302 },
    ],
    474,
    257,
    "Surveyed",
    "Agricultural",
    92,
  ),
  createParcel(
    "GV-055",
    [
      { x: 550, y: 202 },
      { x: 838, y: 207 },
      { x: 825, y: 340 },
      { x: 547, y: 325 },
    ],
    682,
    271,
    "Conflict review",
    "Agricultural",
    81,
  ),
  createParcel(
    "GV-061",
    [
      { x: 81, y: 319 },
      { x: 285, y: 316 },
      { x: 315, y: 468 },
      { x: 82, y: 486 },
    ],
    163,
    405,
    "Surveyed",
    "Agricultural",
    93,
  ),
  createParcel(
    "GV-062",
    [
      { x: 285, y: 316 },
      { x: 443, y: 302 },
      { x: 460, y: 472 },
      { x: 315, y: 468 },
    ],
    350,
    398,
    "Verified",
    "Mixed use",
    96,
  ),
  createParcel(
    "GV-063",
    [
      { x: 443, y: 302 },
      { x: 575, y: 332 },
      { x: 605, y: 477 },
      { x: 460, y: 472 },
    ],
    493,
    407,
    "Review",
    "Agricultural",
    88,
  ),
  createParcel(
    "GV-064",
    [
      { x: 575, y: 332 },
      { x: 825, y: 340 },
      { x: 789, y: 475 },
      { x: 605, y: 477 },
    ],
    677,
    409,
    "Surveyed",
    "Agricultural",
    95,
  ),
]
