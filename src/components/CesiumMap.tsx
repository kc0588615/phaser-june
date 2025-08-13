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
  HeightReference,
  GeoJsonDataSource,
  Color as CesiumColor,
  ConstantProperty,
  ColorMaterialProperty,
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

// WKT parsing functions removed - now using GeoJSON directly from database

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
  const [highlightedSpeciesSource, setHighlightedSpeciesSource] = useState<GeoJsonDataSource | null>(null);

  useEffect(() => {
    // Crucial for Next.js: CESIUM_BASE_URL is defined in next.config.mjs and made global in global.d.ts
    // Cesium will pick it up automatically for loading assets.
    // buildModuleUrl.setBaseUrl(CESIUM_BASE_URL); // This line was incorrect and is removed.
    
    // Use environment variable for Ion token as configured in the migration plan
    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || 'YOUR_FALLBACK_TOKEN'; 
  }, []);

  // Add generic fullscreen button for entire application
  useEffect(() => {
    // Check if viewer is ready after a short delay to ensure it's fully initialized
    const timer = setTimeout(() => {
      if (viewerRef.current && viewerRef.current.cesiumElement) {
        const viewer = viewerRef.current.cesiumElement;
        
        // Check if fullscreen button already exists to avoid duplicates
        if (!viewer.container.querySelector('.app-fullscreen-button')) {
          // Create a container div for the fullscreen button
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'app-fullscreen-button';
          buttonContainer.style.position = 'absolute';
          buttonContainer.style.bottom = '70px'; // Adjust this value as needed
          buttonContainer.style.right = '10px';
          buttonContainer.style.zIndex = '999';
          
          // Create button element
          const button = document.createElement('button');
          button.style.width = '40px';
          button.style.height = '40px';
          button.style.backgroundColor = 'rgba(48, 51, 54, 0.8)';
          button.style.border = '1px solid #444';
          button.style.borderRadius = '4px';
          button.style.cursor = 'pointer';
          button.style.display = 'flex';
          button.style.alignItems = 'center';
          button.style.justifyContent = 'center';
          button.style.padding = '0';
          button.style.transition = 'background-color 0.2s';
          
          // Add fullscreen SVG icon
          button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          `;
          
          // Add hover effect
          button.onmouseenter = () => {
            button.style.backgroundColor = 'rgba(48, 51, 54, 1)';
          };
          button.onmouseleave = () => {
            button.style.backgroundColor = 'rgba(48, 51, 54, 0.8)';
          };
          
          // Add click handler for fullscreen toggle
          button.onclick = () => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err.message);
              });
            } else {
              document.exitFullscreen();
            }
          };
          
          // Update icon based on fullscreen state
          const updateIcon = () => {
            if (document.fullscreenElement) {
              // Exit fullscreen icon
              button.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              `;
            } else {
              // Enter fullscreen icon
              button.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              `;
            }
          };
          
          // Listen for fullscreen changes
          document.addEventListener('fullscreenchange', updateIcon);
          
          buttonContainer.appendChild(button);
          viewer.container.appendChild(buttonContainer);
        }
      }
    }, 500); // Small delay to ensure viewer is fully initialized
    
    return () => clearTimeout(timer);
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
          const viewer = viewerRef.current.cesiumElement;
          
          // Set showGroundAtmosphere on the globe
          if (viewer.scene && viewer.scene.globe) {
            viewer.scene.globe.showGroundAtmosphere = false;
          }
          
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
            viewer.camera.flyTo({
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

    // Clear previous red highlighted species polygons immediately on any new click
    if (highlightedSpeciesSource) {
      viewer.dataSources.remove(highlightedSpeciesSource, true);
      setHighlightedSpeciesSource(null);
    }
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
        speciesService.getSpeciesInRadius(longitude, latitude, SPECIES_RADIUS_METERS),
        speciesService.getRasterHabitatDistribution(longitude, latitude)
      ])
        .then(async ([speciesResult, rasterHabitats]) => {
          console.log("Resium: Species service response:", speciesResult);
          console.log("Resium: Raster habitat response:", rasterHabitats);
          
          const cartographicLocation = {
            longitude: longitude,
            latitude: latitude
          };

          const clickedSpecies = speciesResult;
          const rasterHabitatData = rasterHabitats;

          if (clickedSpecies.count > 0 && viewerRef.current) {
            // Remove any existing species data source
            const cesiumDataSource = viewerRef.current.cesiumElement.dataSources.getByName('species-data-source')[0];
            if (cesiumDataSource) {
              viewerRef.current.cesiumElement.dataSources.remove(cesiumDataSource);
            }

            // Create red highlighted species polygons for species hits
            const redDataSource = new GeoJsonDataSource('species-hit-highlight');
            const features: any[] = [];

            for (const species of clickedSpecies.species) {
              if (species.wkb_geometry) {
                try {
                  // Use geometry directly (now GeoJSON from database) like blue highlighting does
                  const feature = {
                    type: 'Feature' as const,
                    properties: {
                      ogc_fid: species.ogc_fid,
                      comm_name: species.comm_name,
                      sci_name: species.sci_name
                    },
                    geometry: species.wkb_geometry  // Direct GeoJSON geometry
                  };
                  features.push(feature);
                } catch (geoError) {
                  console.warn(`Failed to process geometry for species ${species.ogc_fid}:`, geoError);
                }
              }
            }

            if (features.length > 0) {
              await redDataSource.load({
                type: 'FeatureCollection',
                features
              });
              
              // Style the polygons as red to indicate species hit
              redDataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                  entity.polygon.material = new ColorMaterialProperty(CesiumColor.RED.withAlpha(0.5));
                  entity.polygon.outline = new ConstantProperty(true);
                  entity.polygon.outlineColor = new ConstantProperty(CesiumColor.RED);
                  entity.polygon.outlineWidth = new ConstantProperty(2);
                  // Fix for overlapping polygons: Add height and z-index properties
                  entity.polygon.height = new ConstantProperty(1.0); // Slightly elevated
                  entity.polygon.extrudedHeight = new ConstantProperty(2.0); // Small extrusion for visibility
                  entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
                  // Ensure the polygon renders on top of base imagery
                  entity.polygon.zIndex = new ConstantProperty(100);
                }
                entity.name = 'species-hit';
              });

              viewerRef.current.cesiumElement.dataSources.add(redDataSource);
              setHighlightedSpeciesSource(redDataSource);
            }

            console.log('Clicked species:', clickedSpecies);
            
            // Build habitat list for backward compatibility
            const legacyHabitats = new Set<string>();
            clickedSpecies.species.forEach(species => {
              if (species.hab_desc) legacyHabitats.add(species.hab_desc);
              if (species.aquatic) legacyHabitats.add('aquatic');
              if (species.freshwater) legacyHabitats.add('freshwater');
              if (species.terrestr || species.terrestria) legacyHabitats.add('terrestrial');
              if (species.marine) legacyHabitats.add('marine');
            });
            const habitatList = Array.from(legacyHabitats);
            
            // Emit with the expected format - species array and rasterHabitats array
            EventBus.emit('cesium-location-selected', { 
              species: clickedSpecies.species, // Pass the array, not the wrapper object
              rasterHabitats: rasterHabitatData,
              habitats: habitatList,
              lon: cartographicLocation.longitude,
              lat: cartographicLocation.latitude 
            });
          } else if (viewerRef.current) {
            // No species found - find and highlight the closest habitat
            const closestHabitatGeometry = await speciesService.getClosestHabitat(
              cartographicLocation.longitude,
              cartographicLocation.latitude
            );

            if (closestHabitatGeometry) {
              // Remove any existing highlight
              const existingHighlight = viewerRef.current.cesiumElement.dataSources.getByName('habitat-highlight')[0];
              if (existingHighlight) {
                viewerRef.current.cesiumElement.dataSources.remove(existingHighlight);
              }

              // Create highlight data source
              const highlightDataSource = new GeoJsonDataSource('habitat-highlight');
              await highlightDataSource.load({
                type: 'FeatureCollection',
                features: [{
                  type: 'Feature',
                  properties: {},
                  geometry: closestHabitatGeometry
                }]
              });

              viewerRef.current.cesiumElement.dataSources.add(highlightDataSource);

              // Style the highlight polygon
              highlightDataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                  entity.polygon.material = new ColorMaterialProperty(CesiumColor.CYAN.withAlpha(0.7));
                  entity.polygon.outline = new ConstantProperty(true);
                  entity.polygon.outlineColor = new ConstantProperty(CesiumColor.CYAN);
                  entity.polygon.outlineWidth = new ConstantProperty(3);
                  // Fix for overlapping polygons: Add height and z-index properties
                  entity.polygon.height = new ConstantProperty(0.5); // Slightly lower than red
                  entity.polygon.extrudedHeight = new ConstantProperty(1.5); // Small extrusion for visibility
                  entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
                  // Ensure the polygon renders on top of base imagery but below red polygons
                  entity.polygon.zIndex = new ConstantProperty(50);
                }
              });

              // Remove highlight after 3 seconds
              setTimeout(() => {
                if (viewerRef.current) {
                  const highlight = viewerRef.current.cesiumElement.dataSources.getByName('habitat-highlight')[0];
                  if (highlight) {
                    viewerRef.current.cesiumElement.dataSources.remove(highlight);
                  }
                }
              }, 3000);
            }
            
            // Still emit the event even with no species, so the game knows
            EventBus.emit('cesium-location-selected', { 
              species: [], // Empty array when no species found
              rasterHabitats: rasterHabitatData,
              habitats: [], // Empty habitats when no species found
              lon: cartographicLocation.longitude,
              lat: cartographicLocation.latitude 
            });
          }
          
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
          const habitatCount = rasterHabitatData.length;
          const topHabitat = rasterHabitatData.length > 0 
            ? `${rasterHabitatData[0].habitat_type} (${rasterHabitatData[0].percentage}%)`
            : undefined;
          
          setInfoBoxData({
            lon: longitude,
            lat: latitude,
            habitats: habitatList, // Keep for legacy compatibility
            species: speciesResult.species,
            rasterHabitats: rasterHabitatData,
            habitatCount: habitatCount,
            topHabitat: topHabitat,
            message: null
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
  }, [isLoading, highlightedSpeciesSource]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Viewer
        ref={viewerRef}
        full 
        timeline={false}
        animation={false}
        homeButton={false}
        fullscreenButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        baseLayerPicker={false}
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
          padding: '5px', borderRadius: '5px', fontFamily: 'sans-serif',
          fontSize: '12px', maxWidth: '350px', zIndex: 1000, pointerEvents: 'auto'
        }}>
          <div style={{ marginBottom: '5px' }}>
            {infoBoxData.message ? <p style={{ margin: 0 }}>{infoBoxData.message}</p> : (
              <p style={{ margin: 0 }}>
                <b>Habitats:</b> {infoBoxData.rasterHabitats?.length || 0} &nbsp;&nbsp;
                <b>Species:</b> {infoBoxData.species.length}
              </p>
            )}
            {isLoading && <p style={{ margin: 0 }}><em>Loading...</em></p>}
          </div>
          
          {infoBoxData.rasterHabitats && infoBoxData.rasterHabitats.length > 0 && (
            <HabitatLegend 
              habitats={infoBoxData.rasterHabitats}
              radiusKm={HABITAT_RADIUS_METERS / 1000}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default CesiumMap;