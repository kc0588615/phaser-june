import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Cesium: any;
  }
}

const CesiumMapSimple: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Wait for Cesium to load
    const checkCesium = () => {
      if (typeof window !== 'undefined' && window.Cesium) {
        setIsLoaded(true);
      } else {
        setTimeout(checkCesium, 100);
      }
    };
    checkCesium();
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || viewerRef.current) return;

    // Initialize Cesium viewer
    const Cesium = window.Cesium;
    
    // Set Ion token
    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiZWRiZWM1OC02NGQ4LTQxN2UtYTJmMy01ZWRjMmM3YmEwN2YiLCJpZCI6Mjk1MzAwLCJpYXQiOjE3NDQ5OTk0MTh9.HBoveH42derVYybno6upJzVCOkxLDji6VOj2TqSwpjs';

    // Create viewer with basic configuration
    try {
      // First try with basic viewer
      viewerRef.current = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: true,
        geocoder: false,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: true,
        animation: false,
        timeline: false,
        fullscreenButton: false
      });
      
      console.log('Cesium viewer created successfully');
      
      // Try to add OpenStreetMap as fallback if Ion doesn't work
      try {
        const osmProvider = new Cesium.OpenStreetMapImageryProvider({
          url: 'https://a.tile.openstreetmap.org/'
        });
        viewerRef.current.imageryLayers.removeAll();
        viewerRef.current.imageryLayers.addImageryProvider(osmProvider);
        console.log('Added OpenStreetMap imagery');
      } catch (e) {
        console.log('Could not add OSM provider, using default');
      }
      
    } catch (error) {
      console.error('Error creating Cesium viewer:', error);
      
      // Fallback: try minimal viewer
      try {
        viewerRef.current = new Cesium.Viewer(containerRef.current);
        console.log('Created minimal Cesium viewer');
      } catch (e) {
        console.error('Could not create even minimal viewer:', e);
      }
    }

    // Cleanup
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading Cesium...</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default CesiumMapSimple;