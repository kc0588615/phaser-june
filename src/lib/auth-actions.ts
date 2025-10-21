'use client';

import { supabaseBrowser } from '@/lib/supabase-browser';

export async function signInWithGoogle() {
  const supabase = supabaseBrowser();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirect to auth callback after OAuth
      redirectTo: `${location.origin}/auth/callback`,
    },
  });
  if (error) console.error('Google OAuth error', error);
}

export async function signOut() {
  const supabase = supabaseBrowser();
  await supabase.auth.signOut();
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = supabaseBrowser();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/auth/callback` },
  });
  if (error) console.error('Email sign-up error', error);
  return { error };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = supabaseBrowser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) console.error('Email sign-in error', error);
  return { error };
}
