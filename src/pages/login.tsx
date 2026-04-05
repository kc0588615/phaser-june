import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <SignIn routing="hash" />
    </div>
  );
}
