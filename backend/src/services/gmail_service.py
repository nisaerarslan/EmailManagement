import os
from datetime import datetime, timedelta
import aiohttp
from config.gmail_config import GMAIL_CONFIG

class GmailService:
    @staticmethod
    def get_auth_url():
        """Generate Gmail OAuth2 authorization URL"""
        auth_url = (
            f"{GMAIL_CONFIG['AUTH_URI']}?"
            f"client_id={GMAIL_CONFIG['CLIENT_ID']}&"
            f"redirect_uri={GMAIL_CONFIG['REDIRECT_URI']}&"
            f"response_type=code&"
            f"scope=https://www.googleapis.com/auth/gmail.readonly&"
            f"access_type=offline"
        )
        return auth_url

    @staticmethod
    async def exchange_code_for_tokens(code):
        """Exchange authorization code for access and refresh tokens"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                GMAIL_CONFIG['TOKEN_URI'],
                data={
                    'client_id': GMAIL_CONFIG['CLIENT_ID'],
                    'client_secret': GMAIL_CONFIG['CLIENT_SECRET'],
                    'code': code,
                    'redirect_uri': GMAIL_CONFIG['REDIRECT_URI'],
                    'grant_type': 'authorization_code'
                }
            ) as response:
                if response.status != 200:
                    raise Exception(f"Failed to exchange code for tokens: {await response.text()}")
                
                data = await response.json()
                return {
                    'access_token': data['access_token'],
                    'refresh_token': data.get('refresh_token'),
                    'expires_at': datetime.now() + timedelta(seconds=data['expires_in'])
                }

    @staticmethod
    async def get_user_email(access_token):
        """Get user's email address using the access token"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status != 200:
                    raise Exception(f"Failed to get user email: {await response.text()}")
                
                data = await response.json()
                return data['email']

    @staticmethod
    async def get_emails(access_token):
        """Get user's emails using the access token"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://www.googleapis.com/gmail/v1/users/me/messages',
                headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status != 200:
                    raise Exception(f"Failed to get emails: {await response.text()}")
                
                data = await response.json()
                return data.get('messages', []) 