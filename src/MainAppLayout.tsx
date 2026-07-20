// MainAppLayout — the top-level shell of the app.
//
// It mounts the three big surfaces once and keeps them alive for the whole
// session: the MapLibre globe, the Phaser match-3 board
// (PhaserGame), and the species/clue panels. Views are switched by toggling
// CSS visibility rather than unmounting, because unmounting would tear down
// EventBus listeners and Phaser's canvas mid-run.
//
// Run state (phase, score, clues) lives in ExpeditionContext; this file only
// decides *what is visible* for the current phase and tab.
import { useRef, useEffect, useState, useCallback } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame';
import MapLibreExploreMap from './components/MapLibreExploreMap';
import { SpeciesPanel } from './components/SpeciesPanel';
import SpeciesList from './components/SpeciesList';
import { useAuthBridge } from './hooks/useAuthBridge';
import { useExpedition } from './contexts/ExpeditionContext';
import { GameBridgeProvider } from './contexts/GameBridgeContext';
import { ExpeditionProvider } from './contexts/ExpeditionContext';
import { EventBus } from './game/EventBus';
import { Toaster } from 'sonner';
import { BottomTabBar } from './components/BottomTabBar';
import type { BaseTab } from './components/BottomTabBar';
import { ExpeditionBriefing } from './components/ExpeditionBriefing';
import { FieldNotebook } from './components/FieldNotebook';
import { GemSignalStrip } from './components/GemSignalStrip';
import { CandidateRoster } from './components/CandidateRoster';
import { EvidenceFamilyRail } from './components/EvidenceFamilyRail';
import { FieldHintTicker } from './components/FieldHintTicker';
import { EvidenceOnboarding } from './components/EvidenceOnboarding';
import { ExpeditionLauncher } from './components/ExpeditionLauncher';
import { ExpeditionMapHud } from './components/ExpeditionMapHud';
import { ProfileContent } from './components/ProfileContent';
import { RunCompleteSummary } from './components/RunCompleteSummary';
import { GlassPanel } from '@/components/ui/glass-panel';

function ProfileTabContent() {
    return (
        <div className="pt-12">
            <h1 className="text-ds-heading-lg px-4 mb-4">Field Profile</h1>
            <ProfileContent inline />
        </div>
    );
}

const APP_STYLE: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
};

function MainAppLayoutInner() {
    useAuthBridge();
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'species'>('map');
    const [scrollToSpeciesId, setScrollToSpeciesId] = useState<number | null>(null);
    const [baseTab, setBaseTab] = useState<BaseTab>('explore');

    const {
        runState, boardOpacity,
        handleRunResume, handleRunReset,
        handleCommitInterpretation, handleChooseMethod, handleChooseEvidenceFamily, handleGuess,
        onShowSpeciesList,
    } = useExpedition();

    // Register show-species-list handler (replaces EventBus listener)
    useEffect(() => {
        onShowSpeciesList.current = (speciesId: number) => {
            setScrollToSpeciesId(speciesId);
            setViewMode('species');
            setBaseTab('field-guide');
        };
        return () => { onShowSpeciesList.current = null; };
    }, [onShowSpeciesList]);

    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        if (phaserRef.current) phaserRef.current.scene = scene;
    };

    const inRun = runState.phase === 'mystery';
    const showBriefing = runState.phase === 'briefing';
    const showComplete = runState.phase === 'complete';
    // v3 runs swap the exploration globe for the dedicated regional HUD.
    // Both map components stay mounted so their state/listeners survive.
    // The HUD also stays up through a captured completion so it can fetch and
    // animate the answer-range reveal (the range API unlocks on completion).
    const showV3MapHud = runState.caseState?.version === 3
        && (inRun || (showComplete && runState.caseState.guessResult === 'correct'));
    const inExpedition = inRun || showBriefing || showComplete;
    const useSplitLayout = inRun;
    const activeWaypoint = inRun
        ? runState.expedition?.nodes[runState.currentNodeIndex]?.waypoint ?? null
        : null;

    const handleTabChange = useCallback((tab: BaseTab) => {
        setBaseTab(tab);
        setViewMode(tab === 'field-guide' ? 'species' : 'map');
    }, []);

    const handleStartExpeditionFromLauncher = useCallback(() => {
        setBaseTab('explore');
        setViewMode('map');
    }, []);

    const handleResumeExpeditionFromLauncher = useCallback(async (runId: string) => {
        const resumed = await handleRunResume(runId);
        if (resumed) {
            setBaseTab('explore');
            setViewMode('map');
        }
        return resumed;
    }, [handleRunResume]);

    useEffect(() => {
        if (!phaserRef.current?.game) return;
        const rafId = window.requestAnimationFrame(() => { phaserRef.current?.game?.scale.refresh(); });
        return () => window.cancelAnimationFrame(rafId);
    }, [useSplitLayout, viewMode]);

    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%', height: useSplitLayout ? '60%' : '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: useSplitLayout ? 'relative' : 'absolute',
        inset: useSplitLayout ? undefined : 0, overflow: 'hidden',
        visibility: useSplitLayout ? 'visible' : 'hidden',
        pointerEvents: useSplitLayout ? 'auto' : 'none', flexShrink: 0,
        borderTop: useSplitLayout ? '2px solid #555' : 'none',
    };
    const mapContainerStyle: React.CSSProperties = {
        width: '100%', height: useSplitLayout ? '40%' : '100%',
        minHeight: '0px',
        position: useSplitLayout ? 'relative' : 'absolute',
        inset: useSplitLayout ? undefined : 0, overflow: 'hidden',
        background: 'var(--ds-background)', display: 'flex', flexDirection: 'column',
        zIndex: 'var(--z-game)' as any,
    };

    return (
        <div id="app-container" style={APP_STYLE}>
            {/* Game layout — off-screen when not on explore/expedition tab */}
            <div style={{
                position: (baseTab !== 'explore' && baseTab !== 'expedition' && !inExpedition) ? 'absolute' : 'relative',
                left: (baseTab !== 'explore' && baseTab !== 'expedition' && !inExpedition) ? '-9999px' : '0',
                display: 'flex', flexDirection: 'column', width: '100%', height: '100%'
            }}>
                <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div id="map-wrapper" style={mapContainerStyle}>
                        {/* Exploration globe — hidden, paused, but not unmounted under the v3 HUD. */}
                        <div style={{
                            display: viewMode === 'map' && !showV3MapHud ? 'block' : 'none',
                            height: '100%', width: '100%'
                        }}>
                            <MapLibreExploreMap
                                expeditionPhase={runState.phase}
                                activeWaypoint={activeWaypoint}
                                active={viewMode === 'map' && !showV3MapHud}
                                onSearchOpen={() => { setViewMode('species'); setBaseTab('field-guide'); }}
                            />
                        </div>

                        {/* v3 2D map HUD (mystery phase + captured completion) */}
                        {showV3MapHud && (
                            <div style={{
                                display: viewMode === 'map' ? 'flex' : 'none',
                                height: '100%', width: '100%', minHeight: 0,
                            }}>
                                <ExpeditionMapHud runState={runState} />
                            </div>
                        )}

                        {/* Expedition Briefing */}
                        {showBriefing && runState.expedition && (
                            <div className="absolute inset-0 z-deduction flex flex-col justify-end">
                                <button
                                    type="button"
                                    aria-label="Close expedition briefing"
                                    className="border-0 p-0"
                                    style={{ flex: '0 0 25%', background: 'rgba(10,14,26,0.4)' }}
                                    onClick={() => EventBus.emit('game-reset', undefined)}
                                />
                                <div className="glass-bg border-t border-ds-subtle" style={{ flex: '0 0 75%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    <ExpeditionBriefing
                                        expedition={runState.expedition}
                                        onStart={() => EventBus.emit('expedition-start', {})}
                                        onClose={handleRunReset}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Run completion summary */}
                        {showComplete && (
                            <RunCompleteSummary
                                runState={runState}
                                onReset={handleRunReset}
                            />
                        )}

                        {/* SpeciesPanel always mounted but hidden */}
                        <SpeciesPanel toastsEnabled={viewMode === 'map'} style={{ display: 'none' }} />

                    </div>

                    <div id="phaser-game-wrapper" style={{ ...phaserGameWrapperStyle, opacity: inRun ? boardOpacity : 1, transition: 'opacity 0.8s ease' }}>
                        {inRun && (
                            <div className="absolute inset-0 z-base glass-bg" style={{ borderRadius: useSplitLayout ? 0 : '16px' }} />
                        )}

                        <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />

                        {inRun && runState.caseState?.version !== 3 && (
                            <GemSignalStrip runState={runState} />
                        )}

                        {inRun && runState.caseState && (
                            runState.caseState.version !== 3
                            || runState.caseState.stage === 'choose_evidence'
                        ) && (
                            <FieldNotebook
                                runState={runState}
                                onCommitInterpretation={handleCommitInterpretation}
                                onChooseMethod={handleChooseMethod}
                                onChooseEvidenceFamily={handleChooseEvidenceFamily}
                                onGuess={handleGuess}
                            />
                        )}

                        {inRun && runState.caseState?.version === 3 && (
                            <>
                                <FieldHintTicker feed={runState.caseState.hintFeed} />
                                <EvidenceFamilyRail caseState={runState.caseState} onChoose={handleChooseEvidenceFamily} />
                                <CandidateRoster runState={runState} onGuess={handleGuess} />
                                <EvidenceOnboarding />
                            </>
                        )}

                    </div>
                </div>
            </div>

            {/* Full-page species view */}
            <div className="absolute inset-0 w-full h-full z-briefing bg-ds-bg" style={{
                display: (viewMode === 'species' || (baseTab === 'field-guide' && !inExpedition)) ? 'block' : 'none',
                zIndex: 'var(--z-briefing)',
                background: 'var(--ds-background)',
            }}>
                <SpeciesList
                    onBack={() => { setViewMode('map'); setBaseTab('explore'); setScrollToSpeciesId(null); }}
                    scrollToSpeciesId={scrollToSpeciesId}
                />
            </div>

            {/* Profile tab */}
            <div className="absolute inset-0 w-full h-full z-briefing bg-ds-bg overflow-y-auto pb-[90px]" style={{
                display: (baseTab === 'profile' && !inExpedition) ? 'block' : 'none',
                zIndex: 'var(--z-briefing)',
                background: 'var(--ds-background)',
            }}>
                <ProfileTabContent />
            </div>

            {/* Inventory tab */}
            <div className="absolute inset-0 w-full h-full z-briefing bg-ds-bg flex-col overflow-y-auto pt-14 px-ds-lg pb-[100px] box-border" style={{
                display: (baseTab === 'inventory' && !inExpedition) ? 'flex' : 'none',
                zIndex: 'var(--z-briefing)',
                background: 'var(--ds-background)',
            }}>
                <h2 className="m-0 mb-1 text-lg font-semibold text-ds-text-primary">Inventory</h2>
                <p className="m-0 mb-ds-lg text-ds-body text-ds-text-muted">Field journal rewards will appear here as the deduction loop evolves.</p>
                <GlassPanel className="p-8 rounded-2xl text-center">
                    <p className="m-0 text-ds-body text-ds-text-muted">No inventory items to manage.</p>
                </GlassPanel>
            </div>

            {/* Expedition tab */}
            <div className="absolute inset-0 w-full h-full z-briefing bg-ds-bg overflow-y-auto" style={{
                display: (baseTab === 'expedition' && !inExpedition) ? 'block' : 'none',
                zIndex: 'var(--z-briefing)',
                background: 'var(--ds-background)',
            }}>
                <ExpeditionLauncher onStart={handleStartExpeditionFromLauncher} onResume={handleResumeExpeditionFromLauncher} />
            </div>

            {/* Bottom Tab Bar */}
            {!inExpedition && <BottomTabBar active={baseTab} onChange={handleTabChange} />}

            <Toaster
                position="bottom-right" richColors theme="dark" closeButton expand visibleToasts={3}
                toastOptions={{
                    classNames: {
                        toast: "glass-bg shadow-card border-ds-subtle text-ds-text-primary",
                        title: "text-ds-cyan",
                        description: "text-ds-text-secondary",
                        actionButton: "bg-ds-surface-elevated text-ds-text-primary",
                    },
                }}
            />
        </div>
    );
}

// --- Wrapped with providers ---
function MainAppLayout() {
    return (
        <GameBridgeProvider>
            <ExpeditionProvider>
                <MainAppLayoutInner />
            </ExpeditionProvider>
        </GameBridgeProvider>
    );
}

export default MainAppLayout;
