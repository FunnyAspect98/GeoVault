/**
 * LeafletMapView — Leaflet + OpenStreetMap integration for GeoVault parcel display.
 *
 * Renders fictional demo parcel polygons as red-outlined overlays on OpenStreetMap,
 * centered on Mumbai, India. Does NOT require any Google API keys or billing accounts.
 *
 * IMPORTANT DISCLAIMER:
 * All parcel boundaries shown are FICTIONAL demo boundaries.
 * They do NOT represent official property, revenue, or cadastral boundaries.
 */

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Parcel } from "./api"
import {
  svgPointsToLatLngs,
  MUMBAI_CENTER,
  DEFAULT_ZOOM,
} from "./geoParcelData"

export type LeafletMapViewProps = {
  parcels: Parcel[]
  selectedId?: string
  onSelect?: (id: string) => void
  centerSignal?: number
  resetSignal?: number
}

/**
 * Interactive Leaflet map centered on Mumbai, India with fictional demo parcel overlays.
 */
export default function LeafletMapView({
  parcels,
  selectedId,
  onSelect,
  centerSignal,
  resetSignal,
}: LeafletMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layersGroupRef = useRef<L.LayerGroup | null>(null)
  const isInitialMount = useRef(true)

  // Initialize the Leaflet map instance
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [MUMBAI_CENTER.lat, MUMBAI_CENTER.lng],
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    })

    // OpenStreetMap tile layer with attribution respecting OSM usage policy
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Add zoom controls to the bottom-right so they don't collide with GeoVault HUD
    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map)

    const layerGroup = L.layerGroup().addTo(map)
    layersGroupRef.current = layerGroup
    mapInstanceRef.current = map

    // Ensure map handles layout resizing smoothly
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapInstanceRef.current = null
      layersGroupRef.current = null
    }
  }, [])

  // Render parcel polygons whenever parcels or selectedId change
  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = layersGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()

    parcels.forEach((parcel) => {
      const latLngPoints = svgPointsToLatLngs(parcel.points).map(
        (point) => [point.lat, point.lng] as [number, number],
      )

      if (latLngPoints.length < 3) return

      const isSelected = parcel.id === selectedId

      // Red-outlined polygons with transparent red fills
      const polygon = L.polygon(latLngPoints, {
        color: isSelected ? "#ffffff" : "#e63946",
        weight: isSelected ? 3.5 : 2,
        opacity: isSelected ? 1.0 : 0.9,
        fillColor: "#e63946",
        fillOpacity: isSelected ? 0.32 : 0.14,
        className: isSelected ? "leaflet-parcel-selected" : "leaflet-parcel-item",
      })

      // Click to select parcel
      polygon.on("click", (event) => {
        L.DomEvent.stopPropagation(event)
        onSelect?.(parcel.id)
      })

      // Hover micro-animations
      polygon.on("mouseover", () => {
        polygon.setStyle({
          weight: isSelected ? 4 : 3,
          fillOpacity: isSelected ? 0.42 : 0.25,
        })
      })

      polygon.on("mouseout", () => {
        polygon.setStyle({
          weight: isSelected ? 3.5 : 2,
          fillOpacity: isSelected ? 0.32 : 0.14,
        })
      })

      // Parcel ID tooltip label positioned at centroid
      polygon.bindTooltip(parcel.id, {
        permanent: true,
        direction: "center",
        className: `leaflet-parcel-tooltip ${isSelected ? "is-selected" : ""}`,
      })

      // Detailed informational popup
      polygon.bindPopup(
        `<div class="leaflet-parcel-popup">` +
          `<div class="popup-title">${parcel.id}</div>` +
          `<div class="popup-row"><span>Status:</span> <strong>${parcel.status}</strong></div>` +
          `<div class="popup-row"><span>Owner:</span> <strong>${parcel.owner}</strong></div>` +
          `<div class="popup-row"><span>Area:</span> <strong>${Math.round(parcel.area)} m²</strong></div>` +
          `<div class="popup-disclaimer">⚠ Fictional demo boundary — not official land records</div>` +
        `</div>`,
        {
          className: "geovault-custom-popup",
          closeButton: false,
          offset: [0, -10],
        },
      )

      polygon.addTo(layerGroup)
    })
  }, [parcels, selectedId, onSelect])

  // Center on selected parcel when centerSignal triggers
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    const map = mapInstanceRef.current
    if (!map || !selectedId) return

    const selectedParcel = parcels.find((p) => p.id === selectedId)
    if (!selectedParcel || selectedParcel.points.length === 0) return

    const latLngs = svgPointsToLatLngs(selectedParcel.points)
    const centroid = latLngs.reduce(
      (acc, curr) => ({
        lat: acc.lat + curr.lat / latLngs.length,
        lng: acc.lng + curr.lng / latLngs.length,
      }),
      { lat: 0, lng: 0 },
    )

    map.panTo([centroid.lat, centroid.lng], { animate: true, duration: 0.5 })
  }, [centerSignal, selectedId, parcels])

  // Reset map view to Mumbai center when resetSignal triggers
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    map.setView([MUMBAI_CENTER.lat, MUMBAI_CENTER.lng], DEFAULT_ZOOM, {
      animate: true,
    })
  }, [resetSignal])

  return (
    <div className="leaflet-map-container" style={{ width: "100%", height: "100%" }}>
      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%" }}
        aria-label="Interactive Leaflet map showing Mumbai fictional demo parcels"
      />
      <div className="leaflet-disclaimer-badge">
        ⚠ Fictional demo boundaries — not official land records
      </div>
    </div>
  )
}
