import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Star, Archive, Trash2, Reply, Download, Paperclip, CornerDownLeft, MessageSquare, ChevronsUpDown, Globe, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import DOMPurify from 'dompurify';
import translationService from '../services/translationService';
import autoResponseService from '../services/autoResponseService';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  data: string;
  inline?: boolean;
}

interface Email {
  id: string;
  subject: string;
  sender: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  content?: string;
  plainText?: string;
  hasHtml?: boolean;
  attachments?: Attachment[];
  recipientEmail?: string;
}

interface EmailDetailProps {
  email: {
    id: string;
    subject: string;
    sender: string;
    content?: string;
    date: string;
    starred: boolean;
    recipientEmail?: string;
    hasHtml?: boolean;
    attachments?: Array<{
      id: string;
      filename: string;
      mimeType: string;
      data: string;
      inline?: boolean;
    }>;
  };
  onClose: () => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onReply?: (emailId: string, content?: string) => void;
}

export default function EmailDetail({ email, onClose, onArchive, onDelete, onReply }: EmailDetailProps) {
  const { t, i18n } = useTranslation();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translatedSubject, setTranslatedSubject] = useState<string | null>(null);
  const [isGeneratingResponses, setIsGeneratingResponses] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [showResponseOptions, setShowResponseOptions] = useState(false);
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>(i18n.language === 'tr' ? 'English' : 'Turkish');
  const [sanitizedContent, setSanitizedContent] = useState('');

  useEffect(() => {
    if (email?.content) {
      const config = {
        ADD_TAGS: ['iframe', 'img', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'style', 'link', 'meta', 'div', 'span', 'a', 'p', 'br', 'strong', 'b', 'i', 'em'],
        ADD_ATTR: ['style', 'class', 'align', 'valign', 'cellpadding', 'cellspacing', 'border', 'width', 'height', 'src', 'href', 'alt', 'id', 'title', 'target', 'role'],
        FORBID_TAGS: ['script', 'object', 'embed', 'base', 'form', 'input', 'textarea', 'select', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout'],
        ALLOW_DATA_ATTR: false,
        WHOLE_DOCUMENT: true,
        RETURN_DOM: false,
        RETURN_DOM_FRAGMENT: false,
        FORCE_BODY: false,
        SANITIZE_DOM: true
      };

      // Stil etiketlerini koru
      DOMPurify.addHook('beforeSanitizeElements', function(node) {
        if (node.nodeName === 'STYLE') {
          return node;
        }
      });

      // HTML içeriğini temizle
      let clean = DOMPurify.sanitize(email.content, config);
      
      // Gereksiz boşlukları ve çerçeveleri kaldır
      clean = clean.replace(/border="[^"]*"/g, '')
                   .replace(/border-width:[^;]*/g, 'border-width:0')
                   .replace(/border-style:[^;]*/g, 'border-style:none')
                   .replace(/border-color:[^;]*/g, '')
                   .replace(/box-shadow:[^;]*/g, '');
      
      setSanitizedContent(clean);

      return () => {
        DOMPurify.removeHook('beforeSanitizeElements');
      };
    }
  }, [email?.content]);

  const renderAttachments = () => {
    if (!email.attachments?.length) return null;

    return (
      <div className="p-3 sm:p-4">
        <h3 className="text-sm font-medium text-gray-100 mb-3">{t('emailDetail.attachments')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {email.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center p-3 border rounded-lg border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {attachment.filename}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {attachment.mimeType}
                </p>
              </div>
              {attachment.data && (
                <a
                  href={`data:${attachment.mimeType};base64,${attachment.data}`}
                  download={attachment.filename}
                  className="ml-4 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('emailDetail.download')}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleTranslate = async () => {
    if (!email.content) return;
    
    try {
      setIsTranslating(true);
      setTranslatedContent(null); // Çeviri işlemi başlarken önceki çeviriyi temizle
      setTranslatedSubject(null);
      
      // Use plain text content if available, otherwise use the HTML content
      const textToTranslate = email.content;
      
      // Uzun e-postalar için kullanıcıya bilgi mesajı göster
      if (textToTranslate.length > 8000) {
        toast(t('notifications.longtranslation') || 'This is a large email and might take longer to translate...', {
          icon: '🕒',
        });
      }
      
      // 1. İçeriği çevir
      const translated = await translationService.translateText(textToTranslate, targetLanguage);
      
      // Başarılı bir şekilde çeviri yapıldıysa state'i güncelle
      if (translated && translated.length > 0) {
        setTranslatedContent(translated);
        
        // 2. Başlığı da çevir
        if (email.subject) {
          const translatedSubject = await translationService.translateText(email.subject, targetLanguage);
          if (translatedSubject && translatedSubject.length > 0) {
            setTranslatedSubject(translatedSubject);
          }
        }
        
        // Çeviri tamamlandı mesajı göster
        toast.success(t('notifications.translationComplete') || 'Translation completed');
      } else {
        // Çeviri yapılamadıysa hata göster
        toast.error(t('notifications.translationFailed') || 'Translation failed');
      }
    } catch (error) {
      console.error('Translation failed:', error);
      // Show an error toast message
      toast.error(t('notifications.error') + ': ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsTranslating(false);
      setShowLanguageOptions(false);
    }
  };

  const handleGenerateResponses = async () => {
    if (!email.content) return;
    
    try {
      setIsGeneratingResponses(true);
      setSuggestedResponses([]);
      setShowResponseOptions(false);
      
      // Bildirimde yanıt oluşturma başladığı bilgisini göster
      const toastId = toast.loading(t('notifications.generatingResponsesWithLangDetection') || 'Generating responses with automatic language detection...');
      
      // Generate response suggestions - dil otomatik tespit edilecek
      const responses = await autoResponseService.generateResponses(
        email.content, 
        email.subject
      );
      
      if (responses && responses.length > 0) {
        setSuggestedResponses(responses);
        setShowResponseOptions(true);
        
        // Başarılı bildirim
        toast.success(t('notifications.responsesGenerated') || 'Response options generated');
      } else {
        toast.error(t('notifications.noResponsesGenerated') || 'No response suggestions could be generated.');
      }
      
      // Yükleme bildirimini kapat
      toast.dismiss(toastId);
    } catch (error) {
      console.error('Response generation failed:', error);
      // Show an error toast message
      toast.error(t('notifications.error') + ': ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingResponses(false);
    }
  };
  
  const handleReplyWithResponse = (responseText: string) => {
    if (onReply) {
      // Pass the email ID and the auto-generated response text to the parent component
      onReply(email.id, responseText);
      setShowResponseOptions(false);
      onClose();
    } else {
      toast.error(t('notifications.replyFunctionNotAvailable') || 'Reply function is not available.');
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(email.id);
      onClose();
    } else {
      toast.error(t('notifications.replyFunctionNotAvailable') || 'Reply function is not available.');
    }
  };
  
  const renderEmailContent = () => {
    return (
      <div className="email-content-container bg-white dark:bg-gray-800 rounded-lg">
        {/* Başlık ve gönderen bilgisi */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {translatedSubject || email.subject}
          </h2>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{email.sender}</span>
            <span>{new Date(email.date).toLocaleString()}</span>
          </div>
        </div>

        {/* Email içeriği */}
            <div
          className="email-content p-4 overflow-hidden"
              dangerouslySetInnerHTML={{
            __html: translatedContent || sanitizedContent
          }}
        />

        {/* Ekler */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {renderAttachments()}
          </div>
        )}
      </div>
    );
  };

  const renderLanguageSelector = () => {
    if (!showLanguageOptions) return null;
    
    return (
      <div className="absolute z-50 mt-1 w-48 rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="py-1">
          <button
            className={`flex w-full items-center px-4 py-2 text-sm ${targetLanguage === 'Turkish' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => {
              setTargetLanguage('Turkish');
              setShowLanguageOptions(false);
            }}
          >
            {t('languages.turkish')}
          </button>
          <button
            className={`flex w-full items-center px-4 py-2 text-sm ${targetLanguage === 'English' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            onClick={() => {
              setTargetLanguage('English');
              setShowLanguageOptions(false);
            }}
          >
            {t('languages.english')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button at top-right for better accessibility, especially on mobile */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 z-10 bg-white dark:bg-gray-800 rounded-full"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex flex-col h-full">
          <div className="p-4 sm:p-6 border-b dark:border-gray-700">
            <div className="flex flex-col space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 pr-6">
                  {isTranslating ? (
                    <div className="inline-flex items-center">
                      {email.subject}
                      <span className="ml-2 text-gray-500 dark:text-gray-400 italic">
                        ({t('emailDetail.translating')})
                      </span>
                    </div>
                  ) : translatedContent ? (
                    <>
                      {email.subject}
                      {translatedSubject && translatedSubject !== email.subject && (
                        <span className="ml-2 text-gray-600 dark:text-gray-300 font-normal">
                          ({translatedSubject})
                        </span>
                      )}
                    </>
                  ) : email.subject}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">{email.sender}</span>
                  <span>•</span>
                  <span>{new Date(email.date).toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US')}</span>
                  {email.recipientEmail && (
                    <>
                      <span>•</span>
                      <span>{t('emailDetail.recipient')}: {email.recipientEmail}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReply}
                  className="flex items-center gap-1"
                >
                  <Reply className="h-4 w-4" />
                  {t('emailDetail.reply')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(email.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('emailDetail.delete')}
                </Button>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLanguageOptions(!showLanguageOptions)}
                    className="flex items-center gap-1"
                    title={t('languages.selectLanguage')}
                  >
                    <Globe className="h-4 w-4" />
                    {targetLanguage === 'Turkish' ? t('languages.turkish') : t('languages.english')}
                    <ChevronsUpDown className="h-3 w-3 ml-1" />
                  </Button>
                  {renderLanguageSelector()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="flex items-center gap-1"
                  title={t('emailDetail.translate')}
                >
                  {isTranslating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CornerDownLeft className="h-4 w-4" />
                  )}
                  {t('emailDetail.translate')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateResponses}
                  disabled={isGeneratingResponses}
                  className="flex items-center gap-1"
                  title={t('emailDetail.generateResponses')}
                >
                  <MessageSquare className="h-4 w-4" />
                  {t('emailDetail.autoResponse')}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {isGeneratingResponses ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-blue-500 font-medium">{t('emailDetail.generatingResponses')}</span>
                </div>
              ) : showResponseOptions ? (
                <>
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden mb-4">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-3 border-b border-blue-200 dark:border-blue-800 flex justify-between items-center">
                      <h3 className="font-medium text-blue-700 dark:text-blue-300">{t('emailDetail.suggestedResponses')}</h3>
                      <button 
                        onClick={() => setShowResponseOptions(false)}
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      {suggestedResponses.map((response, index) => (
                        <div 
                          key={index} 
                          className="p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          onClick={() => handleReplyWithResponse(response)}
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300">{response}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setShowResponseOptions(false)} 
                      className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium py-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      {t('emailDetail.hideResponses')}
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    {renderEmailContent()}
                  </div>
                </>
              ) : isTranslating ? (
                <div className="flex justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-blue-500 font-medium">{t('emailDetail.translating')}</span>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  {translatedContent ? (
                    <>
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none overflow-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(translatedContent) }} 
                      />
                      <div className="mt-4 text-center">
                        <button 
                          onClick={() => {
                            setTranslatedContent(null);
                            setTranslatedSubject(null);
                          }} 
                          className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-3 py-1 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          {t('emailDetail.showOriginal')}
                        </button>
                      </div>
                    </>
                  ) : (
                    renderEmailContent()
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
