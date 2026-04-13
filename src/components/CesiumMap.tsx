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
import { speciesService } from '../lib/speciesService';
import type { Species } from '../types/database';
import { getAppConfig } from '../utils/config';
import { CesiumInfoBox } from './CesiumInfoBox';
import { useCesiumFullscreen } from '../hooks/useCesiumFullscreen';
import { useCesiumTrail } from '../hooks/useCesiumTrail';

const TITILER_BASE_URL = process.env.NEXT_PUBLIC_TITILER_BASE_URL || "https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com";
const COG_URL = process.env.NEXT_PUBLIC_COG_URL || "https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif";
const HABITAT_RADIUS_METERS = 10000.0;
const SPECIES_RADIUS_METERS = 10000.0;

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
    habitatCount?: number;
    topHabitat?: string;
    message?: string | null;
  }>({ habitats: [], species: [] });
  const [showInfoBox, setShowInfoBox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedSpeciesSource, setHighlightedSpeciesSource] = useState<GeoJsonDataSource | null>(null);

  // Extracted hooks
  useCesiumFullscreen(viewerRef);
  const { runPhaseRef, loadSpatialLayers } = useCesiumTrail(viewerRef);

  useEffect(() => {
    Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || 'YOUR_FALLBACK_TOKEN';
  }, []);

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
        fetch(`/api/protected-areas/at-point?lon=${longitude}&lat=${latitude}&size=500`).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
        .then(async ([speciesResult, rasterHabitats, atPointData]) => {
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
                      ogc_fid: species.ogc_fid,
                      comm_name: species.common_name,
                      sci_name: species.scientific_name
                    },
                    geometry: species.wkb_geometry
                  });
                } catch (geoError) {
                  console.warn(`Failed to process geometry for species ${species.ogc_fid}:`, geoError);
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
              if (species.aquatic) legacyHabitats.add('aquatic');
              if (species.freshwater) legacyHabitats.add('freshwater');
              if (species.terrestrial) legacyHabitats.add('terrestrial');
              if (species.marine) legacyHabitats.add('marine');
            });
            const habitatList = Array.from(legacyHabitats);

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
              loadSpatialLayers(cartographicLocation.longitude, cartographicLocation.latitude);
            } else {
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

          const legacyHabitats = new Set<string>();
          speciesResult.species.forEach((species: Species) => {
            if (species.habitat_description) legacyHabitats.add(species.habitat_description);
            if (species.aquatic) legacyHabitats.add('aquatic');
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
    }
  }, [isLoading, highlightedSpeciesSource, runPhaseRef, loadSpatialLayers]);

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
        <CesiumInfoBox data={infoBoxData} isLoading={isLoading} radiusKm={HABITAT_RADIUS_METERS / 1000} />
      )}
    </div>
  );
}

export default CesiumMap;
