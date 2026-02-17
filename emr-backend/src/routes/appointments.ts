import { Router } from 'express';
// import { TelehealthService } from '../services/telehealth';

const router = Router();
// const telehealth = new TelehealthService();

router.get('/', (req, res) => {
    res.json([]);
});

export default router;
