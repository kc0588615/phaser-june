import dynamic from 'next/dynamic';
import { GameSidebar } from '@/components/game/GameSidebar';

const PhaserGame = dynamic(
  () => import('@/PhaserGame').then(mod => ({ default: mod.PhaserGame })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    )
  }
);

export default function PlayPage() {
  return (
    <div className="flex h-screen bg-background">
      <GameSidebar />
      <main className="flex-1 pb-20 lg:pb-0 overflow-hidden">
        <div className="w-full h-full flex items-center justify-center bg-slate-900">
          <PhaserGame />
        </div>
      </main>
    </div>
  );
}