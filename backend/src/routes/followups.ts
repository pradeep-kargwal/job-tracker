import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient() as any;

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

export const getAllFollowUpsWithFilter = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const statusParam = req.query.status as string || '';
        const pageParam = req.query.page as string || '1';
        const limitParam = req.query.limit as string || '20';

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const page = parseInt(pageParam) || 1;
        const limit = parseInt(limitParam) || 20;
        const skip = (page - 1) * limit;
        
        const whereClause: any = {
            userId,
        };

        // Database stores: UPCOMING, DUE, COMPLETED, MISSED
        if (statusParam === 'pending') {
            whereClause.status = { not: 'COMPLETED' };
        } else if (statusParam === 'completed') {
            whereClause.status = 'COMPLETED';
        }

        const [followUps, total] = await Promise.all([
            prisma.followUp.findMany({
                where: whereClause,
                include: {
                    application: {
                        select: {
                            id: true,
                            hiringCompany: true,
                            jobRole: true,
                        }
                    }
                },
                orderBy: {
                    followUpDate: 'asc',
                },
                skip,
                take: limit,
            }),
            prisma.followUp.count({
                where: whereClause,
            }),
        ]);

        const followUpsWithStatus = followUps.map((fu: any) => ({
            ...fu,
            computedStatus: computeStatus(fu.followUpDate || new Date(), fu.status === 'COMPLETED'),
        }));

        res.json({
            success: true,
            data: {
                followUps: followUpsWithStatus,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                }
            }
        });
    } catch (error: any) {
        console.error('Error fetching follow-ups:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch follow-ups' });
    }
};

router.use(authenticate);

router.get('/', getAllFollowUpsWithFilter);

export default router;
