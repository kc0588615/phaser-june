// src/components/CesiumMap.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Viewer, ImageryLayer, Entity, RectangleGraphics } from 'resium';
import {
  Ion,
  Cartesian3,
  Color,
  Rectangle,
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
import { deriveAvailableAffinities, getDefaultActiveAffinities } from '../expedition/affinities';
import type { AffinityType } from '../expedition/affinities';
import { speciesService } from '../lib/speciesService';
import type { Species } from '../types/database';
import type { ExpeditionData, RunNode } from '../types/expedition';
import type { FeatureFingerprint } from '../types/gis';
import { getAppConfig } from '../utils/config';
import { CesiumInfoBox } from './CesiumInfoBox';
import { useCesiumFullscreen } from '../hooks/useCesiumFullscreen';
import { useCesiumTrail } from '../hooks/useCesiumTrail';
import { getBioregionStyle } from '../lib/bioregionStyles';
import { computeExpeditionRoutePolyline, normalizeRoutePolyline } from '../lib/expeditionRoute';
import { applyWaypointsToRunNodes } from '../lib/nodeScoring';
import type { ExpeditionWaypointResponse } from '../types/waypoints';

const TITILER_BASE_URL = process.env.NEXT_PUBLIC_TITILER_BASE_URL || "https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com";
const COG_URL = process.env.NEXT_PUBLIC_COG_URL || "https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif";
const HABITAT_RADIUS_METERS = 10000.0;
const SPECIES_RADIUS_METERS = 10000.0;
const WAYPOINT_FETCH_TIMEOUT_MS = 4000;

type RasterHabitatSummary = Array<{ habitat_type: string; percentage: number }>;

interface AtPointData {
  generated_nodes?: RunNode[];
  bioregion?: ExpeditionData['bioregion'];
  protected_areas?: ExpeditionData['protectedAreas'];
  action_bias?: ExpeditionData['actionBias'];
  primary_node_family?: string;
  primary_variant?: string;
  modifier_nodes?: string[];
  signals?: Record<string, number>;
  nearest_river_dist_m?: number | null;
  feature_fingerprints?: FeatureFingerprint[];
}

function getWaypointRouteOrFallback(
  waypointData: ExpeditionWaypointResponse | null,
  lon: number,
  lat: number,
  count: number,
) {
  const routePolyline = normalizeRoutePolyline(waypointData?.routePolyline);
  return routePolyline.length > 0
    ? routePolyline
    : computeExpeditionRoutePolyline(lon, lat, count);
}

function attachWaypointsToNodes(nodes: RunNode[], waypointData: ExpeditionWaypointResponse | null): RunNode[] {
  if (!waypointData?.waypoints?.length) return nodes;
  const waypointsBySlot = new Map(waypointData.waypoints.map((waypoint) => [waypoint.slot, waypoint]));
  return applyWaypointsToRunNodes(nodes.map((node, index) => ({
    ...node,
    waypoint: waypointsBySlot.get(index as 0 | 1 | 2 | 3 | 4 | 5),
  })));
}

async function fetchWaypointData(lon: number, lat: number): Promise<ExpeditionWaypointResponse | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), WAYPOINT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/expedition/waypoints?lon=${lon}&lat=${lat}`, {
      signal: controller.signal,
    });
    return response.ok ? response.json() as Promise<ExpeditionWaypointResponse> : null;
  } catch (error) {
    if ((error as { name?: string }).name !== 'AbortError') {
      console.warn('[CesiumMap] Failed to load waypoint route:', error);
    }
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function emitExpeditionReadyFromMapClick(input: {
  lon: number;
  lat: number;
  atPointData: AtPointData | null;
  waypointData: ExpeditionWaypointResponse | null;
  species: Species[];
  rasterHabitats: RasterHabitatSummary;
  habitats: string[];
  activeAffinities: AffinityType[];
  availableAffinities: AffinityType[];
  loadSpatialLayers: (lon: number, lat: number) => void;
}): boolean {
  const nodes = input.atPointData?.generated_nodes;
  if (!nodes?.length) return false;

  const routePolyline = getWaypointRouteOrFallback(
    input.waypointData,
    input.lon,
    input.lat,
    nodes.length,
  );

  EventBus.emit('expedition-data-ready', {
    lon: input.lon,
    lat: input.lat,
    expedition: {
      nodes: attachWaypointsToNodes(nodes, input.waypointData),
      bioregion: input.atPointData?.bioregion ?? null,
      protectedAreas: input.atPointData?.protected_areas ?? [],
      actionBias: input.atPointData?.action_bias ?? {},
      activeAffinities: input.activeAffinities,
      availableAffinities: input.availableAffinities,
      primaryNodeFamily: input.atPointData?.primary_node_family ?? '',
      primaryVariant: input.atPointData?.primary_variant ?? '',
      modifierNodes: input.atPointData?.modifier_nodes ?? [],
      signals: input.atPointData?.signals ?? {},
      routePolyline,
      waypoints: input.waypointData?.waypoints ?? [],
      waypointRadiusKm: input.waypointData?.radiusKm ?? null,
      nearestRiverDistM: input.atPointData?.nearest_river_dist_m ?? null,
    },
    species: input.species,
    rasterHabitats: input.rasterHabitats,
    habitats: input.habitats,
    featureFingerprints: input.atPointData?.feature_fingerprints ?? [],
  });
  input.loadSpatialLayers(input.lon, input.lat);
  return true;
}

const CesiumMap: React.FC = () => {
  const viewerRef = useRef<any>(null);
  const [imageryProvider, setImageryProvider] = useState<UrlTemplateImageryProvider | null>(null);
  const [clickedPosition, setClickedPosition] = useState<Cartesian3 | null>(null);
  const [queryBounds, setQueryBounds] = useState<Rectangle | null>(null);
  const [clickedLonLat, setClickedLonLat] = useState<{ lon: number, lat: number } | null>(null);
  const [infoBoxData, setInfoBoxData] = useState<{
    lon?: number;
    lat?: number;
    habitats: string[];
    species: Species[];
    rasterHabitats?: Array<{habitat_type: string; percentage: number}>;
    bioregion?: {
      bioregion?: string | null;
      realm?: string | null;
      biome?: string | null;
    };
    habitatCount?: number;
    topHabitat?: string;
    message?: string | null;
  }>({ habitats: [], species: [] });
  const [showInfoBox, setShowInfoBox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedSpeciesSource, setHighlightedSpeciesSource] = useState<GeoJsonDataSource | null>(null);
  const [showBioregionPolygons, setShowBioregionPolygons] = useState(false);
  const bioregionSourceRef = useRef<GeoJsonDataSource | null>(null);

  // Extracted hooks
  useCesiumFullscreen(viewerRef);
  const { runPhaseRef, loadSpatialLayers } = useCesiumTrail(viewerRef);

  useEffect(() => {
    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || 'YOUR_FALLBACK_TOKEN';
  }, []);

  const removeBioregionLayer = useCallback(() => {
    if (!viewerRef.current?.cesiumElement || !bioregionSourceRef.current) return;
    try {
      viewerRef.current.cesiumElement.dataSources.remove(bioregionSourceRef.current, true);
    } catch {
      /* ok */
    }
    bioregionSourceRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncBioregionLayer = async () => {
      if (!showBioregionPolygons || !clickedLonLat || !viewerRef.current?.cesiumElement) {
        removeBioregionLayer();
        return;
      }

      try {
        const resp = await fetch(`/api/layers/near-point?lon=${clickedLonLat.lon}&lat=${clickedLonLat.lat}`);
        if (!resp.ok) {
          removeBioregionLayer();
          return;
        }

        const data = await resp.json();
        if (cancelled || !data.bioregions?.features?.length || !viewerRef.current?.cesiumElement) {
          if (!data.bioregions?.features?.length) removeBioregionLayer();
          return;
        }

        const bioregionDs = new GeoJsonDataSource('spatial-bioregions');
        await bioregionDs.load(data.bioregions, { clampToGround: true });
        if (cancelled || !viewerRef.current?.cesiumElement) return;

        bioregionDs.entities.values.forEach((entity) => {
          if (!entity.polygon) return;
          const biome = entity.properties?.biome?.getValue?.();
          const realm = entity.properties?.realm?.getValue?.();
          const style = getBioregionStyle(
            typeof biome === 'string' ? biome : undefined,
            typeof realm === 'string' ? realm : undefined
          );

          entity.polygon.material = new ColorMaterialProperty(
            CesiumColor.fromCssColorString(style.fill).withAlpha(0.9)
          );
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(
            CesiumColor.fromCssColorString(style.outline).withAlpha(0.95)
          );
          entity.polygon.outlineWidth = new ConstantProperty(2);
          entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
          entity.polygon.zIndex = new ConstantProperty(20);
        });

        removeBioregionLayer();
        viewerRef.current.cesiumElement.dataSources.add(bioregionDs);
        bioregionSourceRef.current = bioregionDs;
      } catch (err) {
        console.warn('[CesiumMap] Failed to load bioregion layer:', err);
        removeBioregionLayer();
      }
    };

    syncBioregionLayer();

    return () => {
      cancelled = true;
    };
  }, [clickedLonLat, removeBioregionLayer, showBioregionPolygons]);

  useEffect(() => () => {
    removeBioregionLayer();
  }, [removeBioregionLayer]);

  useEffect(() => {
    const setupImagery = async () => {
      try {
        const config = await getAppConfig().catch(() => ({
          cogUrl: COG_URL,
          titilerBaseUrl: TITILER_BASE_URL
        }));

        const encodedCOGUrl = encodeURIComponent(config.cogUrl);
        const colormapName = "habitat_custom";
        const tileMatrixSetId = "WebMercatorQuad";
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

        if (viewerRef.current?.cesiumElement && tileJson.bounds) {
          const viewer = viewerRef.current.cesiumElement;

          if (viewer.scene?.globe) {
            viewer.scene.globe.showGroundAtmosphere = false;
          }

          const [west, south, east, north] = tileJson.bounds;
          if ([west, south, east, north].every((coord: number) => typeof coord === 'number' && isFinite(coord))) {
            const rectangle = Rectangle.fromDegrees(west, south, east, north);
            const widthRad = Rectangle.computeWidth(rectangle);
            const heightRad = Rectangle.computeHeight(rectangle);
            if (widthRad < 0.001 && heightRad < 0.001) {
              rectangle.north += 0.05;
              rectangle.south -= 0.05;
              rectangle.east += 0.05;
              rectangle.west -= 0.05;
            }
            viewer.camera.flyTo({ destination: rectangle, duration: 1.5 });
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

  const handleMapClick = useCallback((movement: any) => {
    if (!viewerRef.current?.cesiumElement || isLoading) return;

    if (runPhaseRef.current === 'in-run' || runPhaseRef.current === 'deduction') {
      setShowInfoBox(true);
      setInfoBoxData({ habitats: [], species: [], message: 'Complete the current expedition first.' });
      return;
    }

    const viewer = viewerRef.current.cesiumElement;

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

      Promise.all([
        speciesService.getSpeciesInRadius(longitude, latitude, SPECIES_RADIUS_METERS),
        speciesService.getRasterHabitatDistribution(longitude, latitude),
        fetch(`/api/protected-areas/at-point?lon=${longitude}&lat=${latitude}&size=500`).then(r => r.ok ? r.json() as Promise<AtPointData> : null).catch(() => null),
        fetchWaypointData(longitude, latitude),
      ])
        .then(async ([speciesResult, rasterHabitats, atPointData, waypointData]) => {
          console.log("Resium: Species service response:", speciesResult);
          console.log("Resium: Raster habitat response:", rasterHabitats);

          const cartographicLocation = { longitude, latitude };
          const clickedSpecies = speciesResult;
          const rasterHabitatData = rasterHabitats;

          if (clickedSpecies.count > 0 && viewerRef.current) {
            const cesiumDataSource = viewerRef.current.cesiumElement.dataSources.getByName('species-data-source')[0];
            if (cesiumDataSource) {
              viewerRef.current.cesiumElement.dataSources.remove(cesiumDataSource);
            }

            const redDataSource = new GeoJsonDataSource('species-hit-highlight');
            const features: any[] = [];

            for (const species of clickedSpecies.species) {
              if (species.wkb_geometry) {
                try {
                  features.push({
                    type: 'Feature' as const,
                    properties: {
                      species_id: species.id,
                      comm_name: species.common_name,
                      sci_name: species.scientific_name
                    },
                    geometry: species.wkb_geometry
                  });
                } catch (geoError) {
                  console.warn(`Failed to process geometry for species ${species.id}:`, geoError);
                }
              }
            }

            if (features.length > 0) {
              await redDataSource.load({ type: 'FeatureCollection', features });

              redDataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                  entity.polygon.material = new ColorMaterialProperty(CesiumColor.RED.withAlpha(0.5));
                  entity.polygon.outline = new ConstantProperty(true);
                  entity.polygon.outlineColor = new ConstantProperty(CesiumColor.RED);
                  entity.polygon.outlineWidth = new ConstantProperty(2);
                  entity.polygon.height = new ConstantProperty(1.0);
                  entity.polygon.extrudedHeight = new ConstantProperty(2.0);
                  entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
                  entity.polygon.zIndex = new ConstantProperty(100);
                }
                entity.name = 'species-hit';
              });

              viewerRef.current.cesiumElement.dataSources.add(redDataSource);
              setHighlightedSpeciesSource(redDataSource);
            }

            console.log('Clicked species:', clickedSpecies);

            const legacyHabitats = new Set<string>();
            clickedSpecies.species.forEach((species: Species) => {
              if (species.habitat_description) legacyHabitats.add(species.habitat_description);

              if (species.freshwater) legacyHabitats.add('freshwater');
              if (species.terrestrial) legacyHabitats.add('terrestrial');
              if (species.marine) legacyHabitats.add('marine');
            });
            const habitatList = Array.from(legacyHabitats);

            const availableAffinities = deriveAvailableAffinities(clickedSpecies.species);
            if (!emitExpeditionReadyFromMapClick({
              lon: cartographicLocation.longitude,
              lat: cartographicLocation.latitude,
              atPointData,
              waypointData,
              species: clickedSpecies.species,
              rasterHabitats: rasterHabitatData,
              habitats: habitatList,
              activeAffinities: getDefaultActiveAffinities(availableAffinities),
              availableAffinities,
              loadSpatialLayers,
            })) {
              EventBus.emit('cesium-location-selected', {
                species: clickedSpecies.species,
                rasterHabitats: rasterHabitatData,
                habitats: habitatList,
                lon: cartographicLocation.longitude,
                lat: cartographicLocation.latitude,
              });
            }
          } else if (viewerRef.current) {
            const closestHabitatGeometry = await speciesService.getClosestHabitat(
              cartographicLocation.longitude,
              cartographicLocation.latitude
            );

            if (closestHabitatGeometry) {
              const existingHighlight = viewerRef.current.cesiumElement.dataSources.getByName('habitat-highlight')[0];
              if (existingHighlight) {
                viewerRef.current.cesiumElement.dataSources.remove(existingHighlight);
              }

              const highlightDataSource = new GeoJsonDataSource('habitat-highlight');
              await highlightDataSource.load({
                type: 'FeatureCollection',
                features: [{ type: 'Feature', properties: {}, geometry: closestHabitatGeometry }]
              });

              viewerRef.current.cesiumElement.dataSources.add(highlightDataSource);

              highlightDataSource.entities.values.forEach(entity => {
                if (entity.polygon) {
                  entity.polygon.material = new ColorMaterialProperty(CesiumColor.CYAN.withAlpha(0.7));
                  entity.polygon.outline = new ConstantProperty(true);
                  entity.polygon.outlineColor = new ConstantProperty(CesiumColor.CYAN);
                  entity.polygon.outlineWidth = new ConstantProperty(3);
                  entity.polygon.height = new ConstantProperty(0.5);
                  entity.polygon.extrudedHeight = new ConstantProperty(1.5);
                  entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
                  entity.polygon.zIndex = new ConstantProperty(50);
                }
              });

              setTimeout(() => {
                if (viewerRef.current) {
                  const highlight = viewerRef.current.cesiumElement.dataSources.getByName('habitat-highlight')[0];
                  if (highlight) {
                    viewerRef.current.cesiumElement.dataSources.remove(highlight);
                  }
                }
              }, 3000);
            }

            if (!emitExpeditionReadyFromMapClick({
              lon: cartographicLocation.longitude,
              lat: cartographicLocation.latitude,
              atPointData,
              waypointData,
              species: [],
              rasterHabitats: rasterHabitatData,
              habitats: [],
              activeAffinities: [],
              availableAffinities: [],
              loadSpatialLayers,
            })) {
              EventBus.emit('cesium-location-selected', {
                species: [],
                rasterHabitats: rasterHabitatData,
                habitats: [],
                lon: cartographicLocation.longitude,
                lat: cartographicLocation.latitude,
              });
            }
          }

          const legacyHabitats = new Set<string>();
          speciesResult.species.forEach((species: Species) => {
            if (species.habitat_description) legacyHabitats.add(species.habitat_description);
            if (species.freshwater) legacyHabitats.add('freshwater');
            if (species.terrestrial) legacyHabitats.add('terrestrial');
            if (species.marine) legacyHabitats.add('marine');
          });

          const habitatList = Array.from(legacyHabitats);
          const habitatCount = rasterHabitatData.length;
          const topHabitat = rasterHabitatData.length > 0
            ? `${rasterHabitatData[0].habitat_type} (${rasterHabitatData[0].percentage}%)`
            : undefined;

          setInfoBoxData({
            lon: longitude,
            lat: latitude,
            habitats: habitatList,
            species: speciesResult.species,
            rasterHabitats: rasterHabitatData,
            bioregion: atPointData?.bioregion ?? undefined,
            habitatCount,
            topHabitat,
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
      removeBioregionLayer();
    }
  }, [isLoading, highlightedSpeciesSource, runPhaseRef, loadSpatialLayers, removeBioregionLayer]);

  return (
    <div className="w-full h-full relative">
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
          <ImageryLayer imageryProvider={imageryProvider} alpha={0.7} />
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
        <CesiumInfoBox
          data={infoBoxData}
          isLoading={isLoading}
          radiusKm={HABITAT_RADIUS_METERS / 1000}
          showBioregionPolygons={showBioregionPolygons}
          onToggleBioregionPolygons={() => setShowBioregionPolygons((value) => !value)}
        />
      )}
    </div>
  );
}

export default CesiumMap;
