import aiohttp
import json
import re
from services.base_service import BaseService
from typing import Optional, List
from config.openai_config import OPENAI_CONFIG

class TranslationService(BaseService):
    """Service for translating text using OpenAI API"""
    
    def __init__(self):
        super().__init__()
        self.api_key = OPENAI_CONFIG['API_KEY']
        self.model = OPENAI_CONFIG['MODEL']
        self.api_url = OPENAI_CONFIG['API_URL']
        # Yaklaşık maksimum token sayısı
        self.max_tokens = 4000
    
    def _split_text(self, text: str, max_chars: int = 8000) -> List[str]:
        """
        Uzun metni daha küçük parçalara böler
        
        Args:
            text: Bölünecek metin
            max_chars: Her parçanın maksimum karakter sayısı
            
        Returns:
            Metin parçalarından oluşan liste
        """
        if len(text) <= max_chars:
            return [text]
        
        # HTML metni için daha akıllı bölme yapalım
        if '<html' in text.lower():
            # HTML için ana bölümlere bölme
            chunks = []
            
            # Başlık ve gövde arasında bölme
            head_match = re.search(r'<head>.*?</head>', text, re.DOTALL | re.IGNORECASE)
            if head_match:
                head = head_match.group(0)
                # Başlık kısmını ekle
                if len(head) <= max_chars:
                    chunks.append(head)
                else:
                    chunks.extend(self._split_text(head, max_chars))
                
                # Gövde kısmını işle
                body_start = text.find('<body', head_match.end())
                if body_start != -1:
                    body_end = text.find('</body>', body_start)
                    if body_end != -1:
                        body = text[body_start:body_end + 7]
                        
                        # Body HTML'i daha küçük parçalara böl
                        # Etiket bloklarına göre bölme
                        body_chunks = re.findall(r'<div.*?>.*?</div>|<p.*?>.*?</p>|<section.*?>.*?</section>|<article.*?>.*?</article>|<table.*?>.*?</table>', body, re.DOTALL | re.IGNORECASE)
                        
                        if body_chunks:
                            current_chunk = ""
                            for segment in body_chunks:
                                if len(current_chunk) + len(segment) <= max_chars:
                                    current_chunk += segment
                                else:
                                    if current_chunk:
                                        chunks.append(current_chunk)
                                    if len(segment) <= max_chars:
                                        current_chunk = segment
                                    else:
                                        # Çok büyük bir bloksa daha küçük parçalara böl
                                        segment_chunks = self._split_text(segment, max_chars)
                                        chunks.extend(segment_chunks)
                                        current_chunk = ""
                            
                            if current_chunk:
                                chunks.append(current_chunk)
                        else:
                            # Etiket blokları bulunamadıysa, basit bölme yap
                            body_chunks = self._split_by_length(body, max_chars)
                            chunks.extend(body_chunks)
                    else:
                        # body kapanış etiketi bulunamadıysa
                        body = text[body_start:]
                        body_chunks = self._split_by_length(body, max_chars)
                        chunks.extend(body_chunks)
                else:
                    # HTML şablonu düzgün değilse, basit bölme yap
                    remaining = text[head_match.end():]
                    remaining_chunks = self._split_by_length(remaining, max_chars)
                    chunks.extend(remaining_chunks)
            else:
                # head etiketi bulunamadıysa, basit bölme yap
                chunks = self._split_by_length(text, max_chars)
            
            # Her parçanın geçerli HTML olduğundan emin ol
            valid_chunks = []
            for i, chunk in enumerate(chunks):
                if i == 0 and not chunk.strip().startswith('<'):
                    chunk = f"<div>{chunk}</div>"
                elif i > 0 and not chunk.strip().startswith('<'):
                    chunk = f"<div>{chunk}</div>"
                valid_chunks.append(chunk)
            
            return valid_chunks
        else:
            # HTML olmayan metin için paragraf bazlı bölme
            return self._split_by_length(text, max_chars)
    
    def _split_by_length(self, text: str, max_chars: int) -> List[str]:
        """Metni belirli uzunluktaki parçalara böl"""
        chunks = []
        remaining_text = text
        
        while len(remaining_text) > max_chars:
            # Belirli bir konumda kesme noktası bul
            split_point = max_chars
            
            # Paragraf, cümle veya kelime sınırında bölmeye çalış
            paragraph_split = remaining_text.rfind('\n\n', 0, split_point)
            if paragraph_split != -1 and paragraph_split > split_point // 2:
                split_point = paragraph_split + 2
            else:
                sentence_split = remaining_text.rfind('. ', 0, split_point)
                if sentence_split != -1 and sentence_split > split_point // 2:
                    split_point = sentence_split + 2
                else:
                    space_split = remaining_text.rfind(' ', split_point - 100, split_point)
                    if space_split != -1:
                        split_point = space_split + 1
            
            chunks.append(remaining_text[:split_point])
            remaining_text = remaining_text[split_point:]
        
        # Kalan kısmı ekle
        if remaining_text:
            chunks.append(remaining_text)
        
        return chunks
    
    async def _translate_chunk(self, text: str, target_language: str) -> str:
        """
        Bir metin parçasını çevir
        
        Args:
            text: Çevirilecek metin parçası
            target_language: Hedef dil (Turkish veya English)
            
        Returns:
            Çevrilen metin parçası
        """
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            # Çeviri için uygun prompt oluştur
            prompt = ""
            if text.strip().startswith('<'):
                prompt = f"Translate the following HTML content from any language to {target_language}. Preserve all HTML tags and attributes, only translate the actual text content between tags. Do not add any explanations."
            else:
                prompt = f"Translate the following text from any language to {target_language}. Do not add any explanations."
            
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a precise translator that preserves formatting."},
                    {"role": "user", "content": prompt},
                    {"role": "user", "content": text}
                ],
                "temperature": 0.3,
                "max_tokens": min(OPENAI_CONFIG.get('MAX_TOKENS', 1000), 2000)
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, headers=headers, json=payload) as response:
                    status_code = response.status
                    response_json = await response.json()
                    
                    if status_code == 200 and "choices" in response_json and len(response_json["choices"]) > 0:
                        translation = response_json["choices"][0]["message"]["content"]
                        
                        # Çevirilen metni temizle - açıklamaları kaldır
                        translation = re.sub(r'^(.*?)(translate|translation).*?:\s*', '', translation, flags=re.IGNORECASE)
                        translation = re.sub(r'^(.*?)(çeviri|çevir).*?:\s*', '', translation, flags=re.IGNORECASE)
                        
                        return translation
                    else:
                        error_message = response_json.get("error", {}).get("message", "Unknown error")
                        raise Exception(f"Translation API error: {error_message}")
        except Exception as e:
            raise e
            
    async def translate_text(self, text: str, target_language: str = "Turkish") -> str:
        """
        Translate text to the target language using OpenAI API
        
        Args:
            text: The text to translate
            target_language: The target language (default: Turkish)
            
        Returns:
            Translated text
        """
        if not text or len(text.strip()) == 0:
            return ""
        
        # Hedef dili doğrula - sadece desteklenen dillere izin ver
        supported_languages = ["Turkish", "English"]
        if target_language not in supported_languages:
            target_language = "Turkish"  # Varsayılan olarak Türkçe'ye dön
            
        try:
            # Çok uzun metinleri parçalara böl
            chunks = self._split_text(text)
            
            # Her parçayı ayrı ayrı çevir
            translated_chunks = []
            for chunk in chunks:
                try:
                    translated_chunk = await self._translate_chunk(chunk, target_language)
                    translated_chunks.append(translated_chunk)
                except Exception as chunk_error:
                    # Parça çevirisinde hata olursa orijinal parçayı kullan
                    translated_chunks.append(chunk)
            
            # Çevirileri birleştir
            return "".join(translated_chunks)
                
        except Exception as e:
            return f"Translation error: {str(e)}" 