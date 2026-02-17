import { Router } from 'express';
import { db } from '../config/database';
const router = Router();

router.get('/', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'UP', database: 'CONNECTED' });
    } catch (e) {
        res.status(503).json({ status: 'DOWN', database: 'DISCONNECTED' });
    }
});

export default router;
