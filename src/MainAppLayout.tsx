import { useRef, useEffect, useState } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame'; // Your existing PhaserGame component
import CesiumMap from './components/CesiumMap';  // Import the new CesiumMap component
import { SpeciesPanel } from './components/SpeciesPanel'; // Import the SpeciesPanel component
import { EventBus } from './game/EventBus';      // If App.jsx itself needs to react to game events
import { Toaster } from 'sonner';

function MainAppLayout() {
    const phaserRef = useRef<IRefPhaserGame | null>(null); // Ref to access Phaser game instance and current scene
    const [showMap, setShowMap] = useState(true); // Toggle state for map/clue view

    // This callback is for when PhaserGame signals that a scene is ready
    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
        // You can store the scene or game instance if App.jsx needs to directly interact
        if (phaserRef.current) {
            phaserRef.current.scene = scene;
        }
    };

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
    const minimizeButtonStyle: React.CSSProperties = {
        position: 'absolute',
        top: '45px',
        right: '10px',
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
            <div id="phaser-game-wrapper" style={phaserGameWrapperStyle}>
                <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />
            </div>

            <div id="cesium-map-wrapper" style={cesiumContainerStyle}>
                <button 
                    style={minimizeButtonStyle}
                    onClick={() => {
                        setShowMap(!showMap);
                        console.log('Toggle button clicked - showMap:', !showMap);
                    }}
                >
                    {showMap ? 'Show Clues' : 'Show Map'}
                </button>
                
                {/* Keep both components mounted but show/hide with CSS */}
                <div style={{ 
                    display: showMap ? 'block' : 'none',
                    height: '100%',
                    width: '100%'
                }}>
                    <CesiumMap />
                </div>
                
                <div style={{ 
                    display: showMap ? 'none' : 'block',
                    height: '100%', 
                    width: '100%',
                    overflow: 'auto',
                    position: 'relative'
                }}>
                    <SpeciesPanel />
                </div>
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
