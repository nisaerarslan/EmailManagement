import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Key } from 'lucide-react';
import { GradientButton } from '../ui/gradient-button';

interface OtpVerificationFormProps {
  onVerify: (otpCode: string) => Promise<void>;
  onRecoveryCode: (recoveryCode: string) => Promise<void>;
  onCancel: () => void;
}

export default function OtpVerificationForm({ onVerify, onRecoveryCode, onCancel }: OtpVerificationFormProps) {
  const { t } = useTranslation();
  const [otpCode, setOtpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode && !recoveryCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (showRecoveryInput && recoveryCode) {
        await onRecoveryCode(recoveryCode);
      } else if (otpCode) {
        await onVerify(otpCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.otpVerification.error'));
    } finally {
      setLoading(false);
    }
  };

  const toggleRecoveryMode = () => {
    setShowRecoveryInput(!showRecoveryInput);
    setError(null);
  };

  const handleRecoveryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Formatı XXX-XXX-XXX-XXX şeklinde tutmak için
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // Otomatik olarak tire ekle
    let formattedValue = '';
    const digitsOnly = value.replace(/-/g, '');
    
    for (let i = 0; i < digitsOnly.length; i++) {
      if (i > 0 && i % 4 === 0 && i < 16) {
        formattedValue += '-';
      }
      formattedValue += digitsOnly[i];
    }
    
    setRecoveryCode(formattedValue);
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white">
          {showRecoveryInput ? t('auth.recoveryCode.title') : t('auth.otpVerification.title')}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {showRecoveryInput ? t('auth.recoveryCode.loginDescription') : t('auth.otpVerification.description')}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-md p-3 text-sm">
            {error}
          </div>
        )}
        
        {!showRecoveryInput ? (
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-neutral-300 mb-1">
              {t('auth.otpVerification.codeLabel')}
            </label>
            <input
              type="text"
              id="otp"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="block w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              required={!showRecoveryInput}
            />
            <p className="mt-1 text-xs text-neutral-500 text-center">
              {t('auth.otpVerification.hint')}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="recoveryCode" className="block text-sm font-medium text-neutral-300 mb-1">
              {t('auth.recoveryCode.codeLabel')}
            </label>
            <input
              type="text"
              id="recoveryCode"
              value={recoveryCode}
              onChange={handleRecoveryCodeChange}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxLength={19} // 16 karakter + 3 tire
              className="block w-full px-3 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
              required={showRecoveryInput}
            />
            <p className="mt-1 text-xs text-neutral-500 text-center">
              {t('auth.recoveryCode.hint')}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <GradientButton
            type="submit"
            className="w-full"
            disabled={loading || (!otpCode && !recoveryCode)}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              showRecoveryInput ? t('auth.recoveryCode.verify') : t('auth.otpVerification.verify')
            )}
          </GradientButton>
          
          <button
            type="button"
            onClick={toggleRecoveryMode}
            className="w-full py-2 px-4 rounded-md bg-transparent flex items-center justify-center gap-2 text-neutral-400 hover:text-neutral-300 transition-colors"
          >
            <Key size={16} />
            {showRecoveryInput 
              ? t('auth.recoveryCode.useOtp') 
              : t('auth.recoveryCode.useRecovery')}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 px-4 rounded-md bg-transparent text-neutral-400 hover:text-neutral-300 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
} 