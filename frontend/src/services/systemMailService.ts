const API_URL = 'http://localhost:8000/api';

interface SystemMailResponse {
    success: boolean;
    email?: string;
    is_configured?: boolean;
    message?: string;
}

interface AuthUrlResponse {
    success: boolean;
    auth_url: string;
}

export const systemMailService = {
    // Sistem mail hesabı bilgilerini al
    async getSystemMail(): Promise<SystemMailResponse> {
        const response = await fetch(`${API_URL}/systemmail`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get system mail');
        }

        return data;
    },
    
    // Google auth URL al
    async getAuthUrl(): Promise<AuthUrlResponse> {
        const response = await fetch(`${API_URL}/systemmail/auth-url`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to get auth URL');
        }

        return data;
    },
    
    // Callback sonrası email güncelle
    async updateEmail(code: string, email: string): Promise<SystemMailResponse> {
        const response = await fetch(`${API_URL}/systemmail/update-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, email }),
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update system mail');
        }

        return data;
    },
    
    // Sistem mail hesabını sil
    async deleteSystemMail(id: number): Promise<SystemMailResponse> {
        const response = await fetch(`${API_URL}/systemmail/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete system mail');
        }

        return data;
    }
}; 