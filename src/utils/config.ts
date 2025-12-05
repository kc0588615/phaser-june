// src/utils/config.ts
// Configuration utility for TiTiler endpoint loading

interface AppConfig {
  cogUrl: string;
  titilerBaseUrl: string;
}

let cachedConfig: AppConfig | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  // Always use environment variables
  cachedConfig = {
    cogUrl: process.env.NEXT_PUBLIC_COG_URL || 'https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif',
    titilerBaseUrl: process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com'
  };

  console.log('App config loaded from environment variables:', {
    cogUrl: cachedConfig.cogUrl,
    titilerBaseUrl: cachedConfig.titilerBaseUrl
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