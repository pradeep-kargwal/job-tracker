import { Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import prisma from '../config/database';
import { AuthRequest, ApiResponse, PaginatedResponse, ApplicationStatus } from '../types';
import { AppError } from '../middleware/errorHandler';

const JD_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'jd');

// Ensure JD upload directory exists
if (!fs.existsSync(JD_UPLOAD_DIR)) {
    fs.mkdirSync(JD_UPLOAD_DIR, { recursive: true });
}

const applicationSchema = z.object({
    recruiterName: z.string().optional(),
    recruiterCompany: z.string().optional(),
    hiringCompany: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    source: z.enum(['NAUKRI', 'LINKEDIN', 'INDEED', 'INSTAHYRE', 'REFERRAL', 'COMPANY_WEBSITE', 'OTHER']).optional(),
    jobRole: z.string().optional(),
    techStack: z.array(z.string()).optional(),
    jdReceived: z.boolean().optional(),
    jdLink: z.string().optional(),
    jdText: z.string().optional(),
    applied: z.boolean().optional(),
    appliedDate: z.string().optional(),
    resumeVersion: z.string().optional(),
    currentStatus: z.enum(['NEW_CALL', 'JD_RECEIVED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER', 'REJECTED', 'ON_HOLD']).optional(),
});

const updateStatusSchema = z.object({
    currentStatus: z.enum(['NEW_CALL', 'JD_RECEIVED', 'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER', 'REJECTED', 'ON_HOLD']),
});

export const getApplications = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as ApplicationStatus | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {
        userId: req.user!.id,
    };

    if (status) {
        where.currentStatus = status;
    }

    if (search) {
        where.OR = [
            { jobRole: { contains: search, mode: 'insensitive' } },
            { hiringCompany: { contains: search, mode: 'insensitive' } },
            { recruiterName: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [applications, total] = await Promise.all([
        prisma.application.findMany({
            where,
            include: {
                notes: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                _count: {
                    select: {
                        notes: true,
                        interviews: true,
                        followups: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.application.count({ where }),
    ]);

    const response: PaginatedResponse = {
        success: true,
        message: 'Applications retrieved successfully',
        data: applications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };

    res.json(response);
};

export const getApplicationById = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const application = await prisma.application.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
        include: {
            notes: {
                orderBy: { createdAt: 'desc' },
            },
            interviews: {
                orderBy: { scheduledDate: 'asc' },
            },
            followups: {
                orderBy: { followUpDate: 'asc' },
                include: {
                    history: {
                        orderBy: { actionDate: 'desc' },
                    },
                },
            },
        },
    });

    if (!application) {
        throw new AppError('Application not found', 404);
    }

    const response: ApiResponse = {
        success: true,
        message: 'Application retrieved successfully',
        data: application,
    };

    res.json(response);
};

export const createApplication = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = applicationSchema.parse(req.body);

    // Convert techStack array to string for SQLite
    const techStackValue = Array.isArray(data.techStack) 
        ? data.techStack.join(',') 
        : data.techStack;

    const application = await prisma.application.create({
        data: {
            ...data,
            techStack: techStackValue,
            userId: req.user!.id,
            appliedDate: data.appliedDate ? new Date(data.appliedDate) : undefined,
        },
        include: {
            notes: true,
            interviews: true,
            followups: true,
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Application created successfully',
        data: application,
    };

    res.status(201).json(response);
};

export const updateApplication = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const data = applicationSchema.parse(req.body);

    const existing = await prisma.application.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!existing) {
        throw new AppError('Application not found', 404);
    }

    // Convert techStack array to string for SQLite
    const techStackValue = Array.isArray(data.techStack) 
        ? data.techStack.join(',') 
        : data.techStack;

    const application = await prisma.application.update({
        where: { id },
        data: {
            ...data,
            techStack: techStackValue,
            appliedDate: data.appliedDate ? new Date(data.appliedDate) : undefined,
        },
        include: {
            notes: {
                orderBy: { createdAt: 'desc' },
            },
            interviews: {
                orderBy: { scheduledDate: 'asc' },
            },
            followups: {
                orderBy: { followUpDate: 'asc' },
            },
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Application updated successfully',
        data: application,
    };

    res.json(response);
};

export const updateApplicationStatus = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const data = updateStatusSchema.parse(req.body);

    const existing = await prisma.application.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!existing) {
        throw new AppError('Application not found', 404);
    }

    const application = await prisma.application.update({
        where: { id },
        data: {
            currentStatus: data.currentStatus,
            applied: data.currentStatus === 'APPLIED' ? true : existing.applied,
            appliedDate: data.currentStatus === 'APPLIED' && !existing.appliedDate
                ? new Date()
                : existing.appliedDate,
        },
        include: {
            notes: true,
            interviews: true,
            followups: true,
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Application status updated successfully',
        data: application,
    };

    res.json(response);
};

export const deleteApplication = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const existing = await prisma.application.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!existing) {
        throw new AppError('Application not found', 404);
    }

    await prisma.application.delete({
        where: { id },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Application deleted successfully',
    };

    res.json(response);
};

export const getPipelineData = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const applications = await prisma.application.findMany({
        where: {
            userId: req.user!.id,
        },
        select: {
            id: true,
            hiringCompany: true,
            jobRole: true,
            currentStatus: true,
            updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
    });

    // Group by status
    const pipeline: Record<string, typeof applications> = {
        NEW_CALL: [],
        JD_RECEIVED: [],
        APPLIED: [],
        SHORTLISTED: [],
        INTERVIEW_SCHEDULED: [],
        INTERVIEW_COMPLETED: [],
        OFFER: [],
        REJECTED: [],
        ON_HOLD: [],
    };

    applications.forEach((app) => {
        pipeline[app.currentStatus].push(app);
    });

    const response: ApiResponse = {
        success: true,
        message: 'Pipeline data retrieved successfully',
        data: pipeline,
    };

    res.json(response);
};

export const uploadJdFile = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    if (!req.file) {
        throw new AppError('No file uploaded', 400);
    }

    const existing = await prisma.application.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!existing) {
        throw new AppError('Application not found', 404);
    }

    // Delete old JD file if exists
    if (existing.jdFilePath && fs.existsSync(existing.jdFilePath)) {
        fs.unlinkSync(existing.jdFilePath);
    }

    const application = await prisma.application.update({
        where: { id },
        data: {
            jdFilePath: req.file.path,
            jdFileName: req.file.originalname,
            jdReceived: true,
        },
        include: {
            notes: {
                orderBy: { createdAt: 'desc' },
            },
            interviews: {
                orderBy: { scheduledDate: 'asc' },
            },
            followups: {
                orderBy: { followUpDate: 'asc' },
            },
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'JD file uploaded successfully',
        data: application,
    };

    res.json(response);
};
