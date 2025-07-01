import React, { createContext, useContext, useState, useEffect } from 'react';
import { mailAccountService } from '../services/mailAccountService';
import { authService } from '../services/authService';

interface MailAccount {
  account_id: number;
  email: string;
  account_type: string;
  created_at: string;
  unread_count: number;
  last_checked?: string;
}

interface AccountContextType {
  accounts: MailAccount[];
  selectedAccount: string | null;
  setSelectedAccount: (account: string | null) => void;
  refreshAccounts: () => Promise<void>;
  allAccountsOption: MailAccount;
  isLoadingAccounts: boolean;
  accountChangeId: number;
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  selectedAccount: null,
  setSelectedAccount: () => {},
  refreshAccounts: async () => {},
  allAccountsOption: { email: 'all', account_type: 'all', account_id: -1 } as MailAccount,
  isLoadingAccounts: false,
  accountChangeId: 0
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountChangeId, setAccountChangeId] = useState(0);

  const refreshAccounts = async () => {
    try {
      setIsLoadingAccounts(true);
      // Check if token exists before making the request
      if (!authService.isAuthenticated()) {
        console.error('Not authenticated, cannot fetch accounts');
        return;
      }
      
      const fetchedAccounts = await mailAccountService.getUserAccounts();
      setAccounts(fetchedAccounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      
      // If token is invalid or expired, clear it
      if (error instanceof Error && 
          error.message.includes('notAuthenticated')) {
        authService.logout();
        // Redirect to login page if you have a navigation mechanism
        window.location.href = '/login';
      }
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (authService.isAuthenticated()) {
      refreshAccounts();
    }
  }, []);

  // Hesaplar yüklendiğinde otomatik olarak ilk hesabı seç
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount('all'); // Varsayılan olarak tüm hesapları seç
    }
  }, [accounts, selectedAccount]);

  // Optimized setSelectedAccount with change tracking
  const optimizedSetSelectedAccount = (account: string | null) => {
    if (account !== selectedAccount) {
      setAccountChangeId(prev => prev + 1);
      setSelectedAccount(account);
    }
  };

  const value = {
    accounts,
    selectedAccount,
    setSelectedAccount: optimizedSetSelectedAccount,
    refreshAccounts,
    allAccountsOption: { email: 'all', account_type: 'all', account_id: -1 } as MailAccount,
    isLoadingAccounts,
    accountChangeId
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  return useContext(AccountContext);
}
