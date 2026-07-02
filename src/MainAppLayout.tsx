import { useRef, useEffect, useState, useCallback } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame';
import CesiumMap from './components/CesiumMap';
import { SpeciesPanel } from './components/SpeciesPanel';
import SpeciesList from './components/SpeciesList';
import { useAuthBridge } from './hooks/useAuthBridge';
import { useExpedition } from './contexts/ExpeditionContext';
import { GameBridgeProvider, useGameBridge } from './contexts/GameBridgeContext';
import { ExpeditionProvider } from './contexts/ExpeditionContext';
import { EventBus } from './game/EventBus';
import { Toaster } from 'sonner';
import { BottomTabBar } from './components/BottomTabBar';
import type { BaseTab } from './components/BottomTabBar';
import { ExpeditionBriefing } from './components/ExpeditionBriefing';
import { DeductionCamp } from './components/DeductionCamp';
import { ExpeditionLauncher } from './components/ExpeditionLauncher';
import { ProfileContent } from './components/ProfileContent';
import { MatchBattleCombatHud } from './components/MatchBattleCombatHud';
import { MatchBattleRewardDraft } from './components/MatchBattleRewardDraft';
import { MatchBattleRouteMap } from './components/MatchBattleRouteMap';
import { UPGRADE_CATALOG } from '@/game/matchBattle/catalog';
import { AFFINITY_DEFINITIONS } from '@/expedition/affinities';
import { GlassPanel } from '@/components/ui/glass-panel';
import type { RunState } from '@/types/expedition';

function ProfileTabContent() {
    return (
        <div className="pt-12">
            <h1 className="text-ds-heading-lg px-4 mb-4">Field Profile</h1>
            <ProfileContent inline />
        </div>
    );
}

function MainAppLayoutInner() {
    useAuthBridge();
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'species'>('map');
    const [scrollToSpeciesId, setScrollToSpeciesId] = useState<number | null>(null);
    const [baseTab, setBaseTab] = useState<BaseTab>('explore');

    const {
        runState, boardOpacity, correctSpeciesId, hiddenSpeciesName,
        handleAffinitySelected, handleRunResume, handleRunReset,
        handleDeductionPurchase, handleDeductionGuessResult,
        handleProcessClue, handlePlaceReference, handleComparativeGuessResult,
        selectMatchBattleReward, rerollMatchBattleRewards, purchaseMatchBattleUpgrade, selectMatchBattleRouteNode,
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

    const inRun = runState.phase === 'in-run';
    const showReward = runState.phase === 'reward';
    const showRoute = runState.phase === 'route';
    const showBriefing = runState.phase === 'briefing';
    const showComplete = runState.phase === 'complete';
    const showDeduction = runState.phase === 'deduction';
    const inExpedition = inRun || showReward || showRoute || showBriefing || showComplete || showDeduction;
    const useSplitLayout = inRun;

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

    const appStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' };
    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%', height: useSplitLayout ? '60%' : '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: useSplitLayout ? 'relative' : 'absolute',
        inset: useSplitLayout ? undefined : 0, overflow: 'hidden',
        visibility: useSplitLayout ? 'visible' : 'hidden',
        pointerEvents: useSplitLayout ? 'auto' : 'none', flexShrink: 0,
        borderTop: useSplitLayout ? '2px solid #555' : 'none',
    };
    const cesiumContainerStyle: React.CSSProperties = {
        width: '100%', height: useSplitLayout ? '40%' : '100%',
        minHeight: '0px',
        position: useSplitLayout ? 'relative' : 'absolute',
        inset: useSplitLayout ? undefined : 0, overflow: 'hidden',
        background: 'var(--ds-background)', display: 'flex', flexDirection: 'column',
        zIndex: 'var(--z-game)' as any,
    };

    return (
        <div id="app-container" style={appStyle}>
            {/* Game layout — off-screen when not on explore/expedition tab */}
            <div style={{
                position: (baseTab !== 'explore' && baseTab !== 'expedition' && !inExpedition) ? 'absolute' : 'relative',
                left: (baseTab !== 'explore' && baseTab !== 'expedition' && !inExpedition) ? '-9999px' : '0',
                display: 'flex', flexDirection: 'column', width: '100%', height: '100%'
            }}>
                <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <div id="cesium-map-wrapper" style={cesiumContainerStyle}>
                        {/* Deduction Camp phase */}
                        {showDeduction && runState.deductionCamp && (
                            <div className="glass-bg absolute inset-0 z-deduction backdrop-blur-xl overflow-auto">
                                <DeductionCamp
                                    camp={runState.deductionCamp}
                                    comp={runState.comparativeDeduction}
                                    speciesId={correctSpeciesId}
                                    hiddenSpeciesName={hiddenSpeciesName}
                                    evidenceBundle={runState.evidenceBundle}
                                    onPurchase={handleDeductionPurchase}
                                    onGuessResult={handleDeductionGuessResult}
                                    onProcessClue={handleProcessClue}
                                    onPlaceReference={handlePlaceReference}
                                    onComparativeGuess={handleComparativeGuessResult}
                                    onFinish={handleRunReset}
                                />
                            </div>
                        )}

                        {/* CesiumMap */}
                        <div style={{
                            display: viewMode === 'map' ? 'block' : 'none',
                            height: '100%', width: '100%'
                        }}>
                            <CesiumMap
                                expeditionPhase={runState.phase}
                                onSearchOpen={() => { setViewMode('species'); setBaseTab('field-guide'); }}
                            />
                        </div>

                        {/* Expedition Briefing */}
                        {showBriefing && runState.expedition && (
                            <div className="absolute inset-0 z-deduction flex flex-col justify-end">
                                <div style={{ flex: '0 0 25%', background: 'rgba(10,14,26,0.4)' }}
                                    onClick={() => EventBus.emit('game-reset', undefined)} />
                                <div className="glass-bg border-t border-ds-subtle" style={{ flex: '0 0 75%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                    <ExpeditionBriefing
                                        expedition={runState.expedition}
                                        onStart={() => EventBus.emit('expedition-start', {})}
                                        onSelectAffinity={handleAffinitySelected}
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

                        {showReward && runState.matchBattle && (
                            <MatchBattleRewardDraft
                                options={runState.matchBattle.rewardDraft}
                                credits={runState.matchBattle.credits}
                                rerollCost={runState.matchBattle.rerollCost}
                                fieldNotes={runState.matchBattle.markForm}
                                upgrades={UPGRADE_CATALOG}
                                gearSlotsFull={runState.matchBattle.armaments.length >= runState.matchBattle.maxGearSlots}
                                onSelect={selectMatchBattleReward}
                                onReroll={rerollMatchBattleRewards}
                                onUpgrade={purchaseMatchBattleUpgrade}
                            />
                        )}

                        {showRoute && runState.matchBattle && (
                            <MatchBattleRouteMap
                                matchBattle={runState.matchBattle}
                                onSelect={selectMatchBattleRouteNode}
                            />
                        )}

                        {/* SpeciesPanel always mounted but hidden */}
                        <SpeciesPanel toastsEnabled={viewMode === 'map' && !showDeduction} style={{ display: 'none' }} />

                    </div>

                    <div id="phaser-game-wrapper" style={{ ...phaserGameWrapperStyle, opacity: inRun ? boardOpacity : 1, transition: 'opacity 0.8s ease' }}>
                        {inRun && (
                            <div className="absolute inset-0 z-base glass-bg" style={{ borderRadius: useSplitLayout ? 0 : '16px' }} />
                        )}

                        <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />

                        {inRun && runState.matchBattle && (
                            <MatchBattleCombatHud matchBattle={runState.matchBattle} />
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
                <p className="m-0 mb-ds-lg text-ds-body text-ds-text-muted">Expedition rewards now resolve through Match Battle route rewards.</p>
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

// --- Run completion summary overlay ---

function RunCompleteSummary({ runState, onReset }: {
    runState: RunState;
    onReset: () => void;
}) {
    const { hud } = useGameBridge();
    const { hiddenSpeciesName } = useExpedition();
    const matchBattleLost = runState.matchBattle?.outcome === 'lost';
    const stats = [
        { label: 'Banked Score', value: String(runState.finalScore ?? hud.score), color: 'var(--ds-accent-cyan)' },
        { label: 'Nodes Done', value: String(runState.expedition?.nodes.length ?? 0), color: 'var(--ds-accent-emerald)' },
        { label: 'Pieces', value: String(runState.matchBattle?.piecePool.length ?? 0), color: 'var(--ds-accent-amber)' },
        { label: 'Gear', value: String(runState.matchBattle?.armaments.length ?? 0), color: 'var(--ds-gem-focus)' },
    ];

    return (
        <div className="absolute inset-0 z-panel flex flex-col items-center justify-center bg-[rgba(10,14,26,0.7)] backdrop-blur-md p-ds-xl gap-ds-lg">
            <div className="text-[22px] font-bold text-ds-cyan">{matchBattleLost ? 'Run Lost' : 'Expedition Complete!'}</div>
            {matchBattleLost && (
                <div className="max-w-[320px] text-center text-ds-body text-ds-text-secondary">
                    You ran out of Stamina.
                </div>
            )}
            <div className="text-4xl font-bold text-ds-text-primary">
                {runState.finalScore ?? runState.deductionCamp?.bankedScore ?? hud.score} pts
            </div>

            <div className="grid grid-cols-2 gap-ds-sm w-full max-w-[300px]">
                {stats.map(({ label, value, color }) => (
                    <GlassPanel key={label} className="rounded-lg p-2.5 text-center">
                        <div className="text-xl font-bold" style={{ color }}>{value}</div>
                        <div className="text-ds-badge font-medium text-ds-text-muted uppercase tracking-wider">{label}</div>
                    </GlassPanel>
                ))}
            </div>

            {runState.deductionCamp?.guessResult === 'correct' && hiddenSpeciesName && (
                <GlassPanel borderColor="var(--ds-accent-emerald)" className="flex items-center gap-ds-sm px-ds-lg py-ds-sm rounded-xl">
                    <span className="text-xl">🔬</span>
                    <div>
                        <div className="text-ds-badge font-bold text-ds-emerald uppercase tracking-wider">Species Discovered</div>
                        <div className="text-ds-body font-semibold text-ds-text-primary">{hiddenSpeciesName}</div>
                    </div>
                </GlassPanel>
            )}

            {runState.activeAffinities.length > 0 && (
                <div className="flex gap-ds-sm justify-center">
                    {runState.activeAffinities.map(a => {
                        const def = AFFINITY_DEFINITIONS[a];
                        return (
                            <GlassPanel key={a} pill borderColor={def.color} className="flex items-center gap-1.5 px-3.5 py-1.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: def.color }} />
                                <span className="text-ds-body font-semibold" style={{ color: def.color }}>{def.label}</span>
                            </GlassPanel>
                        );
                    })}
                </div>
            )}

            <button
                onClick={onReset}
                className="mt-ds-sm py-ds-md px-8 text-ds-body font-bold text-ds-bg border-none rounded-full cursor-pointer shadow-glow-cyan"
                style={{ background: 'var(--ds-gradient-cta)' }}
            >
                Return to Globe
            </button>
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
