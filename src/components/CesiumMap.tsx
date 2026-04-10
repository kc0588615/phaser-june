// src/components/CesiumMap.tsx
import React, { useState, useEffect, useRef, useCallback, type MutableRefObject } from 'react';
import { Viewer, ImageryLayer, Entity, EllipseGraphics, RectangleGraphics } from 'resium';
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
  CallbackProperty,
  PolylineDashMaterialProperty,
  Entity as CesiumEntity,
} from 'cesium';
import { EventBus } from '../game/EventBus';
import type { EventPayloads } from '../game/EventBus';
import { deriveAvailableAffinities, getDefaultActiveAffinities } from '../expedition/affinities';
import { speciesService } from '../lib/speciesService';
import type { Species } from '../types/database';
import { getAppConfig } from '../utils/config';
import HabitatLegend from './HabitatLegend';

// Configuration - using environment variables with fallbacks
const TITILER_BASE_URL = process.env.NEXT_PUBLIC_TITILER_BASE_URL || "https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com";
const COG_URL = process.env.NEXT_PUBLIC_COG_URL || "https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif";
const HABITAT_RADIUS_METERS = 10000.0; // Updated to match raster query (10km)
const SPECIES_RADIUS_METERS = 10000.0;

// WKT parsing functions removed - now using GeoJSON directly from database

const CesiumMap: React.FC = () => { // Changed to React.FC for consistency
  const viewerRef = useRef<any>(null); // Typed viewerRef for Resium
  const [imageryProvider, setImageryProvider] = useState<UrlTemplateImageryProvider | null>(null); // Typed state
  const [clickedPosition, setClickedPosition] = useState<Cartesian3 | null>(null); // Cartesian3
  const [queryBounds, setQueryBounds] = useState<Rectangle | null>(null); // Bounding box for habitat query
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

  // Track spatial layer data sources for cleanup
  const spatialLayersRef = useRef<GeoJsonDataSource[]>([]);

  // Route trail entities
  const trailEntitiesRef = useRef<CesiumEntity[]>([]);
  const trailPositionsRef = useRef<{ lon: number; lat: number }[]>([]);
  const trailCompletedIndexRef = useRef<number>(0);

  // Compute synthetic trail positions fanned NE from center
  const computeTrailPositions = useCallback((lon: number, lat: number, count: number) => {
    const step = 0.003; // ~300m
    return Array.from({ length: count }, (_, i) => ({
      lon: lon + i * step * 0.7,
      lat: lat + i * step * 0.7,
    }));
  }, []);

  const removeTrailEntities = useCallback(() => {
    if (!viewerRef.current?.cesiumElement) return;
    const viewer = viewerRef.current.cesiumElement;
    for (const ent of trailEntitiesRef.current) {
      try { viewer.entities.remove(ent); } catch { /* ok */ }
    }
    trailEntitiesRef.current = [];
    trailPositionsRef.current = [];
    trailCompletedIndexRef.current = 0;
  }, []);

  // Block map clicks during active expedition run
  const runPhaseRef: MutableRefObject<string> = useRef('idle');
  useEffect(() => {
    const onExpeditionReady = (data: EventPayloads['expedition-data-ready']) => {
      runPhaseRef.current = 'briefing';
      // Build trail positions from expedition nodes
      const nodeCount = data.expedition.nodes.length;
      const positions = computeTrailPositions(data.lon, data.lat, nodeCount);
      trailPositionsRef.current = positions;
      trailCompletedIndexRef.current = 0;

      if (viewerRef.current?.cesiumElement && positions.length > 1) {
        const viewer = viewerRef.current.cesiumElement;
        removeTrailEntities();

        // Polyline using CallbackProperty for reactive updates
        const polyline = viewer.entities.add({
          polyline: {
            positions: new CallbackProperty(() => {
              const idx = Math.min(trailCompletedIndexRef.current + 1, trailPositionsRef.current.length);
              return trailPositionsRef.current.slice(0, idx).map(p =>
                Cartesian3.fromDegrees(p.lon, p.lat)
              );
            }, false) as any,
            material: new PolylineDashMaterialProperty({
              color: CesiumColor.CYAN.withAlpha(0.7),
              dashLength: 12,
            }),
            width: new ConstantProperty(3),
            clampToGround: new ConstantProperty(true),
          },
        });
        trailEntitiesRef.current.push(polyline);

        // Node point markers
        for (let i = 0; i < positions.length; i++) {
          const pt = viewer.entities.add({
            position: Cartesian3.fromDegrees(positions[i].lon, positions[i].lat),
            point: {
              pixelSize: new ConstantProperty(8),
              color: new ConstantProperty(CesiumColor.GRAY),
              outlineColor: new ConstantProperty(CesiumColor.WHITE),
              outlineWidth: new ConstantProperty(1),
              heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
            },
          });
          trailEntitiesRef.current.push(pt);
        }
        // Mark first node as current (yellow)
        const firstPt = trailEntitiesRef.current[1]; // [0] is polyline
        if (firstPt?.point) {
          firstPt.point.color = new ConstantProperty(CesiumColor.YELLOW);
          firstPt.point.pixelSize = new ConstantProperty(10);
        }
      }
    };
    const onExpeditionStart = () => { runPhaseRef.current = 'in-run'; };
    const onNodeComplete = (data: { nodeIndex: number }) => {
      // Extend trail + recolor markers
      const completedIdx = data.nodeIndex;
      trailCompletedIndexRef.current = completedIdx + 1;
      const markerIdx = completedIdx + 1; // offset by polyline at [0]
      if (trailEntitiesRef.current[markerIdx]?.point) {
        trailEntitiesRef.current[markerIdx].point!.color = new ConstantProperty(CesiumColor.CYAN);
      }
      // Mark next node as current
      const nextMarkerIdx = markerIdx + 1;
      if (trailEntitiesRef.current[nextMarkerIdx]?.point) {
        trailEntitiesRef.current[nextMarkerIdx].point!.color = new ConstantProperty(CesiumColor.YELLOW);
        trailEntitiesRef.current[nextMarkerIdx].point!.pixelSize = new ConstantProperty(10);
      }
    };
    const onGameReset = () => {
      runPhaseRef.current = 'idle';
      removeTrailEntities();
      // Remove spatial layer overlays
      if (viewerRef.current?.cesiumElement) {
        const viewer = viewerRef.current.cesiumElement;
        for (const ds of spatialLayersRef.current) {
          try { viewer.dataSources.remove(ds, true); } catch { /* already removed */ }
        }
        spatialLayersRef.current = [];
      }
    };
    EventBus.on('expedition-data-ready', onExpeditionReady);
    EventBus.on('expedition-start', onExpeditionStart);
    EventBus.on('node-complete', onNodeComplete);
    EventBus.on('game-reset', onGameReset);
    return () => {
      EventBus.off('expedition-data-ready', onExpeditionReady);
      EventBus.off('expedition-start', onExpeditionStart);
      EventBus.off('node-complete', onNodeComplete);
      EventBus.off('game-reset', onGameReset);
    };
  }, [computeTrailPositions, removeTrailEntities]);

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

  // Pulsing cyan markers for species-viable entry points
  const hotspotEntitiesRef = useRef<CesiumEntity[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!viewerRef.current?.cesiumElement) return;
      const viewer = viewerRef.current.cesiumElement;
      // Species-dense grid centroids from spatial data
      const HOTSPOTS = [
        { lon: -90, lat: 0 }, { lon: -60, lat: -5 }, { lon: 140, lat: -10 },
        { lon: 15, lat: -30 }, { lon: 45, lat: -25 }, { lon: 50, lat: -15 },
        { lon: 35, lat: -5 }, { lon: 10, lat: 0 }, { lon: 10, lat: 5 },
        { lon: 15, lat: 15 }, { lon: 105, lat: 20 }, { lon: 110, lat: 25 },
        { lon: 75, lat: 10 }, { lon: 105, lat: 0 }, { lon: 105, lat: 5 },
      ];
      for (const h of HOTSPOTS) {
        // Pulsing outer ring
        const ent = viewer.entities.add({
          position: Cartesian3.fromDegrees(h.lon, h.lat),
          point: {
            pixelSize: new CallbackProperty(() => 12 + 4 * Math.sin(Date.now() / 600), false) as unknown as ConstantProperty,
            color: new ConstantProperty(CesiumColor.CYAN.withAlpha(0.5)),
            outlineColor: new ConstantProperty(CesiumColor.CYAN.withAlpha(0.8)),
            outlineWidth: new ConstantProperty(2),
            heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
          },
        });
        hotspotEntitiesRef.current.push(ent);
      }
    }, 1500);
    return () => {
      clearTimeout(timer);
      if (viewerRef.current?.cesiumElement) {
        for (const ent of hotspotEntitiesRef.current) {
          try { viewerRef.current.cesiumElement.entities.remove(ent); } catch { /* ok */ }
        }
      }
      hotspotEntitiesRef.current = [];
    };
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
        const templateUrl = tileJson.tiles[0];
        if (!templateUrl) {
            throw new Error("TileJSON 'tiles' array does not contain a valid URL template.");
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


  // Load spatial GeoJSON layers (rivers, PAs, ICCA) onto the globe
  const loadSpatialLayers = useCallback(async (lon: number, lat: number) => {
    if (!viewerRef.current?.cesiumElement) return;
    const viewer = viewerRef.current.cesiumElement;

    // Clean up previous spatial layers
    for (const ds of spatialLayersRef.current) {
      try { viewer.dataSources.remove(ds, true); } catch { /* ok */ }
    }
    spatialLayersRef.current = [];

    try {
      const resp = await fetch(`/api/layers/near-point?lon=${lon}&lat=${lat}`);
      if (!resp.ok) return;
      const data = await resp.json();

      // Rivers — blue polylines
      if (data.rivers?.features?.length > 0) {
        const riverDs = new GeoJsonDataSource('spatial-rivers');
        await riverDs.load(data.rivers);
        riverDs.entities.values.forEach((e) => {
          if (e.polyline) {
            e.polyline.material = new ColorMaterialProperty(CesiumColor.fromCssColorString('#3b82f6').withAlpha(0.8));
            e.polyline.width = new ConstantProperty(2);
          }
        });
        viewer.dataSources.add(riverDs);
        spatialLayersRef.current.push(riverDs);
      }

      // Protected areas — green semi-transparent polygons
      if (data.protected_areas?.features?.length > 0) {
        const paDs = new GeoJsonDataSource('spatial-pa');
        await paDs.load(data.protected_areas);
        paDs.entities.values.forEach((e) => {
          if (e.polygon) {
            e.polygon.material = new ColorMaterialProperty(CesiumColor.fromCssColorString('#22c55e').withAlpha(0.25));
            e.polygon.outline = new ConstantProperty(true);
            e.polygon.outlineColor = new ConstantProperty(CesiumColor.fromCssColorString('#22c55e'));
            e.polygon.outlineWidth = new ConstantProperty(1);
          }
        });
        viewer.dataSources.add(paDs);
        spatialLayersRef.current.push(paDs);
      }

      // ICCA — orange points
      if (data.icca?.features?.length > 0) {
        const iccaDs = new GeoJsonDataSource('spatial-icca');
        await iccaDs.load(data.icca);
        iccaDs.entities.values.forEach((e) => {
          if (e.point) {
            e.point.color = new ConstantProperty(CesiumColor.fromCssColorString('#f97316'));
            e.point.pixelSize = new ConstantProperty(10);
            e.point.outlineColor = new ConstantProperty(CesiumColor.WHITE);
            e.point.outlineWidth = new ConstantProperty(2);
          }
        });
        viewer.dataSources.add(iccaDs);
        spatialLayersRef.current.push(iccaDs);
      }
    } catch (err) {
      console.warn('[CesiumMap] Failed to load spatial layers:', err);
    }
  }, []);

  const handleMapClick = useCallback((movement: any) => { // Typed movement
    if (!viewerRef.current || !viewerRef.current.cesiumElement || isLoading) return;

    // Block clicks during active expedition (briefing is dismissible, allow re-clicking)
    if (runPhaseRef.current === 'in-run' || runPhaseRef.current === 'deduction') {
      setShowInfoBox(true);
      setInfoBoxData({ habitats: [], species: [], message: 'Complete the current expedition first.' });
      return;
    }

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

      // Compute bounding box matching TiTiler query (10km half-width)
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLon = 111320 * Math.cos(latitude * Math.PI / 180);
      const deltaLat = HABITAT_RADIUS_METERS / metersPerDegreeLat;
      const deltaLon = HABITAT_RADIUS_METERS / metersPerDegreeLon;
      setQueryBounds(Rectangle.fromDegrees(
        longitude - deltaLon, latitude - deltaLat,
        longitude + deltaLon, latitude + deltaLat
      ));
      setShowInfoBox(true);
      setInfoBoxData({ habitats: [], species: [], message: `Querying for Lon: ${longitude.toFixed(4)}, Lat: ${latitude.toFixed(4)}...` });
      setIsLoading(true);

      console.log("Resium: Calling speciesService for location:", longitude, latitude);

      // Fetch species data + expedition context for this location
      Promise.all([
        speciesService.getSpeciesInRadius(longitude, latitude, SPECIES_RADIUS_METERS),
        speciesService.getRasterHabitatDistribution(longitude, latitude),
        fetch(`/api/protected-areas/at-point?lon=${longitude}&lat=${latitude}&size=500`).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
        .then(async ([speciesResult, rasterHabitats, atPointData]) => {
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
                      comm_name: species.common_name,
                      sci_name: species.scientific_name
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
            // Habitat fields are now booleans
            const legacyHabitats = new Set<string>();
            clickedSpecies.species.forEach(species => {
              if (species.habitat_description) legacyHabitats.add(species.habitat_description);
              if (species.aquatic) legacyHabitats.add('aquatic');
              if (species.freshwater) legacyHabitats.add('freshwater');
              if (species.terrestrial) legacyHabitats.add('terrestrial');
              if (species.marine) legacyHabitats.add('marine');
            });
            const habitatList = Array.from(legacyHabitats);
            
            // Emit expedition-data-ready (briefing intercepts before puzzle starts)
            if (atPointData?.generated_nodes) {
              const availableAffinities = deriveAvailableAffinities(clickedSpecies.species);
              EventBus.emit('expedition-data-ready', {
                lon: cartographicLocation.longitude,
                lat: cartographicLocation.latitude,
                expedition: {
                  nodes: atPointData.generated_nodes,
                  bioregion: atPointData.bioregion,
                  protectedAreas: atPointData.protected_areas ?? [],
                  actionBias: atPointData.action_bias ?? {},
                  activeAffinities: getDefaultActiveAffinities(availableAffinities),
                  availableAffinities,
                  primaryNodeFamily: atPointData.primary_node_family ?? '',
                  primaryVariant: atPointData.primary_variant ?? '',
                  modifierNodes: atPointData.modifier_nodes ?? [],
                  signals: atPointData.signals ?? {},
                  iccaTerritories: atPointData.icca_territories ?? [],
                  nearestRiverDistM: atPointData.nearest_river_dist_m ?? null,
                },
                species: clickedSpecies.species,
                rasterHabitats: rasterHabitatData,
                habitats: habitatList,
              });
              // Fetch + render spatial layers on globe
              loadSpatialLayers(cartographicLocation.longitude, cartographicLocation.latitude);
            } else {
              // Fallback: no expedition data, emit old event directly
              EventBus.emit('cesium-location-selected', {
                species: clickedSpecies.species,
                rasterHabitats: rasterHabitatData,
                habitats: habitatList,
                lon: cartographicLocation.longitude,
                lat: cartographicLocation.latitude,
              });
            }
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
            
            // Still emit the event even with no species
            if (atPointData?.generated_nodes) {
              EventBus.emit('expedition-data-ready', {
                lon: cartographicLocation.longitude,
                lat: cartographicLocation.latitude,
                expedition: {
                  nodes: atPointData.generated_nodes,
                  bioregion: atPointData.bioregion,
                  protectedAreas: atPointData.protected_areas ?? [],
                  actionBias: atPointData.action_bias ?? {},
                  activeAffinities: [],
                  availableAffinities: [],
                  primaryNodeFamily: atPointData.primary_node_family ?? '',
                  primaryVariant: atPointData.primary_variant ?? '',
                  modifierNodes: atPointData.modifier_nodes ?? [],
                  signals: atPointData.signals ?? {},
                  iccaTerritories: atPointData.icca_territories ?? [],
                  nearestRiverDistM: atPointData.nearest_river_dist_m ?? null,
                },
                species: [],
                rasterHabitats: rasterHabitatData,
                habitats: [],
              });
              loadSpatialLayers(cartographicLocation.longitude, cartographicLocation.latitude);
            } else {
              EventBus.emit('cesium-location-selected', {
                species: [],
                rasterHabitats: rasterHabitatData,
                habitats: [],
                lon: cartographicLocation.longitude,
                lat: cartographicLocation.latitude,
              });
            }
          }
          
          // Keep legacy habitat extraction for backward compatibility (if needed elsewhere)
          // NOTE: DB stores these as strings "true"/"false", not booleans
          const legacyHabitats = new Set<string>();
          speciesResult.species.forEach(species => {
            if (species.habitat_description) legacyHabitats.add(species.habitat_description);
            if (species.aquatic) legacyHabitats.add('aquatic');
            if (species.freshwater) legacyHabitats.add('freshwater');
            if (species.terrestrial) legacyHabitats.add('terrestrial');
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
      setQueryBounds(null);
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

        {queryBounds && (
          <Entity name="Habitat Query Bounds">
            <RectangleGraphics
              coordinates={queryBounds}
              material={Color.RED.withAlpha(0.2)}
              outline
              outlineColor={Color.RED}
              outlineWidth={2}
              heightReference={HeightReference.CLAMP_TO_GROUND}
            />
          </Entity>
        )}
      </Viewer>
      {showInfoBox && (
        <div className="glass-bg shadow-card" style={{
          position: 'absolute', top: '12px', left: '12px',
          padding: '10px 14px', borderRadius: '16px',
          border: '1px solid var(--ds-border-subtle)',
          color: 'var(--ds-text-primary)', fontFamily: 'inherit',
          fontSize: '12px', maxWidth: '320px', zIndex: 1000, pointerEvents: 'auto',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          {infoBoxData.message ? (
            <p style={{ margin: 0, color: 'var(--ds-text-secondary)' }}>{infoBoxData.message}</p>
          ) : (
            <>
              {/* Biome + species summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>
                  {infoBoxData.topHabitat || 'Unknown Biome'}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
                  background: 'var(--ds-surface-elevated)', color: 'var(--ds-accent-cyan)',
                }}>
                  {infoBoxData.species.length} species
                </span>
              </div>
              {/* Difficulty stars based on species count */}
              <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: Math.min(5, Math.max(1, Math.ceil(infoBoxData.species.length / 3))) }, (_, i) => (
                  <span key={i} style={{ fontSize: '10px', color: 'var(--ds-accent-amber)' }}>★</span>
                ))}
              </div>
            </>
          )}
          {isLoading && <p style={{ margin: 0, color: 'var(--ds-text-muted)', fontStyle: 'italic' }}>Loading...</p>}

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
