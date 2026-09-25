import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en" className="dark">
            <Head>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
