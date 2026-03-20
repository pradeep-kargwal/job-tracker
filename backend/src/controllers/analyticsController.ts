import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';

export const getAnalytics = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!.id;

    // Stats
    const totalApplications = await prisma.application.count({ where: { userId } });
    const totalRecruiterCalls = totalApplications;
    const totalInterviews = await prisma.interview.count({
        where: { application: { userId } }
    });
    const totalOffers = await prisma.application.count({
        where: { userId, currentStatus: 'OFFER' }
    });

    const stats = {
        totalApplications,
        totalRecruiterCalls,
        totalInterviews,
        totalOffers,
    };

    // Conversion Funnel
    const calls = await prisma.application.count({ where: { userId } });
    const applications = await prisma.application.count({ where: { userId, applied: true } });
    const interviews = await prisma.interview.count({ where: { application: { userId } } });
    const offers = totalOffers;

    const conversionFunnel = [
        { status: 'calls', count: calls },
        { status: 'applications', count: applications },
        { status: 'interviews', count: interviews },
        { status: 'offers', count: offers },
    ];

    // Platform Stats
    const applicationsWithSource = await prisma.application.findMany({
        where: { userId },
        select: { source: true, currentStatus: true, applied: true }
    });

    const sourceMap = new Map<string, { total: number; applied: number; interviews: number; offers: number }>();

    for (const app of applicationsWithSource) {
        const source = app.source || 'Direct';
        if (!sourceMap.has(source)) {
            sourceMap.set(source, { total: 0, applied: 0, interviews: 0, offers: 0 });
        }
        const stats = sourceMap.get(source)!;
        stats.total++;
        if (app.applied) stats.applied++;
        if (app.currentStatus === 'INTERVIEW_SCHEDULED' || app.currentStatus === 'INTERVIEW_COMPLETED') stats.interviews++;
        if (app.currentStatus === 'OFFER') stats.offers++;
    }

    const platformStats = Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        ...data,
        successRate: data.total > 0 ? (data.offers / data.total) * 100 : 0
    }));

    res.status(200).json({
        success: true,
        data: { stats, conversionFunnel, platformStats }
    });
};

export const getDashboardStats = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!.id;

    // Total recruiter calls (all applications)
    const totalCalls = await prisma.application.count({
        where: { userId },
    });

    // Applications sent
    const applicationsSent = await prisma.application.count({
        where: {
            userId,
            applied: true,
        },
    });

    // Interviews ongoing
    const interviewsOngoing = await prisma.application.count({
        where: {
            userId,
            currentStatus: 'INTERVIEW_SCHEDULED',
        },
    });

    // Offers
    const offers = await prisma.application.count({
        where: {
            userId,
            currentStatus: 'OFFER',
        },
    });

    // Rejections
    const rejections = await prisma.application.count({
        where: {
            userId,
            currentStatus: 'REJECTED',
        },
    });

    // Recent activity (applications created/updated in last 7 days)
    const recentActivity = await prisma.application.findMany({
        where: {
            userId,
            updatedAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
            id: true,
            hiringCompany: true,
            jobRole: true,
            currentStatus: true,
            updatedAt: true,
        },
    });

    // Due follow-ups
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueFollowups = await prisma.followUp.count({
        where: {
            userId,
            followUpRequired: true,
            followUpDate: {
                lte: today,
            },
            responseStatus: 'PENDING',
        },
    });

    // Due follow-ups with application details (all pending follow-ups)
    const dueFollowupsList = await prisma.followUp.findMany({
        where: {
            userId,
            followUpRequired: true,
            responseStatus: 'PENDING',
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
        orderBy: { followUpDate: 'asc' },
    });

    // Upcoming interviews (next 7 days)
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const upcomingInterviews = await prisma.interview.count({
        where: {
            userId,
            status: 'SCHEDULED',
            scheduledDate: {
                gte: new Date(),
                lte: nextWeek,
            },
        },
    });

    // Today's interviews
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayInterviews = await prisma.interview.findMany({
        where: {
            userId,
            status: 'SCHEDULED',
            scheduledDate: {
                gte: todayStart,
                lte: todayEnd,
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
    });

    const response: ApiResponse = {
        success: true,
        message: 'Dashboard stats retrieved successfully',
        data: {
            stats: {
                totalCalls,
                applicationsSent,
                interviewsOngoing,
                offers,
                rejections,
                dueFollowups,
                upcomingInterviews,
            },
            recentActivity,
            todayInterviews,
            dueFollowupsList,
        },
    };

    res.json(response);
};

export const getFunnelData = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!.id;

    const [
        newCalls,
        jdReceived,
        applied,
        shortlisted,
        interviewScheduled,
        interviewCompleted,
        offers,
        rejected,
    ] = await Promise.all([
        prisma.application.count({
            where: { userId, currentStatus: 'NEW_CALL' },
        }),
        prisma.application.count({
            where: { userId, currentStatus: 'JD_RECEIVED' },
        }),
        prisma.application.count({
            where: { userId, currentStatus: 'APPLIED' },
        }),
        prisma.application.count({
            where: { userId, currentStatus: 'SHORTLISTED' },
        }),
        prisma.application.count({
            where: { userId, currentStatus: 'INTERVIEW_SCHEDULED' },
        }),
        prisma.application.count({
            where: { userId, currentStatus: 'INTERVIEW_COMPLETED' },
        }),
        prisma.application.count({
            where: { userId, currentStatus: 'OFFER' },
        }),
        prisma.application.count({
            where: { userId, currentStatus: 'REJECTED' },
        }),
    ]);

    const response: ApiResponse = {
        success: true,
        message: 'Funnel data retrieved successfully',
        data: {
            funnel: [
                { stage: 'New Call', count: newCalls, percentage: 100 },
                { stage: 'JD Received', count: jdReceived, percentage: Math.round((jdReceived / newCalls) * 100) || 0 },
                { stage: 'Applied', count: applied, percentage: Math.round((applied / newCalls) * 100) || 0 },
                { stage: 'Shortlisted', count: shortlisted, percentage: Math.round((shortlisted / newCalls) * 100) || 0 },
                { stage: 'Interview Scheduled', count: interviewScheduled, percentage: Math.round((interviewScheduled / newCalls) * 100) || 0 },
                { stage: 'Interview Completed', count: interviewCompleted, percentage: Math.round((interviewCompleted / newCalls) * 100) || 0 },
                { stage: 'Offers', count: offers, percentage: Math.round((offers / newCalls) * 100) || 0 },
                { stage: 'Rejected', count: rejected, percentage: Math.round((rejected / newCalls) * 100) || 0 },
            ],
        },
    };

    res.json(response);
};

export const getSourceAnalytics = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!.id;

    const sourceCounts = await prisma.application.groupBy({
        by: ['source'],
        where: { userId },
        _count: true,
    });

    const total = await prisma.application.count({
        where: { userId },
    });

    const sources = sourceCounts.map((item) => ({
        source: item.source || 'Unknown',
        count: item._count,
        percentage: Math.round((item._count / total) * 100) || 0,
    }));

    const response: ApiResponse = {
        success: true,
        message: 'Source analytics retrieved successfully',
        data: { sources, total },
    };

    res.json(response);
};

export const getTimelineData = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!.id;

    // Get applications grouped by month for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);

    const applications = await prisma.application.findMany({
        where: {
            userId,
            createdAt: {
                gte: sixMonthsAgo,
            },
        },
        select: {
            createdAt: true,
            currentStatus: true,
        },
    });

    // Group by month
    const monthlyData: Record<string, { total: number; applied: number; interviewed: number }> = {};

    applications.forEach((app) => {
        const monthKey = `${app.createdAt.getFullYear()}-${String(app.createdAt.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { total: 0, applied: 0, interviewed: 0 };
        }

        monthlyData[monthKey].total++;

        if (['APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER'].includes(app.currentStatus)) {
            monthlyData[monthKey].applied++;
        }

        if (['INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER'].includes(app.currentStatus)) {
            monthlyData[monthKey].interviewed++;
        }
    });

    const timeline = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data,
    }));

    const response: ApiResponse = {
        success: true,
        message: 'Timeline data retrieved successfully',
        data: timeline,
    };

    res.json(response);
};
