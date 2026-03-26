"use client";

import Script from "next/script";

/**
 * Minimal GA4 tracking for Next.js App Router natively supporting SPA
 * client-side route changes via GA4 Enhanced Measurement.
 * 
 * NOTE: The cleanest standard way to "prevent duplicate pageview firing" 
 * in Next.js 13+ App Router with GA4 is to NOT use a manual `useEffect` 
 * to trigger `page_view` events, because GA4 Enhanced Measurement 
 * natively tracks History API `pushState` changes out of the box. 
 * Adding a manual route change tracker alongside Enhanced Measurement 
 * reliably causes duplicate page views.
 */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            
            // This initializes GA4 and sends the initial pageview.
            // Subsequent client-side route changes are automatically 
            // tracked by GA4 Enhanced Measurement using History API.
            gtag('config', '${gaId}');
          `,
        }}
      />
    </>
  );
}
