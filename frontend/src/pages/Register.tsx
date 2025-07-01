import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BeamsBackground } from '../components/ui/beams-background';
import { CardSpotlight } from '../components/ui/card-spotlight';
import { GradientButton } from '../components/ui/gradient-button';
import { authService } from '../services/authService';
import OtpSetupModal from '../components/auth/OtpSetupModal';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOtpSetup, setShowOtpSetup] = useState(false);
  const [otpSetupData, setOtpSetupData] = useState<{qr_code: string; secret: string} | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authService.register(name, email, password);
      
      // OTP kurulum bilgisi varsa, kullanıcıya 2FA kurulumu için seçenek sun
      if (response.otp_setup) {
        // Geçici olarak user bilgisini saklayalım
        const userData = response.user;
        // Token'ı şimdilik tutuyoruz - OTP kurulumu için gerekli
        // localStorage.removeItem('token'); // Bu satırı kaldırıyoruz
        localStorage.setItem('temp_user', JSON.stringify(userData));
        
        // OTP kurulum bilgilerini state'e kaydet
        setOtpSetupData(response.otp_setup);
        setTempUser(userData);
        
        // Modal'ı göster
        setShowOtpSetup(true);
      } else {
        // Tüm bilgileri temizle
        authService.logout();
        // 2 saniye sonra ana sayfaya yönlendir
        setTimeout(() => {
          navigate('/landing');
        }, 2000);
      }
      
      // Başarı mesajını göster
      setSuccess(t('auth.registerSuccess'));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleOtpSetupComplete = () => {
    // Geçici user bilgisini temizle
    localStorage.removeItem('temp_user');
    // Token'ı da temizle çünkü OTP kurulumu tamamlandı
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowOtpSetup(false);
    setOtpSetupData(null);
    setTempUser(null);
    // OTP kurulum tamamlandıktan sonra ana sayfaya yönlendir
    setTimeout(() => {
      navigate('/landing');
    }, 2000);
  };
  
  const handleSkipOtpSetup = () => {
    // Geçici user bilgisini temizle
    localStorage.removeItem('temp_user');
    // Token'ı da temizle çünkü OTP kurulumu atlandı
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setShowOtpSetup(false);
    setOtpSetupData(null);
    setTempUser(null);
    // OTP kurulumu atlandıktan sonra ana sayfaya yönlendir
    setTimeout(() => {
      navigate('/landing');
    }, 2000);
  };

  return (
    <BeamsBackground>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl">
          <CardSpotlight className="flex-1">
            <div className="relative z-20 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white text-center">
                  {t('auth.register')}
                </h2>
                <p className="mt-2 text-sm text-neutral-300 text-center">
                  {t('auth.title')}
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-md p-3 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-500 rounded-md p-3 text-sm">
                    {success}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-neutral-200">
                      {t('auth.username')}
                    </label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-neutral-400" />
                      </div>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="user123"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-200">
                      {t('email')}
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
                        className="block w-full pl-10 pr-3 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="user@mail.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-200">
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
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-md text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <GradientButton type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      t('auth.register')
                    )}
                  </GradientButton>
                </div>

                <div className="flex items-center justify-center">
                  <div className="text-sm">
                    <Link
                      to="/login"
                      className="font-medium text-blue-500 hover:text-blue-400"
                    >
                      {t('auth.login')}
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </CardSpotlight>

          <CardSpotlight className="flex-1">
            <div className="relative z-20 space-y-6">
              <h3 className="text-xl font-bold text-white">
                {t('auth.registerSteps')}
              </h3>
              <div className="text-neutral-200">
                <ul className="space-y-4">
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.registerStep1')}</p>
                  </li>
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.registerStep2')}</p>
                  </li>
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.registerStep3')}</p>
                  </li>
                  <li className="flex gap-2 items-start">
                    <svg className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p>{t('auth.registerStep4')}</p>
                  </li>
                </ul>
              </div>
              <p className="text-neutral-300 text-sm">
                {t('auth.registerSecurity')}
              </p>
            </div>
          </CardSpotlight>
        </div>
      </div>
      
      {showOtpSetup && otpSetupData && tempUser && (
        <OtpSetupModal
          onClose={handleSkipOtpSetup}
          onSetupComplete={handleOtpSetupComplete}
          otpSetup={otpSetupData}
          user={tempUser}
        />
      )}
    </BeamsBackground>
  );
}