import dynamic from 'next/dynamic';

const TerrainVarietyFixture = dynamic(
  () => import('@/components/TerrainVarietyFixture').then(mod => mod.TerrainVarietyFixture),
  { ssr: false },
);

export default function TerrainVarietyFixturePage() {
  return <TerrainVarietyFixture />;
}
