'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
    ArrowLeft,
    Trash2,
    Clock,
    MessageSquare,
    Calendar,
    Edit,
    Upload,
    FileText,
    Check,
    X,
    Plus,
    User,
    Briefcase,
    Mail,
    Phone,
    ExternalLink,
    ChevronRight,
    ChevronLeft,
    Activity,
    AlertCircle,
    CheckCircle2,
    Circle,
    Bell,
    Lightbulb,
    Target,
    TrendingUp,
    Building2,
    Users,
    PanelRightClose,
    PanelRightOpen,
} from 'lucide-react';
import { applicationsAPI, notesAPI, interviewsAPI, followupsAPI, interviewEventsAPI } from '@/lib/api';
import { STATUS_LABELS, SOURCE_LABELS, formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const fetcher = (id: string) => applicationsAPI.getById(id).then((res) => res.data.data);

// Pipeline stages in order
const PIPELINE_STAGES = [
    { key: 'NEW_CALL', label: 'New', color: 'bg-gray-100' },
    { key: 'JD_RECEIVED', label: 'JD Received', color: 'bg-blue-100' },
    { key: 'APPLIED', label: 'Applied', color: 'bg-yellow-100' },
    { key: 'SHORTLISTED', label: 'Shortlisted', color: 'bg-purple-100' },
    { key: 'INTERVIEW_IN_PROGRESS', label: 'Interview', color: 'bg-indigo-100' },
    { key: 'INTERVIEW_SCHEDULED', label: 'Interview Scheduled', color: 'bg-cyan-100' },
    { key: 'INTERVIEW_COMPLETED', label: 'Interview Completed', color: 'bg-teal-100' },
    { key: 'OFFER', label: 'Offer', color: 'bg-green-100' },
    { key: 'REJECTED', label: 'Rejected', color: 'bg-red-100' },
    { key: 'ON_HOLD', label: 'On Hold', color: 'bg-orange-100' },
    { key: 'GHOSTED', label: 'Ghosted', color: 'bg-zinc-200' },
];

export default function ApplicationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    const { data, error, mutate } = useSWR(id ? `/api/applications/${id}` : null, () => fetcher(id));

    // Initialize jdText when data loads
    useEffect(() => {
        if (data?.jdText) {
            setJdText(data.jdText);
        }
    }, [data]);

    // Load interview events and next round number
    useEffect(() => {
        if (id) {
            loadInterviewEvents();
        }
    }, [id]);

    // Refresh data when page becomes visible (e.g., after navigating back from create page)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && id) {
                // Refresh SWR data when page becomes visible
                mutate();
                loadInterviewEvents();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [id, mutate]);

    const loadInterviewEvents = async () => {
        try {
            setLoadingEvents(true);
            const [eventsRes, roundRes] = await Promise.all([
                interviewEventsAPI.getByApplication(id),
                interviewEventsAPI.getNextRound(id)
            ]);
            setInterviewEvents(eventsRes.data.data || []);
            setNextRound(roundRes.data.data?.nextRound || 1);
        } catch (err) {
            console.error('Failed to load interview events:', err);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleAddInterviewEvent = async () => {
        if (!newEvent.date) {
            alert('Please select a date');
            return;
        }
        setConflictError('');
        try {
            const response = await interviewEventsAPI.create({
                applicationId: id,
                roundNumber: nextRound,
                date: newEvent.date,
                startTime: newEvent.startTime || undefined,
                endTime: newEvent.endTime || undefined,
                notes: newEvent.notes || undefined,
                createdFrom: 'APPLICATION_PAGE'
            });
            
            if (response.data.conflict) {
                setConflictError('You already have an interview at this time!');
                return;
            }
            
            setNewEvent({ date: '', startTime: '', endTime: '', notes: '' });
            setShowAddEvent(false);
            loadInterviewEvents();
        } catch (err: any) {
            if (err.response?.data?.conflict) {
                setConflictError(err.response.data.message);
            } else {
                alert(err.response?.data?.message || 'Failed to add interview');
            }
        }
    };

    const handleMarkEventComplete = async (eventId: string) => {
        try {
            await interviewEventsAPI.markComplete(eventId);
            loadInterviewEvents();
        } catch (err) {
            alert('Failed to mark interview as complete');
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Delete this interview?')) return;
        try {
            await interviewEventsAPI.delete(eventId);
            loadInterviewEvents();
        } catch (err) {
            alert('Failed to delete interview');
        }
    };

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [isEditingJd, setIsEditingJd] = useState(false);
    const [jdText, setJdText] = useState('');
    const [jdFile, setJdFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const jdFileInputRef = useRef<HTMLInputElement>(null);
    
    // Unified Interview Events state
    const [interviewEvents, setInterviewEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({
        date: '',
        startTime: '',
        endTime: '',
        notes: ''
    });
    const [nextRound, setNextRound] = useState(1);
    const [conflictError, setConflictError] = useState('');

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                    Failed to load application. The application may have been deleted or does not exist.
                </div>
                <button 
                    onClick={() => router.push('/dashboard/applications')}
                    className="text-primary hover:underline"
                >
                    ← Back to Applications
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Fix: backend returns "followups" but frontend expects "followUps"
    console.log('[ApplicationPage] data.followups:', data?.followups);
    const application = data ? {
        ...data,
        followUps: data.followups || [],
        notes: data.notes || [],
        interviews: data.interviews || [],
    } : null;

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            await notesAPI.create(id, { content: newNote });
            setNewNote('');
            mutate();
        } catch (err) {
            alert('Failed to add note');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Delete this note?')) return;
        try {
            await notesAPI.delete(noteId);
            mutate();
        } catch (err) {
            alert('Failed to delete note');
        }
    };

    const handleSaveJdText = async () => {
        try {
            await applicationsAPI.update(id, { jdText });
            setIsEditingJd(false);
            mutate();
        } catch (err) {
            alert('Failed to save JD text');
        }
    };

    const handleJdReceivedToggle = async (checked: boolean) => {
        try {
            await applicationsAPI.update(id, { jdReceived: checked });
            mutate();
        } catch (err) {
            alert('Failed to update JD received status');
        }
    };

    const handleJdFileUpload = async () => {
        if (!jdFile) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('jdFile', jdFile);
            await applicationsAPI.uploadJdFile(id, formData);
            setJdFile(null);
            if (jdFileInputRef.current) {
                jdFileInputRef.current.value = '';
            }
            mutate();
        } catch (err) {
            alert('Failed to upload JD file');
        } finally {
            setIsUploading(false);
        }
    };

    // Helper to check if techStack is array
    const getTechStackDisplay = () => {
        if (!application.techStack) return [];
        if (Array.isArray(application.techStack)) {
            return application.techStack.length > 0 ? application.techStack : [];
        }
        return application.techStack.split(',').map((t: string) => t.trim()).filter(Boolean);
    };

    // Get current stage index for pipeline
    const getCurrentStageIndex = () => {
        const status = application?.currentStatus || 'NEW_CALL';
        return PIPELINE_STAGES.findIndex(s => s.key === status);
    };

    // Calculate insights
    const getInsights = () => {
        const insights = [];
        
        // Days since applied
        if (application.appliedDate) {
            const appliedDate = new Date(application.appliedDate);
            const now = new Date();
            const daysSinceApplied = Math.floor((now.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
            insights.push({
                type: 'info',
                message: `Applied ${daysSinceApplied} days ago`
            });
        }

        // No activity check
        const lastActivity = application.updatedAt || application.createdAt;
        if (lastActivity) {
            const lastActivityDate = new Date(lastActivity);
            const now = new Date();
            const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceActivity > 5) {
                insights.push({
                    type: 'warning',
                    message: `No activity for ${daysSinceActivity} days`
                });
            }
        }

        // Interview conversion
        const completedInterviews = interviewEvents.filter(e => e.status === 'COMPLETED').length;
        const totalInterviews = interviewEvents.length;
        if (totalInterviews > 0) {
            insights.push({
                type: 'success',
                message: `Interview conversion: ${completedInterviews}/${totalInterviews}`
            });
        }

        // Follow-up recommended
        if (application.currentStatus === 'SHORTLISTED' || application.currentStatus === 'INTERVIEW_COMPLETED') {
            const hasUpcomingFollowUp = application.followUps?.some((f: any) => f.computedStatus === 'UPCOMING' || f.computedStatus === 'DUE');
            if (!hasUpcomingFollowUp) {
                insights.push({
                    type: 'tip',
                    message: 'Follow-up recommended'
                });
            }
        }

        // No JD received
        if (!application.jdReceived) {
            insights.push({
                type: 'warning',
                message: 'JD not received yet'
            });
        }

        return insights;
    };

    // Get activity timeline
    const getActivityTimeline = () => {
        const activities = [];
        
        if (application.createdAt) {
            activities.push({
                type: 'created',
                label: 'Application created',
                date: application.createdAt
            });
        }
        
        if (application.appliedDate) {
            activities.push({
                type: 'applied',
                label: 'Applied',
                date: application.appliedDate
            });
        }

        // Add interview events
        interviewEvents.forEach(event => {
            activities.push({
                type: 'interview',
                label: `Round ${event.roundNumber} ${event.status === 'COMPLETED' ? 'completed' : 'scheduled'}`,
                date: event.date,
                status: event.status
            });
        });

        // Add follow-ups
        if (application.followUps) {
            application.followUps.forEach((followUp: any) => {
                activities.push({
                    type: 'followup',
                    label: `Follow-up: ${followUp.title}`,
                    date: followUp.followUpDate,
                    status: followUp.computedStatus
                });
            });
        }

        return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const techStack = getTechStackDisplay();
    const insights = getInsights();
    const activities = getActivityTimeline();

    // Status badge color
    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'OFFER': return 'bg-green-100 text-green-800 border-green-200';
            case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
            case 'INTERVIEW_SCHEDULED': 
            case 'INTERVIEW_IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'SHORTLISTED': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'APPLIED': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'JD_RECEIVED': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full">
            {/* Sidebar - Hidden for full screen */}
            {/* Sidebar removed - page is full width */}

            {/* Top Navigation Bar - Fixed */}
            <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40 h-16">
                <div className="w-full px-4 sm:px-6 max-w-5xl mx-auto">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                            </button>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeColor(application?.currentStatus || 'NEW_CALL')}`}>
                                    {application?.currentStatus ? STATUS_LABELS[application.currentStatus] || application.currentStatus : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push(`/dashboard/applications/new?id=${id}`)}
                                className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                <span className="hidden sm:inline">Edit</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-16 pb-6">
                <div className="flex flex-col lg:flex-row gap-6 w-full max-w-5xl mx-auto px-4">
                    {/* Responsive Grid: Main Content - flexible, Right Panel - fixed ~300px */}
                    
                    {/* LEFT SIDE - Main Workspace */}
                    <div className="flex-1 min-w-0 w-full min-h-0 overflow-x-hidden">
                        
                        {/* Header Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="flex-1">
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {application?.hiringCompany || 'Company Name'}
                                    </h1>
                                    <p className="text-lg text-gray-600 mt-1">
                                        {application?.jobRole || 'Job Role'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 mt-3">
                                        {application?.appliedDate && (
                                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                <span>Applied {formatDate(application.appliedDate)}</span>
                                            </div>
                                        )}
                                        {application?.source && (
                                            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                                {SOURCE_LABELS[application.source] || application.source}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowAddEvent(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                                    >
                                        <Calendar className="w-4 h-4" />
                                        Add Interview
                                    </button>
                                    <button
                                        onClick={() => document.getElementById('followups-section')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        <Bell className="w-4 h-4" />
                                        Add Follow-up
                                    </button>
                                    <button
                                        onClick={() => setRightPanelOpen(!rightPanelOpen)}
                                        className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-colors ${
                                            rightPanelOpen 
                                                ? 'bg-gray-100 border-gray-300 text-gray-700' 
                                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}
                                        title={rightPanelOpen ? 'Hide Details' : 'Show Details'}
                                    >
                                        {rightPanelOpen ? (
                                            <>
                                                <PanelRightClose className="w-4 h-4" />
                                                <span className="hidden sm:inline text-sm">Hide Details</span>
                                            </>
                                        ) : (
                                            <>
                                                <PanelRightOpen className="w-4 h-4" />
                                                <span className="hidden sm:inline text-sm">Show Details</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-hidden">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-primary" />
                                Application Pipeline
                            </h2>
                            
                            {/* Visual Pipeline */}
                            <div className="relative overflow-x-auto -mx-2 px-2 pb-2">
                                <div className="flex items-center justify-between min-w-max pb-2">
                                    {PIPELINE_STAGES.slice(0, 8).map((stage, index) => {
                                        const currentIndex = getCurrentStageIndex();
                                        const isActive = index === currentIndex;
                                        const isPast = index < currentIndex;
                                        const isRejected = application?.currentStatus === 'REJECTED';
                                        const isOffer = application?.currentStatus === 'OFFER';
                                        
                                        // Handle special cases
                                        let showAsActive = isActive;
                                        if (isRejected && index <= currentIndex) showAsActive = true;
                                        if (isOffer && stage.key === 'OFFER') showAsActive = true;
                                        
                                        return (
                                            <div key={stage.key} className="flex items-center">
                                                <div className="flex flex-col items-center">
                                                    <div className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                                                        ${showAsActive ? `${stage.color} text-gray-900 ring-2 ring-primary ring-offset-2` : 
                                                          isPast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}
                                                    `}>
                                                        {isPast || (isRejected && index < currentIndex) ? (
                                                            <Check className="w-5 h-5" />
                                                        ) : (
                                                            <Circle className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <span className={`text-xs mt-1.5 font-medium ${showAsActive ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {stage.label}
                                                    </span>
                                                </div>
                                                {index < 7 && (
                                                    <div className={`w-8 sm:w-12 h-0.5 mx-1 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Pipeline Context */}
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    {application?.currentStatus === 'INTERVIEW_IN_PROGRESS' && interviewEvents.length > 0 && (
                                        <>Waiting for Round {interviewEvents.filter(e => e.status === 'COMPLETED').length + 1}</>
                                    )}
                                    {application?.currentStatus === 'SHORTLISTED' && !application.jdReceived && (
                                        <>Waiting for JD to be received</>
                                    )}
                                    {application?.currentStatus === 'APPLIED' && (
                                        <>Waiting for response</>
                                    )}
                                    {application?.currentStatus === 'INTERVIEW_SCHEDULED' && (
                                        <>Interview scheduled</>
                                    )}
                                    {application?.currentStatus === 'OFFER' && (
                                        <span className="text-green-600 font-medium">🎉 Congratulations on the offer!</span>
                                    )}
                                    {application?.currentStatus === 'REJECTED' && (
                                        <span className="text-red-600 font-medium">Application was rejected</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Interview Timeline Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    Interviews
                                </h2>
                                <button
                                    onClick={() => setShowAddEvent(!showAddEvent)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>

                            {/* Add Interview Form */}
                            {showAddEvent && (
                                <div className="bg-gray-50 p-4 rounded-xl mb-6 animate-in slide-in-from-top-2">
                                    <h4 className="font-medium mb-3">Schedule Interview - Round {nextRound}</h4>
                                    {conflictError && (
                                        <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {conflictError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                            <input
                                                type="date"
                                                value={newEvent.date}
                                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                            <input
                                                type="time"
                                                value={newEvent.startTime}
                                                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                            <input
                                                type="time"
                                                value={newEvent.endTime}
                                                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <input
                                                type="text"
                                                value={newEvent.notes}
                                                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                                                placeholder="Interview focus, preparation notes..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleAddInterviewEvent}
                                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                                        >
                                            Schedule Interview
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddEvent(false);
                                                setConflictError('');
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Interview Timeline */}
                            {loadingEvents ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : interviewEvents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Calendar className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="font-medium">No interviews scheduled yet</p>
                                    <p className="text-sm mt-1">Start by scheduling your first interview</p>
                                </div>
                            ) : (
                                <div className="relative">
                                    {/* Vertical line */}
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                                    
                                    <div className="space-y-4">
                                        {interviewEvents.map((event: any, index: number) => (
                                            <div key={event.id} className="relative pl-10">
                                                {/* Timeline dot */}
                                                <div className={`absolute left-2 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                    event.status === 'COMPLETED' 
                                                        ? 'bg-green-500 border-green-500' 
                                                        : event.status === 'SCHEDULED'
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'bg-gray-300 border-gray-300'
                                                }`}>
                                                    {event.status === 'COMPLETED' && (
                                                        <Check className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                
                                                <div className={`p-4 rounded-xl border transition-all ${
                                                    event.status === 'COMPLETED' 
                                                        ? 'bg-green-50 border-green-200' 
                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}>
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-900">
                                                                    {event.title || `Round ${event.roundNumber}`}
                                                                </span>
                                                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                                    event.status === 'COMPLETED' 
                                                                        ? 'bg-green-100 text-green-700' 
                                                                        : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                    {event.status === 'COMPLETED' ? 'Completed' : 'Scheduled'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                <span>{formatDate(event.date)}</span>
                                                                {event.startTime && (
                                                                    <span>• {event.startTime}</span>
                                                                )}
                                                                {event.endTime && (
                                                                    <span> - {event.endTime}</span>
                                                                )}
                                                            </div>
                                                            {event.notes && (
                                                                <p className="text-sm text-gray-600 mt-2">{event.notes}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {event.status === 'SCHEDULED' && (
                                                                <button
                                                                    onClick={() => handleMarkEventComplete(event.id)}
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                    title="Mark Complete"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteEvent(event.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Follow-ups Section */}
                        <div id="followups-section" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Bell className="w-5 h-5 text-primary" />
                                    Follow-ups
                                </h2>
                            </div>
                            <FollowUpSection 
                                applicationId={id} 
                                followUps={application.followUps || []}
                                onStatusChange={() => mutate()}
                            />
                        </div>

                        {/* Notes Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    Notes
                                </h2>
                            </div>
                            
                            {/* Add Note Input */}
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                />
                                <button
                                    onClick={handleAddNote}
                                    className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            
                            {/* Notes List */}
                            <div className="space-y-3">
                                {(!application.notes || application.notes.length === 0) ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <MessageSquare className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p>No notes yet</p>
                                        <p className="text-sm mt-1">Add notes to track your thoughts</p>
                                    </div>
                                ) : (
                                    application.notes.map((note: any) => (
                                        <div key={note.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                                            <div className="flex justify-between items-start gap-3">
                                                <p className="text-gray-900 whitespace-pre-wrap">{note.content}</p>
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {formatRelativeTime(note.createdAt)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDE - Context Panel (Fixed ~300px) */}
                    <div className={`w-full lg:w-[300px] flex-shrink-0 transition-all duration-300 order-last lg:order-none ${rightPanelOpen ? 'block' : 'hidden lg:hidden'}`}>
                        <div className="sticky top-20 space-y-6">
                            
                            {/* Recruiter Card */}
                            {(application.recruiterName || application.email || application.phone) && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" />
                                        Recruiter
                                    </h3>
                                    <div className="space-y-3">
                                        {application.recruiterName && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <User className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{application.recruiterName}</p>
                                                    {application.recruiterCompany && (
                                                        <p className="text-sm text-gray-500">{application.recruiterCompany}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {application.email && (
                                            <a 
                                                href={`mailto:${application.email}`}
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                                            >
                                                <Mail className="w-4 h-4" />
                                                {application.email}
                                            </a>
                                        )}
                                        {application.phone && (
                                            <a 
                                                href={`tel:${application.phone}`}
                                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors"
                                            >
                                                <Phone className="w-4 h-4" />
                                                {application.phone}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Job Details Card */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-primary" />
                                    Job Details
                                </h3>
                                <div className="space-y-4">
                                    {/* Source */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Source</label>
                                        <div className="mt-1">
                                            <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                                                {SOURCE_LABELS[application.source] || application.source || 'Not specified'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Tech Stack */}
                                    {techStack.length > 0 && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Tech Stack</label>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {techStack.map((tech: string, index: number) => (
                                                    <span 
                                                        key={index}
                                                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                                                    >
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* JD Status */}
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Job Description</label>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className={`text-sm ${application.jdReceived ? 'text-green-600' : 'text-gray-500'}`}>
                                                {application.jdReceived ? '✓ Received' : 'Not received'}
                                            </span>
                                            <button
                                                onClick={() => handleJdReceivedToggle(!application.jdReceived)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {application.jdReceived ? 'Mark not received' : 'Mark received'}
                                            </button>
                                        </div>
                                        
                                        {application.jdReceived && (
                                            <div className="mt-3 space-y-2">
                                                {application.jdFileName && application.jdFilePath && (
                                                    <a
                                                        href={`${API_URL.replace('/api', '')}/${application.jdFilePath}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        <span>{application.jdFileName}</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                                <div>
                                                    <input
                                                        type="file"
                                                        ref={jdFileInputRef}
                                                        onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                                                        accept=".pdf,.doc,.docx,.txt"
                                                        className="hidden"
                                                        id="jd-file-upload-sidebar"
                                                    />
                                                    <label
                                                        htmlFor="jd-file-upload-sidebar"
                                                        className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
                                                    >
                                                        <Upload className="w-3 h-3" />
                                                        {application.jdFileName ? 'Change file' : 'Upload JD'}
                                                    </label>
                                                    {jdFile && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-xs text-gray-600 truncate">{jdFile.name}</span>
                                                            <button
                                                                onClick={handleJdFileUpload}
                                                                disabled={isUploading}
                                                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                {isUploading ? '...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setJdFile(null);
                                                                    if (jdFileInputRef.current) jdFileInputRef.current.value = '';
                                                                }}
                                                                className="p-1 text-gray-400 hover:text-red-500"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Resume Version */}
                                    {application.resumeVersion && (
                                        <div>
                                            <label className="text-xs font-medium text-gray-500">Resume Version</label>
                                            <p className="text-sm text-gray-900 mt-1">{application.resumeVersion}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Insights Card */}
                            {insights.length > 0 && (
                                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-primary" />
                                        Insights
                                    </h3>
                                    <div className="space-y-2.5">
                                        {insights.map((insight, index) => (
                                            <div 
                                                key={index}
                                                className={`flex items-start gap-2 text-sm p-2 rounded-lg ${
                                                    insight.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                                                    insight.type === 'success' ? 'bg-green-50 text-green-800' :
                                                    insight.type === 'tip' ? 'bg-blue-50 text-blue-800' :
                                                    'bg-gray-50 text-gray-700'
                                                }`}
                                            >
                                                {insight.type === 'warning' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                                {insight.type === 'success' && <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                                {insight.type === 'tip' && <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                                {insight.type === 'info' && <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                                                <span>{insight.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Activity Timeline */}
                            {activities.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-primary" />
                                        Activity
                                    </h3>
                                    <div className="relative">
                                        <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-100" />
                                        <div className="space-y-4">
                                            {activities.slice(0, 6).map((activity, index) => (
                                                <div key={index} className="relative pl-6">
                                                    <div className={`absolute left-1 w-3 h-3 rounded-full ${
                                                        activity.type === 'interview' ? 'bg-blue-500' :
                                                        activity.type === 'followup' ? 'bg-orange-500' :
                                                        activity.type === 'applied' ? 'bg-green-500' :
                                                        'bg-gray-400'
                                                    }`} />
                                                    <p className="text-sm text-gray-900">{activity.label}</p>
                                                    <p className="text-xs text-gray-500">{formatRelativeTime(activity.date)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Edit Application</h2>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    &times;
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Role</label>
                                    <input
                                        type="text"
                                        value={editForm.jobRole || ''}
                                        onChange={(e) => setEditForm({ ...editForm, jobRole: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={editForm.hiringCompany || ''}
                                        onChange={(e) => setEditForm({ ...editForm, hiringCompany: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={editForm.currentStatus || 'NEW_CALL'}
                                        onChange={(e) => setEditForm({ ...editForm, currentStatus: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                                    <select
                                        value={editForm.source || ''}
                                        onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">Select Source</option>
                                        <option value="NAUKRI">Naukri</option>
                                        <option value="LINKEDIN">LinkedIn</option>
                                        <option value="INDEED">Indeed</option>
                                        <option value="INSTAHYRE">Instahyre</option>
                                        <option value="REFERRAL">Referral</option>
                                        <option value="COMPANY_WEBSITE">Company Website</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Recruiter Name</label>
                                    <input
                                        type="text"
                                        value={editForm.recruiterName || ''}
                                        onChange={(e) => setEditForm({ ...editForm, recruiterName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Recruiter Company</label>
                                    <input
                                        type="text"
                                        value={editForm.recruiterCompany || ''}
                                        onChange={(e) => setEditForm({ ...editForm, recruiterCompany: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Applied</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={editForm.applied || false}
                                            onChange={(e) => setEditForm({ ...editForm, applied: e.target.checked })}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-sm text-gray-600">Yes</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Applied Date</label>
                                    <input
                                        type="date"
                                        value={editForm.appliedDate || ''}
                                        onChange={(e) => setEditForm({ ...editForm, appliedDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">JD Received</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={editForm.jdReceived || false}
                                            onChange={(e) => setEditForm({ ...editForm, jdReceived: e.target.checked })}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <span className="text-sm text-gray-600">Yes</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">JD Link</label>
                                    <input
                                        type="text"
                                        value={editForm.jdLink || ''}
                                        onChange={(e) => setEditForm({ ...editForm, jdLink: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack (comma separated)</label>
                                    <input
                                        type="text"
                                        value={editForm.techStack || ''}
                                        onChange={(e) => setEditForm({ ...editForm, techStack: e.target.value })}
                                        placeholder="React, Node.js, PostgreSQL"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const updateData = {
                                                ...editForm,
                                            };
                                            await applicationsAPI.update(id, updateData);
                                            mutate();
                                            setIsEditing(false);
                                        } catch (err) {
                                            alert('Failed to update application');
                                        }
                                    }}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Follow-up Section Component
interface FollowUpSectionProps {
    applicationId: string;
    followUps: any[];
    onStatusChange: () => void;
}

function FollowUpSection({ applicationId, followUps, onStatusChange }: FollowUpSectionProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [selectedFollowUp, setSelectedFollowUp] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: '',
        followUpDate: '',
        contextType: 'GENERAL',
        priority: 'MEDIUM'
    });
    const [updateForm, setUpdateForm] = useState({
        notes: '',
        newFollowUpDate: '',
    });
    const [completeForm, setCompleteForm] = useState({
        notes: '',
    });

    const handleQuickAdd = async (days: number) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        
        try {
            await followupsAPI.create(applicationId, {
                title: 'Follow-up',
                followUpDate: date.toISOString(),
                contextType: 'GENERAL',
                priority: 'MEDIUM'
            });
            onStatusChange();
        } catch (error) {
            console.error('Error creating quick follow-up:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await followupsAPI.create(applicationId, {
                ...formData,
                followUpDate: new Date(formData.followUpDate).toISOString()
            });
            setFormData({ title: '', followUpDate: '', contextType: 'GENERAL', priority: 'MEDIUM' });
            setShowAddForm(false);
            onStatusChange();
        } catch (error) {
            console.error('Error creating follow-up:', error);
        }
    };

    const handleMarkComplete = async (id: string) => {
        try {
            await followupsAPI.markComplete(id);
            onStatusChange();
        } catch (error) {
            console.error('Error marking complete:', error);
        }
    };

    const handleMarkCompleteWithNote = async () => {
        if (!selectedFollowUp) return;
        try {
            await followupsAPI.markCompleteWithNote(selectedFollowUp.id, completeForm.notes || undefined);
            setShowCompleteModal(false);
            setCompleteForm({ notes: '' });
            setSelectedFollowUp(null);
            onStatusChange();
        } catch (error) {
            console.error('Error marking complete:', error);
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
            onStatusChange();
        } catch (error) {
            console.error('Error adding update:', error);
        }
    };

    const openUpdateModal = (followUp: any) => {
        setSelectedFollowUp(followUp);
        setUpdateForm({ notes: '', newFollowUpDate: '' });
        setShowUpdateModal(true);
    };

    const openCompleteModal = (followUp: any) => {
        setSelectedFollowUp(followUp);
        setCompleteForm({ notes: '' });
        setShowCompleteModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this follow-up?')) return;
        try {
            await followupsAPI.delete(id);
            onStatusChange();
        } catch (error) {
            console.error('Error deleting follow-up:', error);
        }
    };

    // Group follow-ups
    const safeFollowUps = Array.isArray(followUps) ? followUps : [];
    const upcoming = safeFollowUps.filter(f => f.computedStatus === 'UPCOMING' || f.computedStatus === 'DUE');
    const missed = safeFollowUps.filter(f => f.computedStatus === 'MISSED');
    const completed = safeFollowUps.filter(f => f.computedStatus === 'COMPLETED');

    console.log('[FollowUpSection] followUps:', safeFollowUps.length, 'upcoming:', upcoming.length, 'missed:', missed.length, 'completed:', completed.length);

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
        return formatDate(dateStr);
    };

    return (
        <div className="space-y-4">
            {/* Quick Add Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
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
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    Custom
                </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Title"
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                        />
                        <input
                            type="date"
                            value={formData.followUpDate}
                            onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            required
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-3 py-1.5 text-sm text-gray-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                        >
                            Add
                        </button>
                    </div>
                </form>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-blue-600 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Upcoming ({upcoming.length})
                    </h4>
                    {upcoming.map(followUp => (
                        <div key={followUp.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{followUp.title}</p>
                                    <p className="text-xs text-gray-500">{getRelativeDate(followUp.followUpDate)}</p>
                                    {followUp.history && followUp.history.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {followUp.history.slice(0, 2).map((h: any) => (
                                                <div key={h.id} className="text-xs text-gray-600 bg-white/50 p-1.5 rounded">
                                                    <span className="font-medium">{h.actionType}:</span> {h.notes}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openUpdateModal(followUp)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                        title="Add Update"
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => openCompleteModal(followUp)}
                                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                                        title="Mark Complete"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(followUp.id)}
                                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Missed */}
            {missed.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Missed ({missed.length})
                    </h4>
                    {missed.map(followUp => (
                        <div key={followUp.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{followUp.title}</p>
                                    <p className="text-xs text-gray-500">{getRelativeDate(followUp.followUpDate)}</p>
                                    {followUp.history && followUp.history.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {followUp.history.slice(0, 2).map((h: any) => (
                                                <div key={h.id} className="text-xs text-gray-600 bg-white/50 p-1.5 rounded">
                                                    <span className="font-medium">{h.actionType}:</span> {h.notes}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openUpdateModal(followUp)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                        title="Add Update"
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => openCompleteModal(followUp)}
                                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                                        title="Mark Complete"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(followUp.id)}
                                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed ({completed.length})
                    </h4>
                    {completed.slice(0, 3).map(followUp => (
                        <div key={followUp.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-75">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{followUp.title}</p>
                                    <p className="text-xs text-gray-500">{getRelativeDate(followUp.followUpDate)}</p>
                                    {followUp.history && followUp.history.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {followUp.history.slice(0, 2).map((h: any) => (
                                                <div key={h.id} className="text-xs text-gray-600 bg-white/50 p-1.5 rounded">
                                                    <span className="font-medium">{h.actionType}:</span> {h.notes}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(followUp.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {safeFollowUps.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No follow-ups yet</p>
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
                                <label className="block text-sm font-medium text-gray-600 mb-1">
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
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Reschedule (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={updateForm.newFollowUpDate}
                                    onChange={(e) => setUpdateForm({ ...updateForm, newFollowUpDate: e.target.value })}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Leave empty to keep the current due date
                                </p>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => setShowUpdateModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
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
                            <h3 className="text-lg font-semibold">Mark as Complete</h3>
                            <button
                                onClick={() => setShowCompleteModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                    Completion Note (Optional)
                                </label>
                                <textarea
                                    value={completeForm.notes}
                                    onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                                    placeholder="What was the outcome?"
                                    rows={3}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => setShowCompleteModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMarkCompleteWithNote}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
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
