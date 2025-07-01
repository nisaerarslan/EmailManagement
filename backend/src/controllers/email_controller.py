from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException
import traceback
import re
import base64

from services.email_service import EmailService

# Define the blueprint for email related endpoints
email_bp = Blueprint('email', url_prefix='/api/emails')
email_service = EmailService()

@email_bp.post('/send')
async def send_email_handler(request):
    """API Endpoint to send an email."""
    try:
        user_id = request.ctx.user_id # Get user ID from auth middleware
        data = request.json

        # Validate required fields
        required_fields = ['account_id', 'to_recipients', 'subject', 'body']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            raise SanicException(f"Missing required fields: {', '.join(missing_fields)}", status_code=400)

        # Extract data
        account_id = data['account_id']
        to_recipients = data['to_recipients']
        subject = data['subject']
        body = data['body']
        cc_recipients = data.get('cc_recipients') # Optional
        bcc_recipients = data.get('bcc_recipients') # Optional
        attachments = data.get('attachments', []) # Optional, list of attachment objects

        # Input type validation (basic)
        if not isinstance(account_id, int):
            raise SanicException("Invalid account_id: Must be an integer.", status_code=400)
        if not isinstance(to_recipients, list) or not all(isinstance(r, str) for r in to_recipients):
            raise SanicException("Invalid to_recipients: Must be a list of strings.", status_code=400)

        # Validate attachments format
        if attachments and not isinstance(attachments, list):
            raise SanicException("Invalid attachments: Must be a list of attachment objects.", status_code=400)
        
        for attachment in attachments:
            if not isinstance(attachment, dict) or 'filename' not in attachment or 'data' not in attachment:
                raise SanicException("Invalid attachment format: Each attachment must have filename and data.", status_code=400)
            
            # Validate base64 data
            try:
                base64.b64decode(attachment['data'])
            except Exception:
                raise SanicException(f"Invalid attachment data for {attachment['filename']}: Must be base64 encoded.", status_code=400)

        # Validate email addresses
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        invalid_emails = []
        
        for email in to_recipients:
            if not re.match(email_pattern, email):
                invalid_emails.append(email)
        
        if cc_recipients:
            for email in cc_recipients:
                if not re.match(email_pattern, email):
                    invalid_emails.append(email)
        
        if bcc_recipients:
            for email in bcc_recipients:
                if not re.match(email_pattern, email):
                    invalid_emails.append(email)
        
        if invalid_emails:
            raise SanicException(f"Invalid email addresses: {', '.join(invalid_emails)}", status_code=400)

        print(f"Sending email for user {user_id} via account {account_id}")
        success = await email_service.send_email(
            user_id=user_id,
            account_id=account_id,
            to_recipients=to_recipients,
            subject=subject,
            body=body,
            cc_recipients=cc_recipients,
            bcc_recipients=bcc_recipients,
            attachments=attachments
        )

        if success:
            return json({'success': True, 'message': 'Email sent successfully'})
        else:
            # Service layer should have logged the specific error
            raise SanicException("Failed to send email. Check server logs for details.", status_code=500)

    except SanicException as se:
        print(f"Validation or Client Error: {se}")
        return json({'error': str(se)}, status=se.status_code)
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@email_bp.get('/sent')
async def get_sent_emails_handler(request):
    """API Endpoint to get sent emails for the authenticated user."""
    try:
        user_id = request.ctx.user_id
        limit = int(request.args.get('limit', '50'))
        offset = int(request.args.get('offset', '0'))

        print(f"Fetching sent emails for user {user_id} with limit={limit}, offset={offset}")
        result = await email_service.get_sent_emails(user_id, limit, offset)

        return json(result)  # Return the entire result object which includes sent_emails and total_count

    except Exception as e:
        print(f"Error fetching sent emails: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@email_bp.delete('/<account_id:int>/<message_id>')
async def delete_email_handler(request, account_id: int, message_id: str):
    """API Endpoint to delete an email."""
    try:
        user_id = request.ctx.user_id
        print(f"Deleting email {message_id} from account {account_id} for user {user_id}")
        
        success = await email_service.delete_email(user_id, account_id, message_id)
        
        if success:
            return json({'success': True, 'message': 'Email deleted successfully'})
        else:
            return json({'error': 'Failed to delete email'}, status=500)
            
    except Exception as e:
        print(f"Error deleting email: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@email_bp.get('/deleted')
async def get_deleted_emails_handler(request):
    """API Endpoint to get deleted emails for the authenticated user."""
    try:
        user_id = request.ctx.user_id
        limit = int(request.args.get('limit', '50'))
        offset = int(request.args.get('offset', '0'))

        print(f"Fetching deleted emails for user {user_id} with limit={limit}, offset={offset}")
        result = await email_service.get_deleted_emails(user_id, limit, offset)

        return json(result)  # Return the entire result object which includes deleted_emails and total_count

    except Exception as e:
        print(f"Error fetching deleted emails: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@email_bp.post('/restore/<account_id:int>/<message_id>')
async def restore_email_handler(request, account_id: int, message_id: str):
    """API Endpoint to restore an email from trash."""
    try:
        user_id = request.ctx.user_id
        print(f"Restoring email {message_id} from account {account_id} for user {user_id}")
        
        success = await email_service.restore_email(user_id, account_id, message_id)
        
        if success:
            return json({'success': True, 'message': 'Email restored successfully'})
        else:
            return json({'error': 'Failed to restore email'}, status=500)
            
    except Exception as e:
        print(f"Error restoring email: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@email_bp.delete('/permanent/<account_id:int>/<message_id>')
async def permanent_delete_email_handler(request, account_id: int, message_id: str):
    """API Endpoint to permanently delete an email from trash."""
    try:
        user_id = request.ctx.user_id
        print(f"Permanently deleting email {message_id} from account {account_id} for user {user_id}")
        
        success = await email_service.permanent_delete_email(user_id, account_id, message_id)
        
        if success:
            return json({'success': True, 'message': 'Email permanently deleted successfully'})
        else:
            return json({'error': 'Failed to permanently delete email'}, status=500)
            
    except Exception as e:
        print(f"Error permanently deleting email: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500) 