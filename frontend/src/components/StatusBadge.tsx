'use client';

interface StatusBadgeProps {
    status: string;
    computedStatus?: string;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, computedStatus, size = 'sm' }: StatusBadgeProps) {
    const getStatusConfig = (s: string) => {
        const resolvedStatus = computedStatus || s;
        
        switch (resolvedStatus) {
            case 'COMPLETED':
                return { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
            case 'DUE':
                return { label: 'Due Today', bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' };
            case 'MISSED':
                return { label: 'Overdue', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
            case 'UPCOMING':
                return { label: 'Pending', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
            default:
                return { label: 'Pending', bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
        }
    };

    const config = getStatusConfig(status);

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full ${config.bg} ${config.text} ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
        </span>
    );
}
