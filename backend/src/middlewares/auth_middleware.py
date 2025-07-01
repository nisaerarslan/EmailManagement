from sanic.response import json
import jwt
from functools import wraps

PUBLIC_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/mail-accounts/gmail/callback',  # OAuth callback should be public
    '/api/systemmail',  # SystemMail endpoints should be public
    '/api/systemmail/auth-url',
    '/api/systemmail/callback',
    '/api/systemmail/update-email',
]

async def auth_middleware(request):
    # Skip authentication for certain endpoints
    if request.path.startswith('/api/mail-accounts/outlook/callback'):
        return None
        
    # Skip authentication for verify-reset-token with any token 
    if request.path.startswith('/api/auth/verify-reset-token/'):
        return None

    if request.path in PUBLIC_PATHS:
        if request.path == '/api/mail-accounts/gmail/callback':
            # For OAuth callbacks, extract user_id from state parameter
            state = request.args.get('state')
            if state:
                try:
                    state_data = jwt.decode(state, 'your-secret-key', algorithms=['HS256'])
                    request.ctx.user_id = state_data.get('user_id')
                except:
                    pass
        return

    # Get token from header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return json({'error': 'No token provided'}, status=401)

    token = auth_header.split(' ')[1]
    try:
        # Verify token
        decoded = jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
        request.ctx.user_id = decoded['user_id']
        return None
    except jwt.InvalidTokenError:
        return json({'error': 'Invalid token'}, status=401)
    except Exception as e:
        return json({'error': str(e)}, status=401)