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
    create: (applicationId: string, data: any) =>
        api.post(`/applications/${applicationId}/followups`, data),
    update: (id: string, data: any) =>
        api.put(`/applications/followups/${id}`, data),
    delete: (id: string) => api.delete(`/applications/followups/${id}`),
    getDue: () => api.get('/followups/due'),
    addHistory: (id: string, data: any) =>
        api.post(`/applications/followups/${id}/history`, data),
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
    getTimeline: () => api.get('/analytics/timeline'),
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

export default api;
