import api from './api';

interface TranslationResponse {
  text: string;
  error?: string;
}

class TranslationService {
  /**
   * Translate text to the specified language
   * @param text Text to translate
   * @param targetLanguage Target language (default: Turkish)
   * @returns Translated text
   */
  async translateText(text: string, targetLanguage: string = 'Turkish'): Promise<string> {
    try {
      const response = await api.post<TranslationResponse>('/translation/translate', {
        text,
        target_language: targetLanguage
      });
      
      if (!response.data) {
        throw new Error('No data received from translation API');
      }
      
      // Check if the response has an error message
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Return the translated text
      return response.data.text;
    } catch (error) {
      console.error('Translation service error:', error);
      throw error;
    }
  }
}

export default new TranslationService(); 