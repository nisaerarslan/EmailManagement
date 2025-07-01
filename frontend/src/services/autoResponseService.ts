import api from './api';

interface AutoResponseRequest {
  content: string;
  subject?: string;
  target_language?: string;
}

interface AutoResponseResponse {
  responses: string[];
  error?: string;
}

class AutoResponseService {
  /**
   * Generate automatic response suggestions for an email
   * @param content Email content to generate responses for
   * @param subject Email subject (optional)
   * @param targetLanguage Target language for responses (optional, will be auto-detected if not provided)
   * @returns Array of suggested responses
   */
  async generateResponses(content: string, subject?: string, targetLanguage?: string): Promise<string[]> {
    try {
      const response = await api.post<AutoResponseResponse>('/auto-response/generate', {
        content,
        subject,
        target_language: targetLanguage
      });
      
      if (!response.data) {
        throw new Error('No data received from auto-response API');
      }
      
      // Check if the response has an error message
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      // Return the response suggestions
      return response.data.responses;
    } catch (error) {
      console.error('Auto-response service error:', error);
      throw error;
    }
  }
}

export default new AutoResponseService(); 