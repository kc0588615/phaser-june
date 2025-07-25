# Cesium UI Customization Guide

## Removed Cesium Default Icons

The following Cesium default UI widgets have been disabled in `/src/components/CesiumMap.tsx`:

1. **Home Button** - Returns camera to default view
2. **Fullscreen Button** - Toggles fullscreen mode
3. **Scene Mode Picker** - Switches between 2D/3D/Columbus view
4. **Navigation Help Button** - Shows navigation instructions
5. **Base Layer Picker** - Switches between different map layers
6. **Animation Widget** - Controls animation playback
7. **Timeline** - Shows and controls time-based data
8. **Geocoder** - Search box for locations

## How to Restore Cesium Default Icons

To restore any of these widgets, edit the `<Viewer>` component props in `/src/components/CesiumMap.tsx`:

```tsx
<Viewer
  ref={viewerRef}
  full 
  timeline={false}               // Set to true to show timeline
  animation={false}              // Set to true to show animation widget
  homeButton={false}             // Set to true to show home button
  fullscreenButton={false}       // Set to true to show fullscreen button
  sceneModePicker={false}        // Set to true to show 2D/3D/Columbus picker
  navigationHelpButton={false}   // Set to true to show help button
  baseLayerPicker={false}        // Set to true to show base layer picker
  geocoder={false}               // Set to true to show search box
  onClick={handleMapClick}
>
```

### Examples:

**Restore just the home button:**
```tsx
homeButton={true}
```

**Restore home button and fullscreen:**
```tsx
homeButton={true}
fullscreenButton={true}
```

**Restore all widgets (default Cesium behavior):**
Simply remove all the widget props, or set them all to `true`.

## Custom UI Buttons

Instead of Cesium's default widgets, the application uses custom buttons positioned in the top-right of the map area:

- **"Species List"** - Opens the full species list view
- **"Clue List"** - Toggles between map view and species clues panel

These buttons are defined in `/src/MainAppLayout.tsx` (lines 85-111) and are styled to match the game's dark theme.