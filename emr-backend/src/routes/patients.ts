import { Router } from 'express';
// import { db } from '../config/database'; // Future Use
// import { logger } from '../utils/logger';

const router = Router();

// GET /api/patients
router.get('/', async (req, res) => {
    // const { rows } = await db.query('SELECT * FROM patients WHERE organization_id = $1', [req['appUser'].organization_id]);
    res.json([{ id: 1, name: "John Doe" }]); // Mock Response
});

export default router;
