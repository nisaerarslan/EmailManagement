import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BeamsBackground } from '../components/ui/beams-background';
import { CardSpotlight } from '../components/ui/card-spotlight';
import { GradientButton } from '../components/ui/gradient-button';
import { authService } from '../services/authService';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme] = useState(() => localStorage.getItem('theme') || 'dark');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await authService.requestPasswordReset(identifier);
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.message || t('forgotPassword.error.generic'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgotPassword.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const bgClass = theme === 'light' ? 'bg-gray-50' : '';
  const textClass = theme === 'light' ? 'text-gray-900' : 'text-white';
  const secondaryTextClass = theme === 'light' ? 'text-gray-600' : 'text-neutral-300';
  const inputBgClass = theme === 'light' ? 'bg-white border-gray-300' : 'bg-neutral-800/50 border-neutral-700/50';
  const inputTextClass = theme === 'light' ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-neutral-400';

  return (
    <BeamsBackground className={bgClass}>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <CardSpotlight>
            <div className="relative z-20 space-y-6 p-8">
              <div>
                <h2 className={`text-3xl font-bold ${textClass} text-center`}>
                  {t('forgotPassword.title')}
                </h2>
                <p className={`mt-2 text-sm ${secondaryTextClass} text-center`}>
                  {t('forgotPassword.description')}
                </p>
              </div>

              {success ? (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 rounded-md p-4 text-sm">
                  <h3 className="font-medium">{t('forgotPassword.success.title')}</h3>
                  <p className="mt-1">{t('forgotPassword.success.description')}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-md p-3 text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label htmlFor="identifier" className={`block text-sm font-medium ${secondaryTextClass}`}>
                      {t('common.email')}
                    </label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        id="identifier"
                        name="identifier"
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className={`block w-full pl-10 pr-3 py-2 ${inputBgClass} rounded-md ${inputTextClass} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        placeholder={t('forgotPassword.emailPlaceholder')}
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
                        t('forgotPassword.submit')
                      )}
                    </GradientButton>
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className={`text-sm font-medium text-blue-500 hover:text-blue-400`}
                    >
                      {t('forgotPassword.backToLogin')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </CardSpotlight>
        </div>
      </div>
    </BeamsBackground>
  );
} 