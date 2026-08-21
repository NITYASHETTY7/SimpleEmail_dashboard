import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, LogOut, Activity, ChevronDown, User as UserIcon, Gauge, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenCompose: () => void;
  onOpenSenders: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCompose, onOpenSenders }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[#262d3d] bg-[#0f1218]/90 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">ReachInbox</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Persistent Distributed Email Queue</p>
          </div>
        </div>

        {/* Live Cluster Status & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Live Redis & Worker Health Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181c24] border border-[#262d3d] text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">BullMQ Engine Active</span>
          </div>

          {/* Senders & Rate Limits Button */}
          <button
            onClick={onOpenSenders}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181c24] hover:bg-[#222836] border border-[#262d3d] text-xs sm:text-sm font-medium text-slate-200 transition-colors shadow-sm"
            title="Configure Senders & Hourly Rate Limits"
          >
            <Gauge className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Rate Limits & Senders</span>
          </button>

          {/* Compose New Email Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Compose Email</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#181c24] border border-transparent hover:border-[#262d3d] transition-all"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-white leading-none">{user.name || 'User'}</p>
                  <p className="text-[11px] text-slate-400 leading-tight mt-1">{user.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#181c24] border border-[#262d3d] shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-2 border-b border-[#262d3d]">
                    <p className="text-xs font-semibold text-white truncate">{user.name || 'User'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors font-medium text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
