import { Router } from 'express';
import {
    getApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    updateApplicationStatus,
    deleteApplication,
    getPipelineData,
} from '../controllers/applicationController';
import { getNotes, createNote, updateNote, deleteNote } from '../controllers/noteController';
import { getInterviews, createInterview, updateInterview, deleteInterview } from '../controllers/interviewController';
import { getFollowups, createFollowup, updateFollowup, deleteFollowup, addFollowupHistory } from '../controllers/followupController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Applications CRUD
router.get('/', getApplications);
router.get('/pipeline', getPipelineData);
router.get('/:id', getApplicationById);
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.patch('/:id/status', updateApplicationStatus);
router.delete('/:id', deleteApplication);

// Notes for application
router.get('/:applicationId/notes', getNotes);
router.post('/:applicationId/notes', createNote);

// Interviews for application
router.get('/:applicationId/interviews', getInterviews);
router.post('/:applicationId/interviews', createInterview);

// Follow-ups for application
router.get('/:applicationId/followups', getFollowups);
router.post('/:applicationId/followups', createFollowup);

// Individual routes for notes
router.put('/notes/:id', updateNote);
router.delete('/notes/:id', deleteNote);

// Individual routes for interviews
router.put('/interviews/:id', updateInterview);
router.delete('/interviews/:id', deleteInterview);

// Individual routes for followups
router.put('/followups/:id', updateFollowup);
router.delete('/followups/:id', deleteFollowup);
router.post('/followups/:id/history', addFollowupHistory);

export default router;
