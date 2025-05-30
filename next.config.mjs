/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
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
