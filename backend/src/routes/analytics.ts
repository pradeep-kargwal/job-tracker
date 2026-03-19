import { Router } from 'express';
import {
    getDashboardStats,
    getAnalytics,
    getFunnelData,
    getSourceAnalytics,
    getTimelineData,
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAnalytics);
router.get('/dashboard', getDashboardStats);
router.get('/funnel', getFunnelData);
router.get('/sources', getSourceAnalytics);
router.get('/timeline', getTimelineData);

export default router;
