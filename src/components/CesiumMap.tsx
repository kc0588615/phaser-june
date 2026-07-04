// src/components/CesiumMap.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Viewer, ImageryLayer, Entity, PointGraphics, LabelGraphics } from 'resium';
import {
  Ion,
  Cartesian2,
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
import { Compass, Layers, Maximize2, Search } from 'lucide-react';
import { EventBus } from '../game/EventBus';
import { deriveAvailableAffinities, getDefaultActiveAffinities } from '../expedition/affinities';
import type { AffinityType } from '../expedition/affinities';
import { speciesService } from '../lib/speciesService';
import type { Species } from '../types/database';
import type { ExpeditionData, RunNode, RunPhase } from '../types/expedition';
import type { FeatureFingerprint } from '../types/gis';
import { getAppConfig } from '../utils/config';
import { useCesiumTrail } from '../hooks/useCesiumTrail';
import { useEcoregionLayer } from '../hooks/useEcoregionLayer';
import { computeExpeditionRoutePolyline, normalizeRoutePolyline } from '../lib/expeditionRoute';
import { applyWaypointsToRunNodes } from '../lib/nodeScoring';
import type { ExpeditionWaypointResponse } from '../types/waypoints';
import { ANIMAL_MARKER, type EcoregionPreviewPick, type EcoregionProgress } from '../types/ecoregions';
import { cn } from '@/lib/utils';

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

interface PendingSelection {
  lon: number;
  lat: number;
  atPointData: AtPointData | null;
  waypointData: ExpeditionWaypointResponse | null;
  species: Species[];
  rasterHabitats: RasterHabitatSummary;
  habitats: string[];
  activeAffinities: AffinityType[];
  availableAffinities: AffinityType[];
  ecoregionId: number | null;
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

async function fetchEcoregionProgress(lon: number, lat: number): Promise<EcoregionProgress | null> {
  try {
    const response = await fetch(`/api/ecoregions/progress?lon=${lon}&lat=${lat}`);
    return response.ok ? response.json() as Promise<EcoregionProgress> : null;
  } catch (error) {
    console.warn('[CesiumMap] Failed to load ecoregion progress:', error);
    return null;
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
  ecoregionId?: number | null;
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
    ecoregionId: input.ecoregionId ?? null,
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
  return true;
}

interface CesiumMapProps {
  onSearchOpen?: () => void;
  expeditionPhase?: RunPhase;
}

const CesiumMap: React.FC<CesiumMapProps> = ({ onSearchOpen, expeditionPhase = 'idle' }) => {
  const viewerRef = useRef<any>(null);
  const [imageryProvider, setImageryProvider] = useState<UrlTemplateImageryProvider | null>(null);
  const [clickedLonLat, setClickedLonLat] = useState<{ lon: number, lat: number } | null>(null);
  const [infoBoxData, setInfoBoxData] = useState<{
    lon?: number;
    lat?: number;
    habitats: string[];
    species: Species[];
    rasterHabitats?: Array<{habitat_type: string; percentage: number}>;
    ecoregionProgress?: EcoregionProgress | null;
    bioregion?: {
      bioregion?: string | null;
      realm?: string | null;
      biome?: string | null;
    };
    habitatCount?: number;
    topHabitat?: string;
    message?: string | null;
  }>({ habitats: [], species: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [ecoregionProgress, setEcoregionProgress] = useState<EcoregionProgress | null>(null);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [selectedEcoregion, setSelectedEcoregion] = useState<EcoregionPreviewPick | null>(null);
  const [highlightedSpeciesSource, setHighlightedSpeciesSource] = useState<GeoJsonDataSource | null>(null);
  const [showEcoregionLayer, setShowEcoregionLayer] = useState(true);

  // Extracted hooks
  useCesiumTrail(viewerRef);
  const ecoregionLayerEnabled = showEcoregionLayer && expeditionPhase === 'idle';
  const { focusedEcoregion, isPreviewLoading, pickEcoregionAtPosition } = useEcoregionLayer(viewerRef, ecoregionLayerEnabled);
  const contextEcoregion = selectedEcoregion ?? focusedEcoregion;
  const expeditionBlocksMapClick = expeditionPhase !== 'idle';

  useEffect(() => {
    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || 'YOUR_FALLBACK_TOKEN';
  }, []);

  useEffect(() => {
    if (!showEcoregionLayer) setSelectedEcoregion(null);
  }, [showEcoregionLayer]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      viewerRef.current?.cesiumElement?.resize?.();
    });
    const timeoutId = window.setTimeout(() => {
      viewerRef.current?.cesiumElement?.resize?.();
    }, 120);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [expeditionPhase]);

  const recenterGlobe = useCallback(() => {
    viewerRef.current?.cesiumElement?.camera?.flyHome?.(0.8);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err.message);
      });
      return;
    }
    document.exitFullscreen();
  }, []);

  const startPendingSelection = useCallback(() => {
    if (!pendingSelection) return;

    emitExpeditionReadyFromMapClick({
      ...pendingSelection,
    });
  }, [pendingSelection]);

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

        const response = await fetch(tileJsonUrl);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`TileJSON Error ${response.status}: ${text}`);
        }

        const tileJson = await response.json();
        if (!tileJson.tiles || tileJson.tiles.length === 0) {
          throw new Error("TileJSON missing 'tiles' array or 'tiles' array is empty.");
        }
        const templateUrl = tileJson.tiles[0];
        if (!templateUrl) {
          throw new Error("TileJSON 'tiles' array does not contain a valid URL template.");
        }

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
          } else {
            console.warn("Resium: Invalid TileJSON bounds.", tileJson.bounds);
          }
        }
      } catch (err: any) {
        console.error("Resium: Error loading habitat layer:", err);
        alert(`Failed to load habitat layer: ${err.message}`);
      }
    };

    setupImagery();
  }, []);

  const loadAreaDetails = useCallback((longitude: number, latitude: number) => {
    if (!viewerRef.current?.cesiumElement || isLoading) return;
    const viewer = viewerRef.current.cesiumElement;

    if (highlightedSpeciesSource) {
      viewer.dataSources.remove(highlightedSpeciesSource, true);
      setHighlightedSpeciesSource(null);
    }

    setClickedLonLat({ lon: longitude, lat: latitude });
    setEcoregionProgress(null);
    setPendingSelection(null);
    setInfoBoxData({ habitats: [], species: [], message: `Querying Lon: ${longitude.toFixed(4)}, Lat: ${latitude.toFixed(4)}` });
    setIsLoading(true);

    Promise.all([
      speciesService.getSpeciesInRadius(longitude, latitude, SPECIES_RADIUS_METERS),
      speciesService.getRasterHabitatDistribution(longitude, latitude),
      fetch(`/api/protected-areas/at-point?lon=${longitude}&lat=${latitude}&size=500`).then(r => r.ok ? r.json() as Promise<AtPointData> : null).catch(() => null),
      fetchWaypointData(longitude, latitude),
      fetchEcoregionProgress(longitude, latitude),
    ])
      .then(async ([speciesResult, rasterHabitats, atPointData, waypointData, progress]) => {
        setEcoregionProgress(progress);

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
                entity.polygon.material = new ColorMaterialProperty(CesiumColor.CYAN.withAlpha(0.22));
                entity.polygon.outline = new ConstantProperty(true);
                entity.polygon.outlineColor = new ConstantProperty(CesiumColor.CYAN);
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

          const legacyHabitats = new Set<string>();
          clickedSpecies.species.forEach((species: Species) => {
            if (species.habitat_description) legacyHabitats.add(species.habitat_description);

            if (species.freshwater) legacyHabitats.add('freshwater');
            if (species.terrestrial) legacyHabitats.add('terrestrial');
            if (species.marine) legacyHabitats.add('marine');
          });
          const habitatList = Array.from(legacyHabitats);

          const availableAffinities = deriveAvailableAffinities(clickedSpecies.species);
          setPendingSelection({
            lon: cartographicLocation.longitude,
            lat: cartographicLocation.latitude,
            atPointData,
            waypointData,
            species: clickedSpecies.species,
            rasterHabitats: rasterHabitatData,
            habitats: habitatList,
            activeAffinities: getDefaultActiveAffinities(availableAffinities),
            availableAffinities,
            ecoregionId: progress?.ecoregion?.ecoregion_id ?? null,
          });
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

          setPendingSelection({
            lon: cartographicLocation.longitude,
            lat: cartographicLocation.latitude,
            atPointData,
            waypointData,
            species: [],
            rasterHabitats: rasterHabitatData,
            habitats: [],
            activeAffinities: [],
            availableAffinities: [],
            ecoregionId: progress?.ecoregion?.ecoregion_id ?? null,
          });
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
          ecoregionProgress: progress,
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
  }, [isLoading, highlightedSpeciesSource]);

  const exploreSelectedArea = useCallback(() => {
    if (!selectedEcoregion || selectedEcoregion.lon == null || selectedEcoregion.lat == null) return;
    loadAreaDetails(selectedEcoregion.lon, selectedEcoregion.lat);
  }, [loadAreaDetails, selectedEcoregion]);

  const handleMapClick = useCallback((movement: any) => {
    if (!viewerRef.current?.cesiumElement || isLoading) return;

    if (expeditionBlocksMapClick) {
      setInfoBoxData({ habitats: [], species: [], message: 'Complete the current expedition first.' });
      return;
    }

    const viewer = viewerRef.current.cesiumElement;
    const pickedEcoregion = pickEcoregionAtPosition(movement.position);
    const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);

    if (!cartesian) {
      setSelectedEcoregion(null);
      setInfoBoxData({ habitats: [], species: [], message: null });
      setClickedLonLat(null);
      setEcoregionProgress(null);
      setPendingSelection(null);
      return;
    }

    if (showEcoregionLayer && pickedEcoregion) {
      const cartographic = Cartographic.fromCartesian(cartesian);
      const longitude = CesiumMath.toDegrees(cartographic.longitude);
      const latitude = CesiumMath.toDegrees(cartographic.latitude);
      setClickedLonLat({ lon: longitude, lat: latitude });
      setSelectedEcoregion({ ...pickedEcoregion, lon: longitude, lat: latitude });
      setEcoregionProgress(null);
      setPendingSelection(null);
      setInfoBoxData({ habitats: [], species: [], message: null });
      return;
    }

    const cartographic = Cartographic.fromCartesian(cartesian);
    const longitude = CesiumMath.toDegrees(cartographic.longitude);
    const latitude = CesiumMath.toDegrees(cartographic.latitude);
    setClickedLonLat({ lon: longitude, lat: latitude });
    setSelectedEcoregion(null);
    loadAreaDetails(longitude, latitude);
  }, [expeditionBlocksMapClick, isLoading, loadAreaDetails, pickEcoregionAtPosition, showEcoregionLayer]);

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

        {ecoregionProgress?.foundPoints.map((point) => (
          <Entity
            key={point.discovery_id}
            name={point.common_name || point.scientific_name || 'Discovered species'}
            position={Cartesian3.fromDegrees(point.lon, point.lat)}
          >
            <PointGraphics
              pixelSize={18}
              color={Color.fromCssColorString('#22d3ee').withAlpha(0.32)}
              outlineColor={Color.fromCssColorString('#22d3ee')}
              outlineWidth={2}
              disableDepthTestDistance={Number.POSITIVE_INFINITY}
            />
            <LabelGraphics
              text={ANIMAL_MARKER[point.animal_icon] ?? ANIMAL_MARKER.species}
              font="22px Inter, system-ui, sans-serif"
              fillColor={Color.WHITE}
              outlineColor={Color.BLACK}
              outlineWidth={2}
              pixelOffset={new Cartesian2(0, -22)}
              disableDepthTestDistance={Number.POSITIVE_INFINITY}
            />
          </Entity>
        ))}
      </Viewer>
      <ExploreMapOverlay
        info={infoBoxData}
        isLoading={isLoading}
        isPreviewLoading={isPreviewLoading}
        preview={contextEcoregion}
        progress={ecoregionProgress}
        hasSelection={Boolean(pendingSelection)}
        hasSelectedEcoregion={Boolean(selectedEcoregion)}
        layersActive={showEcoregionLayer}
        inRun={expeditionPhase !== 'idle'}
        onSearchOpen={onSearchOpen}
        onExplore={exploreSelectedArea}
        onStart={startPendingSelection}
        onCompass={recenterGlobe}
        onLayers={() => setShowEcoregionLayer((value) => !value)}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
}

function ExploreMapOverlay({
  info,
  isLoading,
  isPreviewLoading,
  preview,
  progress,
  hasSelection,
  hasSelectedEcoregion,
  layersActive,
  inRun,
  onSearchOpen,
  onExplore,
  onStart,
  onCompass,
  onLayers,
  onFullscreen,
}: {
  info: {
    species: Species[];
    topHabitat?: string;
    message?: string | null;
    bioregion?: { bioregion?: string | null; biome?: string | null };
  };
  isLoading: boolean;
  isPreviewLoading: boolean;
  preview: EcoregionPreviewPick | null;
  progress: EcoregionProgress | null;
  hasSelection: boolean;
  hasSelectedEcoregion: boolean;
  layersActive: boolean;
  inRun: boolean;
  onSearchOpen?: () => void;
  onExplore: () => void;
  onStart: () => void;
  onCompass: () => void;
  onLayers: () => void;
  onFullscreen: () => void;
}) {
  const ecoregion = progress?.ecoregion ?? null;
  const title = ecoregion?.bioregion
    ?? preview?.properties.ECO_NAME
    ?? info.bioregion?.bioregion
    ?? info.topHabitat?.replace(/\s+\([^)]*\)$/, '')
    ?? 'Explore Ecoregions';
  const previewSubtitle = preview
    ? [preview.properties.BIOME_NAME, preview.properties.REALM].filter(Boolean).join(' · ')
    : null;
  const subtitle = ecoregion?.biome ?? previewSubtitle ?? info.bioregion?.biome ?? 'Global biodiversity map';
  const speciesCount = hasSelection ? info.species.length : ecoregion?.total_species;
  const groups = progress?.groups ?? [];
  const progressLabel = groups.length > 0
    ? groups.slice(0, 2).map((group) => `${group.animal_type} ${group.found_species}/${group.total_species}`).join(' · ')
    : speciesCount != null && speciesCount > 0 ? `${speciesCount} species` : preview?.properties.NNH_NAME ?? 'Collection target pending';
  const showCard = !inRun && Boolean(hasSelectedEcoregion || hasSelection || isLoading || info.message);
  const canExplore = Boolean(preview?.lon != null && preview?.lat != null && !hasSelection && !isLoading);
  const canStart = hasSelection && !isLoading && (speciesCount ?? 0) > 0;
  const buttonLabel = isLoading
    ? 'Loading Area'
    : canExplore
      ? 'Explore Area'
      : canStart
        ? 'Start Expedition'
        : hasSelection && !isLoading
          ? 'No Species Here'
          : 'Select Ecoregion';
  const actionDisabled = isLoading || (!canExplore && !canStart);
  const runAction = canStart ? onStart : onExplore;

  // During active runs, hide all overlay UI — map shows only route + markers
  if (inRun) {
    return <div className="pointer-events-none absolute inset-0" style={{ zIndex: 2500 }} />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 text-ds-text-primary" style={{ zIndex: 2500 }}>
      <div
        className="absolute left-5 right-5 pointer-events-auto"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}
      >
        <button
          type="button"
          onClick={onSearchOpen}
          className="glass-bg h-14 w-full rounded-[28px] border border-ds-subtle shadow-card flex items-center gap-3 px-5 text-left text-ds-text-muted"
          aria-label="Search species, locations, biomes"
        >
          <Search className="size-6 shrink-0 text-ds-text-secondary" strokeWidth={2} />
          <span className="truncate text-[15px] sm:text-base">Search species, locations, biomes</span>
        </button>
        <GlobeContextBar preview={preview} />
      </div>

      <div
        className="absolute right-4 flex flex-col gap-3 pointer-events-auto"
        style={{ bottom: showCard ? 'calc(env(safe-area-inset-bottom, 0px) + 282px)' : 'calc(env(safe-area-inset-bottom, 0px) + 114px)' }}
      >
        <MapControlButton label="Recenter map" onClick={onCompass}><Compass /></MapControlButton>
        <MapControlButton label="Toggle ecoregion layers" active={layersActive} onClick={onLayers}><Layers /></MapControlButton>
        <MapControlButton label="Toggle fullscreen" onClick={onFullscreen}><Maximize2 /></MapControlButton>
      </div>

      <div
        aria-hidden={!showCard}
        className={cn(
          'glass-bg shadow-card absolute left-4 right-4 rounded-[24px] border border-ds-subtle p-3 transition-[opacity,transform] duration-200 ease-out',
          showCard ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        )}
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)' }}
      >
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/25" />
        <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-3">
          <div className="h-[86px] rounded-[18px] border border-ds-subtle overflow-hidden bg-ds-bg">
            <div className="h-full w-full bg-[radial-gradient(circle_at_35%_18%,rgba(34,211,238,0.32),transparent_28%),linear-gradient(150deg,rgba(20,184,166,0.45),rgba(12,28,42,0.15)_42%,rgba(3,7,18,0.95)_72%),linear-gradient(32deg,transparent_43%,rgba(226,232,240,0.16)_44%,transparent_47%)]" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="truncate text-[20px] leading-tight font-semibold text-ds-text-primary">
              {isLoading ? 'Loading ecoregion' : isPreviewLoading && !preview ? 'Loading ecoregions' : title}
            </h2>
            <p className="mt-1 line-clamp-1 text-[12px] leading-snug text-ds-text-secondary">
              {subtitle}
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ds-text-secondary">
              <span className="font-semibold text-ds-cyan">{progressLabel}</span>
              {groups.length > 0 && (
                <>
                  <span className="text-ds-text-muted">·</span>
                  <span>{speciesCount ?? 0} species</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={runAction}
              disabled={actionDisabled || !showCard}
              tabIndex={showCard ? 0 : -1}
              className="mt-2.5 h-11 w-full rounded-full border-0 px-4 text-[15px] font-bold text-[#06101a] shadow-glow-cyan disabled:cursor-default disabled:text-ds-text-secondary disabled:shadow-none"
              style={{ background: canStart || canExplore ? 'var(--ds-gradient-cta)' : 'rgba(34,211,238,0.2)' }}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
        {info.message && !isLoading && (
          <div className="mt-2 truncate text-center text-[11px] text-ds-text-muted">{info.message}</div>
        )}
      </div>
    </div>
  );
}

function GlobeContextBar({ preview }: { preview: EcoregionPreviewPick | null }) {
  const subtitle = preview
    ? [preview.properties.BIOME_NAME, preview.properties.REALM].filter(Boolean).join(' · ')
    : '';

  return (
    <div
      aria-hidden={!preview}
      className={cn(
        'glass-bg mt-3 rounded-lg border border-ds-subtle px-4 py-3 shadow-card transition-[opacity,transform] duration-200 ease-out',
        preview ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      )}
    >
      <div className="truncate text-sm font-semibold text-ds-text-primary">{preview?.properties.ECO_NAME ?? 'Ecoregion'}</div>
      <div className="mt-0.5 truncate text-xs text-ds-text-secondary">{subtitle}</div>
    </div>
  );
}

function MapControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactElement<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`glass-bg shadow-card grid size-11 place-items-center rounded-full border transition-colors ${
        active ? 'border-ds-cyan/80 bg-ds-cyan/15' : 'border-ds-subtle'
      }`}
    >
      {React.cloneElement(children, {
        className: 'size-5 text-ds-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.75)]',
        strokeWidth: 2,
      })}
    </button>
  );
}

export default CesiumMap;
