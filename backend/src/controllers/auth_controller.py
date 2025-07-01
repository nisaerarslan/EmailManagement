from sanic import Blueprint
from sanic.response import json
from services.user_service import UserService
import traceback

auth_bp = Blueprint('auth', url_prefix='/api/auth')
user_service = UserService()

@auth_bp.post('/register')
async def register(request):
    try:
        print("Register request received:", request.json)
        data = request.json
        if not all(key in data for key in ['username', 'email', 'password']):
            print("Missing required fields in register request")
            return json({'error': 'Missing required fields'}, status=400)

        result = await user_service.register(
            username=data['username'],
            email=data['email'],
            password=data['password']
        )
        print("Register successful:", result)
        return json(result)
    except ValueError as e:
        print(f"Validation error in register: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in register: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@auth_bp.post('/login')
async def login(request):
    try:
        print("Login request received:", request.json)
        data = request.json
        # Check for either email/username and password
        if not all(key in data for key in ['identifier', 'password']):
            print("Missing required fields in login request")
            return json({'error': 'Missing required fields'}, status=400)

        # Otp code or recovery code are optional in initial request
        otp_code = data.get('otp_code')
        recovery_code = data.get('recovery_code')
        
        # Collect request info for logging
        request_info = {
            'ip': request.remote_addr or request.ip,
            'user_agent': request.headers.get('user-agent', '')
        }

        result = await user_service.login(
            identifier=data['identifier'],
            password=data['password'],
            otp_code=otp_code,
            recovery_code=recovery_code,
            request_info=request_info
        )
        
        # If OTP verification is required, return special response
        if 'require_otp' in result and result['require_otp']:
            print("OTP verification required")
            return json(result)
            
        print("Login successful:", result)
        return json(result)
    except ValueError as e:
        print(f"Validation error in login: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in login: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@auth_bp.post('/setup-otp')
async def setup_otp(request):
    try:
        print("Setup OTP request received:", request.json)
        data = request.json
        if not all(key in data for key in ['user_id', 'enable']):
            print("Missing required fields in setup OTP request")
            return json({'error': 'Missing required fields'}, status=400)

        # Collect request info for logging
        request_info = {
            'ip': request.remote_addr or request.ip,
            'user_agent': request.headers.get('user-agent', '')
        }

        result = await user_service.setup_otp(
            user_id=data['user_id'],
            enable=data['enable'],
            request_info=request_info
        )
        print("Setup OTP successful:", result)
        return json(result)
    except ValueError as e:
        print(f"Validation error in setup OTP: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in setup OTP: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@auth_bp.post('/regenerate-otp')
async def regenerate_otp(request):
    try:
        print("Regenerate OTP request received:", request.json)
        data = request.json
        if 'user_id' not in data:
            print("Missing user_id in regenerate OTP request")
            return json({'error': 'Missing user_id'}, status=400)

        # Collect request info for logging
        request_info = {
            'ip': request.remote_addr or request.ip,
            'user_agent': request.headers.get('user-agent', '')
        }

        result = await user_service.regenerate_otp(
            user_id=data['user_id'],
            request_info=request_info
        )
        print("Regenerate OTP successful")
        return json(result)
    except ValueError as e:
        print(f"Validation error in regenerate OTP: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in regenerate OTP: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@auth_bp.post('/generate-recovery-code')
async def generate_recovery_code(request):
    try:
        print("Generate recovery code request received:", request.json)
        data = request.json
        if 'user_id' not in data:
            print("Missing user_id in generate recovery code request")
            return json({'error': 'Missing user_id'}, status=400)

        # Collect request info for logging
        request_info = {
            'ip': request.remote_addr or request.ip,
            'user_agent': request.headers.get('user-agent', '')
        }

        result = await user_service.generate_recovery_code(
            user_id=data['user_id'],
            request_info=request_info
        )
        print("Generate recovery code successful")
        return json(result)
    except ValueError as e:
        print(f"Validation error in generate recovery code: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in generate recovery code: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@auth_bp.post('/forgot-password')
async def request_password_reset(request):
    try:
        print("Forgot password request received:", request.json)
        data = request.json
        if 'identifier' not in data:
            print("Missing identifier in forgot password request")
            return json({'error': 'Missing identifier'}, status=400)

        result = await user_service.request_password_reset(
            identifier=data['identifier']
        )
        
        print("Password reset request processed")
        return json(result)
    except ValueError as e:
        print(f"Validation error in password reset request: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in password reset request: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@auth_bp.get('/verify-reset-token/<token>')
async def verify_reset_token(request, token):
    try:
        print(f"Verify reset token request received: {token}")
        
        result = await user_service.verify_password_reset_token(token)
        
        print("Reset token verification processed")
        return json(result)
    except ValueError as e:
        print(f"Validation error in token verification: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in token verification: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@auth_bp.post('/reset-password')
async def reset_password(request):
    try:
        print("Reset password request received:", request.json)
        data = request.json
        if not all(key in data for key in ['token', 'new_password']):
            print("Missing required fields in reset password request")
            return json({'error': 'Missing required fields'}, status=400)

        result = await user_service.reset_password(
            token=data['token'],
            new_password=data['new_password']
        )
        
        print("Password reset processed")
        return json(result)
    except ValueError as e:
        print(f"Validation error in password reset: {str(e)}")
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Unexpected error in password reset: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500) 