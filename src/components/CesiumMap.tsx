// src/components/CesiumMap.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Viewer, ImageryLayer, Entity, EllipseGraphics } from 'resium';
import {
  Ion,
  Cartesian3,
  Color,
  Rectangle,
  WebMercatorTilingScheme,
  UrlTemplateImageryProvider,
  TextureMinificationFilter,
  TextureMagnificationFilter,
  HeightReference,
  ScreenSpaceEventType,
  Math as CesiumMath,
  Credit,
  Cartographic
} from 'cesium';
import { EventBus } from '../game/EventBus.js'; // Adjust path as needed

// Configuration (Consider moving to a config file or passing as props)
// const YOUR_CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiZWRiZWM1OC02NGQ4LTQxN2UtYTJmMy01ZWRjMmM3YmEwN2YiLCJpZCI6Mjk1MzAwLCJpYXQiOjE3NDQ5OTk0MTh9.HBoveH42derVYybno6upJzVCOkxLDji6VOj2TqSwpjs'; // Replace with your token
const TITILER_BASE_URL = "http://localhost:8000"; // Your TiTiler backend
const GAME_API_BASE_URL = "http://localhost:8000"; // Your Game API backend
const COG_PATH = "C:/OSGeo4W/geoTif/habitat_cog.tif"; // Path accessible by TiTiler server
const HABITAT_RADIUS_METERS = 100000.0;
const SPECIES_RADIUS_METERS = 10000.0;

const CesiumMap: React.FC = () => { // Changed to React.FC for consistency
  const viewerRef = useRef<any>(null); // Typed viewerRef for Resium
  const [imageryProvider, setImageryProvider] = useState<UrlTemplateImageryProvider | null>(null); // Typed state
  const [clickedPosition, setClickedPosition] = useState<Cartesian3 | null>(null); // Cartesian3
  const [clickedLonLat, setClickedLonLat] = useState<{ lon: number, lat: number } | null>(null); // { lon, lat }
  const [infoBoxData, setInfoBoxData] = useState<any>({ habitats: [], species: [] }); // Consider defining a type for infoBoxData
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
    const encodedCOGPath = encodeURIComponent(COG_PATH);
    const colormapName = "habitat_custom"; // From your backend setup
    const tms = "WebMercatorQuad";
    const tileJsonUrl = `${TITILER_BASE_URL}/cog/${tms}/tilejson.json?url=${encodedCOGPath}&colormap_name=${colormapName}&nodata=0`;

    console.log("Resium: Requesting TileJSON from:", tileJsonUrl);
    fetch(tileJsonUrl)
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => { throw new Error(`TileJSON Error ${response.status}: ${text}`); });
        }
        return response.json();
      })
      .then(tileJson => {
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
      })
      .catch(err => {
        console.error("Resium: Error loading habitat layer:", err);
        alert(`Failed to load habitat layer: ${err.message}`);
      });
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

      const queryUrl = `${GAME_API_BASE_URL}/api/location_info/?lon=${longitude}&lat=${latitude}`;
      console.log("Resium: Calling API:", queryUrl);

      fetch(queryUrl)
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => { throw new Error(`API Error ${response.status}: ${text}`); });
          }
          return response.json();
        })
        .then(data => {
          console.log("Resium: API Response:", data);
          setInfoBoxData({
            lon: longitude,
            lat: latitude,
            habitats: data.habitats || [],
            species: data.species || [],
            message: null
          });
          EventBus.emit('cesium-location-selected', {
            lon: longitude,
            lat: latitude,
            habitats: data.habitats || [],
            species: data.species || []
          });
        })
        .catch(err => {
          console.error("Resium: Error calling game API:", err);
          setInfoBoxData({ message: `Error: ${err.message}` });
        })
        .finally(() => {
            setIsLoading(false);
        });
    } else {
      setShowInfoBox(true);
      setInfoBoxData({ message: 'Click on the globe to query location.' });
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
            <>
              <p><b>Location:</b> Lon: {infoBoxData.lon?.toFixed(4)}, Lat: {infoBoxData.lat?.toFixed(4)}</p>
              <p><b>Habitats (within {HABITAT_RADIUS_METERS / 1000}km):</b> {infoBoxData.habitats.length > 0 ? infoBoxData.habitats.join(', ') : 'None'}</p>
              <p><b>Species (near {SPECIES_RADIUS_METERS / 1000}km):</b> {infoBoxData.species.length > 0 ? infoBoxData.species.join(', ') : 'None'}</p>
            </>
          )}
          {isLoading && <p><em>Loading...</em></p>}
        </div>
      )}
    </div>
  );
}

export default CesiumMap;