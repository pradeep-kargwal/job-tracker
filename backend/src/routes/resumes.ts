import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
    getResumes,
    getResumeById,
    createResume,
    updateResume,
    deleteResume,
    uploadResume,
} from '../controllers/resumeController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'resumes');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'));
        }
    },
});

// All routes require authentication
router.use(authenticate);

router.get('/', getResumes);
router.get('/:id', getResumeById);
router.post('/', createResume);
router.post('/upload', upload.single('file'), uploadResume);
router.put('/:id', updateResume);
router.delete('/:id', deleteResume);

export default router;
