import Link from 'next/link';
import { BookOpen, CircleHelp, Flame, Globe2, Star, Volume2, VolumeX } from 'lucide-react';

export function TopBar({ placeName, roundNo, standing, total, movesLeft, moves, score, streak, worth, soundOn, onSound, onHelp, onJournal }: {
  /** The continent being explored, if any; shown as the title. */
  placeName: string | null;
  roundNo: number | null;
  standing: number;
  total: number;
  movesLeft: number;
  moves: number;
  score: number;
  streak: number;
  /** What a right guess would score now. */
  worth: number;
  soundOn: boolean;
  onSound: () => void;
  onHelp: () => void;
  onJournal: () => void;
}) {
  return (
    <header className="flex min-w-0 items-center gap-1 py-1.5 pl-1 pr-2 [grid-area:top]">
      <Link href="/" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="Back to the globe">
        <Globe2 className="h-5 w-5" />
      </Link>
      <div className="min-w-0">
        <h1 className="m-0 truncate text-base font-bold leading-tight">{placeName ?? 'Critter Connect'}</h1>
        <p className="m-0 truncate text-[11px] leading-tight text-cyan-100/70" aria-live="polite">
          {roundNo === null ? 'Loading animals…' : `Animal ${roundNo} · ${standing} of ${total} left${worth > 0 ? ` · +${worth} if right` : ''}`}
        </p>
      </div>
      <dl className="m-0 ml-auto flex shrink-0 items-center gap-2.5">
        <div className="flex flex-col items-center" title="Moves left">
          <dt className="sr-only">Moves left</dt>
          <dd className="m-0 text-sm font-bold tabular-nums leading-none">{movesLeft}</dd>
          <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
            {Array.from({ length: moves }, (_, index) => <i key={index} className={`h-1.5 w-2 rounded-sm ${index < movesLeft ? 'bg-emerald-300' : 'bg-white/15'}`} />)}
          </span>
        </div>
        <div className="flex items-center gap-1" title="Score">
          <dt className="sr-only">Score</dt>
          <Star className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          <dd className="m-0 text-sm font-bold tabular-nums">{score}</dd>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1" title="Streak">
            <dt className="sr-only">Streak</dt>
            <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
            <dd className="m-0 text-sm font-bold tabular-nums">{streak}</dd>
          </div>
        )}
      </dl>
      <button type="button" onClick={onSound} className="grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label={soundOn ? 'Sound on. Turn it off' : 'Sound off. Turn it on'} aria-pressed={soundOn}>
        {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </button>
      <button type="button" onClick={onJournal} className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="Field journal">
        <BookOpen className="h-5 w-5" />
      </button>
      <button type="button" onClick={onHelp} className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-cyan-100/80 hover:bg-white/10" aria-label="How to play">
        <CircleHelp className="h-5 w-5" />
      </button>
    </header>
  );
}
