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
    X
} from 'lucide-react';
import { applicationsAPI, notesAPI, interviewsAPI, followupsAPI, interviewEventsAPI } from '@/lib/api';
import FollowUpTracker from '@/components/FollowUpTracker';
import { STATUS_LABELS } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const fetcher = (id: string) => applicationsAPI.getById(id).then((res) => res.data.data);

export default function ApplicationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

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
            loadInterviewEvents(); // Refresh events and round number
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

    const [activeTab, setActiveTab] = useState<'notes' | 'interviews' | 'followups'>('notes');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [isEditingJd, setIsEditingJd] = useState(false);
    const [jdText, setJdText] = useState('');
    const [jdFile, setJdFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jdFileInputRef = useRef<HTMLInputElement>(null);
    const [newInterview, setNewInterview] = useState({
        round_name: '',
        scheduled_date: '',
        scheduled_time: '',
        status: 'SCHEDULED',
        notes: '',
        feedback: ''
    });
    const [newFollowup, setNewFollowup] = useState({
        follow_up_date: '',
        description: ''
    });
    
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
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                    Failed to load application
                </div>
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

    const application = data;

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

    const handleAddInterview = async () => {
        if (!newInterview.round_name || !newInterview.scheduled_date) return;
        try {
            // Combine date and time if time is provided
            let scheduledDateTime = newInterview.scheduled_date;
            if (newInterview.scheduled_time) {
                scheduledDateTime = `${newInterview.scheduled_date}T${newInterview.scheduled_time}:00`;
            }
            await interviewsAPI.create(id, {
                ...newInterview,
                scheduled_date: scheduledDateTime
            });
            setNewInterview({
                round_name: '',
                scheduled_date: '',
                scheduled_time: '',
                status: 'SCHEDULED',
                notes: '',
                feedback: ''
            });
            mutate();
        } catch (err) {
            alert('Failed to add interview');
        }
    };

    const handleAddFollowup = async () => {
        if (!newFollowup.follow_up_date || !newFollowup.description) return;
        try {
            await followupsAPI.create(id, {
                ...newFollowup,
                follow_up_required: true
            });
            setNewFollowup({ follow_up_date: '', description: '' });
            mutate();
        } catch (err) {
            alert('Failed to add follow-up');
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

    const handleDeleteInterview = async (interviewId: string) => {
        if (!confirm('Delete this interview?')) return;
        try {
            await interviewsAPI.delete(interviewId);
            mutate();
        } catch (err) {
            alert('Failed to delete interview');
        }
    };

    const handleDeleteFollowup = async (followupId: string) => {
        if (!confirm('Delete this follow-up?')) return;
        try {
            await followupsAPI.delete(followupId);
            mutate();
        } catch (err) {
            alert('Failed to delete follow-up');
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
        if (!application.techStack) return null;
        if (Array.isArray(application.techStack)) {
            return application.techStack.length > 0 ? application.techStack.join(', ') : null;
        }
        return application.techStack;
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/applications"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold flex-1">{application?.jobRole || 'Application Details'}</h1>
                <button
                    onClick={() => {
                        // Handle techStack - could be array or string
                        let techStackValue = '';
                        if (application.techStack) {
                            if (Array.isArray(application.techStack)) {
                                techStackValue = application.techStack.join(', ');
                            } else {
                                techStackValue = application.techStack;
                            }
                        }
                        setEditForm({
                            recruiterName: application.recruiterName || '',
                            recruiterCompany: application.recruiterCompany || '',
                            hiringCompany: application.hiringCompany || '',
                            phone: application.phone || '',
                            email: application.email || '',
                            source: application.source || '',
                            jobRole: application.jobRole || '',
                            techStack: techStackValue,
                            jdReceived: application.jdReceived || false,
                            jdLink: application.jdLink || '',
                            jdText: application.jdText || '',
                            applied: application.applied || false,
                            appliedDate: application.appliedDate ? application.appliedDate.split('T')[0] : '',
                            resumeVersion: application.resumeVersion || '',
                            currentStatus: application.currentStatus || 'NEW_CALL'
                        });
                        setIsEditing(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                    <Edit className="w-4 h-4" />
                    Edit
                </button>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${application?.currentStatus === 'OFFER' ? 'bg-green-100 text-green-800' :
                    application?.currentStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        application?.currentStatus === 'INTERVIEW_SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                            application?.currentStatus === 'SHORTLISTED' ? 'bg-purple-100 text-purple-800' :
                                application?.currentStatus === 'APPLIED' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                    }`}>
                    {application?.currentStatus ? STATUS_LABELS[application.currentStatus] || application.currentStatus : '-'}
                </span>
            </div>

            {/* Application Details */}
            <div className="bg-white rounded-lg shadow mb-6">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Company</h3>
                        <p className="text-lg font-medium">{application?.hiringCompany || '-'}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Job Role</h3>
                        <p className="text-lg font-medium">{application?.jobRole || '-'}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Source</h3>
                        <p className="text-lg">{application?.source || '-'}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Applied Date</h3>
                        <p className="text-lg">
                            {application?.appliedDate ? new Date(application.appliedDate).toLocaleDateString() : '-'}
                        </p>
                    </div>
                    {application?.recruiterName && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Recruiter</h3>
                            <p className="text-lg">{application.recruiterName}</p>
                            {application.recruiterCompany && (
                                <p className="text-sm text-gray-500">{application.recruiterCompany}</p>
                            )}
                        </div>
                    )}
                    {application?.phone && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
                            <p className="text-lg">{application.phone}</p>
                        </div>
                    )}
                    {application?.email && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Email</h3>
                            <p className="text-lg">{application.email}</p>
                        </div>
                    )}
                    {getTechStackDisplay() && (
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Tech Stack</h3>
                            <p className="text-lg">{getTechStackDisplay()}</p>
                        </div>
                    )}
                    {application?.jdLink && (
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">JD Link</h3>
                            <a
                                href={application.jdLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                {application.jdLink}
                            </a>
                        </div>
                    )}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-sm font-medium text-gray-500">JD Received</h3>
                            <input
                                type="checkbox"
                                checked={application?.jdReceived || false}
                                onChange={(e) => handleJdReceivedToggle(e.target.checked)}
                                className="w-4 h-4 text-primary rounded"
                            />
                            <span className="text-sm text-gray-600">
                                {application?.jdReceived ? 'Yes' : 'No'}
                            </span>
                        </div>
                        
                        {application?.jdReceived && (
                            <div className="mt-3 space-y-3">
                                {/* JD File Upload/Display */}
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">JD File</span>
                                        <input
                                            type="file"
                                            ref={jdFileInputRef}
                                            onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                                            accept=".pdf,.doc,.docx,.txt"
                                            className="hidden"
                                            id="jd-file-upload"
                                        />
                                        <label
                                            htmlFor="jd-file-upload"
                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded cursor-pointer hover:bg-primary/90"
                                        >
                                            <Upload className="w-3 h-3" />
                                            Upload
                                        </label>
                                    </div>
                                    {application.jdFileName && application.jdFilePath && (
                                        <a
                                            href={`${API_URL.replace('/api', '')}/${application.jdFilePath}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
                                        >
                                            <FileText className="w-4 h-4" />
                                            <span>{application.jdFileName}</span>
                                        </a>
                                    )}
                                    {jdFile && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm text-gray-600">{jdFile.name}</span>
                                            <button
                                                onClick={handleJdFileUpload}
                                                disabled={isUploading}
                                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                            >
                                                {isUploading ? 'Uploading...' : 'Save'}
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

                                {/* JD Text */}
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700">Job Description</span>
                                        {!isEditingJd ? (
                                            <button
                                                onClick={() => setIsEditingJd(true)}
                                                className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                                            >
                                                <Edit className="w-3 h-3" />
                                                Edit
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={handleSaveJdText}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingJd(false);
                                                        setJdText(application.jdText || '');
                                                    }}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {isEditingJd ? (
                                        <textarea
                                            value={jdText}
                                            onChange={(e) => setJdText(e.target.value)}
                                            placeholder="Paste job description here..."
                                            rows={6}
                                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary resize-y"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                            {application.jdText || 'No job description added yet.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Applied</h3>
                        <p className="text-lg">{application?.applied ? 'Yes' : 'No'}</p>
                    </div>
                    {application?.resumeVersion && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Resume Version</h3>
                            <p className="text-lg">{application.resumeVersion}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${activeTab === 'notes'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Notes
                    </button>
                    <button
                        onClick={() => setActiveTab('interviews')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${activeTab === 'interviews'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Interviews
                    </button>

                    <button
                        onClick={() => setActiveTab('followups')}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${activeTab === 'followups'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Clock className="w-4 h-4" />
                        Follow-ups
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'interviews' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Scheduled Interviews</h3>
                                <button
                                    onClick={() => setShowAddEvent(!showAddEvent)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Add Interview
                                </button>
                            </div>

                            {/* Add Interview Form */}
                            {showAddEvent && (
                                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <h4 className="font-medium mb-3">Schedule Interview - Round {nextRound}</h4>
                                    {conflictError && (
                                        <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                            ⚠️ {conflictError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                            <input
                                                type="date"
                                                value={newEvent.date}
                                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                            <input
                                                type="time"
                                                value={newEvent.startTime}
                                                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                            <input
                                                type="time"
                                                value={newEvent.endTime}
                                                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <textarea
                                                value={newEvent.notes}
                                                onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                                                placeholder="Interview focus, preparation notes..."
                                                rows={2}
                                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleAddInterviewEvent}
                                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                        >
                                            Schedule Interview
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddEvent(false);
                                                setConflictError('');
                                            }}
                                            className="px-4 py-2 border border-border rounded-lg hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Interview Events List */}
                            {loadingEvents ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : interviewEvents.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No interviews scheduled yet</p>
                                    <p className="text-sm">Click "Add Interview" to schedule your first interview</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {interviewEvents.map((event: any) => (
                                        <div key={event.id} className="bg-white border border-border rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-lg">{event.title || `Round ${event.roundNumber}`}</span>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                            event.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                                                            event.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {event.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-gray-600 mt-1">
                                                        📅 {new Date(event.date).toLocaleDateString()}
                                                        {event.startTime && ` at ${event.startTime}`}
                                                        {event.endTime && ` - ${event.endTime}`}
                                                    </div>
                                                    {event.notes && (
                                                        <p className="text-sm text-gray-500 mt-2">{event.notes}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {event.status === 'SCHEDULED' && (
                                                        <button
                                                            onClick={() => handleMarkEventComplete(event.id)}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                                                            title="Mark Complete"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteEvent(event.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                />
                                <button
                                    onClick={handleAddNote}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                    Add Note
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(!application.notes || application.notes.length === 0) ? (
                                    <p className="text-gray-500 text-center py-4">No notes yet</p>
                                ) : (
                                    application.notes.map((note: any) => (
                                        <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <p className="text-gray-900">{note.content}</p>
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="text-gray-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {new Date(note.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {false && (
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newInterview.round_name}
                                    onChange={(e) => setNewInterview({ ...newInterview, round_name: e.target.value })}
                                    placeholder="Round (e.g., L1)"
                                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <input
                                    type="date"
                                    value={newInterview.scheduled_date}
                                    onChange={(e) => setNewInterview({ ...newInterview, scheduled_date: e.target.value })}
                                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <input
                                    type="time"
                                    value={newInterview.scheduled_time || ''}
                                    onChange={(e) => setNewInterview({ ...newInterview, scheduled_time: e.target.value })}
                                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <select
                                    value={newInterview.status}
                                    onChange={(e) => setNewInterview({ ...newInterview, status: e.target.value })}
                                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                >
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                <input
                                    type="text"
                                    value={newInterview.feedback}
                                    onChange={(e) => setNewInterview({ ...newInterview, feedback: e.target.value })}
                                    placeholder="Feedback"
                                    className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    onClick={handleAddInterview}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                    Add Interview
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(!application.interviews || application.interviews.length === 0) ? (
                                    <p className="text-gray-500 text-center py-4">No interviews yet</p>
                                ) : (
                                    application.interviews.map((interview: any) => (
                                        <div key={interview.id} className="p-4 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium">{interview.roundName || interview.round_name || 'Interview'}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Date: {interview.scheduledDate || interview.scheduled_date ? new Date(interview.scheduledDate || interview.scheduled_date).toLocaleDateString() : 'Not set'}
                                                        {interview.scheduledDate || interview.scheduled_date ? ' at ' + new Date(interview.scheduledDate || interview.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </p>
                                                    {interview.notes && (
                                                        <p className="text-sm mt-1">Notes: {interview.notes}</p>
                                                    )}
                                                    {interview.feedback && (
                                                        <p className="text-sm mt-1">Feedback: {interview.feedback}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 text-xs rounded ${interview.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                        interview.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {interview.status || 'SCHEDULED'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteInterview(interview.id)}
                                                        className="text-gray-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'followups' && (
                        <FollowUpTracker 
                            applicationId={id || ''} 
                            interviewProcessId={application?.interviewProcesses?.[0]?.id || null}
                            currentRound={application?.interviewProcesses?.[0]?.roundsCompleted || undefined}
                            onStatusChange={() => mutate()}
                        />
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={editForm.hiringCompany || ''}
                                        onChange={(e) => setEditForm({ ...editForm, hiringCompany: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={editForm.currentStatus || 'NEW_CALL'}
                                        onChange={(e) => setEditForm({ ...editForm, currentStatus: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
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
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
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
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Recruiter Company</label>
                                    <input
                                        type="text"
                                        value={editForm.recruiterCompany || ''}
                                        onChange={(e) => setEditForm({ ...editForm, recruiterCompany: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={editForm.phone || ''}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email || ''}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Applied</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={editForm.applied || false}
                                            onChange={(e) => setEditForm({ ...editForm, applied: e.target.checked })}
                                            className="w-4 h-4 text-primary"
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
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">JD Received</label>
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            checked={editForm.jdReceived || false}
                                            onChange={(e) => setEditForm({ ...editForm, jdReceived: e.target.checked })}
                                            className="w-4 h-4 text-primary"
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
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">JD Text</label>
                                    <textarea
                                        value={editForm.jdText || ''}
                                        onChange={(e) => setEditForm({ ...editForm, jdText: e.target.value })}
                                        placeholder="Paste job description here..."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary resize-y"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Resume Version</label>
                                    <input
                                        type="text"
                                        value={editForm.resumeVersion || ''}
                                        onChange={(e) => setEditForm({ ...editForm, resumeVersion: e.target.value })}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack (comma separated)</label>
                                    <input
                                        type="text"
                                        value={editForm.techStack || ''}
                                        onChange={(e) => setEditForm({ ...editForm, techStack: e.target.value })}
                                        placeholder="React, Node.js, PostgreSQL"
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 border border-border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            // Keep techStack as a string (comma-separated) for SQLite
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
