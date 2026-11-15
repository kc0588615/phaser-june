import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
    // e2e:fresh runs its own dev server beside `npm run dev`: a separate output directory, so its own lock.
    distDir: process.env.NEXT_DIST_DIR || '.next',
    // A package-lock.json in a parent directory would otherwise be taken as the workspace root.
    outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
    trailingSlash: true,
    poweredByHeader: false,
    // Dev only: open the WSL dev server from Windows by its 172.x address (otherwise Next blocks its live reload and the page keeps reloading).
    allowedDevOrigins: ['172.*.*.*'],

    async redirects() {
        return [
            // The game moved from /clue-match to /explore (plan 041); old links keep their ?place= and ?seed=.
            { source: '/clue-match', destination: '/explore', permanent: true },
            // Clerk's settings still name /login as the sign-in page until the owner deletes the instance.
            { source: '/login', destination: '/', permanent: true },
        ];
    },
};

export default nextConfig;
