import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SenderAccount } from '../../types';
import { X, Gauge, Plus, CheckCircle2, ShieldCheck, Mail, RefreshCw } from 'lucide-react';

interface SendersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const SendersModal: React.FC<SendersModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New sender form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newHourlyLimit, setNewHourlyLimit] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSenders = async () => {
    setIsLoading(true);
    try {
      const res = await api.getSenders();
      if (res.success && res.data) {
        setSenders(res.data);
      }
    } catch (err: any) {
      onError('Failed to load senders: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSenders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddSender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      onError('Please enter an email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createSender({
        email: newEmail.trim(),
        name: newName.trim() || undefined,
        hourlyLimit: newHourlyLimit,
      });

      if (res.success) {
        onSuccess(`Sender ${newEmail} created with ${newHourlyLimit}/hr limit`);
        setNewEmail('');
        setNewName('');
        setShowAddForm(false);
        fetchSenders();
      }
    } catch (err: any) {
      onError('Failed to create sender: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#181c24] border border-[#262d3d] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#262d3d] bg-[#0f1218]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Senders & Rate Limits</h2>
              <p className="text-xs text-slate-400">Manage multiple sender accounts and hourly Redis throttles</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Configured Senders</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSenders}
                className="p-2 rounded-lg bg-[#0f1218] hover:bg-[#222836] border border-[#262d3d] text-slate-400 hover:text-white text-xs transition-colors"
                title="Refresh rate limits"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel' : 'Add Sender'}</span>
              </button>
            </div>
          </div>

          {/* Add Sender Form */}
          {showAddForm && (
            <form onSubmit={handleAddSender} className="p-4 rounded-xl bg-[#0f1218] border border-[#262d3d] space-y-3">
              <h4 className="text-xs font-bold text-white">Add New Sender Account</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Sender Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="outreach@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#181c24] border border-[#262d3d] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Sender Display Name</label>
                  <input
                    type="text"
                    placeholder="Outreach Team"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#181c24] border border-[#262d3d] text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hourly Limit ({newHourlyLimit}/hr)</label>
                <input
                  type="range"
                  min={10}
                  max={500}
                  step={10}
                  value={newHourlyLimit}
                  onChange={(e) => setNewHourlyLimit(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                >
                  {isSubmitting ? 'Saving...' : 'Save Sender'}
                </button>
              </div>
            </form>
          )}

          {/* Senders List */}
          <div className="space-y-3">
            {senders.map((sender) => {
              const usage = sender.currentUsage || 0;
              const limit = sender.hourlyLimit || 100;
              const percent = Math.min(100, Math.round((usage / limit) * 100));

              return (
                <div key={sender.id} className="p-4 rounded-xl bg-[#0f1218] border border-[#262d3d]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{sender.name || sender.email}</h4>
                        <p className="text-[11px] text-slate-400">{sender.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Hourly Rate Limit:</span>
                      <span className="font-bold text-white px-2 py-0.5 rounded bg-[#181c24] border border-[#262d3d]">
                        {limit} emails/hr
                      </span>
                    </div>
                  </div>

                  {/* Progress Meter */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Current Hour Window Usage:</span>
                      <span className="font-medium text-slate-300">
                        {usage} / {limit} sent ({percent}%)
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#181c24] overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          percent > 90 ? 'bg-rose-500' : percent > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262d3d] bg-[#0f1218]/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
