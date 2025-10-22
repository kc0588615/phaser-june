'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (!router.isReady || processedRef.current) {
      return;
    }

    processedRef.current = true;
    let isCancelled = false;

    const handleCallback = async () => {
      try {
        const supabase = supabaseBrowser();

        // Check for OAuth errors in URL
        const rawError = router.query.error;
        const rawErrorDescription = router.query.error_description;
        const errorParam = Array.isArray(rawError) ? rawError[0] : rawError;
        const errorDescription = Array.isArray(rawErrorDescription)
          ? rawErrorDescription[0]
          : rawErrorDescription;

        if (errorParam) {
          if (!isCancelled) {
            setError(errorDescription || errorParam);
          }
          return;
        }

        // Wait for Supabase client to finish any automatic PKCE handling
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (isCancelled) return;

        if (sessionError) {
          console.error('Session retrieval error:', sessionError);
          setError(sessionError.message);
          return;
        }

        if (!session) {
          setError('Authentication session not found. Please try signing in again.');
          return;
        }

        // Successfully authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (isCancelled) return;

        if (user) {
          // Trigger migration if needed
          const { DiscoveryMigrationService } = await import('@/services/discoveryMigrationService');

          if (DiscoveryMigrationService.needsMigration()) {
            console.log('Migrating guest discoveries to database...');
            await DiscoveryMigrationService.migrateLocalDiscoveries(user.id);
          }
        }

        if (!isCancelled) {
          // Redirect home
          router.replace('/');
        }
      } catch (callbackError) {
        console.error('Authentication callback error:', callbackError);
        if (!isCancelled) {
          setError('An unexpected error occurred during authentication. Please try again.');
        }
      }
    };

    handleCallback();

    return () => {
      isCancelled = true;
    };
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
