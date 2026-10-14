/**
 * GeoVault — Bhu-Explorer API Client
 *
 * Provides typed functions to communicate with the FastAPI backend.
 * Configured via Vite environment variable `VITE_API_BASE_URL` with a
 * default of `http://127.0.0.1:8001`.
 */

import type { Point } from "./geometry"

export type Parcel = {
  id: string
  points: Point[]
  x: number
  y: number
  area: number
  perimeter: number
  status: string
  landClass: string
  confidence: number
}

export type HealthResponse = {
  status: string
  service: string
  version: string
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL as string | undefined ||
  "http://127.0.0.1:8001"

/**
 * Fetch all cadastral parcels from the FastAPI backend.
 */
export async function fetchParcels(): Promise<Parcel[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/parcels`, {
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch parcels: HTTP ${response.status} (${response.statusText || "Error"})`,
    )
  }

  const data: Parcel[] = await response.json()
  return data
}

/**
 * Fetch a single cadastral parcel by its identifier (e.g. GV-054).
 */
export async function fetchParcelById(parcelId: string): Promise<Parcel> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/parcels/${encodeURIComponent(parcelId)}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  )

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Parcel "${parcelId}" was not found.`)
    }
    throw new Error(
      `Failed to fetch parcel "${parcelId}": HTTP ${response.status} (${response.statusText || "Error"})`,
    )
  }

  const data: Parcel = await response.json()
  return data
}

/**
 * Check backend service operational health.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(
      `Backend health check failed: HTTP ${response.status} (${response.statusText || "Error"})`,
    )
  }

  const data: HealthResponse = await response.json()
  return data
}
