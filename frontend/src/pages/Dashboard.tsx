import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Mail, Loader } from 'lucide-react';
import { mailAccountService } from '../services/mailAccountService';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface MailAccount {
  account_id: number;
  email: string;
  account_type: string;
  created_at: string;
  unread_count: number;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  useEffect(() => {
    // Check authentication first
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    
    fetchAccounts();
  }, [navigate]);

  const fetchAccounts = async () => {
    try {
      const accounts = await mailAccountService.getUserAccounts();
      setAccounts(accounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      
      // Handle authentication errors
      if (error instanceof Error && 
          error.message.includes('notAuthenticated')) {
        toast.error('Oturum süreniz dolmuş, lütfen tekrar giriş yapın');
        authService.logout();
        navigate('/login');
        return;
      }
      
      toast.error('Mail hesapları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className={cn("h-8 w-8 animate-spin", isDark ? "text-blue-400" : "text-sky-500")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mail Hesaplarınız</h1>
          <Link
            to="/dashboard/add-account"
            className={cn(
              "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md",
              isDark 
                ? "text-white bg-blue-600 hover:bg-blue-700" 
                : "text-white bg-sky-500 hover:bg-sky-600"
            )}
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni Hesap Ekle
          </Link>
        </div>

        {accounts.length === 0 ? (
          <div className={cn(
            "backdrop-blur-lg rounded-lg shadow-xl p-8 text-center border",
            isDark 
              ? "bg-white/10 border-white/20 text-white" 
              : "bg-white/70 border-slate-200"
          )}>
            <Mail className={cn(
              "h-12 w-12 mx-auto mb-4",
              isDark ? "text-blue-300" : "text-sky-500"
            )} />
            <h3 className="text-lg font-medium mb-2">
              Henüz mail hesabı eklemediniz
            </h3>
            <p className={cn(
              "mb-4",
              isDark ? "text-gray-300" : "text-slate-600"
            )}>
              Mail hesabı ekleyerek tüm maillerinizi tek yerden yönetebilirsiniz.
            </p>
            <Link
              to="/dashboard/add-account"
              className={cn(
                "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white",
                isDark 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "bg-sky-500 hover:bg-sky-600"
              )}
            >
              <Plus className="h-5 w-5 mr-2" />
              Mail Hesabı Ekle
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <div
                key={account.account_id}
                className={cn(
                  "backdrop-blur-lg rounded-lg shadow-xl p-6 border transition-colors",
                  isDark 
                    ? "bg-white/10 border-white/20 hover:border-blue-500/70" 
                    : "bg-white/70 border-slate-200 hover:border-sky-500/70"
                )}
              >
                <div className="flex items-center mb-4">
                  <img
                    src={`/${account.account_type.toLowerCase()}-icon.png`}
                    alt={account.account_type}
                    className="h-8 w-8 mr-3"
                  />
                  <div>
                    <h3 className="text-lg font-medium">
                      {account.email}
                    </h3>
                    <p className={cn(
                      "text-sm",
                      isDark ? "text-gray-300" : "text-slate-500"
                    )}>
                      {new Date(account.created_at).toLocaleDateString('tr-TR')} tarihinde eklendi
                    </p>
                  </div>
                </div>
                {account.unread_count > 0 && (
                  <div className={cn(
                    "mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    isDark 
                      ? "bg-blue-900/50 text-blue-200 border-blue-500/50"
                      : "bg-sky-100 text-sky-800 border-sky-300"
                  )}>
                    {account.unread_count} okunmamış mail
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}