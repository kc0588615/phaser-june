import Head from 'next/head';
import { useRouter } from 'next/router';
import { ChevronLeft } from 'lucide-react';
import { ProfileContent } from '@/components/ProfileContent';

export default function ProfilePage() {
  const router = useRouter();
  const queryUserId = typeof router.query.userId === 'string' ? router.query.userId : null;

  return (
    <>
      <Head>
        <title>Field Profile</title>
      </Head>

      <div className="min-h-screen bg-ds-bg text-ds-text-primary pb-24">
        <div className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button
            onClick={() => router.push('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full glass-bg text-ds-text-secondary hover:text-ds-text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-ds-heading-lg flex-1">Field Profile</h1>
        </div>

        <ProfileContent userId={queryUserId} />
      </div>
    </>
  );
}
