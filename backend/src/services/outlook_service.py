import requests
import jwt
from datetime import datetime, timedelta
from urllib.parse import urlencode, quote
from config.outlook_config import (
    OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET,
    OUTLOOK_REDIRECT_URI,
    OUTLOOK_AUTH_URI,
    OUTLOOK_TOKEN_URI,
    OUTLOOK_SCOPE
)
from repositories.mail_account_repository import MailAccountRepository
from models.mail_account import MailAccount
from models.email import Email
import aiohttp
import json
from typing import List, Dict, Any, Optional
import traceback

class OutlookService:
    def __init__(self):
        self.mail_account_repository = MailAccountRepository()
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.token_url = OUTLOOK_TOKEN_URI

    def get_auth_url(self, user_id: int) -> str:
        """Get Outlook OAuth authorization URL"""
        try:
            # Create state token
            state = jwt.encode({'user_id': user_id}, 'your-secret-key', algorithm='HS256')
            
            # Build authorization URL with prompt parameter
            params = {
                'client_id': OUTLOOK_CLIENT_ID,
                'response_type': 'code',
                'redirect_uri': OUTLOOK_REDIRECT_URI,
                'scope': ' '.join(OUTLOOK_SCOPE),
                'state': state,
                'prompt': 'select_account'  # Force account selection
            }
            
            auth_url = f"{OUTLOOK_AUTH_URI}?{'&'.join(f'{k}={quote(str(v))}' for k, v in params.items())}"
            return auth_url
            
        except Exception as e:
            print(f"Error generating Outlook auth URL: {str(e)}")
            raise

    async def handle_callback(self, code: str, user_id: int) -> Dict[str, Any]:
        """Handle Outlook OAuth callback"""
        try:
            print("Exchanging code for tokens...")
            async with aiohttp.ClientSession() as session:
                data = {
                    'client_id': OUTLOOK_CLIENT_ID,
                    'client_secret': OUTLOOK_CLIENT_SECRET,
                    'code': code,
                    'redirect_uri': OUTLOOK_REDIRECT_URI,
                    'grant_type': 'authorization_code'
                }
                async with session.post(self.token_url, data=data) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        print(f"Token exchange failed: {error_data}")
                        raise Exception(f"Token exchange failed: {error_data.get('error_description', 'Unknown error')}")
                    
                    tokens = await response.json()
                    print("Received tokens from Outlook")

            print("Getting user info from Outlook...")
            async with aiohttp.ClientSession() as session:
                headers = {'Authorization': f'Bearer {tokens["access_token"]}'}
                async with session.get(f"{self.base_url}/me", headers=headers) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        print(f"Failed to get user info: {error_data}")
                        raise Exception(f"Failed to get user info: {error_data.get('error', {}).get('message', 'Unknown error')}")
                    
                    user_info = await response.json()
                    print("Received user info:", user_info)

            expires_in = tokens['expires_in']
            expiry_time = datetime.now() + timedelta(seconds=expires_in)

            print("Saving account to database...")
            account_data = {
                'user_id': user_id,
                'email': user_info['userPrincipalName'],
                'access_token': tokens['access_token'],
                'refresh_token': tokens.get('refresh_token'),
                'token_expiry': expiry_time,
                'account_type': 'outlook'
            }
            
            print("Account data prepared:", account_data)
            account_obj = MailAccount.from_dict(account_data)
            result = await self.mail_account_repository.create_mail_account(account_obj)
            print("Account saved successfully:", result)
            
            return {
                'success': True,
                'email': user_info['userPrincipalName']
            }
        except requests.exceptions.RequestException as e:
            print(f"Error in Outlook API request: {str(e)}")
            raise
        except Exception as e:
            print(f"Unexpected error in handle_outlook_callback: {str(e)}")
            raise

    async def get_inbox(self, account_id: int, user_id: int, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        try:
            account = await MailAccount.get_by_id(account_id)
            if not account or account.user_id != user_id:
                raise ValueError("Account not found or unauthorized")

            # Check if token needs refresh
            if account.token_expires_at and account.token_expires_at <= datetime.now():
                await self.refresh_token(account)

            async with aiohttp.ClientSession() as session:
                headers = {'Authorization': f"Bearer {account.access_token}"}
                params = {
                    '$top': per_page,
                    '$skip': (page - 1) * per_page,
                    '$orderby': 'receivedDateTime desc'
                }
                
                async with session.get(f"{self.base_url}/me/messages", headers=headers, params=params) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        print(f"Failed to get inbox: {error_data}")
                        raise Exception(f"Failed to get inbox: {error_data.get('error', {}).get('message', 'Unknown error')}")
                    
                    data = await response.json()
                    print("Inbox data retrieved:", data)

                    emails = []
                    for msg in data.get('value', []):
                        email = await Email.create(
                            account_id=account_id,
                            message_id=msg['id'],
                            subject=msg.get('subject', ''),
                            sender=msg.get('from', {}).get('emailAddress', {}).get('address', ''),
                            recipient=msg.get('toRecipients', [{}])[0].get('emailAddress', {}).get('address', ''),
                            body=msg.get('body', {}).get('content', ''),
                            received_at=datetime.fromisoformat(msg['receivedDateTime'].replace('Z', '+00:00')),
                            is_read=msg.get('isRead', False)
                        )
                        emails.append(email.to_dict())

                    return {
                        'emails': emails,
                        'total': data.get('@odata.count', len(emails)),
                        'page': page,
                        'per_page': per_page
                    }

        except Exception as e:
            print(f"Error in get_inbox: {str(e)}")
            print(traceback.format_exc())
            raise

    async def get_email(self, account_id: int, user_id: int, message_id: str) -> Dict[str, Any]:
        try:
            account = await MailAccount.get_by_id(account_id)
            if not account or account.user_id != user_id:
                raise ValueError("Account not found or unauthorized")

            # Check if token needs refresh
            if account.token_expires_at and account.token_expires_at <= datetime.now():
                await self.refresh_token(account)

            async with aiohttp.ClientSession() as session:
                headers = {'Authorization': f"Bearer {account.access_token}"}
                async with session.get(f"{self.base_url}/me/messages/{message_id}", headers=headers) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        print(f"Failed to get email: {error_data}")
                        raise Exception(f"Failed to get email: {error_data.get('error', {}).get('message', 'Unknown error')}")
                    
                    msg = await response.json()
                    print("Email data retrieved:", msg)

                    email = await Email.create(
                        account_id=account_id,
                        message_id=msg['id'],
                        subject=msg.get('subject', ''),
                        sender=msg.get('from', {}).get('emailAddress', {}).get('address', ''),
                        recipient=msg.get('toRecipients', [{}])[0].get('emailAddress', {}).get('address', ''),
                        body=msg.get('body', {}).get('content', ''),
                        received_at=datetime.fromisoformat(msg['receivedDateTime'].replace('Z', '+00:00')),
                        is_read=msg.get('isRead', False)
                    )

                    return email.to_dict()

        except Exception as e:
            print(f"Error in get_email: {str(e)}")
            print(traceback.format_exc())
            raise

    async def reply_email(self, account_id: int, user_id: int, message_id: str, content: str) -> Dict[str, Any]:
        try:
            account = await MailAccount.get_by_id(account_id)
            if not account or account.user_id != user_id:
                raise ValueError("Account not found or unauthorized")

            # Check if token needs refresh
            if account.token_expires_at and account.token_expires_at <= datetime.now():
                await self.refresh_token(account)

            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {account.access_token}",
                    'Content-Type': 'application/json'
                }
                
                # Get original message
                async with session.get(f"{self.base_url}/me/messages/{message_id}", headers=headers) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        print(f"Failed to get original message: {error_data}")
                        raise Exception(f"Failed to get original message: {error_data.get('error', {}).get('message', 'Unknown error')}")
                    
                    original_msg = await response.json()
                    print("Original message retrieved:", original_msg)

                # Create reply message
                reply_data = {
                    'message': {
                        'subject': f"Re: {original_msg.get('subject', '')}",
                        'body': {
                            'contentType': 'HTML',
                            'content': content
                        },
                        'toRecipients': [
                            {
                                'emailAddress': {
                                    'address': original_msg.get('from', {}).get('emailAddress', {}).get('address', '')
                                }
                            }
                        ]
                    }
                }

                # Send reply
                async with session.post(f"{self.base_url}/me/messages/{message_id}/reply", headers=headers, json=reply_data) as response:
                    if response.status != 202:
                        error_data = await response.json()
                        print(f"Failed to send reply: {error_data}")
                        raise Exception(f"Failed to send reply: {error_data.get('error', {}).get('message', 'Unknown error')}")
                    
                    return {'status': 'success', 'message': 'Reply sent successfully'}

        except Exception as e:
            print(f"Error in reply_email: {str(e)}")
            print(traceback.format_exc())
            raise

    async def refresh_token(self, account: MailAccount) -> None:
        try:
            if not account.refresh_token:
                raise ValueError("No refresh token available")

            async with aiohttp.ClientSession() as session:
                data = {
                    'client_id': OUTLOOK_CLIENT_ID,
                    'client_secret': OUTLOOK_CLIENT_SECRET,
                    'refresh_token': account.refresh_token,
                    'grant_type': 'refresh_token'
                }
                async with session.post(self.token_url, data=data) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        print(f"Token refresh failed: {error_data}")
                        raise Exception(f"Token refresh failed: {error_data.get('error_description', 'Unknown error')}")
                    
                    tokens = await response.json()
                    print("Token refresh successful:", tokens)

                    # Update account with new tokens
                    account.access_token = tokens['access_token']
                    if 'refresh_token' in tokens:
                        account.refresh_token = tokens['refresh_token']
                    account.token_expires_at = datetime.fromtimestamp(datetime.now().timestamp() + tokens['expires_in'])
                    await account.save()

        except Exception as e:
            print(f"Error in refresh_token: {str(e)}")
            print(traceback.format_exc())
            raise 