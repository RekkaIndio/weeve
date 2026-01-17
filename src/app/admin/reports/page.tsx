'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    AlertTriangle,
    CheckCircle,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    Filter,
    Search,
    X,
    ExternalLink,
    Ban,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Report {
    id: string;
    story_id: string;
    reporter_id: string;
    reason: string;
    created_at: string;
    status?: 'pending' | 'dismissed' | 'actioned';
    story?: {
        id: string;
        title: string;
        description: string;
        creator_id: string;
        created_at: string;
        contributions?: { media_url?: string; media_type?: string }[];
        profiles?: { id: string; name: string; avatar?: string };
    };
    reporter?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

const REASONS_MAP: Record<string, { label: string; color: string }> = {
    spam: { label: 'Spam', color: 'bg-yellow-500/10 text-yellow-400' },
    inappropriate: { label: 'Inappropriate', color: 'bg-red-500/10 text-red-400' },
    harassment: { label: 'Harassment', color: 'bg-orange-500/10 text-orange-400' },
    violence: { label: 'Violence', color: 'bg-red-500/10 text-red-400' },
    misinformation: { label: 'Misinformation', color: 'bg-blue-500/10 text-blue-400' },
    copyright: { label: 'Copyright', color: 'bg-purple-500/10 text-purple-400' },
    other: { label: 'Other', color: 'bg-zinc-500/10 text-zinc-400' },
};

export default function AdminReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [filterReason, setFilterReason] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());

    const ITEMS_PER_PAGE = 20;

    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('story_reports')
                .select(`
                    *,
                    story:stories (
                        id,
                        title,
                        description,
                        creator_id,
                        created_at,
                        contributions (media_url, media_type),
                        profiles:creator_id (id, name, avatar)
                    ),
                    reporter:profiles!story_reports_reporter_id_fkey (id, name, avatar)
                `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

            if (filterReason) {
                query = query.eq('reason', filterReason);
            }

            const { data, count, error } = await query;

            if (error) {
                console.error('Failed to fetch reports:', error);
                return;
            }

            setReports(data || []);
            setTotalCount(count || 0);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, filterReason]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleDismiss = async (reportId: string) => {
        setActionLoading(reportId);
        try {
            const { error } = await supabase
                .from('story_reports')
                .delete()
                .eq('id', reportId);

            if (error) throw error;

            setReports(reports.filter(r => r.id !== reportId));
            setTotalCount(prev => prev - 1);
            if (selectedReport?.id === reportId) {
                setSelectedReport(null);
            }
        } catch (error) {
            console.error('Failed to dismiss report:', error);
            alert('Failed to dismiss report');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteStory = async (report: Report) => {
        if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            return;
        }

        setActionLoading(report.id);
        try {
            // Delete the story
            const { error: storyError } = await supabase
                .from('stories')
                .delete()
                .eq('id', report.story_id);

            if (storyError) throw storyError;

            // Remove all reports for this story
            await supabase
                .from('story_reports')
                .delete()
                .eq('story_id', report.story_id);

            // Refresh the list
            fetchReports();
            setSelectedReport(null);
        } catch (error) {
            console.error('Failed to delete story:', error);
            alert('Failed to delete story');
        } finally {
            setActionLoading(null);
        }
    };

    const toggleReportSelection = (reportId: string) => {
        const newSelected = new Set(selectedReportIds);
        if (newSelected.has(reportId)) {
            newSelected.delete(reportId);
        } else {
            newSelected.add(reportId);
        }
        setSelectedReportIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedReportIds.size === reports.length) {
            setSelectedReportIds(new Set());
        } else {
            setSelectedReportIds(new Set(reports.map(r => r.id)));
        }
    };

    const handleBulkDismiss = async () => {
        if (selectedReportIds.size === 0) return;
        if (!confirm(`Dismiss ${selectedReportIds.size} selected reports?`)) return;

        setActionLoading('bulk');
        try {
            const { error } = await supabase
                .from('story_reports')
                .delete()
                .in('id', Array.from(selectedReportIds));

            if (error) throw error;

            setReports(reports.filter(r => !selectedReportIds.has(r.id)));
            setTotalCount(prev => prev - selectedReportIds.size);
            setSelectedReportIds(new Set());
            setSelectedReport(null);
        } catch (error) {
            console.error('Failed to bulk dismiss:', error);
            alert('Failed to dismiss reports');
        } finally {
            setActionLoading(null);
        }
    };

    const getReasonDisplay = (reason: string) => {
        const mapped = REASONS_MAP[reason.toLowerCase()] || REASONS_MAP.other;
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${mapped.color}`}>
                {mapped.label}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStoryThumbnail = (report: Report) => {
        const contribution = report.story?.contributions?.[0];
        if (contribution?.media_url && (contribution.media_type === 'image' || contribution.media_type === 'video')) {
            return contribution.media_url;
        }
        return null;
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Reports</h1>
                    <p className="text-zinc-400 mt-1">Review and manage reported content</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <AlertTriangle size={16} />
                    <span>{totalCount} total reports</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by story title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                </div>
                <div className="relative">
                    <select
                        value={filterReason}
                        onChange={(e) => {
                            setFilterReason(e.target.value);
                            setPage(0);
                        }}
                        className="appearance-none pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-pink-500 cursor-pointer"
                    >
                        <option value="">All Reasons</option>
                        <option value="spam">Spam</option>
                        <option value="inappropriate">Inappropriate</option>
                        <option value="harassment">Harassment</option>
                        <option value="violence">Violence</option>
                        <option value="misinformation">Misinformation</option>
                        <option value="copyright">Copyright</option>
                        <option value="other">Other</option>
                    </select>
                    <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>

                {/* Bulk Actions */}
                {selectedReportIds.size > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-zinc-400">
                            {selectedReportIds.size} selected
                        </span>
                        <button
                            onClick={handleBulkDismiss}
                            disabled={actionLoading === 'bulk'}
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                        >
                            <CheckCircle size={14} />
                            Dismiss Selected
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex gap-6">
                {/* Reports List */}
                <div className="flex-1 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                            <CheckCircle size={40} className="mb-3 text-green-500" />
                            <p>No pending reports</p>
                        </div>
                    ) : (
                        <>

                            {/* Select All Bar */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/30 border-b border-zinc-800">
                                <input
                                    type="checkbox"
                                    checked={selectedReportIds.size === reports.length && reports.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-zinc-600 text-pink-500 focus:ring-pink-500 bg-zinc-700"
                                />
                                <span className="text-sm text-zinc-400">Select All</span>
                            </div>

                            <div className="divide-y divide-zinc-800">
                                {reports.map((report) => (
                                    <div
                                        key={report.id}
                                        onClick={() => setSelectedReport(report)}
                                        className={`p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors flex items-start gap-3 ${selectedReport?.id === report.id ? 'bg-zinc-800/50' : ''
                                            }`}
                                    >
                                        <div onClick={(e) => e.stopPropagation()} className="pt-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedReportIds.has(report.id)}
                                                onChange={() => toggleReportSelection(report.id)}
                                                className="w-4 h-4 rounded border-zinc-600 text-pink-500 focus:ring-pink-500 bg-zinc-700"
                                            />
                                        </div>

                                        {/* Thumbnail */}
                                        <div className="w-16 h-16 rounded-lg bg-zinc-800 flex-shrink-0 overflow-hidden">
                                            {getStoryThumbnail(report) ? (
                                                <img
                                                    src={getStoryThumbnail(report)!}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                    <AlertTriangle size={20} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {getReasonDisplay(report.reason)}
                                            </div>
                                            <p className="text-white font-medium truncate">
                                                {report.story?.title || 'Unknown Story'}
                                            </p>
                                            <p className="text-sm text-zinc-500">
                                                Reported by {report.reporter?.name || 'Unknown'} • {formatDate(report.created_at)}
                                            </p>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleDismiss(report.id)}
                                                disabled={actionLoading === report.id}
                                                className="p-2 text-zinc-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                title="Dismiss"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStory(report)}
                                                disabled={actionLoading === report.id}
                                                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                title="Delete Story"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between p-4 border-t border-zinc-800">
                                    <p className="text-sm text-zinc-500">
                                        Page {page + 1} of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={page >= totalPages - 1}
                                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedReport && (
                    <div className="w-96 bg-zinc-900 rounded-xl border border-zinc-800 p-5 h-fit sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Report Details</h3>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="p-1 text-zinc-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Story Preview */}
                        <div className="mb-4">
                            <div className="aspect-square rounded-lg bg-zinc-800 overflow-hidden mb-3">
                                {getStoryThumbnail(selectedReport) ? (
                                    <img
                                        src={getStoryThumbnail(selectedReport)!}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                        <AlertTriangle size={40} />
                                    </div>
                                )}
                            </div>
                            <h4 className="font-medium text-white">{selectedReport.story?.title}</h4>
                            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                                {selectedReport.story?.description}
                            </p>
                        </div>

                        {/* Report Info */}
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Reason</span>
                                {getReasonDisplay(selectedReport.reason)}
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Reported</span>
                                <span className="text-white">{formatDate(selectedReport.created_at)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Reporter</span>
                                <span className="text-white">{selectedReport.reporter?.name || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Creator</span>
                                <Link
                                    href={`/admin/users/${selectedReport.story?.profiles?.id}`}
                                    className="text-pink-400 hover:text-pink-300"
                                >
                                    {selectedReport.story?.profiles?.name || 'Unknown'}
                                </Link>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <Link
                                href={`/admin/stories/${selectedReport.story_id}`}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-500 transition-colors"
                            >
                                <Eye size={16} />
                                Manage Story & Contributions
                            </Link>
                            <button
                                onClick={() => handleDismiss(selectedReport.id)}
                                disabled={actionLoading === selectedReport.id}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                            >
                                <CheckCircle size={16} />
                                Dismiss Report
                            </button>
                            <button
                                onClick={() => handleDeleteStory(selectedReport)}
                                disabled={actionLoading === selectedReport.id}
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                                Delete Story
                            </button>
                            <Link
                                href={`/admin/users/${selectedReport.story?.creator_id}`}
                                className="flex items-center justify-center gap-2 w-full py-2.5 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
                            >
                                <Ban size={16} />
                                View Creator Profile
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
