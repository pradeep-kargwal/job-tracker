import { Router } from 'express';
import { 
    createInterviewEvent,
    getInterviewEventsByApplication,
    getAllInterviewEvents,
    getInterviewEventsByDate,
    updateInterviewEvent,
    markInterviewComplete,
    deleteInterviewEvent,
    getNextRoundNumber
} from '../controllers/interviewEventController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create new interview event
router.post('/', createInterviewEvent);

// Get events by application
router.get('/application/:applicationId', getInterviewEventsByApplication);

// Get next round number for application
router.get('/next-round/:applicationId', getNextRoundNumber);

// Get events by date
router.get('/date/:date', getInterviewEventsByDate);

// Get all events (for calendar)
router.get('/all', getAllInterviewEvents);

// Update event
router.put('/:id', updateInterviewEvent);

// Mark complete
router.patch('/:id/complete', markInterviewComplete);

// Delete event
router.delete('/:id', deleteInterviewEvent);

export default router;
