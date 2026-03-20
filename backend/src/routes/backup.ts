import { Router } from 'express';
import { exportData, importData } from '../controllers/backupController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Export all user data
router.get('/export', exportData);

// Import data
router.post('/import', importData);

export default router;
