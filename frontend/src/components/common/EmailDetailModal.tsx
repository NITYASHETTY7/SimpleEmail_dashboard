import React from 'react';
import { EmailJob } from '../../types';
import {
  X,
  Clock,
  Send,
  ExternalLink,
  Calendar,
  User,
  Mail,
  ShieldCheck,
  AlertCircle,
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
  if (!isOpen || !email) return null;

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

  const isRealEtherealUrl = email.etherealUrl && !email.etherealUrl.includes('sample-preview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                email.status === 'SENT'
                  ? 'bg-[#E8F8EE] text-[#00AA4F]'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {email.status === 'SENT' ? (
                <Send className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 line-clamp-1">
                {email.subject}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    email.status === 'SENT'
                      ? 'bg-[#E8F8EE] text-[#00AA4F]'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {email.status}
                </span>
                <span className="text-[11px] text-gray-400 font-medium">
                  {email.status === 'SENT' ? 'Sent:' : 'Scheduled:'}{' '}
                  {formatDate(email.status === 'SENT' ? email.sentAt : email.scheduledAt)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Summary */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-2 bg-white text-xs">
          <div className="flex items-center">
            <span className="text-gray-500 font-medium w-16">From:</span>
            <span className="text-gray-900 font-semibold flex-1 truncate">
              {email.senderEmail}
            </span>
          </div>

          <div className="flex items-center">
            <span className="text-gray-500 font-medium w-16">To:</span>
            <span className="text-gray-900 font-semibold flex-1 truncate">
              {email.recipientEmail} {email.recipientName ? `(${email.recipientName})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-6 pt-1 text-[11px] text-gray-400">
            <span>Delay between sends: {Math.round(email.delayBetweenMs / 1000)}s</span>
            <span>Hourly Limit: {email.hourlyLimit}/hr</span>
            {email.retryCount > 0 && <span>Retries: {email.retryCount}</span>}
          </div>
        </div>

        {/* Rendered Email Body */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#FFFFFF]">
          <div
            className="rich-editor-content text-sm text-gray-800 leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        </div>

        {/* Footer with Actions */}
        <div className="p-4 border-t border-gray-100 bg-[#F9FAFB] flex items-center justify-between">
          <div>
            {isRealEtherealUrl ? (
              <a
                href={email.etherealUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E8F8EE] hover:bg-[#DCF3E5] text-[#00AA4F] text-xs font-semibold shadow-sm transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Ethereal Inbox</span>
              </a>
            ) : email.status === 'SCHEDULED' ? (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Queued in BullMQ • Scheduled for {formatDate(email.scheduledAt)}</span>
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">Delivered via Ethereal SMTP</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
