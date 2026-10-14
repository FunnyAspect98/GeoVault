"""Cadastral parcels API routes."""

from typing import List
from fastapi import APIRouter, HTTPException, Path, status

from app.data.sample_parcels import SAMPLE_PARCELS
from app.schemas.parcel import ParcelNotFoundError, ParcelSchema

router = APIRouter(prefix="/parcels", tags=["Parcels"])


@router.get(
    "",
    response_model=List[ParcelSchema],
    summary="List Cadastral Parcels",
    description="Retrieve all available cadastral parcels in the sample dataset.",
)
async def list_parcels() -> List[ParcelSchema]:
    """Return all cadastral parcels."""
    return [ParcelSchema(**parcel) for parcel in SAMPLE_PARCELS]


@router.get(
    "/{parcel_id}",
    response_model=ParcelSchema,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "model": ParcelNotFoundError,
            "description": "Parcel not found",
        }
    },
    summary="Get Parcel by ID",
    description="Retrieve a single cadastral parcel by its unique identifier (e.g. GV-054).",
)
async def get_parcel(
    parcel_id: str = Path(
        ...,
        description="Unique cadastral parcel identifier (e.g. GV-054)",
        examples=["GV-054"],
    )
) -> ParcelSchema:
    """Return a single parcel by ID, case-insensitively."""
    lookup_id = parcel_id.strip().upper()
    for parcel in SAMPLE_PARCELS:
        if parcel["id"].upper() == lookup_id:
            return ParcelSchema(**parcel)

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Parcel with ID '{parcel_id}' was not found in Sector 08.",
    )
