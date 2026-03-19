import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

const noteSchema = z.object({
    content: z.string().min(1, 'Content is required'),
    noteType: z.enum(['CALL', 'GENERAL', 'FOLLOWUP', 'FEEDBACK']).optional(),
});

export const getNotes = async (
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

    const notes = await prisma.note.findMany({
        where: {
            applicationId,
        },
        orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Notes retrieved successfully',
        data: notes,
    };

    res.json(response);
};

export const createNote = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { applicationId } = req.params;
    const data = noteSchema.parse(req.body);

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

    const note = await prisma.note.create({
        data: {
            ...data,
            applicationId,
            userId: req.user!.id,
        },
    });

    // Update application updatedAt
    await prisma.application.update({
        where: { id: applicationId },
        data: { updatedAt: new Date() },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Note created successfully',
        data: note,
    };

    res.status(201).json(response);
};

export const updateNote = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;
    const data = noteSchema.parse(req.body);

    const note = await prisma.note.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!note) {
        throw new AppError('Note not found', 404);
    }

    const updatedNote = await prisma.note.update({
        where: { id },
        data,
    });

    const response: ApiResponse = {
        success: true,
        message: 'Note updated successfully',
        data: updatedNote,
    };

    res.json(response);
};

export const deleteNote = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const note = await prisma.note.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!note) {
        throw new AppError('Note not found', 404);
    }

    await prisma.note.delete({
        where: { id },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Note deleted successfully',
    };

    res.json(response);
};
