'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
    Briefcase,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    TrendingDown,
    Users,
    Target,
    AlertTriangle,
    Lightbulb,
    BarChart3,
    Activity,
    ArrowDown,
    ArrowRight,
    Building2,
    BellRing,
    ChevronRight,
    Award,
} from 'lucide-react';
import { analyticsAPI } from '@/lib/api';

const fetcher = () => analyticsAPI.getComprehensive().then((res) => res.data);

// Status mapping for display
const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    NEW_CALL: { label: 'New Call', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    JD_RECEIVED: { label: 'JD Received', color: 'text-violet-600', bg: 'bg-violet-100' },
    APPLIED: { label: 'Applied', color: 'text-sky-600', bg: 'bg-sky-100' },
    SHORTLISTED: { label: 'Shortlisted', color: 'text-teal-600', bg: 'bg-teal-100' },
    INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', color: 'text-amber-600', bg: 'bg-amber-100' },
    INTERVIEW_IN_PROGRESS: { label: 'Interview In Progress', color: 'text-orange-600', bg: 'bg-orange-100' },
    INTERVIEW_COMPLETED: { label: 'Interview Completed', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    OFFER: { label: 'Offer', color: 'text-green-600', bg: 'bg-green-100' },
    REJECTED: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' },
    ON_HOLD: { label: 'On Hold', color: 'text-gray-600', bg: 'bg-gray-100' },
};

// Glass card component
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 ${className}`}>
            {children}
        </div>
    );
}

// KPI Card Component
function KPICard({
    title,
    value,
    icon: Icon,
    color,
    trend,
    subtext,
}: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    subtext?: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600',
        purple: 'from-purple-500 to-purple-600',
        green: 'from-green-500 to-green-600',
        red: 'from-red-500 to-red-600',
        yellow: 'from-yellow-500 to-yellow-600',
        indigo: 'from-indigo-500 to-indigo-600',
    };

    return (
        <GlassCard className="p-6 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-slate-800">{value}</p>
                    {subtext && (
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            {trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                            {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                            {subtext}
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </GlassCard>
    );
}

// Funnel Visualization Component
function FunnelVisualization({
    data,
    biggestDrop,
}: {
    data: { stage: string; count: number; percentage: number }[];
    biggestDrop: { from: string; to: string; percentage: number };
}) {
    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const stageColors = [
        'from-blue-400 to-blue-500',
        'from-purple-400 to-purple-500',
        'from-amber-400 to-amber-500',
        'from-green-400 to-green-500',
    ];

    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Conversion Funnel</h3>
                {biggestDrop.percentage > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600 font-medium">
                            {biggestDrop.percentage}% drop: {biggestDrop.from} → {biggestDrop.to}
                        </span>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {data.map((item, index) => {
                    const width = (item.count / maxCount) * 100;
                    const dropFromPrev = index > 0 ? Math.round(((data[index - 1].count - item.count) / data[index - 1].count) * 100) : 0;

                    return (
                        <div key={item.stage} className="relative">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700">{item.stage}</span>
                                    {index > 0 && dropFromPrev > 10 && (
                                        <span className="text-xs text-red-500 flex items-center gap-0.5">
                                            <ArrowDown className="w-3 h-3" />
                                            {dropFromPrev}%
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800">{item.count}</span>
                                    <span className="text-xs text-slate-400">({item.percentage}%)</span>
                                </div>
                            </div>
                            <div className="h-10 bg-slate-100 rounded-lg overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${stageColors[index]} rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-3`}
                                    style={{ width: `${Math.max(width, 5)}%` }}
                                >
                                    {item.count > 0 && (
                                        <ArrowRight className="w-4 h-4 text-white/80" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}

// Activity Chart Component
function ActivityChart({
    data,
    period,
    onPeriodChange,
}: {
    data: { week: string; applications: number; interviews: number }[];
    period: string;
    onPeriodChange: (p: string) => void;
}) {
    const maxValue = Math.max(...data.map((d) => d.applications), 1);

    return (
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Activity Over Time</h3>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {['weekly', 'monthly'].map((p) => (
                        <button
                            key={p}
                            onClick={() => onPeriodChange(p)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                period === p
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {data.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400">
                    No activity data available
                </div>
            ) : (
                <div className="h-48 flex items-end gap-2">
                    {data.map((item, index) => {
                        const appHeight = (item.applications / maxValue) * 100;
                        const intHeight = (item.interviews / maxValue) * 100;

                        return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex gap-1 items-end h-40">
                                    <div
                                        className="flex-1 bg-gradient-to-t from-blue-400 to-blue-500 rounded-t-md transition-all hover:from-blue-500 hover:to-blue-600 relative group"
                                        style={{ height: `${Math.max(appHeight, 4)}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {item.applications} applications
                                        </div>
                                    </div>
                                    <div
                                        className="flex-1 bg-gradient-to-t from-purple-400 to-purple-500 rounded-t-md transition-all hover:from-purple-500 hover:to-purple-600 relative group"
                                        style={{ height: `${Math.max(intHeight, 4)}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {item.interviews} interviews
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-slate-400 truncate w-full text-center">
                                    {item.week.slice(5)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm text-slate-500">Applications</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                    <span className="text-sm text-slate-500">Interviews</span>
                </div>
            </div>
        </GlassCard>
    );
}

// Interview Performance Component
function InterviewPerformanceCard({
    data,
}: {
    data: {
        totalRoundsCompleted: number;
        applicationsWithInterview: number;
        avgRoundsPerApplication: number;
    };
}) {
    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Interview Performance</h3>

            <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-primary">{data.totalRoundsCompleted}</p>
                    <p className="text-sm text-slate-500 mt-1">Rounds Completed</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-purple-600">{data.applicationsWithInterview}</p>
                    <p className="text-sm text-slate-500 mt-1">Applications</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-3xl font-bold text-amber-600">{data.avgRoundsPerApplication}</p>
                    <p className="text-sm text-slate-500 mt-1">Avg Rounds</p>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">Interview Progress</span>
                    <span className="font-medium text-slate-800">{data.applicationsWithInterview} apps</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all"
                        style={{ width: `${Math.min(data.applicationsWithInterview * 10, 100)}%` }}
                    />
                </div>
            </div>
        </GlassCard>
    );
}

// Drop-off Analysis Component
function DropoffAnalysis({
    data,
}: {
    data: {
        noResponse: { count: number; percentage: number };
        interviewRejected: { count: number; percentage: number };
        atInterviewStage: { count: number; percentage: number };
    };
}) {
    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                Drop-off Analysis
            </h3>

            <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-700">No Response</span>
                        <span className="text-sm font-bold text-red-700">{data.noResponse.percentage}%</span>
                    </div>
                    <div className="h-2 bg-red-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${data.noResponse.percentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-red-600 mt-2">
                        {data.noResponse.count} applications didn't get a response
                    </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-orange-700">Interview → Rejected</span>
                        <span className="text-sm font-bold text-orange-700">{data.interviewRejected.percentage}%</span>
                    </div>
                    <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{ width: `${data.interviewRejected.percentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                        {data.interviewRejected.count} applications rejected after interview
                    </p>
                </div>

                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-700">Reaching Interview</span>
                        <span className="text-sm font-bold text-green-700">{data.atInterviewStage.percentage}%</span>
                    </div>
                    <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${data.atInterviewStage.percentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                        {data.atInterviewStage.count} applications reached interview stage
                    </p>
                </div>
            </div>
        </GlassCard>
    );
}

// Smart Insights Component
function SmartInsights({ insights }: { insights: { type: string; message: string; priority: string }[] }) {
    const priorityColors: Record<string, string> = {
        high: 'border-red-200 bg-red-50 text-red-700',
        medium: 'border-yellow-200 bg-yellow-50 text-yellow-700',
        low: 'border-blue-200 bg-blue-50 text-blue-700',
    };

    const typeIcons: Record<string, React.ElementType> = {
        activity: Activity,
        conversion: TrendingUp,
        funnel: BarChart3,
        followup: BellRing,
        rejection: XCircle,
        timing: Clock,
    };

    if (insights.length === 0) {
        return (
            <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Smart Insights
                </h3>
                <p className="text-slate-500 text-center py-4">No insights available yet. Keep tracking your applications!</p>
            </GlassCard>
        );
    }

    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Smart Insights
            </h3>

            <div className="space-y-3">
                {insights.map((insight, index) => {
                    const Icon = typeIcons[insight.type] || Lightbulb;
                    return (
                        <div
                            key={index}
                            className={`p-4 rounded-xl border ${priorityColors[insight.priority]} flex items-start gap-3`}
                        >
                            <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium">{insight.message}</p>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}

// Status Distribution Component
function StatusDistribution({ data }: { data: { status: string; count: number; percentage: number }[] }) {
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const colors = [
        'bg-indigo-500',
        'bg-violet-500',
        'bg-sky-500',
        'bg-teal-500',
        'bg-amber-500',
        'bg-emerald-500',
        'bg-green-500',
        'bg-red-500',
        'bg-gray-500',
    ];

    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Status Distribution</h3>

            <div className="flex items-center gap-8">
                {/* Donut Chart */}
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        {data.length > 0 ? (
                            data.map((item, index) => {
                                const startAngle = data
                                    .slice(0, index)
                                    .reduce((sum, d) => sum + (d.count / total) * 100, 0);
                                const strokeDasharray = `${(item.count / total) * 100} ${100 - (item.count / total) * 100}`;
                                const strokeDashoffset = -startAngle;

                                return (
                                    <circle
                                        key={item.status}
                                        cx="18"
                                        cy="18"
                                        r="15.9155"
                                        fill="none"
                                        stroke={colors[index % colors.length].replace('bg-', '')}
                                        strokeWidth="4"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-300 hover:opacity-80"
                                    />
                                );
                            })
                        ) : (
                            <circle
                                cx="18"
                                cy="18"
                                r="15.9155"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="4"
                            />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-slate-800">{total}</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                    {data.map((item, index) => (
                        <div key={item.status} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
                            <span className="text-sm text-slate-600 truncate">
                                {statusLabels[item.status]?.label || item.status}
                            </span>
                            <span className="text-xs text-slate-400 ml-auto">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </GlassCard>
    );
}

// Company Insights Component
function CompanyInsights({ companies }: { companies: { company: string; status: string; count: number }[] }) {
    const getStatusBadge = (status: string) => {
        const info = statusLabels[status];
        if (!info) return { label: status, className: 'bg-gray-100 text-gray-600' };
        return { label: info.label, className: `${info.bg} ${info.color}` };
    };

    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Company Insights
            </h3>

            {companies.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No company data available</p>
            ) : (
                <div className="space-y-3">
                    {companies.slice(0, 6).map((company, index) => {
                        const badge = getStatusBadge(company.status);
                        return (
                            <div
                                key={company.company}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                        {company.company.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{company.company}</p>
                                        <p className="text-xs text-slate-400">{company.count} application{company.count > 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                                    {badge.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </GlassCard>
    );
}

// Follow-up Effectiveness Component
function FollowupEffectiveness({ data }: { data: { applicationsWithFollowups: number; applicationsWithoutFollowups: number; followupToInterviewRate: number; noFollowupToInterviewRate: number; improvementPercentage: number } }) {
    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-green-500" />
                Follow-up Effectiveness
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                    <p className="text-2xl font-bold text-green-600">{data.applicationsWithFollowups}</p>
                    <p className="text-xs text-green-600 mt-1">With Follow-ups</p>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-bold text-slate-600">{data.applicationsWithoutFollowups}</p>
                    <p className="text-xs text-slate-500 mt-1">Without Follow-ups</p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-700">With Follow-ups → Interview</span>
                    <span className="font-bold text-green-700">{data.followupToInterviewRate}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-700">Without Follow-ups → Interview</span>
                    <span className="font-bold text-slate-700">{data.noFollowupToInterviewRate}%</span>
                </div>
            </div>

            {data.improvementPercentage > 0 && (
                <div className="mt-4 p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white text-center">
                    <p className="font-semibold">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        Follow-ups increased interview chances by {data.improvementPercentage}%
                    </p>
                </div>
            )}

            {data.improvementPercentage <= 0 && data.applicationsWithFollowups > 0 && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg text-amber-700 text-center text-sm">
                    Track more follow-ups to see their impact on your interview rate
                </div>
            )}
        </GlassCard>
    );
}

// Main Analytics Page
export default function AnalyticsPage() {
    const [period, setPeriod] = useState('monthly');
    const { data, error, isLoading } = useSWR('/api/analytics/comprehensive', fetcher);

    if (isLoading) {
        return (
            <div className="min-h-[600px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <GlassCard className="p-6">
                    <div className="flex items-center gap-3 text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                        <p>Failed to load analytics data. Please try again later.</p>
                    </div>
                </GlassCard>
            </div>
        );
    }

    const analytics = data?.data || {};
    const kpis = analytics.kpis || {};
    const funnel = analytics.funnel || { data: [], biggestDrop: {} };
    const statusDistribution = analytics.statusDistribution || [];
    const dropoff = analytics.dropoff || {};
    const companies = analytics.companies || [];
    const interviewPerformance = analytics.interviewPerformance || {};
    const followupEffectiveness = analytics.followupEffectiveness || {};
    const weeklyActivity = analytics.weeklyActivity || [];
    const insights = analytics.insights || [];

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
                    <p className="text-slate-500 mt-1">Track your job search performance and insights</p>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    title="Total Applications"
                    value={kpis.totalApplications || 0}
                    icon={Briefcase}
                    color="blue"
                    subtext="All time"
                />
                <KPICard
                    title="Interviews Scheduled"
                    value={kpis.interviewsScheduled || 0}
                    icon={Calendar}
                    color="purple"
                    subtext="Active"
                />
                <KPICard
                    title="Interviews Completed"
                    value={kpis.interviewsCompleted || 0}
                    icon={CheckCircle}
                    color="green"
                    subtext="All time"
                />
                <KPICard
                    title="Offers Received"
                    value={kpis.offers || 0}
                    icon={Award}
                    color="indigo"
                    subtext="Congratulations!"
                />
                <KPICard
                    title="Rejections"
                    value={kpis.rejections || 0}
                    icon={XCircle}
                    color="red"
                    subtext="Don't give up"
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Funnel - Spans 2 columns */}
                <div className="lg:col-span-2">
                    <FunnelVisualization data={funnel.data} biggestDrop={funnel.biggestDrop} />
                </div>

                {/* Status Distribution */}
                <div>
                    <StatusDistribution data={statusDistribution} />
                </div>
            </div>

            {/* Activity Chart */}
            <ActivityChart
                data={weeklyActivity}
                period={period}
                onPeriodChange={setPeriod}
            />

            {/* Second Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Interview Performance */}
                <InterviewPerformanceCard data={interviewPerformance} />

                {/* Follow-up Effectiveness */}
                <FollowupEffectiveness data={followupEffectiveness} />
            </div>

            {/* Third Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Drop-off Analysis */}
                <DropoffAnalysis data={dropoff} />

                {/* Smart Insights */}
                <SmartInsights insights={insights} />
            </div>

            {/* Company Insights */}
            <CompanyInsights companies={companies} />
        </div>
    );
}
