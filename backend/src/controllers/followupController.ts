import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { exportToDesktop } from './backupController';

const prisma = new PrismaClient() as any;

// Helper to compute status based on date
const computeStatus = (followUpDate: Date, isCompleted: boolean): string => {
    if (isCompleted) return 'COMPLETED';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const followUp = new Date(followUpDate);
    followUp.setHours(0, 0, 0, 0);
    
    if (followUp < today) return 'MISSED';
    if (followUp.getTime() === today.getTime()) return 'DUE';
    return 'UPCOMING';
};

// Create a new follow-up
export const createFollowUp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        // Get applicationId from URL params, not from body
        const { applicationId: appIdFromParams } = req.params;
        const { 
            interviewProcessId,
            contextType,
            title,
            description,
            followUpDate,
            priority,
            relatedRound
        } = req.body;

        // Use URL param as applicationId
        const applicationId = appIdFromParams;

        console.log('URL params:', req.params);
        console.log('Request body:', req.body);
        console.log('Creating follow-up:', { applicationId, title, followUpDate, userId });

        if (!applicationId || !title || !followUpDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'Application ID, title, and follow-up date are required' 
            });
        }

        const followUp = await prisma.followUp.create({
            data: {
                applicationId,
                userId,
                interviewProcessId: interviewProcessId || null,
                contextType: contextType || 'GENERAL',
                title,
                description: description || null,
                followUpDate: new Date(followUpDate),
                priority: priority || 'MEDIUM',
                relatedRound: relatedRound || null,
                status: computeStatus(new Date(followUpDate), false),
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

        // Auto-export to Desktop in background
        const userEmail = (req as any).user.email;
        exportToDesktop(userId, userEmail).catch(err => 
            console.error('[AutoBackup] Failed to export:', err)
        );

        res.status(201).json({
            success: true,
            message: 'Follow-up created successfully',
            data: followUp
        });
    } catch (error: any) {
        console.error('Error creating follow-up:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to create follow-up' });
    }
};

// Get follow-ups for an application
export const getFollowUpsByApplication = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { applicationId } = req.params;

        const followUps = await prisma.followUp.findMany({
            where: {
                userId,
                applicationId,
            },
            include: {
                history: {
                    orderBy: {
                        actionDate: 'desc',
                    },
                },
            },
            orderBy: {
                followUpDate: 'asc',
            },
        });

        // Compute statuses dynamically
        const followUpsWithStatus = followUps.map((fu: any) => ({
            ...fu,
            computedStatus: computeStatus(fu.followUpDate || new Date(), fu.status === 'COMPLETED'),
        }));

        res.json({
            success: true,
            data: followUpsWithStatus,
        });
    } catch (error: any) {
        console.error('Error fetching follow-ups:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch follow-ups' });
    }
};

// Get all follow-ups for dashboard (grouped by status)
export const getAllFollowUps = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { status, page = 1, limit = 15 } = req.query;

        const where: any = { userId };
        
        const followUps = await prisma.followUp.findMany({
            where,
            include: {
                application: {
                    select: {
                        id: true,
                        hiringCompany: true,
                        jobRole: true,
                    }
                },
                history: {
                    orderBy: { actionDate: 'desc' },
                },
            },
            orderBy: {
                followUpDate: 'asc',
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });

        const total = await prisma.followUp.count({ where });

        const followUpsWithStatus = followUps.map((fu: any) => ({
            ...fu,
            computedStatus: computeStatus(fu.followUpDate || new Date(), fu.status === 'COMPLETED'),
        }));

        res.json({
            success: true,
            data: {
                followUps: followUpsWithStatus,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit)),
                }
            }
        });
    } catch (error: any) {
        console.error('Error fetching all follow-ups:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch follow-ups' });
    }
};

// Update a follow-up
export const updateFollowUp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { 
            title,
            description,
            followUpDate,
            priority,
            contextType,
            relatedRound 
        } = req.body;

        const existingFollowUp = await prisma.followUp.findFirst({
            where: {
                id,
                userId,
            }
        });

        if (!existingFollowUp) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }

        const updatedData: any = {};
        if (title) updatedData.title = title;
        if (description !== undefined) updatedData.description = description;
        if (followUpDate) {
            updatedData.followUpDate = new Date(followUpDate);
            updatedData.status = computeStatus(new Date(followUpDate), existingFollowUp.status === 'COMPLETED');
        }
        if (priority) updatedData.priority = priority;
        if (contextType) updatedData.contextType = contextType;
        if (relatedRound !== undefined) updatedData.relatedRound = relatedRound;

        const followUp = await prisma.followUp.update({
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

        res.json({
            success: true,
            message: 'Follow-up updated successfully',
            data: followUp,
        });
    } catch (error: any) {
        console.error('Error updating follow-up:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update follow-up' });
    }
};

// Mark follow-up as complete
export const markComplete = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const followUp = await prisma.followUp.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
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

        res.json({
            success: true,
            message: 'Follow-up marked as complete',
            data: followUp,
        });
    } catch (error: any) {
        console.error('Error marking follow-up as complete:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to mark follow-up as complete' });
    }
};

// Mark follow-up as complete with a note
export const markCompleteWithNote = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { notes } = req.body;

        const followUp = await prisma.followUp.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
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

        // Create history entry for the completion
        if (notes) {
            await prisma.followupHistory.create({
                data: {
                    followupId: id,
                    userId,
                    actionType: 'COMPLETED',
                    notes: notes,
                    actionDate: new Date(),
                }
            });
        }

        res.json({
            success: true,
            message: 'Follow-up marked as complete',
            data: followUp,
        });
    } catch (error: any) {
        console.error('Error marking follow-up as complete:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to mark follow-up as complete' });
    }
};

// Add update with note (text update and optional new date)
export const addUpdateWithNote = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { notes, newFollowUpDate } = req.body;

        // Get existing follow-up
        const existingFollowUp = await prisma.followUp.findFirst({
            where: { id, userId }
        });

        if (!existingFollowUp) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }

        // Create history entry with the note
        await prisma.followupHistory.create({
            data: {
                followupId: id,
                userId,
                actionType: 'UPDATE',
                notes: notes,
                actionDate: new Date(),
            }
        });

        // Update follow-up with new date if provided
        let updatedFollowUp;
        if (newFollowUpDate) {
            updatedFollowUp = await prisma.followUp.update({
                where: { id },
                data: {
                    followUpDate: new Date(newFollowUpDate),
                    status: computeStatus(new Date(newFollowUpDate), false),
                },
                include: {
                    application: {
                        select: {
                            id: true,
                            hiringCompany: true,
                            jobRole: true,
                        }
                    },
                    history: {
                        orderBy: { actionDate: 'desc' }
                    }
                }
            });
        } else {
            updatedFollowUp = await prisma.followUp.findUnique({
                where: { id },
                include: {
                    application: {
                        select: {
                            id: true,
                            hiringCompany: true,
                            jobRole: true,
                        }
                    },
                    history: {
                        orderBy: { actionDate: 'desc' }
                    }
                }
            });
        }

        res.json({
            success: true,
            message: 'Update added successfully',
            data: updatedFollowUp,
        });
    } catch (error: any) {
        console.error('Error adding update:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to add update' });
    }
};

// Snooze follow-up (reschedule to later date)
export const snoozeFollowUp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { days } = req.body; // 1, 2, or 7

        const followUp = await prisma.followUp.findFirst({
            where: { id, userId }
        });

        if (!followUp) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }

        const followUpDate = followUp.followUpDate || new Date();
        const newDate = new Date(followUpDate);
        newDate.setDate(newDate.getDate() + (days || 1));

        const updatedFollowUp = await prisma.followUp.update({
            where: { id },
            data: {
                followUpDate: newDate,
                status: computeStatus(newDate, false),
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

        res.json({
            success: true,
            message: `Follow-up snoozed by ${days || 1} day(s)`,
            data: updatedFollowUp,
        });
    } catch (error: any) {
        console.error('Error snoozing follow-up:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to snooze follow-up' });
    }
};

// Delete a follow-up
export const deleteFollowUp = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;

        const followUp = await prisma.followUp.findFirst({
            where: { id, userId }
        });

        if (!followUp) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }

        await prisma.followUp.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Follow-up deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting follow-up:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete follow-up' });
    }
};
