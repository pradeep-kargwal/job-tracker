import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

const resumeSchema = z.object({
    fileName: z.string().min(1, 'File name is required'),
    tags: z.array(z.string()).optional(),
    isDefault: z.boolean().optional(),
});

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'resumes');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const getResumes = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const resumes = await prisma.resume.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Resumes retrieved successfully',
        data: resumes,
    };

    res.json(response);
};

export const getResumeById = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const resume = await prisma.resume.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!resume) {
        throw new AppError('Resume not found', 404);
    }

    const response: ApiResponse = {
        success: true,
        message: 'Resume retrieved successfully',
        data: resume,
    };

    res.json(response);
};

export const createResume = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = resumeSchema.parse(req.body);

    // If this is set as default, unset other defaults
    if (data.isDefault) {
        await prisma.resume.updateMany({
            where: {
                userId: req.user!.id,
                isDefault: true,
            },
            data: { isDefault: false },
        });
    }

    const resume = await prisma.resume.create({
        data: {
            ...data,
            userId: req.user!.id,
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Resume created successfully',
        data: resume,
    };

    res.status(201).json(response);
};

export const updateResume = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const data = resumeSchema.parse(req.body);

    const existing = await prisma.resume.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!existing) {
        throw new AppError('Resume not found', 404);
    }

    // If this is set as default, unset other defaults
    if (data.isDefault && !existing.isDefault) {
        await prisma.resume.updateMany({
            where: {
                userId: req.user!.id,
                isDefault: true,
            },
            data: { isDefault: false },
        });
    }

    const resume = await prisma.resume.update({
        where: { id },
        data,
    });

    const response: ApiResponse = {
        success: true,
        message: 'Resume updated successfully',
        data: resume,
    };

    res.json(response);
};

export const deleteResume = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const resume = await prisma.resume.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!resume) {
        throw new AppError('Resume not found', 404);
    }

    // Delete file if exists - convert relative path to absolute
    if (resume.filePath) {
        const absolutePath = path.isAbsolute(resume.filePath) 
            ? resume.filePath 
            : path.join(process.cwd(), resume.filePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
    }

    await prisma.resume.delete({
        where: { id },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Resume deleted successfully',
    };

    res.json(response);
};

export const uploadResume = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    const { tags, isDefault } = req.body;
    const parsedTags = tags ? JSON.parse(tags) : [];
    // Convert tags array to string for SQLite
    const tagsValue = Array.isArray(parsedTags) ? parsedTags.join(',') : parsedTags;

    // If this is set as default, unset other defaults
    if (isDefault === 'true') {
        await prisma.resume.updateMany({
            where: {
                userId: req.user!.id,
                isDefault: true,
            },
            data: { isDefault: false },
        });
    }

    // Store relative path instead of absolute path
    const relativePath = path.relative(process.cwd(), req.file.path);

    const resume = await prisma.resume.create({
        data: {
            userId: req.user!.id,
            fileName: req.file.originalname,
            filePath: relativePath,
            fileSize: req.file.size,
            tags: tagsValue,
            isDefault: isDefault === 'true',
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Resume uploaded successfully',
        data: resume,
    };

    res.status(201).json(response);
};
