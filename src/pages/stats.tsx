'use client';

import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function StatsPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  return (
    <>
      <Head>
        <title>Player Stats - Unavailable</title>
      </Head>
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
        <Card className="bg-slate-800/40 border-slate-700/50 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Player Stats Unavailable</h2>
          <p className="text-slate-300 mb-6">
            Authentication isn’t enabled yet. Player stats will be available after Clerk integration.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleBack}
              variant="outline"
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
            >
              Back to Game
            </Button>
            <Button
              onClick={() => router.push('/login')}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Sign In
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
