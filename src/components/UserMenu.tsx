import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { signOut } from '@/lib/auth-actions';
import { Button } from '@/components/ui/button';
import { User, LogOut, LogIn, BarChart3 } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();

    // Get initial session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Button
        onClick={() => router.push('/login')}
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:text-white"
      >
        <LogIn className="h-4 w-4 mr-2" />
        Sign In
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-md border border-slate-700">
        <User className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-300">
          {user.email?.split('@')[0] || 'User'}
        </span>
      </div>
      <Button
        onClick={() => router.push('/stats')}
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:text-white"
        title="View Stats"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Stats
      </Button>
      <Button
        onClick={handleSignOut}
        variant="ghost"
        size="sm"
        className="text-slate-300 hover:text-white"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
