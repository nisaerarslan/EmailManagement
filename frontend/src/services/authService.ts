interface LoginResponse {
    token?: string;
    user?: {
        user_id: number;
        username: string;
        email: string;
        otp_enabled: boolean;
    };
    require_otp?: boolean;
    message?: string;
}

interface RegisterResponse {
    token: string;
    user: {
        user_id: number;
        username: string;
        email: string;
        otp_enabled: boolean;
    };
    otp_setup?: {
        qr_code: string;
        secret: string;
    };
}

interface OtpSetupResponse {
    success: boolean;
    message: string;
}

interface RegenerateOtpResponse {
    success: boolean;
    otp_setup: {
        qr_code: string;
        secret: string;
    };
}

interface RecoveryCodeResponse {
    success: boolean;
    recovery_code: string;
}

const API_URL = 'http://localhost:8000/api';

export const authService = {
    async login(identifier: string, password: string, otpCode?: string, recoveryCode?: string): Promise<LoginResponse> {
        const requestBody: any = { identifier, password };
        
        // OTP kodu verildiyse ekle
        if (otpCode) {
            requestBody.otp_code = otpCode;
        }
        
        // Kurtarma kodu verildiyse ekle
        if (recoveryCode) {
            requestBody.recovery_code = recoveryCode;
        }
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        // OTP doğrulaması gerekiyorsa
        if (data.require_otp) {
            return data;
        }

        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Fetch and store user profile image after successful login
        try {
            await this.fetchProfileImage();
        } catch (error) {
            console.log('Could not fetch profile image, using default');
        }

        return data;
    },

    async register(username: string, email: string, password: string): Promise<RegisterResponse> {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // OTP kurulum bilgilerini session storage'a kaydet (güvenlik için geçici olarak tut)
        if (data.otp_setup) {
            sessionStorage.setItem('otp_setup', JSON.stringify(data.otp_setup));
        }

        return data;
    },
    
    // OTP kurulumunu etkinleştir/devre dışı bırak
    async setupOtp(userId: number, enable: boolean): Promise<OtpSetupResponse> {
        const token = this.getToken();
        if (!token) throw new Error('You must be logged in');
        
        const response = await fetch(`${API_URL}/auth/setup-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId, enable }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'OTP setup failed');
        }
        
        // Kullanıcı bilgilerini güncelle
        const user = this.getUser();
        if (user) {
            user.otp_enabled = enable;
            localStorage.setItem('user', JSON.stringify(user));
        }

        return data;
    },
    
    // Yeni OTP QR kodu oluştur
    async regenerateOtp(userId: number): Promise<RegenerateOtpResponse> {
        const token = this.getToken();
        if (!token) throw new Error('You must be logged in');
        
        const response = await fetch(`${API_URL}/auth/regenerate-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'OTP regeneration failed');
        }
        
        // OTP kurulum bilgilerini session storage'a kaydet (güvenlik için geçici olarak tut)
        if (data.otp_setup) {
            sessionStorage.setItem('otp_setup', JSON.stringify(data.otp_setup));
        }

        return data;
    },
    
    // OTP kurulum bilgilerini al
    getOtpSetup() {
        const otpSetup = sessionStorage.getItem('otp_setup');
        return otpSetup ? JSON.parse(otpSetup) : null;
    },
    
    // OTP kurulum bilgilerini temizle
    clearOtpSetup() {
        sessionStorage.removeItem('otp_setup');
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('profileImage');
        sessionStorage.removeItem('otp_setup');
    },

    isAuthenticated(): boolean {
        return !!localStorage.getItem('token');
    },

    getToken(): string | null {
        return localStorage.getItem('token');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    
    async fetchProfileImage() {
        const token = this.getToken();
        if (!token) return null;
        
        try {
            const response = await fetch(`${API_URL.replace('/api', '')}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch profile image');
            }
            
            const data = await response.json();
            
            if (data.img_src) {
                localStorage.setItem('profileImage', data.img_src);
                return data.img_src;
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching profile image:', error);
            return null;
        }
    },
    
    getProfileImage() {
        const user = this.getUser();
        if (!user) return null;
        
        const profileImgSrc = localStorage.getItem('profileImage');
        return profileImgSrc || `https://ui-avatars.com/api/?name=${user.username || 'User'}&background=random&color=fff`;
    },

    // OTP durumunu kontrol et
    isOtpEnabled(): boolean {
        const user = this.getUser();
        return user ? user.otp_enabled : false;
    },

    // Kurtarma kodu oluştur
    async generateRecoveryCode(userId: number): Promise<RecoveryCodeResponse> {
        const token = this.getToken();
        if (!token) throw new Error('You must be logged in');
        
        const response = await fetch(`${API_URL}/auth/generate-recovery-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ user_id: userId }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Recovery code generation failed');
        }

        return data;
    },
    
    // Kurtarma kodu ile giriş yapma
    async loginWithRecoveryCode(identifier: string, password: string, recoveryCode: string): Promise<LoginResponse> {
        return this.login(identifier, password, undefined, recoveryCode);
    },
    
    // Şifre sıfırlama isteği
    async requestPasswordReset(identifier: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ identifier }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Password reset request failed');
        }

        return data;
    },
    
    // Şifre sıfırlama token'ını doğrula
    async verifyResetToken(token: string): Promise<{ success: boolean; user_id?: number; message?: string }> {
        const response = await fetch(`${API_URL}/auth/verify-reset-token/${token}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Reset token verification failed');
        }

        return data;
    },
    
    // Şifreyi sıfırla
    async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                token,
                new_password: newPassword
            }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Password reset failed');
        }

        return data;
    }
}; 