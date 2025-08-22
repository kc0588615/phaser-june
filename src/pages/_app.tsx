import "@/styles/globals.css";
import "@/styles/species-card-mobile.css";
import "@/styles/category-heading.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
