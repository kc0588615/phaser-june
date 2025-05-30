import { useRef, useEffect } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame'; // Your existing PhaserGame component
import CesiumMap from './components/CesiumMap';  // Import the new CesiumMap component
import { EventBus } from './game/EventBus.js';      // If App.jsx itself needs to react to game events

function MainAppLayout() {
    const phaserRef = useRef<IRefPhaserGame | null>(null); // Ref to access Phaser game instance and current scene

    // This callback is for when PhaserGame signals that a scene is ready
    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
        // You can store the scene or game instance if App.jsx needs to directly interact
        if (phaserRef.current) {
            phaserRef.current.scene = scene;
        }
    };

    // --- Layout Styling --- (Copied from your App.jsx)
    const appStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'row', // Side-by-side: Cesium Map | Phaser Game + UI
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
    };
    const cesiumContainerStyle: React.CSSProperties = {
        flex: 1, // Adjust ratio as needed, e.g., flex: 2 for larger map
        minWidth: '400px', // Ensure map is usable
        height: '100%',
        borderRight: '2px solid #555' // Visual separator
    };
    const phaserAndUiContainerStyle: React.CSSProperties = {
        flex: 1, // Adjust ratio as needed, e.g., flex: 1
        minWidth: '400px', // Ensure game area is usable
        display: 'flex',
        flexDirection: 'column', // Stack Phaser game above other UI
        height: '100%'
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
                <CesiumMap />
            </div>

            <div id="phaser-and-ui-wrapper" style={phaserAndUiContainerStyle}>
                <div id="phaser-game-wrapper" style={phaserGameWrapperStyle}>
                    <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />
                </div>

                <div id="game-ui-panel" style={gameUiPanelStyle}>
                    <h2>Game Controls / Info</h2>
                    <p>Selected location data will appear in the Phaser game board.</p>
                    <p>Interact with the Cesium map to choose a location.</p>
                    {/* Add your specific UI elements from App.jsx here */}
                </div>
            </div>
        </div>
    );
}

export default MainAppLayout;
