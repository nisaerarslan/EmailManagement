from sanic import Blueprint
from sanic.response import json, redirect
from services.outlook_service import OutlookService
import traceback
from config.oauth_config import FRONTEND_URL
import jwt
from urllib.parse import quote

outlook_bp = Blueprint('outlook', url_prefix='/api/mail-accounts/outlook')
outlook_service = OutlookService()

@outlook_bp.get('/auth')
async def outlook_auth(request):
    try:
        user_id = request.ctx.user_id
        auth_url = outlook_service.get_auth_url(user_id)
        return json({'auth_url': auth_url})
    except Exception as e:
        print(f"Unexpected error in outlook auth: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@outlook_bp.get('/callback')
async def outlook_callback(request):
    try:
        print("Outlook callback received with args:", request.args)
        code = request.args.get('code')
        state = request.args.get('state')
        
        if not code:
            print("No authorization code received")
            return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=no_code")
            
        if not state:
            print("No state token received")
            return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=invalid_state")

        try:
            print("Decoding state token...")
            state_data = jwt.decode(state, 'your-secret-key', algorithms=['HS256'])
            user_id = state_data.get('user_id')
            print(f"Decoded user_id from state: {user_id}")
            
            if not user_id:
                print("No user_id in state token")
                return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=invalid_state")

            print("Handling Outlook callback...")
            try:
                result = await outlook_service.handle_callback(code, user_id)
                print("Outlook callback handled successfully:", result)
                return redirect(f"{FRONTEND_URL}/dashboard?success=true&email={quote(result['email'])}")
            except ValueError as e:
                print(f"Account already exists: {str(e)}")
                return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=account_exists&message={quote(str(e))}")
        except jwt.InvalidTokenError as e:
            print(f"Invalid state token: {str(e)}")
            return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=invalid_state")
        except Exception as e:
            print(f"Error handling Outlook callback: {str(e)}")
            print(traceback.format_exc())
            return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=callback_failed")
            
    except Exception as e:
        print(f"Unexpected error in outlook callback: {str(e)}")
        print(traceback.format_exc())
        return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=server_error")

@outlook_bp.get('/inbox/<account_id:int>')
async def get_outlook_inbox(request, account_id):
    try:
        user_id = request.ctx.user_id
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        emails = await outlook_service.get_inbox(account_id, user_id, page, per_page)
        return json(emails)
    except Exception as e:
        print(f"Error getting Outlook inbox: {str(e)}")
        print(traceback.format_exc())
        return json({'error': str(e)}, status=500)

@outlook_bp.get('/email/<account_id:int>/<message_id>')
async def get_outlook_email(request, account_id, message_id):
    try:
        user_id = request.ctx.user_id
        email = await outlook_service.get_email(account_id, user_id, message_id)
        return json(email)
    except Exception as e:
        print(f"Error getting Outlook email: {str(e)}")
        print(traceback.format_exc())
        return json({'error': str(e)}, status=500)

@outlook_bp.post('/email/<account_id:int>/<message_id>/reply')
async def reply_outlook_email(request, account_id, message_id):
    try:
        user_id = request.ctx.user_id
        content = request.json.get('content')
        if not content:
            return json({'error': 'Content is required'}, status=400)
            
        result = await outlook_service.reply_email(account_id, user_id, message_id, content)
        return json(result)
    except Exception as e:
        print(f"Error replying to Outlook email: {str(e)}")
        print(traceback.format_exc())
        return json({'error': str(e)}, status=500)