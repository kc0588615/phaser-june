import dynamic from 'next/dynamic';

const RoutingPrototypeApp = dynamic(
  () => import('@/components/RoutingPrototypeApp').then(mod => mod.RoutingPrototypeApp),
  { ssr: false },
);

export default function RoutingPrototypePage() {
  return <RoutingPrototypeApp />;
}
