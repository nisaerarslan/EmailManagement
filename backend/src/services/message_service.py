import aiohttp
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import traceback
import asyncio
from bs4 import BeautifulSoup
import base64
import re

from services.base_service import BaseService
from services.authentication_service import AuthenticationService
from repositories.mail_account_repository import MailAccountRepository

class MessageService(BaseService):
    """Service responsible for email message operations"""
    
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
    
    async def _ensure_valid_token(self, account: Dict[str, Any]) -> bool:
        """Checks if the token is valid and refreshes it if necessary."""
        try:
            access_token = account.get('access_token')
            refresh_token = account.get('refresh_token')
            token_expiry = account.get('token_expiry')
            account_id = account.get('account_id')
            account_type = account.get('account_type')

            if not access_token:
                return False

            if token_expiry:
                if isinstance(token_expiry, str):
                    try:
                        token_expiry = datetime.fromisoformat(token_expiry.replace('Z', '+00:00'))
                    except ValueError:
                        token_expiry = datetime.now(timezone.utc) - timedelta(days=1)
                
                if token_expiry.tzinfo is None:
                    token_expiry = token_expiry.replace(tzinfo=timezone.utc)
                
                now = datetime.now(timezone.utc)
                if token_expiry < (now + timedelta(minutes=30)):
                    if not refresh_token:
                        return False

                    try:
                        new_tokens = None
                        if account_type == 'gmail':
                            new_tokens = await self.authentication_service.refresh_gmail_token(refresh_token)
                        elif account_type == 'outlook':
                            new_tokens = await self.authentication_service.refresh_outlook_token(refresh_token)
                        else:
                            return False

                        if new_tokens and 'access_token' in new_tokens:
                            new_expiry_time = datetime.now(timezone.utc) + timedelta(seconds=new_tokens.get('expires_in', 3600))
                            await self.mail_account_repository.update_account_tokens(
                                account_id,
                                new_tokens['access_token'],
                                new_expiry_time
                            )
                            account['access_token'] = new_tokens['access_token']
                            account['token_expiry'] = new_expiry_time
                            if 'refresh_token' in new_tokens:
                                account['refresh_token'] = new_tokens['refresh_token']
                            return True
                        else:
                            return False
                    except Exception as e:
                        print(f"Error during token refresh: {str(e)}")
                        return False

            return True

        except Exception as e:
            print(f"Error in _ensure_valid_token: {str(e)}")
            return False
    
    async def get_inbox_messages(self, user_id: int, account_id: str = None, page_token: str = None, page_size: int = 50) -> Dict[str, Any]:
        """Get inbox messages for a user"""
        try:
            # Get user's mail accounts
            accounts = await self.mail_account_repository.get_user_accounts(user_id)
            
            if not accounts:
                return {'messages': [], 'nextPageToken': None, 'totalCount': 0, 'currentPage': 1}
            
            # If account_id is specified, filter accounts
            if account_id:
                accounts = [acc for acc in accounts if str(acc.account_id) == account_id]
                if not accounts:
                    return {'messages': [], 'nextPageToken': None, 'totalCount': 0, 'currentPage': 1}
            
            # Handle page token
            current_page = 1
            if page_token:
                try:
                    if account_id:
                        # Single account: token format is "account_id:actual_token:page_number"
                        token_parts = page_token.split(':')
                        if len(token_parts) == 3:
                            token_account_id, actual_token, page_number = token_parts
                            current_page = int(page_number)
                            
                            # Validate that the page token belongs to the selected account
                            if token_account_id != account_id:
                                # Token is for different account, reset pagination
                                page_token = None
                                current_page = 1
                            else:
                                # Use the actual token for API calls
                                page_token = actual_token
                        else:
                            # Invalid token format, reset pagination
                            page_token = None
                            current_page = 1
                    else:
                        # All accounts: token is just the page number
                        current_page = int(page_token)
                except:
                    # Invalid token format, reset pagination
                    page_token = None
                    current_page = 1

            all_messages = []
            next_page_token = None
            total_count = 0
            session = await self.get_aiohttp_session()
            
            # Get date 2 years ago
            one_year_ago = (datetime.now() - timedelta(days=730)).strftime('%Y/%m/%d')
            
            # If specific account is selected, use existing logic
            if account_id:
                for account in accounts:
                    account_dict = account.to_dict()
                    if account.account_type == 'gmail':
                        try:
                            # Validate token
                            if not await self._ensure_valid_token(account_dict):
                                continue

                            headers = {
                                'Authorization': f'Bearer {account_dict["access_token"]}',
                                'Content-Type': 'application/json'
                            }
                            
                            # List messages in inbox with pagination and date filter
                            params = {
                                'maxResults': min(page_size, 30),  # Limit to 30 messages per request
                                'q': f'in:inbox -from:me after:{one_year_ago}',  # Only show received emails from last year
                                'orderBy': 'desc'  # Sort by date descending (newest first)
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
                                
                                if messages_data.get('nextPageToken'):
                                    # Format: "account_id:actual_token:page_number"
                                    next_page_token = f"{account.account_id}:{messages_data['nextPageToken']}:{current_page + 1}"
                                
                                total_count += messages_data.get('resultSizeEstimate', 0)
                                
                                # Get details for each message concurrently
                                message_tasks = []
                                for message in messages_data.get('messages', []):
                                    task = self.get_message_details(session, headers, message['id'], account.email)
                                    message_tasks.append(task)
                                
                                # Process messages in larger batches for better performance
                                batch_size = 10  # Increased from 5 to 10
                                messages = []
                                
                                for i in range(0, len(message_tasks), batch_size):
                                    batch = message_tasks[i:i + batch_size]
                                    batch_results = await asyncio.gather(*batch, return_exceptions=True)
                                    
                                    for result in batch_results:
                                        if result is not None and not isinstance(result, Exception):
                                            messages.append(result)
                                    
                                    # Reduced delay between batches
                                    if i + batch_size < len(message_tasks):
                                        await asyncio.sleep(0.1)  # Reduced from 0.5 to 0.1
                                
                                all_messages.extend(messages)
                                
                        except Exception as e:
                            print(f"Error fetching messages for account {account.email}: {str(e)}")
                            continue
                    elif account.account_type == 'outlook':
                        try:
                            # Validate token
                            if not await self._ensure_valid_token(account_dict):
                                continue

                            headers = {
                                'Authorization': f'Bearer {account_dict["access_token"]}',
                                'Content-Type': 'application/json'
                            }
                            
                            # Calculate skip value for Outlook pagination
                            skip_value = (current_page - 1) * page_size if page_token else 0
                            
                            # Outlook API endpoint with attachment info and date filter
                            params = {
                                '$top': page_size,
                                '$orderby': 'receivedDateTime desc',
                                '$expand': 'attachments',
                                '$count': 'true',
                                '$filter': f"receivedDateTime ge {one_year_ago.replace('/', '-')}T00:00:00Z",
                                '$skip': skip_value
                            }

                            # Get messages from the inbox folder only
                            async with session.get(
                                'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages',
                                headers=headers,
                                params=params
                            ) as messages_response:
                                messages_response.raise_for_status()
                                messages_data = await messages_response.json()
                                
                                # Get total count from Outlook API
                                if '@odata.count' in messages_data:
                                    total_count += messages_data['@odata.count']
                                    
                                    # Calculate if there are more pages
                                    if skip_value + page_size < messages_data['@odata.count']:
                                        # Format: "account_id:skip_value:page_number"
                                        next_page_token = f"{account.account_id}:{skip_value + page_size}:{current_page + 1}"
                                else:
                                    messages_count = len(messages_data.get('value', []))
                                    total_count += messages_count
                                    
                                    # If we got a full page, assume there might be more
                                    if messages_count == page_size:
                                        next_page_token = f"{account.account_id}:{skip_value + page_size}:{current_page + 1}"
                                
                                # Process Outlook messages
                                for msg in messages_data.get('value', []):
                                    # Process attachments
                                    attachments = []
                                    for attachment in msg.get('attachments', []):
                                        if attachment.get('@odata.type') == '#microsoft.graph.fileAttachment':
                                            attachments.append({
                                                'id': attachment['id'],
                                                'filename': attachment['name'],
                                                'mimeType': attachment.get('contentType', 'application/octet-stream'),
                                                'data': attachment.get('contentBytes', '')
                                            })

                                    message = {
                                        'id': msg['id'],
                                        'subject': msg.get('subject', 'No Subject'),
                                        'sender': msg.get('from', {}).get('emailAddress', {}).get('address', 'Unknown Sender'),
                                        'preview': msg.get('bodyPreview', '')[:200],
                                        'date': msg['receivedDateTime'],
                                        'content': msg.get('body', {}).get('content', ''),
                                        'hasHtml': msg.get('body', {}).get('contentType', '') == 'html',
                                        'read': msg.get('isRead', False),
                                        'starred': msg.get('flag', {}).get('flagStatus', '') == 'flagged',
                                        'recipientEmail': account.email,
                                        'attachments': attachments
                                    }
                                    all_messages.append(message)
                                    
                        except Exception as e:
                            print(f"Error fetching messages for account {account.email}: {str(e)}")
                            continue
            else:
                # All accounts selected - improved logic for proper pagination and sorting
                # Calculate offset based on current page
                offset = (current_page - 1) * page_size
                
                # Fetch more messages from each account to ensure proper sorting
                # We'll fetch more messages to have enough for proper pagination
                fetch_size_per_account = max(page_size * 3, 100)  # Increased from 2x to 3x and minimum 100
                
                # Track total count across all accounts
                estimated_total_count = 0
                
                for account in accounts:
                    account_dict = account.to_dict()
                    if account.account_type == 'gmail':
                        try:
                            # Validate token
                            if not await self._ensure_valid_token(account_dict):
                                continue

                            headers = {
                                'Authorization': f'Bearer {account_dict["access_token"]}',
                                'Content-Type': 'application/json'
                            }
                            
                            # First, get the total count estimate
                            count_params = {
                                'maxResults': 1,
                                'q': f'in:inbox -from:me after:{one_year_ago}',
                            }
                            
                            async with session.get(
                                'https://gmail.googleapis.com/gmail/v1/users/me/messages',
                                headers=headers,
                                params=count_params
                            ) as count_response:
                                count_response.raise_for_status()
                                count_data = await count_response.json()
                                estimated_total_count += count_data.get('resultSizeEstimate', 0)
                            
                            # List messages in inbox with date filter - fetch more for proper sorting
                            params = {
                                'maxResults': min(fetch_size_per_account, 100),  # Increased limit
                                'q': f'in:inbox -from:me after:{one_year_ago}',  # Only show received emails from last year
                                'orderBy': 'desc'  # Sort by date descending (newest first)
                            }

                            async with session.get(
                                'https://gmail.googleapis.com/gmail/v1/users/me/messages',
                                headers=headers,
                                params=params
                            ) as messages_response:
                                messages_response.raise_for_status()
                                messages_data = await messages_response.json()
                                
                                # Get details for each message concurrently
                                message_tasks = []
                                for message in messages_data.get('messages', []):
                                    task = self.get_message_details(session, headers, message['id'], account.email)
                                    message_tasks.append(task)
                                
                                # Process messages in batches
                                batch_size = 10
                                messages = []
                                
                                for i in range(0, len(message_tasks), batch_size):
                                    batch = message_tasks[i:i + batch_size]
                                    batch_results = await asyncio.gather(*batch, return_exceptions=True)
                                    
                                    for result in batch_results:
                                        if result is not None and not isinstance(result, Exception):
                                            messages.append(result)
                                    
                                    if i + batch_size < len(message_tasks):
                                        await asyncio.sleep(0.1)
                                
                                all_messages.extend(messages)
                                
                        except Exception as e:
                            print(f"Error fetching messages for account {account.email}: {str(e)}")
                            continue
                    elif account.account_type == 'outlook':
                        try:
                            # Validate token
                            if not await self._ensure_valid_token(account_dict):
                                continue

                            headers = {
                                'Authorization': f'Bearer {account_dict["access_token"]}',
                                'Content-Type': 'application/json'
                            }
                            
                            # Outlook API endpoint with attachment info and date filter
                            params = {
                                '$top': fetch_size_per_account,  # Fetch more messages
                                '$orderby': 'receivedDateTime desc',
                                '$expand': 'attachments',
                                '$count': 'true',
                                '$filter': f"receivedDateTime ge {one_year_ago.replace('/', '-')}T00:00:00Z"
                            }

                            # Get messages from the inbox folder only
                            async with session.get(
                                'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages',
                                headers=headers,
                                params=params
                            ) as messages_response:
                                messages_response.raise_for_status()
                                messages_data = await messages_response.json()
                                
                                # Get total count from Outlook API
                                if '@odata.count' in messages_data:
                                    estimated_total_count += messages_data['@odata.count']
                                else:
                                    estimated_total_count += len(messages_data.get('value', []))
                                
                                # Process Outlook messages
                                for msg in messages_data.get('value', []):
                                    # Process attachments
                                    attachments = []
                                    for attachment in msg.get('attachments', []):
                                        if attachment.get('@odata.type') == '#microsoft.graph.fileAttachment':
                                            attachments.append({
                                                'id': attachment['id'],
                                                'filename': attachment['name'],
                                                'mimeType': attachment.get('contentType', 'application/octet-stream'),
                                                'data': attachment.get('contentBytes', '')
                                            })

                                    message = {
                                        'id': msg['id'],
                                        'subject': msg.get('subject', 'No Subject'),
                                        'sender': msg.get('from', {}).get('emailAddress', {}).get('address', 'Unknown Sender'),
                                        'preview': msg.get('bodyPreview', '')[:200],
                                        'date': msg['receivedDateTime'],
                                        'content': msg.get('body', {}).get('content', ''),
                                        'hasHtml': msg.get('body', {}).get('contentType', '') == 'html',
                                        'read': msg.get('isRead', False),
                                        'starred': msg.get('flag', {}).get('flagStatus', '') == 'flagged',
                                        'recipientEmail': account.email,
                                        'attachments': attachments
                                    }
                                    all_messages.append(message)
                                    
                        except Exception as e:
                            print(f"Error fetching messages for account {account.email}: {str(e)}")
                            continue

                # Sort all messages by date (newest first) - improved date parsing
                def parse_date_safely(date_str):
                    try:
                        if not date_str:
                            return datetime.min.replace(tzinfo=timezone.utc)
                        
                        # Clean up the date string
                        date_str = date_str.strip()
                        
                        # First try RFC 2822 format (Gmail format) - most common
                        try:
                            from email.utils import parsedate_to_datetime
                            parsed_dt = parsedate_to_datetime(date_str)
                            # Ensure timezone-aware
                            if parsed_dt.tzinfo is None:
                                parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                            return parsed_dt
                        except:
                            pass
                        
                        # Then try ISO format (Outlook format)
                        try:
                            # Handle various ISO formats
                            if date_str.endswith('Z'):
                                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                            elif '+' in date_str[-6:] or '-' in date_str[-6:]:
                                return datetime.fromisoformat(date_str)
                            else:
                                # Assume UTC if no timezone info
                                dt = datetime.fromisoformat(date_str)
                                return dt.replace(tzinfo=timezone.utc)
                        except:
                            pass
                        
                        # Fallback: try general parsing
                        try:
                            from dateutil.parser import parse
                            parsed_dt = parse(date_str)
                            # Ensure timezone-aware
                            if parsed_dt.tzinfo is None:
                                parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                            return parsed_dt
                        except:
                            print(f"Error parsing date '{date_str}': Unable to parse")
                            return datetime.min.replace(tzinfo=timezone.utc)
                            
                    except Exception as e:
                        print(f"Error parsing date '{date_str}': {str(e)}")
                        return datetime.min.replace(tzinfo=timezone.utc)

                all_messages.sort(key=lambda x: parse_date_safely(x.get('date', '')), reverse=True)
                
                # Apply pagination to the sorted messages
                start_idx = offset
                end_idx = offset + page_size
                paginated_messages = all_messages[start_idx:end_idx]
                
                # Use the estimated total count from API calls, fallback to actual fetched count
                total_count = max(estimated_total_count, len(all_messages))
                if end_idx < len(all_messages):
                    next_page_token = str(current_page + 1)
                elif len(all_messages) < total_count:
                    # There might be more messages we haven't fetched yet
                    next_page_token = str(current_page + 1)
                
                # Update all_messages to the paginated subset
                all_messages = paginated_messages
            
            return {
                'messages': all_messages,
                'nextPageToken': next_page_token,
                'totalCount': total_count,
                'currentPage': current_page
            }
            
        except Exception as e:
            print(f"Error in get_inbox_messages: {str(e)}")
            print(traceback.format_exc())
            return {'messages': [], 'nextPageToken': None, 'totalCount': 0, 'currentPage': 1}
    
    async def _process_message_parts(self, parts, content, attachments, headers, session, message_id, depth=0):
        """Recursively process message parts to extract content and attachments"""
        if depth > 10:  # Prevent infinite recursion
            return content

        for part in parts:
            # Skip if part is not a dictionary
            if not isinstance(part, dict):
                continue
                
            mime_type = part.get('mimeType', '')
            
        
            
            if mime_type.startswith('multipart/'):
                if 'parts' in part:
                    content = await self._process_message_parts(part['parts'], content, attachments, headers, session, message_id, depth + 1)
            elif mime_type.startswith('text/'):
                part_content = self._decode_body(part.get('body', {}))
                if part_content:
                    if mime_type == 'text/html':
                        content = part_content
                    elif not content:  # Only use plain text if we don't have HTML
                        content = part_content
            elif mime_type.startswith('image/'):
                # Resim parçasını işle
                try:
                    attachment = {
                        'filename': part.get('filename', 'unnamed_attachment'),
                        'mimeType': mime_type,
                        'inline': bool(part.get('contentId')) or bool(part.get('contentDisposition', '').startswith('inline'))
                    }
                    
                    # Resim verisini al
                    if 'attachmentId' in part.get('body', {}):
                        attachment['id'] = part['body']['attachmentId']
                        async with session.get(
                            f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/attachments/{attachment["id"]}',
                            headers=headers
                        ) as response:
                            if response.status == 200:
                                attachment_data = await response.json()
                                raw_data = attachment_data.get('data', '')
                                
                                # Base64 düzeltmeleri
                                raw_data = raw_data.replace('-', '+').replace('_', '/')
                                padding = len(raw_data) % 4
                                if padding:
                                    raw_data += '=' * (4 - padding)
                                
                                attachment['data'] = raw_data
                                
                                # Inline resim/GIF ise içeriğe ekle
                                if attachment['inline']:
                                    content_id = part.get('contentId', '').strip('<>')
                                    if content_id:
                                        # Debug için
                                        print(f"Replacing CID: {content_id} with data URL")
                                        # İçerikteki CID referansını bul ve değiştir
                                        cid_pattern = f'cid:{content_id}'
                                        data_url = f'data:{mime_type};base64,{raw_data}'
                                        content = content.replace(cid_pattern, data_url)
                                        print(f"Content after replacement contains data URL: {'data:image/gif' in content}")
                    
                    elif 'data' in part.get('body', {}):
                        raw_data = part['body']['data']
                        # Base64 düzeltmeleri
                        raw_data = raw_data.replace('-', '+').replace('_', '/')
                        padding = len(raw_data) % 4
                        if padding:
                            raw_data += '=' * (4 - padding)
                        
                        attachment['data'] = raw_data
                        
                        # Inline resim/GIF ise içeriğe ekle
                        if attachment['inline']:
                            content_id = part.get('contentId', '').strip('<>')
                            if content_id:
                                content = content.replace(
                                    f'cid:{content_id}',
                                    f'data:{mime_type};base64,{raw_data}'
                                )
                    
                    attachments.append(attachment)
                except Exception as e:
                    print(f"Error processing image part: {str(e)}")
                    print(traceback.format_exc())
            
            elif 'attachmentId' in part.get('body', {}) or part.get('filename'):
                # Diğer ekleri işle
                attachment = {
                    'filename': part.get('filename', 'unnamed_attachment'),
                    'mimeType': mime_type,
                    'inline': bool(part.get('contentId')) or bool(part.get('contentDisposition', '').startswith('inline'))
                }
                
                if 'attachmentId' in part.get('body', {}):
                    attachment['id'] = part['body']['attachmentId']
                    try:
                        async with session.get(
                            f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/attachments/{attachment["id"]}',
                            headers=headers
                        ) as response:
                            if response.status == 200:
                                attachment_data = await response.json()
                                raw_data = attachment_data.get('data', '')
                                
                                # Base64 düzeltmeleri
                                raw_data = raw_data.replace('-', '+').replace('_', '/')
                                padding = len(raw_data) % 4
                                if padding:
                                    raw_data += '=' * (4 - padding)
                                
                                attachment['data'] = raw_data
                    except Exception as e:
                        print(f"Error fetching attachment {attachment['id']}: {str(e)}")
                        print(traceback.format_exc())
                
                elif 'data' in part.get('body', {}):
                    raw_data = part['body']['data']
                    # Base64 düzeltmeleri
                    raw_data = raw_data.replace('-', '+').replace('_', '/')
                    padding = len(raw_data) % 4
                    if padding:
                        raw_data += '=' * (4 - padding)
                    
                    attachment['data'] = raw_data
                
                attachments.append(attachment)

        return content

    async def get_message_details(self, session, headers, message_id, account_email):
        """Get detailed message information with retry mechanism for rate limiting"""
        max_retries = 3
        base_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Add format=metadata to get only necessary fields and reduce response size
                async with session.get(
                    f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}',
                    headers=headers,
                    params={
                        'format': 'full',
                        'fields': 'id,labelIds,payload(headers,body,parts),snippet'  # Only get needed fields
                    }
                ) as response:
                    if response.status == 429:  # Rate limit exceeded
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt)  # Exponential backoff
                            print(f"Rate limit hit for message {message_id}, retrying in {delay} seconds...")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            print(f"Max retries exceeded for message {message_id}, skipping...")
                            return None
                    
                    response.raise_for_status()
                    message_data = await response.json()
                    
                    # Process the message data
                    payload = message_data.get('payload', {})
                    headers_list = payload.get('headers', [])
                    
                    # Extract headers using dictionary comprehension for better performance
                    headers_dict = {header.get('name', '').lower(): header.get('value', '') for header in headers_list}
                    
                    subject = headers_dict.get('subject', '')
                    sender = headers_dict.get('from', '')
                    date = headers_dict.get('date', '')
                    recipient = headers_dict.get('delivered-to', headers_dict.get('to', account_email))
                    
                    # Extract body content and attachments
                    content = ''
                    attachments = []
                    
                    # Check if payload has parts or if it's a single part
                    if 'parts' in payload:
                        content = await self._process_message_parts(payload['parts'], content, attachments, headers, session, message_id)
                    else:
                        # Single part message
                        content = await self._process_message_parts([payload], content, attachments, headers, session, message_id)
                    
                    # If content is empty, use snippet as fallback
                    if not content:
                        content = message_data.get('snippet', '')
                    
                    # Clean CID references from content
                    content = self._clean_cid_references(content)
                    
                    return {
                        'id': message_id,
                        'subject': subject,
                        'sender': sender,
                        'preview': content[:200] if content else '',
                        'date': date,
                        'content': content,
                        'hasHtml': True,
                        'read': 'UNREAD' not in message_data.get('labelIds', []),
                        'starred': 'STARRED' in message_data.get('labelIds', []),
                        'recipientEmail': recipient,
                        'attachments': attachments
                    }
                    
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    print(f"Error getting message details for {message_id}: {e}, retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                else:
                    print(f"Error getting message details for {message_id}: {e}")
                    print(traceback.format_exc())
                    return None
        
        return None

    def _clean_cid_references(self, content: str) -> str:
        """Clean up any remaining CID references in the content"""
        if not content:
            return content
            
        # Replace any remaining cid: references with a placeholder
        content = re.sub(
            r'src=["\'](cid:[^"\']+)["\']',
            'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"',
            content
        )
        return content

    def _decode_body(self, body: Dict[str, Any]) -> str:
        """Decode message body from base64"""
        try:
            if 'data' not in body:
                return ''
            
            # Replace URL-safe characters back to their original form
            encoded_data = body['data'].replace('-', '+').replace('_', '/')
            
            # Add padding if necessary
            padding = len(encoded_data) % 4
            if padding:
                encoded_data += '=' * (4 - padding)
            
            return base64.b64decode(encoded_data).decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"Error decoding body: {str(e)}")
            return '' 