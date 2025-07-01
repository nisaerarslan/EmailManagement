import { useState, useEffect } from 'react';
import { mailAccountService } from '../services/mailAccountService';
import { Loader2, AlertCircle, X, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../components/ui/Button';
import { format, parseISO, isToday, isYesterday, isSameYear } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Dialog from '../components/ui/Dialog';
import CustomCheckbox from '../components/ui/CustomCheckbox';
import toast from 'react-hot-toast';

// Define an interface for Sent Email data (match backend response)
interface SentEmail {
  sent_id: number;
  message_id?: string;
  account_id: number;
  user_id: number;
  from: string;  // Gönderen e-posta adresi
  to_recipients: string[];  // Alıcı e-posta adresleri dizisi
  cc_recipients?: string[];
  bcc_recipients?: string[];
  subject: string;
  body?: string;
  sent_at: string;
  created_date: string;
}

export default function SentItems() {
  const { t, i18n } = useTranslation();
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const itemsPerPage = 12;
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showEmailDetails, setShowEmailDetails] = useState(false);

  const fetchSentEmails = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await mailAccountService.getSentEmails(itemsPerPage, offset);
      
      if (!response.sent_emails) {
        throw new Error(t('sentItems.error.invalidResponse'));
      }

      const total = response.total_count || 0;
      const pages = Math.ceil(total / itemsPerPage);
      
      if (page > pages && pages > 0) {
        return fetchSentEmails(pages);
      }

      setSentEmails(response.sent_emails);
      setTotalEmails(total);
      setTotalPages(pages);
      setCurrentPage(page);
      setSelectedEmails(new Set()); // Reset selections on page change
    } catch (err: any) {
      console.error("Error fetching sent emails:", err);
      setError(err.message || t('sentItems.error.fetch'));
      setSentEmails([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentEmails(1);
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      // Tarih string'ini ISO formatında parse et ve local timezone'a çevir
      const date = new Date(dateString);
      const locale = i18n.language === 'tr' ? tr : enUS;
      
      if (isToday(date)) {
        // Bugün için sadece saat
        return format(date, 'HH:mm', { locale });
      } else if (isYesterday(date)) {
        // Dün için "Dün" yazısı ve saat
        return `${i18n.language === 'tr' ? 'Dün' : 'Yesterday'} ${format(date, 'HH:mm', { locale })}`;
      } else if (isSameYear(date, new Date())) {
        // Bu yıl içindeki tarihler için gün ve ay
        if (i18n.language === 'tr') {
          // Türkçe format: "12 Mayıs 14:30"
          return format(date, "d MMMM HH:mm", { locale });
        } else {
          // İngilizce format: "May 12 14:30"
          return format(date, "MMM d HH:mm", { locale });
        }
      } else {
        // Geçmiş yıllar için tam tarih
        if (i18n.language === 'tr') {
          // Türkçe format: "12 Mayıs 2022 14:30"
          return format(date, "d MMMM yyyy HH:mm", { locale });
        } else {
          // İngilizce format: "May 12 2022 14:30"
          return format(date, "MMM d yyyy HH:mm", { locale });
        }
      }
    } catch (e) {
      console.error('Date formatting error:', e);
      return dateString;
    }
  };

  const formatDetailDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const locale = i18n.language === 'tr' ? tr : enUS;
      
      if (isToday(date)) {
        // Bugün için: "Bugün 14:30" / "Today 14:30"
        return `${i18n.language === 'tr' ? 'Bugün' : 'Today'} ${format(date, 'HH:mm', { locale })}`;
      } else if (isYesterday(date)) {
        // Dün için: "Dün 14:30" / "Yesterday 14:30"
        return `${i18n.language === 'tr' ? 'Dün' : 'Yesterday'} ${format(date, 'HH:mm', { locale })}`;
      } else if (isSameYear(date, new Date())) {
        // Bu yıl için: "12 Mayıs 2023, 14:30" / "May 12, 2023 14:30"
        return i18n.language === 'tr' 
          ? format(date, "d MMMM, HH:mm", { locale })
          : format(date, "MMM d, HH:mm", { locale });
      } else {
        // Geçmiş yıllar için: "12 Mayıs 2022, 14:30" / "May 12, 2022 14:30"
        return i18n.language === 'tr'
          ? format(date, "d MMMM yyyy, HH:mm", { locale })
          : format(date, "MMM d yyyy, HH:mm", { locale });
      }
    } catch (e) {
      console.error('Date formatting error:', e);
      return dateString;
    }
  };

  const formatTableDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: i18n.language === 'tr' ? tr : enUS });
    } catch (e) {
      console.error('Date formatting error:', e);
      return dateString;
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, emailId: string) => {
    e.stopPropagation();
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedEmails.size === sentEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(sentEmails.map(email => email.message_id || email.sent_id.toString())));
    }
  };

  const handleCheckboxContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) {
      toast.error(t('sentItems.error.noEmailsSelected'));
      return;
    }
    setShowDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    const loadingToast = toast.loading(t('sentItems.info.deletingEmails', { count: selectedEmails.size }));
    let successCount = 0;
    let failCount = 0;

    try {
      const selectedEmailObjects = sentEmails.filter(email => 
        selectedEmails.has(email.message_id || email.sent_id.toString())
      );
      
      for (const email of selectedEmailObjects) {
        try {
          const success = await mailAccountService.deleteEmail(email.account_id, email.message_id || email.sent_id.toString());
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
      setSentEmails(prev => prev.filter(email => 
        !selectedEmails.has(email.message_id || email.sent_id.toString())
      ));
      setSelectedEmails(new Set());
      
      if (successCount > 0) {
        toast.success(t('sentItems.success.bulkDeleted', { count: successCount }));
      }
      if (failCount > 0) {
        toast.error(t('sentItems.error.bulkDeleteFailed', { count: failCount }));
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(t('sentItems.error.bulkDelete'));
    } finally {
      toast.dismiss(loadingToast);
      setShowDeleteDialog(false);
    }
  };

  const toggleRowExpansion = (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  if (loading && sentEmails.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-4">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">{t('notifications.error')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={() => fetchSentEmails(1)} variant="secondary" size="sm">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmBulkDelete}
        title={t('sentItems.dialog.bulkTitle')}
        description={t('sentItems.dialog.bulkDescription', { count: selectedEmails.size })}
        confirmText={t('sentItems.dialog.confirm')}
        cancelText={t('common.cancel')}
        icon={<AlertCircle className="h-6 w-6 text-red-600" />}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('sidebar.sent')}</h1>
        <Button
          variant="outline"
          onClick={() => fetchSentEmails(currentPage)}
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

      {sentEmails.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-4">{t('sentItems.empty')}</p>
          <p className="text-sm">{t('sentItems.emptyDescription')}</p>
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
                  {t('sentItems.selectedCount', { count: selectedEmails.size })}
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('sentItems.actions.bulkDelete')}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <motion.tr
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <th scope="col" className="w-4 px-6 py-3">
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="flex items-center"
                    >
                      <CustomCheckbox
                        id="select-all-sent"
                        checked={selectedEmails.size === sentEmails.length && sentEmails.length > 0}
                        onChange={handleSelectAllChange}
                      />
                    </motion.div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('composeEmail.subject')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('composeEmail.to')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('composeEmail.from')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('sentItems.table.date')}
                  </th>
                </motion.tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                {sentEmails.map((email, index) => (
                  <motion.tr
                    key={email.sent_id || email.message_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => setSelectedEmail(email)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.05 + 0.1 }}
                      >
                        <CustomCheckbox
                          id={`sent-email-checkbox-${email.message_id || email.sent_id}`}
                          checked={selectedEmails.has(email.message_id || email.sent_id.toString())}
                          onChange={(e) => handleCheckboxChange(e, email.message_id || email.sent_id.toString())}
                          onClick={handleCheckboxContainerClick}
                        />
                      </motion.div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                      {email.subject || t('sentItems.table.noSubject')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                      {email.to_recipients.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                      {email.from}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatTableDate(email.sent_at)}
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
              transition={{ duration: 0.4, delay: 0.3 }}
              className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600"
            >
              <div className="flex justify-between items-center">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  {t('common.showing')} {Math.min((currentPage - 1) * itemsPerPage + 1, totalEmails)} - {Math.min(currentPage * itemsPerPage, totalEmails)} {t('common.of')} {totalEmails}
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="flex gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSentEmails(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                  >
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSentEmails(currentPage + 1)}
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

      <AnimatePresence>
        {selectedEmail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEmail(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl text-white"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">emailDetail.subject:</span>
                    <span className="text-white">{selectedEmail.subject || t('sentItems.table.noSubject')}</span>
                  </div>
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <button
                    onClick={() => setShowEmailDetails(!showEmailDetails)}
                    className="flex items-center text-gray-300 hover:text-white gap-1"
                  >
                    {showEmailDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="text-sm">
                      {t('emailDetail.showDetails')}
                    </span>
                  </button>

                  {showEmailDetails && (
                    <div className="mt-3 ml-4 space-y-2 text-sm">
                      <div className="flex">
                        <span className="text-gray-400 w-20">{t('composeEmail.from')}:</span>
                        <span className="text-white">{selectedEmail.from}</span>
                      </div>
                      
                      <div className="flex">
                        <span className="text-gray-400 w-20">{t('composeEmail.to')}:</span>
                        <span className="text-white">{selectedEmail.to_recipients.join(', ')}</span>
                      </div>
                      
                      {selectedEmail.cc_recipients && selectedEmail.cc_recipients.length > 0 && (
                        <div className="flex">
                          <span className="text-gray-400 w-20">{t('composeEmail.cc')}:</span>
                          <span className="text-white">{selectedEmail.cc_recipients.join(', ')}</span>
                        </div>
                      )}
                      
                      <div className="flex">
                        <span className="text-gray-400 w-20">{t('emailDetail.date')}:</span>
                        <span className="text-white">{formatDetailDate(selectedEmail.sent_at)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-400">emailDetail.content:</span>
                  </div>
                  <div className="text-white">
                    {selectedEmail.body}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 