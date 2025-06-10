# Cloud-Based TiTiler Implementation Proposal

## Overview

This document proposes a cloud architecture to replace the current local TiTiler FastAPI setup with:
- **Azure Blob Storage** for hosting GeoTIFF files
- **Oracle Cloud Instance** running Linux for hosting the TiTiler API
- **PostgreSQL** database (either managed service or self-hosted) for habitat/species data

## Current Architecture Analysis

### Local Setup Components
1. **TiTiler FastAPI Service** (port 8000)
   - Serves COG tiles from local filesystem
   - Custom colormap for habitat visualization
   - Game API endpoint for location queries
   
2. **PostgreSQL Database**
   - Stores habitat raster data (`habitat_raster_full_in_db`)
   - Stores species polygon data (`iucn_gymnophiona_ranges`)
   - Uses PostGIS for spatial queries

3. **CesiumJS Frontend** (port 9000)
   - Requests tiles from TiTiler
   - Queries location data via game API
   - Visualizes habitat and species information

## Proposed Cloud Architecture

### 1. Azure Blob Storage Configuration

#### Storage Account Setup
```bash
# Azure CLI commands
az storage account create \
  --name phasertitiler \
  --resource-group phaser-game-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --allow-blob-public-access true

# Create container for GeoTIFF files
az storage container create \
  --name geotiff \
  --account-name phasertitiler \
  --public-access blob
```

#### File Organization
```
phasertitiler/
└── geotiff/
    ├── habitat/
    │   ├── habitat_cog.tif
    │   ├── habitat_webmerc.tif
    │   └── metadata.json
    └── species/
        ├── gymnophiona/
        │   └── ranges.tif
        └── other_species/
```

#### CORS Configuration
```json
{
  "CorsRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
      "AllowedHeaders": ["*"],
      "ExposedHeaders": ["Content-Range", "Accept-Ranges", "Content-Encoding", "Content-Length"],
      "MaxAgeInSeconds": 3600
    }
  ]
}
```

### 2. Oracle Cloud Instance Setup

#### Instance Specifications
- **Shape**: VM.Standard.E4.Flex (4 OCPUs, 32GB RAM)
- **OS**: Oracle Linux 8 or Ubuntu 22.04 LTS
- **Storage**: 100GB Boot Volume + 200GB Block Volume for cache
- **Network**: Public subnet with security rules

#### Security List Rules
```
Ingress Rules:
- Port 22 (SSH): Your IP only
- Port 80 (HTTP): 0.0.0.0/0
- Port 443 (HTTPS): 0.0.0.0/0
- Port 5432 (PostgreSQL): Private subnet only

Egress Rules:
- All traffic: 0.0.0.0/0
```

### 3. TiTiler API Deployment

#### Installation Script
```bash
#!/bin/bash
# setup_titiler.sh

# Update system
sudo dnf update -y

# Install Python 3.11
sudo dnf install -y python3.11 python3.11-devel python3.11-pip

# Install system dependencies
sudo dnf install -y \
  gdal gdal-devel \
  proj proj-devel \
  geos geos-devel \
  postgresql-devel \
  nginx \
  git

# Create application user
sudo useradd -m -s /bin/bash titiler

# Setup application directory
sudo mkdir -p /opt/titiler
sudo chown titiler:titiler /opt/titiler

# Switch to titiler user
sudo -u titiler bash << 'EOF'
cd /opt/titiler

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install TiTiler and dependencies
pip install --upgrade pip
pip install titiler.core titiler.extensions
pip install psycopg2-binary
pip install fastapi uvicorn[standard]
pip install python-multipart
EOF
```

#### Application Code Structure
```
/opt/titiler/
├── venv/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── dependencies.py
│   ├── colormaps.py
│   └── config.py
├── data/
│   └── habitat_colormap.json
├── logs/
└── cache/
```

#### Updated main.py for Azure Blob Storage
```python
# app/main.py
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from starlette.middleware.cors import CORSMiddleware
from titiler.core.factory import TilerFactory
from titiler.core.errors import DEFAULT_STATUS_CODES, add_exception_handlers
import psycopg2
from .dependencies import ColorMapParams
from .config import settings

app = FastAPI(title="TiTiler Cloud API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# TiTiler Factory with Azure Blob support
cog = TilerFactory(
    colormap_dependency=ColorMapParams,
    router_prefix="/cog",
    # Enable support for Azure Blob URLs
    reader_dependency=lambda: {"GDAL_DISABLE_READDIR_ON_OPEN": "EMPTY_DIR"}
)
app.include_router(cog.router, tags=["Cloud Optimized GeoTIFF"], prefix="/cog")

# Database connection pool
class DatabasePool:
    def __init__(self):
        self.connection_string = (
            f"dbname='{settings.DB_NAME}' "
            f"user='{settings.DB_USER}' "
            f"host='{settings.DB_HOST}' "
            f"port='{settings.DB_PORT}' "
            f"password='{settings.DB_PASSWORD}'"
        )
    
    def get_connection(self):
        return psycopg2.connect(self.connection_string)

db_pool = DatabasePool()

@app.get("/api/location_info/")
async def query_location_info(
    lon: float = Query(..., description="Longitude (EPSG:4326)"),
    lat: float = Query(..., description="Latitude (EPSG:4326)"),
):
    """Query habitat and species info for a location."""
    # ... (same implementation as current, using db_pool)
    
@app.get("/")
def read_root():
    return {"message": "TiTiler Cloud API is running!"}
```

#### Configuration Management
```python
# app/config.py
from pydantic import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Azure Blob Storage
    AZURE_STORAGE_ACCOUNT: str = "phasertitiler"
    AZURE_STORAGE_CONTAINER: str = "geotiff"
    
    # Database
    DB_HOST: str
    DB_PORT: str = "5432"
    DB_NAME: str = "phaser"
    DB_USER: str = "postgres"
    DB_PASSWORD: str
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:8080",
        "https://yourgame.domain.com"
    ]
    
    # GDAL/PROJ
    PROJ_LIB: str = "/usr/share/proj"
    GDAL_CACHEMAX: str = "512"  # MB
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### Systemd Service
```ini
# /etc/systemd/system/titiler.service
[Unit]
Description=TiTiler Cloud API
After=network.target

[Service]
Type=notify
User=titiler
Group=titiler
WorkingDirectory=/opt/titiler
Environment="PATH=/opt/titiler/venv/bin"
Environment="PROJ_LIB=/usr/share/proj"
ExecStart=/opt/titiler/venv/bin/uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    --access-log
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Nginx Configuration
```nginx
# /etc/nginx/conf.d/titiler.conf
upstream titiler_backend {
    server 127.0.0.1:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-oracle-instance.domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-oracle-instance.domain.com;
    
    ssl_certificate /etc/ssl/certs/titiler.crt;
    ssl_certificate_key /etc/ssl/private/titiler.key;
    
    # Proxy settings
    location / {
        proxy_pass http://titiler_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for large tiles
        proxy_connect_timeout 30s;
        proxy_send_timeout 90s;
        proxy_read_timeout 90s;
        
        # Caching headers
        add_header Cache-Control "public, max-age=3600";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://titiler_backend/;
    }
}
```

### 4. Database Options

#### Option A: Oracle Autonomous Database
```python
# Connection string for Oracle ATP
import oracledb

connection = oracledb.connect(
    user="PHASER_USER",
    password=settings.DB_PASSWORD,
    dsn="phaser_high",
    config_dir="/opt/oracle/wallet"
)
```

#### Option B: PostgreSQL on Compute Instance
```bash
# Install PostgreSQL with PostGIS
sudo dnf install -y postgresql14-server postgresql14-contrib postgis33_14

# Initialize and configure
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and extensions
sudo -u postgres psql << EOF
CREATE DATABASE phaser;
\c phaser
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_raster;
EOF
```

#### Option C: Managed PostgreSQL Service
- Use Oracle Database Cloud Service
- Or Azure Database for PostgreSQL with PostGIS

### 5. Migration Process

#### Step 1: Prepare GeoTIFF Files
```bash
# Optimize existing TIFFs for cloud storage
gdal_translate -of COG \
  -co COMPRESS=DEFLATE \
  -co TILING_SCHEME=GoogleMapsCompatible \
  habitat_webmerc.tif \
  habitat_cog_optimized.tif

# Upload to Azure Blob Storage
az storage blob upload \
  --account-name phasertitiler \
  --container-name geotiff \
  --name habitat/habitat_cog.tif \
  --file habitat_cog_optimized.tif
```

#### Step 2: Database Migration
```bash
# Export existing data
pg_dump -h localhost -U postgres -d phaser \
  -t habitat_raster_full_in_db \
  -t iucn_gymnophiona_ranges \
  > phaser_spatial_data.sql

# Import to cloud database
psql -h your-cloud-db.host -U postgres -d phaser < phaser_spatial_data.sql
```

#### Step 3: Update Frontend
```javascript
// Update CesiumMap.tsx configuration
const TITILER_BASE_URL = "https://your-oracle-instance.domain.com";
const AZURE_BLOB_BASE = "https://phasertitiler.blob.core.windows.net/geotiff";

// Update tile URL construction
const cogUrl = `${AZURE_BLOB_BASE}/habitat/habitat_cog.tif`;
const tileJsonUrl = `${TITILER_BASE_URL}/cog/WebMercatorQuad/tilejson.json?url=${encodeURIComponent(cogUrl)}&colormap_name=habitat_custom`;
```

### 6. Performance Optimization

#### Caching Strategy
1. **Nginx Cache**
```nginx
# Cache tile responses
proxy_cache_path /var/cache/nginx/tiles levels=1:2 keys_zone=tiles:100m max_size=10g inactive=7d;

location ~ ^/cog/.*/tiles/ {
    proxy_cache tiles;
    proxy_cache_valid 200 7d;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;
}
```

2. **Redis Cache for Database Queries**
```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def cached_location_query(lon: float, lat: float):
    cache_key = f"location:{lon:.4f}:{lat:.4f}"
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Perform database query
    result = query_database(lon, lat)
    
    # Cache for 1 hour
    redis_client.setex(cache_key, 3600, json.dumps(result))
    return result
```

### 7. Monitoring and Logging

#### Application Monitoring
```python
# Add Prometheus metrics
from prometheus_client import Counter, Histogram, generate_latest
import time

request_count = Counter('titiler_requests_total', 'Total requests')
request_duration = Histogram('titiler_request_duration_seconds', 'Request duration')

@app.middleware("http")
async def monitor_requests(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    request_duration.observe(time.time() - start_time)
    request_count.inc()
    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

#### Log Aggregation
```bash
# Install Fluent Bit for log shipping
curl https://raw.githubusercontent.com/fluent/fluent-bit/master/install.sh | sh

# Configure for Oracle Cloud Logging
cat > /etc/fluent-bit/fluent-bit.conf << EOF
[SERVICE]
    Flush        5
    Daemon       Off
    Log_Level    info

[INPUT]
    Name              tail
    Path              /opt/titiler/logs/*.log
    Parser            json
    Tag               titiler.*

[OUTPUT]
    Name  oci_logging
    Match *
    namespace ocid1.tenancy.oc1..xxxxx
    config_file_location /etc/fluent-bit/oci_config
EOF
```

### 8. Cost Estimation

#### Azure Blob Storage
- Storage: ~$0.0184/GB/month for Hot tier
- Transactions: ~$0.0004 per 10,000 read operations
- Bandwidth: ~$0.087/GB for egress

#### Oracle Cloud Instance
- VM.Standard.E4.Flex (4 OCPU, 32GB): ~$140/month
- Block Storage (200GB): ~$10/month
- Load Balancer: ~$10/month

#### Estimated Monthly Cost
- Storage: $5-10
- Compute: $150-160
- Database: $50-200 (depending on option)
- **Total: $205-370/month**

### 9. Security Considerations

1. **SSL/TLS Certificates**
   - Use Let's Encrypt for free certificates
   - Auto-renewal via certbot

2. **API Authentication**
   - Add API key authentication for write operations
   - Rate limiting per IP/key

3. **Database Security**
   - Use connection pooling with SSL
   - Rotate credentials regularly
   - Backup encryption

4. **Network Security**
   - Oracle Cloud WAF for DDoS protection
   - IP allowlisting for admin endpoints
   - VPN for database access

### 10. Deployment Checklist

- [ ] Create Azure Storage Account and upload GeoTIFFs
- [ ] Provision Oracle Cloud Instance
- [ ] Install and configure TiTiler application
- [ ] Setup PostgreSQL/PostGIS database
- [ ] Configure Nginx reverse proxy
- [ ] Setup SSL certificates
- [ ] Configure monitoring and logging
- [ ] Test tile serving performance
- [ ] Update frontend configuration
- [ ] Setup backup strategy
- [ ] Document API endpoints
- [ ] Create runbooks for common operations

## Conclusion

This cloud architecture provides:
- **Scalability**: Easy to scale compute resources
- **Reliability**: Cloud provider SLAs and redundancy
- **Performance**: Global CDN for tiles, caching at multiple levels
- **Cost-effectiveness**: Pay for what you use
- **Maintainability**: Standard cloud patterns and monitoring

The migration can be done incrementally, testing each component before fully switching over from the local setup.