import React, { useState } from 'react';
import { EmailJob } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Search, Calendar, Clock, Trash2, RefreshCw, Send, AlertCircle } from 'lucide-react';

interface ScheduledTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  onCancelEmail: (id: string) => Promise<void>;
  onRefresh: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  onOpenCompose: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  isLoading,
  onCancelEmail,
  onRefresh,
  search,
  onSearchChange,
  onOpenCompose,
}) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;
    try {
      setCancellingId(id);
      await onCancelEmail(id);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  return (
    <div className="rounded-xl border border-[#262d3d] bg-[#181c24] overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-[#262d3d] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by recipient, subject, sender..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg bg-[#0f1218] border border-[#262d3d] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f1218] hover:bg-[#222836] border border-[#262d3d] text-xs font-medium text-slate-300 transition-colors"
            title="Refresh queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#262d3d] bg-[#0f1218]/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Recipient</th>
              <th className="py-3 px-4 sm:px-6">Subject</th>
              <th className="py-3 px-4 sm:px-6">Scheduled Run Time</th>
              <th className="py-3 px-4 sm:px-6">Sender & Throttle</th>
              <th className="py-3 px-4 sm:px-6">Status</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262d3d]/50 text-xs sm:text-sm">
            {isLoading && emails.length === 0 ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-36 mb-1.5" />
                    <div className="h-3 bg-slate-800/60 rounded w-24" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-48" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-28 mb-1" />
                    <div className="h-3 bg-slate-800/60 rounded w-16" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-32" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-6 bg-slate-800 rounded-full w-20" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="h-7 bg-slate-800 rounded w-16 ml-auto" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">No scheduled emails found</h3>
                    <p className="text-xs text-slate-400 mb-4 text-center">
                      {search ? 'Try adjusting your search criteria.' : 'Create your first email campaign to begin scheduling with BullMQ.'}
                    </p>
                    <button
                      onClick={onOpenCompose}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Schedule New Email
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              // Table Rows
              emails.map((job) => {
                const { date, time } = formatDate(job.scheduledAt);
                return (
                  <tr key={job.id} className="hover:bg-[#222836]/40 transition-colors group">
                    {/* Recipient */}
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-white">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[200px]">{job.recipientEmail}</span>
                        {job.recipientName && (
                          <span className="text-[11px] text-slate-400 font-normal">{job.recipientName}</span>
                        )}
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-200">
                      <span className="line-clamp-1 max-w-[250px] font-medium" title={job.subject}>
                        {job.subject}
                      </span>
                    </td>

                    {/* Scheduled Run Time */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-300">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{time}</span>
                        </div>
                      </div>
                    </td>

                    {/* Sender & Throttle */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-300">
                      <div className="flex flex-col text-xs">
                        <span className="truncate max-w-[160px] text-slate-300">{job.senderEmail}</span>
                        <span className="text-[11px] text-slate-500 mt-0.5">
                          Delay: {Math.round(job.delayBetweenMs / 1000)}s | Limit: {job.hourlyLimit}/hr
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <StatusBadge status={job.status} />
                      {job.status === 'RATE_LIMITED_RESCHEDULED' && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-400 mt-1" title={job.errorMessage || ''}>
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Next hour window</span>
                        </div>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={cancellingId === job.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#262d3d] hover:border-rose-500/40 hover:bg-rose-500/10 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                        title="Cancel this scheduled send"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
