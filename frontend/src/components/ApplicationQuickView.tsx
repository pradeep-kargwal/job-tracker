'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
    X, 
    ChevronRight, 
    ChevronDown, 
    Clock, 
    CheckCircle2, 
    Circle, 
    Calendar,
    Phone,
    Mail,
    Linkedin,
    ExternalLink,
    Bell,
    AlertTriangle,
    Building2,
    User,
    Briefcase,
    FileText,
    Eye,
    Plus,
    Activity,
    FileCheck,
    Send
} from 'lucide-react';
import { applicationsAPI, interviewsAPI, followupsAPI, interviewEventsAPI, interviewProcessAPI, notesAPI } from '@/lib/api';
import { STATUS_LABELS, formatDate, formatDateTime, formatRelativeTime } from '@/lib/utils';

interface ApplicationQuickViewProps {
    application: any;
    onClose: () => void;
}

interface ApplicationDetails {
    application: any;
    interviews: any[];
    followups: any[];
    interviewEvents: any[];
    interviewProcess: any | null;
    notes: any[];
}

// Pipeline stages in order
const PIPELINE_STAGES = [
    'NEW_CALL',
    'JD_RECEIVED',
    'APPLIED',
    'SHORTLISTED',
    'INTERVIEW_IN_PROGRESS',
    'INTERVIEW_SCHEDULED',
    'INTERVIEW_COMPLETED',
    'OFFER',
    'REJECTED',
    'ON_HOLD'
];

export default function ApplicationQuickView({ application, onClose }: ApplicationQuickViewProps) {
    const [details, setDetails] = useState<ApplicationDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [recruiterExpanded, setRecruiterExpanded] = useState(true);
    const [notesExpanded, setNotesExpanded] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    // Animation: slide in
    useEffect(() => {
        setTimeout(() => setIsVisible(true), 10);
    }, []);

    // Fetch all related data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [interviewsRes, followupsRes, interviewEventsRes, interviewProcessRes, notesRes] = await Promise.all([
                    interviewsAPI.getByApplication(application.id),
                    followupsAPI.getByApplication(application.id),
                    interviewEventsAPI.getByApplication(application.id),
                    interviewProcessAPI.getByApplication(application.id).catch(() => ({ data: null })),
                    notesAPI.getByApplication(application.id).catch(() => ({ data: [] }))
                ]);

                setDetails({
                    application,
                    interviews: interviewsRes.data?.data || [],
                    followups: followupsRes.data?.data || [],
                    interviewEvents: interviewEventsRes.data?.data || [],
                    interviewProcess: interviewProcessRes.data?.data || null,
                    notes: notesRes.data?.data || []
                });
            } catch (error) {
                console.error('Error fetching application details:', error);
                setDetails({
                    application,
                    interviews: [],
                    followups: [],
                    interviewEvents: [],
                    interviewProcess: null,
                    notes: []
                });
            } finally {
                setLoading(false);
            }
        };

        if (application?.id) {
            fetchData();
        }
    }, [application]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OFFER': return 'bg-green-500';
            case 'REJECTED': return 'bg-red-500';
            case 'INTERVIEW_SCHEDULED':
            case 'INTERVIEW_IN_PROGRESS': return 'bg-blue-500';
            case 'SHORTLISTED': return 'bg-purple-500';
            case 'APPLIED': return 'bg-yellow-500';
            case 'JD_RECEIVED': return 'bg-cyan-500';
            case 'INTERVIEW_COMPLETED': return 'bg-teal-500';
            default: return 'bg-gray-500';
        }
    };

    const getFollowUpStatusColor = (followup: any) => {
        const now = new Date();
        const dueDate = new Date(followup.followUpDate);
        
        if (followup.completed) return 'bg-green-100 text-green-700 border-green-200';
        
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'bg-red-100 text-red-700 border-red-200'; // Missed
        if (diffDays === 0) return 'bg-yellow-100 text-yellow-700 border-yellow-200'; // Due today
        if (diffDays <= 1) return 'bg-orange-100 text-orange-700 border-orange-200'; // Due soon
        return 'bg-gray-100 text-gray-700 border-gray-200'; // Normal
    };

    const getCurrentStageIndex = () => {
        return PIPELINE_STAGES.indexOf(details?.application?.currentStatus || '');
    };

    const getPipelineContext = () => {
        const status = details?.application?.currentStatus;
        
        if (details?.interviewProcess?.waitingState) {
            return details.interviewProcess.waitingState;
        }
        
        if (status === 'INTERVIEW_SCHEDULED' || status === 'INTERVIEW_IN_PROGRESS') {
            // Find next scheduled interview
            const nextInterview = details?.interviewEvents?.find((e: any) => e.status !== 'COMPLETED');
            if (nextInterview) {
                return `Waiting for ${nextInterview.roundName || 'Round ' + nextInterview.roundNumber}`;
            }
            return 'Interview in progress';
        }
        
        if (status === 'APPLIED') {
            return 'Waiting for response';
        }
        
        if (status === 'SHORTLISTED') {
            return 'Awaiting interview schedule';
        }
        
        return null;
    };

    // Calculate days since last update
    const getLastActivityText = () => {
        if (!details?.application?.updatedAt) return 'Unknown';
        
        const now = new Date();
        const updated = new Date(details.application.updatedAt);
        const diffMs = now.getTime() - updated.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Updated today';
        if (diffDays === 1) return 'Updated yesterday';
        if (diffDays < 7) return `Updated ${diffDays} days ago`;
        if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
        return `Updated ${Math.floor(diffDays / 30)} months ago`;
    };

    if (!application) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            />
            
            {/* Drawer Panel */}
            <div 
                className={`relative w-full max-w-3xl bg-gradient-to-br from-slate-50 via-white to-blue-50 shadow-2xl h-full overflow-hidden transition-transform duration-300 ease-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto">
                        {/* ==================== HEADER SECTION ==================== */}
                        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-8 pb-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 pr-8">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                                        {details?.application?.hiringCompany || 'Unknown Company'}
                                    </h1>
                                    <p className="text-lg text-gray-600 mb-3">
                                        {details?.application?.jobRole || 'Unknown Role'}
                                    </p>
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-white ${getStatusColor(details?.application?.currentStatus || '')}`}>
                                        {STATUS_LABELS[details?.application?.currentStatus] || details?.application?.currentStatus}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>{getLastActivityText()}</span>
                            </div>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            {/* ==================== BASIC INFO GRID ==================== */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" />
                                    Application Details
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Source */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                                            {details?.application?.source === 'LINKEDIN' ? (
                                                <Linkedin className="w-5 h-5 text-indigo-600" />
                                            ) : (
                                                <ExternalLink className="w-5 h-5 text-indigo-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Source</p>
                                            <p className="font-medium text-sm">{details?.application?.source || 'Direct'}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Applied Date */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Applied Date</p>
                                            <p className="font-medium text-sm">
                                                {details?.application?.appliedDate ? formatDate(details.application.appliedDate) : 'Not Applied'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* JD Received */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">JD Received</p>
                                            <p className={`font-medium text-sm ${details?.application?.jdReceived ? 'text-green-600' : 'text-gray-400'}`}>
                                                {details?.application?.jdReceived ? '✓ Yes' : '✗ No'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Resume Version */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <FileCheck className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Resume Version</p>
                                            <p className="font-medium text-sm">{details?.application?.resumeVersion || 'Not Set'}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Applied Status */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                                            <Send className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Applied</p>
                                            <p className={`font-medium text-sm ${details?.application?.applied ? 'text-green-600' : 'text-gray-400'}`}>
                                                {details?.application?.applied ? '✓ Applied' : '✗ Not Applied'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* JD Link */}
                                    {details?.application?.jdLink && (
                                        <div className="flex items-center gap-3 col-span-2">
                                            <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                                                <ExternalLink className="w-5 h-5 text-cyan-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500">Job Description</p>
                                                <a 
                                                    href={details.application.jdLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium text-sm text-primary hover:underline flex items-center gap-1"
                                                >
                                                    View JD <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Tech Stack */}
                                    {details?.application?.techStack && details.application.techStack.length > 0 && (
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500 mb-2">Tech Stack</p>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.isArray(details.application.techStack) 
                                                    ? details.application.techStack.map((tech: string, idx: number) => (
                                                        <span 
                                                            key={idx}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 text-xs rounded-full border border-gray-200 font-medium"
                                                        >
                                                            {tech}
                                                        </span>
                                                    ))
                                                    : details.application.techStack.split(',').map((tech: string, idx: number) => (
                                                        <span 
                                                            key={idx}
                                                            className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 text-xs rounded-full border border-gray-200 font-medium"
                                                        >
                                                            {tech.trim()}
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ==================== CONTACT INFO ==================== */}
                            {(details?.application?.phone || details?.application?.email) && (
                                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        Contact Information
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        {details?.application?.phone && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                                    <Phone className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Phone</p>
                                                    <a href={`tel:${details.application.phone}`} className="font-medium text-sm text-primary hover:underline">
                                                        {details.application.phone}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {details?.application?.email && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                                    <Mail className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Email</p>
                                                    <a href={`mailto:${details.application.email}`} className="font-medium text-sm text-primary hover:underline">
                                                        {details.application.email}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ==================== STATUS & PIPELINE SECTION ==================== */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Pipeline Progress
                                </h3>
                                
                                {/* Pipeline Visualization */}
                                <div className="flex items-center justify-between mb-4 overflow-x-auto pb-2">
                                    {['APPLIED', 'SHORTLISTED', 'INTERVIEW_IN_PROGRESS', 'OFFER'].map((stage, idx) => {
                                        const stageIdx = PIPELINE_STAGES.indexOf(stage);
                                        const currentIdx = getCurrentStageIndex();
                                        const isCompleted = stageIdx <= currentIdx;
                                        const isCurrent = stage === details?.application?.currentStatus;
                                        
                                        return (
                                            <div key={stage} className="flex items-center flex-1 min-w-0">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                                                        isCompleted 
                                                            ? isCurrent
                                                                ? 'bg-primary text-white ring-4 ring-primary/20'
                                                                : 'bg-green-500 text-white'
                                                            : 'bg-gray-200 text-gray-500'
                                                    }`}>
                                                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                                    </div>
                                                    <span className={`text-xs mt-1 text-center ${isCompleted ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                                        {STATUS_LABELS[stage]?.split(' ')[0]}
                                                    </span>
                                                </div>
                                                {idx < 3 && (
                                                    <div className={`h-0.5 flex-1 mx-2 ${stageIdx < currentIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Context */}
                                {getPipelineContext() && (
                                    <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                                        <Clock className="w-4 h-4" />
                                        {getPipelineContext()}
                                    </div>
                                )}
                            </div>

                            {/* ==================== INTERVIEW SUMMARY SECTION ==================== */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Interview Timeline
                                </h3>
                                
                                {details?.interviewEvents && details.interviewEvents.length > 0 ? (
                                    <div className="space-y-3">
                                        {details.interviewEvents.map((event: any, idx: number) => (
                                            <div 
                                                key={event.id || idx}
                                                className={`flex items-start gap-3 p-3 rounded-xl ${
                                                    event.status === 'COMPLETED' 
                                                        ? 'bg-green-50/50 border border-green-100' 
                                                        : event.status === 'SCHEDULED'
                                                            ? 'bg-blue-50/50 border border-blue-100'
                                                            : 'bg-gray-50/50 border border-gray-100'
                                                }`}
                                            >
                                                <div className={`mt-0.5 ${
                                                    event.status === 'COMPLETED' ? 'text-green-500' : 
                                                    event.status === 'SCHEDULED' ? 'text-blue-500' : 'text-gray-400'
                                                }`}>
                                                    {event.status === 'COMPLETED' ? (
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    ) : event.status === 'SCHEDULED' ? (
                                                        <Calendar className="w-5 h-5" />
                                                    ) : (
                                                        <Circle className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-gray-900">
                                                            {event.roundName || `Round ${event.roundNumber}`}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                            event.status === 'COMPLETED' 
                                                                ? 'bg-green-100 text-green-700'
                                                                : event.status === 'SCHEDULED'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {event.status === 'COMPLETED' ? 'Completed' : 
                                                             event.status === 'SCHEDULED' ? 'Scheduled' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {event.date && formatDate(event.date)}
                                                        {event.startTime && ` at ${event.startTime}`}
                                                        {event.mode && (
                                                            <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                                                                {event.mode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {event.notes && (
                                                        <p className="text-xs text-gray-400 mt-1">{event.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : details?.interviewProcess?.rounds && details.interviewProcess.rounds.length > 0 ? (
                                    <div className="space-y-3">
                                        {details.interviewProcess.rounds.map((round: any, idx: number) => (
                                            <div 
                                                key={round.id || idx}
                                                className={`flex items-start gap-3 p-3 rounded-xl ${
                                                    round.status === 'COMPLETED' 
                                                        ? 'bg-green-50/50 border border-green-100' 
                                                        : round.status === 'SCHEDULED'
                                                            ? 'bg-blue-50/50 border border-blue-100'
                                                            : 'bg-gray-50/50 border border-gray-100'
                                                }`}
                                            >
                                                <div className={`mt-0.5 ${
                                                    round.status === 'COMPLETED' ? 'text-green-500' : 
                                                    round.status === 'SCHEDULED' ? 'text-blue-500' : 'text-gray-400'
                                                }`}>
                                                    {round.status === 'COMPLETED' ? (
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    ) : round.status === 'SCHEDULED' ? (
                                                        <Calendar className="w-5 h-5" />
                                                    ) : (
                                                        <Circle className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-gray-900">
                                                            {round.roundName || `Round ${round.roundNumber}`}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                            round.status === 'COMPLETED' 
                                                                ? 'bg-green-100 text-green-700'
                                                                : round.status === 'SCHEDULED'
                                                                    ? 'bg-blue-100 text-blue-700'
                                                                    : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {round.status === 'COMPLETED' ? 'Completed' : 
                                                             round.status === 'SCHEDULED' ? 'Scheduled' : 'Not Scheduled'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1">
                                                        {round.scheduledDate && formatDate(round.scheduledDate)}
                                                        {round.completedDate && ` • Completed: ${formatDate(round.completedDate)}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-400">
                                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No interviews scheduled yet</p>
                                    </div>
                                )}
                            </div>

                            {/* ==================== FOLLOW-UPS SECTION ==================== */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Bell className="w-4 h-4" />
                                    Follow-ups
                                </h3>
                                
                                {details?.followups && details.followups.length > 0 ? (
                                    <div className="space-y-2">
                                        {details.followups.map((followup: any, idx: number) => (
                                            <div 
                                                key={followup.id || idx}
                                                className={`flex items-center gap-3 p-3 rounded-xl border ${getFollowUpStatusColor(followup)}`}
                                            >
                                                {followup.completed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    new Date(followup.followUpDate) < new Date() ? (
                                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                                    ) : (
                                                        <Bell className="w-4 h-4 text-gray-500" />
                                                    )
                                                )}
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm">{followup.title}</span>
                                                    {followup.description && (
                                                        <p className="text-xs opacity-75 mt-0.5">{followup.description}</p>
                                                    )}
                                                </div>
                                                <div className="text-xs text-right">
                                                    {followup.completed ? (
                                                        <span className="text-green-700">✓ Completed</span>
                                                    ) : (
                                                        <span>{formatDate(followup.followUpDate)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-400">
                                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No follow-ups scheduled</p>
                                    </div>
                                )}
                            </div>

                            {/* ==================== RECRUITER INFO (COLLAPSIBLE) ==================== */}
                            {(details?.application?.recruiterName || details?.application?.recruiterCompany || details?.application?.recruiterEmail || details?.application?.recruiterPhone) && (
                                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm overflow-hidden">
                                    <button 
                                        onClick={() => setRecruiterExpanded(!recruiterExpanded)}
                                        className="w-full flex items-center justify-between p-5 hover:bg-white/30 transition-colors"
                                    >
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Recruiter Information
                                        </h3>
                                        {recruiterExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                    </button>
                                    
                                    {recruiterExpanded && (
                                        <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                                            {details?.application?.recruiterName && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-semibold">
                                                        {details.application.recruiterName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Name</p>
                                                        <p className="font-medium text-sm">{details.application.recruiterName}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {details?.application?.recruiterCompany && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-gray-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Company</p>
                                                        <p className="font-medium text-sm">{details.application.recruiterCompany}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {details?.application?.recruiterEmail && (
                                                <div className="flex items-center gap-3 col-span-2">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                                        <Mail className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-500">Email</p>
                                                        <a href={`mailto:${details.application.recruiterEmail}`} className="font-medium text-sm text-primary hover:underline">
                                                            {details.application.recruiterEmail}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                            {details?.application?.recruiterPhone && (
                                                <div className="flex items-center gap-3 col-span-2">
                                                    <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                                                        <Phone className="w-5 h-5 text-green-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Phone</p>
                                                        <a href={`tel:${details.application.recruiterPhone}`} className="font-medium text-sm text-primary hover:underline">
                                                            {details.application.recruiterPhone}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ==================== NOTES / INSIGHTS SECTION ==================== */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm overflow-hidden">
                                <button 
                                    onClick={() => setNotesExpanded(!notesExpanded)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-white/30 transition-colors"
                                >
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Notes & Insights
                                    </h3>
                                    {notesExpanded ? (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                                
                                {notesExpanded && (
                                    <div className="px-5 pb-5">
                                        {/* User Notes */}
                                        {details?.notes && details.notes.length > 0 ? (
                                            <div className="space-y-3">
                                                {details.notes.map((note: any, idx: number) => (
                                                    <div key={note.id || idx} className="p-3 bg-gray-50/50 rounded-xl">
                                                        <p className="text-sm text-gray-700">{note.content}</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {formatRelativeTime(note.createdAt)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-gray-400">
                                                <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                                <p className="text-xs">No notes added yet</p>
                                            </div>
                                        )}
                                        
                                        {/* Derived Insights */}
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <p className="text-xs font-medium text-gray-500 mb-2">Insights</p>
                                            <div className="space-y-2">
                                                {details?.followups?.some((f: any) => !f.completed && new Date(f.followUpDate) < new Date()) && (
                                                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Overdue follow-up detected
                                                    </div>
                                                )}
                                                {details?.application?.currentStatus === 'APPLIED' && (
                                                    <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
                                                        <Clock className="w-3 h-3" />
                                                        Consider following up
                                                    </div>
                                                )}
                                                {details?.application?.currentStatus === 'INTERVIEW_COMPLETED' && (
                                                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Interview completed - await decision
                                                    </div>
                                                )}
                                                {(!details?.notes || details.notes.length === 0) && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                                        <FileText className="w-3 h-3" />
                                                        Add notes to track important details
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ==================== ACTION FOOTER ==================== */}
                        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/dashboard/applications/${details?.application?.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
                                >
                                    <Eye className="w-4 h-4" />
                                    View Full Details
                                </Link>
                                <Link
                                    href={`/dashboard/applications/${details?.application?.id}?action=addInterview`}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Add Interview
                                </Link>
                                <Link
                                    href={`/dashboard/applications/${details?.application?.id}?action=addFollowup`}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-medium hover:bg-orange-100 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Follow-up
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
