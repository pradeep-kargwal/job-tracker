'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Kanban,
    BarChart3,
    FileText,
    Bell,
    LogOut,
    Menu,
    X,
    Briefcase,
    Sparkles,
} from 'lucide-react';
import { authAPI } from '@/lib/api';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Applications', href: '/dashboard/applications', icon: Briefcase },
    { name: 'Pipeline', href: '/dashboard/pipeline', icon: Kanban },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Resumes', href: '/dashboard/resumes', icon: FileText },
    { name: 'AI Features', href: '/dashboard/ai', icon: Sparkles },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<{ name?: string; email: string } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        authAPI.me()
            .then((res) => setUser(res.data.data))
            .catch(() => {
                localStorage.removeItem('token');
                router.push('/login');
            });
    }, [router]);

    const handleLogout = async () => {
        try {
            await authAPI.logout();
        } catch {
            // Ignore errors
        }
        localStorage.removeItem('token');
        router.push('/login');
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div
                        className="fixed inset-0 bg-black/50"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
                        <div className="p-4 border-b border-border">
                            <h2 className="text-xl font-bold text-primary">Job Tracker</h2>
                        </div>
                        <nav className="p-4 space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-primary text-white'
                                            : 'text-text-secondary hover:bg-gray-100'
                                            }`}
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-64 lg:block">
                <div className="flex flex-col h-full bg-white border-r border-border">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-bold text-primary">Job Tracker</h2>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary text-white'
                                        : 'text-text-secondary hover:bg-gray-100'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-medium">
                                    {user.name?.[0] || user.email[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                    {user.name || user.email}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 w-full text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Mobile header */}
                <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-border">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-text-secondary hover:text-text-primary"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <span className="font-semibold text-text-primary">Job Tracker</span>
                        <button className="p-2 text-text-secondary hover:text-text-primary relative">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
                        </button>
                    </div>
                </div>

                {/* Page content */}
                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
