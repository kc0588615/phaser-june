import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { EventBus } from '@/game/EventBus';
import { ExpeditionMapHud } from '@/components/ExpeditionMapHud';
import { createEmptyEvidenceCharges } from '@/expedition/evidenceFamilies';
import { parseTerrainSnapshot } from '@/terrain/terrain';
import type { IRefPhaserGame } from '@/PhaserGame';
import type { RunState } from '@/types/expedition';
import type { ExpeditionMapView } from '@/expedition/mapView';
import peru from '../../tests/fixtures/terrain/variety-peru-stride8.json';

const PhaserGame = dynamic(() => import('@/PhaserGame').then(mod => mod.PhaserGame), { ssr: false });

const terrain = parseTerrainSnapshot(peru);
const waypoint = {
  slot: 1 as const, waypointType: 'protected_area' as const, nodeRole: 'protected_area' as const,
  name: 'Peru stride-8', lon: -76, lat: -10, distKm: 0, rankScore: 1, sourceTable: null, sourceId: null, fallback: true,
};
const node = {
  node_type: 'custom', difficulty: 1 as const, obstacles: [], events: [], rationale: 'variety fixture',
  obstacleFamily: null, waypoint, terrain,
};
const runState: RunState = {
  runId: 'terrain-variety-fixture', phase: 'mystery', currentNodeIndex: 0, bankedScore: 0, finalScore: null,
  visitedWaypointSlot: 0, resolvedSpeciesId: null, resolvedExplanationId: null, fieldFacts: [], caseResolution: null,
  expedition: {
    nodes: [node, { ...node, terrain: undefined }, { ...node, terrain: undefined }],
    bioregion: null, protectedAreas: [], activeAffinities: [], availableAffinities: [],
    primaryNodeFamily: 'protected_node', primaryVariant: 'forest', modifierNodes: [], signals: {},
  },
  caseState: {
    version: 4,
    claims: { species: 'open', explanation: 'open', wrongClaims: 0 },
    hypotheses: {}, explanationFeedback: {}, stage: 'board', candidateIds: [1, 2, 3, 4, 5, 6], profiles: [], observations: [], eliminatedIds: [],
    guessResult: null, lastFeedback: null, diagnosisFeedback: null, objectiveProgress: 0, objectiveTarget: 6,
    nodeOutcomes: [null, null, null], evidenceCharges: createEmptyEvidenceCharges(), carriedCharges: createEmptyEvidenceCharges(),
    offeredFamilies: [], selectedFamilies: [], travelEntry: null, hintFeed: [], eliminationReasons: {}, factLedger: [],
    mystery: {
      id: 'fixture', title: 'Terrain variety', incident: 'Fixture.', atmosphere: '', question: '',
      location: { label: 'Peru', basis: 'recorded clip', confidence: 'contextual' },
      explanationChoices: [],
    },
    mapView: {
      bounds: [-77, -11, -75, -9],
      route: [
        { nodeIndex: 0, lon: -76, lat: -10, biome: 'Forest', nearestFeature: 'Site 1' },
        { nodeIndex: 1, lon: -75.6, lat: -10, biome: 'Forest', nearestFeature: 'Site 2' },
        { nodeIndex: 2, lon: -75.2, lat: -10, biome: 'Forest', nearestFeature: 'Site 3' },
      ],
    } satisfies ExpeditionMapView,
  },
};

export function TerrainVarietyFixture() {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    EventBus.emit('map-location-selected', {
      lon: -76, lat: -10, habitats: [], species: [], rasterHabitats: [],
      nodeIndex: 0, moveBudget: 6, boardSeed: 91, obstacles: [], events: [], terrain,
    });
  }, [ready]);
  return (
    <>
      <Head>
        <title>Terrain variety fixture</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="flex h-dvh flex-col bg-slate-950 md:flex-row">
        <div className="min-h-[50%] flex-1">
          <PhaserGame
            ref={phaserRef}
            currentActiveScene={scene => {
              phaserRef.current = { game: phaserRef.current?.game ?? null, scene };
              if (scene.sys.settings.key === 'Game') setReady(true);
            }}
          />
        </div>
        <div className="h-[46%] min-h-[280px] md:h-full md:w-[360px]">
          <ExpeditionMapHud runState={runState} />
        </div>
      </main>
    </>
  );
}
