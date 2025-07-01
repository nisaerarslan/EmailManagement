import { useState } from 'react';
import { Moon, Sun, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface Language {
  code: string;
  name: string;
  flag: string;
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'tr');

  const languages: Language[] = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' }


  ];

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className={cn(
          "backdrop-blur-lg rounded-xl shadow-sm border p-8",
          isDark 
            ? "bg-white/10 border-white/20 text-white" 
            : "bg-white/70 border-black/10 text-gray-900"
        )}>
          <h1 className="text-2xl font-bold mb-8">{t('settings')}</h1>

          {/* Tema Ayarı */}
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4">{t('common.toggleTheme')}</h2>
            <div className={cn(
              "flex items-center justify-between p-4 backdrop-blur-lg rounded-lg",
              isDark ? "bg-gray-900/30" : "bg-gray-100/50"
            )}>
              <div className="flex items-center space-x-3">
                {isDark ? (
                  <Moon className="w-5 h-5 text-current" />
                ) : (
                  <Sun className="w-5 h-5 text-current" />
                )}
                <span className="text-sm font-medium">
                  {isDark ? t('common.darkTheme') : t('common.lightTheme')}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ backgroundColor: isDark ? '#3b82f6' : '#38bdf8' }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isDark ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Dil Ayarı */}
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-4">{t('language')}</h2>
            <div className="space-y-2">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-lg transition-colors",
                    selectedLanguage === language.code
                      ? isDark ? "bg-blue-900/50 text-blue-300" : "bg-sky-100 text-sky-800"
                      : isDark 
                        ? "bg-gray-900/30 text-gray-300 hover:bg-gray-800/50" 
                        : "bg-gray-100/50 text-gray-700 hover:bg-gray-200/50"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{language.flag}</span>
                    <span className="font-medium">{language.name}</span>
                  </div>
                  {selectedLanguage === language.code && (
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      isDark ? "bg-blue-400" : "bg-sky-500"
                    )} />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sistem Mail Ayarları */}
          <div>
            <h2 className="text-lg font-medium mb-4">{t('systemMail.title')}</h2>
            <div className={cn(
              "backdrop-blur-lg rounded-lg p-4",
              isDark ? "bg-gray-900/30" : "bg-gray-100/50"
            )}>
              <div className="flex flex-col">
                <div className="flex items-center mb-4">
                  <Mail className="w-5 h-5 mr-2" />
                  <p className="text-sm">{t('systemMail.description')}</p>
                </div>
                <Link
                  to="/systemmail"
                  className={cn(
                    "py-2 px-4 rounded text-center transition-colors",
                    isDark 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                >
                  {t('systemMail.configure')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}