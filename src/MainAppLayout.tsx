import { useRef, useEffect, useState, useCallback } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame';
import CesiumMap from './components/CesiumMap';
import { SpeciesPanel } from './components/SpeciesPanel';
import SpeciesList from './components/SpeciesList';
import UserMenu from './components/UserMenu';
import { EventBus } from './game/EventBus';
import type { EventPayloads } from './game/EventBus';
import { toast, Toaster } from 'sonner';
import { PiListMagnifyingGlass, PiBookOpenTextLight, PiGlobeHemisphereWestThin } from "react-icons/pi";
import type { RunState, SouvenirDef } from '@/types/expedition';
import { createEmptyResourceWallet } from '@/types/expedition';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { ExpeditionBriefing } from './components/ExpeditionBriefing';
import { RunTrack } from './components/RunTrack';
import { ActiveEncounterPanel } from './components/ActiveEncounterPanel';
import { GemWallet } from './components/GemWallet';
import { SouvenirPouch } from './components/SouvenirPouch';

/** Map node_type to resource gem weight on the board.
 *  Current runtime node types: riverbank_sweep, dense_canopy, urban_fringe,
 *  elevation_ridge, storm_window, custom, analysis. */
function resourceWeightForNode(node?: { node_type?: string; difficulty?: number }): number {
    const t = node?.node_type ?? '';
    // analysis nodes are pure knowledge — no resource gems on board
    if (t === 'analysis') return 0;
    // storm_window is the hardest encounter — slightly more resource pressure
    if (t === 'storm_window') return 0.40;
    // all other collection nodes
    return 0.35;
}

const INITIAL_RUN_STATE: RunState = {
    phase: 'idle',
    expedition: null,
    currentNodeIndex: 0,
    gemWallet: { nature_gem: 0, water_gem: 0, knowledge_gem: 0, craft_gem: 0 },
    resourceWallet: createEmptyResourceWallet(),
    knowledgeMatchSummary: {},
    equippedPassives: [],
    consumables: [],
    pendingNodeModifiers: [],
    currentBattleState: null,
    souvenirs: [],
};

function MainAppLayout() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'clues' | 'species'>('map');
    const [scrollToSpeciesId, setScrollToSpeciesId] = useState<number | null>(null);
    const [runState, setRunState] = useState<RunState>(INITIAL_RUN_STATE);

    // Store full expedition payload for re-emitting cesium-location-selected per node
    const expeditionPayloadRef = useRef<EventPayloads['expedition-data-ready'] | null>(null);
    const runIdRef = useRef<string | null>(null);
    const nodeIdsRef = useRef<string[]>([]);
    const hudRef = useRef<{ score: number; movesUsed: number }>({ score: 0, movesUsed: 0 });
    const nodeStartScoreRef = useRef<number>(0);
    const nodeObjectiveProgressRef = useRef<number>(0);
    const lastResolvedNodeRef = useRef<number>(-1);

    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
        if (phaserRef.current) {
            phaserRef.current.scene = scene;
        }
    };

    // --- Expedition event handlers ---

    const handleExpeditionDataReady = useCallback((data: EventPayloads['expedition-data-ready']) => {
        expeditionPayloadRef.current = data;
        setRunState({
            ...INITIAL_RUN_STATE,
            phase: 'briefing',
            expedition: data.expedition,
        });
    }, []);

    const handleExpeditionStart = useCallback(() => {
        setRunState(prev => ({ ...prev, phase: 'in-run' }));
        // Reset score tracking for this run
        hudRef.current = { score: 0, movesUsed: 0 };
        nodeStartScoreRef.current = 0;
        lastResolvedNodeRef.current = -1;
        const payload = expeditionPayloadRef.current;
        if (!payload) return;

        // Persist run to DB (fire-and-forget; don't block puzzle init)
        const locationKey = `${payload.lon.toFixed(4)},${payload.lat.toFixed(4)}`;
        fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lon: payload.lon,
                lat: payload.lat,
                locationKey,
                nodes: payload.expedition.nodes,
                bioregion: payload.expedition.bioregion?.bioregion ?? undefined,
                realm: payload.expedition.bioregion?.realm ?? undefined,
                biome: payload.expedition.bioregion?.biome ?? undefined,
            }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    runIdRef.current = data.runId;
                    nodeIdsRef.current = data.nodeIds;
                    console.log('Run session created:', data.runId);
                }
            })
            .catch(err => console.error('Failed to create run session:', err));

        // Emit cesium-location-selected to trigger Game scene puzzle init
        nodeObjectiveProgressRef.current = 0;
        const firstNode = payload.expedition.nodes[0];
        const firstBoardContext = buildNodeBoardContext({
            width: GRID_COLS,
            height: GRID_ROWS,
            obstacles: firstNode?.obstacles ?? [],
            nodeIndex: 0,
        });
        EventBus.emit('cesium-location-selected', {
            lon: payload.lon,
            lat: payload.lat,
            species: payload.species,
            rasterHabitats: payload.rasterHabitats,
            habitats: payload.habitats,
            difficulty: firstNode?.difficulty,
            obstacles: firstNode?.obstacles,
            requiredGems: firstNode?.requiredGems,
            objectiveTarget: firstNode?.objectiveTarget,
            nodeIndex: 0,
            events: firstNode?.events,
            boardContext: firstBoardContext,
            resourceWeight: resourceWeightForNode(firstNode),
        });
    }, []);

    const handleNodeAdvanceRequested = useCallback((data: EventPayloads['node-advance-requested']) => {
        setRunState(prev => {
            // Guard: only advance if actively in-run
            if (prev.phase !== 'in-run') return prev;
            if (data.nodeIndex !== prev.currentNodeIndex) return prev;
            if (data.nodeIndex <= lastResolvedNodeRef.current) return prev;

            const nodeOrder = prev.currentNodeIndex + 1; // 1-based for DB
            const nextIndex = prev.currentNodeIndex + 1;
            lastResolvedNodeRef.current = prev.currentNodeIndex;

            // Persist node completion with actual score/moves + objective progress
            const nodeScore = hudRef.current.score - nodeStartScoreRef.current;
            const nodeMoves = hudRef.current.movesUsed;
            const objProgress = nodeObjectiveProgressRef.current;
            if (runIdRef.current) {
                fetch(`/api/runs/${runIdRef.current}/nodes/${nodeOrder}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scoreEarned: Math.max(0, nodeScore),
                        movesUsed: nodeMoves,
                        objectiveProgress: objProgress,
                        souvenirs: prev.souvenirs.length > 0
                            ? prev.souvenirs.map(s => ({ id: s.id, name: s.name }))
                            : undefined,
                    }),
                }).catch(err => console.error('Failed to complete node:', err));
            }

            EventBus.emit('node-complete', { nodeIndex: prev.currentNodeIndex });
            // Next node starts from current cumulative score
            nodeStartScoreRef.current = hudRef.current.score;

            if (nextIndex >= (prev.expedition?.nodes.length ?? 6)) {
                // Persist resource wallet to session metadata
                if (runIdRef.current) {
                    const wallet = { ...prev.resourceWallet };
                    const rid = runIdRef.current;
                    setTimeout(() => {
                        fetch(`/api/runs/${rid}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ resourceWallet: wallet }),
                        }).catch(err => console.error('Failed to persist resource wallet:', err));
                    }, 0);
                }
                setTimeout(() => toast.success('Expedition Complete!', { duration: 3000 }), 0);
                return { ...prev, phase: 'complete' as const, currentNodeIndex: nextIndex };
            }
            // Advance to next node
            setTimeout(() => toast(`Node ${nodeOrder} complete — next up!`, { duration: 1500 }), 0);
            const payload = expeditionPayloadRef.current;
            if (payload) {
                const nextNode = prev.expedition?.nodes[nextIndex];
                nodeObjectiveProgressRef.current = 0;
                setTimeout(() => {
                    const nextBoardContext = buildNodeBoardContext({
                        width: GRID_COLS,
                        height: GRID_ROWS,
                        obstacles: nextNode?.obstacles ?? [],
                        nodeIndex: nextIndex,
                    });
                    EventBus.emit('cesium-location-selected', {
                        lon: payload.lon,
                        lat: payload.lat,
                        species: payload.species,
                        rasterHabitats: payload.rasterHabitats,
                        habitats: payload.habitats,
                        difficulty: nextNode?.difficulty,
                        obstacles: nextNode?.obstacles,
                        requiredGems: nextNode?.requiredGems,
                        objectiveTarget: nextNode?.objectiveTarget,
                        nodeIndex: nextIndex,
                        events: nextNode?.events,
                        boardContext: nextBoardContext,
                        resourceWeight: resourceWeightForNode(nextNode),
                    });
                }, 100);
            }
            return { ...prev, currentNodeIndex: nextIndex };
        });
    }, []);

    /** Accumulate resource gem rewards from board matches into runState.resourceWallet. */
    const handleResourceWalletUpdate = useCallback((data: EventPayloads['resource-wallet-updated']) => {
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            const w = { ...prev.resourceWallet };
            for (const [k, v] of Object.entries(data.wallet)) {
                if (k in w) (w as any)[k] += v;
            }
            return { ...prev, resourceWallet: w };
        });
    }, []);

    const handleRunReset = useCallback(() => {
        runIdRef.current = null;
        nodeIdsRef.current = [];
        hudRef.current = { score: 0, movesUsed: 0 };
        nodeStartScoreRef.current = 0;
        lastResolvedNodeRef.current = -1;
        setRunState(INITIAL_RUN_STATE);
        EventBus.emit('game-reset', undefined);
    }, []);

    // Track latest HUD state for persisting score/moves on node-complete
    const handleHudUpdate = useCallback((data: EventPayloads['game-hud-updated']) => {
        hudRef.current = { score: data.score, movesUsed: data.movesUsed };
    }, []);

    const handleObjectiveUpdate = useCallback((data: EventPayloads['node-objective-updated']) => {
        nodeObjectiveProgressRef.current = data.progress;
    }, []);

    const handleSouvenirDrop = useCallback((data: { souvenir: SouvenirDef }) => {
        setRunState(prev => prev.phase === 'in-run'
            ? { ...prev, souvenirs: [...prev.souvenirs, data.souvenir] }
            : prev
        );
    }, []);

    // Handle show-species-list event
    useEffect(() => {
        const handleShowSpeciesList = (data: { speciesId: number }) => {
            setScrollToSpeciesId(data.speciesId);
            setViewMode('species');
        };

        EventBus.on('show-species-list', handleShowSpeciesList);
        EventBus.on('expedition-data-ready', handleExpeditionDataReady);
        EventBus.on('expedition-start', handleExpeditionStart);
        EventBus.on('node-advance-requested', handleNodeAdvanceRequested);
        EventBus.on('game-hud-updated', handleHudUpdate);
        EventBus.on('node-objective-updated', handleObjectiveUpdate);
        EventBus.on('souvenir-dropped', handleSouvenirDrop);
        EventBus.on('resource-wallet-updated', handleResourceWalletUpdate);

        return () => {
            EventBus.off('show-species-list', handleShowSpeciesList);
            EventBus.off('expedition-data-ready', handleExpeditionDataReady);
            EventBus.off('expedition-start', handleExpeditionStart);
            EventBus.off('node-advance-requested', handleNodeAdvanceRequested);
            EventBus.off('game-hud-updated', handleHudUpdate);
            EventBus.off('node-objective-updated', handleObjectiveUpdate);
            EventBus.off('souvenir-dropped', handleSouvenirDrop);
            EventBus.off('resource-wallet-updated', handleResourceWalletUpdate);
        };
    }, [handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleHudUpdate, handleObjectiveUpdate, handleSouvenirDrop, handleResourceWalletUpdate]);

    const appStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
    };
    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%',
        height: '60%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    };
    const cesiumContainerStyle: React.CSSProperties = {
        width: '100%',
        height: '40%',
        minHeight: '0px',
        borderTop: '2px solid #555',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column'
    };

    const inRun = runState.phase === 'in-run';
    const showBriefing = runState.phase === 'briefing';
    const showComplete = runState.phase === 'complete';
    const currentNode = inRun && runState.expedition
        ? runState.expedition.nodes[runState.currentNodeIndex]
        : null;

    return (
        <div id="app-container" style={appStyle}>
            {/* Show game layout - position off-screen when in species view */}
            <div style={{
                position: viewMode === 'species' ? 'absolute' : 'relative',
                left: viewMode === 'species' ? '-9999px' : '0',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%'
            }}>
                {/* RunTrack bar above Phaser canvas */}
                <div style={{ display: inRun && runState.expedition ? 'block' : 'none' }}>
                    {runState.expedition && (
                        <RunTrack nodes={runState.expedition.nodes} currentNodeIndex={runState.currentNodeIndex} />
                    )}
                </div>

                <div id="phaser-game-wrapper" style={phaserGameWrapperStyle}>
                    <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />

                    {/* ActiveEncounterPanel overlay inside phaser wrapper */}
                    {inRun && currentNode && (
                        <ActiveEncounterPanel
                            node={currentNode}
                            nodeIndex={runState.currentNodeIndex}
                            onComplete={() => EventBus.emit('node-advance-requested', {
                                nodeIndex: runState.currentNodeIndex,
                                reason: 'analysis_complete',
                                source: 'panel',
                            })}
                        />
                    )}

                    {/* GemWallet + SouvenirPouch fixed inside phaser wrapper */}
                    {inRun && (
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 50, display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                            <GemWallet wallet={runState.resourceWallet} />
                            {runState.souvenirs.length > 0 && (
                                <SouvenirPouch souvenirs={runState.souvenirs} />
                            )}
                        </div>
                    )}
                </div>

                <div id="cesium-map-wrapper" style={cesiumContainerStyle}>
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                }}>
                    <UserMenu />
                    <button
                        style={{
                            padding: '5px 10px',
                            backgroundColor: 'rgba(42, 42, 42, 0.8)',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={() => setViewMode('species')}
                        title="Species List"
                    >
                        <PiBookOpenTextLight size={18} />
                    </button>
                    <button
                        style={{
                            padding: '5px 10px',
                            backgroundColor: 'rgba(42, 42, 42, 0.8)',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={() => setViewMode(viewMode === 'map' ? 'clues' : 'map')}
                        title={viewMode === 'map' ? 'Clue List' : 'Show Map'}
                    >
                        {viewMode === 'map' ? <PiListMagnifyingGlass size={18} /> : <PiGlobeHemisphereWestThin size={18} />}
                    </button>
                </div>

                {/* Keep all components mounted but show/hide with CSS */}
                <div style={{
                    display: (viewMode === 'map' && !showBriefing) ? 'block' : 'none',
                    height: '100%',
                    width: '100%'
                }}>
                    <CesiumMap />
                </div>

                {/* ExpeditionBriefing replaces bottom area when briefing */}
                <div style={{
                    display: showBriefing ? 'block' : 'none',
                    height: '100%',
                    width: '100%',
                }}>
                    {runState.expedition && (
                        <ExpeditionBriefing
                            expedition={runState.expedition}
                            onStart={() => EventBus.emit('expedition-start', {} as Record<string, never>)}
                        />
                    )}
                </div>

                {/* Run completion summary */}
                {showComplete && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '12px',
                        fontFamily: 'sans-serif',
                        padding: '16px',
                    }}>
                        <div style={{ color: '#22d3ee', fontSize: '22px', fontWeight: 700 }}>
                            Expedition Complete!
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 700 }}>
                            {hudRef.current.score} pts
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                            {([
                                { key: 'nature' as const, color: '#34d399', label: '🍃 Nature' },
                                { key: 'water' as const, color: '#38bdf8', label: '💧 Water' },
                                { key: 'knowledge' as const, color: '#cbd5e1', label: '📘 Knowledge' },
                                { key: 'craft' as const, color: '#fb923c', label: '🔧 Craft' },
                            ]).map(({ key, color, label }) => (
                                <div key={key} style={{ textAlign: 'center' }}>
                                    <div style={{ color, fontWeight: 700, fontSize: '18px' }}>
                                        {runState.resourceWallet[key]}
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {runState.expedition?.nodes.length ?? 6} nodes completed
                        </div>
                        <button
                            onClick={handleRunReset}
                            style={{
                                marginTop: '8px',
                                padding: '8px 24px',
                                fontSize: '14px',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                            }}
                        >
                            New Expedition
                        </button>
                    </div>
                )}

                {/* Always mounted SpeciesPanel - visible when viewMode === 'clues' */}
                <SpeciesPanel
                    toastsEnabled={viewMode === 'map'}
                    style={{
                        display: viewMode === 'clues' ? 'block' : 'none',
                        height: '100%',
                        width: '100%',
                        overflow: 'auto',
                        position: 'relative'
                    }}
                />
            </div>
            </div>

            {/* Full-page species view - keep mounted to preserve state */}
            <div style={{
                display: viewMode === 'species' ? 'block' : 'none',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: '#0f172a',
                zIndex: 2000
            }}>
                <SpeciesList
                    onBack={() => {
                        setViewMode('map');
                        setScrollToSpeciesId(null);
                    }}
                    scrollToSpeciesId={scrollToSpeciesId}
                />
            </div>

            <Toaster
                position="bottom-right"
                richColors
                theme="dark"
                closeButton
                expand
                visibleToasts={3}
                toastOptions={{
                    classNames: {
                        toast: "bg-slate-800 border-slate-700 text-slate-100",
                        title: "text-cyan-300",
                        description: "text-slate-300",
                        actionButton: "bg-slate-600 text-white hover:bg-slate-500",
                    },
                }}
            />
        </div>
    );
}

export default MainAppLayout;
