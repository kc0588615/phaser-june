# Cesium TiTiler Backend Integration Guide

## Overview
This document outlines the backend changes needed in the cesium_titiler project to support the new Next.js/PostgreSQL architecture for the Phaser game platform.

## Current Architecture (FastAPI + Local PostgreSQL)
- FastAPI server running locally
- Direct PostgreSQL connections
- Local file storage for tiles
- No authentication layer

## Target Architecture (Cloud-Ready PostgreSQL)
- PostgreSQL database accessible over network
- Connection pooling for scalability
- Cloud storage integration (S3/GCS)
- JWT authentication integration
- RESTful API design

## Required Changes

### 1. Database Connection Updates

#### 1.1 Connection Configuration
Replace local connection string with environment-based configuration:

```python
# config.py
from pydantic import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 40
    
    # Cloud Storage
    storage_backend: str = "s3"  # s3, gcs, or local
    storage_bucket: str
    storage_prefix: str = "tiles/"
    
    # Authentication
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### 1.2 Database Models
Align with Next.js schema structure:

```python
# models.py
from sqlalchemy import Column, Integer, String, ARRAY, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Habitat(Base):
    __tablename__ = "habitats"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    iucn_code = Column(String(50), unique=True)
    description = Column(String)
    ecosystem_type = Column(String(100))
    color_hex = Column(String(7))
    geometry = Column(JSON)  # GeoJSON geometry
    tile_url = Column(String)  # TiTiler endpoint
    created_at = Column(DateTime)

class Species(Base):
    __tablename__ = "species"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    scientific_name = Column(String(255))
    habitat_types = Column(ARRAY(String))
    occurrence_data = Column(JSON)  # GeoJSON FeatureCollection
    created_at = Column(DateTime)
```

### 2. API Endpoints Modification

#### 2.1 Habitat Tiles Endpoint
```python
# routers/habitats.py
from fastapi import APIRouter, Depends, HTTPException
from titiler.core.factory import TilerFactory
from typing import Optional

router = APIRouter()

@router.get("/habitats/{habitat_id}/tiles/{z}/{x}/{y}")
async def get_habitat_tile(
    habitat_id: int,
    z: int, x: int, y: int,
    user = Depends(get_current_user)  # JWT auth
):
    # Fetch habitat from PostgreSQL
    habitat = await get_habitat(habitat_id)
    if not habitat:
        raise HTTPException(404, "Habitat not found")
    
    # Generate or fetch tile from cloud storage
    tile_url = generate_tile_url(habitat, z, x, y)
    return tile_url
```

#### 2.2 Species Occurrence Endpoint
```python
@router.get("/species/{species_id}/occurrences")
async def get_species_occurrences(
    species_id: int,
    bbox: Optional[str] = None,
    user = Depends(get_current_user)
):
    # Fetch species occurrence data
    species = await get_species(species_id)
    if not species:
        raise HTTPException(404, "Species not found")
    
    # Filter by bounding box if provided
    if bbox:
        occurrences = filter_by_bbox(species.occurrence_data, bbox)
    else:
        occurrences = species.occurrence_data
    
    return {
        "type": "FeatureCollection",
        "features": occurrences
    }
```

### 3. Authentication Integration

#### 3.1 JWT Validation
```python
# auth.py
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret, 
            algorithms=[settings.jwt_algorithm]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(401, "Invalid token")
        return {"user_id": user_id}
    except JWTError:
        raise HTTPException(401, "Invalid token")
```

### 4. Cloud Storage Integration

#### 4.1 S3 Storage Backend
```python
# storage/s3.py
import boto3
from typing import Optional

class S3Storage:
    def __init__(self, bucket: str, prefix: str):
        self.s3 = boto3.client('s3')
        self.bucket = bucket
        self.prefix = prefix
    
    async def get_tile(self, path: str) -> Optional[bytes]:
        try:
            response = self.s3.get_object(
                Bucket=self.bucket,
                Key=f"{self.prefix}{path}"
            )
            return response['Body'].read()
        except:
            return None
    
    async def put_tile(self, path: str, data: bytes):
        self.s3.put_object(
            Bucket=self.bucket,
            Key=f"{self.prefix}{path}",
            Body=data,
            ContentType='image/png'
        )
```

### 5. CORS Configuration

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 6. Database Migration Scripts

```sql
-- Add spatial columns to existing tables
ALTER TABLE habitats ADD COLUMN geometry JSONB;
ALTER TABLE habitats ADD COLUMN tile_url VARCHAR(500);

ALTER TABLE species ADD COLUMN occurrence_data JSONB;

-- Create indexes for performance
CREATE INDEX idx_habitats_iucn_code ON habitats(iucn_code);
CREATE INDEX idx_species_name ON species(name);
CREATE INDEX idx_habitats_geometry ON habitats USING GIN(geometry);
```

### 7. Environment Variables

```env
# .env.production
DATABASE_URL=postgresql://user:pass@cloud-host:5432/game_db
STORAGE_BACKEND=s3
STORAGE_BUCKET=game-tiles-bucket
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=yyy
JWT_SECRET=your-secret-key
CORS_ORIGINS=["https://yourgame.com", "https://www.yourgame.com"]
```

### 8. Deployment Considerations

#### 8.1 Docker Configuration
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 8.2 Health Check Endpoint
```python
@app.get("/health")
async def health_check():
    # Check database connection
    db_healthy = await check_database_connection()
    
    # Check storage backend
    storage_healthy = await check_storage_connection()
    
    return {
        "status": "healthy" if db_healthy and storage_healthy else "unhealthy",
        "database": db_healthy,
        "storage": storage_healthy,
        "timestamp": datetime.utcnow()
    }
```

### 9. Data Synchronization

#### 9.1 Batch Import Script
```python
# scripts/import_habitats.py
async def import_habitats_from_csv(csv_path: str):
    """Import habitat data from CSV to PostgreSQL"""
    with open(csv_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            habitat = Habitat(
                name=row['name'],
                iucn_code=row['iucn_code'],
                ecosystem_type=row['ecosystem_type'],
                geometry=parse_geometry(row['geometry'])
            )
            session.add(habitat)
    
    await session.commit()
```

### 10. Performance Optimizations

#### 10.1 Connection Pooling
```python
# database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,
    pool_recycle=3600
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)
```

#### 10.2 Caching Strategy
```python
# cache.py
from redis import asyncio as aioredis
import json

class TileCache:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)
    
    async def get_tile(self, key: str) -> Optional[bytes]:
        return await self.redis.get(f"tile:{key}")
    
    async def set_tile(self, key: str, data: bytes, ttl: int = 3600):
        await self.redis.set(f"tile:{key}", data, ex=ttl)
```

## Migration Steps

1. **Set up cloud PostgreSQL instance**
   - Provision database
   - Configure network access
   - Run migration scripts

2. **Configure cloud storage**
   - Create S3/GCS bucket
   - Set up IAM permissions
   - Configure CORS policies

3. **Update FastAPI application**
   - Implement new models
   - Add authentication
   - Update endpoints

4. **Deploy to cloud platform**
   - Containerize application
   - Set up CI/CD pipeline
   - Configure auto-scaling

5. **Data migration**
   - Export existing data
   - Transform to new schema
   - Import to cloud database

## Testing Checklist

- [ ] Database connections work with connection pooling
- [ ] Authentication tokens are validated correctly
- [ ] Tile generation works with cloud storage
- [ ] CORS headers allow Next.js frontend
- [ ] Performance meets requirements under load
- [ ] Health checks report accurate status
- [ ] Data synchronization scripts work correctly

## Monitoring and Logging

### Recommended Services
- **APM**: New Relic or DataDog
- **Logging**: CloudWatch or Stackdriver
- **Uptime**: Pingdom or UptimeRobot
- **Error Tracking**: Sentry

### Key Metrics to Monitor
- API response times
- Database query performance
- Tile generation latency
- Storage bandwidth usage
- Authentication failures
- Error rates by endpoint