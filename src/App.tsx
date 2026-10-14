import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react"
import {
  formatArea,
  formatDistance,
  intersectPolygons,
  isValidPolygon,
  lineLength,
  polygonArea,
  polygonPerimeter,
  polygonValidationError,
  type Point,
} from "./geometry"
import { fetchParcels, fetchParcelById, type Parcel, API_BASE_URL } from "./api"
import { FALLBACK_PARCELS, createParcel } from "./fallbackData"
import LeafletMapView from "./LeafletMapView"

type IconName = "arrow" | "chevron" | "layers" | "scan" | "file" | "search" | "plus" | "minus" | "locate" | "alert" | "check" | "grid" | "globe"

function Icon({ name, size = 18 }: { name: IconName size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5" />
        <path d="m3 17 9 5 9-5" />
      </>
    ),
    scan: (
      <>
        <path d="M3 7V4a1 1 0 0 1 1-1h3" />
        <path d="M17 3h3a1 1 0 0 1 1 1v3" />
        <path d="M21 17v3a1 1 0 0 1-1 1h-3" />
        <path d="M7 21H4a1 1 0 0 1-1-1v-3" />
        <path d="M7 8h10v8H7z" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8M8 17h5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    locate: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.8 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </>
    ),
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Logo() {
  return (
    <button
      className="logo"
      onClick={() => navigateTo("/")}
      aria-label="GeoVault home"
    >
      <span className="logo-mark" aria-hidden="true">
        <span />
      </span>
      <span>GeoVault</span>
      <span className="logo-product">Bhu-Explorer</span>
    </button>
  )
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function downloadText(filename: string, contents: string) {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "text/plain;charset=utf-8" }),
  )
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function Button({
  children,
  variant = "primary",
  onClick,
  className = "",
  disabled = false,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  const resetMagnet = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.setProperty("--magnet-x", "0px")
    event.currentTarget.style.setProperty("--magnet-y", "0px")
  }

  const moveMagnet = (event: MouseEvent<HTMLButtonElement>) => {
    if (
      variant !== "primary" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.12
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.12
    event.currentTarget.style.setProperty("--magnet-x", `${x}px`)
    event.currentTarget.style.setProperty("--magnet-y", `${y}px`)
  }

  return (
    <button
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      onMouseMove={moveMagnet}
      onMouseLeave={resetMagnet}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Navbar({ dashboard = false }: { dashboard?: boolean }) {
  const [scrolled, setScrolled] = useState(dashboard)
  const [activeSection, setActiveSection] = useState("home")

  useEffect(() => {
    if (dashboard) return
    const updateNavigation = () => {
      setScrolled(window.scrollY > 28)
      const sections = ["about", "features", "home"]
      const current = sections.find((id) => {
        const section = document.getElementById(id)
        return section && section.getBoundingClientRect().top <= 150
      })
      setActiveSection(current ?? "home")
    }
    updateNavigation()
    window.addEventListener("scroll", updateNavigation, { passive: true })
    return () => window.removeEventListener("scroll", updateNavigation)
  }, [dashboard])

  const goToSection = (id: string) => {
    if (dashboard) {
      navigateTo(`/#${id}`)
      window.setTimeout(
        () =>
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
        50,
      )
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header
      className={`navbar ${scrolled ? "is-scrolled" : ""} ${
        dashboard ? "dashboard-navbar" : ""
      }`}
    >
      <div className="nav-inner">
        <Logo />
        <nav className="nav-links" aria-label="Primary navigation">
          <button
            className={activeSection === "home" ? "active" : ""}
            onClick={() =>
              dashboard
                ? navigateTo("/")
                : window.scrollTo({ top: 0, behavior: "smooth" })
            }
          >
            Home
          </button>
          <button
            className={activeSection === "features" ? "active" : ""}
            onClick={() => goToSection("features")}
          >
            Features
          </button>
          <button
            className={activeSection === "about" ? "active" : ""}
            onClick={() => goToSection("about")}
          >
            About
          </button>
        </nav>
        {dashboard ? (
          <Button variant="ghost" onClick={() => navigateTo("/")}>
            Back to site
          </Button>
        ) : (
          <Button onClick={() => navigateTo("/dashboard")}>
            Land Dashboard <Icon name="arrow" size={16} />
          </Button>
        )}
      </div>
    </header>
  )
}

function pointsPath(points: Point[]) {
  return `${points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ")}Z`
}

function pointsAttribute(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ")
}

const parcels = FALLBACK_PARCELS

function buildComparisonParcels(sourceParcels: Parcel[]): Parcel[] {
  return sourceParcels.map((parcel) => {
    if (parcel.id === "GV-054")
      return createParcel(
        parcel.id,
        [
          { x: 413, y: 180 },
          { x: 568, y: 210 },
          { x: 563, y: 325 },
          { x: 443, y: 302 },
        ],
        parcel.x,
        parcel.y,
        "Simulated revision",
        parcel.landClass,
        parcel.confidence,
      )
    if (parcel.id === "GV-055")
      return createParcel(
        parcel.id,
        [
          { x: 568, y: 210 },
          { x: 838, y: 207 },
          { x: 825, y: 340 },
          { x: 563, y: 325 },
        ],
        parcel.x,
        parcel.y,
        "Simulated revision",
        parcel.landClass,
        parcel.confidence,
      )
    if (parcel.id === "GV-063")
      return createParcel(
        parcel.id,
        parcel.points.map((point, index) =>
          index === 1 ? { x: point.x - 8, y: point.y + 4 } : point,
        ),
        parcel.x,
        parcel.y,
        "Simulated revision",
        parcel.landClass,
        parcel.confidence,
      )
    return parcel
  })
}

const comparisonParcels = buildComparisonParcels(FALLBACK_PARCELS)

function ParcelMap({
  dashboard = false,
  selectedId,
  linkedId,
  onSelect,
  onHover,
  layers,
  analysisState = "idle",
  centerSignal = 0,
  activeTool = "pan",
  analysisIds = [],
  intersectionPoints = [],
  zoom = 1,
  view3d = false,
  resetSignal = 0,
  comparisonPosition = null,
  parcelsList,
}: {
  dashboard?: boolean
  selectedId?: string
  linkedId?: string | null
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  layers?: {
    boundaries: boolean
    ids: boolean
    conflicts: boolean
    grid: boolean
    records: boolean
  }
  analysisState?: "idle" | "running" | "complete"
  centerSignal?: number
  activeTool?: "pan" | "measure" | "draw"
  analysisIds?: string[]
  intersectionPoints?: Point[]
  zoom?: number
  view3d?: boolean
  resetSignal?: number
  comparisonPosition?: number | null
  parcelsList?: Parcel[]
}) {
  const currentParcels =
    parcelsList && parcelsList.length > 0 ? parcelsList : parcels
  const currentComparisonParcels = buildComparisonParcels(currentParcels)
  const [internalSelected, setInternalSelected] = useState("GV-054")
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [coordinates, setCoordinates] = useState<Point>({ x: 450, y: 260 })
  const [measurePoints, setMeasurePoints] = useState<Point[]>([])
  const [drawPoints, setDrawPoints] = useState<Point[]>([])
  const [drawClosed, setDrawClosed] = useState(false)
  const [rotation, setRotation] = useState({ x: 56, z: 0 })
  const [editingVertex, setEditingVertex] = useState<number | null>(null)
  const dragStart = useRef<{
    x: number
    y: number
    panX: number
    panY: number
    rotateX: number
    rotateZ: number
  } | null>(null)
  const wasDragged = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const activeId = selectedId ?? internalSelected
  const tooltipParcel = currentParcels.find(
    (parcel) => parcel.id === (hoveredId ?? (!dashboard ? activeId : "")),
  )
  const activeLayers = layers ?? {
    boundaries: true,
    ids: true,
    conflicts: true,
    grid: true,
    records: false,
  }

  useEffect(() => {
    if (!dashboard) return
    const parcel = currentParcels.find((item) => item.id === activeId)
    if (parcel)
      setPan({ x: (450 - parcel.x) * 0.13, y: (260 - parcel.y) * 0.13 })
  }, [activeId, centerSignal, currentParcels, dashboard])

  useEffect(() => {
    if (!resetSignal) return
    setPan({ x: 0, y: 0 })
    setRotation({ x: 56, z: 0 })
  }, [resetSignal])

  const selectParcel = (id: string) => {
    setInternalSelected(id)
    onSelect?.(id)
  }

  const hoverParcel = (id: string | null) => {
    setHoveredId(id)
    onHover?.(id)
  }

  const beginPan = (event: PointerEvent<HTMLDivElement>) => {
    if (!dashboard || activeTool !== "pan" || event.button !== 0) return
    wasDragged.current = false
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
      rotateX: rotation.x,
      rotateZ: rotation.z,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add("is-panning")
  }

  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const matrix = svgRef.current?.getScreenCTM()
    if (matrix && svgRef.current) {
      const point = svgRef.current.createSVGPoint()
      point.x = event.clientX
      point.y = event.clientY
      const mapped = point.matrixTransform(matrix.inverse())
      setCoordinates({
        x: Math.max(0, Math.min(900, mapped.x)),
        y: Math.max(0, Math.min(520, mapped.y)),
      })
    }
    if (editingVertex !== null) {
      const point = mapPoint(event.clientX, event.clientY)
      if (point)
        setDrawPoints((current) =>
          current.map((vertex, index) =>
            index === editingVertex ? point : vertex,
          ),
        )
      return
    }
    if (!dragStart.current) return
    if (
      Math.abs(event.clientX - dragStart.current.x) > 4 ||
      Math.abs(event.clientY - dragStart.current.y) > 4
    )
      wasDragged.current = true
    if (view3d) {
      setRotation({
        x: Math.max(
          35,
          Math.min(
            72,
            dragStart.current.rotateX -
              (event.clientY - dragStart.current.y) * 0.16,
          ),
        ),
        z: Math.max(
          -18,
          Math.min(
            18,
            dragStart.current.rotateZ +
              (event.clientX - dragStart.current.x) * 0.08,
          ),
        ),
      })
    } else {
      setPan({
        x: dragStart.current.panX + event.clientX - dragStart.current.x,
        y: dragStart.current.panY + event.clientY - dragStart.current.y,
      })
    }
  }

  const endPan = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = null
    setEditingVertex(null)
    event.currentTarget.classList.remove("is-panning")
    window.setTimeout(() => {
      wasDragged.current = false
    }, 0)
  }

  const mapPoint = (clientX: number, clientY: number) => {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix || !svgRef.current) return null
    const point = svgRef.current.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const mapped = point.matrixTransform(matrix.inverse())
    return { x: mapped.x, y: mapped.y }
  }

  const useMapTool = (event: MouseEvent<SVGSVGElement>) => {
    if (activeTool === "pan" || wasDragged.current || editingVertex !== null)
      return
    const point = mapPoint(event.clientX, event.clientY)
    if (!point) return
    if (activeTool === "measure") {
      setMeasurePoints((current) =>
        current.length >= 2 ? [point] : [...current, point],
      )
    } else {
      if (drawClosed) {
        setDrawPoints([point])
        setDrawClosed(false)
      } else {
        setDrawPoints((current) => [...current, point])
      }
    }
  }

  const latitude = 28.61 + coordinates.y * 0.00001
  const longitude = 77.2 + coordinates.x * 0.00001
  const drawError = polygonValidationError(drawPoints)

  const startVertexEdit = (
    index: number,
    event: PointerEvent<SVGCircleElement>,
  ) => {
    event.stopPropagation()
    setEditingVertex(index)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const nudgeVertex = (
    index: number,
    event: KeyboardEvent<SVGCircleElement>,
  ) => {
    const movement: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    }
    const delta = movement[event.key]
    if (!delta) return
    event.preventDefault()
    setDrawPoints((current) =>
      current.map((point, vertexIndex) =>
        vertexIndex === index
          ? { x: point.x + delta.x, y: point.y + delta.y }
          : point,
      ),
    )
  }

  return (
    <div
      className={`parcel-map ${
        dashboard
          ? `dashboard-map tool-${activeTool} ${view3d ? "view-3d" : ""}`
          : ""
      } ${analysisState !== "idle" ? `analysis-${analysisState}` : ""}`}
      onPointerDown={beginPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      <div className={`map-grid ${activeLayers.grid ? "" : "layer-hidden"}`} />
      <svg
        ref={svgRef}
        className="map-art"
        style={
          {
            "--pan-x": `${pan.x}px`,
            "--pan-y": `${pan.y}px`,
            "--rotate-x": `${rotation.x}deg`,
            "--rotate-z": `${rotation.z}deg`,
          } as CSSProperties
        }
        viewBox="0 0 900 520"
        preserveAspectRatio="xMidYMid slice"
        aria-label="Fictional parcel boundary map"
        onClick={useMapTool}
      >
        <g className="contours">
          <path d="M-30 110C126 31 214 154 351 89S624 19 946 82" />
          <path d="M-50 441c143-98 246 4 378-50s286-95 603-28" />
          <path d="M668-30c-24 115 84 158 52 270s-5 195 62 316" />
        </g>
        <g className="roads">
          <path d="M-10 318c153-18 268 24 398-2 175-35 286-137 535-109" />
          <path d="M239-20c41 102-11 206 46 291s63 157 32 276" />
        </g>
        <g
          className={`parcels ${activeLayers.boundaries ? "" : "layer-hidden"}`}
        >
          {currentParcels.map((parcel) => (
            <g
              key={parcel.id}
              className={`parcel-shape ${
                activeId === parcel.id ? "selected" : ""
              } ${linkedId === parcel.id ? "linked" : ""} ${
                analysisIds.includes(parcel.id) ? "analysis-pair" : ""
              }`}
              onMouseEnter={() => hoverParcel(parcel.id)}
              onMouseLeave={() => hoverParcel(null)}
              onFocus={() => hoverParcel(parcel.id)}
              onBlur={() => hoverParcel(null)}
              onClick={(event) => {
                if (activeTool !== "pan") return
                event.stopPropagation()
                if (!wasDragged.current) selectParcel(parcel.id)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  selectParcel(parcel.id)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${parcel.id}, ${formatArea(parcel.area)}, ${parcel.status}. Select parcel`}
            >
              <path d={pointsPath(parcel.points)} />
            </g>
          ))}
        </g>
        <g
          className={`parcel-labels ${activeLayers.ids ? "" : "layer-hidden"}`}
        >
          {currentParcels.map((parcel) => (
            <text
              key={parcel.id}
              className={activeId === parcel.id ? "selected-label" : ""}
              x={parcel.x}
              y={parcel.y}
            >
              {parcel.id}
            </text>
          ))}
        </g>
        {dashboard &&
          activeLayers.conflicts &&
          intersectionPoints.length >= 3 && (
            <g
              className={`conflict-zone ${
                analysisState !== "idle" ? "is-analyzing" : ""
              }`}
            >
              <polygon points={pointsAttribute(intersectionPoints)} />
              <circle
                cx={
                  intersectionPoints.reduce((sum, point) => sum + point.x, 0) /
                  intersectionPoints.length
                }
                cy={
                  intersectionPoints.reduce((sum, point) => sum + point.y, 0) /
                  intersectionPoints.length
                }
                r="11"
              />
              <text
                x={
                  intersectionPoints.reduce((sum, point) => sum + point.x, 0) /
                  intersectionPoints.length
                }
                y={
                  intersectionPoints.reduce((sum, point) => sum + point.y, 0) /
                    intersectionPoints.length +
                  4
                }
              >
                !
              </text>
            </g>
          )}
        {measurePoints.length > 0 && (
          <g className="measurement-overlay">
            <polyline points={pointsAttribute(measurePoints)} />
            {measurePoints.map((point, index) => (
              <circle key={index} cx={point.x} cy={point.y} r="4" />
            ))}
          </g>
        )}
        {drawPoints.length > 0 && (
          <g className={`drawing-overlay ${drawClosed ? "closed" : ""}`}>
            {drawClosed ? (
              <polygon points={pointsAttribute(drawPoints)} />
            ) : (
              <polyline points={pointsAttribute(drawPoints)} />
            )}
            {drawPoints.map((point, index) => (
              <circle
                key={index}
                className={editingVertex === index ? "is-editing" : ""}
                cx={point.x}
                cy={point.y}
                r="5"
                role="button"
                tabIndex={0}
                aria-label={`Edit polygon vertex ${index + 1}`}
                onPointerDown={(event) => startVertexEdit(index, event)}
                onKeyDown={(event) => nudgeVertex(index, event)}
              />
            ))}
          </g>
        )}
      </svg>
      {comparisonPosition !== null && (
        <svg
          className="map-art comparison-map"
          style={
            {
              "--pan-x": `${pan.x}px`,
              "--pan-y": `${pan.y}px`,
              "--rotate-x": `${rotation.x}deg`,
              "--rotate-z": `${rotation.z}deg`,
              "--comparison": `${comparisonPosition}%`,
            } as CSSProperties
          }
          viewBox="0 0 900 520"
          preserveAspectRatio="xMidYMid slice"
          aria-label="Simulated revised boundary dataset"
        >
          <g className="comparison-parcels">
            {currentComparisonParcels.map((parcel) => (
              <path
                key={parcel.id}
                d={pointsPath(parcel.points)}
                className={
                  ["GV-054", "GV-055", "GV-063"].includes(parcel.id)
                    ? "changed"
                    : ""
                }
              />
            ))}
          </g>
        </svg>
      )}
      {analysisState === "running" && (
        <div className="boundary-scan-sweep" aria-hidden="true" />
      )}
      {activeLayers.records && (
        <div className="record-overlay">Record overlay · SD/08/2021</div>
      )}
      {dashboard && (
        <>
          <div className="map-coordinate-readout">
            {latitude.toFixed(5)}° N&nbsp;&nbsp; {longitude.toFixed(5)}° E
          </div>
          <div
            className="map-compass"
            aria-label="Map orientation, north is up"
          >
            <b>N</b>
            <i />
            <span>↑</span>
          </div>
          <div className="dynamic-scale">
            <i style={{ width: `${80 / zoom}px` }} />
            <span>{formatDistance(80 * 0.5)}</span>
          </div>
          {activeTool === "measure" && measurePoints.length > 0 && (
            <div className="tool-result">
              <span>Measurement</span>
              <strong>
                {measurePoints.length === 2
                  ? formatDistance(lineLength(measurePoints))
                  : "Select end point"}
              </strong>
              <button onClick={() => setMeasurePoints([])}>Clear</button>
            </div>
          )}
          {activeTool === "draw" && drawPoints.length > 0 && (
            <div className="tool-result">
              <span>Sample polygon · {drawPoints.length} vertices</span>
              <strong className={drawError ? "geometry-error" : ""}>
                {drawError ??
                  `${formatArea(polygonArea(drawPoints))} · ${formatDistance(polygonPerimeter(drawPoints))}`}
              </strong>
              {!drawError && (
                <small>
                  Drag vertices or use arrow keys to refine geometry.
                </small>
              )}
              <div>
                <button
                  disabled={!isValidPolygon(drawPoints)}
                  onClick={() => setDrawClosed(true)}
                >
                  Finish polygon
                </button>
                <button
                  onClick={() => {
                    setDrawPoints([])
                    setDrawClosed(false)
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="map-location">
        <span /> Sample Region · Sector 08
      </div>
      {tooltipParcel && (
        <div
          className={`map-tooltip ${hoveredId ? "is-hovered" : ""}`}
          aria-live="polite"
        >
          <span className="eyebrow">
            {hoveredId ? "Parcel preview" : "Selected plot"}
          </span>
          <strong>Parcel {tooltipParcel.id}</strong>
          <span>
            {formatArea(tooltipParcel.area)} · {tooltipParcel.status}
          </span>
        </div>
      )}
    </div>
  )
}

const features = [
  {
    icon: "layers" as IconName,
    number: "01",
    title: "Parcel Mapping",
    description:
      "Navigate precise parcel geometries and layered cadastral data in one focused workspace.",
    meta: "Spatial layers",
    details: ["Layered cadastral view", "Coordinate-aware selection"],
    wireframe: "M8 46 34 10l36 8 18 31-31 22-42-7Z M34 10l23 61 M70 18 15 46",
  },
  {
    icon: "scan" as IconName,
    number: "02",
    title: "Boundary Analysis",
    description:
      "Compare adjacent boundaries and surface potential overlaps before they become disputes.",
    meta: "Conflict detection",
    details: ["Polygon intersection", "Calculated overlap metrics"],
    wireframe: "M12 18 52 8l26 30-22 36-44-15Z M39 22l42 7-13 38-38-9Z",
  },
  {
    icon: "file" as IconName,
    number: "03",
    title: "Land Deed OCR",
    description:
      "Extract structured parcel references and measurements from scanned land documents.",
    meta: "Document intelligence",
    details: ["Editable field review", "Clearly simulated output"],
    wireframe:
      "M24 7h42l18 18v48H24Z M66 7v20h18 M34 42h40 M34 53h31 M34 64h22",
  },
]

function LandingMapDemo() {
  const [selectedId, setSelectedId] = useState("GV-054")
  const [zoom, setZoom] = useState(1)
  const [centerSignal, setCenterSignal] = useState(0)
  const selected =
    parcels.find((parcel) => parcel.id === selectedId) ?? parcels[6]

  return (
    <div className="landing-map-demo">
      <div className="map-frame">
        <div className="map-frame-bar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>Live Parcel Explorer / Fictional Sector 08</span>
          <div className="map-legend">
            <span>
              <i className="legend-selected" /> Selected
            </span>
            <span>
              <i /> Parcel boundary
            </span>
          </div>
        </div>
        <div
          className="preview-map-shell"
          style={{ "--map-zoom": zoom } as CSSProperties}
        >
          <ParcelMap
            dashboard
            selectedId={selectedId}
            onSelect={setSelectedId}
            centerSignal={centerSignal}
            zoom={zoom}
          />
          <div className="map-controls left-controls preview-controls">
            <MapControl
              icon="plus"
              label="Zoom preview in"
              onClick={() => setZoom((value) => Math.min(1.3, value + 0.1))}
            />
            <MapControl
              icon="minus"
              label="Zoom preview out"
              onClick={() => setZoom((value) => Math.max(0.9, value - 0.1))}
            />
            <MapControl
              icon="locate"
              label="Reset preview"
              onClick={() => {
                setZoom(1)
                setCenterSignal((value) => value + 1)
              }}
            />
          </div>
        </div>
      </div>
      <aside className="landing-parcel-panel" key={selected.id}>
        <span className="eyebrow">Selected sample parcel</span>
        <strong>{selected.id}</strong>
        <dl>
          <div>
            <dt>Calculated area</dt>
            <dd>{formatArea(selected.area)}</dd>
          </div>
          <div>
            <dt>Perimeter</dt>
            <dd>{formatDistance(selected.perimeter)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{selected.status}</dd>
          </div>
        </dl>
        <Button onClick={() => navigateTo("/dashboard")}>
          Open in dashboard <Icon name="arrow" size={15} />
        </Button>
      </aside>
    </div>
  )
}

function LandingPage() {
  useEffect(() => {
    const elements = document.querySelectorAll(".scroll-reveal")
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(
          (entry) =>
            entry.isIntersecting && entry.target.classList.add("is-visible"),
        )
      },
      { threshold: 0.14 },
    )
    elements.forEach((element) => observer.observe(element))
    const updateParallax = () =>
      document.documentElement.style.setProperty(
        "--scroll-shift",
        `${window.scrollY * -0.035}px`,
      )
    window.addEventListener("scroll", updateParallax, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", updateParallax)
    }
  }, [])

  const moveTerrain = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    event.currentTarget.style.setProperty("--terrain-x", `${(x - 0.5) * -18}px`)
    event.currentTarget.style.setProperty("--terrain-y", `${(y - 0.5) * -12}px`)
    event.currentTarget.style.setProperty("--cursor-x", `${x * 100}%`)
    event.currentTarget.style.setProperty("--cursor-y", `${y * 100}%`)
  }

  const tiltCard = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width - 0.5
    const y = (event.clientY - bounds.top) / bounds.height - 0.5
    event.currentTarget.style.setProperty("--tilt-x", `${y * -4}deg`)
    event.currentTarget.style.setProperty("--tilt-y", `${x * 5}deg`)
    event.currentTarget.style.setProperty("--spot-x", `${(x + 0.5) * 100}%`)
    event.currentTarget.style.setProperty("--spot-y", `${(y + 0.5) * 100}%`)
  }

  const resetCard = (event: MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--tilt-x", "0deg")
    event.currentTarget.style.setProperty("--tilt-y", "0deg")
  }

  return (
    <div className="site-shell">
      <Navbar />
      <main>
        <section className="hero" id="home" onMouseMove={moveTerrain}>
          <div className="terrain-spotlight" aria-hidden="true" />
          <div className="hero-terrain-grid" aria-hidden="true" />
          <div className="hero-reticle" aria-hidden="true">
            <i />
            <i />
          </div>
          <div className="hero-topography" aria-hidden="true">
            <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice">
              <g>
                <path d="M769-51C657 86 763 171 663 279s-33 224-106 341-9 171-48 218" />
                <path d="M878-60C752 69 855 193 751 296s-24 218-101 330-19 168-44 214" />
                <path d="M985-52C847 84 948 198 849 316s-34 204-109 314-17 170-35 216" />
                <path d="M1096-45C950 95 1058 212 949 332s-39 196-112 303-33 165-37 211" />
                <path d="M1201-37c-139 135-43 273-150 385s-49 192-120 295-43 156-37 203" />
              </g>
              <g className="hero-parcels">
                <path d="m701 124 154-45 73 115-98 93-151-28Z" />
                <path d="m928 194 154-32 62 137-151 55-163-67Z" />
                <path d="m679 259 151 28-29 164-171 22-75-125Z" />
                <path d="m830 287 163 67-41 143-151-46Z" />
                <path d="m993 354 151-55 102 126-97 113-197-41Z" />
                <path d="m630 473 171-22 151 46-52 165-223 25-89-102Z" />
              </g>
            </svg>
          </div>
          <div className="floating-coordinate coordinate-a">
            P-08 / 28.6128°N
          </div>
          <div className="floating-coordinate coordinate-b">GRID 77.2041°E</div>
          <div className="floating-coordinate coordinate-c">DATUM / WGS 84</div>
          <div className="hero-coordinates">
            28.6139° N<br />
            77.2090° E
          </div>
          <div className="container hero-content">
            <div className="hero-kicker">
              <span /> Geospatial intelligence platform
            </div>
            <h1>
              Land Intelligence.
              <br />
              <em>Boundary Clarity.</em>
            </h1>
            <p>
              Explore land parcels, visualize boundaries, and identify potential
              spatial conflicts.
            </p>
            <div className="hero-actions">
              <Button
                onClick={() =>
                  document
                    .getElementById("live-map")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Explore the Map <Icon name="arrow" size={17} />
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigateTo("/dashboard#analysis")}
              >
                Analyze Boundaries <Icon name="scan" size={16} />
              </Button>
            </div>
          </div>
          <div className="hero-metric">
            <span>System status</span>
            <strong>
              <i /> Spatial engine online
            </strong>
          </div>
          <div className="scroll-label">
            Scroll to explore <span />
          </div>
        </section>

        <div
          className="coordinate-strip"
          aria-label="Geospatial analysis labels"
        >
          <div>
            <span>28.61390° N · 77.20900° E</span>
            <i /> <span>PARCEL TOPOLOGY</span>
            <i /> <span>BOUNDARY INTERSECTION</span>
            <i /> <span>WGS 84 / SECTOR 08</span>
            <i />
            <span>28.61390° N · 77.20900° E</span>
            <i /> <span>PARCEL TOPOLOGY</span>
            <i /> <span>BOUNDARY INTERSECTION</span>
            <i /> <span>WGS 84 / SECTOR 08</span>
          </div>
        </div>

        <section className="features-section" id="features">
          <div className="container">
            <div className="section-heading scroll-reveal">
              <div>
                <span className="eyebrow">Platform capabilities</span>
                <h2>Built for spatial certainty.</h2>
              </div>
              <p>
                Transform complex land records into clear, actionable geographic
                intelligence.
              </p>
            </div>
            <div className="feature-grid">
              {features.map((feature) => (
                <article
                  className="feature-card scroll-reveal"
                  key={feature.title}
                  onMouseMove={tiltCard}
                  onMouseLeave={resetCard}
                >
                  <div className="feature-card-top">
                    <span className="feature-icon">
                      <Icon name={feature.icon} size={22} />
                    </span>
                    <span className="feature-number">{feature.number}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <svg
                    className="feature-wireframe"
                    viewBox="0 0 96 82"
                    aria-hidden="true"
                  >
                    <path d={feature.wireframe} />
                  </svg>
                  <ul>
                    {feature.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                  <div className="feature-meta">
                    <span /> {feature.meta}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="preview-section" id="live-map">
          <div className="container">
            <div className="preview-heading scroll-reveal">
              <div>
                <span className="eyebrow">Interactive parcel view</span>
                <h2>
                  See every boundary.
                  <br />
                  Understand every edge.
                </h2>
              </div>
              <p>
                Move from regional context to parcel-level detail without losing
                spatial clarity. Every line tells part of the story.
              </p>
            </div>
            <div className="scroll-reveal">
              <LandingMapDemo />
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="container about-grid scroll-reveal">
            <div>
              <span className="eyebrow">A clearer view of land</span>
              <h2>Decisions grounded in spatial truth.</h2>
            </div>
            <div className="about-copy">
              <p>
                GeoVault brings boundary records, parcel geometry, and document
                intelligence into one measured workspace—built to help planning
                teams examine land with confidence.
              </p>
              <Button onClick={() => navigateTo("/dashboard")}>
                Open sample dashboard <Icon name="arrow" size={16} />
              </Button>
            </div>
          </div>
        </section>

        <section className="final-cta">
          <svg
            viewBox="0 0 1200 380"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M-40 210 190 28l220 72 180-46 250 102 170-92 240 170-90 182-310-48-180 66-230-88-246 55Z" />
            <path d="m190 28 70 270 150-198 180 254 250-198 20 212 150-304" />
          </svg>
          <div className="container final-cta-content scroll-reveal">
            <span className="eyebrow">From geometry to understanding</span>
            <h2>
              Every Boundary
              <br />
              Tells a Story.
            </h2>
            <p>
              Explore fictional parcel geometry, calculate intersections, and
              examine spatial relationships in one precise workspace.
            </p>
            <Button onClick={() => navigateTo("/dashboard")}>
              Open Land Dashboard <Icon name="arrow" size={17} />
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

function MapControl({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: IconName
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      className={`map-control has-tooltip ${active ? "active" : ""}`}
      aria-label={label}
      data-tooltip={label}
      onClick={onClick}
      aria-pressed={active}
    >
      <Icon name={icon} size={17} />
    </button>
  )
}

type AnalysisResult = {
  ids: [string, string]
  points: Point[]
  area: number
  perimeter: number
  overlap: number
  status: "overlap" | "clear" | "invalid"
  message: string
}

type HistoryEntry = {
  id: number
  type: "search" | "analysis"
  title: string
  detail: string
  parcelId?: string
  result?: AnalysisResult
  time: string
}

function Dashboard() {
  const [layerOpen, setLayerOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<"details" | "records">("details")
  const [selectedId, setSelectedId] = useState("GV-054")
  const [linkedId, setLinkedId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [zoom, setZoom] = useState(1)
  const [centerSignal, setCenterSignal] = useState(0)
  const [workspace, setWorkspace] =
    useState<"map" | "details" | "analysis" | "compare" | "ocr" | "history">(
      window.location.hash === "#analysis" ? "analysis" : "map",
    )
  const [analysisState, setAnalysisState] =
    useState<"idle" | "running" | "complete">("idle")
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisIds, setAnalysisIds] = useState<[string, string]>([
    "GV-054",
    "GV-055",
  ])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  )
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [ocrState, setOcrState] = useState<"empty" | "processing" | "complete">(
    "empty",
  )
  const [ocrFile, setOcrFile] = useState<{
    name: string
    url: string
    type: string
  } | null>(null)
  const [ocrFields, setOcrFields] = useState({
    parcelId: "GV-054",
    surveyRef: "SD-08-5421",
    area: "",
    confidence: "96.4%",
  })
  const [activeTool, setActiveTool] = useState<"pan" | "measure" | "draw">(
    "pan",
  )
  const [view3d, setView3d] = useState(false)
  const [mapResetSignal, setMapResetSignal] = useState(0)
  const [comparisonPosition, setComparisonPosition] = useState(52)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState("")
  const [commandIndex, setCommandIndex] = useState(0)
  const [mapMode, setMapMode] = useState<"svg" | "leaflet">("leaflet")
  const [layers, setLayers] = useState({
    boundaries: true,
    ids: true,
    conflicts: true,
    grid: true,
    records: false,
  })
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      id: 1,
      type: "search",
      title: "Sample search · GV-043",
      detail: "Parcel opened from sample history",
      parcelId: "GV-043",
      time: "Sample entry",
    },
  ])
  const timers = useRef<number[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [parcelsList, setParcelsList] = useState<Parcel[]>(FALLBACK_PARCELS)
  const [apiLoading, setApiLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<"fastapi" | "fallback">(
    "fallback",
  )

  const loadParcels = async () => {
    setApiLoading(true)
    setApiError(null)
    try {
      const data = await fetchParcels()
      if (Array.isArray(data) && data.length > 0) {
        setParcelsList(data)
        setDataSource("fastapi")
      } else {
        setParcelsList(FALLBACK_PARCELS)
        setDataSource("fallback")
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to reach FastAPI backend"
      setApiError(message)
      setParcelsList(FALLBACK_PARCELS)
      setDataSource("fallback")
    } finally {
      setApiLoading(false)
    }
  }

  useEffect(() => {
    loadParcels()
  }, [])

  const selectedParcel =
    parcelsList.find((parcel) => parcel.id === selectedId) ??
    parcelsList[0] ??
    FALLBACK_PARCELS[6]
  const sampleConflictGeometry = intersectPolygons(
    (parcelsList[6] ?? FALLBACK_PARCELS[6]).points,
    (parcelsList[7] ?? FALLBACK_PARCELS[7]).points,
  )
  const sampleConflictArea = sampleConflictGeometry.valid
    ? polygonArea(sampleConflictGeometry.points)
    : 0
  const suggestions = query
    ? parcelsList
        .filter((parcel) =>
          parcel.id.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 5)
    : []
  const recentParcels = ["GV-054", "GV-043", "GV-061"]
  const relatedParcels = parcelsList
    .filter((parcel) => parcel.id !== selectedParcel.id)
    .sort(
      (first, second) =>
        Math.hypot(first.x - selectedParcel.x, first.y - selectedParcel.y) -
        Math.hypot(second.x - selectedParcel.x, second.y - selectedParcel.y),
    )
    .slice(0, 4)
  const dashboardComparisonParcels = buildComparisonParcels(parcelsList)
  const revisedSelected =
    dashboardComparisonParcels.find(
      (parcel) => parcel.id === selectedParcel.id,
    ) ?? selectedParcel

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  useEffect(() => {
    const openCommands = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen((open) => !open)
        setCommandQuery("")
        setCommandIndex(0)
      }
      if (event.key === "Escape") setCommandOpen(false)
    }
    window.addEventListener("keydown", openCommands)
    return () => window.removeEventListener("keydown", openCommands)
  }, [])

  const queue = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay)
    timers.current.push(timer)
  }

  const notify = (message: string) => {
    setNotification(message)
    queue(() => setNotification(null), 2200)
  }

  const chooseParcel = (id: string, logSearch = false) => {
    setSelectedId(id)
    setActiveTab("details")
    setQuery("")
    setWorkspace("details")
    setLoadingDetails(true)
    setZoom(1.08)
    queue(() => setLoadingDetails(false), 340)
    notify(`${id} selected · map centered`)
    if (dataSource === "fastapi") {
      fetchParcelById(id)
        .then((fetched) => {
          setParcelsList((current) =>
            current.map((item) => (item.id === fetched.id ? fetched : item)),
          )
        })
        .catch(() => {
          /* Keep current parcel data gracefully */
        })
    }
    if (logSearch) {
      setHistory((current) => [
        {
          id: Date.now(),
          type: "search",
          title: `Search · ${id}`,
          detail: "Parcel selected from search results",
          parcelId: id,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...current,
      ])
    }
  }

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }))
  }

  const runAnalysis = (requestedIds: [string, string] = analysisIds) => {
    const first = parcelsList.find((parcel) => parcel.id === requestedIds[0])
    const second = parcelsList.find((parcel) => parcel.id === requestedIds[1])
    setAnalysisIds(requestedIds)
    setWorkspace("analysis")
    setAnalysisState("running")
    setAnalysisProgress(8)
    setAnalysisResult(null)
    setSelectedId(requestedIds[0])
    setLinkedId(requestedIds[1])
    setZoom(1.17)
    setNotification("Tracing shared boundary…")
    queue(() => setAnalysisProgress(34), 320)
    queue(() => setAnalysisProgress(67), 760)
    queue(() => setAnalysisProgress(91), 1120)
    queue(() => {
      let result: AnalysisResult
      if (
        !first ||
        !second ||
        first.id === second.id ||
        !isValidPolygon(first.points) ||
        !isValidPolygon(second.points)
      ) {
        result = {
          ids: requestedIds,
          points: [],
          area: 0,
          perimeter: 0,
          overlap: 0,
          status: "invalid",
          message:
            first?.id === second?.id
              ? "Choose two different parcels."
              : "One or both parcel geometries are invalid.",
        }
      } else {
        const intersection = intersectPolygons(first.points, second.points)
        const area = intersection.valid ? polygonArea(intersection.points) : 0
        const perimeter = intersection.valid
          ? polygonPerimeter(intersection.points)
          : 0
        const overlap =
          area > 0 ? (area / Math.min(first.area, second.area)) * 100 : 0
        result = {
          ids: requestedIds,
          points: intersection.points,
          area,
          perimeter,
          overlap,
          status: !intersection.valid
            ? "invalid"
            : area > 0.01
              ? "overlap"
              : "clear",
          message: !intersection.valid
            ? (intersection.error ?? "Invalid geometry.")
            : area > 0.01
              ? "The parcel polygons overlap."
              : "No polygon overlap was detected.",
        }
      }
      setAnalysisResult(result)
      setAnalysisState("complete")
      setAnalysisProgress(100)
      setNotification("Prototype geometry analysis complete")
      setLinkedId(null)
      setHistory((current) => [
        {
          id: Date.now(),
          type: "analysis",
          title: `${result.ids[0]} × ${result.ids[1]}`,
          detail:
            result.status === "overlap"
              ? `${formatArea(result.area)} calculated overlap`
              : result.message,
          result,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...current,
      ])
    }, 1450)
    queue(() => setNotification(null), 3600)
  }

  const processDocument = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (ocrFile) URL.revokeObjectURL(ocrFile.url)
    setOcrFile({
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    })
    setOcrFields({
      parcelId: "GV-054",
      surveyRef: "SD-08-5421",
      area: formatArea(
        (parcelsList[6] ?? parcelsList[0] ?? FALLBACK_PARCELS[6]).area,
      ),
      confidence: "96.4%",
    })
    setOcrState("processing")
    notify("Running simulated extraction…")
    queue(() => {
      setOcrState("complete")
      setNotification("Sample deed extraction complete")
    }, 1200)
  }

  const resetOcr = () => {
    if (ocrFile) URL.revokeObjectURL(ocrFile.url)
    setOcrFile(null)
    setOcrState("empty")
  }

  const selectAnalysisParcel = (index: 0 | 1, id: string) => {
    setAnalysisIds((current) =>
      index === 0 ? [id, current[1]] : [current[0], id],
    )
    setAnalysisState("idle")
    setAnalysisProgress(0)
    setAnalysisResult(null)
  }

  const selectMapParcel = (id: string) => {
    if (workspace === "compare") {
      setSelectedId(id)
      notify(`${id} loaded in comparison`)
      return
    }
    if (workspace !== "analysis") {
      chooseParcel(id)
      return
    }
    setAnalysisIds((current) =>
      current.includes(id) ? current : [current[1], id],
    )
    setSelectedId(id)
    setAnalysisState("idle")
    setAnalysisResult(null)
  }

  const resetMap = () => {
    setZoom(1)
    setView3d(false)
    setActiveTool("pan")
    setMapResetSignal((value) => value + 1)
    setCenterSignal((value) => value + 1)
    notify("Map view reset")
  }

  const downloadReport = (result: AnalysisResult) => {
    downloadText(
      `geovault-${result.ids.join("-")}-analysis.txt`,
      [
        "GEOVAULT — BHU-EXPLORER",
        "Prototype spatial analysis report",
        "",
        `Parcels: ${result.ids.join(" and ")}`,
        `Status: ${result.status.toUpperCase()}`,
        `Calculated intersection area: ${formatArea(result.area)}`,
        `Calculated intersection perimeter: ${formatDistance(result.perimeter)}`,
        `Overlap of smaller parcel: ${result.overlap.toFixed(2)}%`,
        "",
        result.message,
        "",
        "DISCLAIMER: Prototype output using fictional sample geometry. Not an official government record, legal determination, ownership verification, or survey.",
      ].join("\n"),
    )
    notify("Prototype analysis report downloaded")
  }

  const commands = [
    {
      label: "Refresh parcels from FastAPI",
      hint: "Sync latest parcel data from backend API",
      action: () => {
        loadParcels()
        setCommandOpen(false)
        notify("Syncing parcels from FastAPI…")
      },
    },
    {
      label: "Search parcels",
      hint: "Focus parcel ID search",
      action: () => {
        setCommandOpen(false)
        queue(() => searchInputRef.current?.focus(), 20)
      },
    },
    {
      label: view3d ? "Return to 2D map" : "Enable 3D map",
      hint: "Toggle perspective controls",
      action: () => {
        setView3d((value) => !value)
        setCommandOpen(false)
      },
    },
    {
      label: "Reset map view",
      hint: "Reset zoom, rotation and tools",
      action: () => {
        resetMap()
        setCommandOpen(false)
      },
    },
    {
      label: "Open boundary analysis",
      hint: "Compare two parcel polygons",
      action: () => {
        setWorkspace("analysis")
        setCommandOpen(false)
      },
    },
    {
      label: "Run intersection analysis",
      hint: `${analysisIds[0]} × ${analysisIds[1]}`,
      action: () => {
        runAnalysis()
        setCommandOpen(false)
      },
    },
    {
      label: "Open boundary comparison",
      hint: "Baseline versus simulated revision",
      action: () => {
        setWorkspace("compare")
        setCommandOpen(false)
      },
    },
    {
      label: "Measure distance",
      hint: "Activate map measurement tool",
      action: () => {
        setActiveTool("measure")
        setCommandOpen(false)
      },
    },
    {
      label: "Draw sample polygon",
      hint: "Activate editable polygon tool",
      action: () => {
        setActiveTool("draw")
        setCommandOpen(false)
      },
    },
    {
      label: layers.grid ? "Hide coordinate grid" : "Show coordinate grid",
      hint: "Toggle active map layer",
      action: () => {
        toggleLayer("grid")
        setCommandOpen(false)
      },
    },
    {
      label: "Open Deed OCR",
      hint: "Simulated extraction workspace",
      action: () => {
        setWorkspace("ocr")
        setCommandOpen(false)
      },
    },
  ]
  const filteredCommands = commands.filter((command) =>
    `${command.label} ${command.hint}`
      .toLowerCase()
      .includes(commandQuery.toLowerCase()),
  )

  const handleCommandKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setCommandIndex((index) =>
        Math.min(index + 1, Math.max(filteredCommands.length - 1, 0)),
      )
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setCommandIndex((index) => Math.max(index - 1, 0))
    }
    if (event.key === "Enter" && filteredCommands[commandIndex]) {
      event.preventDefault()
      filteredCommands[commandIndex].action()
    }
  }

  return (
    <div className="dashboard-shell">
      <Navbar dashboard />
      <main className="dashboard-main">
        {notification && (
          <div className="dashboard-notification" role="status">
            <span />
            <Icon name="check" size={14} /> {notification}
          </div>
        )}
        <div className="dashboard-heading">
          <div>
            <span className="eyebrow">Land intelligence workspace</span>
            <h1>Parcel Explorer</h1>
          </div>
          <nav className="workspace-nav" aria-label="Dashboard workspaces">
            {([
              ["map", "Map Explorer"],
              ["details", "Parcel Details"],
              ["analysis", "Boundary Analysis"],
              ["compare", "Compare"],
              ["ocr", "Deed OCR"],
              ["history", "History"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                className={workspace === id ? "active" : ""}
                onClick={() => setWorkspace(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="dashboard-actions">
            <button
              className={`status-pill ${
                apiLoading
                  ? "status-loading"
                  : dataSource === "fastapi"
                    ? "status-live"
                    : "status-fallback"
              }`}
              onClick={() => {
                loadParcels()
                notify(
                  dataSource === "fastapi"
                    ? "Refreshed parcels from FastAPI"
                    : "Retrying FastAPI connection…",
                )
              }}
              title={
                apiLoading
                  ? "Loading parcels from FastAPI…"
                  : dataSource === "fastapi"
                    ? "Connected to FastAPI (/api/v1/parcels) • Click to refresh"
                    : `FastAPI offline (${apiError ?? "unavailable"}). Using local Sector 08 fixtures. Click to retry.`
              }
            >
              <i />{" "}
              {apiLoading
                ? "Connecting…"
                : dataSource === "fastapi"
                  ? `FastAPI Live (${parcelsList.length})`
                  : `Offline Fallback (${parcelsList.length})`}
            </button>
            <Button
              variant="secondary"
              onClick={() => {
                downloadText(
                  "geovault-map-view.txt",
                  `GeoVault prototype map view\nSelected parcel: ${selectedId}\nSource: ${
                    dataSource === "fastapi" ? "FastAPI Live" : "Local Fallback"
                  }\nCoordinates: 28.6142, 77.2104\n\nPrototype using fictional sample data. Not an official government record.`,
                )
                notify("Prototype map summary downloaded")
              }}
            >
              <Icon name="grid" size={16} /> Export view
            </Button>
          </div>
        </div>

        {apiError && dataSource === "fallback" && (
          <div className="api-status-banner" role="status">
            <span>
              <strong>FastAPI backend notice:</strong> {apiError}. Using local
              Sector 08 fallback fixtures.
            </span>
            <button
              type="button"
              onClick={() => {
                loadParcels()
                notify("Retrying FastAPI connection…")
              }}
            >
              Retry Connection
            </button>
          </div>
        )}

        <div className="dashboard-layout">
          <aside className="dashboard-sidebar">
            <div
              className={`search-wrap ${
                query && suggestions.length === 0 ? "has-error" : ""
              }`}
            >
              <label className="search-box">
                <Icon name="search" size={17} />
                <input
                  ref={searchInputRef}
                  placeholder="Search parcel ID"
                  aria-label="Search parcel ID"
                  aria-invalid={query.length > 0 && suggestions.length === 0}
                  aria-controls="parcel-suggestions"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <kbd>⌘ K</kbd>
              </label>
              {query && (
                <div className="search-suggestions" id="parcel-suggestions">
                  {suggestions.length ? (
                    suggestions.map((parcel) => (
                      <button
                        key={parcel.id}
                        onMouseEnter={() => setLinkedId(parcel.id)}
                        onMouseLeave={() => setLinkedId(null)}
                        onClick={() => chooseParcel(parcel.id, true)}
                      >
                        <span>
                          {parcel.id}
                          <small>{formatArea(parcel.area)}</small>
                        </span>
                        <i>{parcel.status}</i>
                      </button>
                    ))
                  ) : (
                    <p>No matching parcel. Try “GV-054”.</p>
                  )}
                </div>
              )}
            </div>
            <div className="sidebar-section">
              <button
                className="sidebar-title"
                onClick={() => setLayerOpen(!layerOpen)}
              >
                <span>Map layers</span>
                <span className={layerOpen ? "rotate" : ""}>⌄</span>
              </button>
              <div
                className={`layer-list ${layerOpen ? "is-open" : ""}`}
                aria-hidden={!layerOpen}
                inert={!layerOpen}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={layers.boundaries}
                    onChange={() => toggleLayer("boundaries")}
                  />
                  <span className="checkmark">
                    <Icon name="check" size={12} />
                  </span>
                  <i className="line-red" /> Parcel boundaries
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={layers.ids}
                    onChange={() => toggleLayer("ids")}
                  />
                  <span className="checkmark">
                    <Icon name="check" size={12} />
                  </span>
                  <i className="fill-grey" /> Parcel IDs
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={layers.conflicts}
                    onChange={() => toggleLayer("conflicts")}
                  />
                  <span className="checkmark">
                    <Icon name="check" size={12} />
                  </span>
                  <i className="fill-red" /> Conflict areas
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={layers.grid}
                    onChange={() => toggleLayer("grid")}
                  />
                  <span className="checkmark">
                    <Icon name="check" size={12} />
                  </span>
                  <i className="line-grey" /> Survey grid
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={layers.records}
                    onChange={() => toggleLayer("records")}
                  />
                  <span className="checkmark">
                    <Icon name="check" size={12} />
                  </span>
                  <i className="fill-grey" /> Record overlay
                </label>
              </div>
            </div>
            <div className="sidebar-section recent-section">
              <span className="sidebar-label">Recent parcels</span>
              {recentParcels.map((id) => (
                <button
                  key={id}
                  className={`recent-parcel ${
                    selectedId === id ? "active" : ""
                  }`}
                  onMouseEnter={() => setLinkedId(id)}
                  onMouseLeave={() => setLinkedId(null)}
                  onFocus={() => setLinkedId(id)}
                  onBlur={() => setLinkedId(null)}
                  onClick={() => chooseParcel(id)}
                >
                  <span>{id}</span>
                  <small>
                    Sector 08{selectedId === id ? " · Selected" : ""}
                  </small>
                </button>
              ))}
            </div>
            <div className="sidebar-foot">
              <Icon name="locate" size={15} /> Sample Region
              <br />
              <span>Coordinate system: WGS 84</span>
            </div>
          </aside>

          <section
            className="dashboard-map-wrap"
            style={{ "--map-zoom": zoom } as CSSProperties}
          >
            {mapMode === "leaflet" ? (
              <LeafletMapView
                parcels={parcelsList}
                selectedId={selectedId}
                onSelect={selectMapParcel}
                centerSignal={centerSignal}
                resetSignal={mapResetSignal}
              />
            ) : (
              <ParcelMap
                dashboard
                selectedId={selectedId}
                linkedId={linkedId}
                onSelect={selectMapParcel}
                onHover={setLinkedId}
                layers={layers}
                analysisState={analysisState}
                analysisIds={workspace === "analysis" ? analysisIds : []}
                intersectionPoints={analysisResult?.points ?? []}
                centerSignal={centerSignal}
                activeTool={activeTool}
                zoom={zoom}
                view3d={view3d}
                resetSignal={mapResetSignal}
                comparisonPosition={
                  workspace === "compare" ? comparisonPosition : null
                }
                parcelsList={parcelsList}
              />
            )}
            <div className="intelligence-hud" aria-live="polite">
              <div>
                <span>Selected</span>
                <strong>{selectedParcel.id}</strong>
              </div>
              <div>
                <span>Area / perimeter</span>
                <strong>
                  {formatArea(selectedParcel.area)} ·{" "}
                  {formatDistance(selectedParcel.perimeter)}
                </strong>
              </div>
              <div>
                <span>Centroid</span>
                <strong>
                  {(28.61 + selectedParcel.y * 0.00001).toFixed(5)}° N ·{" "}
                  {(77.2 + selectedParcel.x * 0.00001).toFixed(5)}° E
                </strong>
              </div>
              <div>
                <span>Active layers</span>
                <strong>
                  {Object.values(layers).filter(Boolean).length} /{" "}
                  {Object.keys(layers).length}
                </strong>
              </div>
              <div>
                <span>Analysis</span>
                <strong className={`hud-analysis ${analysisState}`}>
                  {analysisState === "running"
                    ? `${analysisProgress}% scanning`
                    : analysisState}
                </strong>
              </div>
            </div>
            <div className="map-controls left-controls">
              <MapControl
                icon="plus"
                label="Zoom in"
                onClick={() => setZoom((value) => Math.min(1.3, value + 0.1))}
              />
              <MapControl
                icon="minus"
                label="Zoom out"
                onClick={() => setZoom((value) => Math.max(0.9, value - 0.1))}
              />
              <MapControl
                icon="locate"
                label="Center selected parcel"
                onClick={() => {
                  setZoom(1.08)
                  setCenterSignal((value) => value + 1)
                  notify(`Centered on ${selectedId}`)
                }}
              />
              <MapControl
                icon="scan"
                label={view3d ? "Return to 2D map" : "Enable rotatable 3D map"}
                active={view3d}
                onClick={() => setView3d((value) => !value)}
              />
              <MapControl
                icon="grid"
                label="Reset map view"
                onClick={resetMap}
              />
            </div>
            <div className="map-controls right-controls">
              <MapControl
                icon="globe"
                label={
                  mapMode === "leaflet"
                    ? "Switch to SVG blueprint map"
                    : "Switch to Leaflet OpenStreetMap"
                }
                active={mapMode === "leaflet"}
                onClick={() => {
                  setMapMode((m) => (m === "svg" ? "leaflet" : "svg"))
                  notify(
                    mapMode === "svg"
                      ? "Leaflet OpenStreetMap view"
                      : "SVG blueprint map view",
                  )
                }}
              />
              <MapControl
                icon="layers"
                label="Map layers"
                onClick={() => setLayerOpen((open) => !open)}
              />
              <MapControl
                icon="grid"
                label="Toggle grid"
                onClick={() => toggleLayer("grid")}
              />
            </div>
            <div className="map-tool-controls">
              <MapControl
                icon="locate"
                label="Pan and select"
                active={activeTool === "pan"}
                onClick={() => setActiveTool("pan")}
              />
              <MapControl
                icon="minus"
                label="Measure distance"
                active={activeTool === "measure"}
                onClick={() => setActiveTool("measure")}
              />
              <MapControl
                icon="scan"
                label="Draw polygon"
                active={activeTool === "draw"}
                onClick={() => setActiveTool("draw")}
              />
            </div>
            {workspace === "compare" && (
              <>
                <div
                  className="comparison-divider"
                  style={{ left: `${comparisonPosition}%` }}
                >
                  <i />
                </div>
                <div className="comparison-map-legend">
                  <span>
                    <i /> Baseline
                  </span>
                  <span>
                    <i /> Simulated revision
                  </span>
                  <b>Drag slider in panel</b>
                </div>
              </>
            )}
          </section>

          <aside
            className="details-panel"
            key={`${workspace}-${selectedParcel.id}`}
          >
            {workspace === "analysis" ? (
              <div className="analysis-panel">
                <div className="details-header">
                  <div>
                    <span className="eyebrow">Simulated analysis</span>
                    <h2>Boundary conflict</h2>
                  </div>
                  <span className={`analysis-status ${analysisState}`}>
                    <i />{" "}
                    {analysisState === "running"
                      ? "Tracing"
                      : analysisState === "complete"
                        ? "Complete"
                        : "Ready"}
                  </span>
                </div>
                <div className="analysis-pair-card">
                  <label>
                    <small>Parcel A</small>
                    <select
                      value={analysisIds[0]}
                      onChange={(event) =>
                        selectAnalysisParcel(0, event.target.value)
                      }
                    >
                      {parcelsList.map((parcel) => (
                        <option key={parcel.id} value={parcel.id}>
                          {parcel.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span>×</span>
                  <label>
                    <small>Parcel B</small>
                    <select
                      value={analysisIds[1]}
                      onChange={(event) =>
                        selectAnalysisParcel(1, event.target.value)
                      }
                    >
                      {parcelsList.map((parcel) => (
                        <option key={parcel.id} value={parcel.id}>
                          {parcel.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={`analysis-sequence ${analysisState}`}>
                  <div>
                    <i />
                    <span>Align survey geometry</span>
                    <strong>
                      {analysisState === "idle" ? "Waiting" : "Done"}
                    </strong>
                  </div>
                  <div>
                    <i />
                    <span>Trace shared boundary</span>
                    <strong>
                      {analysisState === "running"
                        ? "Running"
                        : analysisState === "complete"
                          ? "Done"
                          : "Waiting"}
                    </strong>
                  </div>
                  <div>
                    <i />
                    <span>Calculate intersection</span>
                    <strong>
                      {analysisState === "complete" ? "Done" : "Waiting"}
                    </strong>
                  </div>
                </div>
                <div
                  className="analysis-progress"
                  aria-label={`Analysis progress ${analysisProgress}%`}
                >
                  <i style={{ width: `${analysisProgress}%` }} />
                  <span>{analysisProgress}%</span>
                </div>
                {analysisState === "complete" && analysisResult ? (
                  <div
                    className={`analysis-result result-${analysisResult.status}`}
                  >
                    <span>Calculated prototype result</span>
                    <strong>
                      {analysisResult.status === "overlap"
                        ? formatArea(analysisResult.area)
                        : analysisResult.status === "clear"
                          ? "No overlap"
                          : "Invalid geometry"}
                    </strong>
                    <p>{analysisResult.message}</p>
                    <div>
                      <span>Intersection perimeter</span>
                      <b>{formatDistance(analysisResult.perimeter)}</b>
                    </div>
                    <div>
                      <span>Smaller parcel affected</span>
                      <b>{analysisResult.overlap.toFixed(2)}%</b>
                    </div>
                    <small>
                      Calculated from fictional polygon geometry · not a legal
                      or cadastral conclusion
                    </small>
                    <button
                      className="report-download"
                      onClick={() => downloadReport(analysisResult)}
                    >
                      Download prototype report
                    </button>
                  </div>
                ) : (
                  <div className="analysis-empty">
                    <Icon name="scan" size={26} />
                    <strong>
                      {analysisState === "running"
                        ? "Analyzing intersection"
                        : "Ready to compare boundaries"}
                    </strong>
                    <p>
                      {analysisState === "running"
                        ? "Clipping polygon geometry and calculating area and perimeter…"
                        : "Choose two parcels, or select them directly on the map, then run the geometry analysis."}
                    </p>
                  </div>
                )}
                <Button
                  onClick={() => runAnalysis()}
                  className="analysis-button"
                  variant={
                    analysisState === "running" ? "secondary" : "primary"
                  }
                  disabled={analysisState === "running"}
                >
                  {analysisState === "running"
                    ? "Analysis running…"
                    : analysisState === "complete"
                      ? "Run analysis again"
                      : "Run intersection analysis"}
                  <Icon
                    name={analysisState === "complete" ? "scan" : "arrow"}
                    size={15}
                  />
                </Button>
              </div>
            ) : workspace === "compare" ? (
              <div className="comparison-panel">
                <div className="details-header">
                  <div>
                    <span className="eyebrow">Simulated datasets</span>
                    <h2>Boundary comparison</h2>
                  </div>
                  <span className="verified">Before / after</span>
                </div>
                <p className="comparison-copy">
                  Drag the divider to compare the fictional baseline geometry
                  with a simulated revised dataset. Bright red edges indicate
                  changed sample boundaries.
                </p>
                <label className="comparison-slider">
                  <span>
                    <b>Baseline</b>
                    <b>Simulated revision</b>
                  </span>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={comparisonPosition}
                    onChange={(event) =>
                      setComparisonPosition(Number(event.target.value))
                    }
                    aria-label="Boundary comparison position"
                  />
                  <small>{comparisonPosition}% revised dataset visible</small>
                </label>
                <div className="comparison-stats">
                  <span>Selected parcel</span>
                  <strong>{selectedParcel.id}</strong>
                  <div>
                    <span>Baseline area</span>
                    <b>{formatArea(selectedParcel.area)}</b>
                  </div>
                  <div>
                    <span>Revised area</span>
                    <b>{formatArea(revisedSelected.area)}</b>
                  </div>
                  <div>
                    <span>Calculated difference</span>
                    <b>
                      {formatArea(
                        Math.abs(revisedSelected.area - selectedParcel.area),
                      )}
                    </b>
                  </div>
                </div>
                <div className="comparison-key">
                  <span>
                    <i /> Baseline boundary
                  </span>
                  <span>
                    <i /> Changed simulated boundary
                  </span>
                </div>
                <p className="comparison-disclaimer">
                  Comparison uses fictional sample geometry and does not
                  represent an official survey, encroachment finding, or
                  government record.
                </p>
              </div>
            ) : workspace === "ocr" ? (
              <div className="ocr-panel">
                <div className="details-header">
                  <div>
                    <span className="eyebrow">
                      Simulated document extraction
                    </span>
                    <h2>Land Deed OCR</h2>
                  </div>
                  <span className="verified">Prototype only</span>
                </div>
                {ocrState === "empty" && (
                  <label className="ocr-dropzone">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={processDocument}
                    />
                    <Icon name="file" size={28} />
                    <strong>Choose a deed sample</strong>
                    <p>PDF, PNG or JPG · simulated extraction</p>
                    <span>Browse document</span>
                  </label>
                )}
                {ocrState === "processing" && (
                  <div className="ocr-processing" role="status">
                    {ocrFile?.type.startsWith("image/") ? (
                      <div className="document-preview">
                        <img
                          src={ocrFile.url}
                          alt={`Preview of ${ocrFile.name}`}
                        />
                        <i />
                      </div>
                    ) : (
                      <div className="scan-document">
                        <Icon name="file" size={25} />
                        <i />
                      </div>
                    )}
                    <strong>Extracting land references</strong>
                    <p>
                      Simulating parcel IDs, measurements, and survey
                      references…
                    </p>
                    <div className="loading-bar">
                      <i />
                    </div>
                  </div>
                )}
                {ocrState === "complete" && (
                  <div className="ocr-result">
                    <div className="ocr-success">
                      <Icon name="check" size={16} />
                      <span>
                        <strong>Simulated extraction complete</strong>
                        <small>{ocrFile?.name}</small>
                      </span>
                    </div>
                    {ocrFile?.type.startsWith("image/") && (
                      <div className="ocr-preview">
                        <img
                          src={ocrFile.url}
                          alt={`Uploaded document ${ocrFile.name}`}
                        />
                      </div>
                    )}
                    <div className="ocr-fields">
                      <label>
                        Parcel reference
                        <input
                          value={ocrFields.parcelId}
                          onChange={(event) =>
                            setOcrFields((current) => ({
                              ...current,
                              parcelId: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Survey reference
                        <input
                          value={ocrFields.surveyRef}
                          onChange={(event) =>
                            setOcrFields((current) => ({
                              ...current,
                              surveyRef: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Recorded area
                        <input
                          value={ocrFields.area}
                          onChange={(event) =>
                            setOcrFields((current) => ({
                              ...current,
                              area: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Extraction confidence
                        <input
                          value={ocrFields.confidence}
                          onChange={(event) =>
                            setOcrFields((current) => ({
                              ...current,
                              confidence: event.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <p className="ocr-disclaimer">
                      Simulated extraction does not verify ownership,
                      authenticity, legal validity, or government registration.
                      Review all fields manually.
                    </p>
                    <Button variant="secondary" onClick={resetOcr}>
                      Reset workspace
                    </Button>
                  </div>
                )}
              </div>
            ) : workspace === "history" ? (
              <div className="history-panel">
                <div className="details-header">
                  <div>
                    <span className="eyebrow">Session activity</span>
                    <h2>Analysis history</h2>
                  </div>
                  <span className="verified">{history.length} entries</span>
                </div>
                <p className="history-intro">
                  Searches and calculations from this prototype session. Entries
                  use fictional sample geometry.
                </p>
                <div className="history-timeline">
                  {history.length ? (
                    history.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          if (entry.type === "search" && entry.parcelId)
                            chooseParcel(entry.parcelId)
                          if (entry.result) {
                            setAnalysisIds(entry.result.ids)
                            setAnalysisResult(entry.result)
                            setAnalysisState("complete")
                            setWorkspace("analysis")
                          }
                        }}
                      >
                        <i />
                        <span>
                          <small>
                            {entry.type} · {entry.time}
                          </small>
                          <strong>{entry.title}</strong>
                          <em>{entry.detail}</em>
                        </span>
                        <Icon name="chevron" size={14} />
                      </button>
                    ))
                  ) : (
                    <div className="history-empty">
                      <Icon name="file" />
                      <strong>No session activity</strong>
                      <p>Searches and analyses will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="details-header">
                  <div>
                    <span className="eyebrow">Selected parcel</span>
                    <h2>{selectedParcel.id}</h2>
                  </div>
                  <span className="verified">
                    <Icon name="check" size={12} /> {selectedParcel.status}
                  </span>
                </div>
                <div className="details-tabs">
                  <button
                    className={activeTab === "details" ? "active" : ""}
                    onClick={() => setActiveTab("details")}
                  >
                    Details
                  </button>
                  <button
                    className={activeTab === "records" ? "active" : ""}
                    onClick={() => setActiveTab("records")}
                  >
                    Records
                  </button>
                </div>
                {loadingDetails ? (
                  <div
                    className="details-loading"
                    role="status"
                    aria-label="Loading parcel details"
                  >
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                ) : activeTab === "details" ? (
                  <>
                    <dl className="parcel-data">
                      <div>
                        <dt>Calculated area</dt>
                        <dd>{formatArea(selectedParcel.area)}</dd>
                      </div>
                      <div>
                        <dt>Calculated perimeter</dt>
                        <dd>{formatDistance(selectedParcel.perimeter)}</dd>
                      </div>
                      <div>
                        <dt>Land class</dt>
                        <dd>{selectedParcel.landClass}</dd>
                      </div>
                      <div>
                        <dt>Survey year</dt>
                        <dd>2021</dd>
                      </div>
                      <div>
                        <dt>Record ref.</dt>
                        <dd>SD-08-{selectedParcel.id.slice(-2)}21</dd>
                      </div>
                      <div>
                        <dt>Coordinates</dt>
                        <dd>28.6142, 77.2104</dd>
                      </div>
                    </dl>
                    <div
                      className={`conflict-card ${
                        selectedParcel.id !== "GV-054" &&
                        selectedParcel.id !== "GV-055"
                          ? "conflict-clear"
                          : ""
                      }`}
                      onClick={() =>
                        (selectedParcel.id === "GV-054" ||
                          selectedParcel.id === "GV-055") &&
                        runAnalysis(["GV-054", "GV-055"])
                      }
                      onKeyDown={(event) => {
                        if (
                          (event.key === "Enter" || event.key === " ") &&
                          (selectedParcel.id === "GV-054" ||
                            selectedParcel.id === "GV-055")
                        ) {
                          event.preventDefault()
                          runAnalysis(["GV-054", "GV-055"])
                        }
                      }}
                      role={
                        selectedParcel.id === "GV-054" ||
                        selectedParcel.id === "GV-055"
                          ? "button"
                          : undefined
                      }
                      tabIndex={
                        selectedParcel.id === "GV-054" ||
                        selectedParcel.id === "GV-055"
                          ? 0
                          : undefined
                      }
                    >
                      <div className="conflict-icon">
                        <Icon name="alert" size={18} />
                      </div>
                      <div>
                        <span>
                          {selectedParcel.id === "GV-054" ||
                          selectedParcel.id === "GV-055"
                            ? "Potential boundary conflict"
                            : "Boundary check complete"}
                        </span>
                        <strong>
                          {selectedParcel.id === "GV-054" ||
                          selectedParcel.id === "GV-055"
                            ? `${formatArea(sampleConflictArea)} calculated overlap`
                            : "No overlaps detected"}
                        </strong>
                        <p>
                          {selectedParcel.id === "GV-054" ||
                          selectedParcel.id === "GV-055"
                            ? "Select to run simulated boundary analysis."
                            : "Parcel geometry aligns with adjacent survey records."}
                        </p>
                      </div>
                    </div>
                    <div className="boundary-status">
                      <span>Boundary confidence</span>
                      <strong className="animated-value">
                        {selectedParcel.confidence}%
                      </strong>
                      <div>
                        <i style={{ width: `${selectedParcel.confidence}%` }} />
                      </div>
                      <small>Based on survey and record alignment</small>
                    </div>
                    <div className="relationship-explorer">
                      <div>
                        <span>Nearby parcel relationships</span>
                        <small>Calculated by centroid distance</small>
                      </div>
                      <div className="relationship-graph">
                        <strong>{selectedParcel.id}</strong>
                        {relatedParcels.map((parcel, index) => (
                          <button
                            key={parcel.id}
                            className={`node-${index + 1}`}
                            onClick={() => chooseParcel(parcel.id)}
                            onMouseEnter={() => setLinkedId(parcel.id)}
                            onMouseLeave={() => setLinkedId(null)}
                            aria-label={`Select nearby parcel ${parcel.id}`}
                          >
                            {parcel.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="records-list">
                    <div>
                      <Icon name="file" />
                      <span>
                        <strong>Survey record</strong>
                        <small>SD-08-4421 · 2021</small>
                      </span>
                    </div>
                    <div>
                      <Icon name="file" />
                      <span>
                        <strong>Parcel extract</strong>
                        <small>PE-054-08 · 2023</small>
                      </span>
                    </div>
                    <p>Documents shown are fictional samples.</p>
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      </main>
      {commandOpen && (
        <div
          className="command-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setCommandOpen(false)
          }
        >
          <div
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="GeoVault command palette"
          >
            <label>
              <Icon name="search" size={18} />
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => {
                  setCommandQuery(event.target.value)
                  setCommandIndex(0)
                }}
                onKeyDown={handleCommandKey}
                placeholder="Type a command…"
              />
              <kbd>ESC</kbd>
            </label>
            <div className="command-results" role="listbox">
              {filteredCommands.length ? (
                filteredCommands.map((command, index) => (
                  <button
                    key={command.label}
                    className={index === commandIndex ? "active" : ""}
                    onMouseEnter={() => setCommandIndex(index)}
                    onClick={command.action}
                    role="option"
                    aria-selected={index === commandIndex}
                  >
                    <span>
                      <strong>{command.label}</strong>
                      <small>{command.hint}</small>
                    </span>
                    <kbd>↵</kbd>
                  </button>
                ))
              ) : (
                <div className="command-empty">
                  <Icon name="search" />
                  <span>No matching commands</span>
                </div>
              )}
            </div>
            <footer>
              <span>↑↓ Navigate</span>
              <span>↵ Execute</span>
              <span>Esc Close</span>
            </footer>
          </div>
        </div>
      )}
      <Footer compact />
    </div>
  )
}

function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`footer ${compact ? "footer-compact" : ""}`}>
      <div className="container footer-inner">
        <Logo />
        <p>
          This is a prototype using fictional sample data. GeoVault is not an
          official government portal.
        </p>
        <span>© 2025 GeoVault</span>
      </div>
    </footer>
  )
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const handleNavigation = () => setPath(window.location.pathname)
    window.addEventListener("popstate", handleNavigation)
    return () => window.removeEventListener("popstate", handleNavigation)
  }, [])

  return path === "/dashboard" ? <Dashboard /> : <LandingPage />
}
