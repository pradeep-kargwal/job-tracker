import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

const interviewSchema = z.object({
    roundName: z.string().min(1, 'Round name is required'),
    scheduledDate: z.string().optional(),
    status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
    notes: z.string().optional(),
    feedback: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),
});

export const getInterviews = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { applicationId } = req.params;

    const application = await prisma.application.findFirst({
        where: {
            id: applicationId,
            userId: req.user!.id,
        },
    });

    if (!application) {
        throw new AppError('Application not found', 404);
    }

    const interviews = await prisma.interview.findMany({
        where: { applicationId },
        orderBy: { scheduledDate: 'asc' },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Interviews retrieved successfully',
        data: interviews,
    };

    res.json(response);
};

export const createInterview = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { applicationId } = req.params;
    const rawData = req.body;

    // Map frontend field names to backend field names
    const data = {
        roundName: rawData.round_name ?? rawData.roundName,
        scheduledDate: rawData.scheduled_date ?? rawData.scheduledDate,
        status: rawData.status ?? 'SCHEDULED',
        notes: rawData.notes ?? '',
        feedback: rawData.feedback ?? '',
        rating: rawData.rating,
    };

    const parsedData = interviewSchema.parse(data);

    const application = await prisma.application.findFirst({
        where: {
            id: applicationId,
            userId: req.user!.id,
        },
    });

    if (!application) {
        throw new AppError('Application not found', 404);
    }

    const interview = await prisma.interview.create({
        data: {
            ...parsedData,
            applicationId,
            userId: req.user!.id,
            scheduledDate: parsedData.scheduledDate ? new Date(parsedData.scheduledDate) : undefined,
        },
    });

    // Create notification for scheduled interview
    if (parsedData.scheduledDate && parsedData.status === 'SCHEDULED') {
        await prisma.notification.create({
            data: {
                userId: req.user!.id,
                type: 'INTERVIEW',
                title: 'Interview Scheduled',
                message: `Interview scheduled for ${application.hiringCompany || application.jobRole} on ${new Date(data.scheduledDate).toLocaleDateString()}`,
                referenceId: interview.id,
            },
        });
    }

    // Update application status to interview_scheduled if not already
    if (application.currentStatus === 'SHORTLISTED' || application.currentStatus === 'APPLIED') {
        await prisma.application.update({
            where: { id: applicationId },
            data: { currentStatus: 'INTERVIEW_SCHEDULED' },
        });
    }

    const response: ApiResponse = {
        success: true,
        message: 'Interview created successfully',
        data: interview,
    };

    res.status(201).json(response);
};

export const updateInterview = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const rawData = req.body;

    // Map frontend field names to backend field names
    const data = {
        roundName: rawData.round_name ?? rawData.roundName,
        scheduledDate: rawData.scheduled_date ?? rawData.scheduledDate,
        status: rawData.status,
        notes: rawData.notes ?? '',
        feedback: rawData.feedback ?? '',
        rating: rawData.rating,
    };

    const parsedData = interviewSchema.parse(data);

    const interview = await prisma.interview.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
        include: { application: true },
    });

    if (!interview) {
        throw new AppError('Interview not found', 404);
    }

    const updatedInterview = await prisma.interview.update({
        where: { id },
        data: {
            ...parsedData,
            scheduledDate: parsedData.scheduledDate ? new Date(parsedData.scheduledDate) : undefined,
        },
    });

    // Update application status based on interview status
    if (parsedData.status === 'COMPLETED') {
        const hasMoreInterviews = await prisma.interview.count({
            where: {
                applicationId: interview.applicationId,
                status: 'SCHEDULED',
                id: { not: id },
            },
        });

        if (hasMoreInterviews === 0) {
            await prisma.application.update({
                where: { id: interview.applicationId },
                data: { currentStatus: 'INTERVIEW_COMPLETED' },
            });
        }
    }

    const response: ApiResponse = {
        success: true,
        message: 'Interview updated successfully',
        data: updatedInterview,
    };

    res.json(response);
};

export const deleteInterview = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const interview = await prisma.interview.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!interview) {
        throw new AppError('Interview not found', 404);
    }

    await prisma.interview.delete({
        where: { id },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Interview deleted successfully',
    };

    res.json(response);
};

export const getUpcomingInterviews = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const interviews = await prisma.interview.findMany({
        where: {
            userId: req.user!.id,
            status: 'SCHEDULED',
            scheduledDate: {
                gte: new Date(),
            },
        },
        include: {
            application: {
                select: {
                    id: true,
                    hiringCompany: true,
                    jobRole: true,
                },
            },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 10,
    });

    const response: ApiResponse = {
        success: true,
        message: 'Upcoming interviews retrieved successfully',
        data: interviews,
    };

    res.json(response);
};
