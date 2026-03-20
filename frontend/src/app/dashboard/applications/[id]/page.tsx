'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
    ArrowLeft,
    Trash2,
    Clock,
    MessageSquare,
    Calendar,
    Edit
} from 'lucide-react';
import { applicationsAPI, notesAPI, interviewsAPI, followupsAPI } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/utils';

const fetcher = (id: string) => applicationsAPI.getById(id).then((res) => res.data.data);

export default function ApplicationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data, error, mutate } = useSWR(id ? `/api/applications/${id}` : null, () => fetcher(id));

    const [activeTab, setActiveTab] = useState<'notes' | 'interviews' | 'followups'>('notes');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [newNote, setNewNote] = useState('');
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
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-1">JD Received</h3>
                        <p className="text-lg">{application?.jdReceived ? 'Yes' : 'No'}</p>
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

                    {activeTab === 'interviews' && (
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
                        <div>
                            <div className="space-y-3 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input
                                        type="date"
                                        value={newFollowup.follow_up_date}
                                        onChange={(e) => setNewFollowup({ ...newFollowup, follow_up_date: e.target.value })}
                                        className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                    <button
                                        onClick={handleAddFollowup}
                                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                    >
                                        Add Follow-up
                                    </button>
                                </div>
                                <textarea
                                    value={newFollowup.description}
                                    onChange={(e) => setNewFollowup({ ...newFollowup, description: e.target.value })}
                                    placeholder="Description (notes, reason for follow-up, etc.)"
                                    rows={3}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary resize-y min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-3">
                                {(!application.followups || application.followups.length === 0) ? (
                                    <p className="text-gray-500 text-center py-4">No follow-ups yet</p>
                                ) : (
                                    application.followups.map((followup: any) => (
                                        <div key={followup.id} className="p-4 bg-gray-50 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium">{followup.responseNotes || followup.description || 'No description'}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Due: {followup.followUpDate || followup.follow_up_date ? new Date(followup.followUpDate || followup.follow_up_date).toLocaleDateString() : 'Not set'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Type: {followup.followUpType || followup.follow_up_type || 'Email'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 text-xs rounded ${followup.responseStatus === 'RESPONDED' ? 'bg-green-100 text-green-800' :
                                                        followup.responseStatus === 'NO_RESPONSE' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {followup.responseStatus || 'PENDING'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteFollowup(followup.id)}
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
