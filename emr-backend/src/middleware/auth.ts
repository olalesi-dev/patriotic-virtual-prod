
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../config/database';

export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    try {
        const decodeValue = await admin.auth().verifyIdToken(token);
        if (decodeValue) {
            req['user'] = decodeValue;
            return next();
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    } catch (e) {
        return res.status(500).json({ error: 'Internal Error' });
    }
};

export const loadUserContext = async (req: Request, res: Response, next: NextFunction) => {
    const firebaseUid = req['user']?.uid;
    if (!firebaseUid) return res.status(401).send('Unauthorized');

    try {
        const userRes = await db.query('SELECT * FROM users JOIN user_roles ON users.id = user_roles.user_id JOIN roles ON user_roles.role_id = roles.id WHERE firebase_uid = $1', [firebaseUid]);
        if (userRes.rows.length === 0) return res.status(403).json({ error: 'User not found in EMR' });

        req['appUser'] = userRes.rows[0]; // Complete user context
        next();
    } catch (e) {
        return res.status(500).json({ error: 'Database Error' });
    }
};

export const enforceMfaForStaff = (req: Request, res: Response, next: NextFunction) => {
    const user = req['appUser'];
    // Staff roles: SuperAdmin, OrgAdmin, Provider, Staff, Biller
    const staffRoles = ['SuperAdmin', 'OrgAdmin', 'Provider', 'Staff', 'Biller'];

    if (staffRoles.includes(user.role_name)) {
        // MFA Enforcement disabled for now
        /*
        if (!user.mfa_enrolled_at) {
            return res.status(403).json({
                error: 'MFA_REQUIRED',
                message: 'Multifactor authentication is required. Please enroll.'
            });
        }
        const isMfaVerified = req.headers['x-mfa-verified'] === 'true'; 
        if (!isMfaVerified) {
            return res.status(403).json({ error: 'MFA_CHALLENGE', message: 'Please verify generic MFA.' });
        }
        */
    }
    next();
};
