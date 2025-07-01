import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, X, AlertCircle, Trash2, RotateCcw, CheckSquare, Square, ChevronUp, ChevronDown, Lock, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import Dialog from '../components/ui/Dialog';
import CustomCheckbox from '../components/ui/CustomCheckbox';
import { mailAccountService } from '../services/mailAccountService';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

interface DeletedEmail {
  message_id: string;
  account_id: number;
  user_id: number;
  from: string;
  to_recipients: string[];
  cc_recipients?: string[];
  bcc_recipients?: string[];
  subject: string;
  body: string;
  body_type?: string;
  sent_at: string;
  created_date: string;
  account_email: string;
  has_attachments?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    contentType: string;
    size: number;
    isInline: boolean;
    url?: string;
  }>;
  access_token?: string;
}

export default function DeletedItems() {
  const { t } = useTranslation();
  const [deletedEmails, setDeletedEmails] = useState<DeletedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<DeletedEmail | null>(null);
  const [showEmailDetails, setShowEmailDetails] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<DeletedEmail | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const itemsPerPage = 12;

  const fetchDeletedEmails = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await mailAccountService.getDeletedEmails(itemsPerPage, offset);
      
      if (!response || !Array.isArray(response.deleted_emails)) {
        throw new Error(t('deletedItems.error.invalidResponse'));
      }

      const total = response.total_count || 0;
      const pages = Math.ceil(total / itemsPerPage);
      
      if (page > pages && pages > 0) {
        return fetchDeletedEmails(pages);
      }

      setDeletedEmails(response.deleted_emails);
      setTotalEmails(total);
      setTotalPages(pages);
      setCurrentPage(page);
      setSelectedEmails(new Set()); // Reset selections on page change
    } catch (err: any) {
      console.error("Error fetching deleted emails:", err);
      const errorMessage = err.message || t('deletedItems.error.fetch');
      setError(errorMessage);
      toast.error(errorMessage);
      setDeletedEmails([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('common.error.notAuthenticated'));
      return;
    }
    fetchDeletedEmails(1);
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatDetailDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleRestoreEmail = async (email: DeletedEmail) => {
    try {
      const success = await mailAccountService.restoreEmail(email.account_id, email.message_id);
      if (success) {
        toast.success(t('deletedItems.success.restored'));
        setDeletedEmails(prev => prev.filter(e => e.message_id !== email.message_id));
        if (selectedEmail?.message_id === email.message_id) {
          setSelectedEmail(null);
        }
        setSelectedEmails(prev => {
          const newSet = new Set(prev);
          newSet.delete(email.message_id);
          return newSet;
        });
      } else {
        toast.error(t('deletedItems.error.restore'));
      }
    } catch (error: any) {
      toast.error(error.message || t('deletedItems.error.restore'));
    }
  };

  const handleBulkRestore = async () => {
    if (selectedEmails.size === 0) {
      toast.error(t('deletedItems.error.noEmailsSelected'));
      return;
    }

    const loadingToast = toast.loading(t('deletedItems.info.restoringEmails', { count: selectedEmails.size }));
    let successCount = 0;
    let failCount = 0;

    try {
      const selectedEmailObjects = deletedEmails.filter(email => selectedEmails.has(email.message_id));
      
      for (const email of selectedEmailObjects) {
        try {
          const success = await mailAccountService.restoreEmail(email.account_id, email.message_id);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          console.error('Error restoring email:', error);
        }
      }

      // Update UI
      setDeletedEmails(prev => prev.filter(email => !selectedEmails.has(email.message_id)));
      setSelectedEmails(new Set());
      
      if (successCount > 0) {
        toast.success(t('deletedItems.success.bulkRestored', { count: successCount }));
      }
      if (failCount > 0) {
        toast.error(t('deletedItems.error.bulkRestoreFailed', { count: failCount }));
      }
    } catch (error) {
      console.error('Bulk restore error:', error);
      toast.error(t('deletedItems.error.bulkRestore'));
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handlePermanentDelete = async (email: DeletedEmail) => {
    setEmailToDelete(email);
    setShowDeleteDialog(true);
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) {
      toast.error(t('deletedItems.error.noEmailsSelected'));
      return;
    }
    setShowBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    const loadingToast = toast.loading(t('deletedItems.info.deletingEmails', { count: selectedEmails.size }));
    let successCount = 0;
    let failCount = 0;

    try {
      const selectedEmailObjects = deletedEmails.filter(email => selectedEmails.has(email.message_id));
      
      for (const email of selectedEmailObjects) {
        try {
          const success = await mailAccountService.permanentDeleteEmail(email.account_id, email.message_id);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
          console.error('Error deleting email:', error);
        }
      }

      // Update UI
      setDeletedEmails(prev => prev.filter(email => !selectedEmails.has(email.message_id)));
      setSelectedEmails(new Set());
      
      if (successCount > 0) {
        toast.success(t('deletedItems.success.bulkDeleted', { count: successCount }));
      }
      if (failCount > 0) {
        toast.error(t('deletedItems.error.bulkDeleteFailed', { count: failCount }));
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(t('deletedItems.error.bulkDelete'));
    } finally {
      toast.dismiss(loadingToast);
      setShowBulkDeleteDialog(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!emailToDelete) return;

    try {
      const success = await mailAccountService.permanentDeleteEmail(emailToDelete.account_id, emailToDelete.message_id);
      if (success) {
        toast.success(t('deletedItems.success.deleted'));
        setDeletedEmails(prev => prev.filter(e => e.message_id !== emailToDelete.message_id));
        if (selectedEmail?.message_id === emailToDelete.message_id) {
          setSelectedEmail(null);
        }
        setSelectedEmails(prev => {
          const newSet = new Set(prev);
          newSet.delete(emailToDelete.message_id);
          return newSet;
        });
      } else {
        toast.error(t('deletedItems.error.delete'));
      }
    } catch (error: any) {
      toast.error(error.message || t('deletedItems.error.delete'));
    } finally {
      setEmailToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, messageId: string) => {
    e.stopPropagation();
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedEmails.size === deletedEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(deletedEmails.map(email => email.message_id)));
    }
  };

  const handleCheckboxContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Function to process HTML content and add authorization headers to images
  const processHtmlContent = (content: string, accessToken: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    // Add authorization headers to all images
    doc.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        if (src.includes('graph.microsoft.com')) {
          // Outlook image
          img.setAttribute('crossorigin', 'anonymous');
          img.setAttribute('data-original-src', src);
          img.setAttribute('data-token', accessToken);
          img.setAttribute('data-provider', 'outlook');
        } else if (src.includes('gmail.googleapis.com')) {
          // Gmail image
          img.setAttribute('crossorigin', 'anonymous');
          img.setAttribute('data-original-src', src);
          img.setAttribute('data-token', accessToken);
          img.setAttribute('data-provider', 'gmail');
        }
      }
    });

    return doc.documentElement.outerHTML;
  };

  // Effect to handle image loading with authorization
  useEffect(() => {
    if (selectedEmail?.body_type === 'html' && selectedEmail?.access_token) {
      const images = document.querySelectorAll('img[data-original-src][data-token]');
      images.forEach(async (img) => {
        const src = img.getAttribute('data-original-src');
        const token = img.getAttribute('data-token');
        const provider = img.getAttribute('data-provider');
        
        if (src && token) {
          try {
            const response = await fetch(src, {
              headers: {
                'Authorization': `Bearer ${token}`,
                ...(provider === 'gmail' ? {
                  'Accept': 'application/json'
                } : {})
              }
            });
            
            if (response.ok) {
              let blob;
              if (provider === 'gmail') {
                // Gmail returns base64 data
                const data = await response.json();
                const base64Data = data.data.replace(/-/g, '+').replace(/_/g, '/');
                blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());
              } else {
                blob = await response.blob();
              }
              const url = URL.createObjectURL(blob);
              img.setAttribute('src', url);
            }
          } catch (error) {
            console.error('Error loading image:', error);
          }
        }
      });
    }
  }, [selectedEmail]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        {error.includes('notAuthenticated') && (
          <Button 
            onClick={() => window.location.href = '/login'}
            className="mt-4"
          >
            {t('common.login')}
          </Button>
        )}
        {!error.includes('notAuthenticated') && (
          <Button onClick={() => fetchDeletedEmails(1)} className="mt-4">
            {t('common.retry')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmPermanentDelete}
        title={t('deletedItems.dialog.title')}
        description={t('deletedItems.dialog.description')}
        confirmText={t('deletedItems.dialog.confirm')}
        cancelText={t('common.cancel')}
        icon={<AlertCircle className="h-6 w-6 text-red-600" />}
      />
      <Dialog
        isOpen={showBulkDeleteDialog}
        onClose={() => setShowBulkDeleteDialog(false)}
        onConfirm={confirmBulkDelete}
        title={t('deletedItems.dialog.bulkTitle')}
        description={t('deletedItems.dialog.bulkDescription', { count: selectedEmails.size })}
        confirmText={t('deletedItems.dialog.confirm')}
        cancelText={t('common.cancel')}
        icon={<AlertCircle className="h-6 w-6 text-red-600" />}
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('deletedItems.title')}</h1>
        <Button
          variant="outline"
          onClick={() => fetchDeletedEmails(currentPage)}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t('common.refresh')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : deletedEmails.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-4">{t('deletedItems.empty')}</p>
          <p className="text-sm">{t('deletedItems.emptyDescription')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <AnimatePresence>
            {selectedEmails.size > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex justify-between items-center"
              >
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="text-sm text-blue-700 dark:text-blue-300"
                >
                  {t('deletedItems.selectedCount', { count: selectedEmails.size })}
                </motion.span>
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="flex gap-2"
                >
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleBulkRestore}
                    className="flex items-center gap-2 text-green-600 hover:text-green-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('deletedItems.actions.bulkRestore')}
                  </Button>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('deletedItems.actions.bulkDelete')}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <motion.tr
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <th className="px-6 py-3 text-left">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="flex items-center"
                    >
                      <CustomCheckbox
                        id="select-all-deleted"
                        checked={selectedEmails.size === deletedEmails.length && deletedEmails.length > 0}
                        onChange={handleSelectAllChange}
                      />
                    </motion.div>
                  </th>
                  <motion.th 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {t('deletedItems.table.account')}
                  </motion.th>
                  <motion.th 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {t('deletedItems.table.subject')}
                  </motion.th>
                  <motion.th 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {t('deletedItems.table.date')}
                  </motion.th>
                  <motion.th 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    {t('common.actions')}
                  </motion.th>
                </motion.tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {deletedEmails.map((email, index) => (
                  <motion.tr 
                    key={`deleted-email-${email.message_id || index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.05 + 0.1 }}
                      >
                        <CustomCheckbox
                          id={`deleted-email-checkbox-${email.message_id || index}`}
                          checked={selectedEmails.has(email.message_id)}
                          onChange={(e) => handleCheckboxChange(e, email.message_id)}
                          onClick={handleCheckboxContainerClick}
                        />
                      </motion.div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 + 0.15 }}
                      >
                        {email.account_email || t('common.unknown')}
                      </motion.div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 truncate max-w-md">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 + 0.2 }}
                      >
                        {email.subject || t('deletedItems.table.noSubject')}
                      </motion.div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 + 0.25 }}
                      >
                        {formatDate(email.sent_at)}
                      </motion.div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 + 0.3 }}
                        className="flex items-center gap-2"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreEmail(email);
                          }}
                          className="flex items-center gap-2 text-green-600 hover:text-green-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t('deletedItems.actions.restore')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermanentDelete(email);
                          }}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('deletedItems.actions.delete')}
                        </Button>
                      </motion.div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600"
            >
              <div className="flex justify-between items-center">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  {t('common.showing')} {Math.min((currentPage - 1) * itemsPerPage + 1, totalEmails)} - {Math.min(currentPage * itemsPerPage, totalEmails)} {t('common.of')} {totalEmails}
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                  className="flex gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDeletedEmails(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDeletedEmails(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                  >
                    {t('common.next')}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {selectedEmail && (
        <Dialog
          isOpen={!!selectedEmail}
          onClose={() => setSelectedEmail(null)}
          className="w-full max-w-4xl bg-gray-900 text-white p-6 rounded-lg shadow-xl"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-semibold">{selectedEmail.subject || t('deletedItems.table.noSubject')}</h2>
              <p className="text-sm text-gray-400 mt-1">{selectedEmail.account_email}</p>
            </div>
            <button
              onClick={() => setSelectedEmail(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="border-b border-gray-700 pb-4">
              <button
                onClick={() => setShowEmailDetails(!showEmailDetails)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-semibold">{t('common.details')}</h3>
                {showEmailDetails ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              
              {showEmailDetails && (
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mt-4">
                  <div>
                    <span className="text-gray-400">{t('common.from')}:</span> {selectedEmail.from}
                  </div>
                  <div>
                    <span className="text-gray-400">{t('common.account')}:</span> {selectedEmail.account_email}
                  </div>
                  <div>
                    <span className="text-gray-400">{t('common.to')}:</span> {selectedEmail.to_recipients.join(', ')}
                  </div>
                  <div>
                    <span className="text-gray-400">{t('common.date')}:</span> {formatDetailDate(selectedEmail.sent_at)}
                  </div>
                  {selectedEmail.cc_recipients && selectedEmail.cc_recipients.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-400">{t('common.cc')}:</span> {selectedEmail.cc_recipients.join(', ')}
                    </div>
                  )}
                  {selectedEmail.bcc_recipients && selectedEmail.bcc_recipients.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-400">{t('common.bcc')}:</span> {selectedEmail.bcc_recipients.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedEmail.has_attachments && selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold mb-2">{t('common.attachments')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEmail.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800"
                    >
                      <Paperclip className="text-gray-400" size={20} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold mb-2">{t('common.content')}</h3>
              <div className="bg-gray-800 rounded-lg p-4 overflow-auto max-h-96">
                {selectedEmail.body_type === 'html' ? (
                  <div
                    className="prose prose-invert max-w-none [&_*]:text-gray-200 [&_a]:text-blue-400 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_h4]:text-white [&_h5]:text-white [&_h6]:text-white [&_p]:text-gray-200 [&_li]:text-gray-200 [&_td]:text-gray-200 [&_th]:text-gray-200 [&_blockquote]:text-gray-200 [&_pre]:text-gray-200 [&_code]:text-gray-200 [&_strong]:text-white [&_em]:text-gray-200 [&_span]:!text-gray-200 [&_div]:!text-gray-200 [&_table]:border-gray-700 [&_td]:border-gray-700 [&_th]:border-gray-700 [&_hr]:border-gray-700 [&_img]:border-gray-700"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        selectedEmail.access_token
                          ? processHtmlContent(selectedEmail.body, selectedEmail.access_token)
                          : selectedEmail.body
                      )
                    }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-200">{selectedEmail.body}</pre>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 border-t border-gray-700 pt-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSelectedEmail(null)}
                  variant="outline"
                  className="text-gray-400 hover:text-gray-300"
                >
                  {t('common.close')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleRestoreEmail(selectedEmail)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <RotateCcw size={16} className="mr-2" />
                  {t('deletedItems.actions.restore')}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedEmail(null);
                    handlePermanentDelete(selectedEmail);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 size={16} className="mr-2" />
                  {t('deletedItems.actions.permanentDelete')}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
} 