'use client';

import { useState } from 'react';
import {
    Sparkles,
    Wand2,
    FileText,
    Mail,
    Copy,
    Check,
    Loader2
} from 'lucide-react';
import { aiAPI } from '@/lib/api';

export default function AIPage() {
    const [activeTab, setActiveTab] = useState<'extract' | 'email' | 'summarize'>('extract');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Extract Skills Form
    const [jdText, setJdText] = useState('');

    // Generate Email Form
    const [emailForm, setEmailForm] = useState({
        recruiterName: '',
        companyName: '',
        jobRole: '',
        emailType: 'followup'
    });

    // Summarize Notes Form
    const [notesText, setNotesText] = useState('');

    const handleExtractSkills = async () => {
        if (!jdText.trim()) return;
        setLoading(true);
        try {
            const res = await aiAPI.extractSkills(jdText);
            setResult(res.data.data.skills || 'No skills extracted');
        } catch (err) {
            setResult('Failed to extract skills. Make sure OpenAI API key is configured.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateEmail = async () => {
        if (!emailForm.recruiterName || !emailForm.companyName || !emailForm.jobRole) return;
        setLoading(true);
        try {
            const res = await aiAPI.generateEmail(emailForm);
            setResult(res.data.data.email || 'Failed to generate email');
        } catch (err) {
            setResult('Failed to generate email. Make sure OpenAI API key is configured.');
        } finally {
            setLoading(false);
        }
    };

    const handleSummarizeNotes = async () => {
        if (!notesText.trim()) return;
        setLoading(true);
        try {
            // Parse notes as simple text
            const notes = notesText.split('\n').filter(n => n.trim()).map(content => ({
                content,
                createdAt: new Date().toISOString()
            }));
            const res = await aiAPI.summarizeNotes(notes);
            setResult(res.data.data.summary || 'Failed to summarize notes');
        } catch (err) {
            setResult('Failed to summarize notes. Make sure OpenAI API key is configured.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = () => {
        switch (activeTab) {
            case 'extract':
                handleExtractSkills();
                break;
            case 'email':
                handleGenerateEmail();
                break;
            case 'summarize':
                handleSummarizeNotes();
                break;
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold">AI Features</h1>
            </div>

            <div className="bg-white rounded-lg shadow">
                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        onClick={() => { setActiveTab('extract'); setResult(''); }}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${activeTab === 'extract'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Wand2 className="w-4 h-4" />
                        Extract Skills
                    </button>
                    <button
                        onClick={() => { setActiveTab('email'); setResult(''); }}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${activeTab === 'email'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Mail className="w-4 h-4" />
                        Generate Email
                    </button>
                    <button
                        onClick={() => { setActiveTab('summarize'); setResult(''); }}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium ${activeTab === 'summarize'
                                ? 'text-primary border-b-2 border-primary'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Summarize Notes
                    </button>
                </div>

                <div className="p-6">
                    {/* Extract Skills Form */}
                    {activeTab === 'extract' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Job Description
                                </label>
                                <textarea
                                    value={jdText}
                                    onChange={(e) => setJdText(e.target.value)}
                                    rows={8}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="Paste the job description here..."
                                />
                            </div>
                            <button
                                onClick={handleExtractSkills}
                                disabled={loading || !jdText.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Extracting...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4" />
                                        Extract Skills
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Generate Email Form */}
                    {activeTab === 'email' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Recruiter Name
                                    </label>
                                    <input
                                        type="text"
                                        value={emailForm.recruiterName}
                                        onChange={(e) => setEmailForm({ ...emailForm, recruiterName: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={emailForm.companyName}
                                        onChange={(e) => setEmailForm({ ...emailForm, companyName: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                        placeholder="Google"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Job Role
                                    </label>
                                    <input
                                        type="text"
                                        value={emailForm.jobRole}
                                        onChange={(e) => setEmailForm({ ...emailForm, jobRole: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                        placeholder="Senior Software Engineer"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Email Type
                                    </label>
                                    <select
                                        value={emailForm.emailType}
                                        onChange={(e) => setEmailForm({ ...emailForm, emailType: e.target.value })}
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="followup">Follow-up</option>
                                        <option value="thankyou">Thank You</option>
                                        <option value="interest">Interest</option>
                                        <option value="schedule">Schedule Interview</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerateEmail}
                                disabled={loading || !emailForm.recruiterName || !emailForm.companyName || !emailForm.jobRole}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        Generate Email
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Summarize Notes Form */}
                    {activeTab === 'summarize' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Notes (one per line)
                                </label>
                                <textarea
                                    value={notesText}
                                    onChange={(e) => setNotesText(e.target.value)}
                                    rows={8}
                                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary"
                                    placeholder="Recruiter called about the position&#10;Discussed tech stack&#10;Need to submit resume by Friday"
                                />
                            </div>
                            <button
                                onClick={handleSummarizeNotes}
                                disabled={loading || !notesText.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Summarizing...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-4 h-4" />
                                        Summarize Notes
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">
                                    Result
                                </label>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg border whitespace-pre-wrap">
                                {result}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
