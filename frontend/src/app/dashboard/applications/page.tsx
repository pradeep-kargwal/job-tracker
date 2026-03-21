'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
    Plus,
    Search,
    Trash2,
    Edit,
    Eye,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { applicationsAPI } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/utils';
import ApplicationQuickView from '@/components/ApplicationQuickView';

const ITEMS_PER_PAGE = 10;

export default function ApplicationsPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedApp, setSelectedApp] = useState<any>(null);

    const { data, error, mutate } = useSWR(
        [`/api/applications`, page, ITEMS_PER_PAGE],
        ([url, pageNum, limit]) => applicationsAPI.getAll({ page: pageNum, limit }).then((res) => res.data)
    );
    
    const applications = data?.data || [];
    const pagination = data?.pagination || { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 };

    // Client-side search and filter
    const filteredApplications = applications.filter((app: any) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            app.recruiterName?.toLowerCase().includes(searchLower) ||
            app.hiringCompany?.toLowerCase().includes(searchLower) ||
            app.jobRole?.toLowerCase().includes(searchLower) ||
            app.phone?.toLowerCase().includes(searchLower) ||
            app.email?.toLowerCase().includes(searchLower);
        const matchesStatus = !filterStatus || app.currentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this application?')) return;
        try {
            await applicationsAPI.delete(id);
            mutate();
        } catch (err) {
            alert('Failed to delete application');
        }
    };

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm, filterStatus]);

    // Helper to display tech stack
    const getTechStackDisplay = (techStack: any) => {
        if (!techStack) return '';
        if (Array.isArray(techStack)) {
            return techStack.slice(0, 50).join(', ');
        }
        return String(techStack).slice(0, 50);
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Applications</h1>
                <Link
                    href="/dashboard/applications/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                    <Plus className="w-5 h-5" />
                    New Application
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                >
                    <option value="">All Statuses</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                    Failed to load applications
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recruiter</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredApplications.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No applications found. Create your first application!
                                    </td>
                                </tr>
                            ) : (
                                filteredApplications.map((app: any) => (
                                    <tr key={app.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{app.jobRole || 'N/A'}</div>
                                            {app.techStack && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {getTechStackDisplay(app.techStack)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{app.hiringCompany || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            {app.recruiterName && (
                                                <div className="text-sm">
                                                    <div className="font-medium">{app.recruiterName}</div>
                                                    {app.recruiterCompany && (
                                                        <div className="text-xs text-gray-500">{app.recruiterCompany}</div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${app.currentStatus === 'OFFER' ? 'bg-green-100 text-green-800' :
                                                app.currentStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    app.currentStatus === 'INTERVIEW_SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                                                        app.currentStatus === 'SHORTLISTED' ? 'bg-purple-100 text-purple-800' :
                                                            app.currentStatus === 'APPLIED' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                }`}>
                                                {STATUS_LABELS[app.currentStatus] || app.currentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {app.applied ? (
                                                <span className="text-green-600">✓ {app.appliedDate ? new Date(app.appliedDate).toLocaleDateString() : 'Yes'}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{app.source || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setSelectedApp(app)}
                                                    className="p-1 text-gray-400 hover:text-primary"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <Link
                                                    href={`/dashboard/applications/new?id=${app.id}`}
                                                    className="p-1 text-gray-400 hover:text-primary"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(app.id)}
                                                    className="p-1 text-gray-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} applications
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={pagination.page <= 1}
                            className="p-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                let pageNum;
                                if (pagination.totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (pagination.page <= 3) {
                                    pageNum = i + 1;
                                } else if (pagination.page >= pagination.totalPages - 2) {
                                    pageNum = pagination.totalPages - 4 + i;
                                } else {
                                    pageNum = pagination.page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-10 h-10 rounded-lg ${
                                            pagination.page === pageNum
                                                ? 'bg-primary text-white'
                                                : 'border border-border hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Quick View Modal - Modern ApplicationQuickView Component */}
            {selectedApp && (
                <ApplicationQuickView 
                    application={selectedApp} 
                    onClose={() => setSelectedApp(null)} 
                />
            )}
        </div>
    );
}
