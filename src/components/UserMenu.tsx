import { useRouter } from 'next/router';
import { useUser, UserButton, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { BarChart3, LogIn } from 'lucide-react';

export default function UserMenu() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => router.push('/stats')}
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:text-white"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Stats
      </Button>
      {isSignedIn ? (
        <UserButton />
      ) : (
        <SignInButton mode="redirect">
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </SignInButton>
      )}
    </div>
  );
}
