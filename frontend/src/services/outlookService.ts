const API_URL = 'http://localhost:8000/api';

export interface OutlookEmail {
    id: string;
    subject: string;
    sender: string;
    recipient: string;
    body: string;
    received_at: string;
    is_read: boolean;
}

export interface OutlookInboxResponse {
    emails: OutlookEmail[];
    total: number;
    page: number;
    per_page: number;
}

export const outlookService = {
    async getAuthUrl(): Promise<{ auth_url: string }> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_URL}/mail-accounts/outlook/auth?prompt=select_account`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to get Outlook auth URL');
        }

        return response.json();
    },

    async getInbox(accountId: number, page: number = 1, perPage: number = 20): Promise<OutlookInboxResponse> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `${API_URL}/mail-accounts/outlook/inbox/${accountId}?page=${page}&per_page=${perPage}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get Outlook inbox');
        }

        return response.json();
    },

    async getEmail(accountId: number, messageId: string): Promise<OutlookEmail> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `${API_URL}/mail-accounts/outlook/email/${accountId}/${messageId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get Outlook email');
        }

        return response.json();
    },

    async replyEmail(accountId: number, messageId: string, content: string): Promise<{ status: string; message: string }> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `${API_URL}/mail-accounts/outlook/email/${accountId}/${messageId}/reply`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            }
        );

        if (!response.ok) {
            throw new Error('Failed to reply to Outlook email');
        }

        return response.json();
    },

    async startAuth() {
        try {
            const { auth_url } = await this.getAuthUrl();
            window.location.href = auth_url;
        } catch (error) {
            throw new Error('Failed to start Outlook authentication');
        }
    }
}; 