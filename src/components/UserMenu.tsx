import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { LogIn, BarChart3 } from 'lucide-react';

export default function UserMenu() {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => router.push('/stats')}
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:text-white"
        title="Player stats (auth coming soon)"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Stats
      </Button>
      <Button
        onClick={() => router.push('/login')}
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:text-white"
      >
        <LogIn className="h-4 w-4 mr-2" />
        Sign In
      </Button>
    </div>
  );
}
