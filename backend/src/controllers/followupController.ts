import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

const followupSchema = z.object({
    followUpRequired: z.boolean().optional(),
    followUpDate: z.string().optional(),
    followUpType: z.enum(['EMAIL', 'CALL', 'LINKEDIN']).optional(),
    responseStatus: z.enum(['PENDING', 'RESPONDED', 'NO_RESPONSE']).optional(),
    responseNotes: z.string().optional(),
});

const followupHistorySchema = z.object({
    actionType: z.string().min(1, 'Action type is required'),
    responseReceived: z.string().optional(),
    notes: z.string().optional(),
});

export const getFollowups = async (
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

    const followups = await prisma.followUp.findMany({
        where: { applicationId },
        include: {
            history: {
                orderBy: { actionDate: 'desc' },
            },
        },
        orderBy: { followUpDate: 'asc' },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Follow-ups retrieved successfully',
        data: followups,
    };

    res.json(response);
};

export const createFollowup = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { applicationId } = req.params;
    const rawData = req.body;

    // Map frontend field names to backend field names
    const data = {
        followUpRequired: rawData.follow_up_required ?? rawData.followUpRequired ?? true,
        followUpDate: rawData.follow_up_date ?? rawData.followUpDate,
        followUpType: rawData.follow_up_type ?? rawData.followUpType ?? 'EMAIL',
        responseStatus: rawData.response_status ?? rawData.responseStatus ?? 'PENDING',
        responseNotes: rawData.description ?? rawData.responseNotes ?? rawData.notes,
    };

    const parsedData = followupSchema.parse(data);

    const application = await prisma.application.findFirst({
        where: {
            id: applicationId,
            userId: req.user!.id,
        },
    });

    if (!application) {
        throw new AppError('Application not found', 404);
    }

    const followup = await prisma.followUp.create({
        data: {
            ...parsedData,
            applicationId,
            userId: req.user!.id,
            followUpDate: parsedData.followUpDate ? new Date(parsedData.followUpDate) : undefined,
        },
        include: {
            history: true,
        },
    });

    // Create notification for follow-up
    if (data.followUpDate) {
        await prisma.notification.create({
            data: {
                userId: req.user!.id,
                type: 'FOLLOWUP',
                title: 'Follow-up Due',
                message: `Follow-up due for ${application.hiringCompany || application.jobRole} on ${new Date(data.followUpDate).toLocaleDateString()}`,
                referenceId: followup.id,
            },
        });
    }

    const response: ApiResponse = {
        success: true,
        message: 'Follow-up created successfully',
        data: followup,
    };

    res.status(201).json(response);
};

export const updateFollowup = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const data = followupSchema.parse(req.body);

    const followup = await prisma.followUp.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!followup) {
        throw new AppError('Follow-up not found', 404);
    }

    const updatedFollowup = await prisma.followUp.update({
        where: { id },
        data: {
            ...data,
            followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        },
        include: {
            history: {
                orderBy: { actionDate: 'desc' },
            },
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Follow-up updated successfully',
        data: updatedFollowup,
    };

    res.json(response);
};

export const addFollowupHistory = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const data = followupHistorySchema.parse(req.body);

    const followup = await prisma.followUp.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!followup) {
        throw new AppError('Follow-up not found', 404);
    }

    const history = await prisma.followupHistory.create({
        data: {
            followupId: id,
            userId: req.user!.id,
            actionType: data.actionType,
            responseReceived: data.responseReceived,
            notes: data.notes,
        },
    });

    // Update follow-up response status if responded
    if (data.responseReceived) {
        await prisma.followUp.update({
            where: { id },
            data: {
                responseStatus: 'RESPONDED',
                responseNotes: data.responseReceived,
            },
        });
    }

    const response: ApiResponse = {
        success: true,
        message: 'Follow-up history added successfully',
        data: history,
    };

    res.status(201).json(response);
};

export const deleteFollowup = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const followup = await prisma.followUp.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!followup) {
        throw new AppError('Follow-up not found', 404);
    }

    await prisma.followUp.delete({
        where: { id },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Follow-up deleted successfully',
    };

    res.json(response);
};

export const getDueFollowups = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followups = await prisma.followUp.findMany({
        where: {
            userId: req.user!.id,
            followUpRequired: true,
            followUpDate: {
                lte: today,
            },
            responseStatus: 'PENDING',
        },
        include: {
            application: {
                select: {
                    id: true,
                    hiringCompany: true,
                    jobRole: true,
                    recruiterName: true,
                },
            },
        },
        orderBy: { followUpDate: 'asc' },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Due follow-ups retrieved successfully',
        data: followups,
    };

    res.json(response);
};
