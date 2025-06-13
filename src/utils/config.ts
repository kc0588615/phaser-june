// src/utils/config.ts
// Configuration utility for dynamic Azure config loading

interface AppConfig {
  cogUrl: string;
  titilerBaseUrl: string;
  gameApiBaseUrl?: string;
}

let cachedConfig: AppConfig | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    // Try to fetch dynamic configuration from Azure endpoint
    const apiBaseUrl = process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/config`);
    
    if (response.ok) {
      const dynamicConfig = await response.json();
      console.log('Loaded dynamic config from Azure:', dynamicConfig);
      
      // Override localhost URLs with environment variables if the dynamic config returns localhost
      if (dynamicConfig.titilerBaseUrl?.includes('localhost')) {
        console.warn('Dynamic config contains localhost URLs, using environment variables instead');
        cachedConfig = {
          cogUrl: process.env.NEXT_PUBLIC_COG_URL || dynamicConfig.cogUrl,
          titilerBaseUrl: process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'http://localhost:8000',
          gameApiBaseUrl: process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'http://localhost:8000'
        };
        return cachedConfig;
      }
      
      cachedConfig = dynamicConfig;
      return cachedConfig;
    }
  } catch (error) {
    console.warn('Failed to load dynamic configuration, falling back to environment variables:', error);
  }

  // Fallback to environment variables
  cachedConfig = {
    cogUrl: process.env.NEXT_PUBLIC_COG_URL || 'https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif',
    titilerBaseUrl: process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'http://localhost:8000',
    gameApiBaseUrl: process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'http://localhost:8000'
  };

  return cachedConfig;
}

// Clear cached config (useful for testing or environment changes)
export function clearConfigCache(): void {
  cachedConfig = null;
}

// Helper to check if we're in production
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Get the appropriate API URL based on environment
export function getApiUrl(): string {
  return isProduction() 
    ? 'https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net'
    : process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'http://localhost:8000';
}