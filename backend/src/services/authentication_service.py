import requests
import aiohttp
import jwt
from urllib.parse import urlencode
from datetime import datetime, timedelta
from config.oauth_config import (
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_AUTH_URI,
    GOOGLE_TOKEN_URI,
    GOOGLE_SCOPE
)
import os
from typing import Dict, Any, Optional

from services.base_service import BaseService
from repositories.mail_account_repository import MailAccountRepository

class AuthenticationService(BaseService):
    """Service responsible for authentication and token management"""
    
    def __init__(self, mail_account_repository: Optional[MailAccountRepository] = None):
        super().__init__()
        # Dependency injection
        self.mail_account_repository = mail_account_repository or MailAccountRepository()
    
    def get_gmail_auth_url(self, user_id: int) -> str:
        """Get Gmail OAuth authorization URL"""
        # Create state token with user_id
        state = jwt.encode({'user_id': user_id}, 'your-secret-key', algorithm='HS256')
        
        params = {
            'client_id': GOOGLE_CLIENT_ID,
            'redirect_uri': GOOGLE_REDIRECT_URI,
            'scope': ' '.join(GOOGLE_SCOPE),
            'response_type': 'code',
            'access_type': 'offline',
            'prompt': 'consent',
            'state': state
        }
        return f"{GOOGLE_AUTH_URI}?{urlencode(params)}"
    
    def get_outlook_auth_url(self, user_id: int) -> str:
        """Get Outlook OAuth authorization URL"""
        # Create state token
        state = jwt.encode({'user_id': user_id}, 'your-secret-key', algorithm='HS256')
        
        # Build authorization URL with prompt parameter
        params = {
            'client_id': os.getenv('OUTLOOK_CLIENT_ID'),
            'response_type': 'code',
            'redirect_uri': os.getenv('OUTLOOK_REDIRECT_URI'),
            'scope': 'Mail.Read Mail.Send offline_access',
            'state': state,
            'prompt': 'select_account'  # Force account selection
        }
        
        auth_url = f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?{urlencode(params)}"
        return auth_url
    
    async def refresh_gmail_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh a Gmail OAuth token"""
        token_data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }
        
        token_response = requests.post(GOOGLE_TOKEN_URI, data=token_data)
        token_response.raise_for_status()
        return token_response.json()
    
    async def refresh_outlook_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Refresh an Outlook OAuth token"""
        try:
            session = await self.get_aiohttp_session()
            data = {
                'client_id': os.getenv('OUTLOOK_CLIENT_ID'),
                'client_secret': os.getenv('OUTLOOK_CLIENT_SECRET'),
                'refresh_token': refresh_token,
                'grant_type': 'refresh_token',
                'scope': 'Mail.Read Mail.Send offline_access'
            }
            
            async with session.post(
                'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                data=data
            ) as response:
                if response.status != 200:
                    error_data = await response.json()
                    print(f"Failed to refresh Outlook token: {error_data}")
                    return None
                
                token_data = await response.json()
                expiry_time = datetime.now() + timedelta(seconds=token_data['expires_in'])
                
                return {
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data.get('refresh_token', refresh_token),
                    'token_expiry': expiry_time
                }
        except Exception as e:
            print(f"Error refreshing Outlook token: {str(e)}")
            return None
    
    async def update_account_tokens(self, account_id: int, access_token: str, token_expiry: datetime) -> bool:
        """Update account tokens in the database"""
        return await self.mail_account_repository.update_account_tokens(
            account_id, access_token, token_expiry
        ) 