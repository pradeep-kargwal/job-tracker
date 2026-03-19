'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
    Phone,
    Send,
    Calendar,
    Award,
    AlertCircle,
    ArrowRight,
    Clock,
    Kanban,
} from 'lucide-react';
import { analyticsAPI } from '@/lib/api';
import { formatRelativeTime, STATUS_LABELS } from '@/lib/utils';

const fetcher = (url: string) => analyticsAPI.getDashboard().then((res) => res.data);

export default function DashboardPage() {
    const { data, error, isLoading } = useSWR('/analytics/dashboard', fetcher);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                Failed to load dashboard data
            </div>
        );
    }

    const { stats, recentActivity } = data?.data || {};

    const statCards = [
        {
            name: 'Total Calls',
            value: stats?.totalCalls || 0,
            icon: Phone,
            color: 'bg-indigo-500',
        },
        {
            name: 'Applications Sent',
            value: stats?.applicationsSent || 0,
            icon: Send,
            color: 'bg-sky-500',
        },
        {
            name: 'Interviews Ongoing',
            value: stats?.interviewsOngoing || 0,
            icon: Calendar,
            color: 'bg-amber-500',
        },
        {
            name: 'Offers',
            value: stats?.offers || 0,
            icon: Award,
            color: 'bg-green-500',
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
                <p className="text-text-secondary">Track your job search progress</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.name}
                        className="bg-white rounded-xl shadow-card p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${stat.color}`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
                                <p className="text-sm text-text-secondary">{stat.name}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Alerts */}
            {(stats?.dueFollowups > 0 || stats?.upcomingInterviews > 0) && (
                <div className="flex flex-col sm:flex-row gap-4">
                    {stats?.dueFollowups > 0 && (
                        <Link
                            href="/dashboard/pipeline?tab=followups"
                            className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors"
                        >
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <div className="flex-1">
                                <p className="font-medium text-amber-800">
                                    {stats.dueFollowups} follow-up{stats.dueFollowups > 1 ? 's' : ''} due
                                </p>
                                <p className="text-sm text-amber-600">Click to view</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-amber-600" />
                        </Link>
                    )}
                    {stats?.upcomingInterviews > 0 && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div className="flex-1">
                                <p className="font-medium text-blue-800">
                                    {stats.upcomingInterviews} interview{stats.upcomingInterviews > 1 ? 's' : ''} this week
                                </p>
                                <p className="text-sm text-blue-600">Check your pipeline</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-card">
                <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
                </div>
                <div className="divide-y divide-border">
                    {recentActivity?.length > 0 ? (
                        recentActivity.map((activity: any) => (
                            <Link
                                key={activity.id}
                                href={`/dashboard/applications/${activity.id}`}
                                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-primary truncate">
                                        {activity.jobRole || 'Untitled Application'}
                                    </p>
                                    <p className="text-sm text-text-secondary truncate">
                                        {activity.hiringCompany || 'Unknown Company'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span
                                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full status-${activity.currentStatus.toLowerCase()}`}
                                    >
                                        {STATUS_LABELS[activity.currentStatus] || activity.currentStatus}
                                    </span>
                                    <p className="text-xs text-text-secondary mt-1">
                                        {formatRelativeTime(activity.updatedAt)}
                                    </p>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-text-secondary">No recent activity</p>
                            <Link
                                href="/dashboard/applications/new"
                                className="inline-flex items-center gap-2 mt-2 text-primary hover:underline"
                            >
                                Add your first application
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    href="/dashboard/applications/new"
                    className="flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl hover:bg-primary-dark transition-colors"
                >
                    <Send className="w-5 h-5" />
                    Add New Application
                </Link>
                <Link
                    href="/dashboard/pipeline"
                    className="flex items-center justify-center gap-2 bg-white border border-border text-text-primary py-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    <Kanban className="w-5 h-5" />
                    View Pipeline
                </Link>
            </div>
        </div>
    );
}
