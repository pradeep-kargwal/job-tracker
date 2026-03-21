'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
    Bell,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Plus,
    Briefcase,
    MessageSquare,
    Video,
    TrendingUp,
    Target,
    Zap,
    ChevronRight,
    MoreVertical,
    RefreshCw,
} from 'lucide-react';
import { analyticsAPI, applicationsAPI, interviewEventsAPI, followupsAPI } from '@/lib/api';
import { formatDate, formatRelativeTime, STATUS_LABELS } from '@/lib/utils';

// Types
interface Stats {
    totalCalls: number;
    applicationsSent: number;
    interviewsOngoing: number;
    offers: number;
    rejections: number;
    dueFollowups: number;
    upcomingInterviews: number;
}

interface DashboardData {
    stats: Stats;
    recentActivity: any[];
    todayInterviews: any[];
    dueFollowupsList: any[];
    pipeline: any[];
    stuckApplications: any[];
    interviewProcesses: any[];
    weeklyStats?: {
        applicationsThisWeek: number;
        interviewsThisWeek: number;
    };
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

const fetcher = (): Promise<ApiResponse<DashboardData>> => 
    analyticsAPI.getDashboard().then((res) => res.data);

// Get greeting based on time of day
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

// Get today's date formatted
function getTodayDate(): string {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function CommandCenterDashboard() {
    // Get local date for API calls
    const localDate = new Date().toLocaleDateString('en-CA'); // Format: YYYY-MM-DD in local timezone
    const { data, error, isLoading, mutate } = useSWR<ApiResponse<DashboardData>>(`/analytics/dashboard?date=${localDate}`, fetcher);
    const [todayEvents, setTodayEvents] = useState<any[]>([]);
    const [stuckApps, setStuckApps] = useState<any[]>([]);
    const [pipeline, setPipeline] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch additional data
    useEffect(() => {
        const fetchAdditionalData = async () => {
            try {
                // Use local date to match user's timezone
                const today = new Date().toLocaleDateString('en-CA'); // Format: YYYY-MM-DD in local timezone
                
                // Fetch today's events
                const eventsRes = await interviewEventsAPI.getByDate(today);
                if (eventsRes.data?.success) {
                    setTodayEvents(eventsRes.data.data || []);
                }

                // Fetch pipeline
                const pipelineRes = await applicationsAPI.getPipeline();
                if (pipelineRes.data?.success) {
                    setPipeline(pipelineRes.data.data);
                }

                // Fetch stuck applications (no activity for 5+ days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                
                const allAppsRes = await applicationsAPI.getAll({ limit: 100 });
                if (allAppsRes.data?.success) {
                    const apps = allAppsRes.data.data.applications || [];
                    const stuck = apps.filter((app: any) => {
                        const lastUpdate = new Date(app.updatedAt);
                        const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
                        const isStuck = daysSinceUpdate >= 5 && 
                            !['REJECTED', 'OFFER', 'INTERVIEW_COMPLETED'].includes(app.currentStatus);
                        return isStuck;
                    });
                    setStuckApps(stuck);
                }
            } catch (err) {
                console.error('Error fetching additional data:', err);
            }
        };

        fetchAdditionalData();
    }, [data]);

    const refreshData = useCallback(async () => {
        setIsRefreshing(true);
        await mutate();
        setIsRefreshing(false);
    }, [mutate]);

    // Handle mark complete for follow-up
    const handleMarkComplete = async (followupId: string) => {
        try {
            await followupsAPI.markComplete(followupId);
            refreshData();
        } catch (err) {
            console.error('Error marking follow-up complete:', err);
        }
    };

    // Handle snooze for follow-up
    const handleSnooze = async (followupId: string, days: number) => {
        try {
            await followupsAPI.snooze(followupId, days);
            refreshData();
        } catch (err) {
            console.error('Error snoozing follow-up:', err);
        }
    };

    // Handle mark interview complete
    const handleMarkInterviewComplete = async (eventId: string) => {
        try {
            await interviewEventsAPI.markComplete(eventId);
            refreshData();
        } catch (err) {
            console.error('Error marking interview complete:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                        <p className="font-semibold">Failed to load dashboard</p>
                        <p className="text-sm mt-1">Please try refreshing the page</p>
                    </div>
                </div>
            </div>
        );
    }

    const dashboardData = data?.data as DashboardData | undefined;
    const stats: Stats = dashboardData?.stats ?? {
        totalCalls: 0,
        applicationsSent: 0,
        interviewsOngoing: 0,
        offers: 0,
        rejections: 0,
        dueFollowups: 0,
        upcomingInterviews: 0,
    };
    const todayInterviews = todayEvents.length > 0 ? todayEvents : (dashboardData?.todayInterviews || []);
    const dueFollowups = dashboardData?.dueFollowupsList || [];
    const stuckApplications = stuckApps.length > 0 ? stuckApps : (dashboardData?.stuckApplications || []);

    // Calculate counts
    const todayInterviewCount = todayInterviews.length;
    const dueFollowupCount = dueFollowups.length;
    const stuckCount = stuckApplications.length;

    // Pipeline counts
    const pipelineData = pipeline || { newCall: [], jdReceived: [], applied: [], shortlisted: [], interviewInProgress: [], interviewScheduled: [], interviewCompleted: [], offer: [], rejected: [], onHold: [] };
    const pipelineCounts = {
        new: pipelineData.newCall?.length || 0,
        applied: pipelineData.applied?.length || 0,
        interview: (pipelineData.interviewInProgress?.length || 0) + (pipelineData.interviewScheduled?.length || 0),
        offer: pipelineData.offer?.length || 0,
    };

    // All caught up message
    const isAllCaughtUp = todayInterviewCount === 0 && dueFollowupCount === 0 && stuckCount === 0;

    return (
        <div className="space-y-6">
            {/* Quick Actions Bar - Sticky */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-border/50">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/applications/new"
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Application</span>
                        </Link>
                        <Link
                            href="/dashboard/interviews"
                            className="flex items-center gap-2 bg-white border border-border text-text-primary px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden sm:inline">Schedule Interview</span>
                        </Link>
                        <button
                            onClick={refreshData}
                            disabled={isRefreshing}
                            className="flex items-center gap-2 bg-white border border-border text-text-primary px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Section 1: Smart Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">{getGreeting()}! 👋</h1>
                        <p className="text-primary-light mt-1">{getTodayDate()}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-4">
                        <p className="text-lg font-semibold">
                            {todayInterviewCount > 0 && (
                                <span>{todayInterviewCount} interview{todayInterviewCount > 1 ? 's' : ''} today</span>
                            )}
                            {todayInterviewCount > 0 && dueFollowupCount > 0 && <span> • </span>}
                            {dueFollowupCount > 0 && (
                                <span>{dueFollowupCount} follow-up{dueFollowupCount > 1 ? 's' : ''} pending</span>
                            )}
                            {todayInterviewCount === 0 && dueFollowupCount === 0 && (
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    All caught up!
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* All Caught Up Message */}
            {isAllCaughtUp && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-green-800">You're all caught up! 🎯</h3>
                    <p className="text-green-700 mt-2">No pending interviews or follow-ups for today.</p>
                    <Link
                        href="/dashboard/applications/new"
                        className="inline-flex items-center gap-2 mt-4 text-green-700 hover:underline"
                    >
                        Add a new application to keep the momentum going
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {/* Section 2: Action Center - MOST IMPORTANT */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-text-primary">Needs Your Attention</h2>
                    {!isAllCaughtUp && (
                        <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {todayInterviewCount + dueFollowupCount + stuckCount} items
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* 2a: Follow-ups Due Today */}
                    <div className="bg-white rounded-xl shadow-card border border-amber-200 overflow-hidden">
                        <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-amber-600" />
                                <span className="font-semibold text-amber-800">Follow-ups</span>
                            </div>
                            {dueFollowupCount > 0 && (
                                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {dueFollowupCount}
                                </span>
                            )}
                        </div>
                        <div className="divide-y divide-border max-h-80 overflow-y-auto">
                            {dueFollowups.length > 0 ? (
                                dueFollowups.slice(0, 5).map((followup: any) => (
                                    <div key={followup.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <Link
                                                    href={`/dashboard/applications/${followup.application?.id}`}
                                                    className="font-medium text-text-primary hover:text-primary truncate block"
                                                >
                                                    {followup.application?.hiringCompany || 'Unknown Company'}
                                                </Link>
                                                <p className="text-sm text-text-secondary truncate">
                                                    {followup.application?.jobRole || 'Application'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                        followup.contextType === 'AFTER_INTERVIEW' 
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : followup.contextType === 'NO_RESPONSE'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {followup.contextType === 'AFTER_INTERVIEW' 
                                                            ? 'After Interview'
                                                            : followup.contextType === 'NO_RESPONSE'
                                                            ? 'No Response'
                                                            : 'General'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleMarkComplete(followup.id)}
                                                    className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                    title="Mark Done"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleSnooze(followup.id, 1)}
                                                    className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                                    title="Snooze 1 day"
                                                >
                                                    <Clock className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-text-secondary">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm">No follow-ups due</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2b: Interviews Today */}
                    <div className="bg-white rounded-xl shadow-card border border-blue-200 overflow-hidden">
                        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-blue-800">Today's Interviews</span>
                            </div>
                            {todayInterviewCount > 0 && (
                                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {todayInterviewCount}
                                </span>
                            )}
                        </div>
                        <div className="divide-y divide-border max-h-80 overflow-y-auto">
                            {todayInterviews.length > 0 ? (
                                todayInterviews.slice(0, 5).map((interview: any) => (
                                    <div key={interview.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <Link
                                                    href={`/dashboard/applications/${interview.application?.id}`}
                                                    className="font-medium text-text-primary hover:text-primary truncate block"
                                                >
                                                    {interview.application?.hiringCompany || interview.title || 'Interview'}
                                                </Link>
                                                <p className="text-sm text-text-secondary truncate">
                                                    {interview.application?.jobRole || interview.roundName || ''}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="flex items-center gap-1 text-xs text-blue-600">
                                                        <Clock className="w-3 h-3" />
                                                        {interview.startTime || (interview.scheduledDate ? new Date(interview.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD')}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                                        Round {interview.roundNumber || interview.round_name || 1}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <Link
                                                    href={`/dashboard/applications/${interview.application?.id}`}
                                                    className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-center"
                                                    title="View Details"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleMarkInterviewComplete(interview.id)}
                                                    className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                    title="Mark Complete"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-text-secondary">
                                    <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                    <p className="text-sm">No interviews today</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2c: Stuck Applications */}
                    <div className="bg-white rounded-xl shadow-card border border-red-200 overflow-hidden">
                        <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <span className="font-semibold text-red-800">Stuck Applications</span>
                            </div>
                            {stuckCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {stuckCount}
                                </span>
                            )}
                        </div>
                        <div className="divide-y divide-border max-h-80 overflow-y-auto">
                            {stuckApplications.length > 0 ? (
                                stuckApplications.slice(0, 5).map((app: any) => {
                                    const daysSinceUpdate = Math.floor((Date.now() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <div key={app.id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <Link
                                                        href={`/dashboard/applications/${app.id}`}
                                                        className="font-medium text-text-primary hover:text-primary truncate block"
                                                    >
                                                        {app.hiringCompany || 'Unknown Company'}
                                                    </Link>
                                                    <p className="text-sm text-text-secondary truncate">
                                                        {app.jobRole || 'Application'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs text-red-600 font-medium">
                                                            No response for {daysSinceUpdate} days
                                                        </span>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/dashboard/applications/${app.id}`}
                                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs font-medium"
                                                >
                                                    Follow-up
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-6 text-center text-text-secondary">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-sm">No stuck applications</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Today Timeline */}
            <div className="bg-white rounded-xl shadow-card">
                <div className="px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-text-primary">Today's Timeline</h2>
                    </div>
                </div>
                <div className="p-6">
                    {todayInterviews.length > 0 ? (
                        <div className="space-y-4">
                            {todayInterviews
                                .sort((a: any, b: any) => {
                                    const timeA = a.startTime || (a.scheduledDate ? new Date(a.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                                    const timeB = b.startTime || (b.scheduledDate ? new Date(b.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                                    return timeA.localeCompare(timeB);
                                })
                                .map((interview: any, index: number) => (
                                    <div key={interview.id} className="flex items-start gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 bg-primary rounded-full" />
                                            {index < todayInterviews.length - 1 && (
                                                <div className="w-0.5 h-16 bg-border" />
                                            )}
                                        </div>
                                        <div className="flex-1 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-text-primary">
                                                        {interview.startTime || (interview.scheduledDate ? new Date(interview.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Time TBD')}
                                                    </p>
                                                    <p className="text-text-secondary">
                                                        {interview.application?.hiringCompany || interview.title || 'Interview'}
                                                        <span className="mx-2">•</span>
                                                        <span className="text-primary">{interview.application?.jobRole || interview.roundName || `Round ${interview.roundNumber || 1}`}</span>
                                                    </p>
                                                </div>
                                                <Link
                                                    href={`/dashboard/applications/${interview.application?.id}`}
                                                    className="text-primary hover:text-primary-dark text-sm font-medium"
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-text-secondary">Your schedule is clear today</p>
                            <Link
                                href="/dashboard/applications"
                                className="inline-flex items-center gap-2 mt-3 text-primary hover:underline text-sm"
                            >
                                Browse your applications
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 4: Pipeline Snapshot */}
            <div className="bg-white rounded-xl shadow-card">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-text-primary">Pipeline Snapshot</h2>
                    </div>
                    <Link
                        href="/dashboard/pipeline"
                        className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
                    >
                        View Full Pipeline
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {/* New */}
                        <div className="flex-shrink-0 bg-slate-100 rounded-lg p-4 min-w-[120px] text-center hover:bg-slate-200 transition-colors cursor-pointer">
                            <p className="text-2xl font-bold text-slate-700">{pipelineCounts.new}</p>
                            <p className="text-sm text-slate-600">New</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-border flex-shrink-0" />
                        
                        {/* Applied */}
                        <div className="flex-shrink-0 bg-blue-100 rounded-lg p-4 min-w-[120px] text-center hover:bg-blue-200 transition-colors cursor-pointer">
                            <p className="text-2xl font-bold text-blue-700">{pipelineCounts.applied}</p>
                            <p className="text-sm text-blue-600">Applied</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-border flex-shrink-0" />
                        
                        {/* Interview */}
                        <div className="flex-shrink-0 bg-amber-100 rounded-lg p-4 min-w-[120px] text-center hover:bg-amber-200 transition-colors cursor-pointer">
                            <p className="text-2xl font-bold text-amber-700">{pipelineCounts.interview}</p>
                            <p className="text-sm text-amber-600">Interview</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-border flex-shrink-0" />
                        
                        {/* Offer */}
                        <div className="flex-shrink-0 bg-green-100 rounded-lg p-4 min-w-[120px] text-center hover:bg-green-200 transition-colors cursor-pointer">
                            <p className="text-2xl font-bold text-green-700">{pipelineCounts.offer}</p>
                            <p className="text-sm text-green-600">Offer</p>
                        </div>
                    </div>
                    
                    {/* Quick stats */}
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-2xl font-bold text-text-primary">{stats.totalCalls || 0}</p>
                            <p className="text-sm text-text-secondary">Total Calls</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-text-primary">{stats.applicationsSent || 0}</p>
                            <p className="text-sm text-text-secondary">Applications</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-text-primary">{stats.interviewsOngoing || 0}</p>
                            <p className="text-sm text-text-secondary">In Interview</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{stats.offers || 0}</p>
                            <p className="text-sm text-text-secondary">Offers</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 5: Active Interviews */}
            <div className="bg-white rounded-xl shadow-card">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-text-primary">Active Interviews</h2>
                    </div>
                    <Link
                        href="/dashboard/interviews"
                        className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
                    >
                        View All
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
                <div className="p-6">
                    {pipelineCounts.interview > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Show applications in interview stages */}
                            {[...(pipelineData.interviewScheduled || []), ...(pipelineData.interviewInProgress || [])]
                                .slice(0, 6)
                                .map((app: any) => (
                                    <Link
                                        key={app.id}
                                        href={`/dashboard/applications/${app.id}`}
                                        className="border border-border rounded-lg p-4 hover:border-primary hover:shadow-card-hover transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-text-primary truncate">
                                                    {app.hiringCompany || 'Company'}
                                                </p>
                                                <p className="text-sm text-text-secondary truncate">
                                                    {app.jobRole || 'Role'}
                                                </p>
                                            </div>
                                            <span className="flex-shrink-0 text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                                Interview
                                            </span>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-text-secondary">Status</span>
                                                <span className="text-primary font-medium">
                                                    {app.currentStatus === 'INTERVIEW_SCHEDULED' ? 'Scheduled' : 'In Progress'}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-text-secondary">No active interviews</p>
                            <Link
                                href="/dashboard/applications"
                                className="inline-flex items-center gap-2 mt-3 text-primary hover:underline text-sm"
                            >
                                Browse applications
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 7: Insights */}
            <div className="bg-white rounded-xl shadow-card">
                <div className="px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-text-primary">This Week's Progress</h2>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Briefcase className="w-6 h-6 text-primary" />
                            </div>
                            <p className="text-2xl font-bold text-text-primary">{stats.applicationsSent || 0}</p>
                            <p className="text-sm text-text-secondary">Applications Sent</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Video className="w-6 h-6 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold text-text-primary">{todayInterviewCount + stats.interviewsOngoing}</p>
                            <p className="text-sm text-text-secondary">Total Interviews</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-green-600">{stats.offers || 0}</p>
                            <p className="text-sm text-text-secondary">Offers Received</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <TrendingUp className="w-6 h-6 text-amber-600" />
                            </div>
                            <p className="text-2xl font-bold text-text-primary">
                                {stats.applicationsSent > 0 
                                    ? Math.round((stats.offers / stats.applicationsSent) * 100) 
                                    : 0}%
                            </p>
                            <p className="text-sm text-text-secondary">Conversion Rate</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
