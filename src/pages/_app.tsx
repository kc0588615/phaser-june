import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ClerkProvider } from '@clerk/nextjs';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#06121a" />
      </Head>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
