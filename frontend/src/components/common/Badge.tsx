import React from 'react';
import { EmailStatus } from '../../types';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Ban, Loader2 } from 'lucide-react';

interface BadgeProps {
  status: EmailStatus | string;
  className?: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'SCHEDULED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          Scheduled
        </span>
      );
    case 'PROCESSING':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Sending...
        </span>
      );
    case 'SENT':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sent
        </span>
      );
    case 'FAILED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}>
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    case 'RATE_LIMITED_RESCHEDULED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Rate Limit Rescheduled
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 ${className}`}>
          <Ban className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 ${className}`}>
          {status}
        </span>
      );
  }
};
