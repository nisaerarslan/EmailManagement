from sanic import Blueprint
from sanic.response import json
from services.user_service import UserService
import traceback
import base64

user_bp = Blueprint('users', url_prefix='/api/users')
user_service = UserService()

@user_bp.get('/profile')
async def get_profile(request):
    try:
        user_id = request.ctx.user_id
        user = await user_service.get_user_profile(user_id)
        return json(user)
    except Exception as e:
        print(f"Error getting user profile: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@user_bp.post('/change-password')
async def change_password(request):
    try:
        user_id = request.ctx.user_id
        data = request.json
        
        if not all(key in data for key in ['current_password', 'new_password']):
            return json({'error': 'Missing required fields'}, status=400)

        await user_service.change_password(
            user_id=user_id,
            current_password=data['current_password'],
            new_password=data['new_password']
        )
        
        return json({'message': 'Password changed successfully'})
    except ValueError as e:
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Error changing password: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@user_bp.put('/profile/update')
async def update_profile(request):
    try:
        user_id = request.ctx.user_id
        data = request.json

        if not any(key in data for key in ['name', 'email']):
            return json({'error': 'No fields to update'}, status=400)

        await user_service.update_profile(
            user_id=user_id,
            name=data.get('name'),
            email=data.get('email')
        )
        
        return json({'message': 'Profile updated successfully'})
    except ValueError as e:
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500)

@user_bp.put('/profile/avatar')
async def update_avatar(request):
    try:
        user_id = request.ctx.user_id
        data = request.json

        if 'image' not in data:
            return json({'error': 'No image provided'}, status=400)

        # Base64 formatındaki resmi al
        image_data = data['image']
        
        # Base64 formatını kontrol et
        if not image_data.startswith('data:image'):
            return json({'error': 'Invalid image format'}, status=400)

        await user_service.update_avatar(
            user_id=user_id,
            image_data=image_data
        )
        
        return json({'message': 'Avatar updated successfully'})
    except ValueError as e:
        return json({'error': str(e)}, status=400)
    except Exception as e:
        print(f"Error updating avatar: {str(e)}")
        print(traceback.format_exc())
        return json({'error': 'Internal server error', 'details': str(e)}, status=500) 