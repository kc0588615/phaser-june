import { PLAY_URL } from '../config';

/** 404.html (plan 051 §4): send a lost visitor on to the game. */
export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start gap-m px-m py-xxl">
      <h1 className="font-brand text-xl font-heavy md:text-xxl">This page isn&apos;t here</h1>
      <p>The game is one click away.</p>
      <a href={PLAY_URL} className="btn btn-primary">Start playing</a>
    </section>
  );
}
