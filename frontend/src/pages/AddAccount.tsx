import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mailAccountService } from '../services/mailAccountService';
import { outlookService } from '../services/outlookService';
import { useAccounts } from '../contexts/AccountContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export default function AddAccount() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [outlookLoading, setOutlookLoading] = useState(false);
  const { refreshAccounts } = useAccounts();
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (code && state) {
        try {
          setLoading(true);
          if (state === 'outlook') {
            setOutlookLoading(true);
            // Outlook callback'i mevcut API'da yok, burada yönlendirme kullanacağız
            window.location.href = `/callback/outlook?code=${code}`;
          } else if (state === 'gmail') {
            const result = await mailAccountService.handleCallback(code);
            if (result && result.success) {
              toast.success(t('mailAccount.success.accountAdded', { email: 'Gmail' }));
              await refreshAccounts();
              navigate('/dashboard');
            } else {
              toast.error(t('mailAccount.errors.failedToAddAccount'));
            }
          }
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
          toast.error(t('mailAccount.errors.failedToAddAccount'));
        } finally {
          setLoading(false);
          setOutlookLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [code, state, navigate, refreshAccounts, t]);

  const handleGmailClick = async () => {
    try {
      setLoading(true);
      await mailAccountService.startGmailAuth();
    } catch (error) {
      console.error('Error starting Gmail auth:', error);
      toast.error(t('mailAccount.errors.failedToStartGmailAuth'));
    } finally {
      setLoading(false);
    }
  };

  const handleOutlookClick = async () => {
    try {
      setOutlookLoading(true);
      await outlookService.startAuth();
    } catch (error) {
      console.error('Error starting Outlook auth:', error);
      toast.error(t('mailAccount.errors.failedToStartOutlookAuth'));
    } finally {
      setOutlookLoading(false);
    }
  };

  const continueWithGoogle = i18n.language === 'tr' ? 'Google ile Devam Et' : 'Continue with Google';
  const continueWithMicrosoft = i18n.language === 'tr' ? 'Microsoft ile Devam Et' : 'Continue with Microsoft';

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              isDark
                ? "bg-gray-800/70 text-gray-200 hover:bg-gray-700/80 border border-gray-700"
                : "bg-white/70 text-gray-700 hover:bg-white/80 border border-gray-200"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </button>
          <h1 className={cn(
            "text-2xl font-bold ml-4",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {t('mailAccount.addAccount')}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gmail Option */}
          <div className={cn(
            "rounded-xl shadow-sm border p-6 backdrop-blur-lg",
            isDark
              ? "bg-gray-800/80 border-gray-700"
              : "bg-white/80 border-gray-200"
          )}>
            <div className="flex justify-center mb-6">
              <img src="/gmail-icon.png" alt="Gmail" className="h-16 w-16" />
            </div>
            <h2 className={cn(
              "text-xl font-bold text-center mb-2",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {t('mailAccount.addAccount')} - Gmail
            </h2>
            <p className={cn(
              "text-center mb-6",
              isDark ? "text-gray-300" : "text-gray-600"
            )}>
              {t('mailAccount.gmailDescription')}
            </p>
            <button
              onClick={handleGmailClick}
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md text-white font-medium transition-colors",
                loading ? "opacity-70 cursor-not-allowed" : "",
                "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <img src="/google-logo.png" alt="Google" className="h-5 w-5" />
              {continueWithGoogle}
              {loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-2" />}
            </button>
          </div>

          {/* Outlook Option */}
          <div className={cn(
            "rounded-xl shadow-sm border p-6 backdrop-blur-lg",
            isDark
              ? "bg-gray-800/80 border-gray-700"
              : "bg-white/80 border-gray-200"
          )}>
            <div className="flex justify-center mb-6">
              <img src="/outlook-icon.png" alt="Outlook" className="h-16 w-16" />
            </div>
            <h2 className={cn(
              "text-xl font-bold text-center mb-2",
              isDark ? "text-white" : "text-gray-900"
            )}>
              {t('mailAccount.addAccount')} - Outlook
            </h2>
            <p className={cn(
              "text-center mb-6",
              isDark ? "text-gray-300" : "text-gray-600"
            )}>
              {t('mailAccount.outlookDescription')}
            </p>
            <button
              onClick={handleOutlookClick}
              disabled={outlookLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md text-white font-medium transition-colors",
                outlookLoading ? "opacity-70 cursor-not-allowed" : "",
                "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <img src="/microsoft-logo.png" alt="Microsoft" className="h-5 w-5" />
              {continueWithMicrosoft}
              {outlookLoading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-2" />}
            </button>
          </div>
        </div>

        <div className={cn(
          "mt-8 rounded-xl shadow-sm border p-6 backdrop-blur-lg",
          isDark
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        )}>
          <h3 className={cn(
            "text-lg font-semibold mb-4",
            isDark ? "text-white" : "text-gray-900"
          )}>
            {t('mailAccount.about.title')}
          </h3>
          <p className={cn(
            "text-sm",
            isDark ? "text-gray-300" : "text-gray-600"
          )}>
            {t('mailAccount.about.description')}
          </p>
        </div>
      </div>
    </div>
  );
}