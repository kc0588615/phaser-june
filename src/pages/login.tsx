import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-1 px-m">
      <SignIn routing="hash" />
    </div>
  );
}
