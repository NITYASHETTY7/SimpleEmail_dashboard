import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { ComposeModal } from './components/compose/ComposeModal';
import { EmailDetailModal } from './components/common/EmailDetailModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { api } from './services/api';
import { DashboardStats, EmailJob } from './types';
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  Send,
  Star,
  ChevronDown,
  ExternalLink,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export const App: React.FC = () => {
  const { user, isLoading: isAuthLoading, logout } = useAuth();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('sent');

  // Modals & States
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [selectedEmailForView, setSelectedEmailForView] = useState<EmailJob | null>(null);

  // Email data
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Loading & Search
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch Stats & Emails
  const fetchEmails = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [statsRes, schedRes, sentRes] = await Promise.all([
        api.getStats(),
        api.getScheduledEmails({ search: searchQuery }),
        api.getSentEmails({ search: searchQuery }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (schedRes.success) setScheduledEmails(schedRes.data);
      if (sentRes.success) setSentEmails(sentRes.data);
    } catch (err) {
      console.error('Failed to sync emails:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    fetchEmails(true);

    const interval = setInterval(() => {
      fetchEmails(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [user, fetchEmails]);

  const toggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCancelEmail = async (id: string) => {
    try {
      const res = await api.cancelScheduledEmail(id);
      if (res.success) {
        addToast('success', 'Email cancelled', 'Removed from BullMQ queue');
        fetchEmails(false);
      }
    } catch (err: any) {
      addToast('error', 'Cancellation failed', err.message);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      const res = await api.deleteEmail(id);
      if (res.success) {
        addToast('success', 'Email deleted', 'Removed from records');
        fetchEmails(true);
      }
    } catch (err: any) {
      addToast('error', 'Delete failed', err.message);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#00AA4F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const currentEmails = activeTab === 'scheduled' ? scheduledEmails : sentEmails;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 antialiased">
      <div className="flex-1 flex">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-gray-100 p-6 flex flex-col justify-between shrink-0 bg-white">
          <div className="space-y-5">
            {/* Brand Logo "ONB" */}
            <div className="flex items-center gap-2">
              <div className="font-extrabold text-2xl tracking-tighter text-black font-mono">
                ONB
              </div>
            </div>

            {/* User Profile Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-[#F3F5F7] hover:bg-[#EAEAEA] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img
                    src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={user.name || 'Oliver Brown'}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-gray-900 leading-tight truncate">
                      {user.name || 'Oliver Brown'}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight truncate">
                      {user.email || 'oliver.brown@domain.io'}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
              </button>

              {userDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 shadow-lg rounded-xl py-1 z-30">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 font-medium"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Compose Button */}
            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className="w-full py-2 px-4 rounded-full border border-[#00AA4F] hover:bg-[#E8F8EE] text-[#00AA4F] text-xs font-semibold text-center transition-all shadow-sm active:scale-98"
            >
              Compose
            </button>

            {/* Navigation Section */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase block mb-2 px-1">
                CORE
              </span>

              <nav className="space-y-1">
                {/* Scheduled tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('scheduled')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'scheduled'
                      ? 'bg-[#E8F8EE] text-[#00AA4F] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4" />
                    <span>Scheduled</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-normal">
                    {stats?.totalScheduled ?? scheduledEmails.length}
                  </span>
                </button>

                {/* Sent tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('sent')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    activeTab === 'sent'
                      ? 'bg-[#E8F8EE] text-[#00AA4F] font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Send className="w-4 h-4" />
                    <span>Sent</span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-normal">
                    {stats?.totalSent ?? sentEmails.length}
                  </span>
                </button>
              </nav>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 text-center">
            BullMQ + Redis Engine
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Top Search & Filter Bar */}
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#F4F6F8] rounded-full text-xs text-gray-800 placeholder-gray-400 focus:outline-none border-none"
              />
            </div>

            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Filter"
            >
              <Filter className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => fetchEmails(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#00AA4F]' : ''}`} />
            </button>
          </div>

          {/* Email List Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {currentEmails.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-xs text-gray-400">
                  {searchQuery ? 'No matching emails found.' : `No ${activeTab} emails yet.`}
                </p>
              </div>
            ) : (
              currentEmails.map((item) => {
                const isStarred = starredIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEmailForView(item)}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/80 transition-colors group cursor-pointer text-xs"
                  >
                    {/* Left: Recipient, Status badge, Subject & Snippet */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Recipient */}
                      <span className="font-semibold text-gray-900 w-40 truncate shrink-0">
                        To: {item.recipientName || item.recipientEmail.split('@')[0]}
                      </span>

                      {/* Status pill badge */}
                      <span className="bg-[#EFEFEF] text-gray-600 rounded-full px-2.5 py-0.5 text-[10px] font-medium shrink-0">
                        {item.status === 'SENT' ? 'Sent' : item.status === 'SCHEDULED' ? 'Scheduled' : item.status}
                      </span>

                      {/* Subject and Body snippet */}
                      <div className="truncate flex-1 text-gray-700">
                        <span className="font-semibold text-gray-900">{item.subject}</span>
                        <span className="text-gray-400 font-normal">
                          {' '}
                          - {item.body.replace(/<[^>]*>?/gm, '').slice(0, 70)}...
                        </span>
                      </div>
                    </div>

                    {/* Right: Ethereal preview link / cancel & Star */}
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {item.etherealUrl && !item.etherealUrl.includes('sample-preview') && (
                        <a
                          href={item.etherealUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 text-[#00AA4F] hover:underline text-[11px] flex items-center gap-1 font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      {/* Delete button (for any email) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmail(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(item.id);
                        }}
                        className={`p-1 transition-colors ${
                          isStarred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-gray-500'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>

      {/* Email Detail / In-App Viewer Modal */}
      <EmailDetailModal
        email={selectedEmailForView}
        isOpen={!!selectedEmailForView}
        onClose={() => setSelectedEmailForView(null)}
      />

      {/* Compose Fullscreen View / Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={(msg) => {
          addToast('success', 'Success', msg);
          fetchEmails(true);
        }}
        onError={(msg) => addToast('error', 'Error', msg)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
