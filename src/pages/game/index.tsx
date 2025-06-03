import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function GameIndex() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/game/play');
  }, [router]);
  
  return null;
}