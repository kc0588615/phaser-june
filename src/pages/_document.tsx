import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en" className="dark">
            <Head>
                {/* Link to Cesium's widgets.css */}
                <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
