import { Router } from 'express';
import {
    startInterviewProcess,
    getInterviewProcessByApplication,
    addRound,
    updateRound,
    updateWaitingState,
    deleteInterviewProcess,
    checkNoResponse,
} from '../controllers/interviewProcessController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Start interview process for an application
router.post('/start', startInterviewProcess);

// Get interview process by application ID
router.get('/application/:applicationId', getInterviewProcessByApplication);

// Add a new round
router.post('/rounds', addRound);

// Update round status
router.patch('/rounds/:roundId', updateRound);

// Update waiting state
router.patch('/:processId/waiting-state', updateWaitingState);

// Delete interview process
router.delete('/:processId', deleteInterviewProcess);

// Check for no response (ghosting)
router.post('/check-no-response', checkNoResponse);

export default router;
