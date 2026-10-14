# GeoVault Backend — FastAPI Service

Initial Python backend service for **GeoVault — Bhu-Explorer**, implemented as part of the **Week 1: backend setup and local server milestone**.

---

## Overview

The GeoVault backend provides REST API services supporting cadastral parcel exploration, spatial boundary conflict detection, and document-assisted parcel workflows.

In this initial Week 1 milestone:
- Lightweight **FastAPI** service running on Python 3.11+.
- Strict **CORS middleware** enabling communication with the local Vite frontend.
- Operational health check (`GET /health`) and service metadata (`GET /`).
- Interactive Swagger API documentation automatically generated at `GET /docs`.
- **Zero database or heavy spatial dependencies**: No database or spatial connection is established yet (PostgreSQL, PostGIS, Shapely, and OCR remain planned for future milestones).

---

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py           # Package marker and version
│   ├── main.py               # FastAPI app initialization, CORS, and root endpoint
│   └── api/
│       ├── __init__.py       # API subpackage
│       └── routes/
│           ├── __init__.py   # Routes subpackage
│           └── health.py     # Health-check endpoints and Pydantic schemas
├── .env.example              # Sample environment variables
├── .gitignore                # Python and virtual environment exclusions
├── README.md                 # Backend documentation
└── requirements.txt          # Python dependencies
```

---

## Local Development Setup

### 1. Prerequisites
- **Python 3.11+** installed and available on your system `PATH`.
  - Check with: `python --version`

### 2. Create and Activate Virtual Environment (Windows PowerShell)

From the project root (`d:\GeoVault`):

```powershell
# Navigate to the backend directory
cd backend

# Create a virtual environment named .venv
python -m venv .venv

# Activate the virtual environment in PowerShell
.\.venv\Scripts\Activate.ps1
```

> **Note for PowerShell execution policy:** If script execution is restricted on your machine, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 3. Install Dependencies

With the virtual environment activated:

```powershell
pip install -r requirements.txt
```

### 4. Configure Environment (Optional)

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

### 5. Start the Development Server

Run the server with Uvicorn with auto-reload:

```powershell
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The server will start at:
- **Service Root:** `http://127.0.0.1:8000/`
- **Health Check:** `http://127.0.0.1:8000/health`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`
- **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`

---

## Available Endpoints

| Method | Endpoint | Description | Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Service name, version, and documentation links | Implemented |
| `GET` | `/health` | Service operational health check | Implemented |
| `GET` | `/api/v1/health` | Service operational health check under API prefix | Implemented |
| `GET` | `/api/v1/parcels` | Returns all 12 Sector 08 cadastral parcels with coordinates | Implemented |
| `GET` | `/api/v1/parcels/{parcel_id}` | Returns single parcel by ID (case-insensitive) or 404 | Implemented |
| `GET` | `/docs` | Interactive Swagger UI documentation | Implemented |
| `GET` | `/redoc` | Interactive ReDoc documentation | Implemented |

### Sample Parcel Response (`GET /api/v1/parcels/GV-054`)

```json
{
  "id": "GV-054",
  "points": [
    { "x": 413, "y": 180 },
    { "x": 568, "y": 210 },
    { "x": 563, "y": 325 },
    { "x": 443, "y": 302 }
  ],
  "x": 490,
  "y": 249,
  "area": 4410.5,
  "perimeter": 272.8,
  "status": "Surveyed",
  "landClass": "Agricultural",
  "confidence": 98.0
}
```

### 404 Error Response (`GET /api/v1/parcels/GV-999`)

```json
{
  "detail": "Parcel 'GV-999' not found in cadastral records."
}
```

---

## Testing & Verification

Run the automated test suite using the Python standard library `unittest` runner:

```powershell
# From the backend directory with .venv activated:
python -m unittest tests/test_api.py
```

This tests:
1. `GET /health` operational health
2. `GET /api/v1/health` prefixed health endpoint
3. `GET /api/v1/parcels` 12 parcels dataset with coordinates and attributes
4. `GET /api/v1/parcels/GV-054` exact parcel retrieval
5. `GET /api/v1/parcels/gv-054` case-insensitive ID retrieval
6. `GET /api/v1/parcels/GV-NONEXISTENT` 404 error response structure

---

## CORS Configuration

By default, the backend allows requests from local Vite frontend origins:
- `http://localhost:8443` (GeoVault's default dev port in `vite.config.ts`)
- `http://127.0.0.1:8443`
- `http://localhost:5173` (Standard Vite dev port)
- `http://127.0.0.1:5173`

You can override allowed origins using the `CORS_ORIGINS` environment variable in `.env`.

---

## Current Architecture vs. Planned Features

| Layer | Current Implementation | Planned (Future Milestones) |
| :--- | :--- | :--- |
| **Data Storage** | Validated in-memory sample dataset (`app/data/sample_parcels.py`) | PostgreSQL + PostGIS with SQLAlchemy & Alembic |
| **Spatial Engine** | Shoelace polygon area & Euclidean perimeter calculations | GEOS / Shapely geometry intersection & validation |
| **OCR Processing** | Simulated deed text extraction workspace | Tesseract / PaddleOCR backend pipeline |
| **Parcels API** | Typed Pydantic schemas with CORS and 404 responses | Spatially indexed GeoJSON API endpoints |
