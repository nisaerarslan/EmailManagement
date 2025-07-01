import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import traceback

from services.base_service import BaseService
from services.authentication_service import AuthenticationService
from repositories.mail_account_repository import MailAccountRepository
from models.mail_account import MailAccount

class AccountManagementService(BaseService):
    """Service responsible for mail account management"""
    
    def __init__(
        self, 
        mail_account_repository: Optional[MailAccountRepository] = None,
        authentication_service: Optional[AuthenticationService] = None
    ):
        super().__init__()
        # Dependency injection
        self.mail_account_repository = mail_account_repository or MailAccountRepository()
        self.authentication_service = authentication_service or AuthenticationService(
            mail_account_repository=self.mail_account_repository
        )
    
    async def delete_account(self, user_id: int, account_id: int) -> bool:
        """Delete a mail account"""
        return await self.mail_account_repository.delete_account(user_id, account_id)
    
    async def get_user_accounts(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all mail accounts for a user"""
        try:
            accounts = await self.mail_account_repository.get_user_accounts(user_id)
            # Convert model instances to dictionaries for serialization
            return [account.to_dict() for account in accounts]
        except Exception as e:
            print(f"Error fetching user accounts: {str(e)}")
            raise
    
    async def handle_gmail_callback(self, code: str, user_id: int) -> Dict[str, Any]:
        """Handle Gmail OAuth callback and create a new mail account"""
        try:
            # Exchange code for tokens
            token_data = {
                'client_id': requests.utils.quote('your-client-id'),
                'client_secret': requests.utils.quote('your-client-secret'),
                'code': code,
                'redirect_uri': requests.utils.quote('your-redirect-uri'),
                'grant_type': 'authorization_code'
            }
            
            from config.oauth_config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_TOKEN_URI
            token_data = {
                'client_id': GOOGLE_CLIENT_ID,
                'client_secret': GOOGLE_CLIENT_SECRET,
                'code': code,
                'redirect_uri': GOOGLE_REDIRECT_URI,
                'grant_type': 'authorization_code'
            }
            
            token_response = requests.post(GOOGLE_TOKEN_URI, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()

            # Get user info from Google
            user_info_response = requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {tokens["access_token"]}'}
            )
            user_info_response.raise_for_status()
            user_info = user_info_response.json()

            # Calculate token expiry time
            expires_in = tokens['expires_in']
            expiry_time = datetime.now() + timedelta(seconds=expires_in)

            # Create MailAccount model instance
            account = MailAccount(
                account_id=0,  # Will be set by the repository
                user_id=user_id,
                email=user_info['email'],
                access_token=tokens['access_token'],
                refresh_token=tokens.get('refresh_token', ''),
                token_expiry=expiry_time,
                account_type='gmail',
                created_at=datetime.now()
            )
            
            # Save account to database
            result = await self.mail_account_repository.create_mail_account(account)
            
            return {
                'success': True,
                'email': result.email
            }
        except requests.exceptions.RequestException as e:
            print(f"Error in Google API request: {str(e)}")
            raise
        except Exception as e:
            print(f"Unexpected error in handle_gmail_callback: {str(e)}")
            print(traceback.format_exc())
            raise
    
    async def handle_outlook_callback(self, code: str, user_id: int) -> Dict[str, Any]:
        """Handle Outlook OAuth callback and create a new mail account"""
        try:
            # Exchange code for tokens
            import os
            import aiohttp
            
            session = await self.get_aiohttp_session()
            
            data = {
                'client_id': os.getenv('OUTLOOK_CLIENT_ID'),
                'client_secret': os.getenv('OUTLOOK_CLIENT_SECRET'),
                'code': code,
                'redirect_uri': os.getenv('OUTLOOK_REDIRECT_URI'),
                'grant_type': 'authorization_code'
            }
            
            async with session.post(
                'https://login.microsoftonline.com/common/oauth2/v2.0/token', 
                data=data
            ) as response:
                if response.status != 200:
                    error_data = await response.json()
                    print(f"Token exchange failed: {error_data}")
                    raise Exception(f"Token exchange failed: {error_data.get('error_description', 'Unknown error')}")
                
                tokens = await response.json()
                print("Received tokens from Outlook")

            # Get user info from Outlook
            async with session.get(
                "https://graph.microsoft.com/v1.0/me", 
                headers={'Authorization': f'Bearer {tokens["access_token"]}'}
            ) as response:
                if response.status != 200:
                    error_data = await response.json()
                    print(f"Failed to get user info: {error_data}")
                    raise Exception(f"Failed to get user info: {error_data.get('error', {}).get('message', 'Unknown error')}")
                
                user_info = await response.json()
                print("Received user info:", user_info)

            expires_in = tokens['expires_in']
            expiry_time = datetime.now() + timedelta(seconds=expires_in)

            # Create MailAccount model instance
            account = MailAccount(
                account_id=0,  # Will be set by the repository
                user_id=user_id,
                email=user_info['userPrincipalName'],
                access_token=tokens['access_token'],
                refresh_token=tokens.get('refresh_token', ''),
                token_expiry=expiry_time,
                account_type='outlook',
                created_at=datetime.now()
            )
            
            # Save account to database
            result = await self.mail_account_repository.create_mail_account(account)
            
            return {
                'success': True,
                'email': result.email
            }
        except Exception as e:
            print(f"Unexpected error in handle_outlook_callback: {str(e)}")
            print(traceback.format_exc())
            raise 