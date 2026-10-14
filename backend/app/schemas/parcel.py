"""Pydantic schemas for cadastral parcels."""

from typing import List
from pydantic import BaseModel, ConfigDict, Field


class PointSchema(BaseModel):
    """2D coordinate vertex on the cadastral canvas."""
    x: float = Field(..., description="X coordinate in canvas units")
    y: float = Field(..., description="Y coordinate in canvas units")


class LatLngSchema(BaseModel):
    """Geographic WGS 84 coordinate vertex for real map rendering."""
    lat: float = Field(..., description="Latitude coordinate (WGS 84)")
    lng: float = Field(..., description="Longitude coordinate (WGS 84)")


class ParcelSchema(BaseModel):
    """Cadastral parcel schema representing boundary geometry and metadata."""
    id: str = Field(..., description="Unique parcel identifier (e.g. GV-054)")
    points: List[PointSchema] = Field(..., description="Ordered list of canvas boundary vertices")
    geoPoints: List[LatLngSchema] = Field(
        default_factory=list,
        description="Plausible geographic boundary coordinates around Mumbai"
    )
    centerLat: float = Field(default=19.0645, description="Geographic centroid latitude")
    centerLng: float = Field(default=72.8680, description="Geographic centroid longitude")
    x: float = Field(..., description="Centroid or label anchor X coordinate")
    y: float = Field(..., description="Centroid or label anchor Y coordinate")
    area: float = Field(..., description="Calculated surface area in square meters")
    perimeter: float = Field(..., description="Calculated perimeter length in meters")
    status: str = Field(..., description="Survey or legal verification status (e.g. Surveyed, Verified)")
    landClass: str = Field(
        ...,
        alias="landClass",
        description="Land use classification (e.g. Agricultural, Mixed use)"
    )
    confidence: int = Field(..., description="Boundary confidence rating percentage (0-100)")

    model_config = ConfigDict(populate_by_name=True)


class ParcelNotFoundError(BaseModel):
    """Error schema returned when a parcel is not found."""
    detail: str = Field(..., description="Error message explaining why the parcel was not found")
