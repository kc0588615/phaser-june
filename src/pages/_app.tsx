import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ClerkProvider } from '@clerk/nextjs';
import { MotionConfig } from 'motion/react';

// cc fonts (GT Maru, Open Runde) are named in globals.css; their files are licensed and added separately.
export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* cc canvas (neutral-1) per mode; a meta tag can't read the CSS variable. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#051411" />
      </Head>
      {/* "user": with reduced motion on, motion/react skips movement and keeps fades. */}
      <MotionConfig reducedMotion="user">
        <Component {...pageProps} />
      </MotionConfig>
    </ClerkProvider>
  );
}
