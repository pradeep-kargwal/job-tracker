import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const token = localStorage.getItem('token');
            // Only redirect to login if there's actually a token and it's invalid
            if (token && error.response?.data?.message?.includes('Invalid')) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    register: (data: { email: string; password: string; name: string }) =>
        api.post('/auth/register', data),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
};

// Applications API
export const applicationsAPI = {
    getAll: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
        api.get('/applications', { params }),
    getById: (id: string) => api.get(`/applications/${id}`),
    create: (data: any) => api.post('/applications', data),
    update: (id: string, data: any) => api.put(`/applications/${id}`, data),
    updateStatus: (id: string, data: { currentStatus: string }) =>
        api.patch(`/applications/${id}/status`, data),
    delete: (id: string) => api.delete(`/applications/${id}`),
    getPipeline: () => api.get('/applications/pipeline'),
    uploadJdFile: (id: string, formData: FormData) =>
        api.post(`/applications/${id}/jd-upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

// Notes API
export const notesAPI = {
    getByApplication: (applicationId: string) =>
        api.get(`/applications/${applicationId}/notes`),
    create: (applicationId: string, data: { content: string; noteType?: string }) =>
        api.post(`/applications/${applicationId}/notes`, data),
    update: (id: string, data: { content: string; noteType?: string }) =>
        api.put(`/applications/notes/${id}`, data),
    delete: (id: string) => api.delete(`/applications/notes/${id}`),
};

// Interviews API
export const interviewsAPI = {
    getByApplication: (applicationId: string) =>
        api.get(`/applications/${applicationId}/interviews`),
    create: (applicationId: string, data: any) =>
        api.post(`/applications/${applicationId}/interviews`, data),
    update: (id: string, data: any) =>
        api.put(`/applications/interviews/${id}`, data),
    delete: (id: string) => api.delete(`/applications/interviews/${id}`),
};

// Follow-ups API
export const followupsAPI = {
    getByApplication: (applicationId: string) =>
        api.get(`/applications/${applicationId}/followups`),
    create: (applicationId: string, data: {
        title: string;
        description?: string;
        followUpDate: string;
        contextType?: string;
        priority?: string;
        interviewProcessId?: string;
        relatedRound?: number;
    }) => {
        console.log('API create followup:', { applicationId, data });
        return api.post(`/applications/${applicationId}/followups`, data);
    },
    update: (id: string, data: {
        title?: string;
        description?: string;
        followUpDate?: string;
        priority?: string;
        contextType?: string;
        relatedRound?: number;
    }) => api.put(`/applications/followups/${id}`, data),
    delete: (id: string) => api.delete(`/applications/followups/${id}`),
    markComplete: (id: string) => api.patch(`/applications/followups/${id}/complete`),
    snooze: (id: string, days: number) => api.patch(`/applications/followups/${id}/snooze`, { days }),
    getAll: () => api.get('/applications/followups/all'),
    getAllWithFilter: (params?: { status?: string; page?: number; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        return api.get(`/followups?${queryParams.toString()}`);
    },
};

// Resumes API
export const resumesAPI = {
    getAll: () => api.get('/resumes'),
    getById: (id: string) => api.get(`/resumes/${id}`),
    create: (data: any) => api.post('/resumes', data),
    upload: (formData: FormData) => api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id: string, data: any) => api.put(`/resumes/${id}`, data),
    delete: (id: string) => api.delete(`/resumes/${id}`),
};

// Analytics API
export const analyticsAPI = {
    getDashboard: () => api.get('/analytics/dashboard'),
    getAnalytics: () => api.get('/analytics'),
    getFunnel: () => api.get('/analytics/funnel'),
    getSources: () => api.get('/analytics/sources'),
    getTimeline: (period?: string) => api.get('/analytics/timeline', { params: { period } }),
    getComprehensive: () => api.get('/analytics/comprehensive'),
};

// AI API
export const aiAPI = {
    extractSkills: (jdText: string) =>
        api.post('/ai/extract-skills', { jdText }),
    generateEmail: (data: { recruiterName: string; companyName: string; jobRole: string; emailType: string }) =>
        api.post('/ai/generate-email', data),
    summarizeNotes: (notes: { content: string; createdAt: string }[]) =>
        api.post('/ai/summarize-notes', { notes }),
};

// Notifications API
export const notificationsAPI = {
    getAll: (unreadOnly?: boolean) =>
        api.get('/notifications', { params: { unreadOnly } }),
    markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
    delete: (id: string) => api.delete(`/notifications/${id}`),
};

// Interview Process API
export const interviewProcessAPI = {
    start: (data: { applicationId: string; totalRounds?: number }) =>
        api.post('/interview-process/start', data),
    getByApplication: (applicationId: string) =>
        api.get(`/interview-process/application/${applicationId}`),
    addRound: (data: { interviewProcessId: string; roundName?: string; scheduledDate?: string }) =>
        api.post('/interview-process/rounds', data),
    updateRound: (roundId: string, data: {
        status?: string;
        scheduledDate?: string;
        completedDate?: string;
        feedback?: string;
        rating?: number;
        notes?: string;
    }) => api.patch(`/interview-process/rounds/${roundId}`, data),
    updateWaitingState: (processId: string, data: { waitingState: string; nextAction?: string }) =>
        api.patch(`/interview-process/${processId}/waiting-state`, data),
    delete: (processId: string) => api.delete(`/interview-process/${processId}`),
    checkNoResponse: (days?: number) =>
        api.post('/interview-process/check-no-response', null, { params: { days } }),
};

// Backup API
export const backupAPI = {
    export: () => api.get('/backup/export'),
    import: (data: any, mode: string) => api.post('/backup/import', { data, mode }),
};

// Interview Events API - Unified system
export const interviewEventsAPI = {
    create: (data: {
        applicationId: string;
        roundNumber?: number;
        date: string;
        startTime?: string;
        endTime?: string;
        notes?: string;
        createdFrom?: string;
    }) => api.post('/interview-events', data),
    getByApplication: (applicationId: string) =>
        api.get(`/interview-events/application/${applicationId}`),
    getAll: (params?: { startDate?: string; endDate?: string }) =>
        api.get('/interview-events/all', { params }),
    getByDate: (date: string) =>
        api.get(`/interview-events/date/${date}`),
    getNextRound: (applicationId: string) =>
        api.get(`/interview-events/next-round/${applicationId}`),
    update: (id: string, data: {
        roundNumber?: number;
        date?: string;
        startTime?: string;
        endTime?: string;
        status?: string;
        notes?: string;
    }) => api.put(`/interview-events/${id}`, data),
    markComplete: (id: string) => api.patch(`/interview-events/${id}/complete`),
    delete: (id: string) => api.delete(`/interview-events/${id}`),
};

export default api;
