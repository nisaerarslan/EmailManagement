from sanic import Blueprint, json
from sanic.response import HTTPResponse
from repositories.email_group_repository import EmailGroupRepository

email_group_bp = Blueprint('email_group_bp', url_prefix='/api/email-groups')

@email_group_bp.post("/")
async def create_group(request) -> HTTPResponse:
    try:
        user_id = request.ctx.user_id
        group_name = request.json.get('group_name')
        
        if not group_name:
            return json({'error': 'Group name is required'}, status=400)

        group = await EmailGroupRepository.create_group(user_id, group_name)
        return json({
            'group_id': group.group_id,
            'user_id': group.user_id,
            'group_name': group.group_name,
            'created_at': group.created_at.isoformat() if group.created_at else None,
            'updated_at': group.updated_at.isoformat() if group.updated_at else None,
            'members': []
        })
    except Exception as e:
        return json({'error': str(e)}, status=500)

@email_group_bp.post("/<group_id:int>/members")
async def add_member(request, group_id: int) -> HTTPResponse:
    try:
        email = request.json.get('email')
        
        if not email:
            return json({'error': 'Email is required'}, status=400)

        # Verify the group exists and belongs to the user
        group = await EmailGroupRepository.get_group(group_id)
        if not group or group.user_id != request.ctx.user_id:
            return json({'error': 'Group not found'}, status=404)

        member = await EmailGroupRepository.add_member(group_id, email)
        return json({
            'member_id': member.member_id,
            'group_id': member.group_id,
            'email': member.email,
            'created_at': member.created_at.isoformat() if member.created_at else None
        })
    except Exception as e:
        return json({'error': str(e)}, status=500)

@email_group_bp.get("/")
async def get_user_groups(request) -> HTTPResponse:
    try:
        user_id = request.ctx.user_id
        groups = await EmailGroupRepository.get_user_groups(user_id)
        
        return json({
            'groups': [{
                'group_id': group.group_id,
                'user_id': group.user_id,
                'group_name': group.group_name,
                'created_at': group.created_at.isoformat() if group.created_at else None,
                'updated_at': group.updated_at.isoformat() if group.updated_at else None,
                'members': [{
                    'member_id': member.member_id,
                    'group_id': member.group_id,
                    'email': member.email,
                    'created_at': member.created_at.isoformat() if member.created_at else None
                } for member in group.members] if group.members else []
            } for group in groups]
        })
    except Exception as e:
        return json({'error': str(e)}, status=500)

@email_group_bp.get("/<group_id:int>")
async def get_group(request, group_id: int) -> HTTPResponse:
    try:
        group = await EmailGroupRepository.get_group(group_id)
        
        if not group or group.user_id != request.ctx.user_id:
            return json({'error': 'Group not found'}, status=404)

        return json({
            'group_id': group.group_id,
            'user_id': group.user_id,
            'group_name': group.group_name,
            'created_at': group.created_at.isoformat() if group.created_at else None,
            'updated_at': group.updated_at.isoformat() if group.updated_at else None,
            'members': [{
                'member_id': member.member_id,
                'group_id': member.group_id,
                'email': member.email,
                'created_at': member.created_at.isoformat() if member.created_at else None
            } for member in group.members] if group.members else []
        })
    except Exception as e:
        return json({'error': str(e)}, status=500)

@email_group_bp.delete("/<group_id:int>")
async def delete_group(request, group_id: int) -> HTTPResponse:
    try:
        # Verify the group exists and belongs to the user
        group = await EmailGroupRepository.get_group(group_id)
        if not group or group.user_id != request.ctx.user_id:
            return json({'error': 'Group not found'}, status=404)

        success = await EmailGroupRepository.delete_group(group_id)
        if success:
            return json({'message': 'Group deleted successfully'})
        return json({'error': 'Failed to delete group'}, status=500)
    except Exception as e:
        return json({'error': str(e)}, status=500)

@email_group_bp.delete("/<group_id:int>/members/<member_id:int>")
async def delete_member(request, group_id: int, member_id: int) -> HTTPResponse:
    try:
        # Verify the group exists and belongs to the user
        group = await EmailGroupRepository.get_group(group_id)
        if not group or group.user_id != request.ctx.user_id:
            return json({'error': 'Group not found'}, status=404)

        success = await EmailGroupRepository.delete_member(member_id)
        if success:
            return json({'message': 'Member deleted successfully'})
        return json({'error': 'Failed to delete member'}, status=500)
    except Exception as e:
        return json({'error': str(e)}, status=500) 