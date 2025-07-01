import base64
from email.mime.text import MIMEText
import aiohttp
from datetime import datetime, timezone, timedelta
import os
import json
import traceback
from typing import List, Dict
import asyncio
from bs4 import BeautifulSoup

from repositories.mail_account_repository import MailAccountRepository
from services.mail_account_service import MailAccountService

class EmailService:
    def __init__(self):
        self.mail_account_repo = MailAccountRepository()
        self.mail_account_service = MailAccountService()
        self._session = None

    async def get_aiohttp_session(self):
        """Mevcut bir aiohttp oturumunu döndürür veya yenisini oluşturur."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def close_aiohttp_session(self):
        """Aiohttp oturumunu kapatır."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def _ensure_valid_token(self, account) -> bool:
        """Checks if the token is valid and refreshes it if necessary."""
        try:
            # MailAccount nesnesi kontrolü
            if hasattr(account, 'access_token'):
                # Nesne erişimi için
                access_token = account.access_token
                refresh_token = account.refresh_token
                token_expiry = account.token_expiry
                account_id = account.account_id
                account_type = account.account_type
                email = account.email if hasattr(account, 'email') else "unknown"
            else:
                # Sözlük erişimi için geriye dönük uyumluluk
                access_token = account.get('access_token')
                refresh_token = account.get('refresh_token')
                token_expiry = account.get('token_expiry')
                account_id = account.get('account_id')
                account_type = account.get('account_type')
                email = account.get('email', "unknown")

            if not access_token:
                print(f"No access token found for account {account_id} ({email})")
                return False

            if token_expiry:
                if isinstance(token_expiry, str):
                    try:
                        token_expiry = datetime.fromisoformat(token_expiry.replace('Z', '+00:00'))
                    except ValueError:
                        print(f"Invalid token_expiry format for account {account_id} ({email}): {token_expiry}")
                        token_expiry = datetime.now(timezone.utc) - timedelta(days=1)
                
                if token_expiry.tzinfo is None:
                    token_expiry = token_expiry.replace(tzinfo=timezone.utc)
                
                now = datetime.now(timezone.utc)
                
                print(f"Token check for {email}: Expiry={token_expiry}, Now={now}, Delta={token_expiry - now}")
                
                if token_expiry < (now + timedelta(minutes=30)):
                    print(f"Token expired for account {email} (ID: {account_id}). Attempting refresh...")
                    
                    if not refresh_token:
                        print(f"No refresh token available for account {email}")
                        return False

                    try:
                        new_tokens = None
                        if account_type == 'gmail':
                            print(f"Refreshing Gmail token for {email}")
                            new_tokens = await self.mail_account_service.refresh_gmail_token(refresh_token)
                        elif account_type == 'outlook':
                            print(f"Refreshing Outlook token for {email}")
                            new_tokens = await self.mail_account_service.refresh_outlook_token(refresh_token)
                        else:
                            print(f"Unsupported account type for token refresh: {account_type}")
                            return False

                        if new_tokens and 'access_token' in new_tokens:
                            new_expiry_time = datetime.now(timezone.utc) + timedelta(seconds=new_tokens.get('expires_in', 3600))
                            print(f"Token refresh successful for {email}. New expiry: {new_expiry_time}")
                            
                            await self.mail_account_repo.update_account_tokens(
                                account_id,
                                new_tokens['access_token'],
                                new_tokens.get('refresh_token', refresh_token),
                                new_expiry_time
                            )
                            
                            # MailAccount nesnesi veya sözlük güncellemesi
                            if hasattr(account, 'access_token'):
                                account.access_token = new_tokens['access_token']
                                account.token_expiry = new_expiry_time
                                if 'refresh_token' in new_tokens:
                                    account.refresh_token = new_tokens['refresh_token']
                            else:
                                account['access_token'] = new_tokens['access_token']
                                account['token_expiry'] = new_expiry_time
                                if 'refresh_token' in new_tokens:
                                    account['refresh_token'] = new_tokens['refresh_token']
                        
                            return True
                        else:
                            print(f"Token refresh failed for {email}: Empty or invalid response")
                            return False
                    except Exception as e:
                        print(f"Error during token refresh for {email}: {str(e)}")
                        print(traceback.format_exc())
                        return False
                else:
                    print(f"Token still valid for {email}, continuing...")

            return True

        except Exception as e:
            print(f"Error in _ensure_valid_token: {str(e)}")
            print(traceback.format_exc())
            return False

    async def send_email(
        self,
        user_id: int,
        account_id: int,
        to_recipients: list[str],
        subject: str,
        body: str,
        cc_recipients: list[str] | None = None,
        bcc_recipients: list[str] | None = None,
        attachments: list[dict] | None = None
    ) -> bool:
        """Send an email using the specified user account."""
        try:
            account = await self.mail_account_repo.get_account_by_id(account_id)
            if not account:
                return False

            if hasattr(account, 'user_id'):
                # Nesne erişimi
                if account.user_id != user_id:
                    return False
                account_type = account.account_type
            else:
                # Sözlük erişimi (geriye dönük uyumluluk)
                if account['user_id'] != user_id:
                    return False
                account_type = account.get('account_type')
            
            if not account_type:
                return False

            if not to_recipients:
                return False

            if not await self._ensure_valid_token(account):
                return False

            access_token = account.access_token if hasattr(account, 'access_token') else account['access_token']
            success = False
            session = await self.get_aiohttp_session()
            
            if account_type == 'gmail':
                success = await self._send_via_gmail(session, account, access_token, to_recipients, subject, body, cc_recipients, bcc_recipients, attachments)
            elif account_type == 'outlook':
                success = await self._send_via_outlook(session, account, access_token, to_recipients, subject, body, cc_recipients, bcc_recipients, attachments)
            else:
                return False

            return success

        except Exception as e:
            print(f"Error in send_email: {str(e)}")
            return False

    async def _send_via_gmail(self, session, account: dict, access_token: str, to_recipients: list[str], subject: str, body: str, cc_recipients: list[str] | None = None, bcc_recipients: list[str] | None = None, attachments: list[dict] | None = None) -> bool:
        """Send email using Gmail API."""
        try:
            if not access_token:
                return False
            
            # Get sender email from account
            sender_email = account.email if hasattr(account, 'email') else account.get('email', '')
            
            if not sender_email:
                print("Cannot send email: Sender email address not found in account")
                return False

            from email.mime.multipart import MIMEMultipart
            from email.mime.base import MIMEBase
            from email import encoders

            # Create message container
            message = MIMEMultipart()
            message['From'] = sender_email
            message['To'] = ', '.join(to_recipients)
            message['Subject'] = subject

            if cc_recipients:
                message['Cc'] = ', '.join(cc_recipients)
            if bcc_recipients:
                message['Bcc'] = ', '.join(bcc_recipients)

            # Add HTML body
            html_part = MIMEText(body, 'html')
            message.attach(html_part)

            # Add attachments
            if attachments:
                for attachment in attachments:
                    filename = attachment.get('filename')
                    data = attachment.get('data')
                    mime_type = attachment.get('mimeType', 'application/octet-stream')

                    if filename and data:
                        part = MIMEBase(*mime_type.split('/', 1))
                        part.set_payload(base64.b64decode(data))
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename="{filename}"'
                        )
                        message.attach(part)

            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

            url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            data = {"raw": raw_message}

            async with session.post(url, headers=headers, json=data) as response:
                if response.status == 200:
                    return True
                else:
                    error_text = await response.text()
                    print(f"Gmail API error: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _send_via_gmail: {str(e)}")
            print(traceback.format_exc())
            return False

    async def _send_via_outlook(self, session, account: dict, access_token: str, to_recipients: list[str], subject: str, body: str, cc_recipients: list[str] | None = None, bcc_recipients: list[str] | None = None, attachments: list[dict] | None = None) -> bool:
        """Send email using Outlook/Microsoft Graph API."""
        try:
            if not access_token:
                return False

            url = "https://graph.microsoft.com/v1.0/me/sendMail"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            # Prepare attachments if any
            message_attachments = []
            if attachments:
                for attachment in attachments:
                    filename = attachment.get('filename')
                    data = attachment.get('data')
                    mime_type = attachment.get('mimeType', 'application/octet-stream')

                    if filename and data:
                        message_attachments.append({
                            "@odata.type": "#microsoft.graph.fileAttachment",
                            "name": filename,
                            "contentType": mime_type,
                            "contentBytes": data
                        })

            # Prepare email data
            email_data = {
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML",
                        "content": body
                    },
                    "toRecipients": [{"emailAddress": {"address": email}} for email in to_recipients]
                }
            }

            if cc_recipients:
                email_data["message"]["ccRecipients"] = [{"emailAddress": {"address": email}} for email in cc_recipients]
            if bcc_recipients:
                email_data["message"]["bccRecipients"] = [{"emailAddress": {"address": email}} for email in bcc_recipients]
            if message_attachments:
                email_data["message"]["attachments"] = message_attachments

            async with session.post(url, headers=headers, json=email_data) as response:
                if response.status == 202:
                    return True
                else:
                    error_text = await response.text()
                    print(f"Microsoft Graph API error: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _send_via_outlook: {str(e)}")
            print(traceback.format_exc())
            return False

    async def get_sent_emails(self, user_id: int, limit: int = 50, offset: int = 0) -> dict:
        """Kullanıcının gönderilen maillerini getirir (MailAccountService'teki implementasyonu kullanır)."""
        try:
            result = await self.mail_account_service.get_sent_emails(user_id, limit, offset)
            return result

        except Exception as e:
            print(f"Error in EmailService get_sent_emails (calling MailAccountService): {str(e)}")
            print(traceback.format_exc())
            return {'sent_emails': [], 'total_count': 0}

    async def delete_email(self, user_id: int, account_id: int, message_id: str) -> bool:
        """Delete an email from the specified account."""
        try:
            account = await self.mail_account_repo.get_account_by_id(account_id)
            if not account or account.user_id != user_id:
                return False

            if not await self._ensure_valid_token(account):
                return False

            access_token = account.access_token
            session = await self.get_aiohttp_session()
            success = False

            if account.account_type == 'gmail':
                success = await self._delete_via_gmail(session, account, access_token, message_id)
            elif account.account_type == 'outlook':
                success = await self._delete_via_outlook(session, account, access_token, message_id)
            else:
                return False

            return success

        except Exception as e:
            print(f"Error in delete_email: {str(e)}")
            print(f"Full traceback: {traceback.format_exc()}")
            return False

    async def _delete_via_gmail(self, session, account, access_token: str, message_id: str) -> bool:
        """Delete an email via Gmail API (move to trash)."""
        try:
            if not access_token:
                return False

            async with session.post(
                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/trash',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
            ) as response:
                if response.status == 200:
                    return True
                else:
                    error_text = await response.text()
                    print(f"Gmail API delete error: Status {response.status}, Response: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _delete_via_gmail: {str(e)}")
            return False

    async def _delete_via_outlook(self, session, account, access_token: str, message_id: str) -> bool:
        """Delete an email via Microsoft Graph API (move to deleteditems folder)."""
        try:
            if not access_token:
                return False

            async with session.post(
                f'https://graph.microsoft.com/v1.0/me/messages/{message_id}/move',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                },
                json={
                    'destinationId': 'deleteditems'
                }
            ) as response:
                if response.status == 201:
                    return True
                else:
                    error_text = await response.text()
                    print(f"Outlook API delete error: Status {response.status}, Response: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _delete_via_outlook: {str(e)}")
            return False

    async def get_deleted_emails(self, user_id: int, limit: int = 50, offset: int = 0) -> dict:
        """Get deleted emails for a user by fetching from provider APIs."""
        try:
            accounts = await self.mail_account_repo.get_user_accounts(user_id)
            if not accounts:
                return {'deleted_emails': [], 'total_count': 0}
            session = await self.get_aiohttp_session()

            fetch_tasks = []
            for account in accounts:
                fetch_tasks.append(self._fetch_deleted_for_account(session, account, user_id, limit, offset))

            results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

            all_messages = []
            for result in results:
                if isinstance(result, Exception):
                    print(f"Error fetching deleted emails for one account: {result}")
                elif isinstance(result, list):
                    all_messages.extend(result)

            all_messages.sort(key=lambda x: self.mail_account_service._parse_email_date(x.get('sent_at', '')), reverse=True)

            total_count = len(all_messages)
            paginated_messages = all_messages[offset : offset + limit]

            # Add account_email to each message
            for message in paginated_messages:
                account_id = message.get('account_id')
                account = next((acc for acc in accounts if (hasattr(acc, 'account_id') and acc.account_id == account_id) or 
                                                        (not hasattr(acc, 'account_id') and acc['account_id'] == account_id)), None)
                if account:
                    message['account_email'] = account.email if hasattr(account, 'email') else account.get('email', 'Bilinmiyor')

            return {
                'deleted_emails': paginated_messages,
                'total_count': total_count
            }

        except Exception as e:
            print(f"Critical Error in get_deleted_emails for user_id {user_id}: {str(e)}")
            print(f"Full traceback: {traceback.format_exc()}")
            return {'deleted_emails': [], 'total_count': 0}

    async def _fetch_deleted_for_account(self, session, account, user_id: int, limit: int, offset: int) -> list:
        """Helper function to fetch deleted emails for a single account from its API."""
        account_id = account.account_id if hasattr(account, 'account_id') else account['account_id']
        account_type = account.account_type if hasattr(account, 'account_type') else account['account_type']

        if not await self._ensure_valid_token(account):
            return []

        account_messages = []
        access_token = account.access_token if hasattr(account, 'access_token') else account['access_token']
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        try:
            if account_type == 'gmail':
                gmail_limit = 200
                params = {
                    'maxResults': gmail_limit,
                    'labelIds': ['TRASH'],
                    'includeSpamTrash': 'true'
                }
                async with session.get(
                    'https://gmail.googleapis.com/gmail/v1/users/me/messages',
                    headers=headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        messages_list = data.get('messages', [])

                        if not messages_list:
                            return []

                        message_tasks = []
                        for msg_ref in messages_list:
                            message_id = msg_ref['id']
                            task = self.mail_account_service.get_gmail_message_details(session, headers, message_id, account, user_id)
                            message_tasks.append(task)

                        if message_tasks:
                            batch_results = await asyncio.gather(*message_tasks, return_exceptions=True)
                            valid_messages = [msg for msg in batch_results if msg is not None and not isinstance(msg, Exception)]
                            account_messages.extend(valid_messages)
                        return account_messages

                    else:
                        error_text = await response.text()
                        print(f"ERROR fetching Gmail TRASH message list for account {account_id}: Status {response.status}, Response: {error_text}")
                        return []

            elif account_type == 'outlook':
                outlook_limit = 200
                params = {
                    '$top': outlook_limit,
                    '$orderby': 'receivedDateTime desc',
                    '$select': 'id,subject,from,toRecipients,ccRecipients,bccRecipients,sentDateTime,body,hasAttachments,internetMessageId',
                    '$expand': 'attachments($select=id,name,contentType,size,isInline)'
                }
                async with session.get(
                    'https://graph.microsoft.com/v1.0/me/mailFolders/deleteditems/messages',
                    headers=headers,
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        messages_list = data.get('value', [])

                        if not messages_list:
                            return []

                        for msg in messages_list:
                            to_recipients_list = [r.get('emailAddress', {}).get('address', '') for r in msg.get('toRecipients', [])]
                            cc_recipients_list = [r.get('emailAddress', {}).get('address', '') for r in msg.get('ccRecipients', [])]
                            bcc_recipients_list = [r.get('emailAddress', {}).get('address', '') for r in msg.get('bccRecipients', [])]
                            
                            # Get full message body and content type
                            body_content = msg.get('body', {}).get('content', '')
                            content_type = msg.get('body', {}).get('contentType', 'text')
                            
                            # Process attachments and inline images
                            attachments = []
                            if msg.get('hasAttachments', False):
                                for attachment in msg.get('attachments', []):
                                    attachment_data = {
                                        'id': attachment.get('id', ''),
                                        'name': attachment.get('name', ''),
                                        'contentType': attachment.get('contentType', ''),
                                        'size': attachment.get('size', 0),
                                        'isInline': attachment.get('isInline', False)
                                    }
                                    
                                    # Generate a direct download URL for the attachment
                                    attachment_url = f"https://graph.microsoft.com/v1.0/me/messages/{msg.get('id')}/attachments/{attachment_data['id']}/$value"
                                    attachment_data['url'] = attachment_url
                                    
                                    # If it's an inline image, replace the source in HTML content
                                    if attachment_data['isInline'] and 'image' in attachment_data['contentType'].lower():
                                        # Find the image reference in the HTML content
                                        img_filename = attachment_data['name']
                                        body_content = body_content.replace(f'src="{img_filename}"', f'src="{attachment_url}"')
                                        body_content = body_content.replace(f"src='{img_filename}'", f"src='{attachment_url}'")
                                    
                                    attachments.append(attachment_data)

                            message = {
                                'message_id': msg.get('id', ''),
                                'account_id': account_id,
                                'user_id': user_id,
                                'from': msg.get('from', {}).get('emailAddress', {}).get('address', account.email if hasattr(account, 'email') else account.get('email', 'Unknown')),
                                'to_recipients': [addr for addr in to_recipients_list if addr],
                                'cc_recipients': [addr for addr in cc_recipients_list if addr],
                                'bcc_recipients': [addr for addr in bcc_recipients_list if addr],
                                'subject': msg.get('subject', ''),
                                'body': body_content,
                                'body_type': content_type,
                                'sent_at': msg.get('sentDateTime', ''),
                                'created_date': datetime.now(timezone.utc).isoformat(),
                                'has_attachments': msg.get('hasAttachments', False),
                                'attachments': attachments,
                                'access_token': access_token  # Include access token for attachment downloads
                            }
                            account_messages.append(message)
                        return account_messages
                    else:
                        error_text = await response.text()
                        print(f"ERROR fetching Outlook deleted items for account {account_id}: Status {response.status}, Response: {error_text}")
                        return []

            else:
                return []

        except aiohttp.ClientError as e:
            print(f"Network Error processing account {account_id} ({account_type}): {str(e)}")
            return []
        except Exception as e:
            print(f"Unexpected Error processing account {account_id} ({account_type}): {str(e)}")
            print(f"Full traceback: {traceback.format_exc()}")
            return []

    async def restore_email(self, user_id: int, account_id: int, message_id: str) -> bool:
        """Restore a deleted email."""
        try:
            account = await self.mail_account_repo.get_account_by_id(account_id)
            if not account or account.user_id != user_id:
                return False

            if not await self._ensure_valid_token(account):
                return False

            session = await self.get_aiohttp_session()
            success = False

            if account.account_type == 'gmail':
                success = await self._restore_via_gmail(session, account, account.access_token, message_id)
            elif account.account_type == 'outlook':
                success = await self._restore_via_outlook(session, account, account.access_token, message_id)

            if success:
                # Mail başarıyla geri getirildiğinde deleted_emails tablosundan sil
                try:
                    await self.mail_account_repo.remove_from_deleted_emails(account_id, message_id)
                except Exception as e:
                    print(f"Error removing from deleted_emails: {str(e)}")
                    # Ana işlem başarılı olduğu için bu hatayı yutabiliriz
                    pass

            return success

        except Exception as e:
            print(f"Error in restore_email: {str(e)}")
            print(traceback.format_exc())
            return False

    async def _restore_via_gmail(self, session, account: dict, access_token: str, message_id: str) -> bool:
        """Restore a deleted email via Gmail API."""
        try:
            # Gmail'de silinen mailler 'TRASH' etiketine taşınır
            async with session.post(
                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                },
                json={
                    'removeLabelIds': ['TRASH'],
                    'addLabelIds': ['INBOX']
                }
            ) as response:
                if response.status == 200:
                    return True
                else:
                    error_text = await response.text()
                    print(f"Gmail restore error: Status {response.status}, Response: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _restore_via_gmail: {str(e)}")
            return False

    async def _restore_via_outlook(self, session, account: dict, access_token: str, message_id: str) -> bool:
        """Restore a deleted email via Microsoft Graph API."""
        try:
            # Outlook'ta silinen mailler 'deleteditems' klasörüne taşınır
            async with session.post(
                f'https://graph.microsoft.com/v1.0/me/messages/{message_id}/move',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                },
                json={
                    'destinationId': 'inbox'
                }
            ) as response:
                if response.status == 201:  # Outlook 201 döndürür başarılı move işlemlerinde
                    return True
                else:
                    error_text = await response.text()
                    print(f"Outlook restore error: Status {response.status}, Response: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _restore_via_outlook: {str(e)}")
            return False

    async def permanent_delete_email(self, user_id: int, account_id: int, message_id: str) -> bool:
        """Permanently delete an email from trash."""
        try:
            account = await self.mail_account_repo.get_account_by_id(account_id)
            if not account:
                raise Exception(f"Account not found for account_id: {account_id}")

            if hasattr(account, 'user_id'):
                # Nesne erişimi
                if account.user_id != user_id:
                    raise Exception(f"Account {account_id} does not belong to user {user_id}")
                account_type = account.account_type
            else:
                # Sözlük erişimi
                if account['user_id'] != user_id:
                    raise Exception(f"Account {account_id} does not belong to user {user_id}")
                account_type = account.get('account_type')

            if not await self._ensure_valid_token(account):
                raise Exception(f"Token validation/refresh failed for account_id: {account_id}")

            access_token = account.access_token if hasattr(account, 'access_token') else account['access_token']
            session = await self.get_aiohttp_session()

            if account_type == 'gmail':
                return await self._permanent_delete_via_gmail(session, account, access_token, message_id)
            elif account_type == 'outlook':
                return await self._permanent_delete_via_outlook(session, account, access_token, message_id)
            else:
                error_msg = f"Unsupported account type: {account_type}"
                raise Exception(error_msg)

        except Exception as e:
            error_msg = f"Error in permanent_delete_email: {str(e)}"
            print(error_msg)
            print(f"Full traceback: {traceback.format_exc()}")
            raise Exception(error_msg)

    async def _permanent_delete_via_gmail(self, session, account: dict, access_token: str, message_id: str) -> bool:
        """Permanently delete email from Gmail."""
        try:
            async with session.post(
                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                },
                json={
                    'addLabelIds': ['TRASH'],
                    'removeLabelIds': ['INBOX']
                }
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Error moving Gmail message to TRASH: {error_text}")
                    return False

            await asyncio.sleep(1)

            async with session.delete(
                f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}',
                headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 204:
                    return True
                else:
                    error_text = await response.text()
                    print(f"Error permanently deleting Gmail message: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _permanent_delete_via_gmail: {str(e)}")
            return False

    async def _permanent_delete_via_outlook(self, session, account: dict, access_token: str, message_id: str) -> bool:
        """Permanently delete email from Outlook."""
        try:
            async with session.delete(
                f'https://graph.microsoft.com/v1.0/me/messages/{message_id}',
                headers={'Authorization': f'Bearer {access_token}'}
            ) as response:
                if response.status == 204:
                    return True
                else:
                    error_text = await response.text()
                    print(f"Error permanently deleting Outlook message: {error_text}")
                    return False

        except Exception as e:
            print(f"Error in _permanent_delete_via_outlook: {str(e)}")
            return False

    async def get_inbox_messages(self, user_id: int, account_id: str = None, page_token: str = None, page_size: int = 25) -> dict:
        """Get inbox messages for a user's account or all accounts."""
        try:
            if account_id:
                # Belirli bir hesap için mailleri getir
                account = await self.mail_account_repo.get_account_by_id(int(account_id))
                if not account or account.user_id != user_id:
                    return {"messages": [], "nextPageToken": None}

                if not await self._ensure_valid_token(account):
                    return {"messages": [], "nextPageToken": None}

                session = await self.get_aiohttp_session()
                messages = []
                next_token = None

                try:
                    if account.account_type == 'gmail':
                        response = await self._get_gmail_messages(session, account, page_token, page_size)
                        messages = response.get('messages', [])
                        next_token = response.get('nextPageToken')
                    elif account.account_type == 'outlook':
                        response = await self._get_outlook_messages(session, account, page_token, page_size)
                        messages = response.get('messages', [])
                        next_token = response.get('nextPageToken')

                    # Her maile hesap bilgilerini ekle
                    messages = [{
                        **msg,
                        'account_id': account.account_id,
                        'account_email': account.email,
                        'account_type': account.account_type
                    } for msg in messages]

                    # Optimized filtering for specific account
                    filtered_messages = []
                    account_email_lower = account.email.lower()
                    
                    for msg in messages:
                        # Early skip for empty/invalid messages
                        if not msg.get('id'):
                            continue

                        # Optimized ID format checking
                        msg_id = msg['id']
                        is_outlook_format = len(msg_id) > 30 or '=' in msg_id or ':' in msg_id
                        
                        # Skip if message format doesn't match account type
                        if account.account_type == 'outlook' and not is_outlook_format:
                            continue
                        elif account.account_type == 'gmail' and is_outlook_format:
                            continue

                        # Priority: Direct recipient email match (most reliable)
                        recipient_email = msg.get('recipientEmail', '').lower().strip()
                        if recipient_email and recipient_email == account_email_lower:
                            filtered_messages.append(msg)
                            continue

                        # Fallback: Check if message belongs to this account via other means
                        # This is kept minimal to improve performance
                        sender = msg.get('sender', '').lower()
                        if account_email_lower in sender:
                            filtered_messages.append(msg)
                            continue

                    return {
                        "messages": filtered_messages,
                        "nextPageToken": next_token,
                        "totalMessages": len(filtered_messages)
                    }

                except Exception as e:
                    print(f"Error fetching messages for account {account.email}: {str(e)}")
                    return {"messages": [], "nextPageToken": None}

            else:
                # Tüm hesaplar için mailleri getir
                accounts = await self.mail_account_repo.get_accounts_by_user_id(user_id)
                all_messages = []
                
                session = await self.get_aiohttp_session()
                
                # Her hesaptan paralel olarak mailleri çek
                async def fetch_account_messages(account):
                    try:
                        if not await self._ensure_valid_token(account):
                            return []

                        if account.account_type == 'gmail':
                            response = await self._get_gmail_messages(session, account, None, page_size)
                            messages = response.get('messages', [])
                        elif account.account_type == 'outlook':
                            response = await self._get_outlook_messages(session, account, None, page_size)
                            messages = response.get('messages', [])
                        else:
                            return []

                        # Her maile hesap bilgisini ekle
                        return [{
                            **msg,
                            'account_id': account.account_id,
                            'account_email': account.email,
                            'account_type': account.account_type
                        } for msg in messages]
                    except Exception as e:
                        print(f"Error fetching messages for account {account.email}: {str(e)}")
                        return []

                # Tüm hesaplardan paralel olarak mail çek
                tasks = [fetch_account_messages(account) for account in accounts]
                message_lists = await asyncio.gather(*tasks)
                
                # Tüm mesajları birleştir
                for messages in message_lists:
                    all_messages.extend(messages)

                # Tarihleri datetime objesine çevir ve sırala
                def parse_date(date_str):
                    try:
                        if not date_str:
                            return datetime.min.replace(tzinfo=timezone.utc)
                        
                        # Clean up the date string
                        date_str = date_str.strip()
                        
                        # First try RFC 2822 format (Gmail format) - most common
                        try:
                            from email.utils import parsedate_to_datetime
                            return parsedate_to_datetime(date_str)
                        except:
                            pass
                        
                        # Then try ISO format (Outlook format)
                        if 'T' in date_str:
                            # ISO format (Outlook)
                            if date_str.endswith('Z'):
                                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                            elif '+' in date_str or date_str.count('-') > 2:
                                return datetime.fromisoformat(date_str)
                            else:
                                # Add UTC timezone if missing
                                return datetime.fromisoformat(date_str + '+00:00')
                        
                        # Fallback: try to parse as simple date
                        return datetime.fromisoformat(date_str)
                        
                    except Exception as e:
                        print(f"Error parsing date '{date_str}': {e}")
                        return datetime.min.replace(tzinfo=timezone.utc)

                # Tüm mesajları tarihe göre sırala
                all_messages.sort(key=lambda x: parse_date(x.get('date', '')), reverse=True)
                
                # Sayfalama için mesajları böl
                start_idx = 0 if not page_token else int(page_token)
                end_idx = start_idx + page_size
                paginated_messages = all_messages[start_idx:end_idx]
                
                next_token = str(end_idx) if end_idx < len(all_messages) else None

                return {
                    "messages": paginated_messages,
                    "nextPageToken": next_token,
                    "totalMessages": len(all_messages)
                }

        except Exception as e:
            print(f"Error in get_inbox_messages: {str(e)}")
            print(traceback.format_exc())
            return {"messages": [], "nextPageToken": None}

    async def _get_gmail_messages(self, session, account, page_token: str = None, page_size: int = 25) -> dict:
        """Get Gmail messages with pagination."""
        try:
            access_token = account.access_token if hasattr(account, 'access_token') else account['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get date 2 years ago
            one_year_ago = (datetime.now() - timedelta(days=730)).strftime('%Y/%m/%d')
            
            params = {
                'maxResults': min(page_size, 50),
                'q': f'in:inbox -from:me after:{one_year_ago}',
                'orderBy': 'desc'
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
                
                # Get message details
                messages = []
                for message in messages_data.get('messages', []):
                    try:
                        async with session.get(
                            f'https://gmail.googleapis.com/gmail/v1/users/me/messages/{message["id"]}',
                            headers=headers
                        ) as detail_response:
                            detail_response.raise_for_status()
                            detail_data = await detail_response.json()
                            
                            # Extract message details
                            headers_dict = {}
                            for header in detail_data.get('payload', {}).get('headers', []):
                                headers_dict[header['name']] = header['value']
                            
                            # Get body content
                            body_content = ""
                            payload = detail_data.get('payload', {})
                            if 'parts' in payload:
                                for part in payload['parts']:
                                    if part.get('mimeType') == 'text/html' or part.get('mimeType') == 'text/plain':
                                        body_data = part.get('body', {}).get('data', '')
                                        if body_data:
                                            body_content = base64.urlsafe_b64decode(body_data + '===').decode('utf-8', errors='ignore')
                                            break
                            else:
                                body_data = payload.get('body', {}).get('data', '')
                                if body_data:
                                    body_content = base64.urlsafe_b64decode(body_data + '===').decode('utf-8', errors='ignore')
                            
                            message_obj = {
                                'id': message['id'],
                                'subject': headers_dict.get('Subject', 'No Subject'),
                                'sender': headers_dict.get('From', 'Unknown Sender'),
                                'preview': body_content[:200] if body_content else '',
                                'date': headers_dict.get('Date', ''),
                                'content': body_content,
                                'hasHtml': 'text/html' in str(payload),
                                'read': 'UNREAD' not in detail_data.get('labelIds', []),
                                'starred': 'STARRED' in detail_data.get('labelIds', []),
                                'recipientEmail': account.email if hasattr(account, 'email') else account.get('email', ''),
                                'attachments': []
                            }
                            messages.append(message_obj)
                            
                    except Exception as e:
                        print(f"Error getting Gmail message details: {str(e)}")
                        continue
                
                return {
                    'messages': messages,
                    'nextPageToken': messages_data.get('nextPageToken')
                }
                
        except Exception as e:
            print(f"Error in _get_gmail_messages: {str(e)}")
            return {'messages': [], 'nextPageToken': None}

    async def _get_outlook_messages(self, session, account, page_token: str = None, page_size: int = 25) -> dict:
        """Get Outlook messages with pagination."""
        try:
            access_token = account.access_token if hasattr(account, 'access_token') else account['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get date 2 years ago
            one_year_ago = (datetime.now() - timedelta(days=730)).strftime('%Y-%m-%d')
            
            # Calculate skip value for pagination
            skip_value = 0
            if page_token:
                try:
                    skip_value = int(page_token)
                except:
                    skip_value = 0
            
            params = {
                '$top': page_size,
                '$orderby': 'receivedDateTime desc',
                '$expand': 'attachments',
                '$count': 'true',
                '$filter': f"receivedDateTime ge {one_year_ago}T00:00:00Z",
                '$skip': skip_value
            }

            async with session.get(
                'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages',
                headers=headers,
                params=params
            ) as messages_response:
                messages_response.raise_for_status()
                messages_data = await messages_response.json()
                
                messages = []
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
                        'recipientEmail': account.email if hasattr(account, 'email') else account.get('email', ''),
                        'attachments': attachments
                    }
                    messages.append(message)
                
                # Calculate next page token
                next_token = None
                total_count = messages_data.get('@odata.count', len(messages))
                if skip_value + page_size < total_count:
                    next_token = str(skip_value + page_size)
                
                return {
                    'messages': messages,
                    'nextPageToken': next_token
                }
                
        except Exception as e:
            print(f"Error in _get_outlook_messages: {str(e)}")
            return {'messages': [], 'nextPageToken': None}

__all__ = ['EmailService']