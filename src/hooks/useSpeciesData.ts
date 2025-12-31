import { useQuery } from '@tanstack/react-query';
import type { Species } from '@/types/database';

/**
 * Custom hook to fetch species data via API with React Query
 */
export function useSpeciesData() {
  return useQuery<Species[], Error>({
    queryKey: ['species', 'all'],
    queryFn: async ({ signal }) => {
      console.log('-> Fetching species data from API...');

      const response = await fetch('/api/species/catalog', { signal });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to fetch species');
      }

      const data = await response.json();
      console.log(`Loaded ${data.count || 0} species successfully`);
      return data.species || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
