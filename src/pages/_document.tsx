import { Html, Head, Main, NextScript } from "next/document";
import { THEME_SCRIPT } from "@/lib/theme";

export default function Document() {
    return (
        <Html lang="en" className="dark">
            <Head>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                {/* Light/dark before first paint (src/lib/theme.ts). */}
                <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
