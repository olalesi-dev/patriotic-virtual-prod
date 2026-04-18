// Extend Express Request to include custom properties
declare namespace Express {
    interface Request {
        user?: any;
        appUser?: any;
        rawBody?: string;
    }
}
