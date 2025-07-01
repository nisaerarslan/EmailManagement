import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, User, Loader2} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BeamsBackground } from '../components/ui/beams-background';
import { CardSpotlight } from '../components/ui/card-spotlight';
import { GradientButton } from '../components/ui/gradient-button';
import { authService } from '../services/authService';
import OtpVerificationForm from '../components/auth/OtpVerificationForm';

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{identifier: string, password: string} | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [theme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Initialize theme and language from localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      const response = await authService.login(identifier, password);
      setDebugInfo(`Login response: ${JSON.stringify(response)}`);
      
      // OTP verification if required
      if (response.require_otp) {
        setDebugInfo(`OTP required for user: ${identifier}`);
        setLoginCredentials({ identifier, password });
        setShowOtpVerification(true);
      } else {
        // Redirect to dashboard if OTP not required
        setDebugInfo('OTP not required, redirecting to dashboard');
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginError'));
      setDebugInfo(`Login error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOtpVerify = async (otpCode: string) => {
    if (!loginCredentials) return;
    setDebugInfo(`Attempting OTP verification with code: ${otpCode}`);
    
    try {
      const response = await authService.login(loginCredentials.identifier, loginCredentials.password, otpCode);
      setDebugInfo(`OTP verification response: ${JSON.stringify(response)}`);
      navigate('/dashboard');
    } catch (err) {
      setDebugInfo(`OTP verification error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  };
  
  const handleRecoveryCodeVerify = async (recoveryCode: string) => {
    if (!loginCredentials) return;
    setDebugInfo(`Attempting recovery code verification: ${recoveryCode}`);
    
    try {
      const response = await authService.loginWithRecoveryCode(
        loginCredentials.identifier, 
        loginCredentials.password, 
        recoveryCode
      );
      setDebugInfo(`Recovery code verification response: ${JSON.stringify(response)}`);
      navigate('/dashboard');
    } catch (err) {
      setDebugInfo(`Recovery code verification error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err;
    }
  };
  
  const handleCancelOtp = () => {
    setShowOtpVerification(false);
    setLoginCredentials(null);
    setDebugInfo('OTP verification cancelled');
  };

  const bgClass = theme === 'light' ? 'bg-gray-50' : '';
  const textClass = theme === 'light' ? 'text-gray-900' : 'text-white';
  const secondaryTextClass = theme === 'light' ? 'text-gray-600' : 'text-neutral-300';
  const inputBgClass = theme === 'light' ? 'bg-white border-gray-300' : 'bg-neutral-800/50 border-neutral-700/50';
  const inputTextClass = theme === 'light' ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-neutral-400';

  return (
    <BeamsBackground className={bgClass}>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">

          <CardSpotlight className="flex-1">
            <div className="relative z-20 space-y-6 p-8">
              {!showOtpVerification ? (
                <>
                  <div>
                    <h2 className={`text-3xl font-bold ${textClass} text-center`}>
                      {t('auth.login')}
                    </h2>
                    <p className={`mt-2 text-sm ${secondaryTextClass} text-center`}>
                      {t('auth.title')}
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-md p-3 text-sm">
                        {error}
                      </div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="identifier" className={`block text-sm font-medium ${secondaryTextClass}`}>
                          {t('auth.username')}
                        </label>
                        <div className="relative mt-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-neutral-400" />
                          </div>
                          <input
                            id="identifier"
                            name="identifier"
                            type="text"
                            autoComplete="username email"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className={`block w-full pl-10 pr-3 py-2 ${inputBgClass} rounded-md ${inputTextClass} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="user123"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="password" className={`block text-sm font-medium ${secondaryTextClass}`}>
                          {t('auth.password')}
                        </label>
                        <div className="relative mt-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-neutral-400" />
                          </div>
                          <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`block w-full pl-10 pr-3 py-2 ${inputBgClass} rounded-md ${inputTextClass} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                            placeholder="••••••••"
                          />
                        </div>
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
                          t('auth.login')
                        )}
                      </GradientButton>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <Link
                          to="/register"
                          className="font-medium text-blue-500 hover:text-blue-400"
                        >
                          {t('auth.register')}
                        </Link>
                      </div>
                      <div className="text-sm">
                        <Link
                          to="/sifremi-unuttum"
                          className="font-medium text-blue-500 hover:text-blue-400"
                        >
                          {t('forgotPassword.title')}
                        </Link>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <OtpVerificationForm
                    onVerify={handleOtpVerify}
                    onRecoveryCode={handleRecoveryCodeVerify}
                    onCancel={handleCancelOtp}
                  />
                  {debugInfo && (
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-md p-3 text-xs mt-4">
                      <div className="font-bold">Debug Info:</div>
                      <pre className="whitespace-pre-wrap">{debugInfo}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardSpotlight>

          <CardSpotlight className="flex-1">
            <div className="relative z-20 space-y-6">
              <h3 className="text-xl font-bold text-white">
                {t('auth.loginSteps')}
              </h3>
              <div className="text-neutral-200">
                <ul className="space-y-4">
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.loginStep1')}</p>
                  </li>
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.loginStep2')}</p>
                  </li>
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.loginStep3')}</p>
                  </li>
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.loginStep4')}</p>
                  </li>
                </ul>
              </div>
              <p className="text-neutral-300 text-sm">
                {t('auth.loginSecurity')}
              </p>
            </div>
          </CardSpotlight>
        </div>
      </div>
    </BeamsBackground>
  );
}