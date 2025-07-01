import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';

interface EmailPassword {
  entry_id: number;
  title: string;
  password: string;
  descriptions?: string;
}

interface ApiResponse {
  entry_id: number;
  title: string;
  descriptions?: string;
}

export default function EmailPasswords() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [emailPasswords, setEmailPasswords] = useState<EmailPassword[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDescriptions, setNewDescriptions] = useState('');
  const [loading, setLoading] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<number[]>([]);
  const [error, setError] = useState<string>('');

  // Şifreleri yükle
  useEffect(() => {
    loadPasswords();
  }, []);

  const loadPasswords = async () => {
    try {
      setLoading(true);
      const response = await api.get<EmailPassword[]>('/api/password-manager/passwords');
      console.log('API Response:', response.data);

      if (Array.isArray(response.data)) {
        setEmailPasswords(response.data.map(entry => ({ ...entry, title: entry.title || '' })));
      } else {
        console.error('API response is not an array:', response.data);
        setEmailPasswords([]);
        setError(t('passwordManager.error.fetch'));
        toast.error(t('passwordManager.error.fetch'));
      }
      setError('');
    } catch (err) {
      console.error('Error loading passwords:', err);
      setError(t('passwordManager.error.fetch'));
      setEmailPasswords([]);
      toast.error(t('passwordManager.error.fetch'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;

    try {
      setLoading(true);
      const response = await api.post<ApiResponse>('/api/password-manager/passwords', {
        title: newTitle,
        password: newPassword,
        descriptions: newDescriptions
      });

      const newEntry: EmailPassword = {
        entry_id: response.data.entry_id,
        title: response.data.title || newTitle,
        password: newPassword,
        descriptions: response.data.descriptions
      };

      setEmailPasswords(prev => [...prev, newEntry]);
      setNewTitle('');
      setNewPassword('');
      setNewDescriptions('');
      setError('');
      toast.success(t('passwordManager.success.created'));
    } catch (err) {
      console.error('Error adding password:', err);
      setError(t('passwordManager.error.create'));
      toast.error(t('passwordManager.error.create'));
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (entry_id: number) => {
    try {
      setLoading(true);
      await api.delete(`/api/password-manager/passwords/${entry_id}`);
      setEmailPasswords(prev => prev.filter(entry => entry.entry_id !== entry_id));
      setError('');
      toast.success(t('passwordManager.success.deleted'));
    } catch (err) {
      console.error('Error deleting password:', err);
      setError(t('passwordManager.error.delete'));
      toast.error(t('passwordManager.error.delete'));
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords(prev =>
      prev.includes(id)
        ? prev.filter(passwordId => passwordId !== id)
        : [...prev, id]
    );
  };

  if (loading && emailPasswords.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className={cn("h-8 w-8 animate-spin", isDark ? "text-blue-400" : "text-sky-500")} />
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className={cn(
          "rounded-xl shadow-sm border p-8 backdrop-blur-lg",
          isDark
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        )}>
          <h1 className={cn(
            "text-2xl font-bold mb-8",
            isDark ? "text-white" : "text-gray-900"
          )}>{t('passwordManager.title')}</h1>

          {error && (
            <div className={cn(
              "mb-4 p-4 text-sm rounded-lg",
              isDark
                ? "bg-red-900/30 text-red-400 border border-red-800/50"
                : "bg-red-100 text-red-700"
            )}>
              {error}
            </div>
          )}

          {/* Yeni Hesap Ekleme Formu */}
          <form onSubmit={handleSubmit} className="mb-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className={cn(
                  "block text-sm font-medium mb-1",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  {t('passwordManager.titleField')}
                </label>
                <input
                  type="text"
                  id="title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={cn(
                    "block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500",
                    isDark
                      ? "border-gray-600 bg-gray-700/50 text-white focus:border-blue-500"
                      : "border-gray-300 bg-white/80 text-gray-900 focus:border-sky-500"
                  )}
                  placeholder={t('passwordManager.titlePlaceholder')}
                />
              </div>
              <div>
                <label htmlFor="password" className={cn(
                  "block text-sm font-medium mb-1",
                  isDark ? "text-gray-300" : "text-gray-700"
                )}>
                  {t('passwordManager.password')}
                </label>
                <input
                  type="password"
                  id="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cn(
                    "block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500",
                    isDark
                      ? "border-gray-600 bg-gray-700/50 text-white focus:border-blue-500"
                      : "border-gray-300 bg-white/80 text-gray-900 focus:border-sky-500"
                  )}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="descriptions" className={cn(
                "block text-sm font-medium mb-1",
                isDark ? "text-gray-300" : "text-gray-700"
              )}>
                {t('passwordManager.descriptions')}
              </label>
              <textarea
                id="descriptions"
                value={newDescriptions}
                onChange={(e) => setNewDescriptions(e.target.value)}
                className={cn(
                  "block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[80px]",
                  isDark
                    ? "border-gray-600 bg-gray-700/50 text-white focus:border-blue-500"
                    : "border-gray-300 bg-white/80 text-gray-900 focus:border-sky-500"
                )}
                placeholder={t('passwordManager.notes')}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || !newPassword}
                className={cn(
                  "inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
                  isDark
                    ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                    : "bg-sky-500 hover:bg-sky-600 focus:ring-sky-400"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('passwordManager.addPassword')}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Hesaplar Tablosu */}
          <div className="overflow-x-auto">
            <table className={cn(
              "min-w-full divide-y",
              isDark ? "divide-gray-700" : "divide-gray-200"
            )}>
              <thead className={cn(
                isDark ? "bg-gray-800/50" : "bg-gray-50/80"
              )}>
                <tr>
                  <th className={cn(
                    "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-gray-300" : "text-gray-500"
                  )}>
                    {t('passwordManager.titleField')}
                  </th>
                  <th className={cn(
                    "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-gray-300" : "text-gray-500"
                  )}>
                    {t('passwordManager.password')}
                  </th>
                  <th className={cn(
                    "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-gray-300" : "text-gray-500"
                  )}>
                    {t('passwordManager.descriptions')}
                  </th>
                  <th className={cn(
                    "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                    isDark ? "text-gray-300" : "text-gray-500"
                  )}>
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className={cn(
                "divide-y backdrop-blur-lg",
                isDark ? "divide-gray-700" : "divide-gray-200"
              )}>
                {Array.isArray(emailPasswords) && emailPasswords.map((entry) => (
                  <tr
                    key={entry.entry_id}
                    className={cn(
                      "transition-colors",
                      isDark
                        ? "hover:bg-gray-700/50"
                        : "hover:bg-gray-50/80"
                    )}
                  >
                    <td className={cn(
                      "px-6 py-4 whitespace-nowrap text-sm font-medium",
                      isDark ? "text-white" : "text-gray-900"
                    )}>
                      {entry.title}
                    </td>
                    <td className={cn(
                      "px-6 py-4 whitespace-nowrap text-sm",
                      isDark ? "text-gray-300" : "text-gray-500"
                    )}>
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono ${!visiblePasswords.includes(entry.entry_id) ? 'blur-sm hover:blur-none transition-all duration-200' : ''}`}>
                          {entry.password}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(entry.entry_id)}
                          className={cn(
                            "transition-colors",
                            isDark
                              ? "text-gray-400 hover:text-gray-200"
                              : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          {visiblePasswords.includes(entry.entry_id) ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm max-w-[200px] break-words",
                      isDark ? "text-gray-300" : "text-gray-500"
                    )}>
                      {entry.descriptions || "-"}
                    </td>
                    <td className={cn(
                      "px-6 py-4 whitespace-nowrap text-sm",
                      isDark ? "text-gray-300" : "text-gray-500"
                    )}>
                      <button
                        onClick={() => deleteEntry(entry.entry_id)}
                        className={cn(
                          "transition-colors",
                          isDark
                            ? "text-red-500 hover:text-red-400"
                            : "text-red-500 hover:text-red-700"
                        )}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!Array.isArray(emailPasswords) || emailPasswords.length === 0) && (
              <div className={cn(
                "text-center py-8 rounded-lg border backdrop-blur-sm mt-4",
                isDark
                  ? "bg-gray-800/50 border-gray-700 text-gray-400"
                  : "bg-white/50 border-gray-200 text-gray-500"
              )}>
                {t('passwordManager.noEntries')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}