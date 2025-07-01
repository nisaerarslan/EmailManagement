import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BeamsBackground } from '../components/ui/beams-background';
import { CardSpotlight } from '../components/ui/card-spotlight';
import { GradientButton } from '../components/ui/gradient-button';
import { authService } from '../services/authService';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (!token) {
      setVerifyError(t('resetPassword.error.invalidToken'));
      setVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const result = await authService.verifyResetToken(token);
        if (!result.success) {
          setVerifyError(result.message || t('resetPassword.error.invalidToken'));
        }
      } catch (err) {
        setVerifyError(err instanceof Error ? err.message : t('resetPassword.error.verificationFailed'));
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      setError(t('resetPassword.error.passwordTooShort'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.error.passwordsDoNotMatch'));
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await authService.resetPassword(token!, newPassword);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || t('resetPassword.error.generic'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resetPassword.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const bgClass = theme === 'light' ? 'bg-gray-50' : '';
  const textClass = theme === 'light' ? 'text-gray-900' : 'text-white';
  const secondaryTextClass = theme === 'light' ? 'text-gray-600' : 'text-neutral-300';
  const inputBgClass = theme === 'light' ? 'bg-white border-gray-300' : 'bg-neutral-800/50 border-neutral-700/50';
  const inputTextClass = theme === 'light' ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-neutral-400';

  const getContent = () => {
    if (verifying) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className={`text-sm ${secondaryTextClass}`}>
            {t('resetPassword.verifying')}
          </p>
        </div>
      );
    }

    if (verifyError) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className={`text-xl font-semibold ${textClass} mb-2`}>
            {t('resetPassword.error.invalidToken')}
          </h3>
          <p className={`text-sm ${secondaryTextClass} mb-6`}>
            {verifyError}
          </p>
          <GradientButton
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2"
          >
            {t('resetPassword.backToLogin')}
          </GradientButton>
        </div>
      );
    }

    if (success) {
      return (
        <div className="text-center py-8">
          <svg className="h-12 w-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className={`text-xl font-semibold ${textClass} mb-2`}>
            {t('resetPassword.success.title')}
          </h3>
          <p className={`text-sm ${secondaryTextClass} mb-6`}>
            {t('resetPassword.success.description')}
          </p>
          <GradientButton
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2"
          >
            {t('resetPassword.success.loginButton')}
          </GradientButton>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="new-password" className={`block text-sm font-medium ${secondaryTextClass}`}>
            {t('resetPassword.newPassword')}
          </label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 ${inputBgClass} rounded-md ${inputTextClass} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder={t('resetPassword.newPasswordPlaceholder')}
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className={`block text-sm font-medium ${secondaryTextClass}`}>
            {t('resetPassword.confirmPassword')}
          </label>
          <div className="relative mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-neutral-400" />
            </div>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`block w-full pl-10 pr-3 py-2 ${inputBgClass} rounded-md ${inputTextClass} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              placeholder={t('resetPassword.confirmPasswordPlaceholder')}
            />
          </div>
        </div>

        <div>
          <GradientButton
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              t('resetPassword.submit')
            )}
          </GradientButton>
        </div>
      </form>
    );
  };

  return (
    <BeamsBackground className={bgClass}>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <CardSpotlight>
            <div className="relative z-20 space-y-6 p-8">
              <div>
                <h2 className={`text-3xl font-bold ${textClass} text-center`}>
                  {t('resetPassword.title')}
                </h2>
                <p className={`mt-2 text-sm ${secondaryTextClass} text-center`}>
                  {t('resetPassword.description')}
                </p>
              </div>
              
              {getContent()}
            </div>
          </CardSpotlight>
        </div>
      </div>
    </BeamsBackground>
  );
} 