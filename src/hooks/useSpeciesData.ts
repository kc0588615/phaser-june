import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Species } from '@/types/database';

/**
 * Custom hook to fetch species data from Supabase with React Query
 *
 * Features:
 * - Automatic retries with exponential backoff (configured in QueryClient)
 * - Request cancellation via AbortController on unmount/navigation
 * - Refetch on window focus and reconnect
 * - 5-minute stale time for caching
 * - Proper cleanup on unmount
 *
 * @returns React Query result with species data, loading state, error, and refetch function
 */
export function useSpeciesData() {
  return useQuery<Species[], Error>({
    queryKey: ['species', 'all'],
    queryFn: async ({ signal }) => {
      console.log('→ Fetching species data from Supabase...');

      const { data, error } = await supabase
        .from('icaa')
        .select('*')
        .order('comm_name', { ascending: true })
        .abortSignal(signal); // React Query's abort signal for cancellation

      if (error) {
        console.error('✗ Species fetch failed:', error);
        throw error;
      }

      console.log(`✓ Loaded ${data?.length || 0} species successfully`);
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache
    // Retry config inherited from QueryClient defaults in _app.tsx
  });
}
