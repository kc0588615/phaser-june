import type { Map, GeoJSONSource, CameraOptions, MapMouseEvent } from 'maplibre-gl';
import { selectedTerrainCell, terrainBounds, terrainGeoJSON, type TerrainSelection, type TerrainSnapshotV1 } from './terrain';

export type TerrainMapMode = 'local' | 'region';
const SOURCE_ID = 'site-terrain';
const LAYERS = ['site-terrain-fill', 'site-terrain-missing', 'site-terrain-lines', 'site-terrain-selected', 'site-terrain-locator'];

/** Camera and layers are presentation-only; this controller never fetches or moves gems. */
export class TerrainMapController {
  private terrain?: TerrainSnapshotV1;
  private mode: TerrainMapMode = 'region';
  private selection: TerrainSelection | null = null;
  private regionCamera?: CameraOptions;

  constructor(private map: Map, private onSelect: (selection: TerrainSelection) => void) {
    map.on('style.load', this.draw);
    map.on('click', this.click);
    map.on('resize', this.fitLocal);
  }

  update(terrain: TerrainSnapshotV1 | undefined, mode: TerrainMapMode, fullscreen: boolean): void {
    const changedSite = this.terrain?.id !== terrain?.id;
    const nextMode = terrain ? mode : 'region';
    const enteringLocal = nextMode === 'local' && this.mode !== 'local';
    if (enteringLocal) this.regionCamera = {
      center: this.map.getCenter(), zoom: this.map.getZoom(), bearing: this.map.getBearing(), pitch: this.map.getPitch(),
    };
    const leavingLocal = this.mode === 'local' && nextMode === 'region';
    this.terrain = terrain;
    this.mode = nextMode;
    if (changedSite) this.selection = null;
    this.map.stop();
    // Lower minimum first when leaving Local; raise maximum first when entering.
    this.map.setMinZoom(nextMode === 'local' ? 2 : fullscreen ? 2 : 5);
    this.map.setMaxZoom(nextMode === 'local' ? 20 : fullscreen ? 13 : 10);
    if (nextMode === 'local') this.map.setMinZoom(12);
    if (nextMode === 'local' && terrain && (changedSite || enteringLocal)) {
      this.fitLocal();
    } else if (leavingLocal && this.regionCamera) this.map.jumpTo(this.regionCamera);
    this.draw();
  }

  select(selection: TerrainSelection): void {
    if (!selectedTerrainCell(this.terrain, selection)) return;
    this.selection = selection;
    this.draw();
  }

  private fitLocal = () => {
    if (this.mode !== 'local' || !this.terrain) return;
    const [west, south, east, north] = terrainBounds(this.terrain);
    this.map.fitBounds([[west, south], [east, north]], { padding: 24, duration: 0, maxZoom: 20, bearing: 0, pitch: 0 });
  };

  private click = (event: MapMouseEvent) => {
    if (this.mode !== 'local' || !this.terrain || !this.map.getLayer(LAYERS[0])) return;
    const feature = this.map.queryRenderedFeatures(event.point, { layers: [LAYERS[0]] })[0];
    if (typeof feature?.properties?.id !== 'string') return;
    const selection = { snapshotId: this.terrain.id, cellId: feature.properties.id };
    if (selectedTerrainCell(this.terrain, selection)) this.onSelect(selection);
  };

  private draw = () => {
    const map = this.map;
    if (!map.getStyle()) return;
    const local = this.mode === 'local';
    for (const id of ['expedition-route-casing', 'expedition-route-line']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', local ? 'none' : 'visible');
    }
    map.getContainer().querySelectorAll<HTMLElement>('.map-site-marker').forEach(marker => { marker.style.display = local ? 'none' : ''; });
    if (!this.terrain) {
      for (const id of LAYERS) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      return;
    }
    const data: GeoJSON.FeatureCollection = terrainGeoJSON(this.terrain);
    const [west, south, east, north] = terrainBounds(this.terrain);
    data.features.push({ type: 'Feature', properties: { locator: true }, geometry: { type: 'Point', coordinates: [(west + east) / 2, (south + north) / 2] } });
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource(SOURCE_ID, { type: 'geojson', data });
      map.addLayer({ id: LAYERS[0], type: 'fill', source: SOURCE_ID, filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.85 } });
      map.addLayer({ id: LAYERS[1], type: 'line', source: SOURCE_ID, filter: ['==', 'valid', false], paint: { 'line-color': '#e2e8f0', 'line-width': 2, 'line-dasharray': [2, 2] } });
      map.addLayer({ id: LAYERS[2], type: 'line', source: SOURCE_ID, filter: ['==', '$type', 'Polygon'], paint: { 'line-color': '#d9f5ed', 'line-width': 1 } });
      map.addLayer({ id: LAYERS[3], type: 'line', source: SOURCE_ID, filter: ['==', 'id', ''], paint: { 'line-color': '#ffffff', 'line-width': 4 } });
      map.addLayer({ id: LAYERS[4], type: 'circle', source: SOURCE_ID, filter: ['==', 'locator', true], paint: { 'circle-radius': 7, 'circle-color': '#f0c879', 'circle-stroke-color': '#142a2b', 'circle-stroke-width': 2 } });
    }
    map.setFilter(LAYERS[3], ['==', 'id', this.selection?.cellId ?? '']);
    for (const id of LAYERS.slice(0, 4)) map.setLayoutProperty(id, 'visibility', local || id === LAYERS[2] ? 'visible' : 'none');
    map.setLayoutProperty(LAYERS[4], 'visibility', local ? 'none' : 'visible');
    for (const id of LAYERS) map.moveLayer(id);
  };

  destroy(): void {
    this.map.off('style.load', this.draw);
    this.map.off('click', this.click);
    this.map.off('resize', this.fitLocal);
  }
}
