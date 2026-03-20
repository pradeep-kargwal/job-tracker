import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, ApiResponse } from '../types';

// Helper function to get date ranges
const getDateRange = (period: string) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
        case 'weekly':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'monthly':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case '3months':
            startDate.setMonth(now.getMonth() - 3);
            break;
        default:
            startDate.setMonth(now.getMonth() - 6);
    }
    
    return { startDate, endDate: now };
};

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
        if (app.currentStatus === 'INTERVIEW_IN_PROGRESS' || app.currentStatus === 'INTERVIEW_SCHEDULED' || app.currentStatus === 'INTERVIEW_COMPLETED') stats.interviews++;
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
    
    // Get date from query param or use current date
    const dateParam = req.query.date as string | undefined;
    let todayStart: Date;
    let todayEnd: Date;
    
    if (dateParam) {
        // Use the provided date in local timezone
        todayStart = new Date(dateParam + 'T00:00:00');
        todayEnd = new Date(dateParam + 'T23:59:59.999');
    } else {
        // Use server's current date
        todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
    }

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
            currentStatus: 'INTERVIEW_IN_PROGRESS',
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

    // Due follow-ups (not completed)
    const prismaAny = prisma as any;
    const dueFollowups = await prismaAny.followUp.count({
        where: {
            userId,
            status: {
                not: 'COMPLETED',
            },
        },
    });

    // Due follow-ups with application details (pending follow-ups - UPCOMING, DUE, or MISSED)
    const dueFollowupsList = await prismaAny.followUp.findMany({
        where: {
            userId,
            status: {
                not: 'COMPLETED',
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

    // Today's interviews from Interview Tracker (using the same todayStart/todayEnd from above)
    
    // Today's interviews from new InterviewRound table (Interview Tracker)
    const todayNewInterviews = await prismaAny.interviewRound.findMany({
        where: {
            interviewProcess: {
                userId,
            },
            status: 'SCHEDULED',
            scheduledDate: {
                gte: todayStart,
                lte: todayEnd,
            },
        },
        include: {
            interviewProcess: {
                include: {
                    application: {
                        select: {
                            id: true,
                            hiringCompany: true,
                            jobRole: true,
                        },
                    },
                },
            },
        },
        orderBy: { scheduledDate: 'asc' },
    });

    // Use only Interview Tracker data
    const todayInterviews = todayNewInterviews.map((round: any) => ({
        id: round.id,
        roundName: round.roundName,
        round_name: round.roundName,
        scheduledDate: round.scheduledDate,
        scheduled_date: round.scheduledDate,
        status: round.status,
        source: 'tracker',
        application: round.interviewProcess.application,
    }));

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
    const period = (req.query.period as string) || 'monthly';

    const { startDate, endDate } = getDateRange(period === 'weekly' ? 'weekly' : period === '3months' ? '3months' : 'monthly');
    startDate.setDate(1); // Start from 1st of month

    const applications = await prisma.application.findMany({
        where: {
            userId,
            createdAt: {
                gte: startDate,
            },
        },
        select: {
            createdAt: true,
            currentStatus: true,
        },
    });

    // Group by period
    const groupedData: Record<string, { total: number; applied: number; interviewed: number; offers: number }> = {};

    applications.forEach((app) => {
        let key: string;
        if (period === 'weekly') {
            // Get week number
            const startOfYear = new Date(app.createdAt.getFullYear(), 0, 1);
            const days = Math.floor((app.createdAt.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
            const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
            key = `${app.createdAt.getFullYear()}-W${String(week).padStart(2, '0')}`;
        } else {
            key = `${app.createdAt.getFullYear()}-${String(app.createdAt.getMonth() + 1).padStart(2, '0')}`;
        }

        if (!groupedData[key]) {
            groupedData[key] = { total: 0, applied: 0, interviewed: 0, offers: 0 };
        }

        groupedData[key].total++;

        if (['APPLIED', 'SHORTLISTED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER'].includes(app.currentStatus)) {
            groupedData[key].applied++;
        }

        if (['INTERVIEW_IN_PROGRESS', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'OFFER'].includes(app.currentStatus)) {
            groupedData[key].interviewed++;
        }

        if (app.currentStatus === 'OFFER') {
            groupedData[key].offers++;
        }
    });

    const timeline = Object.entries(groupedData).map(([periodKey, data]) => ({
        period: periodKey,
        ...data,
    })).sort((a, b) => a.period.localeCompare(b.period));

    const response: ApiResponse = {
        success: true,
        message: 'Timeline data retrieved successfully',
        data: { timeline, period },
    };

    res.json(response);
};

// Get comprehensive analytics data
export const getComprehensiveAnalytics = async (
    req: AuthRequest,
    res: Response
): Promise<void> => {
    const userId = req.user!.id;

    // 1. KPI Stats
    const totalApplications = await prisma.application.count({ where: { userId } });
    const applicationsWithFollowups = await prisma.application.count({
        where: { userId, followups: { some: {} } }
    });
    
    // Interview stages
    const interviewScheduled = await prisma.application.count({
        where: { userId, currentStatus: 'INTERVIEW_SCHEDULED' }
    });
    const interviewInProgress = await prisma.application.count({
        where: { userId, currentStatus: 'INTERVIEW_IN_PROGRESS' }
    });
    const interviewCompleted = await prisma.application.count({
        where: { userId, currentStatus: 'INTERVIEW_COMPLETED' }
    });
    const interviewsScheduled = interviewScheduled + interviewInProgress;
    const interviewsCompleted = interviewCompleted;
    
    const offers = await prisma.application.count({
        where: { userId, currentStatus: 'OFFER' }
    });
    const rejections = await prisma.application.count({
        where: { userId, currentStatus: 'REJECTED' }
    });

    // 2. Status Distribution
    const statusCounts = await prisma.application.groupBy({
        by: ['currentStatus'],
        where: { userId },
        _count: true,
    });

    const statusDistribution = statusCounts.map(s => ({
        status: s.currentStatus,
        count: s._count,
        percentage: Math.round((s._count / totalApplications) * 100) || 0
    }));

    // 3. Funnel Data (Applications → Shortlisted → Interview → Offer)
    const applied = await prisma.application.count({
        where: { userId, applied: true }
    });
    const shortlisted = await prisma.application.count({
        where: { userId, currentStatus: { in: ['SHORTLISTED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'OFFER'] } }
    });
    const inInterview = await prisma.application.count({
        where: { userId, currentStatus: { in: ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED'] } }
    });

    const funnelData = [
        { stage: 'Applied', count: applied, percentage: applied > 0 ? 100 : 0 },
        { stage: 'Shortlisted', count: shortlisted, percentage: applied > 0 ? Math.round((shortlisted / applied) * 100) : 0 },
        { stage: 'Interview', count: inInterview, percentage: applied > 0 ? Math.round((inInterview / applied) * 100) : 0 },
        { stage: 'Offer', count: offers, percentage: applied > 0 ? Math.round((offers / applied) * 100) : 0 },
    ];

    // Calculate biggest drop-off
    let biggestDrop = { from: '', to: '', percentage: 0 };
    for (let i = 1; i < funnelData.length; i++) {
        const drop = funnelData[i - 1].count - funnelData[i].count;
        const dropPercentage = funnelData[i - 1].count > 0 ? Math.round((drop / funnelData[i - 1].count) * 100) : 0;
        if (dropPercentage > biggestDrop.percentage) {
            biggestDrop = {
                from: funnelData[i - 1].stage,
                to: funnelData[i].stage,
                percentage: dropPercentage
            };
        }
    }

    // 4. Drop-off Analysis
    const noResponse = await prisma.application.count({
        where: { userId, currentStatus: { in: ['NEW_CALL', 'JD_RECEIVED', 'APPLIED'] } }
    });
    const interviewRejected = await prisma.application.count({
        where: { userId, currentStatus: 'REJECTED' }
    });

    const dropoffData = {
        noResponse: { count: noResponse, percentage: totalApplications > 0 ? Math.round((noResponse / totalApplications) * 100) : 0 },
        interviewRejected: { count: interviewRejected, percentage: totalApplications > 0 ? Math.round((interviewRejected / totalApplications) * 100) : 0 },
        atInterviewStage: { count: inInterview, percentage: totalApplications > 0 ? Math.round((inInterview / totalApplications) * 100) : 0 },
    };

    // 5. Company Insights
    const applicationsWithCompanies = await prisma.application.findMany({
        where: { userId, hiringCompany: { not: null } },
        select: { hiringCompany: true, currentStatus: true },
        take: 100,
    });

    const companyMap = new Map<string, { status: string; count: number }>();
    applicationsWithCompanies.forEach(app => {
        const company = app.hiringCompany!;
        if (!companyMap.has(company)) {
            companyMap.set(company, { status: app.currentStatus, count: 0 });
        }
        const data = companyMap.get(company)!;
        data.count++;
        // Prioritize more advanced stages
        const stageOrder = ['OFFER', 'INTERVIEW_COMPLETED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_SCHEDULED', 'SHORTLISTED', 'APPLIED', 'JD_RECEIVED', 'NEW_CALL', 'REJECTED'];
        if (stageOrder.indexOf(app.currentStatus) < stageOrder.indexOf(data.status)) {
            data.status = app.currentStatus;
        }
    });

    const topCompanies = Array.from(companyMap.entries())
        .map(([company, data]) => ({ company, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // 6. Interview Performance
    const prismaAny = prisma as any;
    const interviewProcesses = await prismaAny.interviewProcess.findMany({
        where: { userId },
        select: { roundsCompleted: true, totalRounds: true, status: true },
    });

    const totalRoundsCompleted = interviewProcesses.reduce((sum: number, p: any) => sum + (p.roundsCompleted || 0), 0);
    const applicationsWithInterview = interviewProcesses.length;
    const avgRounds = applicationsWithInterview > 0 ? (totalRoundsCompleted / applicationsWithInterview).toFixed(1) : '0';

    const interviewPerformance = {
        totalRoundsCompleted,
        applicationsWithInterview,
        avgRoundsPerApplication: parseFloat(avgRounds),
    };

    // 7. Follow-up Effectiveness
    const applicationsWithFollowup: any[] = await prismaAny.followUp.findMany({
        where: { userId },
        select: {
            applicationId: true,
            status: true,
            application: {
                select: { currentStatus: true }
            }
        },
    });

    const followupByApp = new Map<string, { hasCompleted: boolean; finalStatus: string }>();
    applicationsWithFollowup.forEach((f: any) => {
        const appId = f.applicationId;
        if (!followupByApp.has(appId)) {
            followupByApp.set(appId, { hasCompleted: false, finalStatus: f.application.currentStatus });
        }
        if (f.status === 'COMPLETED') {
            const data = followupByApp.get(appId)!;
            data.hasCompleted = true;
        }
    });

    let appsWithFollowups = 0;
    let appsWithoutFollowups = 0;
    let followupToInterview = 0;
    let noFollowupToInterview = 0;

    // Compare with all applications
    const allApps = await prisma.application.findMany({
        where: { userId },
        select: { id: true, currentStatus: true },
    });

    const followupAppIds = new Set(followupByApp.keys());
    allApps.forEach(app => {
        if (followupAppIds.has(app.id)) {
            appsWithFollowups++;
            const interviewStatuses = ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'OFFER'];
            if (followupByApp.get(app.id)?.hasCompleted && interviewStatuses.includes(app.currentStatus)) {
                followupToInterview++;
            }
        } else {
            appsWithoutFollowups++;
            const interviewStatuses = ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'OFFER'];
            if (interviewStatuses.includes(app.currentStatus)) {
                noFollowupToInterview++;
            }
        }
    });

    const followupConversion = appsWithFollowups > 0 ? Math.round((followupToInterview / appsWithFollowups) * 100) : 0;
    const noFollowupConversion = appsWithoutFollowups > 0 ? Math.round((noFollowupToInterview / appsWithoutFollowups) * 100) : 0;
    const followupImprovement = noFollowupConversion > 0 ? Math.round(((followupConversion - noFollowupConversion) / noFollowupConversion) * 100) : 0;

    const followupData = {
        applicationsWithFollowups: appsWithFollowups,
        applicationsWithoutFollowups: appsWithoutFollowups,
        followupToInterviewRate: followupConversion,
        noFollowupToInterviewRate: noFollowupConversion,
        improvementPercentage: followupImprovement,
    };

    // 8. Weekly Activity (last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const recentApplications = await prisma.application.findMany({
        where: {
            userId,
            createdAt: { gte: eightWeeksAgo },
        },
        select: { createdAt: true, currentStatus: true },
    });

    const weeklyActivity: Record<string, { applications: number; interviews: number }> = {};
    recentApplications.forEach(app => {
        const startOfWeek = new Date(app.createdAt);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const weekKey = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
        
        if (!weeklyActivity[weekKey]) {
            weeklyActivity[weekKey] = { applications: 0, interviews: 0 };
        }
        weeklyActivity[weekKey].applications++;
        
        if (['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'OFFER'].includes(app.currentStatus)) {
            weeklyActivity[weekKey].interviews++;
        }
    });

    const weeklyData = Object.entries(weeklyActivity)
        .map(([week, data]) => ({ week, ...data }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-8);

    // 9. Smart Insights (rule-based)
    const insights: { type: string; message: string; priority: string }[] = [];

    // Insight 1: Application frequency
    const lastAppDate = await prisma.application.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
    });

    if (lastAppDate) {
        const daysSinceLastApp = Math.floor((Date.now() - lastAppDate.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastApp > 5) {
            insights.push({
                type: 'activity',
                message: `You haven't applied in ${daysSinceLastApp} days. Stay consistent!`,
                priority: daysSinceLastApp > 14 ? 'high' : 'medium',
            });
        }
    }

    // Insight 2: Interview to Offer conversion
    if (inInterview > 0 && offers === 0) {
        insights.push({
            type: 'conversion',
            message: 'You have interviews but no offers yet. Consider asking for feedback after rejections.',
            priority: 'medium',
        });
    } else if (offers > 0 && inInterview === 0) {
        insights.push({
            type: 'conversion',
            message: 'Great job getting offers! Focus on interview preparation to improve conversion.',
            priority: 'low',
        });
    }

    // Insight 3: Biggest drop-off
    if (biggestDrop.percentage > 0) {
        insights.push({
            type: 'funnel',
            message: `Biggest drop at ${biggestDrop.from} → ${biggestDrop.to} stage (${biggestDrop.percentage}% drop)`,
            priority: biggestDrop.percentage > 50 ? 'high' : 'medium',
        });
    }

    // Insight 4: Follow-up effectiveness
    if (followupImprovement > 0) {
        insights.push({
            type: 'followup',
            message: `Follow-ups increased interview chances by ${followupImprovement}%`,
            priority: 'medium',
        });
    }

    // Insight 5: Rejection rate
    if (totalApplications > 0) {
        const rejectionRate = Math.round((rejections / totalApplications) * 100);
        if (rejectionRate > 50) {
            insights.push({
                type: 'rejection',
                message: `High rejection rate (${rejectionRate}%). Consider reviewing your resume and application strategy.`,
                priority: 'high',
            });
        }
    }

    // Insight 6: Interview timing
    const appsWithAppliedDate = await prisma.application.findMany({
        where: { userId, appliedDate: { not: null }, currentStatus: { in: ['INTERVIEW_SCHEDULED', 'INTERVIEW_IN_PROGRESS', 'INTERVIEW_COMPLETED', 'OFFER'] } },
        select: { appliedDate: true, createdAt: true },
        take: 20,
    });

    if (appsWithAppliedDate.length > 3) {
        let totalDays = 0;
        appsWithAppliedDate.forEach(app => {
            if (app.appliedDate) {
                const days = Math.floor((app.appliedDate.getTime() - app.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                totalDays += days;
            }
        });
        const avgDays = Math.round(totalDays / appsWithAppliedDate.length);
        if (avgDays > 0 && avgDays < 30) {
            insights.push({
                type: 'timing',
                message: `Most interviews happen within ${avgDays} days of applying`,
                priority: 'low',
            });
        }
    }

    const response: ApiResponse = {
        success: true,
        message: 'Comprehensive analytics retrieved successfully',
        data: {
            kpis: {
                totalApplications,
                interviewsScheduled,
                interviewsCompleted,
                offers,
                rejections,
            },
            funnel: { data: funnelData, biggestDrop },
            statusDistribution,
            dropoff: dropoffData,
            companies: topCompanies,
            interviewPerformance,
            followupEffectiveness: followupData,
            weeklyActivity: weeklyData,
            insights,
        },
    };

    res.json(response);
};
