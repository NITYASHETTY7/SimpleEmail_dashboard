import React, { useState, useEffect } from 'react';
import { EmailJob } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Clock,
  Send,
  ExternalLink,
  Maximize2,
  Minimize2,
  Calendar,
  User,
  Mail,
  Paperclip,
  ZoomIn,
} from 'lucide-react';

interface EmailDetailModalProps {
  email: EmailJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  email,
  isOpen,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<EmailJob | null>(email);

  useEffect(() => {
    setCurrentEmail(email);
  }, [email]);

  // Real-time live status updater while modal is open
  useEffect(() => {
    if (!isOpen || !currentEmail || currentEmail.status === 'SENT') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getSentEmails({ limit: 50 });
        if (res.success && res.data) {
          const matchingSent = res.data.find((e) => e.id === currentEmail.id);
          if (matchingSent) {
            setCurrentEmail(matchingSent);
          }
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, currentEmail]);

  if (!isOpen || !currentEmail) return null;

  const displayEmail = currentEmail;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return dateStr;
    }
  };

  const isRealEtherealUrl = displayEmail.etherealUrl && !displayEmail.etherealUrl.includes('sample-preview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`relative bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full max-w-6xl max-h-[96vh] rounded-2xl'
            : 'w-full max-w-4xl max-h-[88vh] rounded-3xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-[#FAFAFA]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                displayEmail.status === 'SENT'
                  ? 'bg-[#E8F8EE] text-[#00AA4F]'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {displayEmail.status === 'SENT' ? (
                <Send className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {displayEmail.subject}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    displayEmail.status === 'SENT'
                      ? 'bg-[#E8F8EE] text-[#00AA4F]'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {displayEmail.status}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {displayEmail.status === 'SENT' ? 'Sent:' : 'Scheduled:'}{' '}
                  {formatDate(displayEmail.status === 'SENT' ? displayEmail.sentAt : displayEmail.scheduledAt)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors"
              title={isFullscreen ? 'Exit Full Page' : 'Open Full Page'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Details Bar */}
        <div className="px-6 py-3.5 border-b border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-gray-400 font-medium w-12">From:</span>
            <span className="text-gray-900 font-semibold truncate">
              {displayEmail.senderEmail}
            </span>
          </div>

          <div className="flex items-center gap-2 truncate">
            <span className="text-gray-400 font-medium w-12">To:</span>
            <span className="text-gray-900 font-semibold truncate">
              {displayEmail.recipientEmail} {displayEmail.recipientName ? `(${displayEmail.recipientName})` : ''}
            </span>
          </div>

          <div className="sm:col-span-2 flex items-center gap-6 pt-1 text-[11px] text-gray-400 border-t border-gray-50 mt-1">
            <span>Delay between sends: {Math.round(displayEmail.delayBetweenMs / 1000)}s</span>
            <span>Hourly Limit: {displayEmail.hourlyLimit}/hr</span>
            {displayEmail.retryCount > 0 && <span>Retries: {displayEmail.retryCount}</span>}
          </div>
        </div>

        {/* Rendered Email Body with Full Natural Aspect Ratio Images */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-white">
          <div
            className="rich-editor-content text-sm sm:text-base text-gray-800 leading-relaxed max-w-none"
            dangerouslySetInnerHTML={{ __html: displayEmail.body }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-[#FAFAFA] flex items-center justify-between">
          <div>
            {isRealEtherealUrl ? (
              <a
                href={displayEmail.etherealUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E8F8EE] hover:bg-[#DCF3E5] text-[#00AA4F] text-xs font-semibold shadow-sm transition-all active:scale-[0.99]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Ethereal Inbox</span>
              </a>
            ) : displayEmail.status === 'SCHEDULED' ? (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Queued in BullMQ • Scheduled for {formatDate(displayEmail.scheduledAt)}</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">Delivered via Ethereal SMTP</span>
            )}
          </div>

          <span className="text-[11px] text-gray-400 font-medium">
            ReachInbox Engine
          </span>
        </div>
      </div>
    </div>
  );
};
