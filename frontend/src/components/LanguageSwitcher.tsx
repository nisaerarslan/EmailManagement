import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage('tr')}
        className={`px-3 py-1 rounded ${
          i18n.language === 'tr' ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}
      >
        TR
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 rounded ${
          i18n.language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher; 