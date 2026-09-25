import Link from 'next/link';
import { BookOpen, CircleHelp, Flame, Globe2, Star, Trophy } from 'lucide-react';

export function TopBar({ placeName, round, live, total, score, streak, solved, onHelp, onJournal }: {
  /** The globe place being explored, if any; shown as the title. */
  placeName: string | null;
  round: number | null;
  live: number;
  total: number;
  score: number;
  streak: number;
  solved: number;
  onHelp: () => void;
  onJournal: () => void;
}) {
  const stats = [
    { label: 'Score', value: score, icon: <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" /> },
    { label: 'Streak', value: streak, icon: <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" /> },
    { label: 'Solved', value: solved, icon: <Trophy className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" /> },
  ];
  return (
    <header className="flex min-w-0 items-center gap-1 py-1.5 pl-1 pr-3 [grid-area:top]">
      <Link href="/" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="Back to the globe">
        <Globe2 className="h-5 w-5" />
      </Link>
      <div className="min-w-0">
        <h1 className="m-0 truncate text-base font-bold leading-tight">{placeName ?? 'Clue Match'}</h1>
        <p className="m-0 truncate text-[11px] leading-tight text-cyan-100/70" aria-live="polite">
          {round === null ? 'Loading animals…' : `Animal ${round} · ${live} of ${total} left`}
        </p>
      </div>
      <dl className="m-0 ml-auto flex shrink-0 items-center gap-2">
        {stats.map(stat => (
          <div key={stat.label} className="flex items-center gap-1" title={stat.label}>
            <dt className="sr-only">{stat.label}</dt>
            {stat.icon}
            <dd className="m-0 text-sm font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={onJournal} className="grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="Field journal">
        <BookOpen className="h-5 w-5" />
      </button>
      <button type="button" onClick={onHelp} className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="How to play">
        <CircleHelp className="h-5 w-5" />
      </button>
    </header>
  );
}
