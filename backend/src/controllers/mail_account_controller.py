from sanic import Blueprint
from sanic.response import json, redirect
from services.account_management_service import AccountManagementService
from services.authentication_service import AuthenticationService
from services.message_service import MessageService
import traceback
from config.oauth_config import FRONTEND_URL
import os
import jwt
from datetime import datetime
from urllib.parse import quote
from models.mail_account import MailAccount

mail_account_bp = Blueprint('mail_account', url_prefix='/api/mail-accounts')

# Initialize services with dependency injection
authentication_service = AuthenticationService()
account_management_service = AccountManagementService(
    authentication_service=authentication_service
)
message_service = MessageService(
    authentication_service=authentication_service
)

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

def serialize_account(account):
    # No need for specialized serialization function anymore, just use to_dict
    # Keeping interface compatibility for now
    if isinstance(account, dict):
        return {
            'account_id': account['account_id'],
            'email': account['email'],
            'account_type': account['account_type'],
            'created_at': serialize_datetime(account['created_at']),
            'token_expiry': serialize_datetime(account['token_expiry']) if account.get('token_expiry') else None,
            'unread_count': account.get('unread_count', 0),
            'last_checked': serialize_datetime(account['last_checked']) if account.get('last_checked') else None
        }
    elif isinstance(account, MailAccount):
        return account.to_dict()
    else:
        return {}

@mail_account_bp.delete('/<account_id:int>')
async def delete_account(request, account_id: int):
    try:
        user_id = request.ctx.user_id
        print(f"Deleting account {account_id} for user {user_id}")
        success = await account_management_service.delete_account(user_id, account_id)
        
        if success:
            return json({'success': True, 'message': 'Hesap başarıyla silindi'})
        else:
            return json({'error': 'Hesap bulunamadı'}, status=404)
    except Exception as e:
        print(f"Error deleting account: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@mail_account_bp.get('/gmail/auth')
async def gmail_auth(request):
    try:
        user_id = request.ctx.user_id
        auth_url = authentication_service.get_gmail_auth_url(user_id)
        return json({'auth_url': auth_url})
    except Exception as e:
        print(f"Unexpected error in gmail auth: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@mail_account_bp.get('/gmail/callback')
async def gmail_callback(request):
    try:
        print("Gmail callback received with args:", request.args)
        code = request.args.get('code')
        state = request.args.get('state')
        
        # Değişiklik: Eğer "system_mail=true" parametresi varsa, sistem mail işleme için SystemMail controller'a yönlendir
        if request.args.get('system_mail') == 'true':
            print("SystemMail callback detected, redirecting...")
            # SystemMail controller'a yönlendir ve kodu koruyarak ilet
            system_mail_url = f"/api/systemmail/callback?code={code}"
            return redirect(system_mail_url)
        
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

            print("Handling Gmail callback...")
            try:
                result = await account_management_service.handle_gmail_callback(code, user_id)
                print("Gmail callback handled successfully:", result)
                return redirect(f"{FRONTEND_URL}/dashboard?success=true&email={quote(result['email'])}")
            except ValueError as e:
                print(f"Account already exists: {str(e)}")
                return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=account_exists&message={quote(str(e))}")
        except jwt.InvalidTokenError as e:
            print(f"Invalid state token: {str(e)}")
            return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=invalid_state")
        except Exception as e:
            print(f"Error handling Gmail callback: {str(e)}")
            print(traceback.format_exc())
            return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=callback_failed")
            
    except Exception as e:
        print(f"Unexpected error in gmail callback: {str(e)}")
        print(traceback.format_exc())
        return redirect(f"{FRONTEND_URL}/dashboard/add-account?error=server_error")

@mail_account_bp.get('/user')
async def get_user_accounts(request):
    try:
        user_id = request.ctx.user_id
        print(f"Fetching accounts for user_id: {user_id}")
        accounts = await account_management_service.get_user_accounts(user_id)
        print(f"Found {len(accounts)} accounts")
        
        # Accounts should already be dicts now as service returns them serialized
        return json({'accounts': accounts})
    except Exception as e:
        print(f"Unexpected error in get user accounts: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@mail_account_bp.get('/inbox')
async def get_inbox(request):
    try:
        user_id = request.ctx.user_id
        account_id = request.args.get('account_id')
        page_token = request.args.get('pageToken')
        page_size = int(request.args.get('pageSize', '50'))
        
        print(f"Inbox request - user_id: {user_id}, account_id: {account_id}, page_token: {page_token}, page_size: {page_size}")
        
        result = await message_service.get_inbox_messages(
            user_id=user_id,
            account_id=account_id,
            page_token=page_token,
            page_size=page_size
        )
        
        print(f"Inbox response - messages count: {len(result.get('messages', []))}, total: {result.get('totalCount', 0)}, current_page: {result.get('currentPage', 1)}, next_token: {result.get('nextPageToken')}")
        
        # Eğer tüm hesaplar seçiliyse ek bilgi ver
        if not account_id:
            print(f"All accounts mode - Calculated total pages: {(result.get('totalCount', 0) + page_size - 1) // page_size}")
        
        return json(result)
    except Exception as e:
        print(f"Error fetching inbox: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500) 