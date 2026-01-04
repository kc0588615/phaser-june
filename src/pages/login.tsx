import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 text-center bg-slate-800 rounded-lg shadow-xl p-8 border border-slate-700">
        <h1 className="text-3xl font-bold text-white">Sign In</h1>
        <p className="text-slate-300">
          Authentication isn’t enabled yet. Clerk integration is planned, but the sign-in flow is not implemented.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          >
            Back to Game
          </Button>
          <Button
            onClick={() => router.push('/stats')}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            View Stats Page
          </Button>
        </div>
      </div>
    </div>
  );
}
