import dynamic from 'next/dynamic';

// Plan 044: the animal board.
const AnimalGame = dynamic(
  () => import('@/components/animalBoard/AnimalGame').then(mod => mod.AnimalGame),
  { ssr: false },
);

export default function ExplorePage() {
  return <AnimalGame />;
}
