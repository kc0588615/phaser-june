import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Home: straight to Clue Match (the globe screen replaces this). */
export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/clue-match'); }, [router]);
  return null;
}
