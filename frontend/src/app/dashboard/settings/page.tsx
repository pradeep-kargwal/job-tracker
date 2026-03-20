'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Settings as SettingsIcon,
    Download,
    Upload,
    AlertTriangle,
    Check,
    X,
    Loader2,
    Database,
    FileJson,
    RefreshCw
} from 'lucide-react';
import { backupAPI, authAPI } from '@/lib/api';

export default function SettingsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [user, setUser] = useState<{ name?: string; email: string } | null>(null);
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning' | null; message: string }>({ type: null, message: '' });
    const [showConfirm, setShowConfirm] = useState(false);

    // Load user data
    useState(() => {
        authAPI.me()
            .then((res) => setUser(res.data.data))
            .catch(() => {});
    });

    const handleExport = async () => {
        try {
            setExporting(true);
            setStatus({ type: null, message: '' });
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/backup/export`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }
            
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename with date
            const date = new Date().toISOString().split('T')[0];
            link.download = `job-tracker-backup-${date}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            setStatus({ type: 'success', message: 'Backup downloaded successfully!' });
        } catch (err: any) {
            console.error('Export error:', err);
            setStatus({ type: 'error', message: err.message || 'Failed to export data' });
        } finally {
            setExporting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setStatus({ type: null, message: '' });
        }
    };

    const validateAndImport = async () => {
        if (!selectedFile) {
            setStatus({ type: 'error', message: 'Please select a file' });
            return;
        }

        try {
            // Read and validate file
            const text = await selectedFile.text();
            const data = JSON.parse(text);
            
            // Basic validation
            if (!data.version) {
                setStatus({ type: 'error', message: 'Invalid backup file: missing version' });
                return;
            }
            
            if (!data.applications || !Array.isArray(data.applications)) {
                setStatus({ type: 'error', message: 'Invalid backup file: missing applications' });
                return;
            }

            // Show confirmation
            setShowConfirm(true);
        } catch (err) {
            setStatus({ type: 'error', message: 'Invalid JSON file' });
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        try {
            setImporting(true);
            setStatus({ type: null, message: '' });

            const text = await selectedFile.text();
            const data = JSON.parse(text);

            await backupAPI.import(data, importMode);
            
            setStatus({ type: 'success', message: 'Data imported successfully!' });
            setSelectedFile(null);
            setShowConfirm(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err: any) {
            console.error('Import error:', err);
            setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to import data' });
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-600">Manage your account and data</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Profile Section */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold">Profile</h2>
                    </div>
                    <div className="p-6">
                        {user ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-gray-500">Email</label>
                                    <p className="font-medium">{user.email}</p>
                                </div>
                                {user.name && (
                                    <div>
                                        <label className="text-sm text-gray-500">Name</label>
                                        <p className="font-medium">{user.name}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500">Loading...</p>
                        )}
                    </div>
                </div>

                {/* Backup & Restore Section */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                        <div className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">Backup & Restore</h2>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Export your data or restore from a backup file
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Export Section */}
                        <div className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-medium flex items-center gap-2">
                                        <Download className="w-4 h-4" />
                                        Export Backup
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Download all your data as a JSON file. Includes applications, interviews, follow-ups, notes, and more.
                                    </p>
                                </div>
                                <button
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className="ml-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {exporting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    Export
                                </button>
                            </div>
                        </div>

                        {/* Import Section */}
                        <div className="border rounded-lg p-4">
                            <h3 className="font-medium flex items-center gap-2 mb-3">
                                <Upload className="w-4 h-4" />
                                Import Backup
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Restore your data from a previously exported backup file.
                            </p>

                            {/* File Input */}
                            <div className="mb-4">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-lg file:border-0
                                        file:text-sm file:font-medium
                                        file:bg-primary file:text-white
                                        hover:file:bg-primary/90
                                        file:cursor-pointer"
                                />
                                {selectedFile && (
                                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                                        <FileJson className="w-4 h-4" />
                                        Selected: {selectedFile.name}
                                    </p>
                                )}
                            </div>

                            {/* Import Mode */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Import Mode
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="importMode"
                                            checked={importMode === 'replace'}
                                            onChange={() => setImportMode('replace')}
                                            className="text-primary"
                                        />
                                        <span className="text-sm">Replace</span>
                                        <span className="text-xs text-gray-500">(Clear & Restore)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="importMode"
                                            checked={importMode === 'merge'}
                                            onChange={() => setImportMode('merge')}
                                            className="text-primary"
                                        />
                                        <span className="text-sm">Merge</span>
                                        <span className="text-xs text-gray-500">(Add New Only)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Import Button */}
                            <button
                                onClick={validateAndImport}
                                disabled={!selectedFile || importing}
                                className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 disabled:opacity-50 flex items-center gap-2"
                            >
                                {importing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                Validate & Import
                            </button>
                        </div>

                        {/* Status Messages */}
                        {status.type && (
                            <div className={`p-4 rounded-lg flex items-start gap-2 ${
                                status.type === 'success' ? 'bg-green-50 text-green-700' :
                                status.type === 'error' ? 'bg-red-50 text-red-700' :
                                'bg-yellow-50 text-yellow-700'
                            }`}>
                                {status.type === 'success' && <Check className="w-5 h-5 flex-shrink-0" />}
                                {status.type === 'error' && <X className="w-5 h-5 flex-shrink-0" />}
                                {status.type === 'warning' && <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
                                <p className="text-sm">{status.message}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                </div>
                                <h3 className="text-lg font-semibold">Confirm Import</h3>
                            </div>

                            <p className="text-gray-600 mb-4">
                                {importMode === 'replace' ? (
                                    <>
                                        This will <strong>replace all your existing data</strong> with the imported data.
                                        Your current applications, interviews, and follow-ups will be deleted.
                                    </>
                                ) : (
                                    <>
                                        This will <strong>merge</strong> the imported data with your existing data.
                                        New records will be added, but existing records will be preserved.
                                    </>
                                )}
                            </p>

                            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                                <p className="text-sm text-yellow-700">
                                    💡 We recommend exporting your current data before importing.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={importing}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {importing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    Confirm Import
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
