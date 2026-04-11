import { useRef, useEffect, useState, useCallback } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame';
import CesiumMap from './components/CesiumMap';
import { SpeciesPanel } from './components/SpeciesPanel';
import SpeciesList from './components/SpeciesList';
import UserMenu from './components/UserMenu';
import { useAuthBridge } from './hooks/useAuthBridge';
import { useExpeditionRun } from './hooks/useExpeditionRun';
import { EventBus } from './game/EventBus';
import { Toaster } from 'sonner';
import { PiBookOpenTextLight } from "react-icons/pi";
import { BottomTabBar } from './components/BottomTabBar';
import type { BaseTab } from './components/BottomTabBar';
import { ExpeditionBriefing } from './components/ExpeditionBriefing';
import { RunTrack } from './components/RunTrack';
import { ActiveEncounterPanel } from './components/ActiveEncounterPanel';
import { GemWallet } from './components/GemWallet';
import { SouvenirPouch } from './components/SouvenirPouch';
import { ConsumableTray } from './components/ConsumableTray';
import { DeductionCamp } from './components/DeductionCamp';
import { ProfileContent } from './components/ProfileContent';
import { SpookMeter } from './components/SpookMeter';
import { BankedScore } from './components/BankedScore';
import { CrisisOverlay } from './components/CrisisOverlay';
import { WALLET_DEFS } from '@/expedition/domain';
import { AFFINITY_DEFINITIONS } from '@/expedition/affinities';
import { GlassPanel } from '@/components/ui/glass-panel';

function ProfileTabContent() {
    return (
        <div className="pt-12">
            <h1 className="text-ds-heading-lg px-4 mb-4">Field Profile</h1>
            <ProfileContent inline />
        </div>
    );
}

function MainAppLayout() {
    useAuthBridge();
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'species'>('map');
    const [scrollToSpeciesId, setScrollToSpeciesId] = useState<number | null>(null);
    const [baseTab, setBaseTab] = useState<BaseTab>('explore');

    const {
        runState, boardOpacity, hudRef, correctSpeciesIdRef, hiddenSpeciesNameRef,
        handleAffinitySelected, handleRunReset, handleCrisisToolSpend,
        handleDeductionPurchase, handleDeductionGuessResult,
    } = useExpeditionRun();

    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        if (phaserRef.current) phaserRef.current.scene = scene;
    };

    // Show-species-list navigation
    useEffect(() => {
        const handleShowSpeciesList = (data: { speciesId: number }) => {
            setScrollToSpeciesId(data.speciesId);
            setViewMode('species');
            setBaseTab('field-guide');
        };
        EventBus.on('show-species-list', handleShowSpeciesList);
        return () => { EventBus.off('show-species-list', handleShowSpeciesList); };
    }, []);

    const inRun = runState.phase === 'in-run';
    const showBriefing = runState.phase === 'briefing';
    const showComplete = runState.phase === 'complete';
    const showDeduction = runState.phase === 'deduction';
    const inExpedition = inRun || showBriefing || showComplete || showDeduction;
    const useSplitLayout = inRun;

    const handleTabChange = useCallback((tab: BaseTab) => {
        if (tab === 'expedition' && !inExpedition) {
            setBaseTab('explore');
            setViewMode('map');
            return;
        }
        setBaseTab(tab);
        if (tab === 'explore') setViewMode('map');
        else if (tab === 'field-guide') setViewMode('species');
    }, [inExpedition]);

    const currentNode = inRun && runState.expedition
        ? runState.expedition.nodes[runState.currentNodeIndex]
        : null;

    useEffect(() => {
        if (!phaserRef.current?.game) return;
        const rafId = window.requestAnimationFrame(() => { phaserRef.current?.game?.scale.refresh(); });
        return () => window.cancelAnimationFrame(rafId);
    }, [useSplitLayout, viewMode]);

    const appStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' };
    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%', height: useSplitLayout ? '66.6667%' : '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: useSplitLayout ? 'relative' : 'absolute',
        inset: useSplitLayout ? undefined : 0, overflow: 'hidden',
        visibility: useSplitLayout ? 'visible' : 'hidden',
        pointerEvents: useSplitLayout ? 'auto' : 'none', flexShrink: 0,
    };
    const cesiumContainerStyle: React.CSSProperties = {
        width: '100%', height: useSplitLayout ? '33.3333%' : '100%',
        minHeight: '0px', borderTop: useSplitLayout ? '2px solid #555' : 'none',
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
                {/* RunTrack bar above Phaser canvas */}
                <div style={{ display: inRun && runState.expedition ? 'block' : 'none' }}>
                    {runState.expedition && (
                        <RunTrack nodes={runState.expedition.nodes} currentNodeIndex={runState.currentNodeIndex} activeAffinities={runState.activeAffinities} />
                    )}
                </div>

                <div id="phaser-game-wrapper" style={{ ...phaserGameWrapperStyle, opacity: inRun ? boardOpacity : 1, transition: 'opacity 0.8s ease' }}>
                    {inRun && (
                        <div className="absolute inset-0 z-base glass-bg" style={{ borderRadius: useSplitLayout ? 0 : '16px' }} />
                    )}

                    <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />

                    {/* Active encounter panel */}
                    {inRun && currentNode && (
                        <ActiveEncounterPanel
                            node={currentNode}
                            nodeIndex={runState.currentNodeIndex}
                            activeAffinities={runState.activeAffinities}
                            onComplete={() => EventBus.emit('node-advance-requested', {
                                nodeIndex: runState.currentNodeIndex,
                                reason: 'analysis_complete',
                                source: 'panel',
                            })}
                        />
                    )}

                    {/* Thumb zone — bottom overlays */}
                    {inRun && (
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-hud flex items-end gap-1.5">
                            <div className="flex flex-col gap-ds-xs items-start shrink-0">
                                <div className="flex gap-ds-xs items-end">
                                    <GemWallet wallet={runState.resourceWallet} />
                                    {runState.souvenirs.length > 0 && <SouvenirPouch souvenirs={runState.souvenirs} />}
                                </div>
                                <ConsumableTray items={runState.consumables} onUse={(itemInstanceId) => EventBus.emit('consumable-use-requested', { itemInstanceId })} />
                            </div>
                            <div className="flex-1 flex flex-col items-center gap-ds-xs">
                                <SpookMeter />
                                <BankedScore score={runState.bankedScore} />
                            </div>
                            <div className="shrink-0 w-px" />
                        </div>
                    )}
                </div>

                <div id="cesium-map-wrapper" style={cesiumContainerStyle}>
                    {/* Deduction Camp phase */}
                    {showDeduction && runState.deductionCamp && (
                        <div className="glass-bg absolute inset-0 z-deduction backdrop-blur-xl overflow-auto">
                            <DeductionCamp
                                camp={runState.deductionCamp}
                                speciesId={correctSpeciesIdRef.current}
                                hiddenSpeciesName={hiddenSpeciesNameRef.current}
                                onPurchase={handleDeductionPurchase}
                                onGuessResult={handleDeductionGuessResult}
                                onFinish={handleRunReset}
                            />
                        </div>
                    )}

                    {/* CesiumMap */}
                    <div style={{
                        display: (viewMode === 'map' && !showDeduction) ? 'block' : 'none',
                        height: '100%', width: '100%'
                    }}>
                        <CesiumMap />
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
                            hudRef={hudRef}
                            hiddenSpeciesNameRef={hiddenSpeciesNameRef}
                            onReset={handleRunReset}
                        />
                    )}

                    {/* Crisis overlay */}
                    {inRun && (
                        <CrisisOverlay consumables={runState.consumables} onSpendTool={handleCrisisToolSpend} />
                    )}

                    {/* SpeciesPanel always mounted but hidden */}
                    <SpeciesPanel toastsEnabled={viewMode === 'map' && !showDeduction} style={{ display: 'none' }} />

                    {/* Top-right controls — rendered last to paint above Cesium canvas */}
                    <div className="absolute top-2.5 right-2.5 z-menu flex gap-ds-sm items-center">
                        <UserMenu />
                        <button
                            className="glass-bg border border-ds-subtle rounded-md py-1.5 px-2.5 text-ds-text-primary cursor-pointer flex items-center gap-ds-xs"
                            onClick={() => { setViewMode('species'); setBaseTab('field-guide'); }}
                            title="Species List"
                        >
                            <PiBookOpenTextLight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Full-page species view */}
            <div className="absolute inset-0 w-full h-full z-briefing bg-ds-bg" style={{
                display: (viewMode === 'species' || (baseTab === 'field-guide' && !inExpedition)) ? 'block' : 'none',
            }}>
                <SpeciesList
                    onBack={() => { setViewMode('map'); setBaseTab('explore'); setScrollToSpeciesId(null); }}
                    scrollToSpeciesId={scrollToSpeciesId}
                />
            </div>

            {/* Profile tab */}
            <div className="absolute inset-0 w-full h-full z-briefing bg-ds-bg overflow-y-auto pb-[90px]" style={{
                display: (baseTab === 'profile' && !inExpedition) ? 'block' : 'none',
            }}>
                <ProfileTabContent />
            </div>

            {/* Inventory tab */}
            <div className="absolute inset-0 w-full h-full z-briefing bg-ds-bg flex-col overflow-y-auto pt-14 px-ds-lg pb-[100px] box-border" style={{
                display: (baseTab === 'inventory' && !inExpedition) ? 'flex' : 'none',
            }}>
                <h2 className="m-0 mb-1 text-lg font-semibold text-ds-text-primary">Inventory</h2>
                <p className="m-0 mb-ds-lg text-ds-body text-ds-text-muted">Souvenirs collected during expeditions</p>

                {runState.souvenirs.length > 0 ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5">
                        {runState.souvenirs.map((s, i) => (
                            <GlassPanel key={`${s.id}-${i}`} className="flex flex-col items-center gap-ds-xs p-ds-md rounded-xl">
                                <span className="text-3xl">{s.emoji}</span>
                                <span className="text-ds-caption font-semibold text-ds-text-primary text-center">{s.name}</span>
                            </GlassPanel>
                        ))}
                    </div>
                ) : (
                    <GlassPanel className="p-8 rounded-2xl text-center">
                        <div className="text-3xl mb-ds-sm">🎒</div>
                        <p className="m-0 text-ds-body text-ds-text-muted">No souvenirs yet. Complete expeditions to collect items!</p>
                    </GlassPanel>
                )}

                {runState.consumables.length > 0 && (
                    <>
                        <h3 className="mt-5 mb-ds-sm text-ds-body font-semibold text-ds-text-primary">Consumables</h3>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5">
                            {runState.consumables.map((c, i) => (
                                <GlassPanel key={`${c.instanceId}-${i}`} className="flex flex-col items-center gap-ds-xs p-ds-md rounded-xl">
                                    <span className="text-xl">🧪</span>
                                    <span className="text-ds-caption font-semibold text-ds-text-primary text-center">{c.name}</span>
                                    <span className="text-[9px] text-ds-text-muted">{c.effectType}</span>
                                </GlassPanel>
                            ))}
                        </div>
                    </>
                )}
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
import type { RunState } from '@/types/expedition';

function RunCompleteSummary({ runState, hudRef, hiddenSpeciesNameRef, onReset }: {
    runState: RunState;
    hudRef: React.RefObject<{ score: number; movesUsed: number }>;
    hiddenSpeciesNameRef: React.RefObject<string>;
    onReset: () => void;
}) {
    const stats = [
        { label: 'Banked Score', value: String(hudRef.current?.score ?? 0), color: 'var(--ds-accent-cyan)' },
        { label: 'Nodes Done', value: String(runState.expedition?.nodes.length ?? 0), color: 'var(--ds-accent-emerald)' },
        { label: 'Souvenirs', value: String(runState.souvenirs.length), color: 'var(--ds-accent-amber)' },
        { label: 'Items Left', value: String(runState.consumables.length), color: 'var(--ds-gem-focus)' },
    ];

    return (
        <div className="absolute inset-0 z-panel flex flex-col items-center justify-center bg-[rgba(10,14,26,0.7)] backdrop-blur-md p-ds-xl gap-ds-lg">
            <div className="text-[22px] font-bold text-ds-cyan">Expedition Complete!</div>
            <div className="text-4xl font-bold text-ds-text-primary">
                {runState.finalScore ?? runState.deductionCamp?.bankedScore ?? hudRef.current?.score ?? 0} pts
            </div>

            <div className="grid grid-cols-2 gap-ds-sm w-full max-w-[300px]">
                {stats.map(({ label, value, color }) => (
                    <GlassPanel key={label} className="rounded-lg p-2.5 text-center">
                        <div className="text-xl font-bold" style={{ color }}>{value}</div>
                        <div className="text-ds-badge font-medium text-ds-text-muted uppercase tracking-wider">{label}</div>
                    </GlassPanel>
                ))}
            </div>

            {runState.deductionCamp?.guessResult === 'correct' && hiddenSpeciesNameRef.current && (
                <GlassPanel borderColor="var(--ds-accent-emerald)" className="flex items-center gap-ds-sm px-ds-lg py-ds-sm rounded-xl">
                    <span className="text-xl">🔬</span>
                    <div>
                        <div className="text-ds-badge font-bold text-ds-emerald uppercase tracking-wider">Species Discovered</div>
                        <div className="text-ds-body font-semibold text-ds-text-primary">{hiddenSpeciesNameRef.current}</div>
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

            <div className="flex gap-ds-lg text-ds-body">
                {WALLET_DEFS.map(({ key, color, label }) => (
                    <div key={key} className="text-center">
                        <div className="text-lg font-bold" style={{ color }}>{runState.resourceWallet[key]}</div>
                        <div className="text-ds-caption text-ds-text-secondary">{label}</div>
                    </div>
                ))}
            </div>

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

export default MainAppLayout;
