'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Save,
    ChevronDown,
    ChevronUp,
    X,
    Plus,
    Calendar,
    Clock,
    Bell,
    Users,
    Briefcase,
    Building2,
    Link2,
    Sparkles,
    Check
} from 'lucide-react';
import Link from 'next/link';
import { applicationsAPI, interviewEventsAPI, followupsAPI } from '@/lib/api';
import { STATUS_LABELS, cn } from '@/lib/utils';

// Pipeline stages in order
const PIPELINE_STAGES = [
    { key: 'NEW_CALL', label: 'New' },
    { key: 'JD_RECEIVED', label: 'JD Received' },
    { key: 'APPLIED', label: 'Applied' },
    { key: 'SHORTLISTED', label: 'Shortlisted' },
    { key: 'INTERVIEW_IN_PROGRESS', label: 'Interview' },
    { key: 'OFFER', label: 'Offer' },
    { key: 'REJECTED', label: 'Rejected' },
];

const SOURCES = [
    { value: 'LINKEDIN', label: 'LinkedIn' },
    { value: 'NAUKRI', label: 'Naukri' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'COMPANY_WEBSITE', label: 'Company Website' },
    { value: 'OTHER', label: 'Other' },
];

// Sample company names for autocomplete (in real app, this would come from API)
const SAMPLE_COMPANIES = [
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix',
    'Adobe', 'Salesforce', 'Oracle', 'IBM', 'Intel', 'Cisco',
    'Accenture', 'TCS', 'Infosys', 'Wipro', 'Flipkart', 'Paytm',
    'Swiggy', 'Zomato', 'Ola', 'Uber', 'Cred', 'Razorpay',
    'Coinbase', 'CoinDCX', 'Groww', 'Razorpay', 'CRED'
];

interface CompanySuggestion {
    name: string;
    hasRecruiter?: boolean;
}

export default function NewApplicationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('id');
    const isEditMode = !!editId;
    
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        job_role: '',
        hiring_company: '',
        recruiter_name: '',
        recruiter_company: '',
        phone: '',
        email: '',
        source: 'LINKEDIN',
        tech_stack: '',
        current_status: 'APPLIED',
    });

    // UI State
    const [recruiterExpanded, setRecruiterExpanded] = useState(false);
    const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
    const [companySuggestions, setCompanySuggestions] = useState<CompanySuggestion[]>([]);

    // Smart Actions State
    const [addInterview, setAddInterview] = useState(false);
    const [addFollowup, setAddFollowup] = useState(false);
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewTime, setInterviewTime] = useState('');
    const [interviewEndTime, setInterviewEndTime] = useState('');
    const [interviewNotes, setInterviewNotes] = useState('');
    const [followupDays, setFollowupDays] = useState('3');

    // Refs for outside click detection
    const companyInputRef = useRef<HTMLInputElement>(null);

    // Fetch application data for edit mode
    useEffect(() => {
        if (editId) {
            const fetchApplication = async () => {
                try {
                    setLoadingData(true);
                    const response = await applicationsAPI.getById(editId);
                    const app = response.data.data || response.data;
                    
                    if (app) {
                        // Tech stack as string (paragraph)
                        let techStackValue = '';
                        if (app.techStack) {
                            if (typeof app.techStack === 'string') {
                                techStackValue = app.techStack;
                            } else if (Array.isArray(app.techStack)) {
                                techStackValue = app.techStack.join('\n');
                            }
                        }
                        
                        setFormData({
                            job_role: app.jobRole || '',
                            hiring_company: app.hiringCompany || '',
                            recruiter_name: app.recruiterName || '',
                            recruiter_company: app.recruiterCompany || '',
                            phone: app.phone || '',
                            email: app.email || '',
                            source: app.source || 'LINKEDIN',
                            tech_stack: techStackValue,
                            current_status: app.currentStatus || 'APPLIED',
                        });
                        
                        // Expand recruiter section if there's recruiter data
                        if (app.recruiterName || app.email || app.phone) {
                            setRecruiterExpanded(true);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch application:', err);
                    setError('Failed to load application data');
                } finally {
                    setLoadingData(false);
                }
            };
            fetchApplication();
        }
    }, [editId]);

    // Filter company suggestions based on input
    useEffect(() => {
        if (formData.hiring_company.length > 0) {
            const filtered = SAMPLE_COMPANIES
                .filter(c => c.toLowerCase().includes(formData.hiring_company.toLowerCase()))
                .slice(0, 5)
                .map(name => ({ name }));
            setCompanySuggestions(filtered);
            setShowCompanySuggestions(filtered.length > 0);
        } else {
            setShowCompanySuggestions(false);
        }
    }, [formData.hiring_company]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (companyInputRef.current && !companyInputRef.current.contains(e.target as Node)) {
                setShowCompanySuggestions(false);
            }

        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle basic input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Auto-capitalize and clean job role
    const handleJobRoleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        setFormData(prev => ({ ...prev, job_role: value }));
    };

    // Handle company suggestion selection
    const selectCompany = (company: CompanySuggestion) => {
        setFormData(prev => ({ ...prev, hiring_company: company.name }));
        setShowCompanySuggestions(false);
    };

    // Handle pipeline stage selection
    const selectPipelineStage = (stage: string) => {
        setFormData(prev => ({ ...prev, current_status: stage }));
        
        // Smart behavior: If shortlisted or interview stage, suggest adding interview
        if (stage === 'SHORTLISTED' || stage === 'INTERVIEW_IN_PROGRESS') {
            setAddInterview(true);
        }
    };

    // Validate form
    const isValid = formData.job_role.trim() && formData.hiring_company.trim();

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isValid) {
            setError('Please fill in Job Role and Company Name');
            return;
        }

        setLoading(true);
        setError('');

        // Convert to API format
        const apiData = {
            recruiterName: formData.recruiter_name || undefined,
            recruiterCompany: formData.recruiter_company || undefined,
            hiringCompany: formData.hiring_company,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            source: formData.source,
            jobRole: formData.job_role,
            techStack: formData.tech_stack?.trim() ? formData.tech_stack : undefined,
            currentStatus: formData.current_status,
            applied: ['APPLIED', 'SHORTLISTED', 'INTERVIEW_IN_PROGRESS', 'OFFER'].includes(formData.current_status),
            appliedDate: ['APPLIED', 'SHORTLISTED', 'INTERVIEW_IN_PROGRESS', 'OFFER'].includes(formData.current_status) 
                ? new Date().toISOString() 
                : undefined,
            jdReceived: formData.current_status !== 'NEW_CALL',
        };
        console.log('Submitting application with data:', apiData);

        try {
            let applicationId = editId;
            
            if (isEditMode) {
                // Update existing application
                await applicationsAPI.update(editId, apiData);
            } else {
                // Create new application
                const appResponse = await applicationsAPI.create(apiData);
                // Backend returns { success, message, data: application } or direct application
                // Try both structures to be safe
                applicationId = appResponse.data?.data?.id || appResponse.data?.id;
            }
            
            // If interview toggle is on, create interview event
            if (addInterview && interviewDate && applicationId) {
                // Create date in local timezone
                const localDate = new Date(interviewDate);
                const dateStr = localDate.toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
                
                await interviewEventsAPI.create({
                    applicationId,
                    roundNumber: 1,
                    date: dateStr,
                    startTime: interviewTime || '10:00',
                    endTime: interviewEndTime || (interviewTime ? `${parseInt(interviewTime.split(':')[0]) + 1}:${interviewTime.split(':')[1]}` : '11:00'),
                    notes: interviewNotes || `${formData.job_role} at ${formData.hiring_company}`,
                    createdFrom: 'APPLICATION_PAGE',
                });
                
                // Update status to interview if not already
                if (!['INTERVIEW_IN_PROGRESS', 'INTERVIEW_SCHEDULED'].includes(formData.current_status)) {
                    await applicationsAPI.updateStatus(applicationId, { 
                        currentStatus: 'INTERVIEW_SCHEDULED' 
                    });
                }
            }

            // If followup toggle is on, create followup
            if (addFollowup && applicationId) {
                const followUpDate = new Date();
                followUpDate.setDate(followUpDate.getDate() + parseInt(followupDays));
                
                await followupsAPI.create(applicationId, {
                    title: `Follow up - ${formData.hiring_company}`,
                    description: `Follow up regarding ${formData.job_role} application`,
                    followUpDate: followUpDate.toISOString(),
                    contextType: 'AFTER_INTERVIEW',
                    priority: 'MEDIUM',
                });
            }

            setSuccess(true);
            
            // Redirect after short delay to the application detail page
            // Redirect to the application detail page or back to list if no ID
            setTimeout(() => {
                if (applicationId) {
                    router.push(`/dashboard/applications/${applicationId}`);
                } else {
                    router.push('/dashboard/applications');
                }
            }, 1000);
            
        } catch (err: any) {
            console.error('Create application error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to create application';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-32">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard/applications"
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    {loadingData ? 'Loading...' : isEditMode ? 'Edit Application' : 'New Application'}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {isEditMode ? 'Update application details' : 'Add a new job application to your tracker'}
                                </p>
                            </div>
                        </div>
                        {success && (
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                                <Check className="w-4 h-4" />
                                <span className="text-sm font-medium">Application created!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-6 pb-28">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Section 1: Basic Info - Most Important */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Briefcase className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Basic Info</h2>
                                    <p className="text-sm text-gray-500">The most important details about this application</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Job Role */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Job Role <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="job_role"
                                    value={formData.job_role}
                                    onChange={handleJobRoleChange}
                                    required
                                    className={cn(
                                        "w-full px-4 py-3 text-lg border-2 rounded-xl transition-all duration-200",
                                        "focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none",
                                        "placeholder:text-gray-400 bg-gray-50 focus:bg-white",
                                        !formData.job_role.trim() && formData.hiring_company ? "border-gray-200" : "border-gray-200"
                                    )}
                                    placeholder="e.g., Senior Backend Engineer"
                                />
                            </div>

                            {/* Company Name */}
                            <div className="relative" ref={companyInputRef}>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="hiring_company"
                                        value={formData.hiring_company}
                                        onChange={handleChange}
                                        required
                                        className={cn(
                                            "w-full pl-12 pr-4 py-3 text-lg border-2 rounded-xl transition-all duration-200",
                                            "focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none",
                                            "placeholder:text-gray-400 bg-gray-50 focus:bg-white"
                                        )}
                                        placeholder="e.g., Google"
                                        onFocus={() => formData.hiring_company && setShowCompanySuggestions(true)}
                                    />
                                </div>
                                
                                {/* Company Suggestions Dropdown */}
                                {showCompanySuggestions && (
                                    <div className="absolute z-30 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                                        {companySuggestions.map((company, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => selectCompany(company)}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-3"
                                            >
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-700">{company.name}</span>
                                                {company.hasRecruiter && (
                                                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                                        Has recruiter
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Recruiter Info - Collapsible */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setRecruiterExpanded(!recruiterExpanded)}
                            className="w-full p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Users className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-lg font-semibold text-gray-900">Recruiter Info</h2>
                                    <p className="text-sm text-gray-500">Add recruiter contact details (optional)</p>
                                </div>
                            </div>
                            {recruiterExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                        
                        {recruiterExpanded && (
                            <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Recruiter Name</label>
                                        <input
                                            type="text"
                                            name="recruiter_name"
                                            value={formData.recruiter_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Recruiter Company</label>
                                        <input
                                            type="text"
                                            name="recruiter_company"
                                            value={formData.recruiter_company}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                            placeholder="Google"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                            placeholder="recruiter@company.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                                            placeholder="+1 234 567 8900"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Section 3: Job Details */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Link2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Job Details</h2>
                                    <p className="text-sm text-gray-500">Source and technical requirements</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Source */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Source</label>
                                <div className="relative">
                                    <select
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all appearance-none bg-white"
                                    >
                                        {SOURCES.map(source => (
                                            <option key={source.value} value={source.value}>
                                                {source.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Tech Stack - Paragraph/Textarea */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Tech Stack</label>
                                <textarea
                                    value={formData.tech_stack}
                                    onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 outline-none transition-all resize-none"
                                    placeholder="Enter your tech skills, technologies, and tools...&#10;e.g.,&#10;React, Node.js, TypeScript&#10;AWS, Docker, Kubernetes&#10;PostgreSQL, MongoDB"
                                />
                                <p className="text-xs text-gray-500 mt-1">Write each skill on a new line or separate with commas</p>
                            </div>
                        </div>
                    </section>

                    {/* Section 4: Pipeline Selector */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Status & Pipeline</h2>
                                    <p className="text-sm text-gray-500">Where is this application in your process?</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {/* Visual Pipeline Selector */}
                            <div className="flex flex-wrap gap-2">
                                {PIPELINE_STAGES.map((stage, idx) => {
                                    const isSelected = formData.current_status === stage.key;
                                    const isPast = PIPELINE_STAGES.findIndex(s => s.key === formData.current_status) > idx;
                                    
                                    return (
                                        <button
                                            key={stage.key}
                                            type="button"
                                            onClick={() => selectPipelineStage(stage.key)}
                                            className={cn(
                                                "relative px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200",
                                                "border-2",
                                                isSelected 
                                                    ? "bg-orange-500 text-white border-orange-500 shadow-md scale-105" 
                                                    : isPast
                                                        ? "bg-gray-100 text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                                                        : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                                            )}
                                        >
                                            {stage.label}
                                            {isSelected && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Section 5: Smart Actions */}
                    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-cyan-50 to-blue-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-100 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Smart Actions</h2>
                                    <p className="text-sm text-gray-500">Automate your workflow in one place</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Add Interview Toggle */}
                            <div className={cn(
                                "border-2 rounded-xl p-4 transition-all duration-200",
                                addInterview ? "border-cyan-200 bg-cyan-50" : "border-gray-200 hover:border-cyan-200"
                            )}>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            addInterview ? "bg-cyan-500 text-white" : "bg-gray-100 text-gray-500"
                                        )}>
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-900">Schedule Interview</span>
                                            <p className="text-sm text-gray-500">Add an interview for this application</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAddInterview(!addInterview)}
                                        className={cn(
                                            "relative w-12 h-6 rounded-full transition-colors",
                                            addInterview ? "bg-cyan-500" : "bg-gray-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                            addInterview ? "left-7" : "left-1"
                                        )} />
                                    </button>
                                </label>
                                
                                {addInterview && (
                                    <div className="mt-4 pt-4 border-t border-cyan-200 space-y-4 animate-in slide-in-from-top-2">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                                <input
                                                    type="date"
                                                    value={interviewDate}
                                                    onChange={(e) => setInterviewDate(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                                <input
                                                    type="time"
                                                    value={interviewTime}
                                                    onChange={(e) => setInterviewTime(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                                <input
                                                    type="time"
                                                    value={interviewEndTime}
                                                    onChange={(e) => setInterviewEndTime(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <input
                                                type="text"
                                                value={interviewNotes}
                                                onChange={(e) => setInterviewNotes(e.target.value)}
                                                placeholder="Interview focus, preparation notes..."
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAddInterview(false);
                                                    setInterviewDate('');
                                                    setInterviewTime('');
                                                    setInterviewEndTime('');
                                                    setInterviewNotes('');
                                                }}
                                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Add Follow-up Toggle */}
                            <div className={cn(
                                "border-2 rounded-xl p-4 transition-all duration-200",
                                addFollowup ? "border-violet-200 bg-violet-50" : "border-gray-200 hover:border-violet-200"
                            )}>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            addFollowup ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-500"
                                        )}>
                                            <Bell className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-gray-900">Follow-up Reminder</span>
                                            <p className="text-sm text-gray-500">Get reminded to follow up</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAddFollowup(!addFollowup)}
                                        className={cn(
                                            "relative w-12 h-6 rounded-full transition-colors",
                                            addFollowup ? "bg-violet-500" : "bg-gray-300"
                                        )}
                                    >
                                        <span className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                                            addFollowup ? "left-7" : "left-1"
                                        )} />
                                    </button>
                                </label>
                                
                                {addFollowup && (
                                    <div className="mt-4 pt-4 border-t border-violet-200 animate-in slide-in-from-top-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Remind me in:</label>
                                        <div className="flex gap-2">
                                            {['2', '3', '5', '7'].map(days => (
                                                <button
                                                    key={days}
                                                    type="button"
                                                    onClick={() => setFollowupDays(days)}
                                                    className={cn(
                                                        "px-4 py-2 rounded-lg font-medium text-sm transition-all",
                                                        followupDays === days
                                                            ? "bg-violet-500 text-white"
                                                            : "bg-white border border-gray-200 text-gray-600 hover:border-violet-300"
                                                    )}
                                                >
                                                    {days} {parseInt(days) === 1 ? 'day' : 'days'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </form>
            </div>

            {/* Sticky Action Bar - Account for sidebar */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 shadow-lg z-30">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/dashboard/applications"
                        className="px-6 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                        Cancel
                    </Link>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !isValid}
                        className={cn(
                            "flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all",
                            isValid 
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25" 
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                {isEditMode ? 'Save Changes' : 'Save & Continue'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
