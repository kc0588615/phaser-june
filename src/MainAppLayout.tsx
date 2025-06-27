import { useRef, useEffect, useState } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame'; // Your existing PhaserGame component
import CesiumMap from './components/CesiumMap';  // Import the new CesiumMap component
import { ClueDisplay } from './components/ClueDisplay'; // Import the ClueDisplay component
import { EventBus } from './game/EventBus';      // If App.jsx itself needs to react to game events

function MainAppLayout() {
    const phaserRef = useRef<IRefPhaserGame | null>(null); // Ref to access Phaser game instance and current scene
    const [cesiumMinimized, setCesiumMinimized] = useState(false);

    // This callback is for when PhaserGame signals that a scene is ready
    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
        // You can store the scene or game instance if App.jsx needs to directly interact
        if (phaserRef.current) {
            phaserRef.current.scene = scene;
        }
    };

    // --- Layout Styling --- (Updated for vertical layout)
    const appStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column', // Vertical stack: Cesium Map on top, Phaser Game below
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
    };
    const cesiumContainerStyle: React.CSSProperties = {
        width: '100%',
        height: cesiumMinimized ? '0%' : '30%', // Minimize completely or take 30% of screen
        minHeight: '0px',
        borderBottom: cesiumMinimized ? 'none' : '2px solid #555', // Hide border when minimized
        position: 'relative',
        transition: 'height 0.3s ease-in-out',
        overflow: 'hidden' // Hide content when minimized
    };
    const minimizeButtonStyle: React.CSSProperties = {
        position: cesiumMinimized ? 'fixed' : 'absolute',
        top: '35px',
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
    const phaserAndUiContainerStyle: React.CSSProperties = {
        flex: 1, // Take remaining space
        minHeight: '400px', // Ensure game area is usable
        display: 'flex',
        flexDirection: 'column', // Stack Phaser game above other UI
        width: '100%'
    };
    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%',
        height: 'calc(100% - 150px)', // Example: Game takes most space, 150px for UI below
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };
    const gameUiPanelStyle: React.CSSProperties = {
        width: '100%',
        height: '150px', // Fixed height for UI panel
        padding: '10px',
        boxSizing: 'border-box',
        borderTop: '2px solid #555',
        overflowY: 'auto', // If UI content might exceed height
        backgroundColor: '#282c34', // Dark background for UI panel
        color: 'white'
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
            <div id="cesium-map-wrapper" style={cesiumContainerStyle}>
                <button 
                    style={minimizeButtonStyle}
                    onClick={() => setCesiumMinimized(!cesiumMinimized)}
                >
                    {cesiumMinimized ? '▼ Expand' : '▲ Minimize'}
                </button>
                <CesiumMap />
            </div>

            <div id="phaser-and-ui-wrapper" style={phaserAndUiContainerStyle}>
                <div id="phaser-game-wrapper" style={phaserGameWrapperStyle}>
                    <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />
                </div>

                <div id="game-ui-panel" style={gameUiPanelStyle}>
                    <ClueDisplay />
                </div>
            </div>
        </div>
    );
}

export default MainAppLayout;
