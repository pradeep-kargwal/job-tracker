import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';

export const getNotifications = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!.id;
    const unreadOnly = req.query.unreadOnly === 'true';

    const where: any = { userId };
    if (unreadOnly) {
        where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    const unreadCount = await prisma.notification.count({
        where: {
            userId,
            isRead: false,
        },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Notifications retrieved successfully',
        data: {
            notifications,
            unreadCount,
        },
    };

    res.json(response);
};

export const markAsRead = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!notification) {
        res.status(404).json({
            success: false,
            message: 'Notification not found',
        });
        return;
    }

    await prisma.notification.update({
        where: { id },
        data: { isRead: true },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Notification marked as read',
    };

    res.json(response);
};

export const markAllAsRead = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    await prisma.notification.updateMany({
        where: {
            userId: req.user!.id,
            isRead: false,
        },
        data: { isRead: true },
    });

    const response: ApiResponse = {
        success: true,
        message: 'All notifications marked as read',
    };

    res.json(response);
};

export const deleteNotification = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
        where: {
            id,
            userId: req.user!.id,
        },
    });

    if (!notification) {
        res.status(404).json({
            success: false,
            message: 'Notification not found',
        });
        return;
    }

    await prisma.notification.delete({
        where: { id },
    });

    const response: ApiResponse = {
        success: true,
        message: 'Notification deleted',
    };

    res.json(response);
};
