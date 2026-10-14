"""Sample cadastral parcel dataset for GeoVault — Bhu-Explorer.

Fictional parcel dataset situated conceptually in Sector 08.
Reuses the exact coordinate vertices and status classifications from the frontend.
"""

import math
from typing import Dict, List

MAP_METERS_PER_UNIT = 0.5


def calculate_polygon_area(points: List[Dict[str, float]]) -> float:
    """Calculate polygon area in square meters using the Shoelace formula."""
    if len(points) < 3:
        return 0.0
    signed_area = 0.0
    n = len(points)
    for i in range(n):
        curr = points[i]
        nxt = points[(i + 1) % n]
        signed_area += curr["x"] * nxt["y"] - nxt["x"] * curr["y"]
    return abs(signed_area / 2.0) * (MAP_METERS_PER_UNIT ** 2)


def calculate_polygon_perimeter(points: List[Dict[str, float]]) -> float:
    """Calculate polygon perimeter in meters using Euclidean segment distance sum."""
    if len(points) < 2:
        return 0.0
    perimeter = 0.0
    n = len(points)
    for i in range(n):
        curr = points[i]
        nxt = points[(i + 1) % n]
        perimeter += math.hypot(nxt["x"] - curr["x"], nxt["y"] - curr["y"])
    return perimeter * MAP_METERS_PER_UNIT


def _build_parcel(
    parcel_id: str,
    points: List[Dict[str, float]],
    x: float,
    y: float,
    status: str,
    land_class: str,
    confidence: int,
) -> Dict:
    return {
        "id": parcel_id,
        "points": points,
        "x": x,
        "y": y,
        "area": round(calculate_polygon_area(points), 2),
        "perimeter": round(calculate_polygon_perimeter(points), 2),
        "status": status,
        "landClass": land_class,
        "confidence": confidence,
    }


SAMPLE_PARCELS: List[Dict] = [
    _build_parcel(
        "GV-041",
        [{"x": 71, "y": 62}, {"x": 246, "y": 37}, {"x": 270, "y": 174}, {"x": 90, "y": 194}],
        143, 121, "Surveyed", "Agricultural", 96
    ),
    _build_parcel(
        "GV-042",
        [{"x": 246, "y": 37}, {"x": 426, "y": 59}, {"x": 413, "y": 180}, {"x": 270, "y": 174}],
        327, 111, "Surveyed", "Agricultural", 94
    ),
    _build_parcel(
        "GV-043",
        [{"x": 426, "y": 59}, {"x": 607, "y": 77}, {"x": 581, "y": 206}, {"x": 413, "y": 180}],
        490, 132, "Verified", "Mixed use", 98
    ),
    _build_parcel(
        "GV-044",
        [{"x": 607, "y": 77}, {"x": 817, "y": 70}, {"x": 838, "y": 207}, {"x": 581, "y": 206}],
        684, 137, "Review", "Agricultural", 86
    ),
    _build_parcel(
        "GV-052",
        [{"x": 90, "y": 194}, {"x": 270, "y": 174}, {"x": 285, "y": 316}, {"x": 81, "y": 319}],
        159, 260, "Surveyed", "Agricultural", 95
    ),
    _build_parcel(
        "GV-053",
        [{"x": 270, "y": 174}, {"x": 413, "y": 180}, {"x": 443, "y": 302}, {"x": 285, "y": 316}],
        334, 249, "Verified", "Mixed use", 97
    ),
    _build_parcel(
        "GV-054",
        [{"x": 413, "y": 180}, {"x": 581, "y": 206}, {"x": 575, "y": 332}, {"x": 443, "y": 302}],
        474, 257, "Surveyed", "Agricultural", 92
    ),
    _build_parcel(
        "GV-055",
        [{"x": 550, "y": 202}, {"x": 838, "y": 207}, {"x": 825, "y": 340}, {"x": 547, "y": 325}],
        682, 271, "Conflict review", "Agricultural", 81
    ),
    _build_parcel(
        "GV-061",
        [{"x": 81, "y": 319}, {"x": 285, "y": 316}, {"x": 315, "y": 468}, {"x": 82, "y": 486}],
        163, 405, "Surveyed", "Agricultural", 93
    ),
    _build_parcel(
        "GV-062",
        [{"x": 285, "y": 316}, {"x": 443, "y": 302}, {"x": 460, "y": 472}, {"x": 315, "y": 468}],
        350, 398, "Verified", "Mixed use", 96
    ),
    _build_parcel(
        "GV-063",
        [{"x": 443, "y": 302}, {"x": 575, "y": 332}, {"x": 605, "y": 477}, {"x": 460, "y": 472}],
        493, 407, "Review", "Agricultural", 88
    ),
    _build_parcel(
        "GV-064",
        [{"x": 575, "y": 332}, {"x": 825, "y": 340}, {"x": 789, "y": 475}, {"x": 605, "y": 477}],
        677, 409, "Surveyed", "Agricultural", 95
    ),
]
