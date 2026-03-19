'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    Upload,
    Link as LinkIcon,
    Check,
    X
} from 'lucide-react';
import Link from 'next/link';
import { applicationsAPI } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/utils';

const STATUSES = Object.keys(STATUS_LABELS);
const SOURCES = ['LinkedIn', 'Naukri', 'Indeed', 'Glassdoor', 'Company Website', 'Referral', 'Other'];

export default function NewApplicationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        recruiter_name: '',
        recruiter_company: '',
        hiring_company: '',
        phone: '',
        email: '',
        source: '',
        job_role: '',
        tech_stack: '',
        jd_received: false,
        jd_link: '',
        applied: false,
        applied_date: '',
        resume_version: '',
        current_status: 'New Call',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Convert snake_case to camelCase for API
        const apiData = {
            recruiterName: formData.recruiter_name || undefined,
            recruiterCompany: formData.recruiter_company || undefined,
            hiringCompany: formData.hiring_company || undefined,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            source: formData.source?.toUpperCase() || undefined,
            jobRole: formData.job_role || undefined,
            techStack: formData.tech_stack ? formData.tech_stack.split(',').map(s => s.trim()) : undefined,
            jdReceived: formData.jd_received,
            jdLink: formData.jd_link || undefined,
            applied: formData.applied,
            appliedDate: formData.applied_date || undefined,
            resumeVersion: formData.resume_version || undefined,
            currentStatus: formData.current_status?.toUpperCase().replace(/\s+/g, '_') || 'NEW_CALL',
        };

        try {
            await applicationsAPI.create(apiData);
            router.push('/dashboard/applications');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create application');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/applications"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold">New Application</h1>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow space-y-6">
                {/* Recruiter Information */}
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold mb-4">Recruiter Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Recruiter Name</label>
                            <input
                                type="text"
                                name="recruiter_name"
                                value={formData.recruiter_name}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Recruiter Company</label>
                            <input
                                type="text"
                                name="recruiter_company"
                                value={formData.recruiter_company}
                                onChange={handleChange}
                                className="width-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                placeholder="Google"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                placeholder="recruiter@company.com"
                            />
                        </div>
                    </div>
                </div>

                {/* Job Details */}
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold mb-4">Job Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Job Role *</label>
                            <input
                                type="text"
                                name="job_role"
                                value={formData.job_role}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                placeholder="Senior Software Engineer"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Hiring Company *</label>
                            <input
                                type="text"
                                name="hiring_company"
                                value={formData.hiring_company}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                placeholder="Google"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Source</label>
                            <select
                                name="source"
                                value={formData.source}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Select source</option>
                                {SOURCES.map(source => (
                                    <option key={source} value={source}>{source}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <select
                                name="current_status"
                                value={formData.current_status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                {STATUSES.map(status => (
                                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Tech Stack</label>
                            <textarea
                                name="tech_stack"
                                value={formData.tech_stack}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                placeholder="React, Node.js, PostgreSQL, AWS..."
                            />
                        </div>
                    </div>
                </div>

                {/* Application Details */}
                <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold mb-4">Application Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                name="jd_received"
                                id="jd_received"
                                checked={formData.jd_received}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                            />
                            <label htmlFor="jd_received" className="text-sm font-medium">JD Received</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                name="applied"
                                id="applied"
                                checked={formData.applied}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                            />
                            <label htmlFor="applied" className="text-sm font-medium">Applied</label>
                        </div>
                        {formData.jd_received && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">JD Link</label>
                                <input
                                    type="url"
                                    name="jd_link"
                                    value={formData.jd_link}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="https://..."
                                />
                            </div>
                        )}
                        {formData.applied && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Applied Date</label>
                                    <input
                                        type="date"
                                        name="applied_date"
                                        value={formData.applied_date}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Resume Version</label>
                                    <input
                                        type="text"
                                        name="resume_version"
                                        value={formData.resume_version}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                        placeholder="v1.0"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-6 flex justify-end gap-4">
                    <Link
                        href="/dashboard/applications"
                        className="px-4 py-2 border border-border rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Application
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
