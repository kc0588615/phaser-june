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

  // For Vercel deployment, always use environment variables
  // Dynamic config fetching is disabled to avoid build-time issues and CORS problems
  cachedConfig = {
    cogUrl: process.env.NEXT_PUBLIC_COG_URL || 'https://azurecog.blob.core.windows.net/cogtif/habitat_cog.tif',
    titilerBaseUrl: process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net',
    gameApiBaseUrl: process.env.NEXT_PUBLIC_GAME_API_BASE_URL || process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net'
  };

  console.log('App config loaded from environment variables:', {
    cogUrl: cachedConfig.cogUrl,
    titilerBaseUrl: cachedConfig.titilerBaseUrl,
    gameApiBaseUrl: cachedConfig.gameApiBaseUrl
  });

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
    : process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'https://azure-local-dfgagqgub7fhb5fv.eastus-01.azurewebsites.net';
}