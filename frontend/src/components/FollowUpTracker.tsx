'use client';

import { useState, useEffect } from 'react';
import { 
    Bell, 
    Plus, 
    Check, 
    Clock, 
    AlertTriangle,
    Calendar,
    Trash2,
    Edit3,
    X,
    ChevronRight
} from 'lucide-react';
import { followupsAPI } from '@/lib/api';

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
    interviewProcessId: string | null;
    computedStatus: string;
    application: {
        id: string;
        hiringCompany: string | null;
        jobRole: string | null;
    };
}

interface FollowUpTrackerProps {
    applicationId: string;
    interviewProcessId?: string | null;
    currentRound?: number;
    onStatusChange?: () => void;
}

const CONTEXT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    GENERAL: { label: 'General', color: 'text-gray-600', bg: 'bg-gray-100' },
    AFTER_INTERVIEW: { label: 'After Interview', color: 'text-blue-600', bg: 'bg-blue-100' },
    NO_RESPONSE: { label: 'No Response', color: 'text-orange-600', bg: 'bg-orange-100' },
    OFFER_DISCUSSION: { label: 'Offer Discussion', color: 'text-green-600', bg: 'bg-green-100' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    LOW: { label: 'Low', color: 'text-gray-500' },
    MEDIUM: { label: 'Medium', color: 'text-yellow-600' },
    HIGH: { label: 'High', color: 'text-red-600' },
};

export default function FollowUpTracker({ 
    applicationId, 
    interviewProcessId, 
    currentRound,
    onStatusChange 
}: FollowUpTrackerProps) {
    console.log('FollowUpTracker received applicationId:', applicationId);
    
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        followUpDate: '',
        contextType: 'GENERAL',
        priority: 'MEDIUM',
        quickDays: 2, // Default to 2 days
    });

    useEffect(() => {
        fetchFollowUps();
    }, [applicationId]);

    const fetchFollowUps = async () => {
        try {
            const response = await followupsAPI.getByApplication(applicationId);
            if (response.data.success) {
                setFollowUps(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching follow-ups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!applicationId) {
            alert('Error: Application ID is missing');
            return;
        }
        
        try {
            console.log('Creating follow-up for application:', applicationId);
            const data = {
                title: formData.title,
                description: formData.description || undefined,
                followUpDate: formData.followUpDate,
                contextType: formData.contextType,
                priority: formData.priority,
                interviewProcessId: interviewProcessId || undefined,
                relatedRound: currentRound || undefined,
            };

            if (editingId) {
                await followupsAPI.update(editingId, data);
            } else {
                await followupsAPI.create(applicationId, data);
            }

            resetForm();
            fetchFollowUps();
            onStatusChange?.();
        } catch (error) {
            console.error('Error saving follow-up:', error);
            alert('Failed to save follow-up');
        }
    };

    const handleQuickAdd = async (days: number) => {
        if (!applicationId) {
            console.error('applicationId is missing');
            alert('Error: Application ID is missing');
            return;
        }
        
        const date = new Date();
        date.setDate(date.getDate() + days);
        
        const contextType = currentRound ? 'AFTER_INTERVIEW' : 'GENERAL';
        const title = currentRound 
            ? `Follow-up after Round ${currentRound}` 
            : 'General Follow-up';

        try {
            console.log('Creating quick follow-up for application:', applicationId);
            await followupsAPI.create(applicationId, {
                title,
                followUpDate: date.toISOString(),
                contextType,
                priority: 'MEDIUM',
                interviewProcessId: interviewProcessId || undefined,
                relatedRound: currentRound || undefined,
            });
            fetchFollowUps();
            onStatusChange?.();
        } catch (error) {
            console.error('Error creating quick follow-up:', error);
        }
    };

    const handleMarkComplete = async (id: string) => {
        try {
            await followupsAPI.markComplete(id);
            fetchFollowUps();
            onStatusChange?.();
        } catch (error) {
            console.error('Error marking complete:', error);
        }
    };

    const handleSnooze = async (id: string, days: number) => {
        try {
            await followupsAPI.snooze(id, days);
            fetchFollowUps();
            onStatusChange?.();
        } catch (error) {
            console.error('Error snoozing follow-up:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this follow-up?')) return;
        try {
            await followupsAPI.delete(id);
            fetchFollowUps();
            onStatusChange?.();
        } catch (error) {
            console.error('Error deleting follow-up:', error);
        }
    };

    const handleEdit = (followUp: FollowUp) => {
        setFormData({
            title: followUp.title,
            description: followUp.description || '',
            followUpDate: followUp.followUpDate.split('T')[0],
            contextType: followUp.contextType,
            priority: followUp.priority,
            quickDays: 2,
        });
        setEditingId(followUp.id);
        setShowAddForm(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            followUpDate: '',
            contextType: 'GENERAL',
            priority: 'MEDIUM',
            quickDays: 2,
        });
        setEditingId(null);
        setShowAddForm(false);
    };

    const getRelativeDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays <= 7) return `In ${diffDays} days`;
        return targetDate.toLocaleDateString();
    };

    // Ensure followUps is an array
    const safeFollowUps = Array.isArray(followUps) ? followUps : [];

    // Group follow-ups by computed status
    const dueToday = safeFollowUps.filter(f => f.computedStatus === 'DUE');
    const upcoming = safeFollowUps.filter(f => f.computedStatus === 'UPCOMING');
    const missed = safeFollowUps.filter(f => f.computedStatus === 'MISSED');
    const completed = safeFollowUps.filter(f => f.computedStatus === 'COMPLETED');

    if (loading) {
        return <div className="p-4 text-gray-500">Loading follow-ups...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header with Quick Add */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold">Follow-ups</h3>
                    <p className="text-sm text-gray-500">Track and manage your follow-ups</p>
                </div>
                <div className="flex gap-2">
                    {/* Quick Add Buttons */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleQuickAdd(1)}
                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            +1 day
                        </button>
                        <button
                            onClick={() => handleQuickAdd(2)}
                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            +2 days
                        </button>
                        <button
                            onClick={() => handleQuickAdd(3)}
                            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            +3 days
                        </button>
                    </div>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4" />
                        Add
                    </button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Follow-up title"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                            <input
                                type="date"
                                value={formData.followUpDate}
                                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Context</label>
                            <select
                                value={formData.contextType}
                                onChange={(e) => setFormData({ ...formData, contextType: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="GENERAL">General</option>
                                <option value="AFTER_INTERVIEW">After Interview</option>
                                <option value="NO_RESPONSE">No Response</option>
                                <option value="OFFER_DISCUSSION">Offer Discussion</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Additional details..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                        >
                            {editingId ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            )}

            {/* Due Today */}
            {dueToday.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-orange-600 flex items-center gap-1">
                        <Bell className="w-4 h-4" />
                        Due Today ({dueToday.length})
                    </h4>
                    <div className="space-y-2">
                        {dueToday.map(followUp => (
                            <FollowUpCard 
                                key={followUp.id} 
                                followUp={followUp}
                                onMarkComplete={handleMarkComplete}
                                onSnooze={handleSnooze}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                getRelativeDate={getRelativeDate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Missed */}
            {missed.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        Missed ({missed.length})
                    </h4>
                    <div className="space-y-2">
                        {missed.map(followUp => (
                            <FollowUpCard 
                                key={followUp.id} 
                                followUp={followUp}
                                onMarkComplete={handleMarkComplete}
                                onSnooze={handleSnooze}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                getRelativeDate={getRelativeDate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Upcoming ({upcoming.length})
                    </h4>
                    <div className="space-y-2">
                        {upcoming.map(followUp => (
                            <FollowUpCard 
                                key={followUp.id} 
                                followUp={followUp}
                                onMarkComplete={handleMarkComplete}
                                onSnooze={handleSnooze}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                getRelativeDate={getRelativeDate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Completed ({completed.length})
                    </h4>
                    <div className="space-y-2">
                        {completed.slice(0, 3).map(followUp => (
                            <FollowUpCard 
                                key={followUp.id} 
                                followUp={followUp}
                                onMarkComplete={handleMarkComplete}
                                onSnooze={handleSnooze}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                getRelativeDate={getRelativeDate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {followUps.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No follow-ups yet</p>
                    <p className="text-xs">Add a follow-up to track your communications</p>
                </div>
            )}
        </div>
    );
}

// Follow-up Card Component
function FollowUpCard({ 
    followUp, 
    onMarkComplete, 
    onSnooze, 
    onEdit, 
    onDelete,
    getRelativeDate 
}: {
    followUp: FollowUp;
    onMarkComplete: (id: string) => void;
    onSnooze: (id: string, days: number) => void;
    onEdit: (followUp: FollowUp) => void;
    onDelete: (id: string) => void;
    getRelativeDate: (date: string) => string;
}) {
    const [showActions, setShowActions] = useState(false);
    const isCompleted = followUp.computedStatus === 'COMPLETED';
    const isMissed = followUp.computedStatus === 'MISSED';
    const contextInfo = CONTEXT_LABELS[followUp.contextType] || CONTEXT_LABELS.GENERAL;
    const priorityInfo = PRIORITY_LABELS[followUp.priority] || PRIORITY_LABELS.MEDIUM;

    return (
        <div className={`
            p-3 rounded-lg border transition-all
            ${isCompleted ? 'bg-gray-50 border-gray-200 opacity-75' : ''}
            ${isMissed ? 'bg-red-50 border-red-200' : ''}
            ${followUp.computedStatus === 'DUE' ? 'bg-orange-50 border-orange-200' : ''}
            ${followUp.computedStatus === 'UPCOMING' ? 'bg-white border-border' : ''}
        `}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium text-sm ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                            {followUp.title}
                        </p>
                        <span className={`px-2 py-0.5 text-xs rounded ${contextInfo.bg} ${contextInfo.color}`}>
                            {contextInfo.label}
                        </span>
                        {followUp.relatedRound && (
                            <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-600">
                                Round {followUp.relatedRound}
                            </span>
                        )}
                    </div>
                    {followUp.application?.hiringCompany && (
                        <p className="text-xs text-gray-500 mt-1">
                            {followUp.application?.hiringCompany}
                        </p>
                    )}
                    {followUp.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {followUp.description}
                        </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs ${priorityInfo.color}`}>
                            {priorityInfo.label} priority
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getRelativeDate(followUp.followUpDate)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {!isCompleted && (
                        <>
                            <button
                                onClick={() => onMarkComplete(followUp.id)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Mark Complete"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowActions(!showActions)}
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Snooze"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                                {showActions && (
                                    <div className="absolute right-0 top-8 bg-white border border-border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                                        <button
                                            onClick={() => { onSnooze(followUp.id, 1); setShowActions(false); }}
                                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100"
                                        >
                                            Snooze 1 day
                                        </button>
                                        <button
                                            onClick={() => { onSnooze(followUp.id, 2); setShowActions(false); }}
                                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100"
                                        >
                                            Snooze 2 days
                                        </button>
                                        <button
                                            onClick={() => { onSnooze(followUp.id, 7); setShowActions(false); }}
                                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100"
                                        >
                                            Snooze 1 week
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => onEdit(followUp)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => onDelete(followUp.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
