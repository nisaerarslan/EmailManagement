import os

GMAIL_CONFIG = {
    'CLIENT_ID': os.getenv('GMAIL_CLIENT_ID'),
    'CLIENT_SECRET': os.getenv('GMAIL_CLIENT_SECRET'),
    'AUTH_URI': 'https://accounts.google.com/o/oauth2/auth',
    'TOKEN_URI': 'https://oauth2.googleapis.com/token',
    'REDIRECT_URI': 'http://localhost:5173/gmail/callback'
} 