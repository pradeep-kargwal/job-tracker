'use client';

import useSWR from 'swr';
import {
    BarChart3,
    TrendingUp,
    Users,
    Briefcase,
    CheckCircle,
    XCircle,
    Clock,
    Filter
} from 'lucide-react';
import { analyticsAPI } from '@/lib/api';

const fetcher = () => analyticsAPI.getAnalytics().then((res) => res.data);

export default function AnalyticsPage() {
    const { data, error, isLoading } = useSWR('/api/analytics', fetcher);

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                    Failed to load analytics data
                </div>
            </div>
        );
    }

    const analytics = data?.data || {};
    const stats = analytics.stats || {};
    const funnel = analytics.conversionFunnel || [];
    const platformStats = analytics.platformStats || [];

    const statCards = [
        {
            name: 'Total Applications',
            value: stats.totalApplications || 0,
            icon: Briefcase,
            color: 'bg-blue-500',
        },
        {
            name: 'Total Recruiter Calls',
            value: stats.totalRecruiterCalls || 0,
            icon: Users,
            color: 'bg-purple-500',
        },
        {
            name: 'Interviews',
            value: stats.totalInterviews || 0,
            icon: Clock,
            color: 'bg-yellow-500',
        },
        {
            name: 'Offers Received',
            value: stats.totalOffers || 0,
            icon: CheckCircle,
            color: 'bg-green-500',
        },
    ];

    const funnelSteps = [
        { key: 'calls', label: 'Recruiter Calls', color: 'bg-purple-500' },
        { key: 'applications', label: 'Applications', color: 'bg-blue-500' },
        { key: 'interviews', label: 'Interviews', color: 'bg-yellow-500' },
        { key: 'offers', label: 'Offers', color: 'bg-green-500' },
    ];

    const maxValue = Math.max(...funnel.map((f: any) => f.count || 0), 1);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Analytics</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                    <div key={stat.name} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{stat.name}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.color}`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-lg font-semibold mb-6">Conversion Funnel</h2>
                <div className="space-y-4">
                    {funnelSteps.map((step, index) => {
                        const stepData = funnel.find((f: any) => f.status === step.key) || {};
                        const count = stepData.count || 0;
                        const percentage = ((count / maxValue) * 100).toFixed(1);

                        return (
                            <div key={step.key}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">{step.label}</span>
                                    <span className="text-sm text-gray-500">
                                        {count} ({percentage}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className={`${step.color} h-3 rounded-full transition-all`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Platform Stats */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-6">Platform Performance</h2>
                {platformStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No platform data available</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interviews</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offers</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {platformStats.map((platform: any) => (
                                    <tr key={platform.source} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{platform.source || 'Direct'}</td>
                                        <td className="px-4 py-3">{platform.total}</td>
                                        <td className="px-4 py-3">{platform.applied}</td>
                                        <td className="px-4 py-3">{platform.interviews}</td>
                                        <td className="px-4 py-3">{platform.offers}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${platform.successRate >= 50 ? 'bg-green-100 text-green-800' :
                                                    platform.successRate >= 20 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {platform.successRate.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
