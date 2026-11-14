import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ClerkProvider } from '@clerk/nextjs';
import { MotionConfig } from 'motion/react';
import { THEME_COLORS } from '@/lib/theme';

// cc fonts (Nunito, Open Runde, Patrick Hand) are declared in globals.css; their files and OFL licences are in public/fonts/.
export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={THEME_COLORS.light} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={THEME_COLORS.dark} />
      </Head>
      {/* "user": with reduced motion on, motion/react skips movement and keeps fades. */}
      <MotionConfig reducedMotion="user">
        <Component {...pageProps} />
      </MotionConfig>
    </ClerkProvider>
  );
}
