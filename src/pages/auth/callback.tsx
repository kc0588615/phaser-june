'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = supabaseBrowser();

      // Check for OAuth errors in URL
      const errorParam = router.query.error as string | undefined;
      const errorDescription = router.query.error_description as string | undefined;

      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      // Exchange PKCE code for session
      const code = router.query.code as string | undefined;

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          setError(exchangeError.message);
          return;
        }
      }

      // Successfully authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Trigger migration if needed
        const { DiscoveryMigrationService } = await import('@/services/discoveryMigrationService');

        if (DiscoveryMigrationService.needsMigration()) {
          console.log('Migrating guest discoveries to database...');
          await DiscoveryMigrationService.migrateLocalDiscoveries(user.id);
        }
      }

      // Redirect home
      router.replace('/');
    };

    // Only run when router is ready and has query params
    if (router.isReady) {
      handleCallback();
    }
  }, [router, router.isReady]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Authentication Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <Button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
        <p className="text-white">Signing you in…</p>
      </div>
    </div>
  );
}
