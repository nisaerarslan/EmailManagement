import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Plus, Inbox, Send, Trash, ArrowRight, RefreshCw, Loader2, X, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import Dialog from '../components/ui/Dialog';
import { mailAccountService } from '../services/mailAccountService';
import { useAccounts } from '../contexts/AccountContext';
import toast from 'react-hot-toast';
import EmailGroupsWidget from '../components/EmailGroupsWidget';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface EmailAccount {
  account_id: number;
  email: string;
  account_type: string;
  created_at: string;
  unread_count: number;
  last_checked?: string;
}

export default function Home() {
  const { t } = useTranslation();
  const { accounts, refreshAccounts } = useAccounts();
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; account: EmailAccount | null }>({
    isOpen: false,
    account: null
  });
  const { isDark } = useTheme();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      await refreshAccounts();
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      toast.error(t('mailAccount.errors.failedToGetAccounts'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    try {
      setDeletingAccount(accountId);
      await mailAccountService.deleteAccount(accountId);
      await refreshAccounts();
      toast.success(t('mailAccount.success.accountDeleted'));
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(t('mailAccount.errors.failedToDeleteAccount'));
    } finally {
      setDeletingAccount(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className={cn("h-8 w-8 animate-spin", isDark ? "text-blue-400" : "text-sky-500")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button onClick={loadAccounts} className="mt-4">{t('common.retry')}</Button>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className={cn("text-3xl font-bold",
            isDark ? "text-white" : "text-gray-900"
          )}>{t('welcome')}</h1>
          <Link
            to="/dashboard/add-account"
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white",
              isDark
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-sky-500 hover:bg-sky-600"
            )}
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('sidebar.addAccount')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <div className={cn(
              "rounded-xl shadow-sm border p-6 backdrop-blur-lg",
              isDark
                ? "bg-gray-800/80 border-gray-700"
                : "bg-white/80 border-gray-200"
            )}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={cn(
                  "text-lg font-semibold",
                  isDark ? "text-white" : "text-gray-900"
                )}>{t('pages.home.title')}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2",
                    isDark ? "border-gray-600 text-gray-200" : "border-gray-300 text-gray-700"
                  )}
                  onClick={loadAccounts}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {t('common.retry')}
                </Button>
              </div>
              <div className="space-y-4 max-h-[calc(100vh-24rem)] overflow-y-auto pr-2">
                {accounts.map((account) => (
                  <div
                    key={account.account_id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-colors backdrop-blur-sm",
                      isDark
                        ? "border-gray-700 bg-gray-700/50 hover:bg-gray-700/70"
                        : "border-gray-200 bg-gray-50/70 hover:bg-gray-100/90"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {account.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className={cn(
                          "font-medium",
                          isDark ? "text-white" : "text-gray-900"
                        )}>{account.email}</h3>
                        <p className={cn(
                          "text-sm",
                          isDark ? "text-gray-400" : "text-gray-500"
                        )}>
                          {account.last_checked
                            ? `${t('pages.home.lastChecked')}: ${new Date(account.last_checked).toLocaleDateString()}`
                            : `${t('pages.home.addedAt')}: ${new Date(account.created_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {account.unread_count > 0 && (
                        <span className={cn(
                          "px-3 py-1 rounded-full text-sm font-medium",
                          isDark
                            ? "bg-blue-900 text-blue-300"
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {account.unread_count} {t('pages.home.new')}
                        </span>
                      )}
                      <button
                        onClick={() => setDeleteDialog({ isOpen: true, account })}
                        disabled={deletingAccount === account.account_id}
                        className={cn(
                          "p-2 rounded-full transition-colors",
                          isDark
                            ? "text-gray-400 hover:text-red-400 hover:bg-red-900/50"
                            : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                        )}
                        title={t('pages.home.deleteAccount')}
                      >
                        {deletingAccount === account.account_id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <div className="text-center py-8">
                    <Mail className={cn(
                      "h-12 w-12 mx-auto mb-3",
                      isDark ? "text-gray-500" : "text-gray-400"
                    )} />
                    <p className={cn(
                      isDark ? "text-gray-400" : "text-gray-600"
                    )}>{t('pages.home.noAccounts')}</p>
                    <Link
                      to="/dashboard/add-account"
                      className="inline-flex mt-2"
                    >
                      <Button variant="outline" className={cn(
                        "inline-flex items-center gap-1 font-medium",
                        isDark
                          ? "text-blue-400 hover:text-blue-300"
                          : "text-blue-600 hover:text-blue-700"
                      )}>
                        {t('sidebar.addAccount')}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className={cn(
              "rounded-xl shadow-sm border p-6 backdrop-blur-lg",
              isDark
                ? "bg-gray-800/80 border-gray-700"
                : "bg-white/80 border-gray-200"
            )}>
              <h2 className={cn(
                "text-lg font-semibold mb-6",
                isDark ? "text-white" : "text-gray-900"
              )}>{t('pages.home.quickAccess')}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/dashboard/inbox"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors backdrop-blur-sm",
                    isDark
                      ? "border-gray-700 hover:bg-gray-700/70"
                      : "border-gray-200 hover:bg-gray-50/90"
                  )}
                >
                  <Inbox className={cn(
                    "h-6 w-6",
                    isDark ? "text-blue-400" : "text-blue-600"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isDark ? "text-gray-300" : "text-gray-700"
                  )}>{t('sidebar.inbox')}</span>
                </Link>
                <Link
                  to="/dashboard/sent"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors backdrop-blur-sm",
                    isDark
                      ? "border-gray-700 hover:bg-gray-700/70"
                      : "border-gray-200 hover:bg-gray-50/90"
                  )}
                >
                  <Send className={cn(
                    "h-6 w-6",
                    isDark ? "text-green-400" : "text-green-600"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isDark ? "text-gray-300" : "text-gray-700"
                  )}>{t('sidebar.sent')}</span>
                </Link>
                <Link
                  to="/dashboard/deleted"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors backdrop-blur-sm",
                    isDark
                      ? "border-gray-700 hover:bg-gray-700/70"
                      : "border-gray-200 hover:bg-gray-50/90"
                  )}
                >
                  <Trash className={cn(
                    "h-6 w-6",
                    isDark ? "text-red-400" : "text-red-600"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isDark ? "text-gray-300" : "text-gray-700"
                  )}>{t('sidebar.trash')}</span>
                </Link>
                <Link
                  to="/dashboard/add-account"
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors backdrop-blur-sm",
                    isDark
                      ? "border-gray-700 hover:bg-gray-700/70"
                      : "border-gray-200 hover:bg-gray-50/90"
                  )}
                >
                  <Plus className={cn(
                    "h-6 w-6",
                    isDark ? "text-purple-400" : "text-purple-600"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isDark ? "text-gray-300" : "text-gray-700"
                  )}>{t('sidebar.addAccount')}</span>
                </Link>
              </div>
            </div>

            <div className="mt-6">
              <EmailGroupsWidget />
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, account: null })}
        onConfirm={() => {
          if (deleteDialog.account) {
            handleDeleteAccount(deleteDialog.account.account_id);
            setDeleteDialog({ isOpen: false, account: null });
          }
        }}
        title={t('pages.home.deleteAccount')}
        description={t('pages.home.deleteAccountConfirm', { email: deleteDialog.account?.email })}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        icon={
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        }
      />
    </div>
  );
}