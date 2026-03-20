import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// Schema for creating interview process
const createInterviewProcessSchema = z.object({
    applicationId: z.string().uuid(),
    totalRounds: z.number().int().positive().optional(),
});

// Schema for adding a round
const addRoundSchema = z.object({
    interviewProcessId: z.string().uuid(),
    roundName: z.string().optional(),
    scheduledDate: z.string().optional(),
});

// Schema for updating round status
const updateRoundSchema = z.object({
    status: z.enum(['NOT_SCHEDULED', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
    scheduledDate: z.string().optional(),
    completedDate: z.string().optional(),
    feedback: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    notes: z.string().optional(),
});

// Schema for updating waiting state
const updateWaitingStateSchema = z.object({
    waitingState: z.enum(['NONE', 'AWAITING_INTERVIEW', 'AWAITING_NEXT_ROUND', 'AWAITING_FEEDBACK', 'NO_RESPONSE']),
    nextAction: z.string().optional(),
});

// Start interview process
export const startInterviewProcess = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = createInterviewProcessSchema.parse(req.body);

    // Verify application exists and belongs to user
    const application = await prisma.application.findFirst({
        where: {
            id: data.applicationId,
            userId: req.user!.id,
        },
    });

    if (!application) {
        throw new AppError('Application not found', 404);
    }

    // Check if process already exists
    const existingProcess = await prisma.interviewProcess.findFirst({
        where: {
            applicationId: data.applicationId,
        },
    });

    if (existingProcess) {
        throw new AppError('Interview process already exists for this application', 400);
    }

    const interviewProcess = await prisma.interviewProcess.create({
        data: {
            applicationId: data.applicationId,
            userId: req.user!.id,
            status: 'IN_PROGRESS',
            waitingState: 'AWAITING_INTERVIEW',
            totalRounds: data.totalRounds,
            lastActivityDate: new Date(),
            nextAction: 'Waiting for recruiter to schedule first round',
        },
    });

    // Update application status to INTERVIEW_IN_PROGRESS
    await prisma.application.update({
        where: { id: data.applicationId },
        data: { currentStatus: 'INTERVIEW_IN_PROGRESS' },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Interview process started',
        data: interviewProcess,
    };

    res.status(201).json(response);
};

// Get interview process by application ID
export const getInterviewProcessByApplication = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { applicationId } = req.params;

    // Verify application belongs to user
    const application = await prisma.application.findFirst({
        where: {
            id: applicationId,
            userId: req.user!.id,
        },
    });

    if (!application) {
        throw new AppError('Application not found', 404);
    }

    const interviewProcess = await prisma.interviewProcess.findFirst({
        where: {
            applicationId,
        },
        include: {
            rounds: {
                orderBy: { roundNumber: 'asc' },
            },
        },
    });

    // Return empty structure if no process exists
    if (!interviewProcess) {
        const response: ApiResponse = {
            success: true,
            message: 'No interview process found',
            data: null,
        };
        return res.json(response);
    }

    const response: ApiResponse = {
        success: true,
        message: 'Interview process retrieved',
        data: interviewProcess,
    };

    res.json(response);
};

// Add a new round to the interview process
export const addRound = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const data = addRoundSchema.parse(req.body);

    // Verify process exists and belongs to user
    const process = await prisma.interviewProcess.findFirst({
        where: {
            id: data.interviewProcessId,
            userId: req.user!.id,
        },
        include: {
            rounds: true,
        },
    });

    if (!process) {
        throw new AppError('Interview process not found', 404);
    }

    // Calculate next round number
    const nextRoundNumber = process.rounds.length + 1;

    const round = await prisma.interviewRound.create({
        data: {
            interviewProcessId: data.interviewProcessId,
            roundNumber: nextRoundNumber,
            roundName: data.roundName || `Round ${nextRoundNumber}`,
            status: data.scheduledDate ? 'SCHEDULED' : 'NOT_SCHEDULED',
            scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        },
    });

    // Update process waiting state
    await prisma.interviewProcess.update({
        where: { id: data.interviewProcessId },
        data: {
            waitingState: data.scheduledDate ? 'AWAITING_INTERVIEW' : 'AWAITING_NEXT_ROUND',
            lastActivityDate: new Date(),
            nextAction: data.scheduledDate 
                ? `Interview scheduled for ${new Date(data.scheduledDate).toLocaleDateString()}`
                : 'Waiting for next round to be scheduled',
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Round added successfully',
        data: round,
    };

    res.status(201).json(response);
};

// Update round status
export const updateRound = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { roundId } = req.params;
    const data = updateRoundSchema.parse(req.body);

    // Verify round exists and belongs to user's process
    const existingRound = await prisma.interviewRound.findFirst({
        where: {
            id: roundId,
            interviewProcess: {
                userId: req.user!.id,
            },
        },
        include: {
            interviewProcess: {
                include: {
                    rounds: true,
                },
            },
        },
    });

    if (!existingRound) {
        throw new AppError('Round not found', 404);
    }

    // Build update data
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
    if (data.completedDate) updateData.completedDate = new Date(data.completedDate);
    if (data.feedback !== undefined) updateData.feedback = data.feedback;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const round = await prisma.interviewRound.update({
        where: { id: roundId },
        data: updateData,
    });

    // Update process based on round status
    const process = existingRound.interviewProcess;
    const completedRounds = process.rounds.filter(r => r.status === 'COMPLETED' || (r.id === roundId && data.status === 'COMPLETED')).length;
    
    let waitingState = process.waitingState;
    let nextAction = process.nextAction || '';
    let status = process.status;

    if (data.status === 'COMPLETED') {
        // Check if all rounds are done
        const totalRounds = process.totalRounds || process.rounds.length;
        
        if (completedRounds >= totalRounds) {
            // All rounds completed
            status = 'COMPLETED';
            waitingState = 'AWAITING_FEEDBACK';
            nextAction = 'Waiting for final feedback from recruiter';
        } else {
            // More rounds to go
            waitingState = 'AWAITING_NEXT_ROUND';
            nextAction = `Round ${completedRounds}/${totalRounds} completed. Waiting for next round.`;
        }
    } else if (data.status === 'SCHEDULED') {
        waitingState = 'AWAITING_INTERVIEW';
        nextAction = data.scheduledDate 
            ? `Interview scheduled for ${new Date(data.scheduledDate).toLocaleDateString()}`
            : 'Interview scheduled';
    }

    await prisma.interviewProcess.update({
        where: { id: process.id },
        data: {
            roundsCompleted: completedRounds,
            waitingState,
            nextAction,
            status,
            lastActivityDate: new Date(),
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Round updated successfully',
        data: round,
    };

    res.json(response);
};

// Update waiting state manually
export const updateWaitingState = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { processId } = req.params;
    const data = updateWaitingStateSchema.parse(req.body);

    // Verify process exists and belongs to user
    const process = await prisma.interviewProcess.findFirst({
        where: {
            id: processId,
            userId: req.user!.id,
        },
    });

    if (!process) {
        throw new AppError('Interview process not found', 404);
    }

    const updatedProcess = await prisma.interviewProcess.update({
        where: { id: processId },
        data: {
            waitingState: data.waitingState,
            nextAction: data.nextAction,
            lastActivityDate: new Date(),
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Waiting state updated',
        data: updatedProcess,
    };

    res.json(response);
};

// Delete interview process
export const deleteInterviewProcess = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { processId } = req.params;

    // Verify process exists and belongs to user
    const process = await prisma.interviewProcess.findFirst({
        where: {
            id: processId,
            userId: req.user!.id,
        },
    });

    if (!process) {
        throw new AppError('Interview process not found', 404);
    }

    await prisma.interviewProcess.delete({
        where: { id: processId },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Interview process deleted',
    };

    res.json(response);
};

// Check for no response (ghosting) - can be called by a cron job
export const checkNoResponse = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const daysThreshold = parseInt(req.query.days as string) || 7;

    const processes = await prisma.interviewProcess.findMany({
        where: {
            userId: req.user!.id,
            status: 'IN_PROGRESS',
            waitingState: {
                in: ['AWAITING_INTERVIEW', 'AWAITING_NEXT_ROUND'],
            },
        },
    });

    const now = new Date();
    const threshold = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

    let updatedCount = 0;

    for (const process of processes) {
        if (process.lastActivityDate && process.lastActivityDate < threshold) {
            await prisma.interviewProcess.update({
                where: { id: process.id },
                data: {
                    waitingState: 'NO_RESPONSE',
                    nextAction: `No response from recruiter for ${daysThreshold} days`,
                },
            });
            updatedCount++;
        }
    }

    const response: ApiResponse = {
        success: true,
        message: `Updated ${updatedCount} processes to no response state`,
        data: { updatedCount },
    };

    res.json(response);
};
