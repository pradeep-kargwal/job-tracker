import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
        }
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(date);
}

export const STATUS_LABELS: Record<string, string> = {
    NEW_CALL: 'New Call',
    JD_RECEIVED: 'JD Received',
    APPLIED: 'Applied',
    SHORTLISTED: 'Shortlisted',
    INTERVIEW_SCHEDULED: 'Interview Scheduled',
    INTERVIEW_COMPLETED: 'Interview Completed',
    OFFER: 'Offer',
    REJECTED: 'Rejected',
    ON_HOLD: 'On Hold',
};

export const STATUS_COLORS: Record<string, string> = {
    NEW_CALL: 'status-new_call',
    JD_RECEIVED: 'status-jd_received',
    APPLIED: 'status-applied',
    SHORTLISTED: 'status-shortlisted',
    INTERVIEW_SCHEDULED: 'status-interview_scheduled',
    INTERVIEW_COMPLETED: 'status-interview_completed',
    OFFER: 'status-offer',
    REJECTED: 'status-rejected',
    ON_HOLD: 'status-on_hold',
};

export const SOURCE_LABELS: Record<string, string> = {
    NAUKRI: 'Naukri',
    LINKEDIN: 'LinkedIn',
    INDEED: 'Indeed',
    INSTAHYRE: 'Instahyre',
    REFERRAL: 'Referral',
    COMPANY_WEBSITE: 'Company Website',
    OTHER: 'Other',
};

export const INTERVIEW_ROUNDS = [
    'HR',
    'L1',
    'L2',
    'L3',
    'Technical',
    'System Design',
    'Final',
];

export const FOLLOWUP_TYPES = [
    { value: 'EMAIL', label: 'Email' },
    { value: 'CALL', label: 'Call' },
    { value: 'LINKEDIN', label: 'LinkedIn' },
];
