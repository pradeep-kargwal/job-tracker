'use client';

import { useState } from 'react';
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
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { applicationsAPI } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

const STATUS_ORDER = [
    'NEW_CALL',
    'JD_RECEIVED',
    'APPLIED',
    'SHORTLISTED',
    'INTERVIEW_SCHEDULED',
    'INTERVIEW_COMPLETED',
    'OFFER',
    'REJECTED',
    'ON_HOLD',
];

const STATUS_COLORS: Record<string, string> = {
    NEW_CALL: 'bg-indigo-100 border-indigo-300',
    JD_RECEIVED: 'bg-violet-100 border-violet-300',
    APPLIED: 'bg-sky-100 border-sky-300',
    SHORTLISTED: 'bg-teal-100 border-teal-300',
    INTERVIEW_SCHEDULED: 'bg-amber-100 border-amber-300',
    INTERVIEW_COMPLETED: 'bg-emerald-100 border-emerald-300',
    OFFER: 'bg-green-100 border-green-300',
    REJECTED: 'bg-red-100 border-red-300',
    ON_HOLD: 'bg-gray-100 border-gray-300',
};

const fetcher = () => applicationsAPI.getPipeline().then((res) => res.data);

function KanbanCard({ application, onClick }: { application: any; onClick: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: application.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`kanban-card ${isDragging ? 'dragging opacity-50' : ''}`}
        >
            <div className="font-medium text-text-primary text-sm truncate">
                {application.jobRole || 'Untitled'}
            </div>
            <div className="text-xs text-text-secondary truncate mt-1">
                {application.hiringCompany || 'Unknown Company'}
            </div>
            <div className="text-xs text-text-secondary mt-2">
                {formatRelativeTime(application.updatedAt)}
            </div>
        </div>
    );
}

function KanbanColumn({
    status,
    applications,
    onCardClick,
}: {
    status: string;
    applications: any[];
    onCardClick: (id: string) => void;
}) {
    return (
        <div className="flex-1 min-w-[280px]">
            <div className={`p-3 rounded-t-lg border-b-2 ${STATUS_COLORS[status]}`}>
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary text-sm">
                        {STATUS_LABELS[status] || status}
                    </h3>
                    <span className="text-xs bg-white px-2 py-1 rounded-full">
                        {applications.length}
                    </span>
                </div>
            </div>
            <div className="bg-gray-50 p-2 rounded-b-lg min-h-[200px]">
                <SortableContext
                    items={applications.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {applications.map((app) => (
                            <KanbanCard
                                key={app.id}
                                application={app}
                                onClick={() => onCardClick(app.id)}
                            />
                        ))}
                    </div>
                </SortableContext>
                {applications.length === 0 && (
                    <div className="text-center py-8 text-text-secondary text-sm">
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

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const activeApp = Object.values(data?.data || {})
            .flat()
            .find((a: any) => a.id === active.id);

        if (!activeApp) return;

        // Find which column the card was dropped into
        let newStatus: string | null = null;
        for (const status of STATUS_ORDER) {
            const apps = data?.data?.[status] || [];
            if (apps.some((a: any) => a.id === over.id)) {
                newStatus = status;
                break;
            }
        }

        if (!newStatus) {
            // Dropped on empty column - find based on position
            const overRect = document.elementFromPoint(
                event.activatorEvent instanceof MouseEvent ? (event.activatorEvent as MouseEvent).clientX : 0,
                event.activatorEvent instanceof MouseEvent ? (event.activatorEvent as MouseEvent).clientY : 0
            );
            // Simplified: just keep current status if can't determine
            newStatus = activeApp.currentStatus;
        }

        if (newStatus && newStatus !== activeApp.currentStatus) {
            try {
                await applicationsAPI.updateStatus(activeApp.id, { currentStatus: newStatus });
                mutate('/pipeline');
            } catch (error) {
                console.error('Failed to update status:', error);
            }
        }

        setActiveId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const pipeline = data?.data || {};

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Pipeline</h1>
                    <p className="text-text-secondary">Drag and drop to update status</p>
                </div>
                <Link
                    href="/dashboard/applications/new"
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                    Add Application
                </Link>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={(event) => setActiveId(event.active.id as string)}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {STATUS_ORDER.map((status) => (
                        <KanbanColumn
                            key={status}
                            status={status}
                            applications={pipeline[status] || []}
                            onCardClick={(id) => {
                                window.location.href = `/dashboard/applications/${id}`;
                            }}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activeId && (
                        <div className="kanban-card opacity-80 rotate-3">
                            Dragging...
                        </div>
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
