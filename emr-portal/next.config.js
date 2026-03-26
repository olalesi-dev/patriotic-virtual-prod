function getOriginFromEnv(url) {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

const apiOrigin = getOriginFromEnv(process.env.NEXT_PUBLIC_API_URL?.trim());
const doseSpotBackendUrl = (process.env.DOSESPOT_BACKEND_URL || 'https://patriotic-virtual-backend-ckia3at3ra-uc.a.run.app').trim();

const connectSrc = [
    "'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'https://accounts.google.com',
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://www.google.com/recaptcha/',
    'https://www.recaptcha.net/recaptcha/',
    'https://api.stripe.com',
    apiOrigin,
].filter(Boolean).join(' ');

const frameSrc = [
    "'self'",
    'https://*.stripe.com',
    'https://*.firebaseapp.com',
    'https://accounts.google.com',
    'https://www.google.com/recaptcha/',
    'https://www.recaptcha.net/recaptcha/',
    'https://doxy.me',
    'https://my.dosespot.com',
    'https://my.staging.dosespot.com',
].join(' ');

const contentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebaseapp.com https://*.googleapis.com https://apis.google.com https://*.gstatic.com https://accounts.google.com https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.recaptcha.net/recaptcha/ https://www.gstatic.cn/recaptcha/ https://doxy.me",
    `connect-src ${connectSrc}`,
    "img-src 'self' data: https://storage.googleapis.com https://*.googleusercontent.com https://*.gstatic.com https://www.google-analytics.com https://www.googletagmanager.com https://*.stripe.com",
    "media-src 'self' https://cdn.prod.website-files.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `frame-src ${frameSrc}`,
    "trusted-types firebase-auth google-auth gapigapi 'allow-duplicates' goog#html default nextjs#bundler nextjs#hydrator dompurify firebase-js-sdk-policy",
].join('; ');

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
    async rewrites() {
        return [
            {
                source: '/api/v1/dosespot/:path*',
                destination: `${doseSpotBackendUrl}/api/v1/dosespot/:path*`
            }
        ];
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
                        value: contentSecurityPolicy
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
