import dynamic from 'next/dynamic';

const MatchGame = dynamic(
  () => import('@/components/clueGame/MatchGame').then(mod => mod.MatchGame),
  { ssr: false },
);

export default function ExplorePage() {
  return <MatchGame />;
}
