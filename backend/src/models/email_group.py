from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Any
from models.base_model import BaseModel

@dataclass
class EmailGroupMember(BaseModel):
    _table_name = "EmailGroupMembers"
    _primary_key = "member_id"
    
    member_id: Optional[int]
    group_id: int
    email: str
    created_at: Optional[datetime] = None

    @staticmethod
    def from_db(row):
        if not row:
            return None
        return EmailGroupMember(
            member_id=row['member_id'],
            group_id=row['group_id'],
            email=row['email'],
            created_at=row['created_at']
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmailGroupMember':
        """Create an EmailGroupMember instance from a dictionary."""
        return cls(
            member_id=data.get('member_id'),
            group_id=data.get('group_id', 0),
            email=data.get('email', ''),
            created_at=cls.parse_datetime(data.get('created_at'))
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the EmailGroupMember instance to a dictionary."""
        return {
            'member_id': self.member_id,
            'group_id': self.group_id,
            'email': self.email,
            'created_at': self.format_datetime(self.created_at)
        }

@dataclass
class EmailGroup(BaseModel):
    _table_name = "EmailGroups"
    _primary_key = "group_id"
    
    group_id: Optional[int]
    user_id: int
    group_name: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    members: List[EmailGroupMember] = None

    @staticmethod
    def from_db(row, members=None):
        if not row:
            return None
        return EmailGroup(
            group_id=row['group_id'],
            user_id=row['user_id'],
            group_name=row['group_name'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            members=members or []
        )
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmailGroup':
        """Create an EmailGroup instance from a dictionary."""
        members = []
        if 'members' in data and isinstance(data['members'], list):
            members = [EmailGroupMember.from_dict(member_data) for member_data in data['members']]
            
        return cls(
            group_id=data.get('group_id'),
            user_id=data.get('user_id', 0),
            group_name=data.get('group_name', ''),
            created_at=cls.parse_datetime(data.get('created_at')),
            updated_at=cls.parse_datetime(data.get('updated_at')),
            members=members
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert the EmailGroup instance to a dictionary."""
        return {
            'group_id': self.group_id,
            'user_id': self.user_id,
            'group_name': self.group_name,
            'created_at': self.format_datetime(self.created_at),
            'updated_at': self.format_datetime(self.updated_at),
            'members': [member.to_dict() for member in self.members] if self.members else []
        } 