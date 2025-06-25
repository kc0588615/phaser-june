/** @type {import('next').NextConfig} */
const nextConfig = {
    // Conditionally enable static export only for production builds
    // During development, we need server features like API routes
    ...(process.env.NODE_ENV === 'production' && process.env.DISABLE_STATIC_EXPORT !== 'true' 
        ? { output: 'export' } 
        : {}),
    distDir: 'dist',
    // Add webpack configuration
    webpack: (config, { webpack }) => { // Destructure webpack from the second argument (options)
        config.plugins.push(
            new webpack.DefinePlugin({
                // Define CESIUM_BASE_URL as a global variable
                'CESIUM_BASE_URL': JSON.stringify('/cesium/')
            })
        );
        return config;
    },
};

export default nextConfig;
