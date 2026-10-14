"""GeoVault — Bhu-Explorer FastAPI Application Entry Point.

Week 1 milestone: Initial backend setup, CORS configuration, and health endpoints.
"""

import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.api.routes.health import router as health_router
from app.api.routes.parcels import router as parcels_router

# Load optional .env file
load_dotenv()

# Determine allowed CORS origins
# Defaults cover both standard Vite (5173) and GeoVault's Vite config (8443)
default_origins = [
    "http://localhost:8443",
    "http://127.0.0.1:8443",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

env_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins: List[str] = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = default_origins

# Initialize FastAPI application
app = FastAPI(
    title="GeoVault - Bhu-Explorer API",
    description=(
        "FastAPI backend for GeoVault - Bhu-Explorer. "
        "Provides REST services for cadastral land parcel exploration, "
        "spatial boundary analysis, and land-record workflows."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class RootResponse(BaseModel):
    """Schema for root API response."""
    service: str = Field(
        default="GeoVault - Bhu-Explorer API",
        description="Name of the backend service"
    )
    status: str = Field(
        default="online",
        description="Current server state"
    )
    version: str = Field(
        default="0.1.0",
        description="Service version"
    )
    documentation: str = Field(
        default="/docs",
        description="Swagger UI documentation endpoint"
    )
    health: str = Field(
        default="/health",
        description="Health check endpoint"
    )


@app.get(
    "/",
    response_model=RootResponse,
    summary="Root Service Info",
    description="Returns basic service metadata and documentation links."
)
async def root() -> RootResponse:
    """Root entry point for the GeoVault backend."""
    return RootResponse(
        service="GeoVault - Bhu-Explorer API",
        status="online",
        version="0.1.0",
        documentation="/docs",
        health="/health"
    )


# Register API routers
app.include_router(health_router)
app.include_router(health_router, prefix="/api/v1")
app.include_router(parcels_router, prefix="/api/v1")
