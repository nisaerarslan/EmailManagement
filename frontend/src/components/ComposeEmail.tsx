import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './ui/Button';
import { Loader2, Send, X, ChevronDown, Paperclip } from 'lucide-react';
import { mailAccountService } from '../services/mailAccountService';
import emailGroupService, { EmailGroup } from '../services/emailGroupService';
import toast from 'react-hot-toast';
import { useAccounts } from "../contexts/AccountContext";

interface ComposeEmailProps {
  isOpen: boolean;
  onClose: () => void;
  replyToEmail?: {
    id: string;
    sender: string;
    subject: string;
    initialContent?: string;
  };
}

const ComposeEmail: React.FC<ComposeEmailProps> = ({ isOpen, onClose, replyToEmail }) => {
  const { t } = useTranslation();
  const { accounts, selectedAccount } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [groups, setGroups] = useState<EmailGroup[]>([]);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ file: File; data?: string }>>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const fetchedGroups = await emailGroupService.getUserGroups();
        setGroups(fetchedGroups);
      } catch (err) {
        console.error(t('emailGroups.error.fetch'), err);
      }
    };

    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen, t]);

  // Handle clicks outside the modal to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle clicks outside the group dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      // If this is a reply and we have a selected account in the context, use that
      if (replyToEmail && selectedAccount) {
        const matchingAccount = accounts.find(acc => acc.email === selectedAccount);
        if (matchingAccount) {
          console.log("Setting account for reply from context:", matchingAccount.email);
          setSelectedAccountId(matchingAccount.account_id);
          return;
        }
      }
      
      // Otherwise set default account only if none is selected or if the selected one is no longer valid
      const currentAccountStillExists = accounts.some(acc => acc.account_id === selectedAccountId);
      if (!selectedAccountId || !currentAccountStillExists) {
        console.log("Setting default account:", accounts[0].email);
        setSelectedAccountId(accounts[0].account_id);
      }
    }
    if (!isOpen) { // Reset form on close
      resetForm();
    }
  }, [isOpen, accounts, selectedAccountId, selectedAccount, replyToEmail]);

  // Handle reply to email
  useEffect(() => {
    if (isOpen && replyToEmail) {
      // Set recipient from the original sender
      setTo(replyToEmail.sender);
      console.log("Setting reply recipient to:", replyToEmail.sender);
      
      // Set subject with Re: prefix if not already present
      const subjectPrefix = 'Re: ';
      const newSubject = replyToEmail.subject.startsWith(subjectPrefix) 
        ? replyToEmail.subject 
        : `${subjectPrefix}${replyToEmail.subject}`;
      setSubject(newSubject);
      console.log("Setting reply subject to:", newSubject);
      
      // Set reply content if provided
      if (replyToEmail.initialContent) {
        setBody(replyToEmail.initialContent);
        console.log("Setting reply body from provided content");
        
        // Focus at the beginning of textarea and set cursor position
        setTimeout(() => {
          if (bodyTextareaRef.current) {
            bodyTextareaRef.current.focus();
            bodyTextareaRef.current.setSelectionRange(0, 0);
          }
        }, 100);
      }
    }
  }, [isOpen, replyToEmail]);

  // Focus the selected account in the dropdown when the component mounts
  useEffect(() => {
    if (isOpen && selectedAccountId) {
      // Find the account with the selected ID
      const account = accounts.find(acc => acc.account_id === selectedAccountId);
      if (account) {
        console.log("Selected account in dropdown:", account.email);
        
        // If there's a dropdown element, this would scroll to the selected option
        const dropdown = document.getElementById('from');
        if (dropdown) {
          setTimeout(() => {
            // This forces the browser to recognize the selection
            dropdown.blur();
            dropdown.focus();
          }, 100);
        }
      }
    }
  }, [isOpen, selectedAccountId, accounts]);

  const resetForm = () => {
    // Don't reset selectedAccountId
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setBody('');
    setIsSending(false);
  };

  const parseRecipients = (recipientString: string): string[] => {
    if (!recipientString.trim()) return [];
    
    // Split by commas or semicolons
    return recipientString.split(/[,;]/)
      .map(email => {
        const trimmed = email.trim();
        
        // Check if the email has the format "Name <email@domain.com>"
        const matches = trimmed.match(/<([^>]+)>/);
        if (matches && matches[1]) {
          // Extract just the email part
          return matches[1].trim();
        }
        
        // Return the email as is
        return trimmed;
      })
      .filter(Boolean);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: Array<{ file: File; data?: string }> = [];
    const maxSize = 25 * 1024 * 1024; // 25MB limit

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSize) {
        toast.error(`${file.name} ${t('composeEmail.error.fileTooLarge')}`);
        continue;
      }

      newAttachments.push({ file });
    }

    // Convert files to base64
    await Promise.all(
      newAttachments.map(async (attachment) => {
        const reader = new FileReader();
        const promise = new Promise<void>((resolve) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            attachment.data = base64.split(',')[1]; // Remove data URL prefix
            resolve();
          };
        });
        reader.readAsDataURL(attachment.file);
        await promise;
      })
    );

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const toRecipients = parseRecipients(to);
    if (!selectedAccountId) {
      toast.error(t('composeEmail.error.selectAccount'));
      return;
    }
    if (toRecipients.length === 0) {
      toast.error(t('composeEmail.error.noRecipients'));
      return;
    }
    if (!subject.trim()) {
      toast.error(t('composeEmail.error.noSubject'));
      return;
    }

    setIsSending(true);
    try {
      console.log('Sending email with recipients:', toRecipients);
      
      await mailAccountService.sendEmail({
        account_id: selectedAccountId,
        to_recipients: toRecipients,
        cc_recipients: parseRecipients(cc),
        bcc_recipients: parseRecipients(bcc),
        subject: subject,
        body: body,
        reply_to_id: replyToEmail?.id,
        attachments: attachments.map(att => ({
          filename: att.file.name,
          data: att.data as string,
          mimeType: att.file.type
        }))
      });
      
      toast.success(t('composeEmail.success'));
      onClose();
    } catch (error: any) {
      console.error('Failed to send email:', error);
      
      let errorMessage = t('composeEmail.error.generic');
      
      if (error.message) {
        if (error.message.includes('email addresses')) {
          errorMessage = t('composeEmail.error.invalidEmails');
        } else if (error.message.includes('authentication') || error.message.includes('token')) {
          errorMessage = t('composeEmail.error.authFailed');
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectGroup = (group: EmailGroup) => {
    const currentRecipients = new Set(parseRecipients(to));
    group.members.forEach(member => {
      currentRecipients.add(member.email);
    });
    setTo(Array.from(currentRecipients).join(', '));
    setIsGroupDropdownOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Modal Content Area */}
      <div ref={modalRef} className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {replyToEmail ? t('composeEmail.reply') : t('composeEmail.title')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="p-1.5 dark:text-gray-400 dark:hover:bg-gray-700 dark:border-gray-600"
            aria-label={t('composeEmail.close')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* From Account Selector */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="from" className="text-right text-sm font-medium dark:text-gray-300">
              {t('composeEmail.from')}
            </label>
            <select
              id="from"
              value={selectedAccountId ?? ''}
              onChange={(e) => setSelectedAccountId(Number(e.target.value))}
              className="col-span-3 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              disabled={accounts.length <= 1}
            >
              {accounts.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {account.email}
                </option>
              ))}
            </select>
          </div>

          {/* To Field with Group Selector */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="to" className="text-right text-sm font-medium dark:text-gray-300">
              {t('composeEmail.to')}
            </label>
            <div className="col-span-3 flex gap-2">
              <input
                id="to"
                type="email"
                multiple
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={t('composeEmail.recipientsPlaceholder')}
                className="flex-1 dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="relative" ref={groupDropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className="flex items-center gap-1"
                >
                  {t('composeEmail.selectGroup')}
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {isGroupDropdownOpen && groups.length > 0 && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg border dark:border-gray-600 z-10">
                    {groups.map((group) => (
                      <button
                        key={group.group_id}
                        onClick={() => handleSelectGroup(group)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        {group.group_name} ({group.members.length})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cc Field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="cc" className="text-right text-sm font-medium dark:text-gray-300">
              {t('composeEmail.cc')}
            </label>
            <input
              id="cc"
              type="email"
              multiple
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder={t('composeEmail.optional')}
              className="col-span-3 dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bcc Field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="bcc" className="text-right text-sm font-medium dark:text-gray-300">
              {t('composeEmail.bcc')}
            </label>
            <input
              id="bcc"
              type="email"
              multiple
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder={t('composeEmail.optional')}
              className="col-span-3 dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject Field */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="subject" className="text-right text-sm font-medium dark:text-gray-300">
              {t('composeEmail.subject')}
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('composeEmail.subjectPlaceholder')}
              className="col-span-3 dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body Field */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label htmlFor="body" className="text-right text-sm font-medium dark:text-gray-300 pt-2">
              {t('composeEmail.content')}
            </label>
            <textarea
              id="body"
              ref={bodyTextareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('composeEmail.contentPlaceholder')}
              className="col-span-3 dark:bg-gray-700 dark:text-white dark:border-gray-600 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-y"
            />
          </div>

          {/* Attachments Field */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-right text-sm font-medium dark:text-gray-300 pt-2">
              {t('composeEmail.attachments')}
            </label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  accept="*/*"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1"
                >
                  <Paperclip className="h-4 w-4" />
                  {t('composeEmail.addAttachment')}
                </Button>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-gray-800 text-gray-100 border border-gray-700"
                    >
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className="truncate max-w-[180px]">{attachment.file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t dark:border-gray-700">
          <Button
            variant="outline"
            onClick={onClose}
            className="dark:border-gray-600 dark:text-gray-300"
          >
            {t('composeEmail.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t('composeEmail.send')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComposeEmail; 