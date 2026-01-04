'use client';

import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
        <div className="text-yellow-400 text-4xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-white mb-2">Auth Callback Disabled</h2>
        <p className="text-slate-300 mb-6">
          Authentication isn’t configured yet. Clerk integration is planned.
        </p>
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          >
            Back to Game
          </Button>
          <Button
            onClick={() => router.push('/login')}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            Sign In Page
          </Button>
        </div>
      </div>
    </div>
  );
}
