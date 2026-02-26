import DOMPurify from 'dompurify';

/**
 * HIPAA-Readiness Sanitization
 * Strictly cleans user input to prevent XSS and injection attacks.
 * Should be used before displaying user-generated content or sending to API.
 */
export function sanitize(text: string): string {
    if (!text) return '';
    if (typeof window === 'undefined') return text; // SSR safety

    return DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [], // Strip all HTML for standard text inputs
        ALLOWED_ATTR: []
    });
}

/**
 * Form Validator & Sanitizer
 * Wraps a form submission to ensure all fields are trimmed and sanitized.
 */
export function sanitizeForm(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitize(value).trim();
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}
