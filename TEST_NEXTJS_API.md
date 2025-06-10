# Testing Next.js API Route with Current Codebase

## Quick Test Setup

You can test the new Next.js API route alongside your current setup without changing anything!

### 1. Test the API Route Directly

First, start your Next.js dev server:
```bash
npm run dev
```

Then test the new API endpoint in your browser or with curl:
```bash
# Test with coordinates that have species data
curl "http://localhost:8080/api/location-info?lon=-95.3698&lat=29.7604"
```

You should see a response like:
```json
{
  "habitats": [100, 101, 200],
  "species": ["Species name 1", "Species name 2"],
  "debug": {
    "coordinates": {"lon": -95.3698, "lat": 29.7604},
    "speciesCount": 2,
    "message": "Using existing Supabase function for species, mock data for habitats"
  }
}
```

### 2. Add Test Button to Your Current CesiumMap

Add this to your CesiumMap component to test both old and new methods side by side:

```typescript
// Add this function inside your CesiumMap component
const testNewAPIRoute = async (lon: number, lat: number) => {
  try {
    console.log("Testing new Next.js API route...");
    const response = await fetch(`/api/location-info?lon=${lon}&lat=${lat}`);
    const data = await response.json();
    console.log("Next.js API Response:", data);
    
    // Compare with current method
    const currentResult = await speciesService.getSpeciesAtPoint(lon, lat);
    console.log("Current Supabase Service:", currentResult);
    
    console.log("Comparison complete - check console for results");
  } catch (error) {
    console.error("Next.js API test failed:", error);
  }
};

// Add this to your click handler (after your existing logic)
const handleMapClick = useCallback((click: any) => {
  // ... your existing click handling code ...
  
  // Add this test call after setting coordinates
  if (longitude && latitude) {
    // Test the new API route alongside current method
    testNewAPIRoute(longitude, latitude);
  }
}, [isLoading]);
```

### 3. Create a Comparison Component (Optional)

Create a test component to compare responses:

```typescript
// src/components/APITester.tsx
import React, { useState } from 'react';
import { speciesService } from '../lib/speciesService';

export const APITester: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBothAPIs = async () => {
    setLoading(true);
    const testLon = -95.3698;
    const testLat = 29.7604;

    try {
      // Test Next.js API route
      const nextJSResponse = await fetch(`/api/location-info?lon=${testLon}&lat=${testLat}`);
      const nextJSData = await nextJSResponse.json();

      // Test current Supabase service
      const supabaseData = await speciesService.getSpeciesAtPoint(testLon, testLat);

      setResults({
        nextJS: nextJSData,
        current: supabaseData,
        coordinates: { lon: testLon, lat: testLat }
      });
    } catch (error) {
      console.error('Test failed:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'absolute', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      padding: '10px',
      borderRadius: '5px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <h3>API Comparison Test</h3>
      <button onClick={testBothAPIs} disabled={loading}>
        {loading ? 'Testing...' : 'Test Both APIs'}
      </button>
      
      {results && (
        <div style={{ marginTop: '10px', fontSize: '12px' }}>
          <pre style={{ overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
```

Then add it to your main app:
```typescript
// In your main layout or index page
import { APITester } from '../components/APITester';

// Add this component above your game
<APITester />
```

### 4. Test Results You Should See

**Next.js API Route:**
- ✅ Uses existing Supabase connection
- ✅ Returns species from `get_species_at_point` function  
- ✅ Returns mock habitat data (until we add habitat table)
- ✅ Consistent JSON format

**Current Method:**
- ✅ Direct Supabase calls from frontend
- ✅ Returns full species objects
- ✅ Extracts habitat info from species data

### 5. Add Environment Variable

Make sure you have this in your `.env.local`:
```bash
# If you want to use service role key for server-side queries
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Your existing public key will work too
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## What This Test Proves

1. **No Server Required**: Everything runs on your existing Next.js dev server
2. **Supabase Integration**: Confirms the API route can query your existing data
3. **Performance**: You can compare speed between direct calls vs API routes
4. **Data Format**: See how the responses differ and which format works better

## Next Steps After Testing

Once you confirm the Next.js API route works:

1. **Enhance the Supabase function** to include habitat data
2. **Choose your preferred method** (direct Supabase calls vs API routes)
3. **Test with Azure Blob Storage** for GeoTIFF files
4. **Deploy minimal TiTiler** for map tiles

This way you can validate the approach before making any major changes to your architecture!