/** @type {import('next').NextConfig} */
const nextConfig = {
    // basePath: '/emr',
    reactStrictMode: true,
    // output: 'export',
    images: {
        domains: ['storage.googleapis.com'],
        unoptimized: true,
    },
    transpilePackages: ['undici', 'firebase', '@firebase/auth'],
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com; img-src 'self' data: https://storage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
                    }
                ],
            },
            {
                source: '/reset-cache',
                headers: [
                    { key: 'Clear-Site-Data', value: '"cache", "cookies", "storage", "executionContexts"' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
