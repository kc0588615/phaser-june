// Home: pick a place on the globe (from the list, or by tapping a dot), see who
// lives there, then explore it in Clue Match. Found animals glow on the globe.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Shuffle } from 'lucide-react';
import { SignInButton, Show, UserButton } from '@clerk/nextjs';
import { classColor, type PlaceAnimal, type PlaceKind, type PlacesResponse } from '@/clueGame/places';
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
  const [kind, setKind] = useState<PlaceKind>('country');
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
  const shown = useMemo(() => (data?.places ?? []).filter(place => place.kind === (selected?.kind ?? kind)), [data, kind, selected]);
  const sightings = useMemo<GlobeSighting[]>(() => Object.values(journal).flatMap(entry =>
    (entry.sightings ?? []).map(sighting => ({ lon: sighting.lon, lat: sighting.lat, color: classColor(entry.className), name: entry.commonName }))), [journal]);
  const foundCount = Object.keys(journal).length;

  return (
    <>
      <Head><title>Critter Connect</title></Head>
      <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_42dvh_minmax(0,1fr)] overflow-hidden bg-[#06121a] text-white [grid-template-areas:'top'_'globe'_'panel'] md:grid-cols-[minmax(0,1fr)_420px] md:grid-rows-[auto_minmax(0,1fr)] md:[grid-template-areas:'globe_top'_'globe_panel']">
        <header className="flex min-w-0 items-center gap-2 px-3 py-2 [grid-area:top]">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-base font-bold leading-tight">Critter Connect</h1>
            <p className="m-0 truncate text-[11px] text-cyan-100/70">
              {data ? `${foundCount} of ${animals.size} animals found` : 'Pick a place to explore'}
            </p>
          </div>
          <Link href="/clue-match/" className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[13px] font-semibold text-white/85 no-underline active:bg-white/10" aria-label="Play with animals from everywhere">
            <Shuffle className="h-4 w-4" aria-hidden="true" /> Anywhere
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button" className="h-11 shrink-0 rounded-full bg-cyan-300 px-4 text-[13px] font-bold text-slate-950">Sign in</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="grid h-11 w-11 shrink-0 place-items-center"><UserButton /></div>
          </Show>
        </header>

        <section className="relative [grid-area:globe]" aria-label="Globe">
          <Globe places={shown} selected={selected} sightings={sightings} onPick={setSelectedKey} />
        </section>

        <div className="flex min-h-0 flex-col border-t border-white/10 pt-2 [grid-area:panel] md:border-l md:border-t-0">
          {error && <p className="m-3 rounded-lg border border-rose-400/40 bg-rose-950/40 p-2 text-xs text-rose-100" role="alert">{error}</p>}
          {!data && !error && <p className="m-3 text-xs text-white/60">Loading places…</p>}
          {data && selected && (
            <PlaceCard
              key={selected.key}
              place={selected}
              animals={selected.speciesIds.flatMap(id => animals.get(id) ?? [])}
              isFound={isFound}
              onBack={() => setSelectedKey(null)}
              onStart={() => router.push(`/clue-match/?place=${encodeURIComponent(selected.key)}`)}
            />
          )}
          {data && !selected && (
            <PlaceList
              places={data.places}
              kind={kind}
              onKind={setKind}
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
