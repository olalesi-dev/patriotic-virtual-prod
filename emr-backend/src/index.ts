
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { enforceMfaForStaff, loadUserContext, verifyFirebaseToken } from './middleware/auth';
import { errorHandler } from './middleware/error';
import healthRoutes from './routes/health';
import appointmentRoutes from './routes/appointments';
import patientRoutes from './routes/patients';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 8080;

// Security & Metrics
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL })); // Strict CORS
app.use(morgan('combined'));
app.use(express.json());

// Public Routes (No Auth)
app.use('/health', healthRoutes);

// Protected EMR Routes (Require Auth + MFA)
app.use('/api', verifyFirebaseToken, loadUserContext, enforceMfaForStaff); // Global MFA Gate

// Routes
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);

// Error Handling
app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`EMR Backend listening on port ${PORT}`);
});
