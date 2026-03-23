import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
    getApplications,
    getApplicationById,
    createApplication,
    updateApplication,
    updateApplicationStatus,
    deleteApplication,
    getPipelineData,
    uploadJdFile,
} from '../controllers/applicationController';
import { getNotes, createNote, updateNote, deleteNote } from '../controllers/noteController';
import { getInterviews, createInterview, updateInterview, deleteInterview } from '../controllers/interviewController';
import { 
    getFollowUpsByApplication, 
    createFollowUp, 
    updateFollowUp, 
    deleteFollowUp,
    markComplete,
    markCompleteWithNote,
    addUpdateWithNote,
    snoozeFollowUp,
    getAllFollowUps 
} from '../controllers/followupController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure multer for JD file uploads
const jdStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'jd');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const jdUpload = multer({
    storage: jdStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for JD
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.'));
        }
    },
});

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

// JD File upload
router.post('/:id/jd-upload', jdUpload.single('jdFile'), uploadJdFile);

// Notes for application
router.get('/:applicationId/notes', getNotes);
router.post('/:applicationId/notes', createNote);

// Interviews for application
router.get('/:applicationId/interviews', getInterviews);
router.post('/:applicationId/interviews', createInterview);

// Follow-ups for application
router.get('/:applicationId/followups', getFollowUpsByApplication);
router.post('/:applicationId/followups', createFollowUp);

// Individual routes for notes
router.put('/notes/:id', updateNote);
router.delete('/notes/:id', deleteNote);

// Individual routes for interviews
router.put('/interviews/:id', updateInterview);
router.delete('/interviews/:id', deleteInterview);

// Individual routes for followups
router.put('/followups/:id', updateFollowUp);
router.delete('/followups/:id', deleteFollowUp);
router.patch('/followups/:id/complete', markComplete);
router.patch('/followups/:id/complete-with-note', markCompleteWithNote);
router.patch('/followups/:id/add-update', addUpdateWithNote);
router.patch('/followups/:id/snooze', snoozeFollowUp);

// Get all followups for dashboard
router.get('/followups/all', getAllFollowUps);

export default router;
