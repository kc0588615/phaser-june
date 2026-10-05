import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ClerkProvider } from '@clerk/nextjs';
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google';

// Next has no fallback metrics for this family (warns on every build), so skip the generated fallback.
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], adjustFontFallback: false, fallback: ['system-ui', 'sans-serif'] });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#08110D" />
      </Head>
      {/* On :root so Clerk's portalled modals get the fonts too. */}
      <style jsx global>{`
        :root { --font-atkinson: ${atkinson.style.fontFamily}; --font-bricolage: ${bricolage.style.fontFamily}; }
      `}</style>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
