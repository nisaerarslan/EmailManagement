import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Outlook OAuth 2.0 settings
OUTLOOK_CLIENT_ID = os.getenv('OUTLOOK_CLIENT_ID')
OUTLOOK_CLIENT_SECRET = os.getenv('OUTLOOK_CLIENT_SECRET')
OUTLOOK_REDIRECT_URI = "http://localhost:8000/api/mail-accounts/outlook/callback"
OUTLOOK_AUTH_URI = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
OUTLOOK_TOKEN_URI = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
OUTLOOK_SCOPE = [
    "offline_access",
    "Mail.Read",
    "Mail.Send",
    "User.Read"
] 