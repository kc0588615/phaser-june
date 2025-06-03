import { useEffect, useState } from 'react';

export default function TestCesium() {
  const [cesiumStatus, setCesiumStatus] = useState<string>('Checking...');
  const [assetTests, setAssetTests] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    // Test if CESIUM_BASE_URL is set
    const baseUrl = (window as any).CESIUM_BASE_URL || 'Not set';
    setCesiumStatus(`CESIUM_BASE_URL: ${baseUrl}`);

    // Test if key Cesium assets are accessible
    const assetsToTest = [
      '/cesium/Widgets/widgets.css',
      '/cesium/Cesium.js',
      '/cesium/Workers/createVerticesFromHeightmap.js'
    ];

    assetsToTest.forEach(async (asset) => {
      try {
        const response = await fetch(asset, { method: 'HEAD' });
        setAssetTests(prev => ({ ...prev, [asset]: response.ok }));
      } catch (error) {
        setAssetTests(prev => ({ ...prev, [asset]: false }));
      }
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Cesium Configuration Test</h1>
      
      <div className="mb-4">
        <p className="font-semibold">{cesiumStatus}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Asset Availability:</h2>
        <ul className="list-disc list-inside">
          {Object.entries(assetTests).map(([asset, available]) => (
            <li key={asset} className={available ? 'text-green-600' : 'text-red-600'}>
              {asset}: {available ? '✓ Available' : '✗ Not Found'}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <a href="/game/map" className="text-blue-600 hover:underline">
          Go to Map Page →
        </a>
      </div>
    </div>
  );
}