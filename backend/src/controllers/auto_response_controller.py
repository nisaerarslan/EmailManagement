from sanic import Blueprint
from sanic.response import json
import traceback

from services.auto_response_service import AutoResponseService

# Create blueprint for auto-response API
auto_response_bp = Blueprint('auto-response', url_prefix='/api/auto-response')

# Create auto-response service
auto_response_service = AutoResponseService()

@auto_response_bp.post('/generate')
async def generate_responses_handler(request):
    """API Endpoint to generate automatic responses for an email."""
    try:
        # Get request data
        data = request.json
        
        # Validate required fields
        if 'content' not in data:
            return json({'error': 'Missing required field: content'}, status=400)
            
        # Get email content and optional parameters
        content = data.get('content', '')
        subject = data.get('subject', '')
        target_language = data.get('target_language', '')  # Opsiyonel hedef dil
        
        # Generate response suggestions - dil belirtilmezse otomatik tespit edilecek
        responses = await auto_response_service.generate_responses(content, subject, target_language)
        
        # Return response suggestions
        return json({'responses': responses})
    except Exception as e:
        trace = traceback.format_exc()
        error_message = f"Auto-response generation error: {str(e)}"
        return json({'error': error_message}, status=500) 