"""Health check endpoints for GeoVault backend."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(tags=["Health"])


class HealthCheckResponse(BaseModel):
    """Schema for health-check response."""
    status: str = Field(
        default="healthy",
        description="Operational status of the service",
        examples=["healthy"]
    )
    service: str = Field(
        default="geovault-backend",
        description="Service identifier",
        examples=["geovault-backend"]
    )
    version: str = Field(
        default="0.1.0",
        description="Application semantic version",
        examples=["0.1.0"]
    )


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="Service Health Check",
    description="Returns operational status of the GeoVault backend service."
)
async def get_health() -> HealthCheckResponse:
    """Check backend operational health."""
    return HealthCheckResponse(
        status="healthy",
        service="geovault-backend",
        version="0.1.0"
    )
