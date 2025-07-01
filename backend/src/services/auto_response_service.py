import aiohttp
import json
from services.base_service import BaseService
from config.openai_config import OPENAI_CONFIG
from typing import List, Dict

class AutoResponseService(BaseService):
    """Service for generating automatic responses to emails using OpenAI API"""
    
    def __init__(self):
        super().__init__()
        self.api_key = OPENAI_CONFIG['API_KEY']
        self.model = OPENAI_CONFIG['MODEL']
        self.api_url = OPENAI_CONFIG['API_URL']
    
    async def detect_language(self, text: str) -> str:
        """
        E-posta içeriğinin dilini tespit eder
        
        Args:
            text: Dili tespit edilecek metin
            
        Returns:
            Tespit edilen dil (English, Turkish, vb.)
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # Tespit için yeterli metni al (ilk 500 karakter yeterlidir)
            sample_text = text[:500]
            
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a language detector. Your task is to detect the main language of the text and respond with just the language name in English, such as 'English', 'Turkish', etc."},
                    {"role": "user", "content": f"Detect the language of this text. Respond with only the language name in English: {sample_text}"}
                ],
                "temperature": 0.3,
                "max_tokens": 20
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, json=payload) as response:
                    status_code = response.status
                    response_json = await response.json()
                    
                    if status_code == 200 and "choices" in response_json and len(response_json["choices"]) > 0:
                        detected_language = response_json["choices"][0]["message"]["content"].strip()
                        # Sadece dil adı kalacak şekilde temizle
                        detected_language = detected_language.replace(".", "").replace("The language is", "").strip()
                        
                        # En çok desteklenen dilleri doğru formatta döndür
                        if "turkish" in detected_language.lower():
                            return "Turkish"
                        elif "english" in detected_language.lower():
                            return "English"
                        else:
                            # Desteklenmeyen diller için varsayılan olarak İngilizce kullan
                            return "English"
                    else:
                        # API hatası durumunda varsayılan olarak İngilizce kullan
                        return "English"
        except Exception as e:
            # Herhangi bir hata durumunda varsayılan olarak İngilizce kullan
            return "English"
    
    async def generate_responses(self, email_content: str, email_subject: str = "", target_language: str = "") -> List[str]:
        """
        Generate automatic response suggestions for an email
        
        Args:
            email_content: The content of the email to respond to
            email_subject: The subject of the email (optional)
            target_language: Target language for responses (optional)
            
        Returns:
            List of suggested responses
        """
        try:
            # Hedef dil belirtilmemişse, e-posta içeriğinden dili tespit et
            if not target_language:
                target_language = await self.detect_language(email_content)
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # Limit content length to avoid token issues
            max_content_length = 8000
            if len(email_content) > max_content_length:
                email_content = email_content[:max_content_length] + "..."
            
            # Dile özgü yanıt oluşturma yönergesi
            system_message = f"You are a helpful assistant generating brief, professional email responses in {target_language}. Provide exactly 2 different options, each 1-2 sentences long. Format the responses as plain text options with no numbering, explanation, or extra text."
            
            # Dile özgü prompt
            if target_language == "Turkish":
                prompt = "Bu e-postaya 2 kısa, kibar yanıt seçeneği oluştur."
                if email_subject:
                    prompt += f" E-posta konusu: '{email_subject}'."
                prompt += " Her yanıt 1-2 cümle olmalı ve profesyonel bir tonda olmalıdır."
            else:
                # Varsayılan olarak İngilizce kullan
                prompt = "Generate 2 brief, polite response options for this email."
                if email_subject:
                    prompt += f" The email subject is: '{email_subject}'."
                prompt += " Each response should be 1-2 sentences and professional in tone."
            
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt},
                    {"role": "user", "content": email_content}
                ],
                "temperature": 0.7,
                "max_tokens": 300
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, json=payload) as response:
                    status_code = response.status
                    response_json = await response.json()
                    
                    if status_code == 200 and "choices" in response_json and len(response_json["choices"]) > 0:
                        generated_text = response_json["choices"][0]["message"]["content"]
                        
                        # Parse the responses - typically, the model will return numbered or separated responses
                        # First, try to split by common separators
                        responses = []
                        
                        # Try to extract the responses by common patterns
                        if "1." in generated_text and "2." in generated_text:
                            # Split by numbered format
                            parts = generated_text.split("1.")
                            if len(parts) > 1:
                                first_part = parts[1].split("2.")
                                if len(first_part) > 1:
                                    responses.append(first_part[0].strip())
                                    responses.append(first_part[1].strip())
                        elif "\n\n" in generated_text:
                            # Split by double newline
                            responses = [resp.strip() for resp in generated_text.split("\n\n") if resp.strip()]
                        elif "\n" in generated_text:
                            # Split by single newline
                            responses = [resp.strip() for resp in generated_text.split("\n") if resp.strip()]
                        else:
                            # If no clear separator, return the whole text as one response
                            responses = [generated_text.strip()]
                        
                        # Limit to at most 2 responses and clean up
                        responses = responses[:2]
                        
                        # Clean up responses: remove any numbering or prefixes
                        cleaned_responses = []
                        for resp in responses:
                            # Remove numbering
                            cleaned = resp.lstrip("0123456789-.*) ")
                            # Remove "Response 1:" type prefixes
                            cleaned = cleaned.replace("Response 1:", "").replace("Response 2:", "")
                            cleaned = cleaned.replace("Option 1:", "").replace("Option 2:", "")
                            cleaned = cleaned.replace("Yanıt 1:", "").replace("Yanıt 2:", "")
                            cleaned = cleaned.replace("Seçenek 1:", "").replace("Seçenek 2:", "")
                            cleaned_responses.append(cleaned.strip())
                        
                        return cleaned_responses
                    else:
                        error_message = response_json.get("error", {}).get("message", "Unknown error")
                        raise Exception(f"Response generation API error: {error_message}")
        except Exception as e:
            raise e 