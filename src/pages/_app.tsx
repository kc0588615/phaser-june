import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ClerkProvider } from '@clerk/nextjs';
import { useEnsureProfile } from '@/hooks/useEnsureProfile';

function EnsureProfile() {
  useEnsureProfile();
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <EnsureProfile />
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
