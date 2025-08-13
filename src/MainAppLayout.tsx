import { useRef, useEffect, useState } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame'; // Your existing PhaserGame component
import CesiumMap from './components/CesiumMap';  // Import the new CesiumMap component
import { SpeciesPanel } from './components/SpeciesPanel'; // Import the SpeciesPanel component
import SpeciesList from './components/SpeciesList'; // Import the SpeciesList component
import { EventBus } from './game/EventBus';      // If App.jsx itself needs to react to game events
import { Toaster } from 'sonner';

function MainAppLayout() {
    const phaserRef = useRef<IRefPhaserGame | null>(null); // Ref to access Phaser game instance and current scene
    const [viewMode, setViewMode] = useState<'map' | 'clues' | 'species'>('map'); // View mode state
    const [scrollToSpeciesId, setScrollToSpeciesId] = useState<number | null>(null); // Track species to scroll to

    // This callback is for when PhaserGame signals that a scene is ready
    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
        // You can store the scene or game instance if App.jsx needs to directly interact
        if (phaserRef.current) {
            phaserRef.current.scene = scene;
        }
    };

    // Handle show-species-list event
    useEffect(() => {
        const handleShowSpeciesList = (data: { speciesId: number }) => {
            setScrollToSpeciesId(data.speciesId);
            setViewMode('species');
        };

        EventBus.on('show-species-list', handleShowSpeciesList);

        return () => {
            EventBus.off('show-species-list', handleShowSpeciesList);
        };
    }, []);

    // --- Layout Styling --- (Updated for game-first design)
    const appStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column', // Vertical stack: Phaser Game on top, Cesium Map below
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
    };
    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%',
        height: '60%', // Phaser game takes 60% of screen
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };
    const cesiumContainerStyle: React.CSSProperties = {
        width: '100%',
        height: '40%', // Bottom area takes 40% of screen
        minHeight: '0px',
        borderTop: '2px solid #555', // Border at top of bottom container
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0f172a', // Dark background to match SpeciesPanel
        display: 'flex',
        flexDirection: 'column'
    };
    const buttonStyle: React.CSSProperties = {
        position: 'absolute',
        top: '45px',
        zIndex: 1000,
        padding: '5px 10px',
        backgroundColor: 'rgba(42, 42, 42, 0.8)',
        color: 'white',
        border: '1px solid #555',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    };

    useEffect(() => {
        // If you have any specific EventBus listeners from your original App.jsx, set them up here
        // and clean them up in the return function.
        // Example:
        // EventBus.on('some-event', handler);
        // return () => EventBus.off('some-event', handler);
    }, []);

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
                <div id="phaser-game-wrapper" style={phaserGameWrapperStyle}>
                    <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />
                </div>

                <div id="cesium-map-wrapper" style={cesiumContainerStyle}>
                <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    zIndex: 1000,
                    display: 'flex',
                    gap: '8px'
                }}>
                    <button 
                        style={{ 
                            padding: '5px 10px',
                            backgroundColor: 'rgba(42, 42, 42, 0.8)',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onClick={() => setViewMode('species')}
                    >
                        Species List
                    </button>
                    <button 
                        style={{ 
                            padding: '5px 10px',
                            backgroundColor: 'rgba(42, 42, 42, 0.8)',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onClick={() => setViewMode(viewMode === 'map' ? 'clues' : 'map')}
                    >
                        {viewMode === 'map' ? 'Clue List' : 'Show Map'}
                    </button>
                </div>
                
                {/* Keep all components mounted but show/hide with CSS */}
                <div style={{ 
                    display: viewMode === 'map' ? 'block' : 'none',
                    height: '100%',
                    width: '100%'
                }}>
                    <CesiumMap />
                </div>
                
                <div style={{ 
                    display: viewMode === 'clues' ? 'block' : 'none',
                    height: '100%', 
                    width: '100%',
                    overflow: 'auto',
                    position: 'relative'
                }}>
                    <SpeciesPanel />
                </div>
            </div>
            </div>

            {/* Full-page species view */}
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
