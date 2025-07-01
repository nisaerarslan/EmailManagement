from sanic import Blueprint
from sanic.response import json
import traceback

from services.translation_service import TranslationService

# Create blueprint for translation API
translation_bp = Blueprint('translation', url_prefix='/api/translation')

# Create translation service
translation_service = TranslationService()

@translation_bp.post('/translate')
async def translate_text_handler(request):
    """API Endpoint to translate text."""
    try:
        # Get request data
        data = request.json
        
        # Validate required fields
        if 'text' not in data:
            return json({'error': 'Missing required field: text'}, status=400)
            
        # Get text and target language
        text = data.get('text', '')
        target_language = data.get('target_language', 'Turkish')
        
        # Translate text
        translated_text = await translation_service.translate_text(text, target_language)
        
        # Return translated text
        return json({'text': translated_text})
    except Exception as e:
        trace = traceback.format_exc()
        error_message = f"Translation error: {str(e)}"
        return json({'error': error_message}, status=500) 