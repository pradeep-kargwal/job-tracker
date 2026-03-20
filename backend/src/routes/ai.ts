import { Router } from 'express';
import {
    extractSkills,
    generateEmail,
    summarizeNotes,
} from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/extract-skills', extractSkills);
router.post('/generate-email', generateEmail);
router.post('/summarize-notes', summarizeNotes);

export default router;
