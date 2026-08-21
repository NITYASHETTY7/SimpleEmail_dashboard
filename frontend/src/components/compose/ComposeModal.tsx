import React, { useState, useRef, useEffect } from 'react';
import { api } from '../../services/api';
import { SenderAccount } from '../../types';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  ChevronDown,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronsUpDown,
  ListOrdered,
  List,
  Indent,
  Outdent,
  Quote,
  Flag,
  Strikethrough,
  Calendar,
  X,
  Plus,
  ChevronUp,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

interface AttachmentFile {
  id: string;
  name: string;
  url: string;
  type: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
}) => {
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>('oliver.brown@domain.io');
  const [isCustomSenderMode, setIsCustomSenderMode] = useState(false);
  const [customSenderInput, setCustomSenderInput] = useState('');

  // Leads & Recipients
  const [singleRecipient, setSingleRecipient] = useState('');
  const [leads, setLeads] = useState<Array<{ email: string; name?: string }>>([]);
  const [isAllLeadsExpanded, setIsAllLeadsExpanded] = useState(false);
  const [inlineNewEmail, setInlineNewEmail] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  // CC & BCC
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccList, setCcList] = useState<string[]>([]);
  const [bccList, setBccList] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');

  // Email Fields
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Delay & Hourly Limit
  const [delayBetweenSeconds, setDelayBetweenSeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);

  // Scheduling Time
  const [isSchedulePickerOpen, setIsSchedulePickerOpen] = useState(true);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toolbar toggles & dropdowns
  const [isTextSizeOpen, setIsTextSizeOpen] = useState(false);
  const [isGreenActive, setIsGreenActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.getSenders().then((res) => {
        if (res.success && res.data.length > 0) {
          setSenders(res.data);
          setSelectedSender(res.data[0].email);
          if (res.data[0].hourlyLimit) {
            setHourlyLimit(res.data[0].hourlyLimit);
          }
        }
      }).catch(() => {});

      const d = new Date(Date.now() + 2 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setScheduledDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);

      setTimeout(() => {
        if (editorRef.current && !editorRef.current.innerHTML) {
          editorRef.current.innerHTML = 'hey , am sending this email to test';
        }
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Rich Text Action Handlers with Selection Preservation
  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const handleHeadingChange = (tag: string) => {
    document.execCommand('formatBlock', false, `<${tag}>`);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
    setIsTextSizeOpen(false);
  };

  const toggleGreenColor = () => {
    if (isGreenActive) {
      document.execCommand('foreColor', false, '#111827');
      setIsGreenActive(false);
    } else {
      document.execCommand('foreColor', false, '#00AA4F');
      setIsGreenActive(true);
    }
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const toggleQuote = () => {
    const selection = window.getSelection();
    let inBlockquote = false;
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'BLOCKQUOTE') {
          inBlockquote = true;
          break;
        }
        node = node.parentNode;
      }
    }

    if (inBlockquote) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<blockquote>');
    }
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  // Client-side CSV/TXT lead list parser
  const parseClientCsv = (text: string): Array<{ email: string; name?: string }> => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const headerCols = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const emailIdx = headerCols.findIndex((h) => h.includes('email') || h.includes('mail') || h.includes('recipient'));
    const nameIdx = headerCols.findIndex((h) => h.includes('name') || h.includes('first') || h.includes('lead'));

    const parsed: Array<{ email: string; name?: string }> = [];
    const startRow = emailIdx !== -1 ? 1 : 0;
    const targetEmailIdx = emailIdx !== -1 ? emailIdx : 0;

    for (let i = startRow; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const emailCandidate = cols[targetEmailIdx] || cols.find((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) || '';
      if (emailCandidate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCandidate)) {
        parsed.push({
          email: emailCandidate,
          name: nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : emailCandidate.split('@')[0],
        });
      }
    }
    return parsed;
  };

  // Lead List Upload Handler
  const handleFileUpload = async (file: File) => {
    setFileName(file.name);

    // 1. Instant client-side parse
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const clientLeads = parseClientCsv(text);
        if (clientLeads.length > 0) {
          setLeads((prev) => {
            const existing = new Set(prev.map((p) => p.email.toLowerCase()));
            const unique = clientLeads.filter((c) => !existing.has(c.email.toLowerCase()));
            return [...prev, ...unique];
          });
        }
      }
    };
    reader.readAsText(file);

    // 2. Also send to backend parser for verification
    try {
      const res = await api.parseLeadsFile(file);
      if (res.success && res.data && res.data.validLeads.length > 0) {
        setLeads((prev) => {
          const existing = new Set(prev.map((p) => p.email.toLowerCase()));
          const unique = res.data.validLeads.filter((l) => !existing.has(l.email.toLowerCase()));
          return [...prev, ...unique];
        });
      }
    } catch {
      // Client parse already handled it
    }
  };

  // Add individual email chip to To list
  const handleAddInlineEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inlineNewEmail.trim().replace(',', '');
      if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setLeads((prev) => [...prev, { email: val }]);
        setInlineNewEmail('');
      }
    }
  };

  // CC / BCC handlers
  const handleAddCc = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = ccInput.trim().replace(',', '');
      if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setCcList((prev) => [...prev, val]);
        setCcInput('');
      }
    }
  };

  const handleAddBcc = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = bccInput.trim().replace(',', '');
      if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setBccList((prev) => [...prev, val]);
        setBccInput('');
      }
    }
  };

  // Attachment Upload Handler
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAttachment: AttachmentFile = {
            id: Date.now().toString(),
            name: file.name,
            url: event.target.result as string,
            type: file.type,
          };
          setAttachments((prev) => [...prev, newAttachment]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const removeLead = (index: number) => {
    setLeads(leads.filter((_, i) => i !== index));
  };

  // Submission
  const handleSubmit = async (isSendLater: boolean = true) => {
    const content = editorRef.current ? editorRef.current.innerHTML : bodyHtml;
    const finalSender = isCustomSenderMode && customSenderInput ? customSenderInput.trim() : selectedSender;

    if (!subject.trim()) {
      onError('Please enter an email subject');
      return;
    }

    if (!content.trim() || content === '<br>') {
      onError('Please enter your email content');
      return;
    }

    // Combine editor HTML with attached images
    let finalHtml = editorRef.current ? editorRef.current.innerHTML : bodyHtml;
    if (attachments.length > 0) {
      const attachmentsHtml = `<div class="email-attachments" style="margin-top: 20px; display: flex; gap: 12px; flex-wrap: wrap;">${attachments
        .map(
          (a) =>
            `<img src="${a.url}" alt="${a.name}" style="max-width: 280px; max-height: 180px; object-fit: cover; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.06);" />`
        )
        .join('')}</div>`;
      finalHtml = `${finalHtml}${attachmentsHtml}`;
    }

    const scheduledDate = scheduledDateTime ? new Date(scheduledDateTime) : new Date(Date.now() + 1000);

    setIsSubmitting(true);
    try {
      if (leads.length > 0) {
        const res = await api.scheduleBatchCampaign({
          senderEmail: finalSender,
          recipients: leads,
          subject,
          body: finalHtml,
          scheduledAt: scheduledDate.toISOString(),
          delayBetweenMs: (delayBetweenSeconds || 2) * 1000,
          hourlyLimit: hourlyLimit || 100,
          batchName: fileName || 'Campaign',
        });

        if (res.success) {
          onSuccess(`Successfully scheduled ${leads.length} emails with BullMQ!`);
          onClose();
        } else {
          onError(res.message || 'Failed to schedule campaign');
        }
      } else {
        if (!singleRecipient.trim()) {
          onError('Please enter a recipient email or upload a leads list');
          setIsSubmitting(false);
          return;
        }

        const res = await api.scheduleSingleEmail({
          senderEmail: finalSender,
          recipientEmail: singleRecipient.trim(),
          subject,
          body: finalHtml,
          scheduledAt: scheduledDate.toISOString(),
          delayBetweenMs: (delayBetweenSeconds || 2) * 1000,
          hourlyLimit: hourlyLimit || 100,
        });

        if (res.success) {
          onSuccess(`Email to ${singleRecipient} scheduled successfully!`);
          onClose();
        } else {
          onError(res.message || 'Failed to schedule email');
        }
      }
    } catch (err: any) {
      onError('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedLeads = isAllLeadsExpanded ? leads : leads.slice(0, 3);
  const hiddenLeadsCount = Math.max(0, leads.length - 3);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto animate-in fade-in duration-150">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-[#111827] tracking-tight">Compose New Email</h1>
        </div>

        {/* Action icons & Send Later button */}
        <div className="flex items-center gap-4">
          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleAttachmentUpload}
          />
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="flex items-center gap-1 text-[#00AA4F] hover:bg-[#E8F8EE] p-1.5 rounded-lg transition-colors"
            title="Add File / Image Attachment"
          >
            <Paperclip className="w-5 h-5" />
            <span className="text-xs font-bold">{attachments.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSchedulePickerOpen(!isSchedulePickerOpen)}
            className="text-[#00AA4F] p-1.5 hover:bg-[#E8F8EE] rounded-lg transition-colors"
            title="Set Scheduled Send Time"
          >
            <Clock className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="px-5 py-1.5 rounded-full border border-[#00AA4F] hover:bg-[#E8F8EE] text-[#00AA4F] font-semibold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Scheduling...' : 'Send Later'}
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-8 py-6 space-y-4">
        {/* Schedule Time Banner */}
        {isSchedulePickerOpen && (
          <div className="p-3 bg-[#E8F8EE] border border-[#B2E8CA] rounded-xl flex items-center justify-between text-xs text-[#00AA4F] animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#00AA4F]" />
              <span className="font-medium text-[#00AA4F]">Schedule Start Time:</span>
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="bg-white border border-[#00AA4F] rounded-lg px-2.5 py-1 text-gray-800 text-xs focus:outline-none font-medium shadow-sm"
              />
            </div>
            <button
              onClick={() => setIsSchedulePickerOpen(false)}
              className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-white/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* From Row with Add Custom Sender Option */}
        <div className="flex items-center py-2">
          <label className="text-xs text-gray-600 font-medium w-36 shrink-0">From</label>
          <div className="flex items-center gap-2">
            {!isCustomSenderMode ? (
              <div className="relative">
                <select
                  value={selectedSender}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setIsCustomSenderMode(true);
                    } else {
                      setSelectedSender(e.target.value);
                    }
                  }}
                  className="appearance-none bg-[#F3F5F7] text-gray-800 text-xs font-medium px-3.5 py-1.5 pr-8 rounded-lg focus:outline-none cursor-pointer border-none"
                >
                  {senders.map((s) => (
                    <option key={s.id} value={s.email}>
                      {s.email}
                    </option>
                  ))}
                  <option value="oliver.brown@domain.io">oliver.brown@domain.io</option>
                  <option value="__add_new__">+ Enter custom sender address...</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="custom.sender@domain.com"
                  value={customSenderInput}
                  onChange={(e) => setCustomSenderInput(e.target.value)}
                  className="px-3 py-1 text-xs rounded-lg bg-[#F3F5F7] border border-gray-300 text-gray-900 focus:outline-none focus:border-[#00AA4F]"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomSenderMode(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* To Row */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center flex-1 gap-2 flex-wrap">
            <label className="text-xs text-gray-600 font-medium w-36 shrink-0">To</label>
            {leads.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {displayedLeads.map((lead, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#E8F8EE] border border-[#00AA4F] text-[#00AA4F] animate-in fade-in"
                  >
                    <span>{lead.email}</span>
                    <button
                      type="button"
                      onClick={() => removeLead(idx)}
                      className="hover:text-red-500 font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {/* Expanding +N Badge */}
                {!isAllLeadsExpanded && hiddenLeadsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAllLeadsExpanded(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E8F8EE] hover:bg-[#d5f3e1] border border-[#00AA4F] text-[#00AA4F] transition-colors cursor-pointer shadow-sm"
                    title="Click to view all leads"
                  >
                    <span>+{hiddenLeadsCount}</span>
                  </button>
                )}

                {isAllLeadsExpanded && (
                  <button
                    type="button"
                    onClick={() => setIsAllLeadsExpanded(false)}
                    className="text-[11px] text-gray-500 hover:text-gray-800 underline ml-1"
                  >
                    Collapse
                  </button>
                )}

                {/* Inline add email input even after bulk upload */}
                <input
                  type="text"
                  placeholder="+ Add email (press Enter)..."
                  value={inlineNewEmail}
                  onChange={(e) => setInlineNewEmail(e.target.value)}
                  onKeyDown={handleAddInlineEmail}
                  className="text-xs text-gray-800 placeholder-gray-400 focus:outline-none border-none py-1 min-w-[160px]"
                />

                <button
                  type="button"
                  onClick={() => setLeads([])}
                  className="text-xs text-red-500 hover:underline ml-2"
                >
                  Clear Leads
                </button>
              </div>
            ) : (
              <input
                type="email"
                placeholder="recipient@example.com"
                value={singleRecipient}
                onChange={(e) => setSingleRecipient(e.target.value)}
                className="flex-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none border-none py-1"
              />
            )}
          </div>

          {/* Right Action Buttons: Cc, Bcc & Upload List */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <button
              type="button"
              onClick={() => setShowCc(!showCc)}
              className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                showCc ? 'text-[#00AA4F] bg-[#E8F8EE]' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Cc
            </button>
            <button
              type="button"
              onClick={() => setShowBcc(!showBcc)}
              className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                showBcc ? 'text-[#00AA4F] bg-[#E8F8EE]' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              Bcc
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#00AA4F] hover:text-[#009243] text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload List</span>
            </button>
          </div>
        </div>

        {/* CC Row */}
        {showCc && (
          <div className="flex items-center py-2 border-b border-gray-100 animate-in fade-in duration-150">
            <label className="text-xs text-gray-600 font-medium w-36 shrink-0">Cc</label>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {ccList.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  <span>{c}</span>
                  <button onClick={() => setCcList(ccList.filter((_, idx) => idx !== i))}>×</button>
                </span>
              ))}
              <input
                type="email"
                placeholder="cc@example.com (press Enter)"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={handleAddCc}
                className="flex-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none border-none py-1 min-w-[150px]"
              />
            </div>
          </div>
        )}

        {/* BCC Row */}
        {showBcc && (
          <div className="flex items-center py-2 border-b border-gray-100 animate-in fade-in duration-150">
            <label className="text-xs text-gray-600 font-medium w-36 shrink-0">Bcc</label>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {bccList.map((b, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  <span>{b}</span>
                  <button onClick={() => setBccList(bccList.filter((_, idx) => idx !== i))}>×</button>
                </span>
              ))}
              <input
                type="email"
                placeholder="bcc@example.com (press Enter)"
                value={bccInput}
                onChange={(e) => setBccInput(e.target.value)}
                onKeyDown={handleAddBcc}
                className="flex-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none border-none py-1 min-w-[150px]"
              />
            </div>
          </div>
        )}

        {/* Subject Row */}
        <div className="flex items-center py-2 border-b border-gray-100">
          <label className="text-xs text-gray-600 font-medium w-36 shrink-0">Subject</label>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 text-xs text-gray-800 placeholder-gray-400 focus:outline-none border-none py-1"
          />
        </div>

        {/* Throttling Row */}
        <div className="flex items-center gap-8 py-2">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 font-medium">Delay between 2 emails</label>
            <input
              type="number"
              min="0"
              max="60"
              placeholder="00"
              value={delayBetweenSeconds}
              onChange={(e) => setDelayBetweenSeconds(Number(e.target.value))}
              className="w-14 h-8 bg-white border border-gray-200 rounded-lg text-center font-medium text-xs text-gray-800 focus:outline-none focus:border-[#00AA4F]"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 font-medium">Hourly Limit</label>
            <input
              type="number"
              min="1"
              max="1000"
              placeholder="00"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-14 h-8 bg-white border border-gray-200 rounded-lg text-center font-medium text-xs text-gray-800 focus:outline-none focus:border-[#00AA4F]"
            />
          </div>
        </div>

        {/* Interactive Rich Email Body Editor Card */}
        <div className="bg-[#F9FAFB] rounded-2xl p-6 min-h-[400px] flex flex-col justify-between border border-gray-100 relative">
          <div>
            {/* Formatting Toolbar Pill */}
            <div className="bg-white rounded-full border border-gray-200/80 shadow-sm px-4 py-2 flex items-center gap-3.5 mb-5 max-w-fit relative select-none">
              {/* Undo / Redo */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('undo');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5"
                title="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('redo');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5"
                title="Redo"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <span className="text-gray-200">|</span>

              {/* Text Size / Heading Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsTextSizeOpen(!isTextSizeOpen);
                  }}
                  className="text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-0.5 p-0.5 rounded hover:bg-gray-100"
                  title="Text Size & Headings"
                >
                  <span>Tt</span>
                  <ChevronsUpDown className="w-3 h-3" />
                </button>

                {isTextSizeOpen && (
                  <div className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-30 min-w-[130px] animate-in fade-in">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleHeadingChange('h1');
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm font-bold text-gray-900 hover:bg-gray-50"
                    >
                      Heading 1
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleHeadingChange('h2');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      Heading 2
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleHeadingChange('p');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Paragraph
                    </button>
                  </div>
                )}
              </div>

              <span className="text-gray-200">|</span>

              {/* Basic Styles */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('bold');
                }}
                className="text-gray-700 hover:text-gray-900 font-bold text-xs p-0.5 hover:bg-gray-100 rounded"
                title="Bold (Ctrl+B)"
              >
                B
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('italic');
                }}
                className="text-gray-700 hover:text-gray-900 italic text-xs font-serif p-0.5 hover:bg-gray-100 rounded"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('underline');
                }}
                className="text-gray-700 hover:text-gray-900 underline text-xs p-0.5 hover:bg-gray-100 rounded"
                title="Underline (Ctrl+U)"
              >
                U
              </button>

              <span className="text-gray-200">|</span>

              {/* Alignment */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('justifyLeft');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('justifyCenter');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5"
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('justifyRight');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-gray-200">|</span>

              {/* Lists */}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('insertOrderedList');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5 hover:bg-gray-100 rounded"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('insertUnorderedList');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5 hover:bg-gray-100 rounded"
                title="Bulleted List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('indent');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5"
                title="Indent"
              >
                <Indent className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('outdent');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5"
                title="Outdent"
              >
                <Outdent className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggleQuote();
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5 hover:bg-gray-100 rounded"
                title="Quote (Blockquote)"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggleGreenColor();
                }}
                className={`p-0.5 rounded transition-colors ${
                  isGreenActive ? 'text-[#00AA4F] bg-[#E8F8EE]' : 'text-gray-500 hover:text-[#00AA4F]'
                }`}
                title={isGreenActive ? 'Disable Green Highlight' : 'Enable Green Highlight'}
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand('strikeThrough');
                }}
                className="text-gray-500 hover:text-gray-800 p-0.5 hover:bg-gray-100 rounded"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editable Content Area */}
            <div
              ref={editorRef}
              contentEditable
              onInput={(e) => setBodyHtml((e.target as HTMLElement).innerHTML)}
              className="rich-editor-content w-full min-h-[160px] bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Attachments Preview Grid at Bottom */}
          {attachments.length > 0 && (
            <div className="pt-4 border-t border-gray-200/50">
              <div className="flex items-center gap-3 flex-wrap">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="relative group w-28 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100"
                  >
                    {attachment.type.startsWith('image') || attachment.url.startsWith('http') || attachment.url.startsWith('data:image') ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-gray-600 font-medium">
                        <Paperclip className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="truncate w-full">{attachment.name}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition-all opacity-90 hover:opacity-100 hover:scale-110"
                      title="Remove Attachment"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#00AA4F] text-gray-400 hover:text-[#00AA4F] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add File</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
