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
    experimental: {
        serverComponentsExternalPackages: ['firebase-admin'],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://apis.google.com https://accounts.google.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://www.googletagmanager.com https://doxy.me; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://api.stripe.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com; img-src 'self' data: https://storage.googleapis.com https://*.stripe.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://*.stripe.com https://*.firebaseapp.com https://*.google.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://doxy.me; trusted-types firebase-auth google-auth firebase-js-sdk-policy gapi#gapi goog#html dompurify nextjs#bundler default;"
                    }
                ],
            },
            {
                source: '/(my-health|patient/messages|patient/billing|patient/appointments)/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
                    { key: 'Pragma', value: 'no-cache' },
                    { key: 'Expires', value: '0' },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
