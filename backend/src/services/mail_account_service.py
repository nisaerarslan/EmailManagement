import requests
import aiohttp
from urllib.parse import urlencode
import jwt
from datetime import datetime, timedelta, timezone
from config.oauth_config import (
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_AUTH_URI,
    GOOGLE_TOKEN_URI,
    GOOGLE_SCOPE
)
from repositories.mail_account_repository import MailAccountRepository
import base64
import asyncio
from googleapiclient.discovery import build
from google.auth.credentials import Credentials
from googleapiclient.errors import HttpError
from bs4 import BeautifulSoup
import os
import traceback
from models.mail_account import MailAccount

class MailAccountService:
    def __init__(self):
        self.mail_account_repository = MailAccountRepository()
        self.session = None

    async def get_aiohttp_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    def get_gmail_auth_url(self, user_id: int) -> str:
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

    async def delete_account(self, user_id: int, account_id: int) -> bool:
        """Kullanıcının mail hesabını siler"""
        return await self.mail_account_repository.delete_account(user_id, account_id)

    async def handle_gmail_callback(self, code: str, user_id: int) -> dict:
        try:
            # Exchange code for tokens
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
            raise

    async def get_user_accounts(self, user_id: int) -> list:
        try:
            accounts = await self.mail_account_repository.get_user_accounts(user_id)
            # Convert model instances to dictionaries for serialization
            return [account.to_dict() for account in accounts]
        except Exception as e:
            print(f"Error fetching user accounts: {str(e)}")
            raise

    async def refresh_gmail_token(self, refresh_token: str) -> dict:
        token_data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'refresh_token': refresh_token,
            'grant_type': 'refresh_token'
        }
        
        token_response = requests.post(GOOGLE_TOKEN_URI, data=token_data)
        token_response.raise_for_status()
        return token_response.json()

    async def refresh_outlook_token(self, refresh_token: str) -> dict:
        """Outlook token'ını yeniler"""
        try:
            async with aiohttp.ClientSession() as session:
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

    async def get_inbox_messages(self, user_id: int, account_id: str = None, page_token: str = None, page_size: int = 50) -> dict:
        """Kullanıcının mail hesabındaki gelen kutusu mesajlarını getirir"""
        try:
            # Get user's mail accounts
            accounts = await self.mail_account_repository.get_user_accounts(user_id)
            
            if not accounts:
                return {'messages': [], 'nextPageToken': None}
            
            # If account_id is specified, filter accounts
            if account_id:
                accounts = [acc for acc in accounts if str(acc['account_id']) == account_id]
                if not accounts:
                    return {'messages': [], 'nextPageToken': None}

            all_messages = []
            next_page_token = None
            session = await self.get_aiohttp_session()
            
            for account in accounts:
                if account['account_type'] == 'gmail':
                    try:
                        # Token'ın geçerliliğini kontrol et
                        if account['token_expiry'] and account['token_expiry'] < datetime.now():
                            # Token süresi dolmuşsa yenile
                            new_token_data = await self.refresh_gmail_token(account['refresh_token'])
                            if new_token_data:
                                # Yeni token'ı veritabanında güncelle
                                await self.mail_account_repository.update_account_tokens(
                                    account['account_id'],
                                    new_token_data['access_token'],
                                    new_token_data['token_expiry']
                                )
                                # Güncellenmiş token ile devam et
                                account['access_token'] = new_token_data['access_token']
                            else:
                                raise ValueError("Token yenileme başarısız oldu")

                        headers = {
                            'Authorization': f'Bearer {account["access_token"]}',
                            'Content-Type': 'application/json'
                        }
                        
                        # List messages in inbox with pagination
                        params = {
                            'maxResults': page_size,
                            'q': 'in:inbox -from:me'  # Only show received emails, exclude sent ones
                        }
                        if page_token:
                            params['pageToken'] = page_token

                        async with session.get(
                            'https://gmail.googleapis.com/gmail/v1/users/me/messages',
                            headers=headers,
                            params=params
                        ) as messages_response:
                            messages_response.raise_for_status()
                            messages_data = await messages_response.json()
                            next_page_token = messages_data.get('nextPageToken')
                            
                            # Get details for each message concurrently
                            message_tasks = []
                            for message in messages_data.get('messages', []):
                                task = self.get_message_details(session, headers, message['id'], account['email'])
                                message_tasks.append(task)
                            
                            messages = await asyncio.gather(*message_tasks)
                            all_messages.extend([msg for msg in messages if msg is not None])
                            
                    except Exception as e:
                        print(f"Error fetching messages for account {account['email']}: {str(e)}")
                        continue
                elif account['account_type'] == 'outlook':
                    try:
                        # Token'ın geçerliliğini kontrol et
                        if account['token_expiry'] and account['token_expiry'] < datetime.now():
                            # Token süresi dolmuşsa yenile
                            new_token_data = await self.refresh_outlook_token(account['refresh_token'])
                            if new_token_data:
                                # Yeni token'ı veritabanında güncelle
                                await self.mail_account_repository.update_account_tokens(
                                    account['account_id'],
                                    new_token_data['access_token'],
                                    new_token_data['token_expiry']
                                )
                                # Güncellenmiş token ile devam et
                                account['access_token'] = new_token_data['access_token']
                            else:
                                raise ValueError("Token yenileme başarısız oldu")

                        headers = {
                            'Authorization': f'Bearer {account["access_token"]}',
                            'Content-Type': 'application/json'
                        }
                        
                        # Outlook API endpoint
                        params = {
                            '$top': page_size,
                            '$orderby': 'receivedDateTime desc'
                        }
                        if page_token:
                            params['$skip'] = int(page_token)

                        # Get messages from the inbox folder only
                        async with session.get(
                            'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages',
                            headers=headers,
                            params=params
                        ) as messages_response:
                            messages_response.raise_for_status()
                            messages_data = await messages_response.json()
                            
                            # Process Outlook messages
                            for msg in messages_data.get('value', []):
                                message = {
                                    'id': msg['id'],
                                    'subject': msg.get('subject', 'No Subject'),
                                    'sender': msg.get('from', {}).get('emailAddress', {}).get('address', 'Unknown Sender'),
                                    'preview': msg.get('bodyPreview', '')[:200],
                                    'date': msg['receivedDateTime'],
                                    'content': msg.get('body', {}).get('content', ''),
                                    'hasHtml': msg.get('body', {}).get('contentType', '') == 'html',
                                    'read': msg.get('isRead', False),
                                    'starred': msg.get('isFlagged', False),
                                    'recipientEmail': account['email']
                                }
                                all_messages.append(message)

                            # Set next page token for Outlook
                            if '@odata.nextLink' in messages_data:
                                next_page_token = str(len(all_messages))
                            
                    except Exception as e:
                        print(f"Error fetching messages for Outlook account {account['email']}: {str(e)}")
                        continue

            return {
                'messages': all_messages,
                'nextPageToken': next_page_token
            }
                
        except Exception as e:
            print(f"Error in get_inbox_messages: {str(e)}")
            raise

    async def get_message_details(self, session, headers, message_id, account_email):
        try:
            async with session.get(
                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}',
                headers=headers
            ) as msg_response:
                msg_response.raise_for_status()
                msg_data = await msg_response.json()
                
                # Extract headers
                headers_data = msg_data['payload']['headers']
                subject = next((h['value'] for h in headers_data if h['name'].lower() == 'subject'), 'No Subject')
                sender = next((h['value'] for h in headers_data if h['name'].lower() == 'from'), 'Unknown Sender')
                date_str = next((h['value'] for h in headers_data if h['name'].lower() == 'date'), '')
                
                # Parse and format the date
                try:
                    date_parts = date_str.split('(')
                    clean_date_str = date_parts[0].strip()
                    try:
                        parsed_date = datetime.strptime(clean_date_str, '%a, %d %b %Y %H:%M:%S %z')
                    except ValueError:
                        try:
                            parsed_date = datetime.strptime(clean_date_str, '%d %b %Y %H:%M:%S %z')
                        except ValueError:
                            timestamp = int(msg_data['internalDate']) / 1000
                            parsed_date = datetime.fromtimestamp(timestamp)
                    
                    formatted_date = parsed_date.isoformat()
                except Exception as e:
                    print(f"Error parsing date '{date_str}': {str(e)}")
                    formatted_date = datetime.now().isoformat()

                # Extract message content and images
                plain_text = ''
                html_content = ''
                inline_images = {}
                attachments = []

                async def process_part(part):
                    nonlocal plain_text, html_content
                    mime_type = part.get('mimeType', '')
                    
                    if mime_type == 'text/plain' and 'data' in part.get('body', {}):
                        try:
                            data = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                            plain_text = data
                        except Exception as e:
                            print(f"Error decoding plain text: {str(e)}")
                    elif mime_type == 'text/html' and 'data' in part.get('body', {}):
                        try:
                            data = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                            html_content = data
                        except Exception as e:
                            print(f"Error decoding HTML: {str(e)}")
                    elif 'attachmentId' in part.get('body', {}):
                        try:
                            attachment_id = part['body']['attachmentId']
                            filename = part.get('filename', '')
                            content_id = next((h['value'].strip('<>') for h in part.get('headers', []) if h['name'].lower() == 'content-id'), None)
                            
                            # Get attachment data
                            async with session.get(
                                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/attachments/{attachment_id}',
                                headers=headers
                            ) as attachment_response:
                                attachment_response.raise_for_status()
                                attachment_data = await attachment_response.json()
                                
                                if content_id and mime_type.startswith('image/'):
                                    # This is an inline image
                                    inline_images[content_id] = f"data:{mime_type};base64,{attachment_data['data']}"
                                elif filename:
                                    # This is a regular attachment
                                    attachments.append({
                                        'id': attachment_id,
                                        'filename': filename,
                                        'mimeType': mime_type,
                                        'data': attachment_data['data']
                                    })
                        except Exception as e:
                            print(f"Error processing attachment: {str(e)}")

                async def process_parts(parts):
                    for part in parts:
                        if 'parts' in part:
                            await process_parts(part['parts'])
                        else:
                            await process_part(part)

                if 'parts' in msg_data['payload']:
                    await process_parts(msg_data['payload']['parts'])
                else:
                    await process_part(msg_data['payload'])

                # Process HTML content to replace inline image references
                if html_content and inline_images:
                    soup = BeautifulSoup(html_content, 'html.parser')
                    
                    # Replace cid: references with base64 data
                    for img in soup.find_all('img'):
                        src = img.get('src', '')
                        if src.startswith('cid:'):
                            cid = src[4:]  # Remove 'cid:' prefix
                            if cid in inline_images:
                                img['src'] = inline_images[cid]
                    
                    html_content = str(soup)

                # Create preview from plain text or HTML
                preview = plain_text[:200] if plain_text else ''
                if not preview and html_content:
                    soup = BeautifulSoup(html_content, 'html.parser')
                    preview = soup.get_text()[:200]

                return {
                    'id': message_id,
                    'subject': subject,
                    'sender': sender,
                    'preview': preview,
                    'date': formatted_date,
                    'content': html_content if html_content else plain_text,
                    'hasHtml': bool(html_content),
                    'read': 'UNREAD' not in msg_data.get('labelIds', []),
                    'starred': 'STARRED' in msg_data.get('labelIds', []),
                    'recipientEmail': account_email,
                    'attachments': attachments
                }

        except Exception as e:
            print(f"Error getting message details for {message_id}: {str(e)}")
            return None 

    async def get_gmail_message_details(self, session, headers, message_id, account, user_id):
        """Get detailed information about a specific Gmail message."""
        try:
            async with session.get(
                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}?format=full',
                headers=headers
            ) as response:
                if response.status != 200:
                    print(f"Error fetching Gmail message details: {response.status}")
                    return None

                message_data = await response.json()
                headers_data = {header['name'].lower(): header['value'] 
                            for header in message_data.get('payload', {}).get('headers', [])}

                # Get message body and attachments
                body = {'text': '', 'html': '', 'attachments': []}
                payload = message_data.get('payload', {})

                async def process_part(part):
                    """Process a message part recursively."""
                    if 'parts' in part:
                        for subpart in part['parts']:
                            await process_part(subpart)
                    else:
                        part_body = part.get('body', {})
                        if 'data' in part_body:
                            data = base64.urlsafe_b64decode(part_body['data'].encode('UTF-8')).decode('UTF-8')
                            mime_type = part.get('mimeType', '')
                            if 'text/plain' in mime_type:
                                body['text'] = data
                            elif 'text/html' in mime_type:
                                body['html'] = data

                        # Handle attachments
                        if part.get('filename'):
                            attachment = {
                                'id': part.get('body', {}).get('attachmentId', ''),
                                'name': part['filename'],
                                'contentType': part.get('mimeType', ''),
                                'size': part.get('body', {}).get('size', 0),
                                'isInline': bool(part.get('contentId', '')),
                            }
                            
                            if attachment['isInline']:
                                # Generate attachment URL for inline images
                                attachment['url'] = f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/attachments/{attachment["id"]}'
                                # Update HTML content to use the attachment URL
                                if attachment['contentType'].startswith('image/'):
                                    content_id = part.get('contentId', '').strip('<>')
                                    if content_id and content_id in body['html']:
                                        body['html'] = body['html'].replace(
                                            f'cid:{content_id}',
                                            attachment['url']
                                        )
                            
                            body['attachments'].append(attachment)

                # Process message parts
                if 'parts' in payload:
                    for part in payload['parts']:
                        await process_part(part)
                else:
                    await process_part(payload)

                # If no HTML content but we have text, convert text to HTML
                if not body['html'] and body['text']:
                    body['html'] = body['text'].replace('\n', '<br>')

                # Clean up HTML content
                if body['html']:
                    soup = BeautifulSoup(body['html'], 'html.parser')
                    # Remove potentially harmful elements and attributes
                    for tag in soup.find_all(['script', 'iframe', 'object', 'embed']):
                        tag.decompose()
                    # Convert relative URLs to absolute
                    for img in soup.find_all('img', src=True):
                        src = img['src']
                        if src.startswith('//'):
                            img['src'] = 'https:' + src
                        elif src.startswith('/'):
                            img['src'] = 'https://mail.google.com' + src
                    body['html'] = str(soup)

                # Create message object
                message = {
                    'message_id': message_id,
                    'account_id': account.account_id if hasattr(account, 'account_id') else account['account_id'],
                    'user_id': user_id,
                    'from': headers_data.get('from', ''),
                    'to_recipients': [addr.strip() for addr in headers_data.get('to', '').split(',') if addr.strip()],
                    'cc_recipients': [addr.strip() for addr in headers_data.get('cc', '').split(',') if addr.strip()],
                    'bcc_recipients': [addr.strip() for addr in headers_data.get('bcc', '').split(',') if addr.strip()],
                    'subject': headers_data.get('subject', ''),
                    'body': body['html'] or body['text'],
                    'body_type': 'html' if body['html'] else 'text',
                    'sent_at': headers_data.get('date', ''),
                    'created_date': datetime.now(timezone.utc).isoformat(),
                    'account_email': account.email if hasattr(account, 'email') else account['email'],
                    'has_attachments': bool(body['attachments']),
                    'attachments': body['attachments'],
                    'access_token': account.access_token if hasattr(account, 'access_token') else account['access_token']
                }

                return message

        except Exception as e:
            print(f"Error processing Gmail message {message_id}: {str(e)}")
            print(traceback.format_exc())
            return None

    def _parse_email_date(self, date_str: str) -> datetime:
        """Robustly parse various email date formats."""
        if not date_str:
            return datetime.min.replace(tzinfo=timezone.utc) # Use timezone aware min

        # Common formats to try
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",       # RFC 5322 format (e.g., 'Tue, 21 Nov 2023 14:32:15 +0000')
            "%d %b %Y %H:%M:%S %z",           # Example: '21 Nov 2023 14:32:15 +0000'
            "%a, %d %b %Y %H:%M:%S",          # Format without timezone offset (assume UTC or local)
            "%Y-%m-%dT%H:%M:%S%z",           # ISO 8601 with timezone (e.g., Outlook format)
            "%Y-%m-%dT%H:%M:%S",              # ISO 8601 without timezone
        ]

        # Clean the date string (remove timezone name in parentheses)
        cleaned_date_str = date_str.split('(')[0].strip()

        for fmt in formats:
            try:
                # Parse with timezone if available
                dt = datetime.strptime(cleaned_date_str, fmt)
                # If format didn't include %z, make it timezone aware (assume UTC or local - UTC is safer)
                if dt.tzinfo is None:
                     dt = dt.replace(tzinfo=timezone.utc) # Make aware, assuming UTC
                return dt
            except ValueError:
                continue # Try next format

        # Fallback if no format matches
        print(f"Could not parse date string: {date_str} with known formats.")
        return datetime.min.replace(tzinfo=timezone.utc) # Return a default past date

    async def get_sent_emails(self, user_id: int, limit: int = 50, offset: int = 0) -> dict:
        """Kullanıcının gönderilen maillerini getirir"""
        try:
            accounts = await self.mail_account_repository.get_user_accounts(user_id)
            if not accounts:
                return {'sent_emails': [], 'total_count': 0}
            
            all_messages = []
            session = await self.get_aiohttp_session()
            
            for account in accounts:
                # Determine whether we're working with an object or dictionary
                is_object = hasattr(account, 'account_type')
                
                account_type = account.account_type if is_object else account['account_type']
                account_id = account.account_id if is_object else account['account_id']
                account_email = account.email if is_object else account['email']
                access_token = account.access_token if is_object else account['access_token']
                refresh_token = account.refresh_token if is_object else account['refresh_token']
                token_expiry = account.token_expiry if is_object else account['token_expiry']
                
                if account_type == 'gmail':
                    try:
                        # Token refresh logic
                        if token_expiry and token_expiry < datetime.now():
                            new_token_data = await self.refresh_gmail_token(refresh_token)
                            if new_token_data:
                                expiry_time = datetime.now() + timedelta(seconds=new_token_data['expires_in'])
                                await self.mail_account_repository.update_account_tokens(
                                    account_id,
                                    new_token_data['access_token'],
                                    expiry_time
                                )
                                # Update the account object or dict
                                if is_object:
                                    account.access_token = new_token_data['access_token']
                                else:
                                    account['access_token'] = new_token_data['access_token']
                                access_token = new_token_data['access_token']
                            else:
                                raise ValueError("Token yenileme başarısız oldu")

                        headers = {
                            'Authorization': f'Bearer {access_token}',
                            'Content-Type': 'application/json'
                        }

                        # Get sent messages
                        params = {
                            'maxResults': 500,
                            'labelIds': ['SENT'],
                            'includeSpamTrash': 'false'
                        }

                        async with session.get(
                            'https://gmail.googleapis.com/gmail/v1/users/me/messages',
                            headers=headers,
                            params=params
                        ) as response:
                            if response.status == 200:
                                data = await response.json()
                                messages = data.get('messages', [])
                                
                                # Fetch details for all messages
                                message_tasks = []
                                for msg in messages:
                                    message_id = msg['id']
                                    task = self.get_gmail_message_details(session, headers, message_id, account, user_id)
                                    message_tasks.append(task)
                                
                                if message_tasks:
                                    batch_results = await asyncio.gather(*message_tasks)
                                    valid_messages = [msg for msg in batch_results if msg is not None]
                                    all_messages.extend(valid_messages)
                            else:
                                error_text = await response.text()
                                print(f"Error fetching Gmail messages: Status {response.status}")
                                print(f"Error response: {error_text}")

                    except Exception as e:
                        print(f"Error processing Gmail account {account_email}: {str(e)}")
                        continue
                elif account_type == 'outlook':
                    try:
                        # Token refresh logic
                        if token_expiry and token_expiry < datetime.now():
                            new_token_data = await self.refresh_outlook_token(refresh_token)
                            if new_token_data:
                                expiry_time = datetime.now() + timedelta(seconds=new_token_data['expires_in'])
                                await self.mail_account_repository.update_account_tokens(
                                    account_id,
                                    new_token_data['access_token'],
                                    expiry_time
                                )
                                # Update the account object or dict
                                if is_object:
                                    account.access_token = new_token_data['access_token']
                                else:
                                    account['access_token'] = new_token_data['access_token']
                                access_token = new_token_data['access_token']
                            else:
                                raise ValueError("Token yenileme başarısız oldu")

                        headers = {
                            'Authorization': f'Bearer {access_token}',
                            'Content-Type': 'application/json'
                        }

                        # Get sent messages from Outlook
                        async with session.get(
                            'https://graph.microsoft.com/v1.0/me/mailFolders/sentItems/messages',
                            headers=headers,
                            params={
                                '$top': 500,
                                '$orderby': 'sentDateTime desc'
                            }
                        ) as response:
                            if response.status == 200:
                                data = await response.json()
                                messages = data.get('value', [])
                                
                                for msg in messages:
                                    message = {
                                        'message_id': msg['id'],
                                        'account_id': account_id,
                                        'user_id': user_id,
                                        'from': account_email,
                                        'to_recipients': [r['emailAddress']['address'] for r in msg.get('toRecipients', [])],
                                        'cc_recipients': [r['emailAddress']['address'] for r in msg.get('ccRecipients', [])],
                                        'bcc_recipients': [r['emailAddress']['address'] for r in msg.get('bccRecipients', [])],
                                        'subject': msg.get('subject', ''),
                                        'body': msg.get('bodyPreview', ''),
                                        'sent_at': msg.get('sentDateTime', ''),
                                        'created_date': datetime.now(timezone.utc).isoformat()
                                    }
                                    all_messages.append(message)
                            else:
                                error_text = await response.text()
                                print(f"Error fetching Outlook messages: Status {response.status}")
                                print(f"Error response: {error_text}")

                    except Exception as e:
                        print(f"Error processing Outlook account {account_email}: {str(e)}")
                        continue

            # Sort messages by date
            try:
                all_messages.sort(key=lambda x: self._parse_email_date(x['sent_at']), reverse=True)
            except Exception as e:
                print(f"Error during sorting: {str(e)}")

            # Apply pagination
            total_count = len(all_messages)
            start_idx = offset
            end_idx = min(offset + limit, total_count)
            paginated_messages = all_messages[start_idx:end_idx]

            return {
                'sent_emails': paginated_messages,
                'total_count': total_count
            }

        except Exception as e:
            print(f"Error in get_sent_emails: {str(e)}")
            return {'sent_emails': [], 'total_count': 0} 