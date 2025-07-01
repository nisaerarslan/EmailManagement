import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Copy, Check } from 'lucide-react';
import { GradientButton } from '../ui/gradient-button';
import { authService } from '../../services/authService';

interface OtpSetupModalProps {
  onClose: () => void;
  onSetupComplete: () => void;
  otpSetup?: {
    qr_code: string;
    secret: string;
  };
  user?: {
    user_id: number;
    username: string;
    email: string;
    otp_enabled: boolean;
  };
}

export default function OtpSetupModal({ onClose, onSetupComplete, otpSetup, user }: OtpSetupModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Props'tan gelen veriler varsa onları kullan, yoksa authService'ten al
  const setupData = otpSetup || authService.getOtpSetup();
  const userData = user || (() => {
    const tempUserStr = localStorage.getItem('temp_user');
    return tempUserStr ? JSON.parse(tempUserStr) : null;
  })();
  
  // Eğer gerekli veriler yoksa modal'ı render etme
  if (!setupData || !setupData.qr_code || !setupData.secret || !userData) {
    console.log('OtpSetupModal: Missing required data', { setupData, userData });
    return null;
  }
  
  const handleCopySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };
  
  const handleEnableOtp = async () => {
    try {
      setLoading(true);
      console.log('OTP setup started for user:', userData.user_id);
      
      // Token kontrolü yapalım
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found for OTP setup');
        alert('Oturum süresi doldu. Lütfen tekrar kayıt olun.');
        return;
      }
      
      await authService.setupOtp(userData.user_id, true);
      console.log('OTP setup completed successfully');
      authService.clearOtpSetup();
      onSetupComplete();
    } catch (error) {
      console.error('OTP setup failed:', error);
      // Hata durumunda kullanıcıya bilgi verebiliriz
      const errorMessage = error instanceof Error ? error.message : 'OTP kurulumu sırasında hata oluştu';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSkipSetup = () => {
    authService.clearOtpSetup();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md p-6 shadow-lg">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {t('auth.otpSetup.title')}
          </h2>
          <p className="text-neutral-400 text-sm">
            {t('auth.otpSetup.description')}
          </p>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src={setupData.qr_code} 
              alt="Google Authenticator QR Code" 
              className="w-48 h-48 bg-white p-2 rounded-lg" 
            />
          </div>
          
          <div className="relative">
            <div className="flex items-center p-2 bg-neutral-800 rounded border border-neutral-700 mb-2">
              <span className="text-sm font-mono text-neutral-300 mr-2 truncate flex-1 text-center">
                {setupData.secret}
              </span>
              <button 
                onClick={handleCopySecret}
                className="text-neutral-400 hover:text-white flex-shrink-0"
                aria-label="Copy secret key"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>
            <p className="text-xs text-neutral-500 text-center">
              {t('auth.otpSetup.manualEntry')}
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <GradientButton 
            onClick={handleEnableOtp}
            className="w-full"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('auth.otpSetup.enable')}
          </GradientButton>
          
          <button
            onClick={handleSkipSetup}
            className="w-full py-2 px-4 rounded-md bg-transparent border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            {t('auth.otpSetup.skip')}
          </button>
        </div>
      </div>
    </div>
  );
} 