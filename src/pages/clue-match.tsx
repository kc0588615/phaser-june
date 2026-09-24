import dynamic from 'next/dynamic';

const ClueMatchGame = dynamic(
  () => import('@/components/clueGame/ClueMatchGame').then(mod => mod.ClueMatchGame),
  { ssr: false },
);

export default function ClueMatchPage() {
  return <ClueMatchGame />;
}
