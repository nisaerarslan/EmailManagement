import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BeamsBackground } from '../components/ui/beams-background';
import { CardSpotlight } from '../components/ui/card-spotlight';
import { GradientButton } from '../components/ui/gradient-button';
import { systemMailService } from '../services/systemMailService';

export default function SystemMailSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const errorMessage = searchParams.get('message');
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [configuredEmail, setConfiguredEmail] = useState('');
  const [error, setError] = useState<string | null>(errorMessage);
  const [theme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Mevcut sistem mail durumunu kontrol et
  useEffect(() => {
    const checkSystemMail = async () => {
      try {
        const result = await systemMailService.getSystemMail();
        if (result.is_configured) {
          setIsConfigured(true);
          setConfiguredEmail(result.email || '');
        }
      } catch (err) {
        console.error('System mail check error:', err);
      } finally {
        setChecking(false);
      }
    };

    checkSystemMail();
  }, []);

  const handleConnectGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await systemMailService.getAuthUrl();
      window.location.href = result.auth_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google kimlik doğrulama hatası');
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError('Code parametresi eksik');
      return;
    }
    
    if (!email) {
      setError('E-posta adresi girilmelidir');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await systemMailService.updateEmail(code, email);
      setSuccess(true);
      setIsConfigured(true);
      setConfiguredEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-posta güncelleme hatası');
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
    if (checking) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className={`text-sm ${secondaryTextClass}`}>
            {t('systemMail.checking')}
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-md p-4 text-sm mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mr-2 mt-0.5" />
            <span>{error}</span>
          </div>
        </div>
      );
    }

    if (isConfigured) {
      return (
        <div className="text-center py-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className={`text-xl font-semibold ${textClass} mb-2`}>
            {t('systemMail.configured')}
          </h3>
          <p className={`mb-6 ${secondaryTextClass}`}>
            <span className="block">{t('systemMail.configuredEmail')}</span>
            <span className="font-medium text-blue-500">{configuredEmail}</span>
          </p>
          <div className="space-y-4">
            <GradientButton
              type="button"
              onClick={handleConnectGoogle}
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                t('systemMail.connectDifferent')
              )}
            </GradientButton>
            <button
              type="button"
              onClick={() => navigate('/dashboard/settings')}
              className={`text-sm font-medium text-blue-500 hover:text-blue-400`}
            >
              {t('systemMail.backToSettings')}
            </button>
          </div>
        </div>
      );
    }

    if (code) {
      return (
        <form onSubmit={handleUpdateEmail} className="space-y-6">
          <div>
            <label htmlFor="email" className={`block text-sm font-medium ${secondaryTextClass}`}>
              Mail Hesabı
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2 ${inputBgClass} rounded-md ${inputTextClass} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="sistem@gmail.com"
              />
            </div>
            <p className={`mt-2 text-xs ${secondaryTextClass}`}>
              Sistem otomatik e-postaları gönderecek Gmail hesabını girin
            </p>
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
                'Hesabı Bağla'
              )}
            </GradientButton>
          </div>
        </form>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-md p-4 text-sm mb-6">
          <p>
            Şifre sıfırlama ve diğer sistem e-postaları için bir Gmail hesabı yapılandırmanız gerekiyor.
            Bu hesap sistem tarafından otomatik e-postalar göndermek için kullanılacak.
          </p>
        </div>
        <GradientButton
          type="button"
          onClick={handleConnectGoogle}
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z"
                />
              </svg>
              Google Hesabı Bağla
            </>
          )}
        </GradientButton>
      </div>
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
                  {t('systemMail.title')}
                </h2>
                <p className={`mt-2 text-sm ${secondaryTextClass} text-center`}>
                  {t('systemMail.description')}
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