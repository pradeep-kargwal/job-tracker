'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import Link from 'next/link';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
} from '@dnd-kit/core';
import { useEffect, useRef } from 'react';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    Plus, 
    Calendar, 
    Clock, 
    AlertTriangle, 
    CheckCircle, 
    XCircle,
    ChevronDown,
    ChevronUp,
    Filter,
    Search,
    X,
    Briefcase,
    Phone,
    Mail,
    TrendingUp,
    ArrowRight,
    Move
} from 'lucide-react';
import { applicationsAPI, interviewEventsAPI, followupsAPI } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/utils';

const STATUS_ORDER = [
    'NEW_CALL',
    'JD_RECEIVED',
    'APPLIED',
    'SHORTLISTED',
    'INTERVIEW_IN_PROGRESS',
    'OFFER',
    'REJECTED',
    'ON_HOLD',
    'GHOSTED',
];

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; indicator: string }> = {
    NEW_CALL: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', indicator: 'bg-slate-500' },
    JD_RECEIVED: { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700', indicator: 'bg-violet-500' },
    APPLIED: { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-700', indicator: 'bg-sky-500' },
    SHORTLISTED: { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700', indicator: 'bg-teal-500' },
    INTERVIEW_IN_PROGRESS: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', indicator: 'bg-amber-500' },
    OFFER: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', indicator: 'bg-green-500' },
    REJECTED: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', indicator: 'bg-red-500' },
    ON_HOLD: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', indicator: 'bg-gray-500' },
    GHOSTED: { bg: 'bg-zinc-100', border: 'border-zinc-400', text: 'text-zinc-700', indicator: 'bg-zinc-600' },
};

const fetcher = () => applicationsAPI.getPipeline().then((res) => res.data);

// Get interviews and followups for applications
async function getAppDetails(applications: any[]) {
    const appDetails: Record<string, { interviews: any[]; followups: any[] }> = {};
    
    for (const app of applications) {
        try {
            const [interviewsRes, followupsRes] = await Promise.all([
                interviewEventsAPI.getByApplication(app.id),
                followupsAPI.getByApplication(app.id)
            ]);
            appDetails[app.id] = {
                interviews: interviewsRes.data.data || [],
                followups: followupsRes.data.data || []
            };
        } catch {
            appDetails[app.id] = { interviews: [], followups: [] };
        }
    }
    return appDetails;
}

interface KanbanCardProps {
    application: any;
    appDetails: Record<string, { interviews: any[]; followups: any[] }>;
    onClick: () => void;
    onAddInterview: () => void;
    onAddFollowup: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onMoveCard: (appId: string, newStatus: string) => void;
}

function KanbanCard({ application, appDetails, onClick, onAddInterview, onAddFollowup, isExpanded, onToggleExpand, onMoveCard }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: application.id });

    const [showMoveModal, setShowMoveModal] = useState(false);
    const [movingTo, setMovingTo] = useState<string | null>(null);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const { interviews, followups } = appDetails[application.id] || { interviews: [], followups: [] };
    const completedInterviews = interviews.filter((i: any) => i.status === 'COMPLETED');
    const upcomingInterviews = interviews.filter((i: any) => i.status === 'SCHEDULED');
    const dueFollowups = followups.filter((f: any) => f.status === 'DUE' || f.status === 'UPCOMING');
    
    // Check for overdue followups
    const overdueFollowups = dueFollowups.filter((f: any) => new Date(f.followUpDate) < new Date());
    const todayFollowups = dueFollowups.filter((f: any) => {
        const date = new Date(f.followUpDate);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    });

    // Check if interview today
    const todayInterviews = upcomingInterviews.filter((i: any) => {
        const date = new Date(i.date);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    });

    const hasUrgentItems = overdueFollowups.length > 0 || todayFollowups.length > 0 || todayInterviews.length > 0;

    // Check for stale applications (no activity for 7+ days)
    const lastActivityDate = application.lastActivityDate ? new Date(application.lastActivityDate) : application.createdAt ? new Date(application.createdAt) : null;
    const daysSinceActivity = lastActivityDate ? Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const isStale = daysSinceActivity !== null && daysSinceActivity >= 7 && !['REJECTED', 'OFFER'].includes(application.currentStatus);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`kanban-card ${isDragging ? 'dragging opacity-50' : ''} ${hasUrgentItems ? 'ring-2 ring-red-400' : ''}`}
        >
            {/* Card Header */}
            <div {...attributes} {...listeners} onClick={onClick} className="cursor-grab">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm truncate">
                            {application.jobRole || 'Untitled'}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                            {application.hiringCompany || 'Unknown Company'}
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {/* Status Badge */}
                <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[application.currentStatus]?.bg || 'bg-gray-100'} ${STATUS_COLORS[application.currentStatus]?.text || 'text-gray-700'}`}>
                        {STATUS_LABELS[application.currentStatus] || application.currentStatus}
                    </span>
                </div>
            </div>

            {/* Move Button - always visible */}
            <div className="mt-2 pt-2 border-t border-gray-100">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMoveModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-xs font-medium hover:bg-indigo-100 transition-colors"
                    aria-label={`Move ${application.jobRole || 'application'} to another stage`}
                >
                    <Move className="w-3.5 h-3.5" />
                    Move
                </button>
            </div>

            {/* Interview/Follow-up Context */}
            {application.currentStatus === 'INTERVIEW_IN_PROGRESS' && (
                <div className="mt-2 space-y-1">
                    {completedInterviews.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            Round {completedInterviews.length} Completed
                        </div>
                    )}
                    {upcomingInterviews.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                            <Clock className="w-3 h-3" />
                            Round {upcomingInterviews[0].roundNumber} - {new Date(upcomingInterviews[0].date).toLocaleDateString()}
                        </div>
                    )}
                    {upcomingInterviews.length === 0 && completedInterviews.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            Next round not scheduled
                        </div>
                    )}
                </div>
            )}

            {/* Follow-up indicators */}
            {dueFollowups.length > 0 && (
                <div className="mt-2 space-y-1">
                    {overdueFollowups.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            {overdueFollowups.length} overdue follow-up{overdueFollowups.length > 1 ? 's' : ''}
                        </div>
                    )}
                    {todayFollowups.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                            <Clock className="w-3 h-3" />
                            Follow-up due today!
                        </div>
                    )}
                    {dueFollowups.length > 0 && overdueFollowups.length === 0 && todayFollowups.length === 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                            <Clock className="w-3 h-3" />
                            Follow-up in {Math.ceil((new Date(dueFollowups[0].followUpDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                        </div>
                    )}
                </div>
            )}

            {/* Urgent Interview Today */}
            {todayInterviews.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-medium animate-pulse">
                    <Calendar className="w-3 h-3" />
                    Interview TODAY!
                </div>
            )}

            {/* Stale application indicator - no response for 7+ days */}
            {isStale && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    No response for {daysSinceActivity} days
                </div>
            )}

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* Quick Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={onAddInterview}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100"
                        >
                            <Calendar className="w-3 h-3" />
                            Add Interview
                        </button>
                        <button
                            onClick={onAddFollowup}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-50 text-amber-600 rounded text-xs font-medium hover:bg-amber-100"
                        >
                            <Clock className="w-3 h-3" />
                            Add Follow-up
                        </button>
                    </div>

                    {/* Recruiter Info */}
                    {(application.recruiterName || application.phone || application.email) && (
                        <div className="space-y-1 text-xs">
                            {application.recruiterName && (
                                <div className="flex items-center gap-1 text-gray-600">
                                    <Briefcase className="w-3 h-3" />
                                    {application.recruiterName}
                                </div>
                            )}
                            {application.phone && (
                                <div className="flex items-center gap-1 text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    {application.phone}
                                </div>
                            )}
                            {application.email && (
                                <div className="flex items-center gap-1 text-gray-600 truncate">
                                    <Mail className="w-3 h-3" />
                                    {application.email}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interview Timeline */}
                    {interviews.length > 0 && (
                        <div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Interview Timeline</div>
                            <div className="space-y-1">
                                {interviews.slice(0, 3).map((interview: any) => (
                                    <div key={interview.id} className="flex items-center gap-2 text-xs">
                                        {interview.status === 'COMPLETED' ? (
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                        ) : interview.status === 'SCHEDULED' ? (
                                            <Clock className="w-3 h-3 text-blue-500" />
                                        ) : (
                                            <XCircle className="w-3 h-3 text-gray-400" />
                                        )}
                                        <span className="text-gray-600">
                                            Round {interview.roundNumber} - {new Date(interview.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* View Full Details Link */}
                    <Link
                        href={`/dashboard/applications/${application.id}`}
                        className="block text-center text-xs text-primary hover:underline"
                    >
                        View Full Details →
                    </Link>
                </div>
            )}

            {/* Move Stage Modal */}
            {showMoveModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="move-modal-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowMoveModal(false);
                    }}
                >
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 id="move-modal-title" className="text-sm font-semibold text-gray-900">
                                    Move to Stage
                                </h3>
                                <button
                                    onClick={() => setShowMoveModal(false)}
                                    className="p-1 hover:bg-gray-100 rounded-full"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {application.jobRole || 'Untitled'} at {application.hiringCompany || 'Unknown Company'}
                            </p>
                        </div>
                        <div className="p-2 max-h-64 overflow-y-auto">
                            {STATUS_ORDER.map((status) => {
                                const isCurrentStatus = status === application.currentStatus;
                                const isMoving = movingTo === status;
                                return (
                                    <button
                                        key={status}
                                        disabled={isCurrentStatus || !!movingTo}
                                        onClick={() => {
                                            setMovingTo(status);
                                            onMoveCard(application.id, status);
                                            setShowMoveModal(false);
                                            setMovingTo(null);
                                        }}
                                        className={`
                                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors
                                            ${isCurrentStatus
                                                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                : isMoving
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'hover:bg-indigo-50 text-gray-700 hover:text-indigo-700'
                                            }
                                        `}
                                        role="option"
                                        aria-selected={isCurrentStatus}
                                        aria-label={`Move to ${STATUS_LABELS[status] || status}${isCurrentStatus ? ' (current stage)' : ''}`}
                                    >
                                        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]?.indicator || 'bg-gray-400'}`} />
                                        <span className="flex-1 font-medium">
                                            {STATUS_LABELS[status] || status}
                                        </span>
                                        {isCurrentStatus && (
                                            <span className="text-xs text-gray-400">Current</span>
                                        )}
                                        {!isCurrentStatus && (
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                        )}
                                        {isMoving && (
                                            <span className="text-xs text-indigo-600">Moving...</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface KanbanColumnProps {
    status: string;
    applications: any[];
    appDetails: Record<string, { interviews: any[]; followups: any[] }>;
    onCardClick: (id: string) => void;
    onAddInterview: (appId: string) => void;
    onAddFollowup: (appId: string) => void;
    expandedCards: Set<string>;
    onToggleExpand: (id: string) => void;
    onMoveCard: (appId: string, newStatus: string) => void;
}

function KanbanColumn({ status, applications, appDetails, onCardClick, onAddInterview, onAddFollowup, expandedCards, onToggleExpand, onMoveCard }: KanbanColumnProps) {
    const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', indicator: 'bg-gray-500' };

    return (
        <div className="flex-shrink-0 w-72">
            <div className={`p-3 rounded-t-lg border-b-2 ${colors.bg} ${colors.border}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${colors.indicator}`} />
                        <h3 className={`font-semibold text-sm ${colors.text}`}>
                            {STATUS_LABELS[status] || status}
                        </h3>
                    </div>
                    <span className="text-xs bg-white px-2 py-1 rounded-full font-medium">
                        {applications.length}
                    </span>
                </div>
            </div>
            <div className={`${colors.bg} p-2 rounded-b-lg min-h-[300px] max-h-[70vh] overflow-y-auto`}>
                <SortableContext
                    items={applications.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {applications.map((app) => (
                            <KanbanCard
                                key={app.id}
                                application={app}
                                appDetails={appDetails}
                                onClick={() => onCardClick(app.id)}
                                onAddInterview={() => onAddInterview(app.id)}
                                onAddFollowup={() => onAddFollowup(app.id)}
                                isExpanded={expandedCards.has(app.id)}
                                onToggleExpand={() => onToggleExpand(app.id)}
                                onMoveCard={onMoveCard}
                            />
                        ))}
                    </div>
                </SortableContext>
                {applications.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No applications
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PipelinePage() {
    const { data, isLoading } = useSWR('/pipeline', fetcher);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [appDetails, setAppDetails] = useState<Record<string, { interviews: any[]; followups: any[] }>>({});
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyActive, setShowOnlyActive] = useState(false);
    const [showOnlyWithInterviews, setShowOnlyWithInterviews] = useState(false);
    
    // Modals
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [pendingApp, setPendingApp] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');
    
    // Quick add modals
    const [showAddInterview, setShowAddInterview] = useState(false);
    const [showAddFollowup, setShowAddFollowup] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [newInterview, setNewInterview] = useState({ date: '', startTime: '', notes: '' });
    const [newFollowup, setNewFollowup] = useState({ followUpDate: '', description: '', priority: 'MEDIUM' });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Auto-scroll container ref
    const boardRef = useRef<HTMLDivElement>(null);

    // Handle auto-scroll when dragging near edges
    useEffect(() => {
        if (!activeId) return;

        const handleMouseMove = (e: MouseEvent) => {
            const board = boardRef.current;
            if (!board) return;

            const rect = board.getBoundingClientRect();
            const scrollSpeed = 10;
            const edgeThreshold = 50;

            // Check if near left edge
            if (e.clientX < rect.left + edgeThreshold) {
                board.scrollBy({ left: -scrollSpeed, behavior: 'auto' });
            }
            // Check if near right edge
            if (e.clientX > rect.right - edgeThreshold) {
                board.scrollBy({ left: scrollSpeed, behavior: 'auto' });
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [activeId]);

    // Get active application for drag overlay
    const activeApplication = activeId ? Object.values(data?.data || {}).flat().find((a: any) => a.id === activeId) as any : null;

    // Load app details when data changes
    useMemo(() => {
        if (data?.data) {
            const allApps = Object.values(data.data).flat() as any[];
            if (allApps.length > 0) {
                getAppDetails(allApps).then(setAppDetails);
            }
        }
    }, [data]);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeApp = Object.values(data?.data || {})
            .flat()
            .find((a: any) => a.id === active.id) as any;

        if (!activeApp) return;

        // Find new status
        let newStatus: string | null = null;
        for (const status of STATUS_ORDER) {
            const apps = data?.data?.[status] || [];
            if (apps.some((a: any) => a.id === over.id)) {
                newStatus = status;
                break;
            }
        }

        // If dropped on empty column
        if (!newStatus) {
            const overElement = document.elementFromPoint(
                (event.activatorEvent as MouseEvent).clientX,
                (event.activatorEvent as MouseEvent).clientY
            );
            const columnHeader = overElement?.closest('[data-status]');
            newStatus = columnHeader?.getAttribute('data-status') ?? null;
        }

        if (newStatus && newStatus !== activeApp.currentStatus) {
            // Show confirmation for specific statuses
            if (newStatus === 'INTERVIEW_IN_PROGRESS') {
                setPendingStatus(newStatus);
                setPendingApp(activeApp);
                setShowStatusModal(true);
                return;
            }
            
            if (newStatus === 'OFFER') {
                if (confirm('Mark this as Offer Received?')) {
                    await updateStatus(activeApp.id, newStatus);
                }
                return;
            }
            
            if (newStatus === 'REJECTED') {
                setPendingStatus(newStatus);
                setPendingApp(activeApp);
                setShowStatusModal(true);
                return;
            }

            await updateStatus(activeApp.id, newStatus);
        }
    };

    const handleMoveFromButton = async (appId: string, newStatus: string) => {
        const activeApp = Object.values(data?.data || {})
            .flat()
            .find((a: any) => a.id === appId) as any;

        if (!activeApp || newStatus === activeApp.currentStatus) return;

        // Show confirmation for specific statuses
        if (newStatus === 'INTERVIEW_IN_PROGRESS') {
            setPendingStatus(newStatus);
            setPendingApp(activeApp);
            setShowStatusModal(true);
            return;
        }

        if (newStatus === 'OFFER') {
            if (confirm('Mark this as Offer Received?')) {
                await updateStatus(appId, newStatus);
            }
            return;
        }

        if (newStatus === 'REJECTED') {
            setPendingStatus(newStatus);
            setPendingApp(activeApp);
            setShowStatusModal(true);
            return;
        }

        await updateStatus(appId, newStatus);
    };

    const updateStatus = async (appId: string, status: string, reason?: string) => {
        const previousData = data?.data;
        
        // Optimistic update
        mutate(
            '/pipeline',
            (currentData: any) => {
                if (!currentData?.data) return currentData;
                
                const newData = { ...currentData.data };
                
                // Find and remove from current status
                for (const s of Object.keys(newData)) {
                    const idx = newData[s]?.findIndex((a: any) => a.id === appId);
                    if (idx !== undefined && idx >= 0) {
                        const [app] = newData[s].splice(idx, 1);
                        // Add to new status
                        if (!newData[status]) newData[status] = [];
                        newData[status] = [...newData[status], { ...app, currentStatus: status }];
                        break;
                    }
                }
                
                return { ...currentData, data: newData };
            },
            false
        );

        try {
            await applicationsAPI.updateStatus(appId, { currentStatus: status });
            if (reason) {
                // Could optionally create a note with the rejection reason
            }
            mutate('/pipeline');
        } catch (error) {
            console.error('Failed to update status:', error);
            // Rollback on error
            mutate('/pipeline', previousData, false);
            alert('Failed to move application. Please try again.');
        }
    };

    const handleConfirmStatus = async () => {
        if (!pendingApp || !pendingStatus) return;

        if (pendingStatus === 'REJECTED' && rejectReason) {
            // Could save rejectReason as a note
        }

        await updateStatus(pendingApp.id, pendingStatus, rejectReason);
        
        setShowStatusModal(false);
        setPendingStatus(null);
        setPendingApp(null);
        setRejectReason('');
    };

    const handleAddInterview = async () => {
        if (!selectedAppId || !newInterview.date) return;
        
        try {
            await interviewEventsAPI.create({
                applicationId: selectedAppId,
                date: newInterview.date,
                startTime: newInterview.startTime || undefined,
                notes: newInterview.notes || undefined,
                createdFrom: 'APPLICATION_PAGE'
            });
            
            // Refresh details
            const appIds = Object.keys(appDetails);
            const updatedDetails = await getAppDetails(appIds.map(id => ({ id })));
            setAppDetails(updatedDetails);
            
            setShowAddInterview(false);
            setSelectedAppId(null);
            setNewInterview({ date: '', startTime: '', notes: '' });
        } catch (error) {
            console.error('Failed to add interview:', error);
        }
    };

    const handleAddFollowup = async () => {
        if (!selectedAppId || !newFollowup.followUpDate) return;
        
        try {
            await followupsAPI.create(selectedAppId, {
                title: newFollowup.description || 'Follow-up',
                description: newFollowup.description,
                followUpDate: newFollowup.followUpDate,
                priority: newFollowup.priority
            });
            
            // Refresh details
            const appIds = Object.keys(appDetails);
            const updatedDetails = await getAppDetails(appIds.map(id => ({ id })));
            setAppDetails(updatedDetails);
            
            setShowAddFollowup(false);
            setSelectedAppId(null);
            setNewFollowup({ followUpDate: '', description: '', priority: 'MEDIUM' });
        } catch (error) {
            console.error('Failed to add followup:', error);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Filter applications
    const filteredPipeline = useMemo(() => {
        const pipeline = data?.data || {};
        
        if (!searchQuery && !showOnlyActive && !showOnlyWithInterviews) {
            return pipeline;
        }

        const filtered: Record<string, any[]> = {};
        
        for (const [status, apps] of Object.entries(pipeline)) {
            let filteredApps = apps as any[];
            
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filteredApps = filteredApps.filter(app =>
                    app.jobRole?.toLowerCase().includes(query) ||
                    app.hiringCompany?.toLowerCase().includes(query) ||
                    app.recruiterName?.toLowerCase().includes(query)
                );
            }
            
            // Active filter
            if (showOnlyActive) {
                filteredApps = filteredApps.filter(app => 
                    !['REJECTED', 'OFFER'].includes(app.currentStatus)
                );
            }
            
            // Interview filter
            if (showOnlyWithInterviews) {
                filteredApps = filteredApps.filter(app => 
                    appDetails[app.id]?.interviews?.length > 0
                );
            }
            
            filtered[status] = filteredApps;
        }
        
        return filtered;
    }, [data?.data, searchQuery, showOnlyActive, showOnlyWithInterviews, appDetails]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
                    <p className="text-gray-500 text-sm">Drag cards to update status</p>
                </div>
                <Link
                    href="/dashboard/applications/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                    <Plus className="w-4 h-4" />
                    Add Application
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg shadow-sm">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showOnlyActive}
                        onChange={(e) => setShowOnlyActive(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                    />
                    <span>Active only</span>
                </label>
                
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showOnlyWithInterviews}
                        onChange={(e) => setShowOnlyWithInterviews(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                    />
                    <span>With interviews</span>
                </label>

                {(searchQuery || showOnlyActive || showOnlyWithInterviews) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setShowOnlyActive(false);
                            setShowOnlyWithInterviews(false);
                        }}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-4 h-4" />
                        Clear
                    </button>
                )}
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4" ref={boardRef}>
                    {STATUS_ORDER.map((status) => (
                        <div key={status} data-status={status}>
                            <KanbanColumn
                                status={status}
                                applications={filteredPipeline[status] || []}
                                appDetails={appDetails}
                                onCardClick={(id) => window.location.href = `/dashboard/applications/${id}`}
                                onAddInterview={(appId) => {
                                    setSelectedAppId(appId);
                                    setShowAddInterview(true);
                                }}
                                onAddFollowup={(appId) => {
                                    setSelectedAppId(appId);
                                    setShowAddFollowup(true);
                                }}
                                expandedCards={expandedCards}
                                onToggleExpand={toggleExpand}
                                onMoveCard={handleMoveFromButton}
                            />
                        </div>
                    ))}
                </div>
                <DragOverlay>
                    {activeApplication && (
                        <div className="kanban-card opacity-90 rotate-2 shadow-2xl scale-105 bg-white">
                            <div className="font-semibold text-gray-900 text-sm">
                                {activeApplication.jobRole || 'Untitled'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {activeApplication.hiringCompany || 'Unknown Company'}
                            </div>
                            <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[activeApplication.currentStatus]?.bg || 'bg-gray-100'} ${STATUS_COLORS[activeApplication.currentStatus]?.text || 'text-gray-700'}`}>
                                    {STATUS_LABELS[activeApplication.currentStatus] || activeApplication.currentStatus}
                                </span>
                            </div>
                        </div>
                    )}
                </DragOverlay>
            </DndContext>

            {/* Status Confirmation Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        {pendingStatus === 'INTERVIEW_IN_PROGRESS' ? (
                            <>
                                <h3 className="text-lg font-semibold mb-2">Move to Interview Stage?</h3>
                                <p className="text-gray-600 mb-4">
                                    Would you like to schedule an interview for this application?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleConfirmStatus}
                                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowStatusModal(false);
                                            setSelectedAppId(pendingApp?.id);
                                            setShowAddInterview(true);
                                        }}
                                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                    >
                                        Add Interview
                                    </button>
                                </div>
                            </>
                        ) : pendingStatus === 'REJECTED' ? (
                            <>
                                <h3 className="text-lg font-semibold mb-2">Mark as Rejected?</h3>
                                <p className="text-gray-600 mb-4">
                                    Add an optional reason for rejection (saved as a note)
                                </p>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Reason for rejection (optional)"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
                                    rows={3}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowStatusModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmStatus}
                                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    >
                                        Confirm Reject
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Add Interview Modal */}
            {showAddInterview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold mb-4">Schedule Interview</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    value={newInterview.date}
                                    onChange={(e) => setNewInterview({ ...newInterview, date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    value={newInterview.startTime}
                                    onChange={(e) => setNewInterview({ ...newInterview, startTime: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={newInterview.notes}
                                    onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
                                    placeholder="Interview focus, preparation notes..."
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    rows={2}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddInterview(false);
                                    setSelectedAppId(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddInterview}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                            >
                                Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Follow-up Modal */}
            {showAddFollowup && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold mb-4">Add Follow-up</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    value={newFollowup.followUpDate}
                                    onChange={(e) => setNewFollowup({ ...newFollowup, followUpDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newFollowup.description}
                                    onChange={(e) => setNewFollowup({ ...newFollowup, description: e.target.value })}
                                    placeholder="What to follow up about?"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    value={newFollowup.priority}
                                    onChange={(e) => setNewFollowup({ ...newFollowup, priority: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddFollowup(false);
                                    setSelectedAppId(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddFollowup}
                                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                            >
                                Add Follow-up
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
