'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
    Bell, 
    CheckCircle2, 
    AlertCircle, 
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    X,
    Check,
    MessageSquare
} from 'lucide-react';
import { followupsAPI } from '@/lib/api';
import { FollowUpCard } from '@/components/FollowUpCard';

interface FollowUp {
    id: string;
    applicationId: string;
    title: string;
    description: string | null;
    contextType: string;
    followUpDate: string;
    status: string;
    priority: string;
    relatedRound: number | null;
    computedStatus: string;
    history?: {
        id: string;
        actionDate: string;
        actionType: string;
        notes: string | null;
    }[];
    application: {
        id: string;
        hiringCompany: string | null;
        jobRole: string | null;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

type FilterStatus = 'all' | 'pending' | 'completed' | 'due_today' | 'overdue';

export default function FollowUpsPage() {
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
    const [page, setPage] = useState(1);
    const limit = 15;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        followUpDate: '',
    });
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateForm, setUpdateForm] = useState({ notes: '', newFollowUpDate: '' });
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [completeForm, setCompleteForm] = useState({ notes: '' });
    const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);

    const getFilterParams = () => {
        switch (statusFilter) {
            case 'pending':
                return { status: 'pending' };
            case 'completed':
                return { status: 'completed' };
            case 'due_today':
            case 'overdue':
                return { status: 'pending' };
            default:
                return {};
        }
    };

    const fetchFollowUps = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const params = {
                ...getFilterParams(),
                page,
                limit,
            };
            const res = await followupsAPI.getAllWithFilter(params);
            if (res.data.success) {
                setFollowUps(res.data.data.followUps);
                setPagination(res.data.data.pagination);
            } else {
                setError(res.data.message || 'Failed to load follow-ups');
            }
        } catch (err: any) {
            console.error('Error fetching follow-ups:', err);
            setError(err.message || 'Failed to load follow-ups');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, page]);

    useEffect(() => {
        fetchFollowUps();
    }, [fetchFollowUps]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    const refreshData = useCallback(async () => {
        setIsRefreshing(true);
        await fetchFollowUps();
        setIsRefreshing(false);
    }, [fetchFollowUps]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    const handleMarkComplete = async (id: string) => {
        try {
            await followupsAPI.markComplete(id);
            fetchFollowUps();
        } catch (err) {
            console.error('Error marking complete:', err);
        }
    };

    const handleSnooze = async (id: string, days: number) => {
        try {
            await followupsAPI.snooze(id, days);
            fetchFollowUps();
        } catch (err) {
            console.error('Error snoozing:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this follow-up?')) return;
        try {
            await followupsAPI.delete(id);
            fetchFollowUps();
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };

    const handleEdit = (followUp: FollowUp) => {
        setEditingFollowUp(followUp);
        setEditForm({
            title: followUp.title,
            description: followUp.description || '',
            followUpDate: followUp.followUpDate.split('T')[0],
        });
    };

    const handleUpdateFollowUp = async () => {
        if (!editingFollowUp) return;
        try {
            await followupsAPI.update(editingFollowUp.id, {
                title: editForm.title,
                description: editForm.description || undefined,
                followUpDate: editForm.followUpDate,
            });
            setEditingFollowUp(null);
            fetchFollowUps();
        } catch (err) {
            console.error('Error updating:', err);
        }
    };

    const handleAddUpdate = async () => {
        if (!selectedFollowUp) return;
        try {
            await followupsAPI.addUpdate(
                selectedFollowUp.id,
                updateForm.notes,
                updateForm.newFollowUpDate || undefined
            );
            setShowUpdateModal(false);
            setUpdateForm({ notes: '', newFollowUpDate: '' });
            setSelectedFollowUp(null);
            fetchFollowUps();
        } catch (err) {
            console.error('Error adding update:', err);
        }
    };

    const handleMarkCompleteWithNote = async () => {
        if (!selectedFollowUp) return;
        try {
            await followupsAPI.markCompleteWithNote(selectedFollowUp.id, completeForm.notes || undefined);
            setShowCompleteModal(false);
            setCompleteForm({ notes: '' });
            setSelectedFollowUp(null);
            fetchFollowUps();
        } catch (err) {
            console.error('Error marking complete:', err);
        }
    };

    const openUpdateModal = (followUp: FollowUp) => {
        setSelectedFollowUp(followUp);
        setUpdateForm({ notes: '', newFollowUpDate: '' });
        setShowUpdateModal(true);
    };

    const openCompleteModal = (followUp: FollowUp) => {
        setSelectedFollowUp(followUp);
        setCompleteForm({ notes: '' });
        setShowCompleteModal(true);
    };

    const openEditModal = (followUp: FollowUp) => {
        setEditingFollowUp(followUp);
        setEditForm({
            title: followUp.title,
            description: followUp.description || '',
            followUpDate: followUp.followUpDate.split('T')[0],
        });
    };

    const filteredFollowUps = followUps.filter((fu: FollowUp) => {
        if (statusFilter === 'due_today') return fu.computedStatus === 'DUE';
        if (statusFilter === 'overdue') return fu.computedStatus === 'MISSED';
        return true;
    });

    const pendingCount = followUps.filter((f: FollowUp) => f.computedStatus !== 'COMPLETED').length;
    const completedCount = followUps.filter((f: FollowUp) => f.computedStatus === 'COMPLETED').length;
    const dueTodayCount = followUps.filter((f: FollowUp) => f.computedStatus === 'DUE').length;
    const overdueCount = followUps.filter((f: FollowUp) => f.computedStatus === 'MISSED').length;

    const filters: { value: FilterStatus; label: string; count: number }[] = [
        { value: 'all', label: 'All', count: pagination?.total || 0 },
        { value: 'pending', label: 'Pending', count: pendingCount },
        { value: 'completed', label: 'Completed', count: completedCount },
        { value: 'due_today', label: 'Due Today', count: dueTodayCount },
        { value: 'overdue', label: 'Overdue', count: overdueCount },
    ];

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl">
                <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                        <p className="font-semibold">Failed to load follow-ups</p>
                        <p className="text-sm mt-1">Please try refreshing the page</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                        <Bell className="w-7 h-7" />
                        Follow-ups
                    </h1>
                    <p className="text-text-secondary mt-1">
                        Manage and track your follow-ups
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={refreshData}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <Link
                        href="/dashboard/applications"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        <Calendar className="w-4 h-4" />
                        Add Follow-up
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-text-secondary" />
                    <span className="text-sm font-medium text-text-secondary">Filter by status</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {filters.map((filter) => (
                        <button
                            key={filter.value}
                            onClick={() => setStatusFilter(filter.value)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                                ${statusFilter === filter.value 
                                    ? 'bg-primary text-white' 
                                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                                }
                            `}
                        >
                            {filter.label}
                            {filter.count > 0 && (
                                <span className={`
                                    px-2 py-0.5 rounded-full text-xs
                                    ${statusFilter === filter.value 
                                        ? 'bg-white/20 text-white' 
                                        : 'bg-gray-200 text-text-secondary'
                                    }
                                `}>
                                    {filter.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Follow-ups List */}
            <div className="bg-white rounded-xl border border-border overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-text-secondary mt-2">Loading follow-ups...</p>
                    </div>
                ) : filteredFollowUps.length > 0 ? (
                    <>
                        <div className="divide-y divide-border">
                            {filteredFollowUps.map((followUp) => (
                                <div key={followUp.id} className="p-4 hover:bg-gray-50">
                                    <FollowUpCard
                                        followUp={followUp}
                                        onMarkComplete={handleMarkComplete}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onSnooze={handleSnooze}
                                        onUpdate={() => openUpdateModal(followUp)}
                                        onMarkCompleteWithNote={() => openCompleteModal(followUp)}
                                        showApplication={true}
                                        isOverdue={followUp.computedStatus === 'MISSED'}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.pages > 1 && (
                            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                                <div className="text-sm text-text-secondary">
                                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={pagination.page === 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm text-text-secondary">
                                        Page {pagination.page} of {pagination.pages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                        disabled={pagination.page === pagination.pages}
                                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-12 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            No follow-ups found
                        </h3>
                        <p className="text-text-secondary mb-4">
                            {statusFilter === 'all' 
                                ? "You don't have any follow-ups yet." 
                                : `No ${statusFilter.replace('_', ' ')} follow-ups.`
                            }
                        </p>
                        <Link
                            href="/dashboard/applications"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            <Calendar className="w-4 h-4" />
                            Browse Applications
                        </Link>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingFollowUp && !showUpdateModal && !showCompleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setEditingFollowUp(null)} />
                    <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Edit Follow-up</h3>
                            <button
                                onClick={() => setEditingFollowUp(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={editForm.followUpDate}
                                    onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => setEditingFollowUp(null)}
                                    className="px-4 py-2 text-text-secondary hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateFollowUp}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Update Modal */}
            {showUpdateModal && selectedFollowUp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowUpdateModal(false)} />
                    <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Add Update</h3>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Update Note
                                </label>
                                <textarea
                                    value={updateForm.notes}
                                    onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                                    placeholder="What progress have you made?"
                                    rows={3}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Reschedule (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={updateForm.newFollowUpDate}
                                    onChange={(e) => setUpdateForm({ ...updateForm, newFollowUpDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-text-secondary mt-1">
                                    Leave empty to keep the current due date
                                </p>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => setShowUpdateModal(false)}
                                    className="px-4 py-2 text-text-secondary hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddUpdate}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                                >
                                    Add Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark Complete Modal */}
            {showCompleteModal && selectedFollowUp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCompleteModal(false)} />
                    <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Mark Complete</h3>
                            <button
                                onClick={() => setShowCompleteModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Completion Note (Optional)
                                </label>
                                <textarea
                                    value={completeForm.notes}
                                    onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                                    placeholder="How did it go?"
                                    rows={3}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => setShowCompleteModal(false)}
                                    className="px-4 py-2 text-text-secondary hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMarkCompleteWithNote}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Mark Complete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
