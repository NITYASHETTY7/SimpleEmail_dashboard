import React from 'react';
import { EmailJob } from '../../types';
import { StatusBadge } from '../common/Badge';
import { Search, ExternalLink, Calendar, Clock, RefreshCw, MailCheck, AlertCircle } from 'lucide-react';

interface SentTableProps {
  emails: EmailJob[];
  isLoading: boolean;
  onRefresh: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  isLoading,
  onRefresh,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return { date: '-', time: '-' };
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
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search sent emails..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-lg bg-[#0f1218] border border-[#262d3d] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#0f1218] p-1 rounded-lg border border-[#262d3d] self-start sm:self-auto">
            {['', 'SENT', 'FAILED'].map((s) => (
              <button
                key={s}
                onClick={() => onStatusFilterChange(s)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s === '' ? 'All Status' : s === 'SENT' ? 'Sent' : 'Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f1218] hover:bg-[#222836] border border-[#262d3d] text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#262d3d] bg-[#0f1218]/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Recipient</th>
              <th className="py-3 px-4 sm:px-6">Subject</th>
              <th className="py-3 px-4 sm:px-6">Sent Timestamp</th>
              <th className="py-3 px-4 sm:px-6">Sender</th>
              <th className="py-3 px-4 sm:px-6">Status</th>
              <th className="py-3 px-4 sm:px-6 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262d3d]/50 text-xs sm:text-sm">
            {isLoading && emails.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-36 mb-1.5" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-48" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-28" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 bg-slate-800 rounded w-32" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-6 bg-slate-800 rounded-full w-16" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="h-7 bg-slate-800 rounded w-28 ml-auto" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                      <MailCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">No sent emails recorded yet</h3>
                    <p className="text-xs text-slate-400 text-center">
                      Emails dispatched by BullMQ workers via Ethereal SMTP will automatically log here with live preview links.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((job) => {
                const { date, time } = formatDate(job.sentAt || job.updatedAt);
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

                    {/* Sent Timestamp */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-300">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{time}</span>
                        </div>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="py-3.5 px-4 sm:px-6 text-slate-300">
                      <span className="truncate max-w-[160px] text-xs text-slate-300 block">{job.senderEmail}</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <StatusBadge status={job.status} />
                      {job.errorMessage && (
                        <div className="flex items-center gap-1 text-[10px] text-rose-400 mt-1 max-w-[180px] truncate" title={job.errorMessage}>
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span className="truncate">{job.errorMessage}</span>
                        </div>
                      )}
                    </td>

                    {/* Ethereal Preview Button */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      {job.etherealUrl ? (
                        <a
                          href={job.etherealUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all hover:scale-105 shadow-sm"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View in Ethereal</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 italic">No URL available</span>
                      )}
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
