import React, { useState, useRef, useEffect } from 'react';
import { Camera, Save, Loader2, Shield, Copy, Check, AlertTriangle, RefreshCcw, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CardSpotlight } from '../components/ui/card-spotlight';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface UserProfile {
  name: string;
  username: string;
  email: string;
  img_src: string;
}

// API URL'lerini sabitleyelim
const API_BASE_URL = 'http://localhost:8000';
const API_ENDPOINTS = {
  PROFILE: `${API_BASE_URL}/api/users/profile`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/users/profile/update`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/users/change-password`,
  UPDATE_AVATAR: `${API_BASE_URL}/api/users/profile/avatar`
};

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    username: '',
    email: '',
    img_src: ''
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Authenticator durumu ve yönetim state'leri
  const [showOtpQR, setShowOtpQR] = useState(false);
  const [otpSetup, setOtpSetup] = useState<any>(null);
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryCodeCopied, setRecoveryCodeCopied] = useState(false);
  const [recoveryCodeLoading, setRecoveryCodeLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
    
    // OTP durumunu al
    const user = authService.getUser();
    if (user) {
      setOtpEnabled(user.otp_enabled || false);
    }
  }, [navigate]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Fetching profile from:', API_ENDPOINTS.PROFILE);
      const response = await fetch(API_ENDPOINTS.PROFILE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile fetch error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setProfile({
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        img_src: data.img_src || ''
      });

      // Save profile image URL to localStorage for sidebar usage
      if (data.img_src) {
        localStorage.setItem('profileImage', data.img_src);

        // Trigger a storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'profileImage',
          newValue: data.img_src
        }));
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      if (error instanceof Error) {
        toast.error(t('profile.error.fetch', { error: error.message }));
      } else {
        toast.error(t('profile.error.fetch'));
      }
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Update profile information
      const response = await fetch(API_ENDPOINTS.UPDATE_PROFILE, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email
        })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(t('profile.error.update'));
      }

      // If password fields are filled, update password
      if (currentPassword && newPassword && confirmPassword) {
        if (newPassword !== confirmPassword) {
          setPasswordError(t('profile.error.passwordMismatch'));
          return;
        }

        if (newPassword.length < 6) {
          setPasswordError(t('profile.error.passwordTooShort'));
          return;
        }

        const passwordResponse = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
          })
        });

        if (passwordResponse.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (!passwordResponse.ok) {
          const errorData = await passwordResponse.json();
          throw new Error(errorData.error || t('profile.error.passwordUpdate'));
        }

        setPasswordSuccess(t('profile.success.passwordUpdated'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      toast.success(t('profile.success.updated'));
      await fetchProfile(); // Profil bilgilerini yenile
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof Error) {
        setPasswordError(error.message);
      } else {
        toast.error(t('profile.error.update'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large
          const MAX_SIZE = 400;
          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Daha fazla sıkıştırma
          const base64String = canvas.toDataURL('image/jpeg', 0.5);
          resolve(base64String);
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const file = e.target.files[0];

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(t('profile.error.fileTooLarge'));
          return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          toast.error(t('profile.error.invalidFileType'));
          return;
        }

        const compressedImage = await compressImage(file);

        const response = await fetch(API_ENDPOINTS.UPDATE_AVATAR, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image: compressedImage })
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(t('profile.error.avatarUpdate'));
        }

        setProfile(prev => ({
          ...prev,
          img_src: compressedImage
        }));

        // Save profile image to localStorage for sidebar usage
        localStorage.setItem('profileImage', compressedImage);

        // Trigger a storage event to notify other components
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'profileImage',
          newValue: compressedImage
        }));

        toast.success(t('profile.success.avatarUpdated'));
      } catch (error) {
        console.error('Error updating profile picture:', error);
        if (error instanceof Error) {
          toast.error(t('profile.error.avatarUpdate', { error: error.message }));
        } else {
          toast.error(t('profile.error.avatarUpdate'));
        }
      } finally {
        setUploading(false);
      }
    }
  };

  // Google Authenticator işlemleri
  const handleToggleOtp = async () => {
    setOtpLoading(true);
    try {
      const user = authService.getUser();
      if (!user) {
        toast.error(t('common.error.notAuthenticated'));
        return;
      }
      
      await authService.setupOtp(user.user_id, !otpEnabled);
      setOtpEnabled(!otpEnabled);
      toast.success(otpEnabled 
        ? t('auth.otpSetup.disabled') 
        : t('auth.otpSetup.enabled'));
        
      // OTP etkinleştirilirse, QR kodunu göster
      if (!otpEnabled) {
        await handleRegenerateOtp();
      } else {
        setShowOtpQR(false);
        setOtpSetup(null);
        authService.clearOtpSetup();
      }
    } catch (error) {
      console.error('OTP toggle error:', error);
      toast.error(error instanceof Error ? error.message : t('auth.otpSetup.error'));
    } finally {
      setOtpLoading(false);
    }
  };
  
  const handleRegenerateOtp = async () => {
    setOtpLoading(true);
    try {
      const user = authService.getUser();
      if (!user) {
        toast.error(t('common.error.notAuthenticated'));
        return;
      }
      
      const response = await authService.regenerateOtp(user.user_id);
      if (response.otp_setup) {
        setOtpSetup(response.otp_setup);
        setShowOtpQR(true);
      }
    } catch (error) {
      console.error('OTP regeneration error:', error);
      toast.error(error instanceof Error ? error.message : t('auth.otpSetup.regenerateError'));
    } finally {
      setOtpLoading(false);
    }
  };
  
  const handleCopySecret = () => {
    if (otpSetup?.secret) {
      navigator.clipboard.writeText(otpSetup.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 3000);
    }
  };
  
  const handleCloseOtpSetup = () => {
    setShowOtpQR(false);
    if (!otpEnabled) {
      // If OTP is not enabled, clean up session storage
      authService.clearOtpSetup();
    }
  };

  // Kurtarma kodu oluştur
  const handleGenerateRecoveryCode = async () => {
    setRecoveryCodeLoading(true);
    try {
      const user = authService.getUser();
      if (!user) {
        toast.error(t('common.error.notAuthenticated'));
        return;
      }
      
      const response = await authService.generateRecoveryCode(user.user_id);
      if (response.recovery_code) {
        setRecoveryCode(response.recovery_code);
        setShowRecoveryCode(true);
        toast.success(t('auth.recoveryCode.generated'));
      }
    } catch (error) {
      console.error('Recovery code generation error:', error);
      toast.error(error instanceof Error ? error.message : t('auth.recoveryCode.error'));
    } finally {
      setRecoveryCodeLoading(false);
    }
  };
  
  const handleCopyRecoveryCode = () => {
    if (recoveryCode) {
      navigator.clipboard.writeText(recoveryCode);
      setRecoveryCodeCopied(true);
      setTimeout(() => setRecoveryCodeCopied(false), 3000);
    }
  };
  
  const handleCloseRecoveryCode = () => {
    setShowRecoveryCode(false);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className={cn(
            "text-3xl font-bold mb-8 text-center",
            isDark ? "text-white" : "text-slate-800"
          )}>
            {t('profile.title')}
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User Avatar Section */}
            <CardSpotlight className={cn(
              "col-span-1",
              !isDark && "border border-slate-200/60"
            )}>
              <div className="relative z-20 p-6 space-y-6">
                <h2 className={cn(
                  "text-xl font-semibold mb-4",
                  isDark ? "text-white" : "text-slate-800"
                )}>{t('profile.avatar')}</h2>
                <div className="flex flex-col items-center">
                  <div 
                    className={cn(
                      "w-40 h-40 rounded-full relative overflow-hidden cursor-pointer",
                      isDark 
                        ? "bg-neutral-800 border-2 border-blue-500/50" 
                        : "bg-gray-100 border-2 border-blue-500/30"
                    )}
                    onClick={handleImageClick}
                  >
                    {profile.img_src ? (
                      <img 
                        src={profile.img_src} 
                        alt={profile.name || profile.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={cn(
                        "w-full h-full flex items-center justify-center",
                        isDark 
                          ? "bg-gradient-to-br from-blue-800/50 to-purple-800/50" 
                          : "bg-gradient-to-br from-blue-500/30 to-purple-500/30"
                      )}>
                        <span className="text-4xl font-bold text-white">
                          {profile.name?.charAt(0) || profile.username?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="text-white w-10 h-10" />
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <Loader2 className="text-white w-10 h-10 animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className={cn(
                    "mt-2 text-sm",
                    isDark ? "text-neutral-400" : "text-slate-500"
                  )}>{t('profile.avatarDescription')}</p>
                  <input 
                    type="file" 
                    hidden 
                    ref={fileInputRef}
                    accept="image/*" 
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </CardSpotlight>
            
            {/* Profile Information */}
            <CardSpotlight className={cn(
              "col-span-1 lg:col-span-2",
              !isDark && "border border-slate-200/60"
            )}>
              <div className="relative z-20 p-6 space-y-6">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className={cn(
                        "block text-sm font-medium mb-1",
                        isDark ? "text-neutral-300" : "text-slate-600"
                      )}>
                        {t('profile.name')}
                      </label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className={cn(
                          "w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isDark 
                            ? "bg-neutral-800/50 border border-neutral-700 text-white" 
                            : "bg-white border border-slate-300 text-slate-900"
                        )}
                        placeholder={t('profile.name')}
                      />
                    </div>
                    
                    <div>
                      <label className={cn(
                        "block text-sm font-medium mb-1",
                        isDark ? "text-neutral-300" : "text-slate-600"
                      )}>
                        {t('profile.username')}
                      </label>
                      <input
                        type="text"
                        value={profile.username}
                        disabled
                        className={cn(
                          "w-full px-3 py-2 rounded-md cursor-not-allowed",
                          isDark 
                            ? "bg-neutral-800/30 border border-neutral-700/50 text-neutral-400" 
                            : "bg-slate-100 border border-slate-200 text-slate-500"
                        )}
                      />
                    </div>
                    
                    <div>
                      <label className={cn(
                        "block text-sm font-medium mb-1",
                        isDark ? "text-neutral-300" : "text-slate-600"
                      )}>
                        {t('profile.email')}
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({...profile, email: e.target.value})}
                        className={cn(
                          "w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isDark 
                            ? "bg-neutral-800/50 border border-neutral-700 text-white" 
                            : "bg-white border border-slate-300 text-slate-900"
                        )}
                      />
                    </div>
                  </div>
                </form>
                
                <div className={cn(
                  "pt-4 border-t",
                  isDark ? "border-neutral-700/50" : "border-slate-200"
                )}>
                  <h3 className={cn(
                    "text-lg font-medium mb-4",
                    isDark ? "text-white" : "text-slate-800"
                  )}>{t('profile.changePassword')}</h3>
                  
                  {passwordError && (
                    <div className={cn(
                      "mb-4 p-3 rounded-md",
                      isDark 
                        ? "bg-red-500/10 border border-red-500/20 text-red-400"
                        : "bg-red-50 border border-red-100 text-red-500"
                    )}>
                      {passwordError}
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className={cn(
                      "mb-4 p-3 rounded-md",
                      isDark 
                        ? "bg-green-500/10 border border-green-500/20 text-green-400"
                        : "bg-green-50 border border-green-100 text-green-500"
                    )}>
                      {passwordSuccess}
                    </div>
                  )}
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className={cn(
                          "block text-sm font-medium mb-1",
                          isDark ? "text-neutral-300" : "text-slate-600"
                        )}>
                          {t('profile.currentPassword')}
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                            isDark 
                              ? "bg-neutral-800/50 border border-neutral-700 text-white" 
                              : "bg-white border border-slate-300 text-slate-900"
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className={cn(
                          "block text-sm font-medium mb-1",
                          isDark ? "text-neutral-300" : "text-slate-600"
                        )}>
                          {t('profile.newPassword')}
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                            isDark 
                              ? "bg-neutral-800/50 border border-neutral-700 text-white" 
                              : "bg-white border border-slate-300 text-slate-900"
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className={cn(
                          "block text-sm font-medium mb-1",
                          isDark ? "text-neutral-300" : "text-slate-600"
                        )}>
                          {t('profile.confirmPassword')}
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={cn(
                            "w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                            isDark 
                              ? "bg-neutral-800/50 border border-neutral-700 text-white" 
                              : "bg-white border border-slate-300 text-slate-900"
                          )}
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium rounded-md transition-colors shadow-md"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          {t('profile.saveChanges')}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </CardSpotlight>
            
            {/* Two-Factor Authentication (Google Authenticator) Section */}
            <CardSpotlight className={cn(
              "col-span-1 lg:col-span-3",
              !isDark && "border border-slate-200/60"
            )}>
              <div className="relative z-20 p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className={cn(
                    "text-xl font-semibold",
                    isDark ? "text-white" : "text-slate-800"
                  )}>
                    <Shield className="inline-block mr-2 text-blue-500" />
                    {t('auth.otpSetup.title')}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleToggleOtp}
                      disabled={otpLoading}
                      className={`px-4 py-2 rounded-md font-medium ${
                        otpEnabled 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      } transition-colors shadow-md flex items-center`}
                    >
                      {otpLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Shield className="w-4 h-4 mr-2" />
                      )}
                      {otpEnabled ? t('auth.otpSetup.disable') : t('auth.otpSetup.enable')}
                    </button>
                    
                    {otpEnabled && (
                      <>
                        <button
                          onClick={handleRegenerateOtp}
                          disabled={otpLoading}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors shadow-md flex items-center"
                        >
                          {otpLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCcw className="w-4 h-4 mr-2" />
                          )}
                          {t('auth.otpSetup.regenerate')}
                        </button>
                        
                        <button
                          onClick={handleGenerateRecoveryCode}
                          disabled={recoveryCodeLoading}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md transition-colors shadow-md flex items-center"
                        >
                          {recoveryCodeLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Key className="w-4 h-4 mr-2" />
                          )}
                          {t('auth.recoveryCode.generate')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className={cn(
                  "p-4 rounded-lg",
                  isDark 
                    ? "bg-neutral-800/50 border border-neutral-700/80" 
                    : "bg-slate-100 border border-slate-200"
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-full",
                      otpEnabled 
                        ? isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600" 
                        : isDark ? "bg-neutral-700/50 text-neutral-400" : "bg-slate-200 text-slate-500"
                    )}>
                      {otpEnabled ? (
                        <Shield className="w-8 h-8" />
                      ) : (
                        <AlertTriangle className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <h3 className={cn(
                        "text-lg font-medium",
                        isDark ? "text-white" : "text-slate-800"
                      )}>
                        {otpEnabled ? t('auth.otpSetup.statusEnabled') : t('auth.otpSetup.statusDisabled')}
                      </h3>
                      <p className={cn(
                        "text-sm mt-1",
                        isDark ? "text-neutral-400" : "text-slate-500"
                      )}>
                        {otpEnabled 
                          ? t('auth.otpSetup.statusEnabledDesc')
                          : t('auth.otpSetup.statusDisabledDesc')
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* QR Code Display */}
                {showOtpQR && otpSetup && (
                  <div className={cn(
                    "mt-6 p-4 rounded-lg",
                    isDark 
                      ? "bg-neutral-800/50 border border-blue-500/20" 
                      : "bg-blue-50 border border-blue-200"
                  )}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-48 h-48 bg-white p-2 rounded-lg mx-auto">
                          <img 
                            src={otpSetup.qr_code} 
                            alt={t('auth.otpSetup.qrCodeAlt')}
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <h3 className={cn(
                          "text-lg font-medium",
                          isDark ? "text-white" : "text-slate-800"
                        )}>
                          {t('auth.otpSetup.setupInstructions')}
                        </h3>
                        
                        <ol className={cn(
                          "list-decimal list-inside space-y-2 ml-2 text-sm",
                          isDark ? "text-neutral-300" : "text-slate-600"
                        )}>
                          <li>{t('auth.otpSetup.instruction1')}</li>
                          <li>{t('auth.otpSetup.instruction2')}</li>
                          <li>{t('auth.otpSetup.instruction3')}</li>
                          <li>{t('auth.otpSetup.instruction4')}</li>
                        </ol>
                        
                        <div className="pt-2">
                          <p className={cn(
                            "text-sm mb-2",
                            isDark ? "text-neutral-400" : "text-slate-500"
                          )}>{t('auth.otpSetup.manualEntry')}</p>
                          <div className={cn(
                            "flex items-center p-2 rounded",
                            isDark 
                              ? "bg-neutral-700/50 border border-neutral-600/50" 
                              : "bg-slate-100 border border-slate-200"
                          )}>
                            <span className={cn(
                              "text-sm font-mono mr-2 truncate flex-1 text-center",
                              isDark ? "text-neutral-300" : "text-slate-700"
                            )}>
                              {otpSetup.secret}
                            </span>
                            <button 
                              onClick={handleCopySecret}
                              className={cn(
                                "flex-shrink-0",
                                isDark ? "text-neutral-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                              )}
                              aria-label={t('auth.otpSetup.copySecretAria')}
                            >
                              {secretCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="pt-2 text-right">
                          <button
                            onClick={handleCloseOtpSetup}
                            className={cn(
                              "px-4 py-2 font-medium rounded-md transition-colors",
                              isDark 
                                ? "bg-neutral-700 hover:bg-neutral-600 text-white" 
                                : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                            )}
                          >
                            {t('common.close')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recovery Code Display */}
                {showRecoveryCode && recoveryCode && (
                  <div className={cn(
                    "mt-6 p-4 rounded-lg",
                    isDark 
                      ? "bg-neutral-800/50 border border-amber-500/20" 
                      : "bg-amber-50 border border-amber-200"
                  )}>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-2 rounded-full",
                          isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-600"
                        )}>
                          <Key className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className={cn(
                            "text-lg font-medium",
                            isDark ? "text-white" : "text-slate-800"
                          )}>
                            {t('auth.recoveryCode.title')}
                          </h3>
                          <p className={cn(
                            "text-sm mt-1",
                            isDark ? "text-neutral-400" : "text-slate-500"
                          )}>
                            {t('auth.recoveryCode.description')}
                          </p>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "p-4 rounded-md",
                        isDark 
                          ? "bg-neutral-900 border border-amber-500/10" 
                          : "bg-white border border-amber-200"
                      )}>
                        <div className="flex items-center">
                          <span className={cn(
                            "font-mono text-lg tracking-wide flex-1 text-center",
                            isDark ? "text-amber-400" : "text-amber-600"
                          )}>
                            {recoveryCode}
                          </span>
                          <button 
                            onClick={handleCopyRecoveryCode}
                            className={cn(
                              "ml-2",
                              isDark ? "text-neutral-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
                            )}
                            aria-label={t('auth.recoveryCode.copyCodeAria')}
                          >
                            {recoveryCodeCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "p-3 rounded-md text-sm",
                        isDark 
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" 
                          : "bg-amber-100 border border-amber-200 text-amber-700"
                      )}>
                        <AlertTriangle className="inline-block w-5 h-5 mr-2 align-text-bottom" />
                        {t('auth.recoveryCode.warning')}
                      </div>
                      
                      <div className="text-right">
                        <button
                          onClick={handleCloseRecoveryCode}
                          className={cn(
                            "px-4 py-2 font-medium rounded-md transition-colors",
                            isDark 
                              ? "bg-neutral-700 hover:bg-neutral-600 text-white" 
                              : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                          )}
                        >
                          {t('common.close')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardSpotlight>
          </div>
        </div>
      </div>
  );
} 