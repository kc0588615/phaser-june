// src/components/CesiumMap.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Viewer, ImageryLayer, Entity, EllipseGraphics } from 'resium';
import {
  Ion,
  Cartesian3,
  Color,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Cartographic,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  Credit,
  Math as CesiumMath,
  HeightReference
} from 'cesium';
import { EventBus } from '../game/EventBus';
import { speciesService } from '../lib/speciesService';
import type { Species } from '../types/database';
import { getAppConfig } from '../utils/config';
import HabitatLegend from './HabitatLegend';

// Configuration - using environment variables with fallbacks
const TITILER_BASE_URL = process.env.NEXT_PUBLIC_TITILER_BASE_URL || "https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net";
const COG_URL = process.env.NEXT_PUBLIC_COG_URL || "https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif";
const HABITAT_RADIUS_METERS = 10000.0; // Updated to match raster query (10km)
const SPECIES_RADIUS_METERS = 10000.0;

const CesiumMap: React.FC = () => { // Changed to React.FC for consistency
  const viewerRef = useRef<any>(null); // Typed viewerRef for Resium
  const [imageryProvider, setImageryProvider] = useState<UrlTemplateImageryProvider | null>(null); // Typed state
  const [clickedPosition, setClickedPosition] = useState<Cartesian3 | null>(null); // Cartesian3
  const [clickedLonLat, setClickedLonLat] = useState<{ lon: number, lat: number } | null>(null); // { lon, lat }
  const [infoBoxData, setInfoBoxData] = useState<{
    lon?: number;
    lat?: number;
    habitats: string[];
    species: Species[];
    rasterHabitats?: Array<{habitat_type: string; percentage: number}>;
    habitatCount?: number;
    topHabitat?: string;
    message?: string | null;
  }>({ habitats: [], species: [] });
  const [showInfoBox, setShowInfoBox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Crucial for Next.js: CESIUM_BASE_URL is defined in next.config.mjs and made global in global.d.ts
    // Cesium will pick it up automatically for loading assets.
    // buildModuleUrl.setBaseUrl(CESIUM_BASE_URL); // This line was incorrect and is removed.
    
    // Use environment variable for Ion token as configured in the migration plan
    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || 'YOUR_FALLBACK_TOKEN'; 
  }, []);

  useEffect(() => {
    // Load configuration and setup TiTiler imagery
    const setupImagery = async () => {
      try {
        // Try to use dynamic config first, fallback to env vars
        const config = await getAppConfig().catch(() => ({
          cogUrl: COG_URL,
          titilerBaseUrl: TITILER_BASE_URL
        }));

        const encodedCOGUrl = encodeURIComponent(config.cogUrl);
        const colormapName = "habitat_custom"; // From your backend setup
        const tileMatrixSetId = "WebMercatorQuad"; // Standard TMS for web mapping
        const tileJsonUrl = `${config.titilerBaseUrl}/cog/${tileMatrixSetId}/tilejson.json?url=${encodedCOGUrl}&colormap_name=${colormapName}&nodata=0`;

        console.log("Resium: Requesting TileJSON from:", tileJsonUrl);
        const response = await fetch(tileJsonUrl);
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`TileJSON Error ${response.status}: ${text}`);
        }
        
        const tileJson = await response.json();
        console.log("Resium: Received TileJSON:", tileJson);
        if (!tileJson.tiles || tileJson.tiles.length === 0) {
          throw new Error("TileJSON missing 'tiles' array or 'tiles' array is empty.");
        }
        let templateUrl = tileJson.tiles[0];
        if (!templateUrl) {
            throw new Error("TileJSON 'tiles' array does not contain a valid URL template.");
        }
        
        // Force HTTPS if the Azure endpoint returns HTTP URLs
        if (templateUrl.startsWith('http://azure-local-dfgagqgub7fhb5fv')) {
          templateUrl = templateUrl.replace('http://', 'https://');
        }
        
        console.log("Resium: Using Template URL:", templateUrl);

        const provider = new UrlTemplateImageryProvider({
          url: templateUrl,
          tilingScheme: new WebMercatorTilingScheme(),
          tileWidth: 256,
          tileHeight: 256,
          minimumLevel: tileJson.minzoom ?? 0,
          maximumLevel: tileJson.maxzoom ?? 18,
          credit: new Credit('IUCN Habitat Map via TiTiler')
        });
        setImageryProvider(provider);

        if (viewerRef.current && viewerRef.current.cesiumElement && tileJson.bounds) {
          const [west, south, east, north] = tileJson.bounds;
          if ([west, south, east, north].every(coord => typeof coord === 'number' && isFinite(coord))) {
            const rectangle = Rectangle.fromDegrees(west, south, east, north);
            const widthRad = Rectangle.computeWidth(rectangle);
            const heightRad = Rectangle.computeHeight(rectangle);
            if(widthRad < 0.001 && heightRad < 0.001) { 
                // Expand the rectangle directly
                rectangle.north += 0.05; // radians
                rectangle.south -= 0.05; // radians
                rectangle.east += 0.05;  // radians
                rectangle.west -= 0.05;  // radians
            }
            viewerRef.current.cesiumElement.camera.flyTo({
              destination: rectangle,
              duration: 1.5
            });
            console.log("Resium: Flying to bounds:", tileJson.bounds);
          } else {
            console.warn("Resium: Invalid TileJSON bounds.", tileJson.bounds);
          }
        } else if (!tileJson.bounds) {
            console.log("Resium: TileJSON missing bounds. Default camera view used.");
        }
      } catch (err: any) {
        console.error("Resium: Error loading habitat layer:", err);
        alert(`Failed to load habitat layer: ${err.message}`);
      }
    };

    setupImagery();
  }, []); 


  const handleMapClick = useCallback((movement: any) => { // Typed movement
    if (!viewerRef.current || !viewerRef.current.cesiumElement || isLoading) return;

    const viewer = viewerRef.current.cesiumElement;
    const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);

    if (cartesian) {
      setClickedPosition(cartesian); 
      const cartographic = Cartographic.fromCartesian(cartesian);
      const longitude = CesiumMath.toDegrees(cartographic.longitude);
      const latitude = CesiumMath.toDegrees(cartographic.latitude);
      setClickedLonLat({ lon: longitude, lat: latitude });
      setShowInfoBox(true);
      setInfoBoxData({ habitats: [], species: [], message: `Querying for Lon: ${longitude.toFixed(4)}, Lat: ${latitude.toFixed(4)}...` });
      setIsLoading(true);

      console.log("Resium: Calling speciesService for location:", longitude, latitude);

      // Use Supabase species service for location data
      Promise.all([
        speciesService.getSpeciesAtPoint(longitude, latitude),
        speciesService.getRasterHabitatDistribution(longitude, latitude)
      ])
        .then(([speciesResult, rasterHabitats]) => {
          console.log("Resium: Species service response:", speciesResult);
          console.log("Resium: Raster habitat response:", rasterHabitats);
          
          // Keep legacy habitat extraction for backward compatibility (if needed elsewhere)
          const legacyHabitats = new Set<string>();
          speciesResult.species.forEach(species => {
            if (species.hab_desc) legacyHabitats.add(species.hab_desc);
            if (species.aquatic) legacyHabitats.add('aquatic');
            if (species.freshwater) legacyHabitats.add('freshwater');
            if (species.terrestr || species.terrestria) legacyHabitats.add('terrestrial');
            if (species.marine) legacyHabitats.add('marine');
          });

          const habitatList = Array.from(legacyHabitats);
          
          // Process raster habitat data for info display
          const habitatCount = rasterHabitats.length;
          const topHabitat = rasterHabitats.length > 0 
            ? `${rasterHabitats[0].habitat_type} (${rasterHabitats[0].percentage}%)`
            : undefined;
          
          setInfoBoxData({
            lon: longitude,
            lat: latitude,
            habitats: habitatList, // Keep for legacy compatibility
            species: speciesResult.species,
            rasterHabitats: rasterHabitats,
            habitatCount: habitatCount,
            topHabitat: topHabitat,
            message: null
          });
          
          // Emit event with actual species data and raster habitat data for the game
          EventBus.emit('cesium-location-selected', {
            lon: longitude,
            lat: latitude,
            habitats: habitatList,
            species: speciesResult.species,
            rasterHabitats: rasterHabitats
          });
        })
        .catch(err => {
          console.error("Resium: Error calling species service:", err);
          setInfoBoxData({ 
            habitats: [], 
            species: [], 
            message: `Error: ${err.message || 'Failed to load species data'}` 
          });
        })
        .finally(() => {
            setIsLoading(false);
        });
    } else {
      setShowInfoBox(true);
      setInfoBoxData({ habitats: [], species: [], message: 'Click on the globe to query location.' });
      setClickedPosition(null);
      setClickedLonLat(null);
    }
  }, [isLoading]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Viewer
        ref={viewerRef}
        full 
        timeline={false}
        animation={false}
        baseLayerPicker={true} 
        geocoder={false}
        onClick={handleMapClick}
      >
        {imageryProvider && (
          <ImageryLayer
            imageryProvider={imageryProvider}
            alpha={0.7}
          />
        )}

        {clickedPosition && (
          <>
            <Entity position={clickedPosition} name="Habitat Query Radius">
              <EllipseGraphics
                semiMinorAxis={HABITAT_RADIUS_METERS}
                semiMajorAxis={HABITAT_RADIUS_METERS}
                material={Color.RED.withAlpha(0.2)}
                outline
                outlineColor={Color.RED}
                outlineWidth={2}
                heightReference={HeightReference.CLAMP_TO_GROUND}
              />
            </Entity>
            <Entity position={clickedPosition} name="Species Query Radius">
              <EllipseGraphics
                semiMinorAxis={SPECIES_RADIUS_METERS}
                semiMajorAxis={SPECIES_RADIUS_METERS}
                material={Color.BLUE.withAlpha(0.15)}
                outline
                outlineColor={Color.BLUE}
                outlineWidth={2}
                heightReference={HeightReference.CLAMP_TO_GROUND}
              />
            </Entity>
          </>
        )}
      </Viewer>
      {showInfoBox && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px',
          background: 'rgba(40,40,40,0.85)', color: 'white',
          padding: '10px', borderRadius: '5px', fontFamily: 'sans-serif',
          fontSize: '12px', maxWidth: '350px', zIndex: 1000, pointerEvents: 'none'
        }}>
          {infoBoxData.message ? <p>{infoBoxData.message}</p> : (
            <p><b>Species Count:</b> {infoBoxData.species.length}</p>
          )}
          {isLoading && <p><em>Loading...</em></p>}
        </div>
      )}
      {showInfoBox && infoBoxData.rasterHabitats && infoBoxData.rasterHabitats.length > 0 && (
        <HabitatLegend 
          habitats={infoBoxData.rasterHabitats}
          radiusKm={HABITAT_RADIUS_METERS / 1000}
        />
      )}
    </div>
  );
}

export default CesiumMap;