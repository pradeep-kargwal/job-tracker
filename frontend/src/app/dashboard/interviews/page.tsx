'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Building,
    Briefcase,
    Check,
    X,
    Trash2,
    Search,
    ChevronDown,
    ChevronUp,
    CalendarDays,
    Building2,
    CheckCircle,
    Clock as ClockIcon,
    Circle
} from 'lucide-react';
import { interviewEventsAPI, applicationsAPI } from '@/lib/api';

interface InterviewEvent {
    id: string;
    applicationId: string;
    roundNumber: number;
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    notes: string | null;
    application?: {
        id: string;
        hiringCompany: string;
        jobRole: string;
    };
}

interface Application {
    id: string;
    hiringCompany: string;
    jobRole: string;
    recruiterName?: string;
    phone?: string;
    email?: string;
    recruiterCompany?: string;
    source?: string;
    techStack?: string;
}

type ViewMode = 'date' | 'application';

export default function InterviewsCalendarPage() {
    const [events, setEvents] = useState<InterviewEvent[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedApplication, setSelectedApplication] = useState('');
    const [conflictError, setConflictError] = useState('');
    const [nextRound, setNextRound] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');

    // UI State
    const [calendarExpanded, setCalendarExpanded] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('date');
    const [selectedDateForView, setSelectedDateForView] = useState<string | null>(null);
    const [selectedAppForView, setSelectedAppForView] = useState<Application | null>(null);

    // Form state
    const [newEvent, setNewEvent] = useState({
        date: '',
        startTime: '',
        endTime: '',
        roundNumber: 1,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Get first and last day of current month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const startDate = new Date(year, month, 1).toISOString();
            const endDate = new Date(year, month + 1, 0).toISOString();

            const [eventsRes, appsRes] = await Promise.all([
                interviewEventsAPI.getAll({ startDate, endDate }),
                applicationsAPI.getAll({ page: 1, limit: 100 })
            ]);

            setEvents(eventsRes.data.data || []);
            setApplications(appsRes.data.data || []);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get all events for a specific date
    const getEventsForDate = (dateStr: string) => {
        return events.filter(e => {
            // Use local date to match user's timezone
            const eventDate = new Date(e.date).toLocaleDateString('en-CA');
            return eventDate === dateStr;
        });
    };

    // Get event count per day for the month
    const getEventCountForDay = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return getEventsForDate(dateStr).length;
    };

    // Get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days: (number | null)[] = [];
        
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    // Filtered events for selected date
    const selectedDateEvents = useMemo(() => {
        if (!selectedDateForView) return [];
        return getEventsForDate(selectedDateForView);
    }, [selectedDateForView, events]);

    // Filtered events for selected application
    const selectedAppEvents = useMemo(() => {
        if (!selectedAppForView) return [];
        return events
            .filter(e => e.applicationId === selectedAppForView.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [selectedAppForView, events]);

    // Filtered applications for search
    const filteredApplications = useMemo(() => {
        if (!searchQuery) return applications;
        const searchLower = searchQuery.toLowerCase();
        return applications.filter((app: Application) =>
            app.recruiterName?.toLowerCase().includes(searchLower) ||
            app.hiringCompany?.toLowerCase().includes(searchLower) ||
            app.jobRole?.toLowerCase().includes(searchLower) ||
            app.phone?.toLowerCase().includes(searchLower) ||
            app.email?.toLowerCase().includes(searchLower)
        );
    }, [applications, searchQuery]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDayClick = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setNewEvent({ ...newEvent, date: dateStr, startTime: '', endTime: '', roundNumber: nextRound || 1, notes: '' });
        setSelectedApplication('');
        setSearchQuery('');
        setViewMode('date');
        setSelectedDateForView(dateStr);
        setShowAddModal(true);
    };

    const handleApplicationSelect = async (appId: string) => {
        setSelectedApplication(appId);
        if (appId) {
            try {
                const res = await interviewEventsAPI.getNextRound(appId);
                setNextRound(res.data.data?.nextRound || 1);
                setNewEvent({ ...newEvent, roundNumber: res.data.data?.nextRound || 1 });
            } catch (err) {
                console.error('Failed to get next round:', err);
            }
        }
    };

    const handleAddEvent = async () => {
        if (!newEvent.date || !selectedApplication) {
            alert('Please select a date and application');
            return;
        }
        setConflictError('');

        try {
            const response = await interviewEventsAPI.create({
                applicationId: selectedApplication,
                roundNumber: newEvent.roundNumber,
                date: newEvent.date,
                startTime: newEvent.startTime || undefined,
                endTime: newEvent.endTime || undefined,
                notes: newEvent.notes || undefined,
                createdFrom: 'CALENDAR_PAGE'
            });

            if (response.data.conflict) {
                setConflictError('You already have an interview at this time!');
                return;
            }

            setShowAddModal(false);
            setNewEvent({ date: '', startTime: '', endTime: '', roundNumber: 1, notes: '' });
            setSelectedDate('');
            setSelectedApplication('');
            loadData();
            
            // Refresh selected view
            if (viewMode === 'date' && selectedDateForView) {
                setSelectedDateForView(selectedDateForView);
            }
        } catch (err: any) {
            if (err.response?.data?.conflict) {
                setConflictError(err.response.data.message);
            } else {
                alert(err.response?.data?.message || 'Failed to add interview');
            }
        }
    };

    const handleMarkComplete = async (eventId: string) => {
        try {
            await interviewEventsAPI.markComplete(eventId);
            loadData();
        } catch (err) {
            alert('Failed to mark interview as complete');
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm('Delete this interview?')) return;
        try {
            await interviewEventsAPI.delete(eventId);
            loadData();
        } catch (err) {
            alert('Failed to delete interview');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-700 border-green-200';
            case 'SCHEDULED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'SCHEDULED': return <ClockIcon className="w-4 h-4 text-blue-600" />;
            default: return <Circle className="w-4 h-4 text-gray-400" />;
        }
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = getDaysInMonth(currentDate);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
                            <p className="text-gray-600">Manage your interview schedule</p>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                        >
                            <Plus className="w-5 h-5" />
                            Schedule Interview
                        </button>
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setViewMode('date')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                viewMode === 'date' 
                                    ? 'bg-primary text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <CalendarDays className="w-4 h-4" />
                            Date View
                        </button>
                        <button
                            onClick={() => setViewMode('application')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                viewMode === 'application' 
                                    ? 'bg-primary text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <Building2 className="w-4 h-4" />
                            Application View
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {viewMode === 'date' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Calendar Section */}
                        <div className="lg:col-span-1">
                            {/* Calendar Card */}
                            <div className="bg-white rounded-lg shadow">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between p-4 border-b">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h2 className="text-lg font-semibold">
                                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </h2>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Expand/Collapse */}
                                <div className="border-b px-4 py-2">
                                    <button
                                        onClick={() => setCalendarExpanded(!calendarExpanded)}
                                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
                                    >
                                        {calendarExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        {calendarExpanded ? 'Collapse' : 'Expand'} Calendar
                                    </button>
                                </div>

                                {/* Day Names */}
                                <div className="grid grid-cols-7 border-b">
                                    {dayNames.map(day => (
                                        <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                {calendarExpanded && (
                                    <div className="grid grid-cols-7">
                                        {days.map((day, index) => {
                                            const eventCount = day ? getEventCountForDay(day) : null;
                                            const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
                                            const isSelected = dateStr === selectedDateForView;
                                            
                                            return (
                                                <div
                                                    key={index}
                                                    className={`min-h-[60px] border-b border-r p-1 ${day ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'}`}
                                                    onClick={() => {
                                                        if (day && dateStr) {
                                                            handleDayClick(day);
                                                            setSelectedDateForView(dateStr);
                                                        }
                                                    }}
                                                >
                                                    {day && (
                                                        <div className={`text-sm font-medium ${isSelected ? 'bg-primary text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-gray-700'}`}>
                                                            {day}
                                                        </div>
                                                    )}
                                                    {day && eventCount && eventCount > 0 && (
                                                        <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block ${
                                                            isSelected ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {eventCount}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-white rounded-lg shadow mt-4 p-4">
                                <h3 className="font-medium text-gray-700 mb-3">This Month</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {events.filter(e => e.status === 'SCHEDULED').length}
                                        </div>
                                        <div className="text-xs text-blue-600">Scheduled</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3">
                                        <div className="text-2xl font-bold text-green-600">
                                            {events.filter(e => e.status === 'COMPLETED').length}
                                        </div>
                                        <div className="text-xs text-green-600">Completed</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Date View Content */}
                        <div className="lg:col-span-2">
                            {selectedDateForView ? (
                                <div className="bg-white rounded-lg shadow">
                                    {/* Sticky Header */}
                                    <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-xl font-semibold">
                                                📅 {formatDate(selectedDateForView)}
                                            </h2>
                                            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                                {selectedDateEvents.length} Interview{selectedDateEvents.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Interview Cards */}
                                    <div className="p-6">
                                        {loading ? (
                                            <div className="flex justify-center py-8">
                                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : selectedDateEvents.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="text-4xl mb-3">🎯</div>
                                                <p className="text-gray-500">No interviews scheduled</p>
                                                <p className="text-sm text-gray-400">You are free!</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {selectedDateEvents.map(event => (
                                                    <div key={event.id} className={`border rounded-lg p-4 ${getStatusColor(event.status)}`}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    {getStatusIcon(event.status)}
                                                                    <span className="font-semibold text-lg">
                                                                        Round {event.roundNumber}
                                                                    </span>
                                                                    <span className="text-sm opacity-75">
                                                                        {event.application?.hiringCompany || 'Company'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm mt-1 opacity-75">
                                                                    {event.application?.jobRole}
                                                                </div>
                                                                {event.startTime && (
                                                                    <div className="flex items-center gap-1 mt-2 text-sm">
                                                                        <Clock className="w-4 h-4" />
                                                                        {event.startTime}
                                                                        {event.endTime && ` → ${event.endTime}`}
                                                                    </div>
                                                                )}
                                                                {event.notes && (
                                                                    <p className="text-sm mt-2 opacity-75">{event.notes}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {event.status === 'SCHEDULED' && (
                                                                    <button
                                                                        onClick={() => handleMarkComplete(event.id)}
                                                                        className="p-2 bg-white/50 hover:bg-white rounded-lg"
                                                                        title="Mark Complete"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                <Link
                                                                    href={`/dashboard/applications/${event.applicationId}`}
                                                                    className="p-2 bg-white/50 hover:bg-white rounded-lg"
                                                                    title="View Application"
                                                                >
                                                                    <Briefcase className="w-4 h-4" />
                                                                </Link>
                                                                <button
                                                                    onClick={() => handleDeleteEvent(event.id)}
                                                                    className="p-2 bg-white/50 hover:bg-red-100 rounded-lg"
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
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow p-12 text-center">
                                    <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 text-lg">Select a date to view interviews</p>
                                    <p className="text-gray-400 text-sm">Click on any date in the calendar</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Application View */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Application Search */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow p-4">
                                <h3 className="font-semibold mb-3">Search Applications</h3>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by company or role..."
                                        className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                
                                <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2">
                                    {filteredApplications.length === 0 ? (
                                        <p className="text-gray-500 text-sm text-center py-4">No applications found</p>
                                    ) : (
                                        filteredApplications.map(app => {
                                            const appEventCount = events.filter(e => e.applicationId === app.id).length;
                                            return (
                                                <button
                                                    key={app.id}
                                                    onClick={() => setSelectedAppForView(app)}
                                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                                        selectedAppForView?.id === app.id 
                                                            ? 'bg-primary/10 border-primary' 
                                                            : 'hover:bg-gray-50 border-border'
                                                    }`}
                                                >
                                                    <div className="font-medium">{app.hiringCompany || 'Unknown'}</div>
                                                    <div className="text-sm text-gray-500">{app.jobRole || 'No role'}</div>
                                                    {appEventCount > 0 && (
                                                        <div className="text-xs text-primary mt-1">
                                                            {appEventCount} interview{appEventCount !== 1 ? 's' : ''}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Application Timeline */}
                        <div className="lg:col-span-2">
                            {selectedAppForView ? (
                                <div className="bg-white rounded-lg shadow">
                                    {/* Sticky Header */}
                                    <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h2 className="text-xl font-semibold">
                                                    🏢 {selectedAppForView.hiringCompany || 'Company'}
                                                </h2>
                                                <p className="text-gray-500">{selectedAppForView.jobRole}</p>
                                            </div>
                                            <Link
                                                href={`/dashboard/applications/${selectedAppForView.id}`}
                                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                            >
                                                View Application
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="p-6">
                                        {selectedAppEvents.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="text-4xl mb-3">📅</div>
                                                <p className="text-gray-500">No interviews scheduled</p>
                                                <p className="text-sm text-gray-400">Click "Schedule Interview" to add one</p>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                {/* Timeline Line */}
                                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                                                <div className="space-y-6">
                                                    {selectedAppEvents.map((event, index) => (
                                                        <div key={event.id} className="relative flex gap-4">
                                                            {/* Timeline Dot */}
                                                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                                                                event.status === 'COMPLETED' 
                                                                    ? 'bg-green-500 text-white' 
                                                                    : event.status === 'SCHEDULED'
                                                                        ? 'bg-blue-500 text-white'
                                                                        : 'bg-gray-300 text-white'
                                                            }`}>
                                                                {event.status === 'COMPLETED' ? (
                                                                    <Check className="w-4 h-4" />
                                                                ) : event.status === 'SCHEDULED' ? (
                                                                    <ClockIcon className="w-4 h-4" />
                                                                ) : (
                                                                    <Circle className="w-3 h-3" />
                                                                )}
                                                            </div>

                                                            {/* Content Card */}
                                                            <div className={`flex-1 border rounded-lg p-4 ${getStatusColor(event.status)}`}>
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="font-semibold">
                                                                            Round {event.roundNumber}
                                                                            {event.title && ` - ${event.title.split(' - ')[1] || ''}`}
                                                                        </div>
                                                                        <div className="text-sm flex items-center gap-2 mt-1 opacity-75">
                                                                            <CalendarIcon className="w-4 h-4" />
                                                                            {new Date(event.date).toLocaleDateString('en-US', { 
                                                                                month: 'short', day: 'numeric', year: 'numeric' 
                                                                            })}
                                                                            {event.startTime && (
                                                                                <>
                                                                                    <span>at</span>
                                                                                    <Clock className="w-4 h-4" />
                                                                                    {event.startTime}
                                                                                    {event.endTime && ` - ${event.endTime}`}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        {event.status === 'SCHEDULED' && (
                                                                            <button
                                                                                onClick={() => handleMarkComplete(event.id)}
                                                                                className="p-1.5 bg-white/50 hover:bg-white rounded"
                                                                                title="Mark Complete"
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleDeleteEvent(event.id)}
                                                                            className="p-1.5 bg-white/50 hover:bg-red-100 rounded"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {event.notes && (
                                                                    <p className="text-sm mt-2 opacity-75">{event.notes}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow p-12 text-center">
                                    <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-500 text-lg">Select an application</p>
                                    <p className="text-gray-400 text-sm">Search and select to view interview history</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add Interview Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold">Schedule Interview</h2>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setConflictError('');
                                        setSelectedDate('');
                                        setSelectedApplication('');
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {conflictError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
                                    ⚠️ {conflictError}
                                </div>
                            )}

                            {/* Date Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    value={newEvent.date}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedDate(val);
                                        setNewEvent({ ...newEvent, date: val });
                                    }}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                {selectedDate && <p className="text-xs text-green-600 mt-1">✓ Date selected: {selectedDate}</p>}
                            </div>

                            {/* Application Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Application *</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search applications..."
                                        className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                {searchQuery && (
                                    <div className="mt-2 border border-border rounded-lg max-h-40 overflow-y-auto">
                                        {filteredApplications.length === 0 ? (
                                            <div className="p-3 text-gray-500 text-sm">No applications found</div>
                                        ) : (
                                            filteredApplications.map((app: Application) => (
                                                <button
                                                    key={app.id}
                                                    onClick={() => handleApplicationSelect(app.id)}
                                                    className={`w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 ${
                                                        selectedApplication === app.id ? 'bg-primary/10' : ''
                                                    }`}
                                                >
                                                    <div className="font-medium">{app.hiringCompany || 'Unknown'}</div>
                                                    <div className="text-sm text-gray-500">{app.jobRole || 'No role'}</div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                                {selectedApplication && (
                                    <div className="mt-2 p-2 bg-green-50 text-green-700 rounded-lg text-sm">
                                        ✓ Selected: {applications.find((a: Application) => a.id === selectedApplication)?.hiringCompany}
                                    </div>
                                )}
                            </div>

                            {/* Round Number */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Round</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newEvent.roundNumber}
                                    onChange={(e) => setNewEvent({ ...newEvent, roundNumber: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                                <p className="text-xs text-gray-500 mt-1">Suggested: Round {nextRound}</p>
                            </div>

                            {/* Time Selection */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
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
                            </div>

                            {/* Notes */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={newEvent.notes}
                                    onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                                    placeholder="Interview focus, preparation notes..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleAddEvent}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                                >
                                    Schedule Interview
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setConflictError('');
                                    }}
                                    className="px-4 py-2 border border-border rounded-lg hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
