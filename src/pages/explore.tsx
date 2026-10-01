import dynamic from 'next/dynamic';

// Plan 044 (branch variant/044-animal-board): the animal board. The 043 game (MatchGame) is still in the tree.
const AnimalGame = dynamic(
  () => import('@/components/animalBoard/AnimalGame').then(mod => mod.AnimalGame),
  { ssr: false },
);

export default function ExplorePage() {
  return <AnimalGame />;
}
