from sanic import Blueprint
from sanic.response import json
from services.password_manager_service import PasswordManagerService
import traceback
import sys

password_manager_bp = Blueprint('password_manager', url_prefix='/api/password-manager')
password_manager_service = PasswordManagerService()

@password_manager_bp.post('/passwords')
async def add_password(request):
    try:
        print("Received request data:", request.json)
        user_id = request.ctx.user_id
        print("User ID:", user_id)
        
        data = request.json
        if not all(key in data for key in ['password']):
            return json({'error': 'Missing required fields'}, status=400)
        
        print("Calling service with:", {
            'user_id': user_id,
            'title': data.get('title', ''),
            'password': '***',  # Don't log actual password
            'descriptions': data.get('descriptions', '')
        })
        
        result = await password_manager_service.add_password(
            user_id=user_id,
            title=data.get('title', ''),
            password=data['password'],
            descriptions=data.get('descriptions', '')
        )
        
        print("Service returned:", result)
        return json(result)
    except Exception as e:
        print("Error in add_password:", str(e))
        print("Full traceback:")
        traceback.print_exc(file=sys.stdout)
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@password_manager_bp.get('/passwords')
async def get_passwords(request):
    try:
        user_id = request.ctx.user_id
        print("Getting passwords for user:", user_id)
        passwords = await password_manager_service.get_passwords(user_id)
        print("Found passwords:", passwords)
        return json(passwords)
    except Exception as e:
        print("Error in get_passwords:", str(e))
        print("Full traceback:")
        traceback.print_exc(file=sys.stdout)
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@password_manager_bp.delete('/passwords/<entry_id:int>')
async def delete_password(request, entry_id):
    try:
        user_id = request.ctx.user_id
        print(f"Deleting password {entry_id} for user {user_id}")
        success = await password_manager_service.delete_password(entry_id, user_id)
        
        if not success:
            return json({'error': 'Password entry not found'}, status=404)
        
        return json({'message': 'Password deleted successfully'})
    except Exception as e:
        print("Error in delete_password:", str(e))
        print("Full traceback:")
        traceback.print_exc(file=sys.stdout)
        return json({'error': 'Internal server error', 'details': str(e)}, status=500) 