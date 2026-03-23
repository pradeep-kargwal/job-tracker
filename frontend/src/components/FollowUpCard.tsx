'use client';

import Link from 'next/link';
import { 
    Check, 
    Clock, 
    Trash2, 
    Edit3, 
    ExternalLink,
    AlertCircle,
    Bell
} from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from './StatusBadge';

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

interface FollowUpCardProps {
    followUp: FollowUp;
    onMarkComplete: (id: string) => void;
    onEdit?: (followUp: FollowUp) => void;
    onDelete: (id: string) => void;
    onSnooze?: (id: string, days: number) => void;
    showApplication?: boolean;
    isOverdue?: boolean;
}

const CONTEXT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    GENERAL: { label: 'General', color: 'text-gray-600', bg: 'bg-gray-100' },
    AFTER_INTERVIEW: { label: 'After Interview', color: 'text-blue-600', bg: 'bg-blue-100' },
    NO_RESPONSE: { label: 'No Response', color: 'text-orange-600', bg: 'bg-orange-100' },
    OFFER_DISCUSSION: { label: 'Offer Discussion', color: 'text-green-600', bg: 'bg-green-100' },
};

export function FollowUpCard({ 
    followUp, 
    onMarkComplete, 
    onEdit, 
    onDelete, 
    onSnooze,
    showApplication = true,
    isOverdue = false
}: FollowUpCardProps) {
    const [showActions, setShowActions] = useState(false);
    const isCompleted = followUp.computedStatus === 'COMPLETED';
    const isMissed = followUp.computedStatus === 'MISSED' || isOverdue;
    const isDue = followUp.computedStatus === 'DUE';
    const contextInfo = CONTEXT_LABELS[followUp.contextType] || CONTEXT_LABELS.GENERAL;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getRelativeDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return 'Due tomorrow';
        if (diffDays <= 7) return `In ${diffDays} days`;
        return formatDate(dateStr);
    };

    return (
        <div className={`
            p-4 rounded-xl border transition-all
            ${isCompleted ? 'bg-gray-50 border-gray-200 opacity-75' : ''}
            ${isMissed ? 'bg-red-50 border-red-300' : ''}
            ${isDue ? 'bg-orange-50 border-orange-300' : ''}
            ${followUp.computedStatus === 'UPCOMING' && !isCompleted ? 'bg-white border-gray-200 hover:border-gray-300' : ''}
        `}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className={`font-semibold text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {followUp.title}
                        </p>
                        <StatusBadge status={followUp.status} computedStatus={followUp.computedStatus} />
                    </div>
                    
                    {showApplication && followUp.application && (
                        <Link
                            href={`/dashboard/applications/${followUp.application.id}`}
                            className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
                        >
                            {followUp.application.hiringCompany || 'Unknown Company'}
                            {followUp.application.jobRole && (
                                <span className="text-text-secondary font-normal">• {followUp.application.jobRole}</span>
                            )}
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                    )}
                    
                    {followUp.description && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {followUp.description}
                        </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <span className={`text-xs flex items-center gap-1 ${
                            isMissed ? 'text-red-600 font-medium' : 
                            isDue ? 'text-orange-600 font-medium' : 'text-gray-500'
                        }`}>
                            {isMissed ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {getRelativeDate(followUp.followUpDate)}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded ${contextInfo.bg} ${contextInfo.color}`}>
                            {contextInfo.label}
                        </span>
                        {followUp.relatedRound && (
                            <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-600">
                                Round {followUp.relatedRound}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                    {!isCompleted && (
                        <>
                            <button
                                onClick={() => onMarkComplete(followUp.id)}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Mark Complete"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            {onSnooze && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowActions(!showActions)}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Snooze"
                                    >
                                        <Clock className="w-4 h-4" />
                                    </button>
                                    {showActions && (
                                        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                                            <button
                                                onClick={() => { onSnooze(followUp.id, 1); setShowActions(false); }}
                                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                <Clock className="w-3 h-3" />Snooze 1 day
                                            </button>
                                            <button
                                                onClick={() => { onSnooze(followUp.id, 2); setShowActions(false); }}
                                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                <Clock className="w-3 h-3" />Snooze 2 days
                                            </button>
                                            <button
                                                onClick={() => { onSnooze(followUp.id, 7); setShowActions(false); }}
                                                className="w-full px-3 py-2 text-left text-xs hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                <Clock className="w-3 h-3" />Snooze 1 week
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(followUp)}
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={() => onDelete(followUp.id)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
