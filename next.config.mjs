import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingRoot: projectRoot,
    outputFileTracingIncludes: {
        '/*': ['server-assets/field-plates/*.png']
    },

    // Server runtime enabled for Drizzle/API routes
    // (removed output: 'export')

    trailingSlash: true,
    // distDir removed - Vercel requires default '.next' directory

    // Image optimization (required for static export)
    images: {
        unoptimized: true
    },

    // Security headers
    poweredByHeader: false,

    // Compression and optimization
    compress: true,
    generateEtags: true,

    // Webpack configuration
    webpack: (config, { isServer }) => {
        // Client-side optimizations
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                crypto: false,
                stream: false,
                buffer: false,
                process: false
            };
        }

        return config;
    },

    // Headers for security and performance
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    // Removed X-Frame-Options: DENY to allow embedding in IDE preview panes
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    }
                ]
            },
            {
                source: '/assets/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                    }
                ]
            }
        ];
    }
};

export default nextConfig;
