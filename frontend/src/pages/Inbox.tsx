import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, Pencil, Trash2, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAccounts } from "../contexts/AccountContext";
import EmailDetail from '../components/EmailDetail';
import { mailAccountService } from '../services/mailAccountService';
import toast from 'react-hot-toast';
import ComposeEmail from '../components/ComposeEmail';
import CustomCheckbox from '../components/ui/CustomCheckbox';
import Pagination from '../components/ui/Pagination';

interface Email {
  id: string;
  subject: string;
  sender: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  content?: string;
  recipientEmail?: string;
  account_id?: number;
  account_email?: string;
  account_type?: string;
  parsedDate?: Date;
}

export default function Inbox() {
  const { t } = useTranslation();
  const { accounts, selectedAccount, setSelectedAccount, isLoadingAccounts, accountChangeId } = useAccounts();
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [allMessages, setAllMessages] = useState<Email[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<{
    id: string;
    sender: string;
    subject: string;
    initialContent?: string;
  } | undefined>(undefined);
  const ITEMS_PER_PAGE = 10;

  // Request cancellation için AbortController ref'i
  const abortControllerRef = useRef<AbortController | null>(null);
  // Şu anki seçili hesabı takip etmek için ref
  const currentSelectedAccountRef = useRef<string | null>(selectedAccount);
  // Request ID sistemini ekle
  const requestIdRef = useRef<number>(0);
  const lastValidRequestRef = useRef<number>(0);

  // selectedAccount değiştiğinde ref'i güncelle
  useEffect(() => {
    currentSelectedAccountRef.current = selectedAccount;
  }, [selectedAccount]);

  // Generate unique request ID
  const generateRequestId = () => {
    requestIdRef.current += 1;
    return requestIdRef.current;
  };

  // Check if response is still valid for current state
  const isResponseValid = (requestId: number, accountEmail: string | null) => {
    return requestId >= lastValidRequestRef.current && 
           currentSelectedAccountRef.current === accountEmail;
  };

  const debounceSearch = useCallback((value: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (value.trim() === '') {
      setDebouncedSearchTerm('');
      setIsSearching(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 500);
    
    setSearchTimeout(timeout as unknown as NodeJS.Timeout);
  }, [searchTimeout]);

  const fetchAllEmails = async () => {
    if (debouncedSearchTerm.trim().length < 2) {
      return;
    }
    
    // Generate unique request ID for search
    const searchRequestId = generateRequestId();
    lastValidRequestRef.current = searchRequestId;
    
    // Önceki arama isteğini iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Yeni AbortController oluştur
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const requestAccount = selectedAccount;
    
    setLoading(true);
    setIsSearching(true);
    
    try {
      const accountId = accounts.find(acc => acc.email === requestAccount)?.account_id;
      
      // Early validation
      if (!isResponseValid(searchRequestId, requestAccount)) {
        return;
      }
      
      const PAGE_SIZE = 100; // Reduced page size for better performance
      
      let response = await mailAccountService.getInboxMessages(accountId?.toString(), undefined, PAGE_SIZE, abortController.signal);
      
      // Enhanced validation
      if (abortController.signal.aborted || !isResponseValid(searchRequestId, requestAccount)) {
        return;
      }
      
      if (!response || !response.messages) {
        if (isResponseValid(searchRequestId, requestAccount)) {
          setAllMessages([]);
          setIsSearching(false);
          setLoading(false);
        }
        return;
      }
      
      // Filter and process messages
      let allMails: Email[] = response.messages
        .filter((email: Email) => {
          // Early filtering by account if specific account selected
          if (accountId) {
            const emailAccountId = email.account_id || determineEmailAccount(email);
            return emailAccountId === accountId;
          }
          return true;
        })
        .map((email: Email) => ({
          ...email,
          account_id: email.account_id || (accountId || determineEmailAccount(email)),
          parsedDate: new Date(email.date)
        }));
      
      let nextToken = response.nextPageToken;
      let pageCount = 1;
      const MAX_PAGES = 2; // Reduced max pages for better performance
      
      // Only fetch additional pages if we have less than desired results
      while (nextToken && pageCount < MAX_PAGES && allMails.length < 150) {
        // Frequent validation in loop
        if (abortController.signal.aborted || !isResponseValid(searchRequestId, requestAccount)) {
          return;
        }
        
        const nextPageResponse = await mailAccountService.getInboxMessages(accountId?.toString(), nextToken, PAGE_SIZE, abortController.signal);
        
        // Validation after each request
        if (abortController.signal.aborted || !isResponseValid(searchRequestId, requestAccount)) {
          return;
        }
        
        if (nextPageResponse && nextPageResponse.messages) {
          const filteredMessages = nextPageResponse.messages
            .filter((email: Email) => {
              if (accountId) {
                const emailAccountId = email.account_id || determineEmailAccount(email);
                return emailAccountId === accountId;
              }
              return true;
            })
            .map((email: Email) => ({
              ...email,
              account_id: email.account_id || (accountId || determineEmailAccount(email)),
              parsedDate: new Date(email.date)
            }));
          
          allMails = [...allMails, ...filteredMessages];
          nextToken = nextPageResponse.nextPageToken;
          pageCount++;
        } else {
          break;
        }
      }
      
      // Final validation before updating state
      if (isResponseValid(searchRequestId, requestAccount)) {
        setAllMessages(allMails);
        
        const searchTermLower = debouncedSearchTerm.toLowerCase();
        const filtered = allMails.filter(email => 
          email.subject.toLowerCase().includes(searchTermLower) ||
          email.sender.toLowerCase().includes(searchTermLower) ||
          email.preview.toLowerCase().includes(searchTermLower)
        );
        
        setAllEmails(filtered);
      }
    } catch (err: any) {
      // AbortError'ı görmezden gel
      if (err.name === 'AbortError') {
        return;
      }
      
      console.error("Tüm e-postalar çekilirken hata oluştu:", err);
      
      // Sadece hala aynı hesap için istekse hata göster
      if (currentSelectedAccountRef.current === requestAccount) {
        toast.error("Arama yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      // Sadece hala aynı hesap için istekse loading'i kapat
      if (currentSelectedAccountRef.current === requestAccount) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm.trim() === '') {
      setIsSearching(false);
      fetchEmails(undefined, 1);
    } else if (debouncedSearchTerm.trim().length >= 2) {
      fetchAllEmails();
    }
  }, [debouncedSearchTerm]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim().length >= 2) {
      setIsSearching(true);
    } else if (value.trim() === '') {
      setIsSearching(false);
    }
    
    debounceSearch(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearching(false);
    setCurrentPage(1);
    fetchEmails(undefined, 1);
  };

  useEffect(() => {
    // Sadece accounts yüklendiyse ve selectedAccount değiştiyse işlem yap
    if (accounts.length === 0 || isLoadingAccounts) return;
    
    // Önceki tüm istekleri iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // State'leri temizle
    setCurrentPage(1);
    setTotalPages(1);
    setTotalEmails(0);
    setAllEmails([]);
    setSelectedEmail(null);
    setSelectedEmails(new Set());
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearching(false);
    setNextPageToken(null);
    
    // Kısa bir delay ekleyerek state'lerin temizlenmesini bekle
    setTimeout(() => {
      // Hala aynı hesap seçiliyse fetch et
      if (currentSelectedAccountRef.current === selectedAccount) {
        fetchEmails(undefined, 1);
      }
    }, 100);
  }, [selectedAccount, accounts.length, isLoadingAccounts]);

  // Optimized initial load with accountChangeId tracking
  useEffect(() => {
    if (accounts.length > 0 && !isLoadingAccounts && !loading && allEmails.length === 0) {
      // Throttle initial load to prevent excessive requests
      const timer = setTimeout(() => {
        fetchEmails(undefined, 1);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [accounts.length, isLoadingAccounts]);

  // Account change handling with optimized response validation
  useEffect(() => {
    if (accounts.length > 0 && !isLoadingAccounts && accountChangeId > 0) {
      // Clear previous results immediately for better UX
      setAllEmails([]);
      setCurrentPage(1);
      setNextPageToken(null);
      
      // Fetch new data with minimal delay
      const timer = setTimeout(() => {
        fetchEmails(undefined, 1);
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [accountChangeId, accounts.length, isLoadingAccounts]);

  // Component unmount olduğunda tüm istekleri iptal et
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const determineEmailAccount = (email: Email): number | undefined => {
    // Eğer email'in account_id'si varsa ve geçerliyse, onu kullan
    if (email.account_id && accounts.some(acc => acc.account_id === email.account_id)) {
      return email.account_id;
    }

    // Eğer recipientEmail varsa, ona göre hesabı bul
    if (email.recipientEmail) {
      const account = accounts.find(acc => acc.email === email.recipientEmail);
      if (account) return account.account_id;
    }

    // Email ID formatına göre hesap türünü belirle
    const isOutlook = email.id.includes(':');
    
    // Gönderen adresinden domain'i çıkar
    const senderDomain = email.sender.split('@')[1]?.split('>')[0]?.trim().toLowerCase();
    
    // Önce gönderen domain'ine göre eşleştirmeyi dene
    if (senderDomain) {
      const matchedAccount = accounts.find(acc => 
        acc.email.toLowerCase().includes(senderDomain) && 
        ((isOutlook && acc.account_type === 'outlook') || (!isOutlook && acc.account_type === 'gmail'))
      );
      if (matchedAccount) return matchedAccount.account_id;
    }

    // Son çare olarak ID formatına göre ilk uygun hesabı bul
    const fallbackAccount = accounts.find(acc => 
      (isOutlook && acc.account_type === 'outlook') || (!isOutlook && acc.account_type === 'gmail')
    );
    return fallbackAccount?.account_id;
  };

  const fetchEmails = async (pageToken?: string, targetPage: number = 1) => {
    if (isSearching && searchTerm.trim() !== '') {
      return;
    }

    // Accounts yüklenmemişse veya hala yükleniyorsa bekle
    if (accounts.length === 0 || isLoadingAccounts) {
      return;
    }

    // Generate unique request ID
    const requestId = generateRequestId();
    lastValidRequestRef.current = requestId;

    // Önceki isteği iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Yeni AbortController oluştur
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Bu isteğin hangi hesap için yapıldığını kaydet
    const requestAccount = selectedAccount;

    setLoading(true);
    setError(null);

    try {
      const accountId = accounts.find(acc => acc.email === requestAccount)?.account_id;
      
      // Fast response validation - early exit
      if (!isResponseValid(requestId, requestAccount)) {
        return;
      }

      const response = await mailAccountService.getInboxMessages(
        accountId?.toString(),
        pageToken,
        ITEMS_PER_PAGE,
        abortController.signal
      );

      // Enhanced validation - check both abort and request validity
      if (abortController.signal.aborted || !isResponseValid(requestId, requestAccount)) {
        return;
      }

      if (!response || !response.messages) {
        // Only update state if this is still the valid request
        if (isResponseValid(requestId, requestAccount)) {
          setAllEmails([]);
          setTotalPages(1);
          setTotalEmails(0);
          setNextPageToken(null);
          setCurrentPage(1);
        }
        return;
      }

      // Process emails only if still valid
      if (isResponseValid(requestId, requestAccount)) {
        const processedEmails = response.messages
          .filter((email: Email) => {
            // Enhanced filtering by account
            if (accountId) {
              // If specific account is selected, only show emails for that account
              const emailAccountId = email.account_id || determineEmailAccount(email);
              return emailAccountId === accountId;
            }
            return true;
          })
          .map((email: Email) => ({
            ...email,
            account_id: email.account_id || determineEmailAccount(email),
            parsedDate: new Date(email.date)
          }));

        // Sort emails by date (newest first)
        processedEmails.sort((a: Email, b: Email) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

        // Final validation before state update
        if (isResponseValid(requestId, requestAccount)) {
          setAllEmails(processedEmails);
          setTotalEmails(response.totalCount || processedEmails.length);
          
          // Calculate total pages based on total count
          const calculatedTotalPages = Math.ceil((response.totalCount || processedEmails.length) / ITEMS_PER_PAGE);
          setTotalPages(Math.max(1, calculatedTotalPages));
          
          setNextPageToken(response.nextPageToken || null);
          setCurrentPage(targetPage);
        }
      }

    } catch (err: any) {
      // AbortError'ı görmezden gel
      if (err.name === 'AbortError') {
        return;
      }
      
      console.error("E-postalar çekilirken hata oluştu:", err);
      
      // Sadece hala valid request için hata göster
      if (isResponseValid(requestId, requestAccount)) {
        setError(t('inbox.errors.fetchError'));
        toast.error(t('inbox.errors.fetchError'));
      }
    } finally {
      // Sadece hala valid request için loading'i kapat
      if (isResponseValid(requestId, requestAccount)) {
        setLoading(false);
      }
    }
  };

  const handlePageChange = async (page: number) => {
    if (page === currentPage) return;
    
    // Önceki pagination isteğini iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    try {
      let token: string | undefined = undefined;
      
      // Tüm hesaplar seçiliyken basit sayfa numarası kullan
      const accountId = accounts.find(acc => acc.email === selectedAccount)?.account_id;
      if (!accountId) {
        // Tüm hesaplar için - sadece sayfa numarasını token olarak kullan
        if (page > 1) {
          token = page.toString();
        }
      } else {
        // Belirli hesap için - nextPageToken kullan
        if (page > 1 && nextPageToken) {
          token = nextPageToken;
        }
      }
      
      await fetchEmails(token, page);
    } catch (error) {
      console.error('Sayfa değiştirme hatası:', error);
      toast.error('Sayfa yüklenirken bir hata oluştu');
    }
  };

  const handleEmailClick = (email: Email) => {
    if (!email.read) {
      setAllEmails(prevEmails =>
        prevEmails.map(e =>
          e.id === email.id ? { ...e, read: true } : e
        )
      );
    }
    setSelectedEmail(email);
  };

  const handleSelectAll = () => {
    if (selectedEmails.size === allEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(allEmails.map(email => email.id)));
    }
  };

  const handleArchiveEmail = (emailId: string) => {
    setAllEmails(prevEmails => prevEmails.filter(email => email.id !== emailId));
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
    }
  };

  // E-posta ID formatı belirleme yardımcı fonksiyonları
  const isOutlookEmailId = (emailId: string): boolean => {
    return (emailId.length > 40) || 
           emailId.includes('=') || 
           emailId.startsWith('AAM') ||
           (emailId.includes('-') && emailId.includes('AAAAA'));
  };
  
  const isGmailEmailId = (emailId: string): boolean => {
    return (emailId.length === 16 && /^[a-f0-9]+$/.test(emailId)) || 
           (emailId.length < 25 && /^[0-9a-f]+$/.test(emailId));
  };
  
  const getAppropriateAccountForId = (emailId: string): number | undefined => {
    if (isOutlookEmailId(emailId)) {
      const outlookAccount = accounts.find(acc => acc.account_type === 'outlook');
      if (outlookAccount) return outlookAccount.account_id;
    } else if (isGmailEmailId(emailId)) {
      const gmailAccount = accounts.find(acc => acc.account_type === 'gmail');
      if (gmailAccount) return gmailAccount.account_id;
    }
    return undefined;
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      const emailToDelete = allEmails.find(email => email.id === emailId);
      if (!emailToDelete) {
        toast.error(t('inbox.errors.emailNotFound'));
        return;
      }
      
      // Determine the account ID from the email object or by analyzing the email ID
      const accountId = emailToDelete.account_id || determineEmailAccount(emailToDelete);
      if (!accountId) {
        toast.error(t('inbox.errors.accountNotFound'));
        return;
      }
      
      setLoading(true);
        const success = await mailAccountService.deleteEmail(accountId, emailId);
        
        if (success) {
        setAllEmails(prev => prev.filter(email => email.id !== emailId));
            setSelectedEmail(null);
        toast.success(t('inbox.success.emailDeleted'));
        } else {
        toast.error(t('inbox.errors.failedToDelete'));
        }
      } catch (error) {
        console.error('Error deleting email:', error);
      toast.error(t('inbox.errors.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) {
      toast.error(t('mailAccount.errors.noEmailsSelected'));
      return;
    }
    
    const emailsByAccount = new Map<number, string[]>();
    let hasValidEmails = false;
    
    // Seçili e-postaları hesaplara göre grupla
    for (const emailId of selectedEmails) {
      const email = allEmails.find(e => e.id === emailId);
      if (!email) continue;
      
      // Eğer email.account_id yoksa, determineEmailAccount ile hesapla
      const accountId = email.account_id || determineEmailAccount(email);
      if (!accountId) continue;
      
      hasValidEmails = true;
      if (!emailsByAccount.has(accountId)) {
        emailsByAccount.set(accountId, []);
      }
      emailsByAccount.get(accountId)?.push(emailId);
    }
    
    if (!hasValidEmails) {
      toast.error(t('mailAccount.errors.accountNotFound'));
      return;
    }

    const loadingToast = toast.loading(t('mailAccount.info.deletingEmails', { count: selectedEmails.size }));
    
    let successCount = 0;
    let failCount = 0;
    let outlookFailCount = 0;
    
    const deletePromisesArray: Promise<string | null>[] = [];
    
    // Her hesap için silme işlemlerini başlat
    emailsByAccount.forEach((emailIds, accountId) => {
      const account = accounts.find(acc => acc.account_id === accountId);
      const isOutlookAccount = account?.account_type === 'outlook';
      
      const accountPromises = emailIds.map(async (emailId) => {
        try {
          const success = await mailAccountService.deleteEmail(accountId, emailId);
          
          if (success) {
            successCount++;
            return emailId;
          } else {
            if (isOutlookAccount) {
              outlookFailCount++;
            } else {
              failCount++;
            }
            return null;
          }
        } catch (error) {
          if (isOutlookAccount) {
            outlookFailCount++;
          } else {
            failCount++;
          }
          console.error(`E-posta silme hatası:`, error);
          return null;
        }
      });
      
      deletePromisesArray.push(...accountPromises);
    });
    
    try {
    const results = await Promise.all(deletePromisesArray);
    const successfullyDeletedIds = results.filter(id => id !== null) as string[];
    
      // Silinen e-postaları listeden kaldır
    setAllEmails(prevEmails => 
      prevEmails.filter(email => !successfullyDeletedIds.includes(email.id))
    );
    
      // Seçili e-posta silindiyse detay görünümünü kapat
    if (selectedEmail && successfullyDeletedIds.includes(selectedEmail.id)) {
      setSelectedEmail(null);
    }
    
      // Seçili e-postaları temizle
    setSelectedEmails(new Set());
    
      // Başarı/hata mesajlarını göster
    if (successCount > 0) {
      toast.success(t('mailAccount.success.bulkEmailsDeleted', { count: successCount }));
    }
    if (failCount > 0) {
      toast.error(t('mailAccount.errors.bulkEmailDeleteFailed', { count: failCount }));
    }
    if (outlookFailCount > 0) {
        toast.error(t('mailAccount.errors.outlookBulkDeleteLimit', { count: outlookFailCount }));
      }
    } catch (error) {
      console.error('E-posta silme hatası:', error);
      toast.error(t('mailAccount.errors.failedToDeleteEmail'));
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const filteredEmails = allEmails;

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

  const handleCheckboxContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleReplyToEmail = (emailId: string, initialContent?: string) => {
    const email = allEmails.find(e => e.id === emailId);
    if (!email) return;

    console.log("Reply to email:", email);
    console.log("Available accounts:", accounts);

    // Find the recipient email address to determine the correct account to reply from
    // If the email has recipientEmail property, use that as it's the account that received the email
    const recipientAccount = email.recipientEmail ? 
      accounts.find(acc => acc.email === email.recipientEmail) : 
      // If no recipientEmail is directly available, try to infer from account_id
      email.account_id ? 
        accounts.find(acc => acc.account_id === email.account_id) : 
        null;

    console.log("Selected recipient account for reply:", recipientAccount);

    // If we found the account, use it for the reply
    if (recipientAccount) {
      setSelectedAccount(recipientAccount.email);
      console.log("Setting selected account to:", recipientAccount.email);
    }

    setReplyToEmail({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      initialContent
    });
    
    setIsComposeOpen(true);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => fetchEmails(undefined, 1)} className="mt-4">{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {selectedAccount ? t('pages.inbox.titleWithAccount', { account: selectedAccount }) : t('pages.inbox.title')}
          </h1>
          <div className="relative inline-block">
            <select
              value={selectedAccount || ''}
              onChange={(e) => setSelectedAccount(e.target.value || null)}
              className="block w-[320px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 dark:hover:border-gray-500 appearance-none cursor-pointer"
            >
              <option key="all" value="" className="py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                {t('pages.inbox.allAccounts')}
              </option>
              {accounts.map((account) => (
                <option 
                  key={`account-${account.account_id}`}
                  value={account.email}
                  className="py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {account.email}
                </option>
              ))}
            </select>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => fetchEmails(undefined, 1)}
            className="flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t('common.retry')}
          </Button>
          <Button 
            variant="primary"
            size="sm"
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            {t('composeEmail.title')}
          </Button>
        </div>

        <div className="relative w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchInputChange}
            placeholder={t('common.search')}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {loading && allEmails.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : allEmails.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {selectedAccount ? t('pages.inbox.noEmailsForAccount') : t('pages.inbox.noEmails')}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          {selectedEmails.size > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 flex justify-between items-center">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {t('pages.inbox.selectedCount', { count: selectedEmails.size })}
              </span>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('pages.inbox.deleteSelected')}
              </Button>
            </div>
          )}
          <div className="divide-y dark:divide-gray-700">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <div className="flex items-center" onClick={handleCheckboxContainerClick}>
                <CustomCheckbox
                  id="select-all"
                  checked={selectedEmails.size > 0 && selectedEmails.size === filteredEmails.length}
                  onChange={handleSelectAll}
                  className="mr-1"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedEmails.size > 0 && selectedEmails.size === filteredEmails.length 
                    ? t('pages.inbox.deselectAll') 
                    : t('pages.inbox.selectAll')}
                </span>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredEmails.length} {filteredEmails.length === 1 ? t('common.email') : t('common.emails')}
              </div>
            </div>
            {filteredEmails.map((email) => {
              const account = accounts.find(acc => acc.account_id === email.account_id);
              const accountType = account?.account_type || 'unknown';
              const accountEmail = account?.email || email.recipientEmail || 'Unknown';
              
              return (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                    email.read 
                      ? 'bg-gray-50 dark:bg-gray-800' 
                      : 'bg-white dark:bg-gray-900 font-medium'
                  } hover:bg-gray-100 dark:hover:bg-gray-700`}
                  onClick={() => handleEmailClick(email)}
                >
                  <div className="flex items-start space-x-3">
                    <div 
                      className="flex-shrink-0 mt-1"
                      onClick={handleCheckboxContainerClick}
                    >
                      <CustomCheckbox
                        id={`email-checkbox-${email.id}`}
                        checked={selectedEmails.has(email.id)}
                        onChange={(e) => handleCheckboxChange(e, email.id)}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${email.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white font-semibold'}`}>
                            {email.sender}
                          </span>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            accountType === 'gmail' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : accountType === 'outlook'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {accountType === 'gmail' && (
                              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                              </svg>
                            )}
                            {accountType === 'outlook' && (
                              <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.87-.2q-.36-.19-.58-.52-.22-.33-.33-.74-.1-.42-.1-.87 0-.44.1-.86.11-.41.33-.74.22-.33.58-.52.36-.19.87-.19t.87.19q.37.19.58.52.22.33.33.74.11.42.11.86zm-3.24 0q0 .58.21.87.21.3.59.3.39 0 .59-.3.21-.29.21-.87 0-.57-.21-.86-.2-.3-.59-.3-.38 0-.59.3-.21.29-.21.86z"/>
                              </svg>
                            )}
                            <span className="truncate max-w-24">
                              {accountEmail.split('@')[0]}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {new Date(email.date).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <h3 className={`text-sm mb-1 truncate ${email.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                        {email.subject || t('inbox.noSubject')}
                      </h3>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {email.preview}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {!isSearching && (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common.showing')} {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalEmails)} {t('common.of')} {totalEmails}
                </div>
              </div>
              
              <div className="py-2 flex justify-end px-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
            )}
            
            {isSearching && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  {loading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin text-blue-500" />
                      <span>Aranıyor...</span>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium">{filteredEmails.length}</span> sonuç bulundu "{debouncedSearchTerm}" için
                    </>
                  )}
                </div>
                
                <button
                  onClick={clearSearch}
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  Aramayı Temizle
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedEmail && (
          <EmailDetail 
            email={selectedEmail} 
            onClose={() => setSelectedEmail(null)} 
            onArchive={handleArchiveEmail}
            onDelete={handleDeleteEmail}
            onReply={handleReplyToEmail}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isComposeOpen && (
          <ComposeEmail 
            isOpen={isComposeOpen}
            onClose={() => {
              setIsComposeOpen(false);
              setReplyToEmail(undefined);
            }} 
            replyToEmail={replyToEmail}
          />
        )}
      </AnimatePresence>
    </div>
  );
}