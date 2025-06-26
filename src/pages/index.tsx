import Head from "next/head";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

// Dynamically import your new layout component
const MainAppLayoutWithNoSSR = dynamic(
    () => import("@/MainAppLayout"), // Adjust path if you placed it elsewhere
    { ssr: false } // Crucial for client-side only rendering
);

export default function Home() {
    return (
        <>
            <Head>
                <title>Phaser Cesium Next.js</title> {/* Update title */}
                <meta name="description" content="Phaser 3 and Cesium with Next.js" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.png" />
            </Head>
            <main className={inter.className}>
                <MainAppLayoutWithNoSSR />
            </main>
        </>
    );
}
