import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // A package-lock.json in a parent directory would otherwise be taken as the workspace root.
    outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
    trailingSlash: true,
    poweredByHeader: false,

    async headers() {
        // Dev only: Turbopack serves /_next/static/development/_clientMiddlewareManifest.js as JSON, which nosniff blocks.
        if (process.env.NODE_ENV !== 'production') return [];
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
        ];
    },
};

export default nextConfig;
