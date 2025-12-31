/** @type {import('next').NextConfig} */
const nextConfig = {
    // Server runtime enabled for Prisma/API routes
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
    webpack: (config, { webpack, isServer }) => {
        // Define global Cesium variable
        config.plugins.push(
            new webpack.DefinePlugin({
                'CESIUM_BASE_URL': JSON.stringify('/cesium/')
            })
        );

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
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY'
                    },
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
                source: '/cesium/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable'
                    },
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: '*'
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
