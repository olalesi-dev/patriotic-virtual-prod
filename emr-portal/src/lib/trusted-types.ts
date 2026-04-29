/**
 * Trusted Types Initialization
 * This file sets up a Trusted Types policy to allow Firebase Auth to perform
 * DOM operations (like injecting the auth iframe) in environments where 
 * Trusted Types are enforced by CSP.
 */

export function initializeTrustedTypes() {
    if (typeof window !== 'undefined' && (window as any).trustedTypes) {
        const tt = (window as any).trustedTypes;
        console.log('Trusted Types detected in environment.');

        // Create a default policy that allows pass-through if no specific policy is found.
        if (!tt.defaultPolicy) {
            try {
                tt.createPolicy('default', {
                    createHTML: (string: string) => string,
                    createScriptURL: (string: string) => string,
                    createScript: (string: string) => string,
                });
                console.log('Trusted Types [default] policy initialized.');
            } catch (e) {
                console.warn('Failed to create Trusted Types [default] policy:', e);
            }
        }

        // Explicitly create firebase-auth and google-auth policies if needed
        const policies = ['firebase-auth', 'google-auth', 'dompurify'];
        policies.forEach(name => {
            try {
                // Check if getPolicyNames exists to avoid TypeError
                const exists = tt.getPolicyNames ? tt.getPolicyNames().includes(name) : false;

                if (!exists) {
                    tt.createPolicy(name, {
                        createHTML: (string: string) => string,
                        createScriptURL: (string: string) => string,
                        createScript: (string: string) => string, // Added createScript just in case
                    });
                    console.log(`Trusted Types [${name}] policy initialized.`);
                }
            } catch (e: any) {
                // If it already exists, createPolicy will throw. We can ignore that specific error.
                if (e.message && e.message.includes('already exists')) {
                    console.log(`Trusted Types [${name}] policy already exists.`);
                } else {
                    console.warn(`Failed to create Trusted Types [${name}] policy:`, e);
                }
            }
        });
    } else {
        console.log('Trusted Types not supported/enforced in this environment.');
    }
}
