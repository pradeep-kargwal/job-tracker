'use client';

import { useState, useEffect } from 'react';
import { 
    Play, 
    Plus, 
    Calendar, 
    CheckCircle, 
    XCircle, 
    Clock,
    AlertTriangle,
    ChevronRight,
    Star,
    Trash2
} from 'lucide-react';
import { interviewProcessAPI } from '@/lib/api';

interface Round {
    id: string;
    roundNumber: number;
    roundName: string | null;
    status: string;
    scheduledDate: string | null;
    completedDate: string | null;
    feedback: string | null;
    rating: number | null;
    notes: string | null;
}

interface InterviewProcess {
    id: string;
    applicationId: string;
    status: string;
    waitingState: string;
    roundsCompleted: number;
    totalRounds: number | null;
    lastActivityDate: string | null;
    nextAction: string | null;
    rounds: Round[];
}

interface InterviewTrackerProps {
    applicationId: string;
    onStatusChange?: (status: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
    NOT_STARTED: 'Not Started',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed'
};

const WAITING_STATE_LABELS: Record<string, string> = {
    NONE: 'None',
    AWAITING_INTERVIEW: 'Waiting for Interview',
    AWAITING_NEXT_ROUND: 'Waiting for Next Round',
    AWAITING_FEEDBACK: 'Waiting for Feedback',
    NO_RESPONSE: 'No Response from Recruiter'
};

const ROUND_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    NOT_SCHEDULED: { label: 'Not Scheduled', color: 'text-gray-600', bg: 'bg-gray-100' },
    SCHEDULED: { label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100' },
    COMPLETED: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
    CANCELLED: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' }
};

export default function InterviewTracker({ applicationId, onStatusChange }: InterviewTrackerProps) {
    const [process, setProcess] = useState<InterviewProcess | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddRound, setShowAddRound] = useState(false);
    const [newRoundName, setNewRoundName] = useState('');
    const [newRoundDate, setNewRoundDate] = useState('');
    const [newRoundTime, setNewRoundTime] = useState('10:00');
    const [editingRound, setEditingRound] = useState<string | null>(null);
    const [roundFeedback, setRoundFeedback] = useState('');
    const [roundRating, setRoundRating] = useState(0);

    useEffect(() => {
        loadProcess();
    }, [applicationId]);

    const loadProcess = async () => {
        try {
            setLoading(true);
            const response = await interviewProcessAPI.getByApplication(applicationId);
            setProcess(response.data.data);
        } catch (err: any) {
            if (err.response?.status !== 404) {
                setError('Failed to load interview process');
            }
        } finally {
            setLoading(false);
        }
    };

    const startProcess = async () => {
        try {
            const response = await interviewProcessAPI.start({ applicationId });
            setProcess(response.data.data);
            onStatusChange?.('INTERVIEW_IN_PROGRESS');
        } catch (err) {
            setError('Failed to start interview process');
        }
    };

    const addRound = async () => {
        if (!process) return;
        try {
            let scheduledDateTime = '';
            if (newRoundDate && newRoundTime) {
                scheduledDateTime = `${newRoundDate}T${newRoundTime}:00`;
            }
            const response = await interviewProcessAPI.addRound({
                interviewProcessId: process.id,
                roundName: newRoundName || undefined,
                scheduledDate: scheduledDateTime || undefined
            });
            setProcess(response.data.data);
            setShowAddRound(false);
            setNewRoundName('');
            setNewRoundDate('');
            setNewRoundTime('10:00');
        } catch (err) {
            setError('Failed to add round');
        }
    };

    const completeRound = async (roundId: string) => {
        try {
            const response = await interviewProcessAPI.updateRound(roundId, {
                status: 'COMPLETED',
                completedDate: new Date().toISOString(),
                feedback: roundFeedback || undefined,
                rating: roundRating || undefined
            });
            setProcess(response.data.data);
            setEditingRound(null);
            setRoundFeedback('');
            setRoundRating(0);
        } catch (err) {
            setError('Failed to complete round');
        }
    };

    const scheduleRound = async (roundId: string, date: string, time?: string) => {
        try {
            let scheduledDateTime = date;
            if (time) {
                scheduledDateTime = `${date}T${time}:00`;
            }
            const response = await interviewProcessAPI.updateRound(roundId, {
                status: 'SCHEDULED',
                scheduledDate: scheduledDateTime
            });
            setProcess(response.data.data);
        } catch (err) {
            setError('Failed to schedule round');
        }
    };

    const deleteProcess = async () => {
        if (!process || !confirm('Are you sure you want to delete the interview process?')) return;
        try {
            await interviewProcessAPI.delete(process.id);
            setProcess(null);
            onStatusChange?.('');
        } catch (err) {
            setError('Failed to delete process');
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-gray-100 h-48 rounded-lg"></div>;
    }

    if (!process) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Interview Process</h3>
                </div>
                <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No interview process started yet</p>
                    <button
                        onClick={startProcess}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        <Play className="w-4 h-4" />
                        Start Interview Process
                    </button>
                </div>
            </div>
        );
    }

    const progress = process.totalRounds 
        ? `${process.roundsCompleted}/${process.totalRounds} rounds completed`
        : `${process.roundsCompleted || 0} rounds completed`;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold">Interview Process</h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            process.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            process.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {STATUS_LABELS[process.status]}
                        </span>
                        <span className="text-sm text-gray-500">{progress}</span>
                    </div>
                </div>
                <button
                    onClick={deleteProcess}
                    className="p-2 text-gray-400 hover:text-red-600"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Waiting State */}
            {process.waitingState !== 'NONE' && (
                <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 ${
                    process.waitingState === 'NO_RESPONSE' ? 'bg-red-50 text-red-700' :
                    process.waitingState === 'AWAITING_FEEDBACK' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-blue-50 text-blue-700'
                }`}>
                    {process.waitingState === 'NO_RESPONSE' ? (
                        <AlertTriangle className="w-4 h-4" />
                    ) : (
                        <Clock className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">{WAITING_STATE_LABELS[process.waitingState]}</span>
                    {process.nextAction && (
                        <span className="text-sm ml-2">- {process.nextAction}</span>
                    )}
                </div>
            )}

            {/* Rounds Timeline */}
            <div className="space-y-3">
                {(process.rounds || []).map((round, index) => (
                    <div key={round.id} className="flex gap-3">
                        {/* Timeline connector */}
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                round.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                                round.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-600' :
                                'bg-gray-100 text-gray-400'
                            }`}>
                                {round.status === 'COMPLETED' ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : round.status === 'CANCELLED' ? (
                                    <XCircle className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs font-medium">{round.roundNumber}</span>
                                )}
                            </div>
                            {index < process.rounds.length - 1 && (
                                <div className="w-0.5 h-8 bg-gray-200"></div>
                            )}
                        </div>

                        {/* Round content */}
                        <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-medium">{round.roundName || `Round ${round.roundNumber}`}</span>
                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${ROUND_STATUS_LABELS[round.status].bg} ${ROUND_STATUS_LABELS[round.status].color}`}>
                                        {ROUND_STATUS_LABELS[round.status].label}
                                    </span>
                                </div>
                                {round.scheduledDate && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(round.scheduledDate).toLocaleString('en-US', { 
                                            dateStyle: 'medium', 
                                            timeStyle: 'short' 
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Round actions */}
                            <div className="mt-2 flex gap-2">
                                {round.status === 'NOT_SCHEDULED' && (
                                    <button
                                        onClick={() => {
                                            const date = prompt('Enter interview date (YYYY-MM-DD):');
                                            const time = prompt('Enter interview time (HH:MM):', '10:00');
                                            if (date && time) scheduleRound(round.id, date, time);
                                        }}
                                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                    >
                                        Schedule
                                    </button>
                                )}
                                {round.status === 'SCHEDULED' && (
                                    <button
                                        onClick={() => setEditingRound(round.id)}
                                        className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                                    >
                                        Mark Complete
                                    </button>
                                )}
                            </div>

                            {/* Complete round form */}
                            {editingRound === round.id && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                    <textarea
                                        placeholder="Feedback (optional)"
                                        value={roundFeedback}
                                        onChange={(e) => setRoundFeedback(e.target.value)}
                                        className="w-full p-2 text-sm border rounded mb-2"
                                        rows={2}
                                    />
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm">Rating:</span>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setRoundRating(star)}
                                                className={`p-1 ${roundRating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                                            >
                                                <Star className="w-4 h-4 fill-current" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => completeRound(round.id)}
                                            className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                            Confirm Complete
                                        </button>
                                        <button
                                            onClick={() => setEditingRound(null)}
                                            className="text-xs px-3 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Show completed feedback */}
                            {round.status === 'COMPLETED' && (round.feedback || round.rating) && (
                                <div className="mt-2 text-sm text-gray-600">
                                    {round.rating && (
                                        <div className="flex items-center gap-1 mb-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star 
                                                    key={star} 
                                                    className={`w-3 h-3 ${star <= round.rating! ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {round.feedback && <p>{round.feedback}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Round */}
            {showAddRound ? (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <input
                        type="text"
                        placeholder="Round name (e.g., Technical, HR)"
                        value={newRoundName}
                        onChange={(e) => setNewRoundName(e.target.value)}
                        className="w-full p-2 text-sm border rounded mb-2"
                    />
                    <div className="flex gap-2 mb-2">
                        <input
                            type="date"
                            value={newRoundDate}
                            onChange={(e) => setNewRoundDate(e.target.value)}
                            className="flex-1 p-2 text-sm border rounded"
                        />
                        <input
                            type="time"
                            value={newRoundTime}
                            onChange={(e) => setNewRoundTime(e.target.value)}
                            className="flex-1 p-2 text-sm border rounded"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={addRound}
                            className="text-xs px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
                        >
                            Add Round
                        </button>
                        <button
                            onClick={() => setShowAddRound(false)}
                            className="text-xs px-3 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddRound(true)}
                    className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-primary hover:text-primary flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Round
                </button>
            )}
        </div>
    );
}
