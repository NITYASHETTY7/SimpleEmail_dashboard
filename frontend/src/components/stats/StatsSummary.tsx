import React from 'react';
import { DashboardStats } from '../../types';
import { Clock, CheckCircle2, AlertTriangle, XCircle, Zap, ShieldCheck } from 'lucide-react';

interface StatsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export const StatsSummary: React.FC<StatsProps> = ({ stats, isLoading }) => {
  const cards = [
    {
      title: 'Scheduled in Queue',
      value: stats?.totalScheduled ?? 0,
      icon: Clock,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      subtitle: 'BullMQ Delayed Jobs',
    },
    {
      title: 'Successfully Sent',
      value: stats?.totalSent ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      subtitle: 'Delivered via Ethereal SMTP',
    },
    {
      title: 'Rate Limit Protected',
      value: stats?.totalRescheduled ?? 0,
      icon: AlertTriangle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      subtitle: 'Auto-Rescheduled in Next Window',
    },
    {
      title: 'Failed Sends',
      value: stats?.totalFailed ?? 0,
      icon: XCircle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      subtitle: 'Retry Backoff Configured',
    },
    {
      title: 'Hourly Send Velocity',
      value: `${stats?.hourlySendRate ?? 0}/hr`,
      icon: Zap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      subtitle: 'Active 60-min window throughput',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl bg-[#181c24] border ${card.borderColor} shadow-sm transition-all duration-200 hover:border-slate-600`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">{card.title}</span>
              <div className={`p-1.5 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {isLoading ? (
              <div className="h-7 w-20 rounded bg-slate-800 animate-pulse my-1" />
            ) : (
              <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
            )}

            <p className="text-[11px] text-slate-400 mt-1 truncate">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
};
