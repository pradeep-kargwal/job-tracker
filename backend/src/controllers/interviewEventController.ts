import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

// Create a new interview event
export const createInterviewEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { 
            applicationId,
            roundNumber,
            date,
            startTime,
            endTime,
            notes,
            createdFrom
        } = req.body;

        if (!applicationId || !date) {
            return res.status(400).json({ 
                success: false, 
                message: 'Application ID and date are required' 
            });
        }

        // Get application details
        const application = await prisma.application.findUnique({
            where: { id: applicationId }
        });

        if (!application) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found' 
            });
        }

        // Auto-generate title
        const title = `${application.hiringCompany || 'Company'} - Round ${roundNumber || 1}`;

        // Check for conflicts
        const conflict = await checkTimeConflict(userId, date, startTime, endTime);
        if (conflict) {
            return res.status(409).json({
                success: false,
                message: 'You already have an interview at this time',
                conflict
            });
        }

        const interviewEvent = await prisma.interviewEvent.create({
            data: {
                applicationId,
                userId,
                roundNumber: roundNumber || 1,
                title,
                date: new Date(date),
                startTime: startTime || null,
                endTime: endTime || null,
                status: 'SCHEDULED',
                notes: notes || null,
                createdFrom: createdFrom || 'APPLICATION_PAGE',
            },
            include: {
                application: {
                    select: {
                        id: true,
                        hiringCompany: true,
                        jobRole: true,
                    }
                }
            }
        });

        // Update InterviewProcess status if exists
        await updateInterviewProcessOnEvent(applicationId, userId);

        res.status(201).json({
            success: true,
            message: 'Interview event created successfully',
            data: interviewEvent
        });
    } catch (error: any) {
        console.error('Error creating interview event:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create interview event' });
    }
};

// Get interview events for an application
export const getInterviewEventsByApplication = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { applicationId } = req.params;

        const events = await prisma.interviewEvent.findMany({
            where: {
                userId,
                applicationId,
            },
            orderBy: { date: 'asc' },
        });

        res.json({
            success: true,
            data: events,
        });
    } catch (error: any) {
        console.error('Error fetching interview events:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch interview events' });
    }
};

// Get all interview events for calendar view
export const getAllInterviewEvents = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { startDate, endDate } = req.query;

        const where: any = { userId };

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string),
            };
        }

        const events = await prisma.interviewEvent.findMany({
            where,
            include: {
                application: {
                    select: {
                        id: true,
                        hiringCompany: true,
                        jobRole: true,
                    }
                }
            },
            orderBy: { date: 'asc' },
        });

        res.json({
            success: true,
            data: events,
        });
    } catch (error: any) {
        console.error('Error fetching all interview events:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch interview events' });
    }
};

// Get interview events for a specific date
export const getInterviewEventsByDate = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { date } = req.params;

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const events = await prisma.interviewEvent.findMany({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                application: {
                    select: {
                        id: true,
                        hiringCompany: true,
                        jobRole: true,
                    }
                }
            },
            orderBy: { startTime: 'asc' },
        });

        res.json({
            success: true,
            data: events,
        });
    } catch (error: any) {
        console.error('Error fetching interview events by date:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch interview events' });
    }
};

// Update an interview event
export const updateInterviewEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { 
            roundNumber,
            date,
            startTime,
            endTime,
            status,
            notes
        } = req.body;

        const existingEvent = await prisma.interviewEvent.findFirst({
            where: { id, userId }
        });

        if (!existingEvent) {
            return res.status(404).json({ success: false, message: 'Interview event not found' });
        }

        // Check for conflicts if time is being changed
        if (date || startTime || endTime) {
            const conflict = await checkTimeConflict(
                userId, 
                date || existingEvent.date, 
                startTime || existingEvent.startTime, 
                endTime || existingEvent.endTime,
                id
            );
            if (conflict) {
                return res.status(409).json({
                    success: false,
                    message: 'You already have an interview at this time',
                    conflict
                });
            }
        }

        // Auto-generate title if round number changes
        let title = undefined;
        if (roundNumber && roundNumber !== existingEvent.roundNumber) {
            const application = await prisma.application.findUnique({
                where: { id: existingEvent.applicationId }
            });
            title = `${application?.hiringCompany || 'Company'} - Round ${roundNumber}`;
        }

        const updatedData: any = {};
        if (roundNumber) updatedData.roundNumber = roundNumber;
        if (date) updatedData.date = new Date(date);
        if (startTime !== undefined) updatedData.startTime = startTime;
        if (endTime !== undefined) updatedData.endTime = endTime;
        if (status) updatedData.status = status;
        if (notes !== undefined) updatedData.notes = notes;
        if (title) updatedData.title = title;

        const event = await prisma.interviewEvent.update({
            where: { id },
            data: updatedData,
            include: {
                application: {
                    select: {
                        id: true,
                        hiringCompany: true,
                        jobRole: true,
                    }
                }
            }
        });

        // If completed, update interview process
        if (status === 'COMPLETED') {
            await updateInterviewProcessOnComplete(existingEvent.applicationId, userId);
        }

        res.json({
            success: true,
            message: 'Interview event updated successfully',
            data: event,
        });
    } catch (error: any) {
        console.error('Error updating interview event:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update interview event' });
    }
};

// Mark interview event as complete
export const markInterviewComplete = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const event = await prisma.interviewEvent.update({
            where: { id },
            data: { status: 'COMPLETED' },
            include: {
                application: {
                    select: {
                        id: true,
                        hiringCompany: true,
                        jobRole: true,
                    }
                }
            }
        });

        // Update interview process
        await updateInterviewProcessOnComplete(event.applicationId, userId);

        res.json({
            success: true,
            message: 'Interview marked as complete',
            data: event,
        });
    } catch (error: any) {
        console.error('Error marking interview as complete:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to mark interview as complete' });
    }
};

// Delete an interview event
export const deleteInterviewEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const event = await prisma.interviewEvent.findFirst({
            where: { id, userId }
        });

        if (!event) {
            return res.status(404).json({ success: false, message: 'Interview event not found' });
        }

        await prisma.interviewEvent.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Interview event deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting interview event:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete interview event' });
    }
};

// Get next round number for an application
export const getNextRoundNumber = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { applicationId } = req.params;

        const lastEvent = await prisma.interviewEvent.findFirst({
            where: { userId, applicationId },
            orderBy: { roundNumber: 'desc' }
        });

        const nextRound = lastEvent ? lastEvent.roundNumber + 1 : 1;

        res.json({
            success: true,
            data: { nextRound }
        });
    } catch (error: any) {
        console.error('Error getting next round number:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to get next round number' });
    }
};

// Helper function to check time conflicts
async function checkTimeConflict(userId: string, date: Date | string, startTime: string | null, endTime: string | null, excludeId?: string) {
    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(dateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
        userId,
        date: {
            gte: startOfDay,
            lte: endOfDay,
        },
        status: {
            not: 'CANCELLED',
        }
    };

    if (excludeId) {
        where.id = { not: excludeId };
    }

    const events = await prisma.interviewEvent.findMany({ where });

    if (!startTime || !endTime) {
        return null; // No time specified, no conflict
    }

    // Check for overlap
    for (const event of events) {
        if (event.startTime && event.endTime) {
            if (startTime < event.endTime && endTime > event.startTime) {
                return event;
            }
        }
    }

    return null;
}

// Helper to update InterviewProcess when event is created
async function updateInterviewProcessOnEvent(applicationId: string, userId: string) {
    try {
        const process = await prisma.interviewProcess.findFirst({
            where: { applicationId, userId }
        });

        if (process && process.status === 'NOT_STARTED') {
            await prisma.interviewProcess.update({
                where: { id: process.id },
                data: {
                    status: 'IN_PROGRESS',
                    lastActivityDate: new Date(),
                }
            });
        }
    } catch (error) {
        console.error('Error updating interview process:', error);
    }
}

// Helper to update InterviewProcess when event is completed
async function updateInterviewProcessOnComplete(applicationId: string, userId: string) {
    try {
        const process = await prisma.interviewProcess.findFirst({
            where: { applicationId, userId }
        });

        if (process) {
            await prisma.interviewProcess.update({
                where: { id: process.id },
                data: {
                    roundsCompleted: { increment: 1 },
                    waitingState: 'AWAITING_NEXT_ROUND',
                    lastActivityDate: new Date(),
                }
            });
        }
    } catch (error) {
        console.error('Error updating interview process on complete:', error);
    }
}
