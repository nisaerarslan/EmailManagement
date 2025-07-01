import i18n from '../i18n';

const API_URL = 'http://localhost:8000/api';

interface MailAccount {
    account_id: number;
    email: string;
    account_type: string;
    created_at: string;
    last_checked: string;
    unread_count: number;
}

export const mailAccountService = {
    async getGmailAuthUrl(): Promise<{ auth_url: string }> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
        }

        const response = await fetch(`${API_URL}/mail-accounts/gmail/auth`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(i18n.t('mailAccount.errors.failedToGetGmailAuth'));
        }

        return response.json();
    },

    async deleteAccount(accountId: number): Promise<void> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
        }

        const response = await fetch(`${API_URL}/mail-accounts/${accountId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || i18n.t('mailAccount.errors.failedToDeleteAccount'));
        }
    },

    async handleCallback(code: string): Promise<{ success: boolean; email: string }> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
        }

        const response = await fetch(`${API_URL}/mail-accounts/gmail/callback?code=${encodeURIComponent(code)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || i18n.t('mailAccount.errors.failedToHandleGmailCallback'));
        }

        return response.json();
    },

    async getUserAccounts(): Promise<MailAccount[]> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
        }

        try {
            const response = await fetch(`${API_URL}/mail-accounts/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Clear token if it's invalid
                    localStorage.removeItem('token');
                    throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
                }
                throw new Error(i18n.t('mailAccount.errors.failedToGetAccounts'));
            }

            const data = await response.json();
            return data.accounts;
        } catch (error) {
            console.error('Error fetching accounts:', error);
            throw error;
        }
    },

    async startGmailAuth() {
        try {
            const { auth_url } = await this.getGmailAuthUrl();
            window.location.href = auth_url;
        } catch (error) {
            throw new Error(i18n.t('mailAccount.errors.failedToStartGmailAuth'));
        }
    },

    async getInboxMessages(accountId?: string, pageToken?: string, pageSize: number = 50, signal?: AbortSignal) {
        try {
            let params = new URLSearchParams();
            if (accountId) params.append('account_id', accountId);
            if (pageToken) params.append('pageToken', pageToken);
            params.append('pageSize',"10");

            const response = await fetch(`${API_URL}/mail-accounts/inbox?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                signal
            });

            if (!response.ok) {
                throw new Error(i18n.t('mailAccount.errors.failedToFetchInbox'));
            }

            const data = await response.json();
            return {
                messages: data.messages || [],
                nextPageToken: data.nextPageToken,
                totalCount: data.totalCount || data.messages?.length || 0
            };
        } catch (error) {
            console.error(i18n.t('mailAccount.errors.failedToFetchInbox'), error);
            throw error;
        }
    },

    // Function to send an email
    async sendEmail(data: {
        account_id: number;
        to_recipients: string[];
        subject: string;
        body: string;
        cc_recipients?: string[];
        bcc_recipients?: string[];
        reply_to_id?: string;
        attachments?: Array<{
            filename: string;
            data: string;
            mimeType: string;
        }>;
    }): Promise<{ success: boolean; message: string }> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
        }

        const response = await fetch(`${API_URL}/emails/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error || i18n.t('mailAccount.errors.failedToSendEmail'));
        }

        return responseData;
    },

    // Function to get sent emails
    async getSentEmails(limit: number = 50, offset: number = 0): Promise<{ sent_emails: any[], total_count: number }> {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
        }

        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString()
        });

        const response = await fetch(`${API_URL}/emails/sent?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || i18n.t('mailAccount.errors.failedToFetchSentEmails'));
        }

        const data = await response.json();
        
        if (!data || !Array.isArray(data.sent_emails)) {
            throw new Error(i18n.t('mailAccount.errors.invalidResponse'));
        }

        const formattedEmails = data.sent_emails.map((email: any) => ({
            ...email,
            from: email.from || email.sender || email.user_email || i18n.t('common.unknown'),
            to_recipients: Array.isArray(email.to_recipients) ? email.to_recipients : 
                         email.to ? [email.to] : 
                         email.recipients ? [email.recipients] : 
                         []
        }));

        return { 
            sent_emails: formattedEmails,
            total_count: data.total_count || formattedEmails.length
        };
    },

    async deleteEmail(accountId: number, messageId: string): Promise<boolean> {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
            }

            const response = await fetch(`${API_URL}/emails/${accountId}/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error(i18n.t('mailAccount.errors.sessionExpired'));
                }
                const error = await response.json();
                throw new Error(error.error || i18n.t('mailAccount.errors.failedToDeleteEmail'));
            }

            return response.ok;
        } catch (error) {
            console.error(i18n.t('mailAccount.errors.failedToDeleteEmail'), error);
            throw error;
        }
    },

    async getDeletedEmails(limit: number = 50, offset: number = 0): Promise<{
        deleted_emails: Array<{
            message_id: string;
            account_id: number;
            user_id: number;
            from: string;
            to_recipients: string[];
            cc_recipients: string[];
            bcc_recipients: string[];
            subject: string;
            body: string;
            sent_at: string;
            created_date: string;
            account_email: string;
        }>;
        total_count: number;
    }> {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
            }

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString()
            });

            const response = await fetch(`${API_URL}/emails/deleted?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || i18n.t('mailAccount.errors.failedToFetchDeletedEmails'));
            }

            const data = await response.json();
            
            if (!data || !Array.isArray(data.deleted_emails)) {
                throw new Error(i18n.t('mailAccount.errors.invalidResponse'));
            }

            return {
                deleted_emails: data.deleted_emails,
                total_count: data.total_count || data.deleted_emails.length
            };
        } catch (error) {
            console.error(i18n.t('mailAccount.errors.failedToFetchDeletedEmails'), error);
            throw error;
        }
    },

    async restoreEmail(accountId: number, messageId: string): Promise<boolean> {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error(i18n.t('mailAccount.errors.notAuthenticated'));
            }

            const response = await fetch(`${API_URL}/emails/restore/${accountId}/${messageId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error(i18n.t('mailAccount.errors.sessionExpired'));
                }
                const error = await response.json();
                throw new Error(error.error || i18n.t('mailAccount.errors.failedToRestoreEmail'));
            }

            return response.ok;
        } catch (error) {
            console.error(i18n.t('mailAccount.errors.failedToRestoreEmail'), error);
            throw error;
        }
    },

    async permanentDeleteEmail(accountId: number, messageId: string): Promise<boolean> {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error(i18n.t('mailAccount.errors.sessionExpired'));
            }

            const response = await fetch(`${API_URL}/emails/permanent/${accountId}/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (response.status === 401) {
                    throw new Error(i18n.t('mailAccount.errors.sessionExpired'));
                }
                throw new Error(errorData.error || i18n.t('mailAccount.errors.failedToPermanentDelete'));
            }

            return true;
        } catch (error) {
            console.error(i18n.t('mailAccount.errors.failedToPermanentDelete'), error);
            throw error;
        }
    }
}; 