import { Request } from 'express';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name?: string;
    };
}

export interface JWTPayload {
    userId: string;
    email: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export type ApplicationStatus =
    | 'new_call'
    | 'jd_received'
    | 'applied'
    | 'shortlisted'
    | 'interview_scheduled'
    | 'interview_completed'
    | 'offer'
    | 'rejected'
    | 'on_hold';

export type NoteType = 'call' | 'general' | 'followup' | 'feedback';

export type Source = 'Naukri' | 'LinkedIn' | 'Indeed' | 'Instahyre' | 'Referral' | 'Company Website' | 'Other';

export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type FollowUpType = 'email' | 'call' | 'linkedin';

export type ResponseStatus = 'pending' | 'responded' | 'no_response';

export const STATUS_ORDER: ApplicationStatus[] = [
    'new_call',
    'jd_received',
    'applied',
    'shortlisted',
    'interview_scheduled',
    'interview_completed',
    'offer',
    'rejected',
    'on_hold'
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
    new_call: 'New Call',
    jd_received: 'JD Received',
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview Scheduled',
    interview_completed: 'Interview Completed',
    offer: 'Offer',
    rejected: 'Rejected',
    on_hold: 'On Hold'
};
