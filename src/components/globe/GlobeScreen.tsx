// Home: pick a continent on the globe (from the list, or by tapping its dot), see
// who lives there, then explore it. Found animals glow on the globe.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Shuffle } from 'lucide-react';
import { SignInButton, Show, UserButton } from '@clerk/nextjs';
import { MIN_PLACE_ANIMALS, classColor, type PlaceAnimal, type PlacesResponse } from '@/clueGame/places';
import { useJournal } from '@/components/clueGame/useJournal';
import { getJson } from '@/lib/getJson';
import { Globe, type GlobeSighting } from './Globe';
import { PlaceCard } from './PlaceCard';
import { PlaceList } from './PlaceList';

export function GlobeScreen() {
  const router = useRouter();
  const [data, setData] = useState<PlacesResponse | null>(null);
  const { journal } = useJournal(data?.places);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJson<PlacesResponse>('/api/places/')
      .then(result => { if (!cancelled) setData(result); })
      .catch(failure => {
        console.error('[Globe] Failed to load places:', failure);
        if (!cancelled) setError('Could not load places. Check the connection and reload.');
      });
    return () => { cancelled = true; };
  }, []);

  const animals = useMemo(() => new Map((data?.animals ?? []).map(animal => [animal.id, animal])), [data]);
  const isFound = useCallback((animal: PlaceAnimal) => Boolean(journal[animal.scientificName]), [journal]);
  const selected = data?.places.find(place => place.key === selectedKey) ?? null;
  // Rounds draw from a whole continent (plan 041); countries and wildlife areas are too small a pool.
  const shown = useMemo(() => (data?.places ?? []).filter(place => place.kind === 'continent'), [data]);
  const sightings = useMemo<GlobeSighting[]>(() => Object.values(journal).flatMap(entry =>
    (entry.sightings ?? []).map(sighting => ({ lon: sighting.lon, lat: sighting.lat, color: classColor(entry.className), name: entry.commonName }))), [journal]);
  const foundCount = Object.keys(journal).length;

  return (
    <>
      <Head><title>Critter Connect</title></Head>
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_42dvh_minmax(0,1fr)] overflow-hidden bg-neutral-1 text-neutral-10 [grid-template-areas:'top'_'globe'_'panel'] md:grid-cols-[minmax(0,1fr)_420px] md:grid-rows-[auto_minmax(0,1fr)] md:[grid-template-areas:'globe_top'_'globe_panel']">
        <header className="flex min-w-0 items-center gap-xs px-s py-xs [grid-area:top]">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 leading-none">
              {/* The wordmark in the mode's text color (the -light file is the same art with a black wordmark). */}
              <picture>
                <source srcSet="/branding/critterconnect-logo-light.svg" media="(prefers-color-scheme: light)" />
                <img src="/branding/critterconnect-logo.svg" alt="Critter Connect" className="block h-6 w-auto" />
              </picture>
            </h1>
            <p className="m-0 truncate text-xs text-neutral-7">
              {data ? `${foundCount} of ${animals.size} animals found` : 'Pick a place to explore'}
            </p>
          </div>
          <Link href="/explore/" className="btn btn-outline shrink-0" aria-label="Play with animals from everywhere">
            <Shuffle className="h-4 w-4" aria-hidden="true" /> Anywhere
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="btn btn-primary shrink-0">Sign in</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="grid h-11 w-11 shrink-0 place-items-center"><UserButton /></div>
          </Show>
        </header>

        <section className="relative [grid-area:globe]" aria-label="Globe">
          <Globe places={shown} selected={selected} sightings={sightings} onPick={setSelectedKey} />
        </section>

        <div className="flex min-h-0 flex-col pt-xs shadow-[inset_0_1px_0_0_var(--neutral-4)] [grid-area:panel] md:shadow-[inset_1px_0_0_0_var(--neutral-4)]">
          {error && <p className="m-s rounded-xs bg-error-transparent p-xs text-xs text-neutral-10" role="alert">{error}</p>}
          {!data && !error && <p className="m-s text-xs text-neutral-7">Loading places…</p>}
          {data && selected && (
            <PlaceCard
              key={selected.key}
              place={selected}
              animals={selected.speciesIds.flatMap(id => animals.get(id) ?? [])}
              isFound={isFound}
              onBack={() => setSelectedKey(null)}
              minAnimals={MIN_PLACE_ANIMALS}
              onStart={() => router.push(`/explore/?place=${encodeURIComponent(selected.key)}`)}
            />
          )}
          {data && !selected && (
            <PlaceList
              places={shown}
              minAnimals={MIN_PLACE_ANIMALS}
              selectedKey={selectedKey}
              foundIn={place => place.speciesIds.filter(id => { const animal = animals.get(id); return animal ? isFound(animal) : false; }).length}
              onPick={setSelectedKey}
            />
          )}
        </div>
      </main>
    </>
  );
}
