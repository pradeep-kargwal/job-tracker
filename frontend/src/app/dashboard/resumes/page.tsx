'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import {
    Upload,
    FileText,
    Trash2,
    Download,
    Tag,
    X,
    Check
} from 'lucide-react';
import { resumesAPI } from '@/lib/api';

const fetcher = () => resumesAPI.getAll().then((res) => res.data);

export default function ResumesPage() {
    const { data, error, mutate } = useSWR('/api/resumes', fetcher);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [newTags, setNewTags] = useState<{ [key: string]: string }>({});
    const [tagInput, setTagInput] = useState('');

    const resumes = data?.data || [];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);
            formData.append('tags', '');

            await resumesAPI.upload(formData);
            mutate();
        } catch (err) {
            alert('Failed to upload resume');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this resume?')) return;
        try {
            await resumesAPI.delete(id);
            mutate();
        } catch (err) {
            alert('Failed to delete resume');
        }
    };

    const handleAddTag = async (resumeId: string) => {
        const tag = newTags[resumeId]?.trim();
        if (!tag) return;

        const resume = resumes.find((r: any) => r.id === resumeId);
        if (!resume) return;

        const currentTags = resume.tags || [];
        const newTagsList = [...currentTags, tag];

        try {
            await resumesAPI.update(resumeId, { tags: newTagsList });
            setNewTags({ ...newTags, [resumeId]: '' });
            mutate();
        } catch (err) {
            alert('Failed to add tag');
        }
    };

    const handleRemoveTag = async (resumeId: string, tagToRemove: string) => {
        const resume = resumes.find((r: any) => r.id === resumeId);
        if (!resume) return;

        const newTagsList = (resume.tags || []).filter((t: string) => t !== tagToRemove);

        try {
            await resumesAPI.update(resumeId, { tags: newTagsList });
            mutate();
        } catch (err) {
            alert('Failed to remove tag');
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Resumes</h1>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        <Upload className="w-5 h-5" />
                        {uploading ? 'Uploading...' : 'Upload Resume'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                    Failed to load resumes
                </div>
            )}

            {resumes.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No resumes yet</h3>
                    <p className="text-gray-500 mb-4">Upload your first resume to get started</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 mx-auto"
                    >
                        <Upload className="w-5 h-5" />
                        Upload Resume
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resumes.map((resume: any) => (
                        <div key={resume.id} className="bg-white rounded-lg shadow p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <FileText className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 truncate max-w-[200px]">
                                            {resume.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {resume.version || 'v1.0'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(resume.id)}
                                    className="p-1 text-gray-400 hover:text-red-600"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-1 mb-3">
                                {(resume.tags || []).map((tag: string) => (
                                    <span
                                        key={tag}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(resume.id, tag)}
                                            className="hover:text-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add tag..."
                                    value={newTags[resume.id] || ''}
                                    onChange={(e) => setNewTags({ ...newTags, [resume.id]: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag(resume.id)}
                                    className="flex-1 px-3 py-1 text-sm border border-border rounded focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    onClick={() => handleAddTag(resume.id)}
                                    className="p-1 text-gray-400 hover:text-primary"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>

                            {resume.lastUsed && (
                                <p className="text-xs text-gray-500 mt-3">
                                    Last used: {new Date(resume.lastUsed).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
