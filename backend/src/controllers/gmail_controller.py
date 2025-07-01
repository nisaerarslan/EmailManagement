from sanic import Blueprint, response
from services.gmail_service import GmailService
from models.mail_account import MailAccount

gmail_bp = Blueprint('gmail', url_prefix='/api/gmail')

@gmail_bp.get("/auth/url")
async def get_auth_url(request):
    try:
        auth_url = GmailService.get_auth_url()
        return response.json({"url": auth_url})
    except Exception as e:
        return response.json({"error": str(e)}, status=500)

@gmail_bp.get("/auth/callback")
async def auth_callback(request):
    try:
        code = request.args.get('code')
        if not code:
            return response.json({"error": "Authorization code not found"}, status=400)
        
        # Get user from request context (set by auth middleware)
        user = request.ctx.user
        
        # Exchange code for tokens
        tokens = GmailService.exchange_code_for_tokens(code)
        
        # Get user email
        user_email = GmailService.get_user_email(tokens['access_token'])
        
        # Create or update mail account
        account = await MailAccount.create(
            user_id=user.id,
            email=user_email,
            provider='gmail',
            access_token=tokens['access_token'],
            refresh_token=tokens.get('refresh_token'),
            token_expires_at=tokens.get('expires_at')
        )
        
        return response.json(account.to_dict())
    except Exception as e:
        return response.json({"error": str(e)}, status=500)

@gmail_bp.get("/emails")
async def get_emails(request):
    try:
        # Get user from request context
        user = request.ctx.user
        
        # Get mail account
        account = await MailAccount.get_by_id(request.args.get('account_id'))
        if not account or account.user_id != user.id:
            return response.json({"error": "Account not found"}, status=404)
        
        # Get emails using Gmail service
        emails = await GmailService.get_emails(account.access_token)
        
        return response.json({"emails": emails})
    except Exception as e:
        return response.json({"error": str(e)}, status=500) 